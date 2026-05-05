import { assertOk, fetchWithRetry } from '@/lib/http';
import type {
  GeoResult,
  GeoSuggestion,
  LatLng,
  RouteOption,
  RouteRequest,
  RouteResponse,
  RouteStep,
  TileLayer,
  TrafficSegment,
  TrafficSnapshot,
  TransportMode,
} from '@/types';
import type { MapsProvider } from './types';
import { nominatimGeocode, nominatimReverseGeocode } from './nominatim';
import { estimateCarbonGrams } from '@/lib/carbon';

const MMI_BASE = 'https://atlas.mapmyindia.com/api';
const MMI_ROUTE_BASE = 'https://apis.mapmyindia.com/advancedmaps/v1';
const MMI_TOKEN_URL = 'https://outpost.mapmyindia.com/api/security/oauth/token';

// ── Token management ──────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const clientId = process.env.NEXT_PUBLIC_MAPS_KEY!;
  const clientSecret = process.env.MAPS_SECRET!;

  const res = await fetchWithRetry(MMI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    timeoutMs: 5_000,
    retries: 1,
  });

  await assertOk(res);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1_000,
  };
  return tokenCache.token;
}

// ── Response-shape adapters ───────────────────────────────────────────

interface MmiSuggestion {
  eLoc?: string;
  placeAddress?: string;
  placeName?: string;
  latitude?: string | number;
  longitude?: string | number;
  type?: string;
}

interface MmiManeuver {
  type?: string; // 'depart' | 'turn' | 'continue' | 'arrive' | 'roundabout' | 'merge' | ...
  modifier?: string; // 'left' | 'right' | 'straight' | 'sharp left' | 'slight right' | ...
}

interface MmiRouteStep {
  name?: string; // street name (often empty for short connector steps)
  ref?: string; // road reference (e.g. "NH-44")
  distance?: number;
  duration?: number;
  geometry?: string; // encoded polyline for the step
  maneuver?: MmiManeuver;
}

interface MmiRoute {
  legs?: Array<{ steps?: MmiRouteStep[] }>;
  distance?: number;
  duration?: number;
  geometry?: string; // encoded polyline for the whole route
}

interface MmiTrafficSegment {
  startIndex?: number;
  endIndex?: number;
  severity?: string;
  delay?: number;
}

const MMI_CONDITION_MAP: Record<string, string> = {
  'No Traffic': 'free',
  'Light Traffic': 'light',
  'Moderate Traffic': 'moderate',
  'Heavy Traffic': 'heavy',
  Jam: 'jam',
};

function adaptSuggestion(s: MmiSuggestion): GeoSuggestion {
  const lat = s.latitude ? Number(s.latitude) : undefined;
  const lng = s.longitude ? Number(s.longitude) : undefined;
  return {
    id: s.eLoc ?? crypto.randomUUID(),
    label: s.placeName ?? s.placeAddress ?? '',
    secondary: s.placeAddress,
    coords: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
  };
}

function composeInstruction(step: MmiRouteStep): string {
  const m = step.maneuver ?? {};
  const type = m.type ?? '';
  const modifier = m.modifier ?? '';
  const onto = step.name ? ` onto ${step.name}` : step.ref ? ` onto ${step.ref}` : '';

  switch (type) {
    case 'depart':
      return `Head ${modifier || 'off'}${onto}`;
    case 'arrive':
      return 'Arrive at destination';
    case 'turn':
      return `Turn ${modifier}${onto}`;
    case 'continue':
      return `Continue${modifier && modifier !== 'straight' ? ' ' + modifier : ''}${onto}`;
    case 'merge':
      return `Merge${modifier ? ' ' + modifier : ''}${onto}`;
    case 'roundabout':
    case 'rotary':
      return `Take the roundabout${onto}`;
    case 'fork':
      return `Keep ${modifier || 'straight'}${onto}`;
    case 'on ramp':
    case 'off ramp':
      return `${type === 'on ramp' ? 'Take the on-ramp' : 'Take the off-ramp'}${modifier ? ' ' + modifier : ''}${onto}`;
    case 'end of road':
      return `At end of road, turn ${modifier || 'left'}${onto}`;
    default:
      return modifier || type
        ? `${type || 'Continue'}${modifier ? ' ' + modifier : ''}${onto}`
        : `Continue${onto}`;
  }
}

function adaptRouteSteps(route: MmiRoute, mode: TransportMode): RouteStep[] {
  const steps: RouteStep[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      steps.push({
        instruction: composeInstruction(step),
        mode,
        distance: step.distance ?? 0,
        duration: step.duration ?? 0,
        polyline: step.geometry ?? '',
        fromLabel: undefined,
        toLabel: step.name || undefined,
      });
    }
  }
  return steps;
}

function modeToMmiProfile(mode: TransportMode): string {
  const map: Record<TransportMode, string> = {
    car: 'driving',
    two_wheeler: 'biking',
    transit: 'transit',
    cab: 'driving',
    auto: 'driving',
    walk: 'walking',
    cycle: 'cycling',
    mixed: 'driving',
  };
  return map[mode] ?? 'driving';
}

// ── Provider implementation ───────────────────────────────────────────

export class MapmyIndiaProvider implements MapsProvider {
  private async authHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }

  async autocomplete(query: string, signal?: AbortSignal): Promise<GeoSuggestion[]> {
    const token = await getToken();
    const url = new URL(`${MMI_BASE}/places/search/json`);
    url.searchParams.set('query', query);
    url.searchParams.set('access_token', token);

    const res = await fetchWithRetry(url.toString(), { signal });
    await assertOk(res);
    const data = (await res.json()) as { suggestedLocations?: MmiSuggestion[] };
    return (data.suggestedLocations ?? []).map(adaptSuggestion);
  }

  async geocode(query: string): Promise<GeoResult[]> {
    // Mappls' /places/geocode returns address breakdowns without lat/lng on our tier
    // (place_detail is gated). Delegate to Nominatim (OSM) which returns coords directly.
    return nominatimGeocode(query);
  }

  async reverseGeocode(coords: LatLng): Promise<GeoResult> {
    // Mappls' /places/reverse_geocode is gated on our tier (404). Use Nominatim.
    return nominatimReverseGeocode(coords);
  }

  async route(req: RouteRequest): Promise<RouteResponse> {
    const token = await getToken();
    const generatedAt = new Date().toISOString();
    const cacheKey = `${req.from.lat},${req.from.lng}-${req.to.lat},${req.to.lng}`;
    const routes: RouteOption[] = [];

    for (const mode of req.modes) {
      const profile = modeToMmiProfile(mode);
      const url = `${MMI_ROUTE_BASE}/${token}/route_adv/${profile}/${req.from.lng},${req.from.lat};${req.to.lng},${req.to.lat}`;
      const params = new URLSearchParams({ geometries: 'polyline', steps: 'true' });
      if (req.departAt) params.set('depart_time', req.departAt);

      try {
        const res = await fetchWithRetry(`${url}?${params}`);
        await assertOk(res);
        const data = (await res.json()) as { routes?: MmiRoute[] };
        const raw = (data.routes ?? [])[0];
        if (!raw) continue;

        routes.push({
          id: `${cacheKey}-${mode}`,
          modes: [mode],
          totalDuration: raw.duration ?? 0,
          totalDistance: raw.distance ?? 0,
          estimatedCost: 0,
          numTransfers: 0,
          walkDistance: mode === 'walk' ? (raw.distance ?? 0) : 0,
          carbonGrams: estimateCarbonGrams(raw.distance ?? 0, mode),
          steps: adaptRouteSteps(raw, mode),
          geometry: raw.geometry ?? '',
        });
      } catch {
        // Skip unavailable modes rather than failing the whole request
      }
    }

    return { routes, generatedAt, cacheKey };
  }

  async trafficFor(routeId: string): Promise<TrafficSnapshot> {
    const headers = await this.authHeaders();
    const url = new URL('https://apis.mapmyindia.com/traffic/api/v2');
    url.searchParams.set('route_id', routeId);

    const res = await fetchWithRetry(url.toString(), { headers });
    await assertOk(res);
    const data = (await res.json()) as { segments?: MmiTrafficSegment[]; total_delay?: number };

    const segments: TrafficSegment[] = (data.segments ?? []).map((s) => ({
      startIdx: s.startIndex ?? 0,
      endIdx: s.endIndex ?? 0,
      level: (MMI_CONDITION_MAP[s.severity ?? ''] as TrafficSegment['level']) ?? 'free',
      delaySeconds: s.delay ?? 0,
    }));

    return {
      routeId,
      takenAt: new Date().toISOString(),
      segments,
      totalDelay: data.total_delay ?? 0,
    };
  }

  tilesUrl(layer: TileLayer): string {
    // Mappls tile endpoints require paid auth; use free OSM-compatible tile servers instead.
    // base: standard OSM. traffic/transit: CARTO basemap variants for visual differentiation.
    const map: Record<TileLayer, string> = {
      base: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      traffic: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      transit: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    };
    return map[layer];
  }
}
