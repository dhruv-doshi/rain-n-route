import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { RouteOverlay } from '@/components/map/RouteOverlay';
import type { RouteOption } from '@/types';

const mockAddSource = vi.fn();
const mockAddLayer = vi.fn();
const mockRemoveLayer = vi.fn();
const mockRemoveSource = vi.fn();
const mockGetSource = vi.fn(() => null);
const mockGetLayer = vi.fn(() => null);
const mockSetPaintProperty = vi.fn();
const mockOn = vi.fn();
const mockGetCanvas = vi.fn(() => ({ style: {} as CSSStyleDeclaration }));

const mockMap = {
  addSource: mockAddSource,
  addLayer: mockAddLayer,
  removeLayer: mockRemoveLayer,
  removeSource: mockRemoveSource,
  getSource: mockGetSource,
  getLayer: mockGetLayer,
  setPaintProperty: mockSetPaintProperty,
  on: mockOn,
  getCanvas: mockGetCanvas,
};

// Encode a simple polyline: one point at (12.97, 77.59)
const ENCODED = '_p~iF~ps|U';

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

describe('RouteOverlay', () => {
  it('adds source and layer for each route', async () => {
    render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <RouteOverlay routes={routes} />
      </MapInstanceContext.Provider>,
    );
    await waitFor(() =>
      expect(mockAddSource).toHaveBeenCalledWith('route-source-r1', expect.any(Object)),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'route-layer-r1' }));
  });

  it('removes layers and sources on unmount', async () => {
    // Start with null returns so layers/sources get added
    mockGetLayer.mockReturnValue(null);
    mockGetSource.mockReturnValue(null);

    const { unmount } = render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <RouteOverlay routes={routes} />
      </MapInstanceContext.Provider>,
    );
    await waitFor(() => expect(mockAddLayer).toHaveBeenCalled());

    // Simulate that layers/sources exist when cleanup runs
    mockGetLayer.mockReturnValue({ id: 'route-layer-r1' });
    mockGetSource.mockReturnValue({});
    unmount();
    expect(mockRemoveLayer).toHaveBeenCalledWith('route-layer-r1');
    expect(mockRemoveSource).toHaveBeenCalledWith('route-source-r1');
  });

  it('renders null when map is not ready', () => {
    const { container } = render(
      <MapInstanceContext.Provider value={null}>
        <RouteOverlay routes={routes} />
      </MapInstanceContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
