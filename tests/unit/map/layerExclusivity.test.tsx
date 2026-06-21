import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { MapControls } from '@/components/map/MapControls';
import type { RouteOption } from '@/types';

/**
 * Property 7: Layer Exclusivity
 *
 * For any sequence of layer switches (base, traffic, transit),
 * at most one overlay (TrafficLayer OR TransitLayer) is attached at any time.
 *
 * **Validates: Requirements 11.4**
 */

// ────────────────────────────────────────────────────────────────────
// Setup: Track setMap calls per layer instance
// ────────────────────────────────────────────────────────────────────

type MapLayer = 'base' | 'traffic' | 'transit';

// Track the current map attachment for each layer type
let trafficCurrentMap: unknown = null;
let transitCurrentMap: unknown = null;

const mockTrafficSetMap = vi.fn((map: unknown) => {
  trafficCurrentMap = map;
});
const mockTransitSetMap = vi.fn((map: unknown) => {
  transitCurrentMap = map;
});

const mockMap = {
  panTo: vi.fn(),
  setZoom: vi.fn(),
  fitBounds: vi.fn(),
} as unknown as google.maps.Map;

vi.stubGlobal('google', {
  maps: {
    TrafficLayer: function MockTrafficLayer() {
      return { setMap: mockTrafficSetMap };
    },
    TransitLayer: function MockTransitLayer() {
      return { setMap: mockTransitSetMap };
    },
    LatLngBounds: function MockLatLngBounds() {
      return { extend: vi.fn() };
    },
  },
});

const routes: RouteOption[] = [
  {
    id: 'r1',
    modes: ['car'],
    totalDuration: 900,
    totalDistance: 5000,
    estimatedCost: 0,
    numTransfers: 0,
    walkDistance: 0,
    carbonGrams: 0,
    steps: [],
    geometry: '_p~iF~ps|U',
  },
];

const baseProps = {
  center: { lat: 12.97, lng: 77.59 },
  routes,
  onLayerChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  trafficCurrentMap = null;
  transitCurrentMap = null;
});

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function assertAtMostOneOverlayAttached() {
  const trafficAttached = trafficCurrentMap !== null;
  const transitAttached = transitCurrentMap !== null;
  // At most one overlay is attached at any time
  expect(trafficAttached && transitAttached).toBe(false);
}

// ────────────────────────────────────────────────────────────────────
// Arbitraries
// ────────────────────────────────────────────────────────────────────

const arbLayer: fc.Arbitrary<MapLayer> = fc.constantFrom('base', 'traffic', 'transit');
const arbLayerSequence: fc.Arbitrary<MapLayer[]> = fc.array(arbLayer, {
  minLength: 1,
  maxLength: 20,
});

// ────────────────────────────────────────────────────────────────────
// Property Tests
// ────────────────────────────────────────────────────────────────────

describe('Layer Exclusivity — Property 7', () => {
  it('for any sequence of layer switches, at most one overlay is attached at any time', () => {
    fc.assert(
      fc.property(arbLayerSequence, (layers) => {
        // Reset state before each test case
        vi.clearAllMocks();
        trafficCurrentMap = null;
        transitCurrentMap = null;

        // Render with the first layer
        const onLayerChange = vi.fn();
        const { rerender, unmount } = render(
          <MapInstanceContext.Provider value={mockMap}>
            <MapControls {...baseProps} activeLayer={layers[0]} onLayerChange={onLayerChange} />
          </MapInstanceContext.Provider>,
        );

        // Check invariant after initial render
        assertAtMostOneOverlayAttached();

        // Apply each subsequent layer switch
        for (let i = 1; i < layers.length; i++) {
          rerender(
            <MapInstanceContext.Provider value={mockMap}>
              <MapControls {...baseProps} activeLayer={layers[i]} onLayerChange={onLayerChange} />
            </MapInstanceContext.Provider>,
          );

          // After each switch, verify the exclusivity invariant
          assertAtMostOneOverlayAttached();
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('after each switch, the correct overlay is attached', () => {
    fc.assert(
      fc.property(arbLayerSequence, (layers) => {
        vi.clearAllMocks();
        trafficCurrentMap = null;
        transitCurrentMap = null;

        const onLayerChange = vi.fn();
        const { rerender, unmount } = render(
          <MapInstanceContext.Provider value={mockMap}>
            <MapControls {...baseProps} activeLayer={layers[0]} onLayerChange={onLayerChange} />
          </MapInstanceContext.Provider>,
        );

        for (let i = 1; i < layers.length; i++) {
          rerender(
            <MapInstanceContext.Provider value={mockMap}>
              <MapControls {...baseProps} activeLayer={layers[i]} onLayerChange={onLayerChange} />
            </MapInstanceContext.Provider>,
          );
        }

        // After the final layer is applied, verify the correct state
        const finalLayer = layers[layers.length - 1];
        if (finalLayer === 'traffic') {
          expect(trafficCurrentMap).toBe(mockMap);
          expect(transitCurrentMap).toBeNull();
        } else if (finalLayer === 'transit') {
          expect(transitCurrentMap).toBe(mockMap);
          expect(trafficCurrentMap).toBeNull();
        } else {
          // base
          expect(trafficCurrentMap).toBeNull();
          expect(transitCurrentMap).toBeNull();
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  // ────────────────────────────────────────────────────────────────────
  // Specific Scenarios
  // ────────────────────────────────────────────────────────────────────

  it('base → traffic: traffic attached, transit detached', () => {
    const onLayerChange = vi.fn();
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...baseProps} activeLayer="base" onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );

    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...baseProps} activeLayer="traffic" onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );

    expect(trafficCurrentMap).toBe(mockMap);
    expect(transitCurrentMap).toBeNull();
  });

  it('traffic → transit: traffic detached, transit attached', () => {
    const onLayerChange = vi.fn();
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...baseProps} activeLayer="traffic" onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );

    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...baseProps} activeLayer="transit" onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );

    expect(trafficCurrentMap).toBeNull();
    expect(transitCurrentMap).toBe(mockMap);
  });

  it('transit → base: both detached', () => {
    const onLayerChange = vi.fn();
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...baseProps} activeLayer="transit" onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );

    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...baseProps} activeLayer="base" onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );

    expect(trafficCurrentMap).toBeNull();
    expect(transitCurrentMap).toBeNull();
  });

  it('unmount: both layers have setMap(null) called', () => {
    const onLayerChange = vi.fn();
    const { unmount } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...baseProps} activeLayer="traffic" onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );

    // Traffic is attached
    expect(trafficCurrentMap).toBe(mockMap);

    unmount();

    // After unmount, both should be detached
    expect(trafficCurrentMap).toBeNull();
    expect(transitCurrentMap).toBeNull();
  });

  it('both overlays are never simultaneously attached (property)', () => {
    fc.assert(
      fc.property(arbLayerSequence, (layers) => {
        vi.clearAllMocks();
        trafficCurrentMap = null;
        transitCurrentMap = null;

        const onLayerChange = vi.fn();
        const { rerender, unmount } = render(
          <MapInstanceContext.Provider value={mockMap}>
            <MapControls {...baseProps} activeLayer={layers[0]} onLayerChange={onLayerChange} />
          </MapInstanceContext.Provider>,
        );

        for (let i = 1; i < layers.length; i++) {
          rerender(
            <MapInstanceContext.Provider value={mockMap}>
              <MapControls {...baseProps} activeLayer={layers[i]} onLayerChange={onLayerChange} />
            </MapInstanceContext.Provider>,
          );

          // Critical invariant: both should never be non-null simultaneously
          const bothAttached = trafficCurrentMap !== null && transitCurrentMap !== null;
          expect(bothAttached).toBe(false);
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
