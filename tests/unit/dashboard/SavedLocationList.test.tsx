import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SavedLocationList } from '@/components/dashboard/SavedLocationList';
import { useLocationsStore } from '@/store/locationsStore';

beforeEach(() => {
  useLocationsStore.setState({ locations: [] });
});

describe('SavedLocationList', () => {
  it('renders empty state when there are no locations', () => {
    render(<SavedLocationList />);
    expect(screen.getByText(/no saved locations/i)).toBeTruthy();
  });

  it('lists existing locations from the store', () => {
    useLocationsStore.setState({
      locations: [
        {
          id: '1',
          kind: 'home',
          label: 'My Home',
          address: 'Bangalore',
          coords: { lat: 12.97, lng: 77.59 },
          createdAt: '2026-05-04T09:00:00+05:30',
          lastUsedAt: '2026-05-04T09:00:00+05:30',
        },
      ],
    });
    render(<SavedLocationList />);
    expect(screen.getByText('My Home')).toBeTruthy();
  });

  it('removes a location when the trash button is clicked', () => {
    useLocationsStore.setState({
      locations: [
        {
          id: '1',
          kind: 'home',
          label: 'My Home',
          address: 'Bangalore',
          coords: { lat: 12.97, lng: 77.59 },
          createdAt: '2026-05-04T09:00:00+05:30',
          lastUsedAt: '2026-05-04T09:00:00+05:30',
        },
      ],
    });
    render(<SavedLocationList />);
    fireEvent.click(screen.getByRole('button', { name: /remove my home/i }));
    expect(useLocationsStore.getState().locations).toHaveLength(0);
  });

  it('disables the add button at the 15-location cap', () => {
    useLocationsStore.setState({
      locations: Array.from({ length: 15 }, (_, i) => ({
        id: String(i),
        kind: 'favorite' as const,
        label: `L${i}`,
        address: 'X',
        coords: { lat: 12.97, lng: 77.59 },
        createdAt: '2026-05-04T09:00:00+05:30',
        lastUsedAt: '2026-05-04T09:00:00+05:30',
      })),
    });
    render(<SavedLocationList />);
    expect(screen.getByRole('button', { name: /add location/i }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
