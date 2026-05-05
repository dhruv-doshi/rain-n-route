import { describe, it, expect } from 'vitest';
import { computeCost, DEFAULT_INPUTS } from '@/lib/costCalculator';
import type { RouteOption } from '@/types';

function route(over: Partial<RouteOption>): RouteOption {
  return {
    id: 'r',
    modes: ['car'],
    totalDuration: 1800,
    totalDistance: 15_000,
    estimatedCost: 0,
    numTransfers: 0,
    walkDistance: 0,
    carbonGrams: 2_000,
    steps: [],
    geometry: '',
    ...over,
  };
}

describe('computeCost', () => {
  it('computes fuel cost for car routes from distance and inputs', () => {
    // 15 km / 15 km-per-L = 1 L * ₹105 = ₹105 = 10500 paise
    const r = computeCost(route({ modes: ['car'], totalDistance: 15_000 }), DEFAULT_INPUTS);
    expect(r.fuel).toBe(10500);
    expect(r.fare).toBe(0);
    expect(r.total).toBe(10500);
  });

  it('uses estimatedCost as fare for transit', () => {
    const r = computeCost(route({ modes: ['transit'], estimatedCost: 4500 }), DEFAULT_INPUTS);
    expect(r.fuel).toBe(0);
    expect(r.fare).toBe(4500);
    expect(r.total).toBe(4500);
  });

  it('honors fareOverride for transit/cab when provided', () => {
    const r = computeCost(route({ modes: ['cab'], estimatedCost: 5000, totalDistance: 10_000 }), {
      ...DEFAULT_INPUTS,
      fareOverride: 25_000,
    });
    expect(r.fare).toBe(25_000);
  });

  it('zero fuel for walk / cycle / transit', () => {
    expect(computeCost(route({ modes: ['walk'] }), DEFAULT_INPUTS).fuel).toBe(0);
    expect(computeCost(route({ modes: ['cycle'] }), DEFAULT_INPUTS).fuel).toBe(0);
    expect(computeCost(route({ modes: ['transit'] }), DEFAULT_INPUTS).fuel).toBe(0);
  });

  it('adds parking and tolls into total', () => {
    const r = computeCost(route({ modes: ['car'], totalDistance: 15_000 }), {
      ...DEFAULT_INPUTS,
      parkingFee: 5_000,
      tolls: 3_000,
    });
    expect(r.parking).toBe(5_000);
    expect(r.tolls).toBe(3_000);
    expect(r.total).toBe(10_500 + 5_000 + 3_000);
  });

  it('safe with zero efficiency', () => {
    const r = computeCost(route({ modes: ['car'] }), {
      ...DEFAULT_INPUTS,
      fuelEfficiencyKmPerLitre: 0,
    });
    expect(r.fuel).toBe(0);
  });
});
