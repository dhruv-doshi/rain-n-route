import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MapInstanceContext } from '@/components/map/MapInstanceContext';
import { MapControls } from '@/components/map/MapControls';
import type { RouteOption } from '@/types';

const mockFlyTo = vi.fn();
const mockFitBounds = vi.fn();
const mockGetSource = vi.fn();

const mockMap = {
  flyTo: mockFlyTo,
  fitBounds: mockFitBounds,
  getSource: mockGetSource,
};

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
  currentLayer: 'base' as const,
  onLayerChange: vi.fn(),
  tilesUrlForLayer: vi.fn(() => 'https://tiles.example.com/{z}/{x}/{y}.png'),
};

describe('MapControls', () => {
  it('renders three control buttons', () => {
    render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <MapControls {...defaultProps} />
      </MapInstanceContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /recenter/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /fit route/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /toggle map layer/i })).toBeTruthy();
  });

  it('calls map.flyTo on recenter click', () => {
    render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <MapControls {...defaultProps} />
      </MapInstanceContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /recenter/i }));
    expect(mockFlyTo).toHaveBeenCalledWith({ center: [77.59, 12.97], zoom: 12 });
  });

  it('calls map.fitBounds on fit-route click', () => {
    render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <MapControls {...defaultProps} />
      </MapInstanceContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /fit route/i }));
    expect(mockFitBounds).toHaveBeenCalled();
  });

  it('calls onLayerChange on layer toggle', () => {
    const onLayerChange = vi.fn();
    mockGetSource.mockReturnValue(null);
    render(
      <MapInstanceContext.Provider value={mockMap as never}>
        <MapControls {...defaultProps} onLayerChange={onLayerChange} />
      </MapInstanceContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /toggle map layer/i }));
    expect(onLayerChange).toHaveBeenCalledWith('traffic');
  });
});
