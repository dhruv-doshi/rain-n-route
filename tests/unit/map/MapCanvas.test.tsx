import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapCanvas } from '@/components/map/MapCanvas';

const { mockRemove, mockOn, MockMap } = vi.hoisted(() => {
  const mockRemove = vi.fn();
  const mockOn = vi.fn();

  // Must use regular function (not arrow) for constructor mock
  function MockMapImpl(this: unknown) {
    return {
      on: mockOn,
      off: vi.fn(),
      remove: mockRemove,
      getCanvas: vi.fn(() => ({ style: {} as CSSStyleDeclaration })),
    };
  }

  const MockMap = vi.fn().mockImplementation(MockMapImpl);
  return { mockRemove, mockOn, MockMap };
});

vi.mock('maplibre-gl', () => ({
  default: { Map: MockMap },
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

const MOCK_URL = 'https://tiles.example.com/{z}/{x}/{y}.png';
const CENTER = { lat: 12.97, lng: 77.59 };

function triggerLoad() {
  const loadCall = mockOn.mock.calls.find(([event]: [string]) => event === 'load');
  if (loadCall) {
    const [, cb] = loadCall as [string, () => void];
    cb();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MapCanvas', () => {
  it('renders a container div with aria-label', () => {
    const { getByRole } = render(<MapCanvas center={CENTER} tilesUrl={MOCK_URL} />);
    expect(getByRole('img', { name: 'Route map' })).toBeTruthy();
  });

  it('calls map.remove() on unmount', async () => {
    const { unmount } = render(<MapCanvas center={CENTER} tilesUrl={MOCK_URL} />);
    await waitFor(() => expect(MockMap).toHaveBeenCalled());
    unmount();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('does not leak — remove called on each of 10 mount/unmount cycles', async () => {
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<MapCanvas center={CENTER} tilesUrl={MOCK_URL} />);
      await waitFor(() => expect(MockMap).toHaveBeenCalledTimes(i + 1));
      unmount();
    }
    expect(mockRemove).toHaveBeenCalledTimes(10);
  });

  it('calls onReady when map fires load event', async () => {
    const onReady = vi.fn();
    render(<MapCanvas center={CENTER} tilesUrl={MOCK_URL} onReady={onReady} />);
    await waitFor(() => expect(mockOn).toHaveBeenCalled());
    triggerLoad();
    await waitFor(() => expect(onReady).toHaveBeenCalled());
  });
});
