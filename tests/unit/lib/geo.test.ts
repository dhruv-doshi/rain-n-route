import { describe, it, expect } from 'vitest';
import { decodePolyline, haversineMeters, sampleWaypoints } from '@/lib/geo';

// A known encoded polyline: two points approximately 1 km apart in Bengaluru
// Indiranagar (12.9784, 77.6410) → Domlur (12.9630, 77.6407)
// Encoded manually: `_p~iF~ps|U_ulLnnqC` is a classic example; use a Bengaluru segment
const SIMPLE_ENCODED = '_lrlDiqd`N~CaA'; // ~400 m segment (approximate)

describe('decodePolyline', () => {
  it('returns empty array for empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('decodes a well-known single-segment polyline', () => {
    // The classic Google example: (38.5, -120.2) → (40.7, -120.95) → (43.252, -126.453)
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const pts = decodePolyline(encoded);
    expect(pts).toHaveLength(3);
    expect(pts[0].lat).toBeCloseTo(38.5, 1);
    expect(pts[0].lng).toBeCloseTo(-120.2, 1);
    expect(pts[2].lat).toBeCloseTo(43.252, 1);
    expect(pts[2].lng).toBeCloseTo(-126.453, 1);
  });
});

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 12.9716, lng: 77.5946 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('approximates the equatorial circumference', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 180 };
    const halfCircumference = haversineMeters(a, b);
    expect(halfCircumference).toBeGreaterThan(19_900_000);
    expect(halfCircumference).toBeLessThan(20_100_000);
  });

  it('returns a positive distance for distinct points', () => {
    const indiranagar = { lat: 12.9784, lng: 77.641 };
    const whitefield = { lat: 12.9698, lng: 77.7499 };
    const d = haversineMeters(indiranagar, whitefield);
    expect(d).toBeGreaterThan(10_000);
    expect(d).toBeLessThan(15_000);
  });
});

describe('sampleWaypoints', () => {
  it('returns empty array for empty string', () => {
    expect(sampleWaypoints('', 1000)).toEqual([]);
  });

  it('returns single point for one-point polyline', () => {
    // Encode a single point (12.9716, 77.5946) — Google encoding
    // lat * 1e5 = 1297160, lng * 1e5 = 7759460
    // This is hard to hand-craft; use the classic two-point example and take first only
    const pts = decodePolyline('_p~iF~ps|U');
    expect(pts).toHaveLength(1);
    const encoded = '_p~iF~ps|U';
    const samples = sampleWaypoints(encoded, 1000);
    expect(samples).toHaveLength(1);
  });

  it('always includes first and last point', () => {
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const samples = sampleWaypoints(encoded, 50_000); // very large interval
    expect(samples[0].lat).toBeCloseTo(38.5, 1);
    const decoded = decodePolyline(encoded);
    const last = decoded[decoded.length - 1];
    const tail = samples[samples.length - 1];
    expect(tail.lat).toBeCloseTo(last.lat, 4);
    expect(tail.lng).toBeCloseTo(last.lng, 4);
  });

  it('samples proportionally at small intervals', () => {
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const samplesLarge = sampleWaypoints(encoded, 1_000_000);
    const samplesSmall = sampleWaypoints(encoded, 100_000);
    expect(samplesSmall.length).toBeGreaterThanOrEqual(samplesLarge.length);
  });
});
