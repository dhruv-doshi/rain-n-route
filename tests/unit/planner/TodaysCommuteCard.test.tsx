import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TodaysCommuteCard } from '@/components/planner/TodaysCommuteCard';
import { useRecurringStore } from '@/store/recurringStore';
import { useLocationsStore } from '@/store/locationsStore';
import type { RecurringCommute, SavedLocation, DayOfWeek } from '@/types';

// Force today to Monday for predictable tests
const MONDAY = new Date('2026-05-04T08:00:00+05:30'); // 2026-05-04 is a Monday
vi.setSystemTime(MONDAY);

const HOME: SavedLocation = {
  id: 'home-1',
  kind: 'home',
  label: 'Home',
  address: '12 MG Road',
  coords: { lat: 12.97, lng: 77.59 },
  createdAt: '2026-01-01T00:00:00+05:30',
  lastUsedAt: '2026-01-01T00:00:00+05:30',
};

const OFFICE: SavedLocation = {
  id: 'office-1',
  kind: 'office',
  label: 'Office',
  address: 'Koramangala',
  coords: { lat: 12.93, lng: 77.62 },
  createdAt: '2026-01-01T00:00:00+05:30',
  lastUsedAt: '2026-01-01T00:00:00+05:30',
};

const MONDAY_COMMUTE: RecurringCommute = {
  id: 'rc-1',
  name: 'Morning Commute',
  fromLocationId: 'home-1',
  toLocationId: 'office-1',
  daysOfWeek: ['mon'] as DayOfWeek[],
  departTime: '09:00',
  preferredMode: 'car',
  bufferMinutes: 15,
  active: true,
  createdAt: '2026-01-01T00:00:00+05:30',
};

beforeEach(() => {
  useRecurringStore.setState({ commutes: [] });
  useLocationsStore.setState({ locations: [] });
});

describe('TodaysCommuteCard', () => {
  it('renders nothing when there are no recurring commutes', () => {
    const { container } = render(<TodaysCommuteCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the commute is on a different day', () => {
    useRecurringStore.setState({
      commutes: [{ ...MONDAY_COMMUTE, daysOfWeek: ['tue'] }],
    });
    useLocationsStore.setState({ locations: [HOME, OFFICE] });
    const { container } = render(<TodaysCommuteCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the commute is inactive', () => {
    useRecurringStore.setState({
      commutes: [{ ...MONDAY_COMMUTE, active: false }],
    });
    useLocationsStore.setState({ locations: [HOME, OFFICE] });
    const { container } = render(<TodaysCommuteCard />);
    expect(container.firstChild).toBeNull();
  });

  it("shows today's active commute card", () => {
    useRecurringStore.setState({ commutes: [MONDAY_COMMUTE] });
    useLocationsStore.setState({ locations: [HOME, OFFICE] });
    render(<TodaysCommuteCard />);
    expect(screen.getByText('Morning Commute')).toBeInTheDocument();
    expect(screen.getByText(/Leave at 09:00/)).toBeInTheDocument();
  });

  it('links to the trip plan page with correct query params', () => {
    useRecurringStore.setState({ commutes: [MONDAY_COMMUTE] });
    useLocationsStore.setState({ locations: [HOME, OFFICE] });
    render(<TodaysCommuteCard />);
    const link = screen.getByRole('link', { name: /plan/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/trip/plan'));
    expect(link).toHaveAttribute('href', expect.stringContaining('from='));
    expect(link).toHaveAttribute('href', expect.stringContaining('to='));
  });
});
