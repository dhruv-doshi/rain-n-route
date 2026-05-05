import { describe, it, expect } from 'vitest';
import { computeEtaDelta } from '@/lib/etaDelta';

describe('computeEtaDelta', () => {
  it('reports zero delta when current equals baseline', () => {
    const r = computeEtaDelta(600, 600);
    expect(r.deltaSec).toBe(0);
    expect(r.deltaPct).toBe(0);
    expect(r.shouldPromptReroute).toBe(false);
  });

  it('reports positive delta when current exceeds baseline', () => {
    const r = computeEtaDelta(600, 720);
    expect(r.deltaSec).toBe(120);
    expect(r.deltaPct).toBeCloseTo(0.2, 5);
    expect(r.shouldPromptReroute).toBe(true);
  });

  it('reports negative delta when current is faster than baseline', () => {
    const r = computeEtaDelta(600, 480);
    expect(r.deltaSec).toBe(-120);
    expect(r.deltaPct).toBeCloseTo(-0.2, 5);
    // Better-than-baseline never prompts a re-plan
    expect(r.shouldPromptReroute).toBe(false);
  });

  it('does not trigger prompt at exactly the threshold', () => {
    const r = computeEtaDelta(100, 115); // exactly +15%
    expect(r.deltaPct).toBeCloseTo(0.15, 5);
    expect(r.shouldPromptReroute).toBe(false);
  });

  it('triggers prompt just over the threshold', () => {
    const r = computeEtaDelta(100, 116); // +16%
    expect(r.shouldPromptReroute).toBe(true);
  });

  it('honors a custom threshold', () => {
    expect(computeEtaDelta(100, 105, 0.05).shouldPromptReroute).toBe(false);
    expect(computeEtaDelta(100, 106, 0.05).shouldPromptReroute).toBe(true);
  });

  it('returns safe zeros when baseline is 0', () => {
    const r = computeEtaDelta(0, 600);
    expect(r.deltaSec).toBe(0);
    expect(r.deltaPct).toBe(0);
    expect(r.shouldPromptReroute).toBe(false);
  });

  it('returns safe zeros when baseline is negative', () => {
    const r = computeEtaDelta(-10, 600);
    expect(r.shouldPromptReroute).toBe(false);
  });

  it('returns safe zeros when current is NaN', () => {
    const r = computeEtaDelta(600, Number.NaN);
    expect(r.shouldPromptReroute).toBe(false);
    expect(r.deltaSec).toBe(0);
  });

  it('returns safe zeros when baseline is Infinity', () => {
    const r = computeEtaDelta(Number.POSITIVE_INFINITY, 600);
    expect(r.shouldPromptReroute).toBe(false);
  });
});
