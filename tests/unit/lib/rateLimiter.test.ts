import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '@/lib/rateLimiter';

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const key = 'test-ip-allow-' + Date.now();
    const result = checkRateLimit(key, { limit: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests over the limit', () => {
    const key = 'test-ip-block-' + Date.now();
    for (let i = 0; i < 3; i++) checkRateLimit(key, { limit: 3 });
    const result = checkRateLimit(key, { limit: 3 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const key = 'test-ip-reset-' + Date.now();
    checkRateLimit(key, { limit: 1, windowMs: 10 });
    checkRateLimit(key, { limit: 1, windowMs: 10 });
    await new Promise((r) => setTimeout(r, 15));
    const result = checkRateLimit(key, { limit: 1, windowMs: 10 });
    expect(result.allowed).toBe(true);
  });

  it('returns a future resetAt timestamp', () => {
    const before = Date.now();
    const key = 'test-ip-ts-' + Date.now();
    const { resetAt } = checkRateLimit(key, { windowMs: 1_000 });
    expect(resetAt).toBeGreaterThan(before);
  });
});
