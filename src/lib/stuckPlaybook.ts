import { getBengaluruData } from '@/lib/bengaluruData';
import { haversineMeters } from '@/lib/geo';
import { formatNearbyTransitLine, type NearbyTransitStop } from '@/lib/nearbyTransit';
import type { FloodExposureHit, TransportMode } from '@/types';

export interface StuckPlaybookInput {
  /** Extra seconds vs baseline ETA */
  delaySec: number;
  /** Fractional increase vs baseline (0.2 = 20%) */
  delayPct: number;
  floodHits: FloodExposureHit[];
  modes: TransportMode[];
  nearbyStoryName?: string;
  /** Metro / BMTC stops within ~1 km of the jam (static snapshot) */
  nearbyTransit?: NearbyTransitStop[];
}

export interface StuckAction {
  id: string;
  title: string;
  detail: string;
}

const SHORT_DELAY_SEC = 10 * 60;
const MEDIUM_DELAY_SEC = 25 * 60;

function hasFloodRisk(hits: FloodExposureHit[]): boolean {
  return hits.some(
    (h) =>
      h.category === 'flood_prone' ||
      h.category === 'flood_vulnerable' ||
      h.category === 'low_lying' ||
      h.category === 'lake',
  );
}

function isTwoWheeler(modes: TransportMode[]): boolean {
  return modes.includes('two_wheeler');
}

/**
 * Static playbook when ETA worsens during a trip — no LLM, no extra APIs.
 */
export function getStuckPlaybook(input: StuckPlaybookInput): StuckAction[] {
  const actions: StuckAction[] = [];
  const { delaySec, delayPct, floodHits, modes, nearbyStoryName, nearbyTransit = [] } = input;
  const flooded = hasFloodRisk(floodHits);
  const transitHint = formatNearbyTransitLine(nearbyTransit);

  if (delaySec < SHORT_DELAY_SEC) {
    actions.push({
      id: 'wait',
      title: 'Wait it out',
      detail: 'Delay is modest — traffic often clears in 10–15 minutes on ORR corridors.',
    });
    if (nearbyStoryName) {
      actions.push({
        id: 'story',
        title: `Listen: ${nearbyStoryName}`,
        detail: 'A short place story while you wait — tap Listen in Explore stories.',
      });
    }
    return actions;
  }

  if (delaySec < MEDIUM_DELAY_SEC) {
    actions.push({
      id: 'metro',
      title: transitHint ? 'Switch to transit nearby' : 'Look for Metro nearby',
      detail: transitHint
        ? `${transitHint} — walk or auto-rickshaw to skip this jam.`
        : 'If a Purple or Green line station is within ~1 km, switching can beat a stuck ORR stretch.',
    });
    actions.push({
      id: 'reroute',
      title: 'Re-plan the route',
      detail: 'Tap Re-plan to fetch fresh durations — a parallel valley road may be faster.',
    });
  } else {
    actions.push({
      id: 'reroute',
      title: 'Re-plan now',
      detail: `ETA is up ${Math.round(delayPct * 100)}% — a fresh route often saves 15+ minutes.`,
    });
    actions.push({
      id: 'bmtc',
      title: 'Consider BMTC / Metro',
      detail: transitHint
        ? `${transitHint} — long jams on valley-floor roads often clear faster by transit.`
        : 'Long jams on valley-floor roads — check a bus or Metro leg to skip the choke point.',
    });
  }

  if (flooded) {
    actions.push({
      id: 'underpass',
      title: 'Avoid underpasses',
      detail: floodHits[0]
        ? `Your route is near ${floodHits[0].name}. Do not wait in a flooded underpass — back up to higher ground.`
        : 'Do not wait in flooded underpasses — move to higher ground.',
    });
  }

  if (isTwoWheeler(modes) && flooded) {
    actions.push({
      id: 'no-ride-water',
      title: 'Do not ride through standing water',
      detail:
        'Two-wheelers stall easily in waterlogged stretches — engine and electrical damage risk.',
    });
  }

  return actions.slice(0, 4);
}

/** Closest place story to route waypoints (for wait-it-out copy). */
export function nearestStoryName(
  coords: { lat: number; lng: number }[],
  maxM = 1500,
): string | undefined {
  const stories = getBengaluruData().stories;
  let best: { name: string; d: number } | null = null;
  for (const story of stories) {
    for (const c of coords) {
      const d = haversineMeters(c, { lat: story.lat, lng: story.lng });
      if (d <= maxM && (!best || d < best.d)) best = { name: story.name, d };
    }
  }
  return best?.name;
}
