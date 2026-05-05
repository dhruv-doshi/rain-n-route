import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuickLocationChips } from '@/components/planner/QuickLocationChips';
import { useLocationsStore } from '@/store/locationsStore';
import type { SavedLocation } from '@/types';

const HOME: SavedLocation = {
  id: 'home-1',
  kind: 'home',
  label: 'My Home',
  address: '12 MG Road, Bengaluru',
  coords: { lat: 12.97, lng: 77.59 },
  createdAt: '2026-01-01T00:00:00+05:30',
  lastUsedAt: '2026-01-01T00:00:00+05:30',
};

const OFFICE: SavedLocation = {
  id: 'office-1',
  kind: 'office',
  label: 'My Office',
  address: 'Koramangala, Bengaluru',
  coords: { lat: 12.93, lng: 77.62 },
  createdAt: '2026-01-01T00:00:00+05:30',
  lastUsedAt: '2026-01-01T00:00:00+05:30',
};

beforeEach(() => {
  useLocationsStore.setState({ locations: [] });
  // Stub geolocation
  Object.defineProperty(global.navigator, 'geolocation', {
    writable: true,
    value: { getCurrentPosition: vi.fn() },
  });
});

describe('QuickLocationChips', () => {
  it('shows Home chip when a home location is saved', () => {
    useLocationsStore.setState({ locations: [HOME] });
    render(<QuickLocationChips onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
  });

  it('shows Office chip when an office location is saved', () => {
    useLocationsStore.setState({ locations: [OFFICE] });
    render(<QuickLocationChips onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /office/i })).toBeInTheDocument();
  });

  it('calls onSelect with home location when Home chip is clicked', async () => {
    useLocationsStore.setState({ locations: [HOME] });
    const onSelect = vi.fn();
    render(<QuickLocationChips onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /home/i }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: HOME.id, label: HOME.label }),
    );
  });

  it('calls onSelect with office location when Office chip is clicked', async () => {
    useLocationsStore.setState({ locations: [OFFICE] });
    const onSelect = vi.fn();
    render(<QuickLocationChips onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /office/i }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: OFFICE.id, label: OFFICE.label }),
    );
  });

  it('shows My location button', () => {
    render(<QuickLocationChips onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /my location/i })).toBeInTheDocument();
  });

  it('does not show Home or Office chips when no locations are saved', () => {
    render(<QuickLocationChips onSelect={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^home$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^office$/i })).not.toBeInTheDocument();
  });
});
