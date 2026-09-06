import { describe, it, expect } from 'vitest';
import { findNearbyTransit, formatNearbyTransitLine } from '@/lib/nearbyTransit';

describe('nearbyTransit', () => {
  it('finds Silk Board BMTC near the Silk Board hotspot', () => {
    const stops = findNearbyTransit([{ lat: 12.9176, lng: 77.6233 }]);
    expect(stops.some((s) => s.stop.id === 'bus-silk-board')).toBe(true);
  });

  it('prefers Metro over bus when both are nearby', () => {
    const stops = findNearbyTransit([{ lat: 12.9767, lng: 77.5713 }]);
    expect(stops[0]?.stop.mode).toBe('metro');
    expect(stops[0]?.stop.name).toMatch(/Majestic/i);
  });

  it('formats a readable transit line', () => {
    const stops = findNearbyTransit([{ lat: 12.9176, lng: 77.6233 }]);
    const line = formatNearbyTransitLine(stops);
    expect(line).toMatch(/away/);
  });

  it('returns empty for coords outside Bengaluru', () => {
    expect(findNearbyTransit([{ lat: 15, lng: 74 }])).toEqual([]);
  });
});
