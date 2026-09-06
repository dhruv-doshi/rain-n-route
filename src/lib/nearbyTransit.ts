import { getBengaluruData } from '@/lib/bengaluruData';
import { haversineMeters } from '@/lib/geo';
import type { LatLng, TransitStop } from '@/types';

export interface NearbyTransitStop {
  stop: TransitStop;
  distanceM: number;
}

const DEFAULT_RADIUS_M = 1000;

/**
 * Find bundled Metro / BMTC stops within `radiusM` of any sampled route point.
 * Uses a static snapshot — no live GTFS feed.
 */
export function findNearbyTransit(
  coords: LatLng[],
  radiusM = DEFAULT_RADIUS_M,
  maxResults = 3,
): NearbyTransitStop[] {
  if (coords.length === 0) return [];

  const { transitStops } = getBengaluruData();
  const hits: NearbyTransitStop[] = [];

  for (const stop of transitStops) {
    let minD = Infinity;
    for (const c of coords) {
      minD = Math.min(minD, haversineMeters(c, { lat: stop.lat, lng: stop.lng }));
    }
    if (minD <= radiusM) {
      hits.push({ stop, distanceM: Math.round(minD) });
    }
  }

  hits.sort((a, b) => {
    if (a.stop.mode !== b.stop.mode) return a.stop.mode === 'metro' ? -1 : 1;
    return a.distanceM - b.distanceM;
  });

  return hits.slice(0, maxResults);
}

export function formatTransitDistance(distanceM: number): string {
  if (distanceM < 1000) return `${distanceM} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

export function formatNearbyTransitLine(stops: NearbyTransitStop[]): string | null {
  if (stops.length === 0) return null;
  const metro = stops.find((s) => s.stop.mode === 'metro');
  if (metro) {
    const line = metro.stop.line ? ` (${metro.stop.line})` : '';
    return `${metro.stop.name}${line} · ${formatTransitDistance(metro.distanceM)} away`;
  }
  const bus = stops[0];
  return `${bus.stop.name} bus · ${formatTransitDistance(bus.distanceM)} away`;
}
