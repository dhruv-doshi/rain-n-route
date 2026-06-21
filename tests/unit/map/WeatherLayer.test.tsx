import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { WeatherLayer } from '@/components/map/WeatherLayer';
import type { RouteOption } from '@/types';

const mockUnmount = vi.fn();
const createdMarkers: Array<{ map: unknown }> = [];

const mockLoadMarkerLibrary = vi.fn().mockResolvedValue({
  AdvancedMarkerElement: vi.fn().mockImplementation(function (opts: { map: unknown }) {
    const instance = { map: opts.map };
    createdMarkers.push(instance);
    return instance;
  }),
});

vi.mock('@/lib/googleMapsLoader', () => ({
  loadMarkerLibrary: (...args: unknown[]) => mockLoadMarkerLibrary(...args),
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: mockUnmount,
  })),
}));

const mockMap = {} as unknown as google.maps.Map;

const route: RouteOption = {
  id: 'r1',
  modes: ['car'],
  totalDuration: 900,
  totalDistance: 5000,
  estimatedCost: 0,
  numTransfers: 0,
  walkDistance: 0,
  carbonGrams: 0,
  steps: [],
  geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  weatherRisk: {
    overall: 'moderate',
    factors: [{ kind: 'rain', level: 'moderate', reason: 'Light rain expected' }],
    gear: [],
    bufferMinutesRecommended: 5,
  },
};

const route2: RouteOption = {
  id: 'r2',
  modes: ['transit'],
  totalDuration: 1200,
  totalDistance: 6000,
  estimatedCost: 0,
  numTransfers: 1,
  walkDistance: 200,
  carbonGrams: 0,
  steps: [],
  geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  weatherRisk: {
    overall: 'high',
    factors: [{ kind: 'wind', level: 'high', reason: 'Strong winds expected' }],
    gear: [],
    bufferMinutesRecommended: 10,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  createdMarkers.length = 0;
});

describe('WeatherLayer', () => {
  it('renders null (no DOM nodes)', () => {
    const { container } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <WeatherLayer route={route} />
      </MapInstanceContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('is a no-op when weatherRisk is undefined', () => {
    const { container } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <WeatherLayer route={{ ...route, weatherRisk: undefined }} />
      </MapInstanceContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not create markers when map is unavailable', async () => {
    render(
      <MapInstanceContext.Provider value={null}>
        <WeatherLayer route={route} />
      </MapInstanceContext.Provider>,
    );
    // Allow async effects to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(mockLoadMarkerLibrary).not.toHaveBeenCalled();
  });

  it('cleans up markers on unmount (unmounts React roots and nulls marker.map)', async () => {
    const { unmount } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <WeatherLayer route={route} />
      </MapInstanceContext.Provider>,
    );
    // Wait for async marker creation
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Markers should have been created
    expect(createdMarkers.length).toBeGreaterThan(0);

    unmount();
    // Cleanup is deferred to a microtask to avoid unmounting during a React render
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    // React roots should be unmounted (cleanup called root.unmount())
    expect(mockUnmount).toHaveBeenCalled();
    // Markers should have map set to null
    for (const marker of createdMarkers) {
      expect(marker.map).toBeNull();
    }
  });

  it('removes old markers when route changes', async () => {
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <WeatherLayer route={route} />
      </MapInstanceContext.Provider>,
    );
    // Wait for first batch of markers to be created
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const firstBatchMarkers = [...createdMarkers];
    expect(firstBatchMarkers.length).toBeGreaterThan(0);

    // Re-render with different route (triggers effect cleanup)
    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <WeatherLayer route={route2} />
      </MapInstanceContext.Provider>,
    );
    // Wait for cleanup + new marker creation
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Old markers should have map set to null (cleanup was triggered)
    for (const marker of firstBatchMarkers) {
      expect(marker.map).toBeNull();
    }
    // React roots should have been unmounted
    expect(mockUnmount).toHaveBeenCalled();
  });
});
