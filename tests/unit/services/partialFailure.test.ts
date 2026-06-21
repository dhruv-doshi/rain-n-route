import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { GoogleMapsProvider } from '@/services/maps/google';
import { ServiceError } from '@/lib/http';
import type { TransportMode } from '@/types';

import googleRoutesDrive from '../../fixtures/google-routes-drive.json';
import googleRoutesTwoWheeler from '../../fixtures/google-routes-two-wheeler.json';
import googleRoutesTransit from '../../fixtures/google-routes-transit.json';
import googleRoutesWalk from '../../fixtures/google-routes-walk.json';

/**
 * Property 3: Partial Failure Tolerance
 *
 * For any route request with N modes where K succeed (1 ≤ K < N),
 * the response contains exactly K routes.
 *
 * **Validates: Requirements 6.2, 13.3**
 */

// ────────────────────────────────────────────────────────────────────
// Setup
// ────────────────────────────────────────────────────────────────────

const TEST_SERVER_KEY = 'test-key-partial-failure';

// Modes that map to unique Google travel modes (no deduplication)
// car → DRIVE, two_wheeler → TWO_WHEELER, transit → TRANSIT, walk → WALK, cycle → BICYCLE
const UNIQUE_MODES: TransportMode[] = ['car', 'two_wheeler', 'transit', 'walk', 'cycle'];

const GOOGLE_MODE_FIXTURES: Record<string, object> = {
  DRIVE: googleRoutesDrive,
  TWO_WHEELER: googleRoutesTwoWheeler,
  TRANSIT: googleRoutesTransit,
  WALK: googleRoutesWalk,
  BICYCLE: googleRoutesWalk,
};

const DOMAIN_TO_GOOGLE_MODE: Record<string, string> = {
  car: 'DRIVE',
  two_wheeler: 'TWO_WHEELER',
  transit: 'TRANSIT',
  walk: 'WALK',
  cycle: 'BICYCLE',
};

// Create a handler that fails specific Google modes and succeeds others
function createPartialFailureHandler(failingGoogleModes: Set<string>) {
  return http.post(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    async ({ request }) => {
      const body = (await request.json()) as { travelMode?: string };
      const mode = body.travelMode ?? 'DRIVE';

      if (failingGoogleModes.has(mode)) {
        return new HttpResponse(JSON.stringify({ error: { message: 'Server error' } }), {
          status: 500,
        });
      }

      const fixture = GOOGLE_MODE_FIXTURES[mode] ?? googleRoutesDrive;
      return HttpResponse.json(fixture);
    },
  );
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ────────────────────────────────────────────────────────────────────
// Arbitraries
// ────────────────────────────────────────────────────────────────────

// Generate a non-empty subset of unique modes (at least 2 so we can have partial failure)
const arbModeSubset = fc
  .uniqueArray(fc.constantFrom(...UNIQUE_MODES), { minLength: 2, maxLength: 5 })
  .filter((modes) => modes.length >= 2);

// Given a set of modes, generate a non-empty proper subset to mark as failing
// (at least 1 fails, at least 1 succeeds)
function _arbFailingSubset(modes: TransportMode[]): fc.Arbitrary<TransportMode[]> {
  return fc
    .uniqueArray(fc.constantFrom(...modes), { minLength: 1, maxLength: modes.length - 1 })
    .filter((failing) => failing.length >= 1 && failing.length < modes.length);
}

// ────────────────────────────────────────────────────────────────────
// Property Tests
// ────────────────────────────────────────────────────────────────────

describe('Partial Failure Tolerance — Property 3', () => {
  let provider: GoogleMapsProvider;

  beforeEach(() => {
    provider = new GoogleMapsProvider(TEST_SERVER_KEY);
  });

  it('for N modes where K succeed (1 ≤ K < N), response contains exactly K routes', async () => {
    await fc.assert(
      fc.asyncProperty(arbModeSubset, async (modes) => {
        // Generate a random failing subset (at least 1, at most N-1)
        const failCount = 1 + Math.floor(Math.random() * (modes.length - 1));
        const shuffled = [...modes].sort(() => Math.random() - 0.5);
        const failingModes = shuffled.slice(0, failCount);
        const succeedingModes = modes.filter((m) => !failingModes.includes(m));

        const failingGoogleModes = new Set(failingModes.map((m) => DOMAIN_TO_GOOGLE_MODE[m]));

        server.use(createPartialFailureHandler(failingGoogleModes));

        const response = await provider.route({
          from: { lat: 12.9716, lng: 77.5946 },
          to: { lat: 12.9784, lng: 77.6408 },
          modes,
        });

        // Exactly K routes should be returned (K = number of succeeding modes)
        expect(response.routes).toHaveLength(succeedingModes.length);

        // Each successful route should have a domain mode from the succeeding set
        for (const route of response.routes) {
          expect(succeedingModes).toContain(route.modes[0]);
        }

        // No error should be thrown (partial success is acceptable)
        expect(response.routes.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 30 },
    );
  });

  it('4 modes, 3 succeed → response has 3 routes', async () => {
    const failingGoogleModes = new Set(['DRIVE']);
    server.use(createPartialFailureHandler(failingGoogleModes));

    const response = await provider.route({
      from: { lat: 12.9716, lng: 77.5946 },
      to: { lat: 12.9784, lng: 77.6408 },
      modes: ['car', 'two_wheeler', 'transit', 'walk'],
    });

    expect(response.routes).toHaveLength(3);
    const returnedModes = response.routes.map((r) => r.modes[0]);
    expect(returnedModes).not.toContain('car');
    expect(returnedModes).toContain('two_wheeler');
    expect(returnedModes).toContain('transit');
    expect(returnedModes).toContain('walk');
  });

  it('4 modes, 1 succeeds → response has 1 route', async () => {
    const failingGoogleModes = new Set(['DRIVE', 'TWO_WHEELER', 'TRANSIT']);
    server.use(createPartialFailureHandler(failingGoogleModes));

    const response = await provider.route({
      from: { lat: 12.9716, lng: 77.5946 },
      to: { lat: 12.9784, lng: 77.6408 },
      modes: ['car', 'two_wheeler', 'transit', 'walk'],
    });

    expect(response.routes).toHaveLength(1);
    expect(response.routes[0].modes[0]).toBe('walk');
  });

  it('2 modes, 1 succeeds → response has 1 route', async () => {
    const failingGoogleModes = new Set(['TWO_WHEELER']);
    server.use(createPartialFailureHandler(failingGoogleModes));

    const response = await provider.route({
      from: { lat: 12.9716, lng: 77.5946 },
      to: { lat: 12.9784, lng: 77.6408 },
      modes: ['two_wheeler', 'walk'],
    });

    expect(response.routes).toHaveLength(1);
    expect(response.routes[0].modes[0]).toBe('walk');
  });

  it('all modes fail → throws ServiceError', async () => {
    const failingGoogleModes = new Set(['DRIVE', 'TWO_WHEELER', 'TRANSIT', 'WALK', 'BICYCLE']);
    server.use(createPartialFailureHandler(failingGoogleModes));

    await expect(
      provider.route({
        from: { lat: 12.9716, lng: 77.5946 },
        to: { lat: 12.9784, lng: 77.6408 },
        modes: ['car', 'two_wheeler', 'transit', 'walk'],
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ServiceError);
  });

  it('no error thrown for any partial success scenario (property)', async () => {
    await fc.assert(
      fc.asyncProperty(arbModeSubset, async (modes) => {
        // Fail exactly 1 mode
        const failingMode = modes[0];
        const failingGoogleModes = new Set([DOMAIN_TO_GOOGLE_MODE[failingMode]]);

        server.use(createPartialFailureHandler(failingGoogleModes));

        // Should not throw — partial success is acceptable
        const response = await provider.route({
          from: { lat: 12.9716, lng: 77.5946 },
          to: { lat: 12.9784, lng: 77.6408 },
          modes,
        });

        expect(response.routes.length).toBe(modes.length - 1);
        expect(response.generatedAt).toBeTruthy();
        expect(response.cacheKey).toBeTruthy();
      }),
      { numRuns: 20 },
    );
  });
});
