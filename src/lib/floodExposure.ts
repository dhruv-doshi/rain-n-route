import type { FloodExposureHit, FloodExposureResult, RiskFactor, RiskLevel } from '@/types';
import { getBengaluruData } from './bengaluruData';
import {
  decodePolyline,
  distanceToMultiLineMeters,
  haversineMeters,
  pointInPolygon,
  sampleWaypoints,
} from './geo';

const LEVEL_ORDER: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 };

const FLOOD_POINT_RADIUS_M = 120;
const DRAIN_PROXIMITY_M = 100;
const LOW_LYING_RADIUS_M = 150;
const LAKE_BUFFER_M = 200;

function bumpLevel(current: RiskLevel, next: RiskLevel): RiskLevel {
  return LEVEL_ORDER[next] > LEVEL_ORDER[current] ? next : current;
}

function spatialLevelFromHits(hitCount: number, minDistanceM: number): RiskLevel {
  if (hitCount === 0) return 'low';
  if (hitCount >= 3 || minDistanceM < 50) return 'high';
  if (hitCount >= 2 || minDistanceM < 80) return 'moderate';
  return 'moderate';
}

function rainMultiplier(maxMm: number): number {
  if (maxMm >= 15) return 1.5;
  if (maxMm >= 5) return 1.2;
  if (maxMm >= 1) return 1.0;
  return 0.6;
}

function combineSpatialWithRain(spatial: RiskLevel, maxMm: number): RiskLevel {
  const mult = rainMultiplier(maxMm);
  if (mult < 1 && spatial === 'moderate') return 'low';
  if (mult >= 1.5 && spatial !== 'low') return bumpLevel(spatial, 'severe');
  if (mult >= 1.2 && spatial === 'moderate') return 'high';
  return spatial;
}

/**
 * Finds hazard features near a route polyline and estimates spatial flood exposure.
 */
export function computeFloodExposure(geometry: string, maxRainMm: number): FloodExposureResult {
  const data = getBengaluruData();
  const waypoints = sampleWaypoints(geometry, 500);
  if (waypoints.length === 0) {
    return { hits: [], dominantValley: null, spatialLevel: 'low' };
  }

  const hits: FloodExposureHit[] = [];
  const valleyCounts = new Map<string, number>();

  function recordHit(
    id: string,
    name: string,
    category: FloodExposureHit['category'],
    distanceM: number,
    lat: number,
    lng: number,
    valley?: string | null,
    reason?: string,
  ) {
    if (hits.some((h) => h.id === id)) return;
    hits.push({ id, name, category, distanceM, lat, lng, valley, reason });
    if (valley) valleyCounts.set(valley, (valleyCounts.get(valley) ?? 0) + 1);
  }

  for (const wp of waypoints) {
    for (const fp of data.floodPoints) {
      const d = haversineMeters(wp, { lat: fp.lat, lng: fp.lng });
      if (d <= FLOOD_POINT_RADIUS_M) {
        recordHit(
          fp.id,
          fp.name,
          fp.category,
          d,
          fp.lat,
          fp.lng,
          null,
          'BBMP flood-prone location',
        );
      }
    }
    for (const ll of data.lowLying) {
      const d = haversineMeters(wp, { lat: ll.lat, lng: ll.lng });
      if (d <= LOW_LYING_RADIUS_M) {
        recordHit(ll.id, ll.name, 'low_lying', d, ll.lat, ll.lng, null, 'BBMP low-lying area');
      }
    }
    for (const hs of data.hotspots) {
      const d = haversineMeters(wp, { lat: hs.lat, lng: hs.lng });
      if (d <= FLOOD_POINT_RADIUS_M) {
        recordHit(hs.id, hs.name, 'hotspot', d, hs.lat, hs.lng, hs.valley, hs.reason);
      }
    }
    for (const drain of data.drains) {
      const d = distanceToMultiLineMeters(wp, drain.lines);
      if (d <= DRAIN_PROXIMITY_M) {
        recordHit(
          drain.id,
          drain.name,
          'drain',
          d,
          wp.lat,
          wp.lng,
          drain.valley,
          drain.valley
            ? `Near primary rajakaluve in ${drain.valley}`
            : 'Near primary stormwater drain',
        );
      }
    }
    for (const valley of data.valleys) {
      if (pointInPolygon(wp.lng, wp.lat, valley.polygon)) {
        const ring = valley.polygon[0];
        const c = ring[Math.floor(ring.length / 2)];
        recordHit(
          valley.id,
          valley.name,
          'valley',
          0,
          c?.[1] ?? wp.lat,
          c?.[0] ?? wp.lng,
          valley.name,
          `${valley.name} watershed`,
        );
      }
    }
    for (const lake of data.lakes) {
      if (!lake.polygon?.[0]?.length) continue;
      const inside = pointInPolygon(wp.lng, wp.lat, lake.polygon);
      let minRingDist = Infinity;
      let nearLat = wp.lat;
      let nearLng = wp.lng;
      for (const coord of lake.polygon[0]) {
        const dist = haversineMeters(wp, { lat: coord[1], lng: coord[0] });
        if (dist < minRingDist) {
          minRingDist = dist;
          nearLat = coord[1];
          nearLng = coord[0];
        }
      }
      if (inside || minRingDist <= LAKE_BUFFER_M) {
        recordHit(
          lake.id,
          lake.name,
          'lake',
          inside ? 0 : minRingDist,
          inside ? wp.lat : nearLat,
          inside ? wp.lng : nearLng,
          null,
          `Near ${lake.name} — lake buffer zone`,
        );
      }
    }
  }

  hits.sort((a, b) => a.distanceM - b.distanceM);

  let dominantValley: string | null = null;
  let maxCount = 0;
  for (const [v, c] of valleyCounts) {
    if (c > maxCount) {
      maxCount = c;
      dominantValley = v;
    }
  }
  if (!dominantValley) {
    const valleyHit = hits.find((h) => h.valley);
    dominantValley = valleyHit?.valley ?? null;
  }

  const minDist = hits.length > 0 ? hits[0].distanceM : Infinity;
  const baseSpatial = spatialLevelFromHits(hits.length, minDist);
  const spatialLevel = combineSpatialWithRain(baseSpatial, maxRainMm);

  return { hits, dominantValley, spatialLevel };
}

/** Merge spatial flood exposure into an existing weather risk summary. */
export function applySpatialFloodToRisk(
  factors: RiskFactor[],
  exposure: FloodExposureResult,
  maxRainMm: number,
): RiskFactor[] {
  if (exposure.hits.length === 0) {
    return factors.filter((f) => f.kind !== 'flood');
  }

  const existing = factors.find((f) => f.kind === 'flood');
  let spatialLevel = exposure.spatialLevel;
  if (spatialLevel === 'low' && exposure.hits.length > 0) {
    spatialLevel = maxRainMm >= 1 ? 'moderate' : 'low';
  }
  if (spatialLevel === 'low' && exposure.hits.length >= 2) {
    spatialLevel = 'moderate';
  }

  const mergedLevel =
    existing && LEVEL_ORDER[existing.level] > LEVEL_ORDER[spatialLevel]
      ? existing.level
      : spatialLevel;

  if (mergedLevel === 'low' && !existing) {
    return factors.filter((f) => f.kind !== 'flood');
  }

  const placeNames = exposure.hits
    .slice(0, 2)
    .map((h) => h.name)
    .join(', ');
  const valleyPart = exposure.dominantValley ? ` in the ${exposure.dominantValley}` : '';
  const rainPart = maxRainMm >= 1 ? ` with up to ${maxRainMm.toFixed(1)} mm rain expected` : '';

  let reason = `Route crosses known flood-prone areas${valleyPart}${rainPart}.`;
  if (placeNames) reason += ` Near: ${placeNames}.`;
  if (exposure.dominantValley) {
    reason += ` Water follows this valley toward lower tanks and rajakaluves.`;
  }

  const withoutFlood = factors.filter((f) => f.kind !== 'flood');
  return [...withoutFlood, { kind: 'flood' as const, level: mergedLevel, reason }];
}

/** Exposed for tests — decode route to points. */
export { decodePolyline };
