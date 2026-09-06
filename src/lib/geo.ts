import type { LatLng } from '@/types';

/** Decodes a Google-encoded polyline string into an array of LatLng points. */
export function decodePolyline(encoded: string): LatLng[] {
  const coords: LatLng[] = [];
  let idx = 0;
  let lat = 0;
  let lng = 0;

  while (idx < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coords;
}

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const cross = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(cross));
}

/**
 * Returns waypoints sampled from an encoded polyline at ~everyMeters intervals.
 * Always includes the first and last decoded point.
 * Returns [] when the encoded string cannot be decoded to at least one point.
 */
export function sampleWaypoints(geometry: string, everyMeters: number): LatLng[] {
  const coords = decodePolyline(geometry);
  if (coords.length === 0) return [];
  if (coords.length === 1) return [coords[0]];

  const samples: LatLng[] = [coords[0]];
  let accumulated = 0;

  for (let i = 1; i < coords.length; i++) {
    accumulated += haversineMeters(coords[i - 1], coords[i]);
    if (accumulated >= everyMeters) {
      samples.push(coords[i]);
      accumulated = 0;
    }
  }

  const last = coords[coords.length - 1];
  const tail = samples[samples.length - 1];
  if (tail.lat !== last.lat || tail.lng !== last.lng) {
    samples.push(last);
  }

  return samples;
}

/** Ray-casting point-in-polygon for a single ring [lng, lat][]. */
export function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** True if point is inside any ring of a polygon (first ring = outer). */
export function pointInPolygon(lng: number, lat: number, polygon: number[][][]): boolean {
  if (polygon.length === 0) return false;
  return pointInRing(lng, lat, polygon[0]);
}

/** Minimum distance from a point to a polyline defined as [lng, lat][]. */
export function distanceToLineStringMeters(point: LatLng, line: number[][]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) {
    return haversineMeters(point, { lat: line[0][1], lng: line[0][0] });
  }
  let min = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = { lat: line[i - 1][1], lng: line[i - 1][0] };
    const b = { lat: line[i][1], lng: line[i][0] };
    min = Math.min(min, distanceToSegmentMeters(point, a, b));
  }
  return min;
}

function distanceToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return haversineMeters(p, a);
  const t = Math.max(
    0,
    Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy)),
  );
  const proj = { lat: a.lat + t * dy, lng: a.lng + t * dx };
  return haversineMeters(p, proj);
}

/** Minimum distance from point to any line in a multi-line feature. */
export function distanceToMultiLineMeters(point: LatLng, lines: number[][][]): number {
  let min = Infinity;
  for (const line of lines) {
    min = Math.min(min, distanceToLineStringMeters(point, line));
  }
  return min;
}

/** Greater Bengaluru service area — city and surrounding commute belt. */
export const BENGALURU_BBOX = {
  minLat: 12.6,
  maxLat: 13.35,
  minLng: 77.2,
  maxLng: 78.05,
};

export const BENGALURU_ONLY_MESSAGE =
  'Rain-N-Route is Bengaluru-only — choose a location within the city and nearby areas.';

export function isInBengaluruServiceArea({ lat, lng }: LatLng): boolean {
  return (
    lat >= BENGALURU_BBOX.minLat &&
    lat <= BENGALURU_BBOX.maxLat &&
    lng >= BENGALURU_BBOX.minLng &&
    lng <= BENGALURU_BBOX.maxLng
  );
}

export function projectToSvg(
  lat: number,
  lng: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = BENGALURU_BBOX;
  const x = ((lng - minLng) / (maxLng - minLng)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  return { x, y };
}
