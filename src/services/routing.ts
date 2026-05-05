import type {
  AQIReading,
  HourlyForecast,
  ISODateTime,
  LatLng,
  PlannedTrip,
  RouteOption,
  RouteResponse,
  SortMode,
} from '@/types';
import { computeScores, sortRoutes } from '@/lib/scoring';
import { sampleWaypoints } from '@/lib/geo';
import { computeWeatherImpact } from '@/lib/weatherImpact';
import type { WeatherProvider } from './weather/types';

export interface PlanRouteParams {
  from: LatLng;
  to: LatLng;
  sortBy: SortMode;
  departAt?: ISODateTime;
  signal?: AbortSignal;
  /** Set true for polling — bypasses the server-side LRU read so we detect upstream duration changes. */
  noCache?: boolean;
}

const DEFAULT_MODES = ['car', 'two_wheeler', 'transit', 'walk'] as const;

export async function planRoute(params: PlanRouteParams): Promise<PlannedTrip> {
  const { from, to, sortBy, departAt, signal, noCache } = params;

  const res = await fetch(noCache ? '/api/maps/route?fresh=1' : '/api/maps/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, modes: DEFAULT_MODES, departAt }),
    signal,
  });

  if (!res.ok) {
    let code = 'PROVIDER_ERROR';
    try {
      const json = (await res.json()) as { error?: { code?: string } };
      code = json.error?.code ?? code;
    } catch {
      // ignore parse failure
    }
    throw Object.assign(new Error(code), { code });
  }

  const data = (await res.json()) as RouteResponse;
  const scored = computeScores(data.routes);
  const sorted = sortRoutes(scored, sortBy);

  return {
    request: { from, to, modes: [...DEFAULT_MODES], sortBy, departAt },
    routes: sorted,
    generatedAt: data.generatedAt,
  };
}

const SAMPLE_EVERY_METERS = 5_000;
const MAX_WEATHER_POINTS = 3;

function isValidCoord(p: LatLng): boolean {
  return Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

function pickRepresentativePoints(route: RouteOption, from: LatLng, to: LatLng): LatLng[] {
  const waypoints = sampleWaypoints(route.geometry, SAMPLE_EVERY_METERS).filter(isValidCoord);
  if (waypoints.length >= 2) {
    const step = Math.max(1, Math.floor((waypoints.length - 1) / (MAX_WEATHER_POINTS - 1)));
    const picks: LatLng[] = [];
    for (let i = 0; i < waypoints.length && picks.length < MAX_WEATHER_POINTS; i += step) {
      picks.push(waypoints[i]);
    }
    return picks;
  }
  // Fallback for invalid/mock polylines: use geographic midpoint
  return [{ lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 }];
}

/**
 * Enriches each route in a PlannedTrip with weather risk data.
 * Fetches hourly weather and AQI for representative points along each route,
 * then attaches a WeatherRiskSummary to route.weatherRisk.
 * Silently returns the original trip if weather fetching fails.
 */
export async function enrichWithWeather(
  trip: PlannedTrip,
  provider: WeatherProvider,
): Promise<PlannedTrip> {
  const { from, to } = trip.request;

  const enrichedRoutes = await Promise.all(
    trip.routes.map(async (route): Promise<RouteOption> => {
      const points = pickRepresentativePoints(route, from, to);
      const representativePoint = points[Math.floor(points.length / 2)];

      let hourly: HourlyForecast[] = [];
      let aqiReading: AQIReading | undefined;

      try {
        [hourly, aqiReading] = await Promise.all([
          provider.hourly(representativePoint, 12),
          provider.airQuality(representativePoint),
        ]);
      } catch {
        return route;
      }

      return { ...route, weatherRisk: computeWeatherImpact(hourly, aqiReading) };
    }),
  );

  return { ...trip, routes: enrichedRoutes };
}
