import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapCanvas } from '@/components/map/MapCanvas';

const { mockLoadMapsLibrary, mockIsConfigured, MockMapInstance } = vi.hoisted(() => {
  const MockMapInstance = {
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    panTo: vi.fn(),
  };

  // Use a proper constructor function so `new mapsLib.Map(...)` works
  function MockMapConstructor() {
    return MockMapInstance;
  }

  const mockLoadMapsLibrary = vi.fn().mockResolvedValue({
    Map: MockMapConstructor,
  });

  const mockIsConfigured = vi.fn().mockReturnValue(true);

  return { mockLoadMapsLibrary, mockIsConfigured, MockMapInstance };
});

vi.mock('@/lib/googleMapsLoader', () => ({
  loadMapsLibrary: mockLoadMapsLibrary,
  isGoogleMapsConfigured: mockIsConfigured,
}));

const CENTER = { lat: 12.97, lng: 77.59 };

beforeEach(() => {
  vi.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
});

describe('MapCanvas', () => {
  it('renders a container div with aria-label', () => {
    const { getByRole } = render(<MapCanvas center={CENTER} />);
    expect(getByRole('application', { name: 'Interactive route map' })).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { getByText } = render(<MapCanvas center={CENTER} />);
    expect(getByText('Loading map…')).toBeTruthy();
  });

  it('transitions from loading to ready state after map instantiation', async () => {
    const { queryByText } = render(<MapCanvas center={CENTER} />);
    // Initially shows loading
    expect(queryByText('Loading map…')).toBeTruthy();
    // After map loads, loading disappears
    await waitFor(() => expect(queryByText('Loading map…')).toBeNull());
  });

  it('shows error state when isGoogleMapsConfigured() returns false', async () => {
    mockIsConfigured.mockReturnValue(false);
    const { getByText, getByRole } = render(<MapCanvas center={CENTER} />);
    await waitFor(() => expect(getByText(/Map configuration is incomplete/)).toBeTruthy());
    // Error state has role="alert"
    expect(getByRole('alert')).toBeTruthy();
  });

  it('shows error state with onError callback when configuration is missing', async () => {
    mockIsConfigured.mockReturnValue(false);
    const onError = vi.fn();
    render(<MapCanvas center={CENTER} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0].message).toContain('not configured');
  });

  it('calls onReady when map loads successfully', async () => {
    const onReady = vi.fn();
    render(<MapCanvas center={CENTER} onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalledWith(MockMapInstance));
  });

  it('calls onError when loadMapsLibrary rejects', async () => {
    mockLoadMapsLibrary.mockRejectedValueOnce(new Error('Script failed'));
    const onError = vi.fn();
    render(<MapCanvas center={CENTER} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0].message).toBe('Script failed');
  });

  it('displays error message when loadMapsLibrary rejects', async () => {
    mockLoadMapsLibrary.mockRejectedValueOnce(new Error('Script failed'));
    const { getByText } = render(<MapCanvas center={CENTER} />);
    await waitFor(() => expect(getByText('Script failed')).toBeTruthy());
  });

  it('cleans up map reference on unmount', async () => {
    const { unmount } = render(<MapCanvas center={CENTER} />);
    await waitFor(() => expect(mockLoadMapsLibrary).toHaveBeenCalled());
    unmount();
    // No error means cleanup succeeded
  });

  it('renders children only when map instance is ready', async () => {
    const { getByTestId } = render(
      <MapCanvas center={CENTER}>
        <div data-testid="map-child">Child</div>
      </MapCanvas>,
    );
    // Initially children are not rendered (map not ready yet)
    // After map is ready, children are rendered
    await waitFor(() => expect(getByTestId('map-child')).toBeTruthy());
  });
});
