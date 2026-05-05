import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHistoryStore } from '@/store/historyStore';
import type { CommuteLogEntry } from '@/types';

function makeEntry(id: string): CommuteLogEntry {
  return {
    id,
    date: '2026-01-01T09:00:00+05:30',
    from: { coords: { lat: 12.9, lng: 77.6 }, address: 'From' },
    to: { coords: { lat: 12.97, lng: 77.64 }, address: 'To' },
    mode: 'transit',
    estimatedDuration: 1800,
    estimatedCost: 3000,
  };
}

beforeEach(() => {
  useHistoryStore.setState({ entries: [] });
});

describe('useHistoryStore', () => {
  it('appends an entry', () => {
    useHistoryStore.getState().append(makeEntry('1'));
    expect(useHistoryStore.getState().entries).toHaveLength(1);
  });

  it('trims to 500 entries', () => {
    for (let i = 0; i < 510; i++) {
      useHistoryStore.getState().append(makeEntry(String(i)));
    }
    expect(useHistoryStore.getState().entries).toHaveLength(500);
  });

  it('prepends new entries (most recent first)', () => {
    useHistoryStore.getState().append(makeEntry('first'));
    useHistoryStore.getState().append(makeEntry('second'));
    expect(useHistoryStore.getState().entries[0].id).toBe('second');
  });

  it('updateActuals patches both duration and cost', () => {
    useHistoryStore.getState().append(makeEntry('x'));
    useHistoryStore.getState().updateActuals('x', { duration: 2000, cost: 4000 });
    const entry = useHistoryStore.getState().entries[0];
    expect(entry.actualDuration).toBe(2000);
    expect(entry.actualCost).toBe(4000);
  });

  it('updateActuals patches only duration', () => {
    useHistoryStore.getState().append(makeEntry('x'));
    useHistoryStore.getState().updateActuals('x', { duration: 1500 });
    const entry = useHistoryStore.getState().entries[0];
    expect(entry.actualDuration).toBe(1500);
    expect(entry.actualCost).toBeUndefined();
  });

  it('updateActuals patches only cost', () => {
    useHistoryStore.getState().append(makeEntry('x'));
    useHistoryStore.getState().updateActuals('x', { cost: 5000 });
    const entry = useHistoryStore.getState().entries[0];
    expect(entry.actualCost).toBe(5000);
    expect(entry.actualDuration).toBeUndefined();
  });

  it('updateActuals on unknown id is a no-op', () => {
    useHistoryStore.getState().append(makeEntry('x'));
    useHistoryStore.getState().updateActuals('unknown', { duration: 999 });
    expect(useHistoryStore.getState().entries[0].actualDuration).toBeUndefined();
  });

  it('clear removes all entries', () => {
    useHistoryStore.getState().append(makeEntry('a'));
    useHistoryStore.getState().append(makeEntry('b'));
    useHistoryStore.getState().clear();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('removes an entry', () => {
    useHistoryStore.getState().append(makeEntry('x'));
    useHistoryStore.getState().remove('x');
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('byMode selector filters correctly', () => {
    useHistoryStore.getState().append({ ...makeEntry('1'), mode: 'car' });
    useHistoryStore.getState().append({ ...makeEntry('2'), mode: 'transit' });
    expect(useHistoryStore.getState().byMode('car')).toHaveLength(1);
    expect(useHistoryStore.getState().byMode('walk')).toHaveLength(0);
  });

  it('recent(n) returns at most n entries', () => {
    for (let i = 0; i < 10; i++) useHistoryStore.getState().append(makeEntry(String(i)));
    expect(useHistoryStore.getState().recent(3)).toHaveLength(3);
  });
});
