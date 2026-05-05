import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRecurringStore } from '@/store/recurringStore';
import type { RecurringCommute } from '@/types';

function makeCommute(id: string): RecurringCommute {
  return {
    id,
    name: `Commute ${id}`,
    fromLocationId: 'home',
    toLocationId: 'office',
    daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
    departTime: '09:00',
    preferredMode: 'transit',
    bufferMinutes: 10,
    active: true,
    createdAt: '2026-01-01T00:00:00+05:30',
  };
}

beforeEach(() => {
  useRecurringStore.setState({ commutes: [] });
});

describe('useRecurringStore', () => {
  it('adds a commute', () => {
    useRecurringStore.getState().add(makeCommute('a'));
    expect(useRecurringStore.getState().commutes).toHaveLength(1);
  });

  it('does not add duplicate id', () => {
    useRecurringStore.getState().add(makeCommute('a'));
    useRecurringStore.getState().add(makeCommute('a'));
    expect(useRecurringStore.getState().commutes).toHaveLength(1);
  });

  it('updates a commute', () => {
    useRecurringStore.getState().add(makeCommute('a'));
    useRecurringStore.getState().update('a', { name: 'Morning Run' });
    expect(useRecurringStore.getState().commutes[0].name).toBe('Morning Run');
  });

  it('removes a commute', () => {
    useRecurringStore.getState().add(makeCommute('a'));
    useRecurringStore.getState().remove('a');
    expect(useRecurringStore.getState().commutes).toHaveLength(0);
  });

  it('update on unknown id is a no-op', () => {
    useRecurringStore.getState().add(makeCommute('a'));
    useRecurringStore.getState().update('unknown', { name: 'X' });
    expect(useRecurringStore.getState().commutes[0].name).toBe('Commute a');
  });

  it('toggles active state', () => {
    useRecurringStore.getState().add(makeCommute('a'));
    useRecurringStore.getState().setActive('a', false);
    expect(useRecurringStore.getState().commutes[0].active).toBe(false);
  });
});
