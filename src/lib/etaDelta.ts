export interface EtaDelta {
  deltaSec: number;
  deltaPct: number;
  shouldPromptReroute: boolean;
}

const DEFAULT_THRESHOLD_PCT = 0.15;

/**
 * Pure: given a baseline ETA and a current ETA (both in seconds), return the
 * delta and whether the user should be prompted to re-plan their trip.
 * The prompt only fires when the trip got *worse* by more than the threshold;
 * better-than-baseline deltas are reported but don't interrupt the user.
 */
export function computeEtaDelta(
  baselineSec: number,
  currentSec: number,
  thresholdPct: number = DEFAULT_THRESHOLD_PCT,
): EtaDelta {
  if (!Number.isFinite(baselineSec) || baselineSec <= 0 || !Number.isFinite(currentSec)) {
    return { deltaSec: 0, deltaPct: 0, shouldPromptReroute: false };
  }
  const deltaSec = currentSec - baselineSec;
  const deltaPct = deltaSec / baselineSec;
  return {
    deltaSec,
    deltaPct,
    shouldPromptReroute: deltaPct > thresholdPct,
  };
}
