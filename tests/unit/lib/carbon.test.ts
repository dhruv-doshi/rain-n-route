import { describe, it, expect } from 'vitest';
import { estimateCarbonGrams } from '@/lib/carbon';

describe('estimateCarbonGrams', () => {
  it('returns 0 for walk and cycle regardless of distance', () => {
    expect(estimateCarbonGrams(10_000, 'walk')).toBe(0);
    expect(estimateCarbonGrams(10_000, 'cycle')).toBe(0);
  });

  it('scales linearly with distance for car (~192 g/km)', () => {
    expect(estimateCarbonGrams(10_000, 'car')).toBe(1_920);
    expect(estimateCarbonGrams(5_000, 'car')).toBe(960);
  });

  it('uses lower factor for two_wheeler than car', () => {
    expect(estimateCarbonGrams(10_000, 'two_wheeler')).toBeLessThan(
      estimateCarbonGrams(10_000, 'car'),
    );
  });

  it('returns 0 for non-positive or non-finite distances', () => {
    expect(estimateCarbonGrams(0, 'car')).toBe(0);
    expect(estimateCarbonGrams(-10, 'car')).toBe(0);
    expect(estimateCarbonGrams(Number.NaN, 'car')).toBe(0);
  });
});
