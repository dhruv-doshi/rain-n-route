import type { TransportMode } from '@/types';

/**
 * Tailpipe CO₂ emission factors in grams per kilometre for an average vehicle
 * in Indian conditions. Sources: India BEE/MoRTH 2022 estimates and IPCC WG3.
 * Transit is per-passenger (occupancy-weighted), zero-emission for non-motorized.
 */
const G_CO2_PER_KM: Record<TransportMode, number> = {
  car: 192,
  cab: 192,
  two_wheeler: 80,
  auto: 120,
  transit: 50,
  walk: 0,
  cycle: 0,
  mixed: 130, // rough blended estimate when mode is uncategorized
};

/** Pure: estimate carbon emissions in grams for a single trip. */
export function estimateCarbonGrams(distanceMeters: number, mode: TransportMode): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0;
  const km = distanceMeters / 1_000;
  return Math.round(km * (G_CO2_PER_KM[mode] ?? G_CO2_PER_KM.mixed));
}
