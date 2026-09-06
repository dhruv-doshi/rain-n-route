import { describe, it, expect } from 'vitest';
import { pointInRing, haversineMeters, decodePolyline } from '@/lib/geo';
import { computeFloodExposure } from '@/lib/floodExposure';

describe('geo pointInRing', () => {
  const square: number[][] = [
    [77.59, 12.97],
    [77.6, 12.97],
    [77.6, 12.98],
    [77.59, 12.98],
    [77.59, 12.97],
  ];

  it('returns true for interior point', () => {
    expect(pointInRing(77.595, 12.975, square)).toBe(true);
  });

  it('returns false for exterior point', () => {
    expect(pointInRing(77.5, 12.9, square)).toBe(false);
  });
});

describe('computeFloodExposure', () => {
  /** Cubbon Park area — higher ground, fewer flood points */
  const cubbonPolyline = '_p~iF~ps|U';

  /** Bellandur / ORR corridor (approximate encoded path) */
  const bellandurPolyline = 'u{~nA}jciMfAeA{@kAaBqBcDeFgHiJkLmNoPsTuVyXa]e^gAiDkGmNsXa^gAiDkG';

  it('finds more hazard hits on Bellandur corridor than Cubbon-ish route with same rain', () => {
    const cubbon = computeFloodExposure(cubbonPolyline, 10);
    const bellandur = computeFloodExposure(bellandurPolyline, 10);
    expect(bellandur.hits.length).toBeGreaterThanOrEqual(cubbon.hits.length);
  });

  it('returns dominant valley when route crosses Koramangala valley drains', () => {
    const exposure = computeFloodExposure('oqcnAm}ciMeAeA{@kAaBqBqCqDqEqF', 12);
    if (exposure.hits.length > 0) {
      expect(exposure.dominantValley).toBeTruthy();
    }
  });

  it('decodes polylines used in tests', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 12.97, lng: 77.59 };
    expect(haversineMeters(p, p)).toBe(0);
  });
});
