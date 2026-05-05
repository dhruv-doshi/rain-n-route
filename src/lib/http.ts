import type { ServiceErrorCode } from '@/types';

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

function jitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs;
}

function redactToken(url: string): string {
  return url.replace(/access_token=[^&]*/g, 'access_token=REDACTED');
}

export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 10_000, retries = 2, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const signal = init.signal
      ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([
          init.signal as AbortSignal,
          controller.signal,
        ])
      : controller.signal;

    try {
      const res = await fetch(url, { ...init, signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isOffline) {
        throw new ServiceError('NETWORK_OFFLINE', 'No network connection', false, err);
      }

      if (isTimeout && attempt === retries) {
        console.error(
          `[upstream] timeout — url=${redactToken(url)} attempt=${attempt + 1}/${retries + 1}`,
        );
        throw new ServiceError('PROVIDER_TIMEOUT', 'Upstream timed out', true, err);
      }

      if (attempt === retries) {
        console.error(
          `[upstream] retries exhausted — url=${redactToken(url)} attempt=${attempt + 1}/${retries + 1}`,
        );
      }

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, jitter(200 * 2 ** attempt)));
      }
    }
  }

  throw new ServiceError('PROVIDER_ERROR', 'Request failed after retries', true, lastError);
}

export async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const retryable = res.status >= 500;
    const code: ServiceErrorCode =
      res.status === 429 ? 'RATE_LIMITED' : retryable ? 'PROVIDER_ERROR' : 'UNKNOWN';
    throw new ServiceError(code, `HTTP ${res.status}`, retryable, {
      status: res.status,
      body: body.slice(0, 500),
      url: res.url,
    });
  }
}
