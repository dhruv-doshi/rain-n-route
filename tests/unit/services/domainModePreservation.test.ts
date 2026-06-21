import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import { GoogleMapsProvider } from '@/services/maps/google';
import type { TransportMode } from '@/types';

import googleRoutesDrive from '../../fixtures/google-routes-drive.json';
import googleRoutesTwoWheeler from '../../fixtures/google-routes-two-wheeler.json';
import googleRoutesTransit from '../../fixtures/google-routes-transit.json';
import googleRoutesWalk from '../../fixtures/google-routes-walk.json';

/**
 * Property 4: Domain Type Preservation
 *
 * For any adapted RouteOption, `modes[0]` is always the domain mode,
 * never a Google enum.
 *
 * **Validates: Requirements 6.4, 14.3**
 */

// ────────────────────────────────────────────────────────────────────
// Google enum strings that must NEVER appear in domain responses
// ────────────────────────────────────────────────────────────────────

const GOOGLE_ENUMS = ['DRIVE', 'TWO_WHEELER', 'TRANSIT', 'WALK', 'BICYCLE'];

// All valid domain modes
const DOMAIN_MODES: TransportMode[] = [
  'car',
  'two_wheeler',
  'transit',
  'walk',
  'cycle',
  'cab',
  'auto',
];

// Mode → Google fixture mapping
const GOOGLE_MODE_FIXTURES: Record<string, object> = {
  DRIVE: googleRoutesDrive,
  TWO_WHEELER: googleRoutesTwoWheeler,
  TRANSIT: googleRoutesTransit,
  WALK: googleRoutesWalk,
  BICYCLE: googleRoutesWalk,
};

// ────────────────────────────────────────────────────────────────────
// MSW Server Setup
// ────────────────────────────────────────────────────────────────────

const server = setupServer(
  http.post('https://routes.googleapis.com/directions/v2:computeRoutes', async ({ request }) => {
    const body = (await request.json()) as { travelMode?: string };
    const mode = body.travelMode ?? 'DRIVE';
    const fixture = GOOGLE_MODE_FIXTURES[mode] ?? googleRoutesDrive;
    return HttpResponse.json(fixture);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ────────────────────────────────────────────────────────────────────
// Arbitraries
// ────────────────────────────────────────────────────────────────────

const arbDomainMode = fc.constantFrom(...DOMAIN_MODES);

// Generate a non-empty unique subset of domain modes (1-7 modes)
const arbModeSet = fc.uniqueArray(arbDomainMode, { minLength: 1, maxLength: 7 });

// ────────────────────────────────────────────────────────────────────
// Property Tests
// ────────────────────────────────────────────────────────────────────

describe('GoogleMapsProvider.route — Property 4: Domain Type Preservation', () => {
  const provider = new GoogleMapsProvider('test-server-key');

  const baseRequest = {
    from: { lat: 12.9716, lng: 77.5946 },
    to: { lat: 12.9352, lng: 77.6245 },
  };

  it('modes[0] is always the domain mode, never a Google enum', async () => {
    await fc.assert(
      fc.asyncProperty(arbModeSet, async (modes) => {
        const response = await provider.route({
          ...baseRequest,
          modes,
        });

        for (const route of response.routes) {
          // modes[0] must be a valid domain mode
          expect(DOMAIN_MODES).toContain(route.modes[0]);

          // modes[0] must NEVER be a Google enum string
          expect(GOOGLE_ENUMS).not.toContain(route.modes[0]);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no Google enum strings appear anywhere in serialized response', async () => {
    await fc.assert(
      fc.asyncProperty(arbModeSet, async (modes) => {
        const response = await provider.route({
          ...baseRequest,
          modes,
        });

        // Serialize the entire response and check for Google enum leaks
        const serialized = JSON.stringify(response);

        for (const googleEnum of GOOGLE_ENUMS) {
          // Google enums are all-caps so check for exact matches as JSON string values
          expect(serialized).not.toContain(`"${googleEnum}"`);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('each returned route preserves the first domain mode that mapped to its Google mode', async () => {
    await fc.assert(
      fc.asyncProperty(arbModeSet, async (modes) => {
        const response = await provider.route({
          ...baseRequest,
          modes,
        });

        // Build expected domain modes: for each unique Google mode,
        // the first domain mode in the input array that maps to it should be preserved
        const DOMAIN_TO_GOOGLE: Record<string, string> = {
          car: 'DRIVE',
          cab: 'DRIVE',
          auto: 'DRIVE',
          mixed: 'DRIVE',
          two_wheeler: 'TWO_WHEELER',
          transit: 'TRANSIT',
          walk: 'WALK',
          cycle: 'BICYCLE',
        };

        const expectedDomainModes: TransportMode[] = [];
        const seenGoogleModes = new Set<string>();

        for (const mode of modes) {
          const googleMode = DOMAIN_TO_GOOGLE[mode];
          if (googleMode && !seenGoogleModes.has(googleMode)) {
            seenGoogleModes.add(googleMode);
            expectedDomainModes.push(mode);
          }
        }

        // The number of routes should equal the number of unique Google modes
        expect(response.routes.length).toBe(expectedDomainModes.length);

        // Each route's modes[0] should be the corresponding expected domain mode
        for (let i = 0; i < response.routes.length; i++) {
          expect(response.routes[i].modes[0]).toBe(expectedDomainModes[i]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
