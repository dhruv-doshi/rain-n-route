import { describe, it, expect } from 'vitest';
import {
  bmtcBusFarePaise,
  estimateTransitFareFromSteps,
  estimateTransitLegFarePaise,
  nammaMetroFarePaise,
} from '@/lib/transitFare';
import type { RouteStep } from '@/types';

describe('nammaMetroFarePaise', () => {
  it('uses distance slabs', () => {
    expect(nammaMetroFarePaise(1_500)).toBe(1_000);
    expect(nammaMetroFarePaise(3_500)).toBe(2_000);
    expect(nammaMetroFarePaise(8_200)).toBe(3_500);
  });
});

describe('bmtcBusFarePaise', () => {
  it('uses distance slabs', () => {
    expect(bmtcBusFarePaise(1_500)).toBe(800);
    expect(bmtcBusFarePaise(4_000)).toBe(1_500);
    expect(bmtcBusFarePaise(12_000)).toBe(3_200);
  });
});

describe('estimateTransitLegFarePaise', () => {
  it('charges metro fare for BMRC agency', () => {
    const step: RouteStep = {
      instruction: 'Take Purple Line',
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
    };
    expect(estimateTransitLegFarePaise(step)).toBe(3_500);
  });

  it('charges BMTC fare for bus agency', () => {
    const step: RouteStep = {
      instruction: 'Take bus',
      mode: 'transit',
      distance: 4_000,
      duration: 900,
      polyline: '',
      transitInfo: {
        agency: 'BMTC',
        line: '335E',
        headsign: 'Majestic',
        numStops: 12,
        departAt: '',
        arriveAt: '',
      },
    };
    expect(estimateTransitLegFarePaise(step)).toBe(1_500);
  });
});

describe('estimateTransitFareFromSteps', () => {
  it('sums fares for multi-leg transit', () => {
    const steps: RouteStep[] = [
      {
        instruction: 'Walk',
        mode: 'walk',
        distance: 400,
        duration: 300,
        polyline: '',
      },
      {
        instruction: 'Metro',
        mode: 'transit',
        distance: 6_000,
        duration: 900,
        polyline: '',
        transitInfo: {
          agency: 'Namma Metro',
          line: 'Green Line',
          headsign: 'Nagasandra',
          numStops: 5,
          departAt: '',
          arriveAt: '',
        },
      },
      {
        instruction: 'Bus',
        mode: 'transit',
        distance: 3_000,
        duration: 600,
        polyline: '',
        transitInfo: {
          agency: 'BMTC',
          line: '500A',
          headsign: 'Banashankari',
          numStops: 4,
          departAt: '',
          arriveAt: '',
        },
      },
    ];

    expect(estimateTransitFareFromSteps(steps)).toBe(2_500 + 1_500);
  });
});
