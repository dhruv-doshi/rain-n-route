import { describe, it, expect } from 'vitest';
import { aggregateByMode, computeWeeklyInsight } from '@/lib/insights';
import type { CommuteLogEntry } from '@/types';

const ORIGIN = { coords: { lat: 12.97, lng: 77.59 }, address: 'A' };
const DEST = { coords: { lat: 12.98, lng: 77.6 }, address: 'B' };

function entry(over: Partial<CommuteLogEntry>): CommuteLogEntry {
  return {
    id: 'x',
    date: '2026-05-04T09:00:00+05:30',
    from: ORIGIN,
    to: DEST,
    mode: 'car',
    estimatedDuration: 1800,
    estimatedCost: 5000,
    ...over,
  };
}

describe('aggregateByMode', () => {
  it('returns empty array for empty input', () => {
    expect(aggregateByMode([])).toEqual([]);
  });

  it('counts commutes and minutes per mode', () => {
    const entries = [
      entry({ id: 'a', mode: 'car', estimatedDuration: 1800 }),
      entry({ id: 'b', mode: 'car', estimatedDuration: 1200 }),
      entry({ id: 'c', mode: 'transit', estimatedDuration: 2400 }),
    ];
    const r = aggregateByMode(entries);
    expect(r).toHaveLength(2);
    const car = r.find((x) => x.mode === 'car')!;
    expect(car.commutes).toBe(2);
    expect(car.minutes).toBe(50); // 30 + 20
    const transit = r.find((x) => x.mode === 'transit')!;
    expect(transit.commutes).toBe(1);
    expect(transit.minutes).toBe(40);
  });

  it('prefers actualDuration over estimatedDuration when present', () => {
    const r = aggregateByMode([
      entry({ id: 'a', mode: 'car', estimatedDuration: 1800, actualDuration: 600 }),
    ]);
    expect(r[0].minutes).toBe(10);
  });

  it('sorts modes by commute count desc', () => {
    const r = aggregateByMode([
      entry({ id: '1', mode: 'walk' }),
      entry({ id: '2', mode: 'car' }),
      entry({ id: '3', mode: 'car' }),
      entry({ id: '4', mode: 'car' }),
    ]);
    expect(r[0].mode).toBe('car');
    expect(r[1].mode).toBe('walk');
  });
});

describe('computeWeeklyInsight', () => {
  it('returns null for empty entries', () => {
    expect(computeWeeklyInsight([])).toBeNull();
  });

  it('aggregates totals and per-mode breakdown for the week', () => {
    const monday = '2026-05-04T09:00:00+05:30'; // Monday
    const tuesday = '2026-05-05T09:00:00+05:30';
    const result = computeWeeklyInsight(
      [
        entry({ id: 'a', date: monday, mode: 'car', estimatedDuration: 1800, estimatedCost: 5000 }),
        entry({
          id: 'b',
          date: tuesday,
          mode: 'transit',
          estimatedDuration: 2400,
          estimatedCost: 3000,
        }),
      ],
      monday,
    );
    expect(result).not.toBeNull();
    expect(result!.totalCommutes).toBe(2);
    expect(result!.totalMinutes).toBe(70); // 30 + 40
    expect(result!.totalSpendPaise).toBe(8000);
    expect(result!.byMode.car!.commutes).toBe(1);
    expect(result!.byMode.transit!.commutes).toBe(1);
  });

  it('excludes entries outside the reference week', () => {
    const thisWeek = '2026-05-04T09:00:00+05:30';
    const lastMonth = '2026-04-01T09:00:00+05:30';
    const r = computeWeeklyInsight(
      [entry({ id: 'a', date: thisWeek }), entry({ id: 'b', date: lastMonth })],
      thisWeek,
    );
    expect(r!.totalCommutes).toBe(1);
  });
});
