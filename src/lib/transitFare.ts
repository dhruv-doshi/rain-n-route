import type { Paise, RouteStep } from '@/types';

/** Namma Metro distance slabs (BMRCL, indicative). Returns paise. */
export function nammaMetroFarePaise(distanceMeters: number): Paise {
  const km = distanceMeters / 1_000;
  if (km <= 2) return 1_000;
  if (km <= 4) return 2_000;
  if (km <= 6) return 2_500;
  if (km <= 8) return 3_000;
  if (km <= 10) return 3_500;
  if (km <= 15) return 4_000;
  if (km <= 20) return 4_500;
  if (km <= 25) return 5_000;
  if (km <= 30) return 5_500;
  return 6_000;
}

/** BMTC non-AC stage fares (indicative). Returns paise. */
export function bmtcBusFarePaise(distanceMeters: number): Paise {
  const km = distanceMeters / 1_000;
  if (km <= 2) return 800;
  if (km <= 5) return 1_500;
  if (km <= 10) return 2_400;
  if (km <= 15) return 3_200;
  if (km <= 20) return 4_000;
  return 5_000;
}

function isMetroAgency(agency: string, line: string): boolean {
  const label = `${agency} ${line}`.toLowerCase();
  return (
    label.includes('metro') ||
    label.includes('bmrc') ||
    label.includes('namma') ||
    label.includes('bengaluru metro')
  );
}

function isBmtcAgency(agency: string): boolean {
  const label = agency.toLowerCase();
  return label.includes('bmtc') || label.includes('bangalore metropolitan');
}

/** Estimate fare for a single transit leg from agency/line and distance. */
export function estimateTransitLegFarePaise(step: RouteStep): Paise {
  if (step.mode !== 'transit') return 0;

  if (!step.transitInfo) {
    return nammaMetroFarePaise(step.distance);
  }

  const { agency, line } = step.transitInfo;
  if (isMetroAgency(agency, line)) {
    return nammaMetroFarePaise(step.distance);
  }
  if (isBmtcAgency(agency)) {
    return bmtcBusFarePaise(step.distance);
  }

  // Commuter rail and other agencies — use bus-like slab as fallback
  return bmtcBusFarePaise(step.distance);
}

/** Sum fares across all transit legs in a route. */
export function estimateTransitFareFromSteps(steps: RouteStep[]): Paise {
  return steps
    .filter((step) => step.mode === 'transit')
    .reduce((sum, step) => sum + estimateTransitLegFarePaise(step), 0);
}
