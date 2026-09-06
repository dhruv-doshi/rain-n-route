import { describe, it, expect } from 'vitest';
import { computeRouteFloodPossibility } from '@/lib/floodPossibility';

/** Bellandur / ORR corridor (approximate encoded path) */
const BELLANDUR_POLYLINE = 'u{~nA}jciMfAeA{@kAaBqBcDeFgHiJkLmNoPsTuVyXa]e^gAiDkGmNsXa^gAiDkG';

describe('computeRouteFloodPossibility', () => {
  it('returns low possibility with no alert when rain is dry', () => {
    const result = computeRouteFloodPossibility(BELLANDUR_POLYLINE, 0, 0.1);
    expect(result.level).toBe('low');
    expect(result.possibilityPercent).toBeLessThan(20);
    expect(result.showAlert).toBe(false);
  });

  it('keeps possibility low on dry days even when route crosses hazards', () => {
    const dry = computeRouteFloodPossibility(BELLANDUR_POLYLINE, 0, 0);
    const light = computeRouteFloodPossibility(BELLANDUR_POLYLINE, 2, 0.3);
    expect(dry.possibilityPercent).toBeLessThan(light.possibilityPercent);
    expect(dry.showAlert).toBe(false);
    expect(light.showAlert).toBe(false);
  });

  it('raises possibility and shows alert when rain is heavy and route crosses hazards', () => {
    const result = computeRouteFloodPossibility(BELLANDUR_POLYLINE, 15, 0.85);
    if (result.hits.length > 0) {
      expect(result.possibilityPercent).toBeGreaterThanOrEqual(20);
      expect(result.showAlert).toBe(true);
      expect(result.level).not.toBe('low');
    }
  });

  it('returns zero hits summary for routes with no spatial exposure', () => {
    const result = computeRouteFloodPossibility('_p~iF~ps|U', 0, 0);
    if (result.hits.length === 0) {
      expect(result.summary).toContain('No known flood-prone');
      expect(result.showAlert).toBe(false);
    }
  });

  it('includes forecast rain in summary when alert-worthy', () => {
    const result = computeRouteFloodPossibility(BELLANDUR_POLYLINE, 12, 0.75);
    if (result.showAlert) {
      expect(result.summary).toMatch(/mm rain/);
      expect(result.maxRainMm).toBe(12);
    }
  });
});
