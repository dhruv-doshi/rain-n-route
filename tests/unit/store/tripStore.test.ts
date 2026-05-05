import { beforeEach, describe, expect, it } from 'vitest';
import { useTripStore } from '@/store/tripStore';
import type { PlannedTrip } from '@/types';

function makeTrip(id = 'trip-1'): PlannedTrip {
  return {
    request: {
      from: { lat: 12.97, lng: 77.59 },
      to: { lat: 12.93, lng: 77.68 },
      modes: ['transit'],
      sortBy: 'fastest',
    },
    routes: [
      {
        id: 'route-1',
        modes: ['transit'],
        totalDuration: 1800,
        totalDistance: 12000,
        estimatedCost: 3000,
        numTransfers: 1,
        walkDistance: 400,
        carbonGrams: 200,
        steps: [],
        geometry: '',
      },
    ],
    generatedAt: '2026-01-01T09:00:00+05:30',
  };
}

beforeEach(() => {
  useTripStore.setState({ current: null });
});

describe('useTripStore', () => {
  it('starts with no current trip', () => {
    expect(useTripStore.getState().current).toBeNull();
  });

  it('sets a trip', () => {
    useTripStore.getState().set(makeTrip());
    expect(useTripStore.getState().current).not.toBeNull();
  });

  it('selectRoute updates selectedRouteId', () => {
    useTripStore.getState().set(makeTrip());
    useTripStore.getState().selectRoute('route-1');
    expect(useTripStore.getState().current?.selectedRouteId).toBe('route-1');
  });

  it('selectRoute is a no-op when there is no current trip', () => {
    useTripStore.getState().selectRoute('route-1');
    expect(useTripStore.getState().current).toBeNull();
  });

  it('clear resets to null', () => {
    useTripStore.getState().set(makeTrip());
    useTripStore.getState().clear();
    expect(useTripStore.getState().current).toBeNull();
  });

  it('persist.clearStorage removes the sessionStorage key', () => {
    useTripStore.getState().set(makeTrip());
    // Triggers sessionStorageAdapter.removeItem — covers line 16
    useTripStore.persist.clearStorage();
    expect(sessionStorage.getItem('cw:trip')).toBeNull();
  });
});
