import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { buildCacheKey } from '@/services/maps/google';
import { googleMapsHandlers, resetRequestLog, requestLog } from './mswHandlers';

// ────────────────────────────────────────────────────────────────────
// Setup: Override isMockMode so that GoogleMapsProvider is used.
// MSW intercepts the Google Routes API calls.
// ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env')>();
  return {
    ...actual,
    isMockMode: () => false,
    getMapsConfig: () => ({
      serverKey: 'test-key-for-caching-tests',
      browserKey: 'test-browser-key',
      mapId: 'test-map-id',
      isMockMode: false,
    }),
  };
});

// Import after mock setup
const { POST, routeCache } = await import('@/app/api/maps/route/route');

const server = setupServer(...googleMapsHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetRequestLog();
  routeCache.clear();
});

afterAll(() => {
  server.close();
});

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function buildRouteRequest(
  overrides: Partial<{
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    modes: string[];
    fresh: boolean;
  }> = {},
) {
  const body = {
    from: overrides.from ?? { lat: 12.9716, lng: 77.5946 },
    to: overrides.to ?? { lat: 12.9784, lng: 77.6408 },
    modes: overrides.modes ?? ['car'],
  };

  const url = overrides.fresh
    ? 'http://localhost:3000/api/maps/route?fresh=1'
    : 'http://localhost:3000/api/maps/route';

  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ────────────────────────────────────────────────────────────────────
// Tests: Route Caching Behavior
// Validates: Requirements 7.1–7.5
// ────────────────────────────────────────────────────────────────────

describe('Route Caching Behavior', () => {
  describe('Cache hit returns same response without Google API call', () => {
    it('first request is a MISS, second identical request is a HIT without calling Google', async () => {
      // First request — cache MISS, Google API should be called
      const req1 = buildRouteRequest();
      const res1 = await POST(req1);

      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Cache')).toBe('MISS');
      expect(requestLog.routes.length).toBeGreaterThanOrEqual(1);

      const routeCallsAfterFirst = requestLog.routes.length;

      // Second identical request — cache HIT, no additional Google API call
      const req2 = buildRouteRequest();
      const res2 = await POST(req2);

      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Cache')).toBe('HIT');
      // No additional Routes API calls were made
      expect(requestLog.routes.length).toBe(routeCallsAfterFirst);

      // Response bodies should match
      const body1 = await res1.json();
      const body2 = await res2.json();
      expect(body2).toEqual(body1);
    });
  });

  describe('?fresh=1 bypasses cache read', () => {
    it('fresh=1 calls Google API even when cache is populated, and writes result to cache', async () => {
      // Populate the cache with an initial request
      const req1 = buildRouteRequest();
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Cache')).toBe('MISS');

      const routeCallsAfterFirst = requestLog.routes.length;

      // Make same request with ?fresh=1 — should bypass cache read
      const freshReq = buildRouteRequest({ fresh: true });
      const freshRes = await POST(freshReq);

      expect(freshRes.status).toBe(200);
      expect(freshRes.headers.get('X-Cache')).toBe('MISS');
      // Google API was called again
      expect(requestLog.routes.length).toBeGreaterThan(routeCallsAfterFirst);

      // Cache should still be populated (fresh writes to cache)
      const cacheKey = buildCacheKey({
        from: { lat: 12.9716, lng: 77.5946 },
        to: { lat: 12.9784, lng: 77.6408 },
        modes: ['car'],
      });
      expect(routeCache.has(cacheKey)).toBe(true);

      // Subsequent request without fresh=1 should be a HIT
      const routeCallsAfterFresh = requestLog.routes.length;
      const req3 = buildRouteRequest();
      const res3 = await POST(req3);
      expect(res3.headers.get('X-Cache')).toBe('HIT');
      expect(requestLog.routes.length).toBe(routeCallsAfterFresh);
    });
  });

  describe('Error responses are not cached', () => {
    it('does not cache an entry when the Google API returns an error', async () => {
      // Override Routes API to return 500 error
      server.use(
        http.post(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          () =>
            new HttpResponse(JSON.stringify({ error: { message: 'Server error' } }), {
              status: 500,
            }),
        ),
      );

      const req = buildRouteRequest();
      const res = await POST(req);

      // The handler catches ServiceErrors and returns an error response
      expect(res.status).toBeGreaterThanOrEqual(400);

      // Cache should NOT contain any entry for this request
      const cacheKey = buildCacheKey({
        from: { lat: 12.9716, lng: 77.5946 },
        to: { lat: 12.9784, lng: 77.6408 },
        modes: ['car'],
      });
      expect(routeCache.has(cacheKey)).toBe(false);
    });
  });

  describe('Deterministic cache key generation', () => {
    it('two requests with coords within 4dp rounding produce a cache hit on the second request', async () => {
      // First request with exact coords
      const req1 = buildRouteRequest({
        from: { lat: 12.9716, lng: 77.5946 },
        to: { lat: 12.9784, lng: 77.6408 },
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Cache')).toBe('MISS');

      const routeCallsAfterFirst = requestLog.routes.length;

      // Second request with slightly different coords (within 4dp rounding)
      // 12.97160 → rounds to "12.9716"
      // 12.97164 → rounds to "12.9716" (same 4dp)
      const req2 = buildRouteRequest({
        from: { lat: 12.97164, lng: 77.59463 },
        to: { lat: 12.97843, lng: 77.64082 },
      });
      const res2 = await POST(req2);

      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Cache')).toBe('HIT');
      // No additional Routes API calls
      expect(requestLog.routes.length).toBe(routeCallsAfterFirst);
    });

    it('requests with modes in different order produce same cache key', async () => {
      const req1 = buildRouteRequest({ modes: ['car', 'walk'] });
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Cache')).toBe('MISS');

      const routeCallsAfterFirst = requestLog.routes.length;

      // Same modes in different order should hit cache
      const req2 = buildRouteRequest({ modes: ['walk', 'car'] });
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Cache')).toBe('HIT');
      expect(requestLog.routes.length).toBe(routeCallsAfterFirst);
    });
  });

  describe('TTL expiry', () => {
    it('cached entry is not returned after manual cache clear (simulating TTL expiry)', async () => {
      // First request populates cache
      const req1 = buildRouteRequest();
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Cache')).toBe('MISS');

      // Verify cache is populated
      const cacheKey = buildCacheKey({
        from: { lat: 12.9716, lng: 77.5946 },
        to: { lat: 12.9784, lng: 77.6408 },
        modes: ['car'],
      });
      expect(routeCache.has(cacheKey)).toBe(true);

      // Simulate TTL expiry by clearing the cache
      routeCache.clear();
      expect(routeCache.has(cacheKey)).toBe(false);

      const routeCallsBeforeSecond = requestLog.routes.length;

      // Next request should be a MISS (expired)
      const req2 = buildRouteRequest();
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Cache')).toBe('MISS');
      // Google API was called again
      expect(requestLog.routes.length).toBeGreaterThan(routeCallsBeforeSecond);
    });
  });
});
