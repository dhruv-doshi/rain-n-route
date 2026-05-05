import { describe, it, expect } from 'vitest';
import {
  scoreFastest,
  scoreCheapest,
  scoreLeastTransfers,
  scoreEco,
  computeScores,
  sortRoutes,
} from '@/lib/scoring';
import type { RouteOption } from '@/types';

function makeRoute(overrides: Partial<RouteOption>): RouteOption {
  return {
    id: 'r1',
    modes: ['car'],
    totalDuration: 2700,
    totalDistance: 12500,
    estimatedCost: 0,
    numTransfers: 0,
    walkDistance: 0,
    carbonGrams: 2875,
    steps: [],
    geometry: '',
    ...overrides,
  };
}

// Matches MOCK_ROUTE_RESPONSE fixture
const CAR = makeRoute({
  id: 'mock-route-car',
  modes: ['car'],
  totalDuration: 2700,
  estimatedCost: 0,
  numTransfers: 0,
  carbonGrams: 2875,
});
const TRANSIT = makeRoute({
  id: 'mock-route-transit',
  modes: ['transit'],
  totalDuration: 3600,
  estimatedCost: 4500,
  numTransfers: 1,
  carbonGrams: 700,
});
const BIKE = makeRoute({
  id: 'mock-route-two_wheeler',
  modes: ['two_wheeler'],
  totalDuration: 2100,
  estimatedCost: 0,
  numTransfers: 0,
  carbonGrams: 960,
});

const FIXTURE = [CAR, TRANSIT, BIKE];

describe('scoreFastest', () => {
  it('gives 1.0 to the fastest route', () => {
    expect(scoreFastest(BIKE, FIXTURE)).toBe(1);
  });
  it('gives 0.0 to the slowest route', () => {
    expect(scoreFastest(TRANSIT, FIXTURE)).toBe(0);
  });
  it('gives an intermediate score to a middle route', () => {
    const score = scoreFastest(CAR, FIXTURE);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
  it('returns 1.0 for all routes when durations are equal', () => {
    const same = [
      makeRoute({ id: 'a', totalDuration: 1800 }),
      makeRoute({ id: 'b', totalDuration: 1800 }),
    ];
    expect(scoreFastest(same[0], same)).toBe(1);
    expect(scoreFastest(same[1], same)).toBe(1);
  });
});

describe('scoreCheapest', () => {
  it('gives 1.0 to zero-cost routes', () => {
    expect(scoreCheapest(CAR, FIXTURE)).toBe(1);
    expect(scoreCheapest(BIKE, FIXTURE)).toBe(1);
  });
  it('gives 0.0 to the most expensive route', () => {
    expect(scoreCheapest(TRANSIT, FIXTURE)).toBe(0);
  });
  it('returns 1.0 for all when all costs are zero', () => {
    const free = [
      makeRoute({ id: 'a', estimatedCost: 0 }),
      makeRoute({ id: 'b', estimatedCost: 0 }),
    ];
    expect(scoreCheapest(free[0], free)).toBe(1);
  });
});

describe('scoreLeastTransfers', () => {
  it('gives 1.0 to routes with 0 transfers', () => {
    expect(scoreLeastTransfers(CAR, FIXTURE)).toBe(1);
    expect(scoreLeastTransfers(BIKE, FIXTURE)).toBe(1);
  });
  it('gives 0.0 to the route with most transfers', () => {
    expect(scoreLeastTransfers(TRANSIT, FIXTURE)).toBe(0);
  });
});

describe('scoreEco', () => {
  it('gives 1.0 to the lowest-carbon route', () => {
    expect(scoreEco(TRANSIT, FIXTURE)).toBe(1);
  });
  it('gives 0.0 to the highest-carbon route', () => {
    expect(scoreEco(CAR, FIXTURE)).toBe(0);
  });
});

describe('computeScores', () => {
  it('populates all four scoreBreakdown keys on every route', () => {
    const scored = computeScores(FIXTURE);
    for (const route of scored) {
      expect(route.scoreBreakdown).toBeDefined();
      expect(route.scoreBreakdown).toHaveProperty('fastest');
      expect(route.scoreBreakdown).toHaveProperty('cheapest');
      expect(route.scoreBreakdown).toHaveProperty('least_transfers');
      expect(route.scoreBreakdown).toHaveProperty('eco');
    }
  });

  it('does not mutate the input array', () => {
    const input = FIXTURE.map((r) => ({ ...r }));
    computeScores(input);
    for (const route of input) {
      expect(route.scoreBreakdown).toBeUndefined();
    }
  });

  it('returns empty array for empty input', () => {
    expect(computeScores([])).toEqual([]);
  });
});

describe('sortRoutes', () => {
  it('sorts by fastest (bike first)', () => {
    const scored = computeScores(FIXTURE);
    const sorted = sortRoutes(scored, 'fastest');
    expect(sorted[0].id).toBe('mock-route-two_wheeler');
  });

  it('sorts by cheapest (tie: car and bike score equally; bike id < car id alphabetically... no)', () => {
    // Both car and bike are Free; stable tie-break is id ascending
    const scored = computeScores(FIXTURE);
    const sorted = sortRoutes(scored, 'cheapest');
    // Transit (4500) last
    expect(sorted[sorted.length - 1].id).toBe('mock-route-transit');
    // First two are car and bike — sorted by id ascending for stable tie
    expect(sorted[0].id).toBe('mock-route-car');
    expect(sorted[1].id).toBe('mock-route-two_wheeler');
  });

  it('sorts by eco (transit first, lowest carbon)', () => {
    const scored = computeScores(FIXTURE);
    const sorted = sortRoutes(scored, 'eco');
    expect(sorted[0].id).toBe('mock-route-transit');
  });

  it('returns a new array without mutating input', () => {
    const scored = computeScores(FIXTURE);
    const original = [...scored];
    sortRoutes(scored, 'fastest');
    expect(scored.map((r) => r.id)).toEqual(original.map((r) => r.id));
  });

  it('handles empty array', () => {
    expect(sortRoutes([], 'fastest')).toEqual([]);
  });

  it('is stable: equal scores maintain id-ascending order', () => {
    const twoEqual = computeScores([
      makeRoute({
        id: 'z-route',
        totalDuration: 1800,
        estimatedCost: 0,
        numTransfers: 0,
        carbonGrams: 0,
      }),
      makeRoute({
        id: 'a-route',
        totalDuration: 1800,
        estimatedCost: 0,
        numTransfers: 0,
        carbonGrams: 0,
      }),
    ]);
    const sorted = sortRoutes(twoEqual, 'fastest');
    expect(sorted[0].id).toBe('a-route');
    expect(sorted[1].id).toBe('z-route');
  });
});
