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
import { applySpatialFloodToRisk, computeFloodExposure } from '@/lib/floodExposure';
import { suggestGear } from '@/lib/gearSuggestions';
import type { RiskLevel, WeatherRiskSummary } from '@/types';

const LEVEL_ORDER: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 };

function mergeSpatialFloodRisk(
  base: WeatherRiskSummary,
  geometry: string,
  maxRainMm: number,
): WeatherRiskSummary {
  const exposure = computeFloodExposure(geometry, maxRainMm);
  if (exposure.hits.length === 0 && exposure.spatialLevel === 'low') {
    return base;
  }
  const factors = applySpatialFloodToRisk(base.factors, exposure, maxRainMm);
  const overall =
    factors.length > 0
      ? factors.reduce<RiskLevel>(
          (best, f) => (LEVEL_ORDER[f.level] > LEVEL_ORDER[best] ? f.level : best),
          'low',
        )
      : 'low';
  const BUFFER_MINUTES: Record<RiskLevel, number> = {
    low: 0,
    moderate: 5,
    high: 15,
    severe: 30,
  };
  return {
    overall,
    factors,
    gear: suggestGear(factors),
    bufferMinutesRecommended: BUFFER_MINUTES[overall],
  };
}

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
 * Fetches weather data from the server-side /api/weather endpoint.
 * This avoids exposing OWM_KEY to the client.
 */
async function fetchWeatherFromApi(
  coords: LatLng,
  hours = 12,
): Promise<{ hourly: HourlyForecast[]; aqi: AQIReading }> {
  const url = `/api/weather?lat=${coords.lat}&lng=${coords.lng}&hours=${hours}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API responded ${res.status}`);
  return res.json() as Promise<{ hourly: HourlyForecast[]; aqi: AQIReading }>;
}

/**
 * Enriches each route in a PlannedTrip with weather risk data.
 * Fetches hourly weather and AQI for representative points along each route
 * via the /api/weather server endpoint, then attaches a WeatherRiskSummary
 * to route.weatherRisk.
 * Silently returns the original trip if weather fetching fails.
 */
export async function enrichWithWeather(trip: PlannedTrip): Promise<PlannedTrip> {
  const { from, to } = trip.request;

  const enrichedRoutes = await Promise.all(
    trip.routes.map(async (route): Promise<RouteOption> => {
      const points = pickRepresentativePoints(route, from, to);
      const representativePoint = points[Math.floor(points.length / 2)];

      try {
        const { hourly, aqi } = await fetchWeatherFromApi(representativePoint, 12);
        const maxMm = hourly.length > 0 ? Math.max(...hourly.map((h) => h.precipitationMm)) : 0;
        const baseRisk = computeWeatherImpact(hourly, aqi);
        const risk = mergeSpatialFloodRisk(baseRisk, route.geometry, maxMm);
        return { ...route, weatherRisk: risk };
      } catch {
        return route;
      }
    }),
  );

  return { ...trip, routes: enrichedRoutes };
}
