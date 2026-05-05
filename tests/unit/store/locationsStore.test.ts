import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLocationsStore } from '@/store/locationsStore';
import type { SavedLocation } from '@/types';

function makeLocation(id: string): SavedLocation {
  return {
    id,
    kind: 'favorite',
    label: `Place ${id}`,
    coords: { lat: 12.9, lng: 77.6 },
    address: `${id} Street`,
    createdAt: '2026-01-01T00:00:00+05:30',
    lastUsedAt: '2026-01-01T00:00:00+05:30',
  };
}

beforeEach(() => {
  useLocationsStore.setState({ locations: [] });
});

describe('useLocationsStore', () => {
  it('adds a location', () => {
    useLocationsStore.getState().add(makeLocation('a'));
    expect(useLocationsStore.getState().locations).toHaveLength(1);
  });

  it('does not add a duplicate id', () => {
    useLocationsStore.getState().add(makeLocation('a'));
    useLocationsStore.getState().add(makeLocation('a'));
    expect(useLocationsStore.getState().locations).toHaveLength(1);
  });

  it('removes a location by id', () => {
    useLocationsStore.getState().add(makeLocation('a'));
    useLocationsStore.getState().remove('a');
    expect(useLocationsStore.getState().locations).toHaveLength(0);
  });

  it('updates a location', () => {
    useLocationsStore.getState().add(makeLocation('a'));
    useLocationsStore.getState().update('a', { label: 'Updated' });
    expect(useLocationsStore.getState().locations[0].label).toBe('Updated');
  });

  it('enforces the 15-item cap', () => {
    for (let i = 0; i < 20; i++) {
      useLocationsStore.getState().add(makeLocation(String(i)));
    }
    expect(useLocationsStore.getState().locations).toHaveLength(15);
  });

  it('update on unknown id is a no-op', () => {
    useLocationsStore.getState().add(makeLocation('a'));
    useLocationsStore.getState().update('unknown', { label: 'X' });
    expect(useLocationsStore.getState().locations[0].label).toBe('Place a');
  });

  it('clears all locations', () => {
    useLocationsStore.getState().add(makeLocation('a'));
    useLocationsStore.getState().clear();
    expect(useLocationsStore.getState().locations).toHaveLength(0);
  });

  it('touches lastUsedAt', () => {
    useLocationsStore.getState().add(makeLocation('a'));
    useLocationsStore.getState().touch('a', '2026-06-01T08:00:00+05:30');
    expect(useLocationsStore.getState().locations[0].lastUsedAt).toBe('2026-06-01T08:00:00+05:30');
  });
});
