import { describe, it, expect } from 'vitest';
import { estimateRouteCost } from '@/lib/routeCost';
import type { RouteOption } from '@/types';

function makeRoute(overrides: Partial<RouteOption>): RouteOption {
  return {
    id: 'r1',
    modes: ['car'],
    totalDuration: 1_800,
    totalDistance: 8_420,
    estimatedCost: 0,
    numTransfers: 0,
    walkDistance: 0,
    carbonGrams: 0,
    steps: [],
    geometry: '',
    ...overrides,
  };
}

describe('estimateRouteCost', () => {
  it('returns zero for walk routes', () => {
    expect(estimateRouteCost(makeRoute({ modes: ['walk'] }))).toBe(0);
  });

  it('estimates fuel cost for car routes', () => {
    const cost = estimateRouteCost(makeRoute({ modes: ['car'], totalDistance: 8_420 }));
    expect(cost).toBe(5_894);
  });

  it('estimates transit fare from steps', () => {
    const cost = estimateRouteCost(
      makeRoute({
        modes: ['transit'],
        steps: [
          {
            instruction: 'Metro',
            mode: 'transit',
            distance: 8_200,
            duration: 1_080,
            polyline: '',
            transitInfo: {
              agency: 'Bangalore Metro Rail Corporation',
              line: 'Purple Line',
              headsign: 'Whitefield',
              numStops: 7,
              departAt: '',
              arriveAt: '',
            },
          },
        ],
      }),
    );
    expect(cost).toBe(3_500);
  });
});
