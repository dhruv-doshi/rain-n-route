import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { MapControls } from '@/components/map/MapControls';
import type { RouteOption } from '@/types';

const mockPanTo = vi.fn();
const mockSetZoom = vi.fn();
const mockFitBounds = vi.fn();
const mockTrafficSetMap = vi.fn();
const mockTransitSetMap = vi.fn();

const mockMap = {
  panTo: mockPanTo,
  setZoom: mockSetZoom,
  fitBounds: mockFitBounds,
} as unknown as google.maps.Map;

// Mock google.maps globals with proper constructors
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

const defaultProps = {
  center: { lat: 12.97, lng: 77.59 },
  routes,
  activeLayer: 'base' as const,
  onLayerChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MapControls', () => {
  it('renders three control buttons', () => {
    render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} />
      </MapInstanceContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /recenter/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /fit route/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /toggle map layer/i })).toBeTruthy();
  });

  it('calls map.panTo and setZoom on recenter click', () => {
    render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} />
      </MapInstanceContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /recenter/i }));
    expect(mockPanTo).toHaveBeenCalledWith({ lat: 12.97, lng: 77.59 });
    expect(mockSetZoom).toHaveBeenCalledWith(12);
  });

  it('calls map.fitBounds on fit-route click', () => {
    render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} />
      </MapInstanceContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /fit route/i }));
    expect(mockFitBounds).toHaveBeenCalled();
  });

  it('calls onLayerChange on layer toggle', () => {
    const onLayerChange = vi.fn();
    render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /toggle map layer/i }));
    expect(onLayerChange).toHaveBeenCalledWith('traffic');
  });

  it('calls setMap(null) on traffic and transit layers on unmount', () => {
    const { unmount } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} activeLayer="traffic" />
      </MapInstanceContext.Provider>,
    );
    // During render with activeLayer=traffic, traffic layer gets attached
    expect(mockTrafficSetMap).toHaveBeenCalledWith(mockMap);

    unmount();
    // On unmount, both layers should have setMap(null) called
    expect(mockTrafficSetMap).toHaveBeenCalledWith(null);
    expect(mockTransitSetMap).toHaveBeenCalledWith(null);
  });

  it('detaches transit layer when switching from transit to base', () => {
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} activeLayer="transit" />
      </MapInstanceContext.Provider>,
    );
    expect(mockTransitSetMap).toHaveBeenCalledWith(mockMap);

    mockTrafficSetMap.mockClear();
    mockTransitSetMap.mockClear();

    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} activeLayer="base" />
      </MapInstanceContext.Provider>,
    );
    // Both layers should be detached when switching to base
    expect(mockTrafficSetMap).toHaveBeenCalledWith(null);
    expect(mockTransitSetMap).toHaveBeenCalledWith(null);
  });

  it('detaches traffic layer when switching to transit', () => {
    const { rerender } = render(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} activeLayer="traffic" />
      </MapInstanceContext.Provider>,
    );
    expect(mockTrafficSetMap).toHaveBeenCalledWith(mockMap);

    mockTrafficSetMap.mockClear();
    mockTransitSetMap.mockClear();

    rerender(
      <MapInstanceContext.Provider value={mockMap}>
        <MapControls {...defaultProps} activeLayer="transit" />
      </MapInstanceContext.Provider>,
    );
    // Traffic detached, transit attached
    expect(mockTrafficSetMap).toHaveBeenCalledWith(null);
    expect(mockTransitSetMap).toHaveBeenCalledWith(mockMap);
  });
});
