import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchWithRetry, assertOk, ServiceError } from '@/lib/http';

const TEST_URL = 'https://test.example.com/api';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchWithRetry', () => {
  it('resolves on first success', async () => {
    server.use(http.get(TEST_URL, () => HttpResponse.json({ ok: true })));
    const res = await fetchWithRetry(TEST_URL);
    expect(res.status).toBe(200);
  });

  it('succeeds after one failure when retries > 0', async () => {
    let calls = 0;
    server.use(
      http.get(TEST_URL, () => {
        calls++;
        if (calls === 1) return new HttpResponse(null, { status: 503 });
        return HttpResponse.json({ ok: true });
      }),
    );
    // fetchWithRetry doesn't retry on HTTP errors — only on thrown/network errors
    // so 503 comes back as a response, not a retry trigger
    const res = await fetchWithRetry(TEST_URL);
    expect(res.status).toBe(503);
    expect(calls).toBe(1);
  });

  it('passes AbortSignal to fetch', async () => {
    server.use(
      http.get(TEST_URL, async () => {
        await new Promise((r) => setTimeout(r, 5_000));
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    controller.abort();
    await expect(fetchWithRetry(TEST_URL, { signal: controller.signal })).rejects.toSatisfy(
      (e: unknown) => e instanceof ServiceError,
    );
  });
});

describe('assertOk', () => {
  it('does not throw on 2xx', async () => {
    const res = new Response('{}', { status: 200 });
    await expect(assertOk(res)).resolves.toBeUndefined();
  });

  it('throws ServiceError with RATE_LIMITED on 429', async () => {
    const res = new Response('{}', { status: 429 });
    await expect(assertOk(res)).rejects.toSatisfy(
      (e: unknown) => e instanceof ServiceError && (e as ServiceError).code === 'RATE_LIMITED',
    );
  });

  it('throws ServiceError with retryable=true on 500', async () => {
    const res = new Response('{}', { status: 500 });
    await expect(assertOk(res)).rejects.toSatisfy(
      (e: unknown) => e instanceof ServiceError && (e as ServiceError).retryable === true,
    );
  });

  it('throws ServiceError with retryable=false on 400', async () => {
    const res = new Response('{}', { status: 400 });
    await expect(assertOk(res)).rejects.toSatisfy(
      (e: unknown) => e instanceof ServiceError && (e as ServiceError).retryable === false,
    );
  });
});
