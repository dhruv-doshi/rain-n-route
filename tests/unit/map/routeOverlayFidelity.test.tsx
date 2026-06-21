/**
 * Property 15: Route Overlay Fidelity
 *
 * - For N routes with valid geometry, exactly N Polyline instances are created
 * - Selected route has strictly greater stroke weight, opacity, and z-index than unselected
 *
 * **Validates: Requirements 9.1, 9.2**
 */

import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { RouteOverlay } from '@/components/map/RouteOverlay';
import type { RouteOption, TransportMode } from '@/types';

// ────────────────────────────────────────────────────────────────────
// Google Maps Polyline Mock
// ────────────────────────────────────────────────────────────────────

interface MockPolylineOpts {
  strokeWeight: number;
  strokeOpacity: number;
  zIndex: number;
  path: unknown[];
  strokeColor: string;
  map: unknown;
}

interface MockPolylineInstance {
  setMap: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  _opts: MockPolylineOpts;
}

const polylineInstances: MockPolylineInstance[] = [];

vi.stubGlobal('google', {
  maps: {
    Polyline: function MockPolyline(this: unknown, opts: MockPolylineOpts) {
      const instance: MockPolylineInstance = {
        setMap: vi.fn(),
        addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
        _opts: opts,
      };
      polylineInstances.push(instance);
      return instance;
    },
  },
});

const mockMap = {} as unknown as google.maps.Map;

// ────────────────────────────────────────────────────────────────────
// Arbitraries
// ────────────────────────────────────────────────────────────────────

const TRANSPORT_MODES: TransportMode[] = [
  'car',
  'two_wheeler',
  'transit',
  'cab',
  'auto',
  'walk',
  'cycle',
  'mixed',
];

// Classic Google polyline example encoding: 3 points
// '_p~iF~ps|U_ulLnnqC_mqNvxq`@' decodes to (38.5,-120.2), (40.7,-120.95), (43.252,-126.453)
const VALID_ENCODED_POLYLINES = ['_p~iF~ps|U_ulLnnqC_mqNvxq`@', '_p~iF~ps|U_ulLnnqC', '_p~iF~ps|U'];

const arbTransportMode: fc.Arbitrary<TransportMode> = fc.constantFrom(...TRANSPORT_MODES);

const arbValidGeometry: fc.Arbitrary<string> = fc.constantFrom(...VALID_ENCODED_POLYLINES);

const arbRouteWithGeometry: fc.Arbitrary<RouteOption> = fc.record({
  id: fc.uuid(),
  modes: fc.array(arbTransportMode, { minLength: 1, maxLength: 3 }),
  totalDuration: fc.nat({ max: 7200 }),
  totalDistance: fc.nat({ max: 100000 }),
  estimatedCost: fc.nat({ max: 50000 }),
  numTransfers: fc.nat({ max: 5 }),
  walkDistance: fc.nat({ max: 5000 }),
  carbonGrams: fc.nat({ max: 10000 }),
  steps: fc.constant([]),
  geometry: arbValidGeometry,
});

const arbRouteWithoutGeometry: fc.Arbitrary<RouteOption> = fc.record({
  id: fc.uuid(),
  modes: fc.array(arbTransportMode, { minLength: 1, maxLength: 3 }),
  totalDuration: fc.nat({ max: 7200 }),
  totalDistance: fc.nat({ max: 100000 }),
  estimatedCost: fc.nat({ max: 50000 }),
  numTransfers: fc.nat({ max: 5 }),
  walkDistance: fc.nat({ max: 5000 }),
  carbonGrams: fc.nat({ max: 10000 }),
  steps: fc.constant([]),
  geometry: fc.constantFrom('', undefined as unknown as string),
});

// ────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  polylineInstances.length = 0;
});

describe('Property 15: Route Overlay Fidelity', () => {
  describe('for N routes with valid geometry, exactly N Polyline instances are created', () => {
    it('creates exactly N polylines for N routes with valid geometry', () => {
      fc.assert(
        fc.property(fc.array(arbRouteWithGeometry, { minLength: 1, maxLength: 8 }), (routes) => {
          polylineInstances.length = 0;
          vi.clearAllMocks();

          const { unmount } = render(
            <MapInstanceContext.Provider value={mockMap}>
              <RouteOverlay routes={routes} />
            </MapInstanceContext.Provider>,
          );

          expect(polylineInstances).toHaveLength(routes.length);
          unmount();
        }),
        { numRuns: 50 },
      );
    });

    it('routes with missing/empty geometry are skipped (0 polylines created)', () => {
      fc.assert(
        fc.property(fc.array(arbRouteWithoutGeometry, { minLength: 1, maxLength: 5 }), (routes) => {
          polylineInstances.length = 0;
          vi.clearAllMocks();

          const { unmount } = render(
            <MapInstanceContext.Provider value={mockMap}>
              <RouteOverlay routes={routes} />
            </MapInstanceContext.Provider>,
          );

          expect(polylineInstances).toHaveLength(0);
          unmount();
        }),
        { numRuns: 30 },
      );
    });

    it('mixed valid/invalid geometry: only valid routes produce polylines', () => {
      fc.assert(
        fc.property(
          fc.array(arbRouteWithGeometry, { minLength: 1, maxLength: 4 }),
          fc.array(arbRouteWithoutGeometry, { minLength: 1, maxLength: 4 }),
          (validRoutes, invalidRoutes) => {
            polylineInstances.length = 0;
            vi.clearAllMocks();

            const allRoutes = [...validRoutes, ...invalidRoutes];

            const { unmount } = render(
              <MapInstanceContext.Provider value={mockMap}>
                <RouteOverlay routes={allRoutes} />
              </MapInstanceContext.Provider>,
            );

            expect(polylineInstances).toHaveLength(validRoutes.length);
            unmount();
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('selected route has strictly greater stroke weight, opacity, and z-index than unselected', () => {
    it('selected polyline has strokeWeight > unselected (6 vs 3)', () => {
      fc.assert(
        fc.property(
          fc.array(arbRouteWithGeometry, { minLength: 2, maxLength: 6 }),
          fc.nat(),
          (routes, selectedIdx) => {
            polylineInstances.length = 0;
            vi.clearAllMocks();

            const idx = selectedIdx % routes.length;
            const selectedRouteId = routes[idx].id;

            const { unmount } = render(
              <MapInstanceContext.Provider value={mockMap}>
                <RouteOverlay routes={routes} selectedRouteId={selectedRouteId} />
              </MapInstanceContext.Provider>,
            );

            expect(polylineInstances).toHaveLength(routes.length);

            const selectedPolyline = polylineInstances[idx];
            const unselectedPolylines = polylineInstances.filter((_, i) => i !== idx);

            // Selected has strokeWeight 6
            expect(selectedPolyline._opts.strokeWeight).toBe(6);

            // All unselected have strokeWeight 3
            for (const p of unselectedPolylines) {
              expect(p._opts.strokeWeight).toBe(3);
            }

            // Selected strictly greater than each unselected
            for (const p of unselectedPolylines) {
              expect(selectedPolyline._opts.strokeWeight).toBeGreaterThan(p._opts.strokeWeight);
            }

            unmount();
          },
        ),
        { numRuns: 50 },
      );
    });

    it('selected polyline has strokeOpacity > unselected (1.0 vs 0.5)', () => {
      fc.assert(
        fc.property(
          fc.array(arbRouteWithGeometry, { minLength: 2, maxLength: 6 }),
          fc.nat(),
          (routes, selectedIdx) => {
            polylineInstances.length = 0;
            vi.clearAllMocks();

            const idx = selectedIdx % routes.length;
            const selectedRouteId = routes[idx].id;

            const { unmount } = render(
              <MapInstanceContext.Provider value={mockMap}>
                <RouteOverlay routes={routes} selectedRouteId={selectedRouteId} />
              </MapInstanceContext.Provider>,
            );

            expect(polylineInstances).toHaveLength(routes.length);

            const selectedPolyline = polylineInstances[idx];
            const unselectedPolylines = polylineInstances.filter((_, i) => i !== idx);

            // Selected has opacity 1.0
            expect(selectedPolyline._opts.strokeOpacity).toBe(1.0);

            // All unselected have opacity 0.5
            for (const p of unselectedPolylines) {
              expect(p._opts.strokeOpacity).toBe(0.5);
            }

            // Selected strictly greater than each unselected
            for (const p of unselectedPolylines) {
              expect(selectedPolyline._opts.strokeOpacity).toBeGreaterThan(p._opts.strokeOpacity);
            }

            unmount();
          },
        ),
        { numRuns: 50 },
      );
    });

    it('selected polyline has zIndex > unselected (2 vs 1)', () => {
      fc.assert(
        fc.property(
          fc.array(arbRouteWithGeometry, { minLength: 2, maxLength: 6 }),
          fc.nat(),
          (routes, selectedIdx) => {
            polylineInstances.length = 0;
            vi.clearAllMocks();

            const idx = selectedIdx % routes.length;
            const selectedRouteId = routes[idx].id;

            const { unmount } = render(
              <MapInstanceContext.Provider value={mockMap}>
                <RouteOverlay routes={routes} selectedRouteId={selectedRouteId} />
              </MapInstanceContext.Provider>,
            );

            expect(polylineInstances).toHaveLength(routes.length);

            const selectedPolyline = polylineInstances[idx];
            const unselectedPolylines = polylineInstances.filter((_, i) => i !== idx);

            // Selected has zIndex 2
            expect(selectedPolyline._opts.zIndex).toBe(2);

            // All unselected have zIndex 1
            for (const p of unselectedPolylines) {
              expect(p._opts.zIndex).toBe(1);
            }

            // Selected strictly greater than each unselected
            for (const p of unselectedPolylines) {
              expect(selectedPolyline._opts.zIndex).toBeGreaterThan(p._opts.zIndex);
            }

            unmount();
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
