import type { Paise, RouteOption } from '@/types';
import { computeCost, DEFAULT_INPUTS } from './costCalculator';
import { estimateTransitFareFromSteps, nammaMetroFarePaise } from './transitFare';

const FREE_MODES = new Set(['walk', 'cycle']);
const FUEL_MODES = new Set(['car', 'two_wheeler']);

/**
 * Estimate route cost when the maps provider does not supply fares.
 * Transit uses Bengaluru Metro/BMTC slabs; car and two-wheeler use default fuel inputs.
 */
export function estimateRouteCost(
  route: Pick<RouteOption, 'modes' | 'totalDistance' | 'steps' | 'estimatedCost'>,
): Paise {
  const primaryMode = route.modes[0] ?? 'mixed';

  if (FREE_MODES.has(primaryMode)) {
    return 0;
  }

  if (primaryMode === 'transit' || route.steps.some((step) => step.mode === 'transit')) {
    const fromSteps = estimateTransitFareFromSteps(route.steps);
    if (fromSteps > 0) return fromSteps;
    return nammaMetroFarePaise(route.totalDistance);
  }

  if (FUEL_MODES.has(primaryMode)) {
    return computeCost(route as RouteOption, DEFAULT_INPUTS).fuel;
  }

  if (route.estimatedCost > 0) {
    return route.estimatedCost;
  }

  return 0;
}

/** Apply fare/fuel estimation to a route option. */
export function withEstimatedCost(route: RouteOption): RouteOption {
  return { ...route, estimatedCost: estimateRouteCost(route) };
}
