import type { RiskLevel, RouteFloodPossibility } from '@/types';
import { computeFloodExposure } from './floodExposure';

/** Rain gate — spatial hazards alone stay low until rainfall is significant. */
function rainGate(maxRainMm: number): number {
  if (maxRainMm >= 25) return 1;
  if (maxRainMm >= 15) return 0.85;
  if (maxRainMm >= 10) return 0.65;
  if (maxRainMm >= 5) return 0.4;
  if (maxRainMm >= 1) return 0.2;
  return 0.1;
}

function spatialVulnerabilityScore(hitCount: number, minDistanceM: number): number {
  if (hitCount === 0) return 0;
  let score = Math.min(35, hitCount * 8);
  if (minDistanceM < 30) score += 15;
  else if (minDistanceM < 60) score += 10;
  else if (minDistanceM < 100) score += 5;
  return Math.min(50, score);
}

function levelFromPercent(pct: number): RiskLevel {
  if (pct >= 70) return 'severe';
  if (pct >= 45) return 'high';
  if (pct >= 20) return 'moderate';
  return 'low';
}

function buildSummary(
  pct: number,
  level: RiskLevel,
  hitCount: number,
  maxRainMm: number,
  maxProb: number,
  valley: string | null,
): string {
  if (hitCount === 0) {
    return 'No known flood-prone stretches on this route.';
  }
  if (level === 'low') {
    const zoneLabel = hitCount === 1 ? '1 hazard zone' : `${hitCount} hazard zones`;
    return `Low flood possibility (${pct}%). Route may pass near ${zoneLabel}, but rainfall is light.`;
  }
  const rainPart = maxRainMm >= 1 ? ` with up to ${maxRainMm.toFixed(0)} mm rain` : '';
  const probPart = maxProb >= 0.5 ? ` (${Math.round(maxProb * 100)}% chance)` : '';
  const valleyPart = valley ? ` in the ${valley} valley` : '';
  return `${pct}% flood possibility${rainPart}${probPart}${valleyPart}. Consider alternate routes if waterlogging worsens.`;
}

/**
 * Combines spatial hazard exposure with forecast rain to estimate route flood possibility.
 * Usually low — only rises meaningfully when rainfall is heavy and the route crosses hazards.
 */
export function computeRouteFloodPossibility(
  geometry: string,
  maxRainMm: number,
  maxProb = 0,
): RouteFloodPossibility {
  const exposure = computeFloodExposure(geometry, maxRainMm);
  const minDist = exposure.hits.length > 0 ? exposure.hits[0].distanceM : Infinity;
  const spatial = spatialVulnerabilityScore(exposure.hits.length, minDist);
  const gate = rainGate(maxRainMm);
  const probBoost = maxProb >= 0.6 ? Math.round(maxProb * 15) : Math.round(maxProb * 8);
  const possibilityPercent = Math.min(100, Math.round(spatial * gate + probBoost));
  const level = levelFromPercent(possibilityPercent);
  const showAlert = level !== 'low' && maxRainMm >= 5 && exposure.hits.length > 0;

  return {
    possibilityPercent,
    level,
    showAlert,
    summary: buildSummary(
      possibilityPercent,
      level,
      exposure.hits.length,
      maxRainMm,
      maxProb,
      exposure.dominantValley,
    ),
    maxRainMm,
    maxProb,
    hits: exposure.hits,
    dominantValley: exposure.dominantValley,
  };
}
