import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildCacheKey } from '@/services/maps/google';
import type { RouteRequest, TransportMode } from '@/types';

/**
 * Property 10: Cache Key Determinism
 *
 * For any two requests with identical rounded coords, sorted modes,
 * and time bucket, produces identical keys.
 *
 * **Validates: Requirements 7.2, 7.4**
 */

// ────────────────────────────────────────────────────────────────────
// Arbitraries
// ────────────────────────────────────────────────────────────────────

const TRANSPORT_MODES: TransportMode[] = [
  'car',
  'two_wheeler',
  'transit',
  'cab',
  'auto',
  'walk',
  'cycle',
  'mixed',
];

const arbLatitude = fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true });
const arbLongitude = fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true });
const arbLatLng = fc.record({ lat: arbLatitude, lng: arbLongitude });

const arbMode = fc.constantFrom(...TRANSPORT_MODES);
const arbModes = fc.uniqueArray(arbMode, { minLength: 1, maxLength: 8 });

// Generate ISO date strings at 1-minute intervals over a range of valid timestamps
const arbDepartAt = fc.option(
  fc.integer({ min: 0, max: 365 * 24 * 60 }).map((minuteOffset) => {
    const base = new Date('2024-01-01T00:00:00Z').getTime();
    return new Date(base + minuteOffset * 60_000).toISOString();
  }),
  { nil: undefined },
);

const arbRouteRequest: fc.Arbitrary<RouteRequest> = fc.record({
  from: arbLatLng,
  to: arbLatLng,
  modes: arbModes,
  departAt: arbDepartAt,
});

// ────────────────────────────────────────────────────────────────────
// Property Tests
// ────────────────────────────────────────────────────────────────────

describe('buildCacheKey — Property 10: Cache Key Determinism', () => {
  it('determinism: same input always produces the same key', () => {
    fc.assert(
      fc.property(arbRouteRequest, (req) => {
        const key1 = buildCacheKey(req);
        const key2 = buildCacheKey(req);
        expect(key1).toBe(key2);
      }),
      { numRuns: 200 },
    );
  });

  it('coordinate rounding: coords differing by <0.00005 produce same key', () => {
    fc.assert(
      fc.property(
        arbRouteRequest,
        fc.double({ min: -0.000049, max: 0.000049, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.000049, max: 0.000049, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.000049, max: 0.000049, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.000049, max: 0.000049, noNaN: true, noDefaultInfinity: true }),
        (req, dFromLat, dFromLng, dToLat, dToLng) => {
          const nudged: RouteRequest = {
            ...req,
            from: { lat: req.from.lat + dFromLat, lng: req.from.lng + dFromLng },
            to: { lat: req.to.lat + dToLat, lng: req.to.lng + dToLng },
          };

          // Both should round to the same 4dp value
          const origFromLat = req.from.lat.toFixed(4);
          const nudgedFromLat = nudged.from.lat.toFixed(4);
          const origFromLng = req.from.lng.toFixed(4);
          const nudgedFromLng = nudged.from.lng.toFixed(4);
          const origToLat = req.to.lat.toFixed(4);
          const nudgedToLat = nudged.to.lat.toFixed(4);
          const origToLng = req.to.lng.toFixed(4);
          const nudgedToLng = nudged.to.lng.toFixed(4);

          // Only assert when rounding matches (the delta is within rounding tolerance)
          if (
            origFromLat === nudgedFromLat &&
            origFromLng === nudgedFromLng &&
            origToLat === nudgedToLat &&
            origToLng === nudgedToLng
          ) {
            expect(buildCacheKey(req)).toBe(buildCacheKey(nudged));
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('mode order independence: shuffled modes produce same key', () => {
    fc.assert(
      fc.property(arbRouteRequest, (req) => {
        // Reverse the modes array to get a different ordering
        const reversed: RouteRequest = {
          ...req,
          modes: [...req.modes].reverse(),
        };
        expect(buildCacheKey(req)).toBe(buildCacheKey(reversed));
      }),
      { numRuns: 200 },
    );
  });

  it('time bucketing: departure times within the same 5-minute window produce same key', () => {
    fc.assert(
      fc.property(
        arbRouteRequest.filter((req) => req.departAt !== undefined),
        fc.integer({ min: 0, max: 299 }), // 0-299 seconds offset within same 5-min bucket
        (req, offsetSeconds) => {
          const baseTs = new Date(req.departAt!).getTime();
          const bucketMs = 5 * 60 * 1000;
          const bucketStart = Math.floor(baseTs / bucketMs) * bucketMs;
          // Create a time that's still within the same bucket
          const sameWindowTs = bucketStart + offsetSeconds * 1000;

          // Ensure sameWindowTs stays in the same bucket
          if (Math.floor(sameWindowTs / bucketMs) === Math.floor(baseTs / bucketMs)) {
            const modified: RouteRequest = {
              ...req,
              departAt: new Date(sameWindowTs).toISOString(),
            };
            expect(buildCacheKey(req)).toBe(buildCacheKey(modified));
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('different inputs produce different keys: significantly different coords', () => {
    fc.assert(
      fc.property(arbRouteRequest, (req) => {
        // Shift from.lat by at least 0.001 (guarantees different 4dp rounding)
        const shifted: RouteRequest = {
          ...req,
          from: { lat: req.from.lat + 0.001, lng: req.from.lng },
        };
        // Ensure shifted lat is still in valid range
        if (shifted.from.lat >= -90 && shifted.from.lat <= 90) {
          expect(buildCacheKey(req)).not.toBe(buildCacheKey(shifted));
        }
      }),
      { numRuns: 200 },
    );
  });

  it('different inputs produce different keys: different modes', () => {
    fc.assert(
      fc.property(arbRouteRequest, (req) => {
        // Add a mode that's not already present
        const availableModes = TRANSPORT_MODES.filter((m) => !req.modes.includes(m));
        if (availableModes.length > 0) {
          const extraMode = availableModes[0];
          const modified: RouteRequest = {
            ...req,
            modes: [...req.modes, extraMode],
          };
          expect(buildCacheKey(req)).not.toBe(buildCacheKey(modified));
        }
      }),
      { numRuns: 200 },
    );
  });

  it('different inputs produce different keys: different time buckets', () => {
    fc.assert(
      fc.property(
        arbRouteRequest.filter((req) => req.departAt !== undefined),
        (req) => {
          const baseTs = new Date(req.departAt!).getTime();
          const bucketMs = 5 * 60 * 1000;
          // Move to next bucket
          const nextBucketTs = Math.floor(baseTs / bucketMs) * bucketMs + bucketMs;

          const modified: RouteRequest = {
            ...req,
            departAt: new Date(nextBucketTs).toISOString(),
          };
          expect(buildCacheKey(req)).not.toBe(buildCacheKey(modified));
        },
      ),
      { numRuns: 200 },
    );
  });
});
