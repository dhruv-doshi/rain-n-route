import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { RouteOverlay } from '@/components/map/RouteOverlay';
import type { RouteOption } from '@/types';

const _mockSetMap = vi.fn();
const mockListenerRemove = vi.fn();
const mockAddListener = vi.fn().mockReturnValue({ remove: mockListenerRemove });

const polylineInstances: Array<{
  setMap: typeof _mockSetMap;
  addListener: typeof mockAddListener;
  _opts: Record<string, unknown>;
}> = [];

// Mock google.maps.Polyline as a proper constructor
vi.stubGlobal('google', {
  maps: {
    Polyline: function MockPolyline(this: unknown, opts: unknown) {
      const instance = { setMap: vi.fn(), addListener: mockAddListener, _opts: opts };
      polylineInstances.push(instance as never);
      return instance;
    },
  },
});

const mockMap = {} as unknown as google.maps.Map;

// Encode a simple polyline: two points
const ENCODED = '_p~iF~ps|U_ulLnnqC';

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
    geometry: ENCODED,
  },
];

const routes2: RouteOption[] = [
  {
    id: 'r2',
    modes: ['transit'],
    totalDuration: 1200,
    totalDistance: 6000,
    estimatedCost: 0,
    numTransfers: 1,
    walkDistance: 200,
    carbonGrams: 0,
    steps: [],
    geometry: ENCODED,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  polylineInstances.length = 0;
  mockListenerRemove.mockClear();
});

describe('RouteOverlay', () => {
  it('creates a Polyline for each route with geometry', () => {
    render(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes} />
      </MapInstanceContext.Provider>,
    );
    expect(polylineInstances).toHaveLength(1);
    expect(
      (polylineInstances[0] as unknown as { _opts: { strokeColor: string } })._opts.strokeColor,
    ).toBe('#3b82f6');
  });

  it('calls setMap(null) on polylines when unmounting', () => {
    const { unmount } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes} />
      </MapInstanceContext.Provider>,
    );
    const createdPolyline = polylineInstances[0];
    unmount();
    expect(createdPolyline.setMap).toHaveBeenCalledWith(null);
  });

  it('calls setMap(null) on old polylines when routes change', () => {
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes} />
      </MapInstanceContext.Provider>,
    );
    const oldPolyline = polylineInstances[0];
    expect(oldPolyline.setMap).not.toHaveBeenCalledWith(null);

    // Re-render with new routes
    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes2} />
      </MapInstanceContext.Provider>,
    );
    // Old polyline should have setMap(null) called
    expect(oldPolyline.setMap).toHaveBeenCalledWith(null);
    // New polyline should be created
    expect(polylineInstances).toHaveLength(2);
  });

  it('removes click listeners on route change', () => {
    const onRouteClick = vi.fn();
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes} onRouteClick={onRouteClick} />
      </MapInstanceContext.Provider>,
    );
    expect(mockAddListener).toHaveBeenCalledWith('click', expect.any(Function));

    // Re-render with new routes
    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes2} onRouteClick={onRouteClick} />
      </MapInstanceContext.Provider>,
    );
    // Old listener should be removed
    expect(mockListenerRemove).toHaveBeenCalled();
  });

  it('removes click listeners on unmount', () => {
    const onRouteClick = vi.fn();
    const { unmount } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes} onRouteClick={onRouteClick} />
      </MapInstanceContext.Provider>,
    );
    unmount();
    expect(mockListenerRemove).toHaveBeenCalled();
  });

  it('renders null when map is not ready', () => {
    const { container } = render(
      <MapInstanceContext.Provider value={null}>
        <RouteOverlay routes={routes} />
      </MapInstanceContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
    expect(polylineInstances).toHaveLength(0);
  });

  it('skips routes without geometry', () => {
    const routesNoGeometry: RouteOption[] = [{ ...routes[0], geometry: '' }];
    render(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routesNoGeometry} />
      </MapInstanceContext.Provider>,
    );
    expect(polylineInstances).toHaveLength(0);
  });

  it('applies selected styling to the selected route', () => {
    render(
      <MapInstanceContext.Provider value={mockMap}>
        <RouteOverlay routes={routes} selectedRouteId="r1" />
      </MapInstanceContext.Provider>,
    );
    expect(polylineInstances).toHaveLength(1);
    const opts = (
      polylineInstances[0] as unknown as {
        _opts: { strokeWeight: number; strokeOpacity: number; zIndex: number };
      }
    )._opts;
    expect(opts.strokeWeight).toBe(6);
    expect(opts.strokeOpacity).toBe(1.0);
    expect(opts.zIndex).toBe(2);
  });
});
