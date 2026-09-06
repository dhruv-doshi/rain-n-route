import { describe, it, expect } from 'vitest';
import { getStuckPlaybook } from '@/lib/stuckPlaybook';
import type { FloodExposureHit } from '@/types';

const floodHit: FloodExposureHit = {
  id: 'fp-1',
  name: 'Hebbal underpass',
  category: 'flood_prone',
  distanceM: 120,
  lat: 13.03,
  lng: 77.59,
  valley: 'Hebbal Nagawara Valley',
};

describe('getStuckPlaybook', () => {
  it('suggests waiting for short delays', () => {
    const actions = getStuckPlaybook({
      delaySec: 8 * 60,
      delayPct: 0.1,
      floodHits: [],
      modes: ['car'],
    });
    expect(actions[0]?.id).toBe('wait');
  });

  it('includes nearby story on short delays when provided', () => {
    const actions = getStuckPlaybook({
      delaySec: 8 * 60,
      delayPct: 0.1,
      floodHits: [],
      modes: ['car'],
      nearbyStoryName: 'Bellandur Lake',
    });
    expect(actions.some((a) => a.id === 'story')).toBe(true);
  });

  it('suggests reroute and metro for medium delays', () => {
    const actions = getStuckPlaybook({
      delaySec: 18 * 60,
      delayPct: 0.25,
      floodHits: [],
      modes: ['car'],
    });
    expect(actions.some((a) => a.id === 'reroute')).toBe(true);
    expect(actions.some((a) => a.id === 'metro')).toBe(true);
  });

  it('warns about underpasses and two-wheeler water when flooded', () => {
    const actions = getStuckPlaybook({
      delaySec: 30 * 60,
      delayPct: 0.4,
      floodHits: [floodHit],
      modes: ['two_wheeler'],
    });
    expect(actions.some((a) => a.id === 'underpass')).toBe(true);
    expect(actions.some((a) => a.id === 'no-ride-water')).toBe(true);
  });

  it('names nearby Metro when transit snapshot matches', () => {
    const actions = getStuckPlaybook({
      delaySec: 18 * 60,
      delayPct: 0.25,
      floodHits: [],
      modes: ['car'],
      nearbyTransit: [
        {
          stop: {
            id: 'metro-halasuru',
            name: 'Halasuru',
            lat: 12.9734,
            lng: 77.6274,
            mode: 'metro',
            line: 'Purple',
            source: 'test',
          },
          distanceM: 450,
        },
      ],
    });
    const metro = actions.find((a) => a.id === 'metro');
    expect(metro?.detail).toContain('Halasuru');
    expect(metro?.detail).toContain('450 m');
  });
});
