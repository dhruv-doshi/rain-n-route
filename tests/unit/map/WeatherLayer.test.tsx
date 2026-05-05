import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { WeatherLayer } from '@/components/map/WeatherLayer';
import type { RouteOption } from '@/types';

vi.mock('maplibre-gl', () => ({
  default: {
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
  },
}));

const mockMap = {
  addSource: vi.fn(),
  addLayer: vi.fn(),
  on: vi.fn(),
};

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
  geometry: '_p~iF~ps|U',
  weatherRisk: {
    overall: 'moderate',
    factors: [{ kind: 'rain', level: 'moderate', reason: 'Light rain expected' }],
    gear: [],
    bufferMinutesRecommended: 5,
  },
};

describe('WeatherLayer', () => {
  it('renders null (no DOM nodes)', () => {
    const { container } = render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <WeatherLayer route={route} />
      </MapInstanceContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('is a no-op when weatherRisk is undefined', () => {
    const { container } = render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <WeatherLayer route={{ ...route, weatherRisk: undefined }} />
      </MapInstanceContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
