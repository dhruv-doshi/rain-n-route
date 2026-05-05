import type { RouteOption, SortMode } from '@/types';

function normalise(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 1);
  return values.map((v) => (max - v) / range);
}

export function scoreFastest(route: RouteOption, allRoutes: RouteOption[]): number {
  const idx = allRoutes.indexOf(route);
  return normalise(allRoutes.map((r) => r.totalDuration))[idx];
}

export function scoreCheapest(route: RouteOption, allRoutes: RouteOption[]): number {
  const idx = allRoutes.indexOf(route);
  return normalise(allRoutes.map((r) => r.estimatedCost))[idx];
}

export function scoreLeastTransfers(route: RouteOption, allRoutes: RouteOption[]): number {
  const idx = allRoutes.indexOf(route);
  return normalise(allRoutes.map((r) => r.numTransfers))[idx];
}

export function scoreEco(route: RouteOption, allRoutes: RouteOption[]): number {
  const idx = allRoutes.indexOf(route);
  return normalise(allRoutes.map((r) => r.carbonGrams))[idx];
}

export function computeScores(routes: RouteOption[]): RouteOption[] {
  if (routes.length === 0) return [];
  return routes.map((route) => ({
    ...route,
    scoreBreakdown: {
      fastest: scoreFastest(route, routes),
      cheapest: scoreCheapest(route, routes),
      least_transfers: scoreLeastTransfers(route, routes),
      eco: scoreEco(route, routes),
    },
  }));
}

export function sortRoutes(routes: RouteOption[], by: SortMode): RouteOption[] {
  return [...routes].sort((a, b) => {
    const aScore = a.scoreBreakdown?.[by] ?? 0;
    const bScore = b.scoreBreakdown?.[by] ?? 0;
    if (bScore !== aScore) return bScore - aScore;
    return a.id < b.id ? -1 : 1;
  });
}
