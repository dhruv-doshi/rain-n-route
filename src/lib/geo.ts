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
