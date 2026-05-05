import { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';
import { z } from 'zod';
import { checkRateLimit } from './rateLimiter';
import { ServiceError } from './http';

type JsonValue = string | number | boolean | object;
export const lruCache = new LRUCache<string, JsonValue>({ max: 500, ttl: 5 * 60 * 1_000 });

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function rateLimitResponse(resetAt: number): Response {
  return Response.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many requests', retryable: true } },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1_000)),
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}

export function validationErrorResponse(issues: z.core.$ZodIssue[]): Response {
  return Response.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters', issues } },
    { status: 400 },
  );
}

export function serviceErrorResponse(err: ServiceError): Response {
  const status = err.code === 'PROVIDER_TIMEOUT' ? 504 : err.code === 'RATE_LIMITED' ? 429 : 502;
  const body: Record<string, unknown> = {
    code: err.code,
    message: err.message,
    retryable: err.retryable,
  };
  if (process.env.NODE_ENV !== 'production' && err.cause !== undefined) {
    body.cause = err.cause;
  }
  return Response.json({ error: body }, { status });
}

export function unknownErrorResponse(): Response {
  return Response.json(
    { error: { code: 'PROVIDER_ERROR', message: 'Unexpected error', retryable: true } },
    { status: 502 },
  );
}

export function withRateLimit(
  req: NextRequest,
  handler: () => Promise<Response>,
): Promise<Response> {
  const ip = getClientIp(req);
  const { allowed, resetAt } = checkRateLimit(ip);
  if (!allowed) return Promise.resolve(rateLimitResponse(resetAt));
  return handler().catch((err) => {
    if (err instanceof ServiceError) {
      const causeExcerpt =
        err.cause && typeof err.cause === 'object' && 'body' in err.cause
          ? String((err.cause as { body: unknown }).body).slice(0, 200)
          : String(err.cause ?? '').slice(0, 200);
      console.error(
        `[api] ${req.nextUrl.pathname} code=${err.code} cause="${causeExcerpt}" ip=${ip}`,
      );
      return serviceErrorResponse(err);
    }
    console.error(`[api] ${req.nextUrl.pathname} unexpected error ip=${ip}`, err);
    return unknownErrorResponse();
  });
}
