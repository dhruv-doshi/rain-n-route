/**
 * GoogleMapsProvider — Server-side implementation of MapsProvider.
 *
 * Adapts Google Maps Platform APIs (Places New, Geocoding, Routes) to
 * the domain types consumed by UI components. Never exposes raw Google
 * responses, internal request URLs, or the server API key beyond this module.
 */

import { ServiceError } from '@/lib/http';
import type {
  GeoResult,
  GeoSuggestion,
  LatLng,
  RouteOption,
  RouteRequest,
  RouteResponse,
  RouteStep,
  ServiceErrorCode,
  ServiceErrorShape,
  TransportMode,
  TransitLeg,
} from '@/types';

import type {
  GoogleAutocompleteResponse,
  GooglePlaceDetails,
  GoogleRouteResponse,
  GoogleRouteStep,
} from './google-types';
import type { AutocompleteOptions, MapsProvider, ResolvePlaceOptions } from './types';

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

const AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types,suggestions.placePrediction.text';

const PLACE_DETAILS_FIELD_MASK = 'id,formattedAddress,location,types';

const ROUTES_FIELD_MASK =
  'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.travelMode,routes.legs.steps.transitDetails';

const DOMAIN_TO_GOOGLE_MODE: Record<string, string> = {
  car: 'DRIVE',
  cab: 'DRIVE',
  auto: 'DRIVE',
  mixed: 'DRIVE',
  two_wheeler: 'TWO_WHEELER',
  transit: 'TRANSIT',
  walk: 'WALK',
  cycle: 'BICYCLE',
};

const GOOGLE_TO_DOMAIN_MODE: Record<string, TransportMode> = {
  DRIVE: 'car',
  TWO_WHEELER: 'two_wheeler',
  TRANSIT: 'transit',
  WALK: 'walk',
  BICYCLE: 'cycle',
};

const TRAFFIC_AWARE_MODES = new Set(['DRIVE', 'TWO_WHEELER']);

const MODE_TIMEOUT_MS = 10_000;

// ────────────────────────────────────────────────────────────────────
// Exported Helper Functions
// ────────────────────────────────────────────────────────────────────

/**
 * Parse a Google duration string (e.g. "3.5s", "1234s") into integer seconds.
 * Returns 0 for invalid, empty, or undefined inputs — never throws.
 */
export function parseGoogleDuration(value: string | undefined): number {
  if (!value || value.length === 0) return 0;

  const numericPart = value.replace(/s$/, '');
  const parsed = parseFloat(numericPart);

  if (!isFinite(parsed) || parsed < 0) return 0;

  return Math.ceil(parsed);
}

/**
 * Classify Google Place types array into domain placeType.
 * Priority: station > poi > address > locality.
 */
export function classifyGooglePlaceTypes(
  types: string[],
): 'address' | 'poi' | 'locality' | 'station' | undefined {
  if (!types || types.length === 0) return undefined;

  if (
    types.includes('train_station') ||
    types.includes('transit_station') ||
    types.includes('bus_station')
  ) {
    return 'station';
  }

  if (types.includes('point_of_interest') || types.includes('establishment')) {
    return 'poi';
  }

  if (
    types.includes('street_address') ||
    types.includes('premise') ||
    types.includes('subpremise')
  ) {
    return 'address';
  }

  if (
    types.includes('locality') ||
    types.includes('sublocality') ||
    types.includes('administrative_area_level_1')
  ) {
    return 'locality';
  }

  return undefined;
}

/**
 * Build a deterministic, human-debuggable cache key for a route request.
 * - Coordinates rounded to 4 decimal places
 * - Modes sorted alphabetically
 * - Departure time bucketed to 5-minute intervals
 */
export function buildCacheKey(req: RouteRequest): string {
  const fromLat = req.from.lat.toFixed(4);
  const fromLng = req.from.lng.toFixed(4);
  const toLat = req.to.lat.toFixed(4);
  const toLng = req.to.lng.toFixed(4);

  const sortedModes = [...req.modes].sort().join(',');

  let timeBucket = '';
  if (req.departAt) {
    const ts = new Date(req.departAt).getTime();
    const bucketMs = 5 * 60 * 1000;
    const bucketed = Math.floor(ts / bucketMs) * bucketMs;
    timeBucket = `:t=${bucketed}`;
  }

  return `route:${fromLat},${fromLng}>${toLat},${toLng}|${sortedModes}${timeBucket}`;
}

/**
 * Normalize an unknown error from a Google API call into a ServiceErrorShape.
 * Never includes API keys, request URLs, or headers in the message.
 */
export function normalizeGoogleError(error: unknown): ServiceErrorShape {
  // Already a ServiceError
  if (error instanceof ServiceError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }

  // Timeout (AbortError)
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      code: 'PROVIDER_TIMEOUT',
      message: 'Route computation timed out',
      retryable: true,
    };
  }

  // HTTP response-like error with status
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return mapHttpStatus(status);
  }

  // Network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_OFFLINE',
      message: 'Network connection unavailable',
      retryable: true,
    };
  }

  // Unknown
  return {
    code: 'UNKNOWN',
    message: 'An unexpected error occurred',
    retryable: false,
  };
}

// ────────────────────────────────────────────────────────────────────
// Internal Helpers
// ────────────────────────────────────────────────────────────────────

function mapHttpStatus(status: number): ServiceErrorShape {
  switch (status) {
    case 400:
      return { code: 'VALIDATION_ERROR', message: 'Invalid request parameters', retryable: false };
    case 403:
      return { code: 'PROVIDER_ERROR', message: 'Service access denied', retryable: false };
    case 404:
      return { code: 'NOT_FOUND', message: 'Requested resource not found', retryable: false };
    case 429:
      return { code: 'RATE_LIMITED', message: 'Rate limit exceeded', retryable: true };
    case 503:
      return {
        code: 'PROVIDER_ERROR',
        message: 'Service temporarily unavailable',
        retryable: true,
      };
    default:
      if (status >= 500) {
        return { code: 'PROVIDER_ERROR', message: 'Upstream service error', retryable: true };
      }
      return { code: 'UNKNOWN', message: 'An unexpected error occurred', retryable: false };
  }
}

function selectMostActionableError(errors: ServiceErrorShape[]): ServiceError {
  if (errors.length === 0) {
    return new ServiceError('UNKNOWN', 'All route modes failed', false);
  }

  // Priority: RATE_LIMITED > PROVIDER_ERROR > others (excluding PROVIDER_TIMEOUT)
  const priority: ServiceErrorCode[] = [
    'RATE_LIMITED',
    'PROVIDER_ERROR',
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'UNKNOWN',
    'PROVIDER_TIMEOUT',
  ];

  for (const code of priority) {
    const found = errors.find((e) => e.code === code);
    if (found) {
      return new ServiceError(found.code, found.message, found.retryable);
    }
  }

  const first = errors[0];
  return new ServiceError(first.code, first.message, first.retryable);
}

function adaptStep(step: GoogleRouteStep, domainMode: TransportMode): RouteStep {
  const transitInfo: TransitLeg | undefined = step.transitDetails
    ? {
        agency: step.transitDetails.transitLine?.agencies?.[0]?.name ?? 'Unknown',
        line: step.transitDetails.transitLine?.name ?? '',
        headsign: step.transitDetails.headsign ?? '',
        numStops: step.transitDetails.stopCount ?? 0,
        departAt: step.transitDetails.stopDetails?.departureTime ?? '',
        arriveAt: step.transitDetails.stopDetails?.arrivalTime ?? '',
      }
    : undefined;

  const stepMode: TransportMode = step.travelMode
    ? (GOOGLE_TO_DOMAIN_MODE[step.travelMode] ?? domainMode)
    : domainMode;

  return {
    instruction: step.navigationInstruction?.instructions ?? '',
    mode: stepMode,
    distance: step.distanceMeters ?? 0,
    duration: parseGoogleDuration(step.staticDuration),
    polyline: step.polyline?.encodedPolyline ?? '',
    ...(transitInfo && { transitInfo }),
    ...(step.transitDetails?.stopDetails && {
      fromLabel: step.transitDetails.stopDetails.departureStop?.name,
      toLabel: step.transitDetails.stopDetails.arrivalStop?.name,
    }),
  };
}

// ────────────────────────────────────────────────────────────────────
// GoogleMapsProvider
// ────────────────────────────────────────────────────────────────────

export class GoogleMapsProvider implements MapsProvider {
  private serverKey: string;

  constructor(serverKey: string) {
    this.serverKey = serverKey;
  }

  // ─── Autocomplete ─────────────────────────────────────────────────

  async autocomplete(query: string, options: AutocompleteOptions): Promise<GeoSuggestion[]> {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.serverKey,
        'X-Goog-FieldMask': AUTOCOMPLETE_FIELD_MASK,
      },
      body: JSON.stringify({
        input: query.trim(),
        sessionToken: options.sessionToken,
        includedRegionCodes: ['in'],
        ...(options.bias && {
          locationBias: {
            circle: {
              center: { latitude: options.bias.lat, longitude: options.bias.lng },
              radius: 50000,
            },
          },
        }),
      }),
    });

    if (!response.ok) {
      throw this.buildError(response.status);
    }

    const data: GoogleAutocompleteResponse = await response.json();
    return this.adaptAutocomplete(data);
  }

  private adaptAutocomplete(data: GoogleAutocompleteResponse): GeoSuggestion[] {
    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      return [];
    }

    return data.suggestions
      .filter((s) => s.placePrediction != null)
      .slice(0, 5)
      .map((s) => {
        const p = s.placePrediction!;
        return {
          id: p.placeId,
          label: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondary: p.structuredFormat?.secondaryText?.text,
          coords: undefined,
        };
      });
  }

  // ─── Place Resolution ─────────────────────────────────────────────

  async resolvePlace(placeId: string, options: ResolvePlaceOptions): Promise<GeoResult> {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(options.sessionToken)}&languageCode=en&regionCode=IN`;
    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': this.serverKey,
        'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
      },
    });

    if (!response.ok) {
      throw this.buildError(response.status);
    }

    const place: GooglePlaceDetails = await response.json();
    return {
      id: place.id,
      label: options.fallbackLabel || place.formattedAddress,
      coords: { lat: place.location.latitude, lng: place.location.longitude },
      placeType: classifyGooglePlaceTypes(place.types),
    };
  }

  // ─── Forward Geocode ──────────────────────────────────────────────

  async geocode(query: string): Promise<GeoResult[]> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=in&key=${this.serverKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw this.buildError(response.status);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      return [];
    }

    if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'RESOURCE_EXHAUSTED') {
      throw new ServiceError('RATE_LIMITED', 'Rate limit exceeded', true);
    }

    if (data.status === 'REQUEST_DENIED') {
      throw new ServiceError('PROVIDER_ERROR', 'Service access denied', false);
    }

    if (data.status === 'INVALID_REQUEST') {
      throw new ServiceError('VALIDATION_ERROR', 'Invalid request parameters', false);
    }

    if (data.status !== 'OK') {
      throw new ServiceError('PROVIDER_ERROR', 'Geocoding request failed', false);
    }

    return this.adaptGeocodeResults(data.results ?? []);
  }

  private adaptGeocodeResults(
    results: Array<{
      place_id: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      types: string[];
    }>,
  ): GeoResult[] {
    return results.map((r) => ({
      id: r.place_id,
      label: r.formatted_address,
      coords: { lat: r.geometry.location.lat, lng: r.geometry.location.lng },
      placeType: classifyGooglePlaceTypes(r.types),
    }));
  }

  // ─── Reverse Geocode ──────────────────────────────────────────────

  async reverseGeocode(coords: LatLng): Promise<GeoResult> {
    // Validate coordinate ranges
    if (coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
      throw new ServiceError('VALIDATION_ERROR', 'Coordinates out of valid range', false);
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&region=in&key=${this.serverKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw this.buildError(response.status);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw new ServiceError('NOT_FOUND', 'No address found for coordinates', false);
    }

    if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'RESOURCE_EXHAUSTED') {
      throw new ServiceError('RATE_LIMITED', 'Rate limit exceeded', true);
    }

    if (data.status === 'REQUEST_DENIED') {
      throw new ServiceError('PROVIDER_ERROR', 'Service access denied', false);
    }

    if (data.status === 'INVALID_REQUEST') {
      throw new ServiceError('VALIDATION_ERROR', 'Invalid request parameters', false);
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new ServiceError('NOT_FOUND', 'No address found for coordinates', false);
    }

    const first = data.results[0];
    return {
      id: first.place_id,
      label: first.formatted_address,
      coords: { lat: first.geometry.location.lat, lng: first.geometry.location.lng },
      placeType: classifyGooglePlaceTypes(first.types),
    };
  }

  // ─── Route ────────────────────────────────────────────────────────

  async route(req: RouteRequest): Promise<RouteResponse> {
    // Step 1: Build per-mode requests, deduplicating Google modes
    const modeRequests = this.buildModeRequests(req);

    // Step 2: Execute concurrently with per-mode timeout
    const results = await Promise.allSettled(
      modeRequests.map(({ domainMode, googleMode, request }) =>
        this.callRoutesApi(request).then((response) => ({
          domainMode,
          googleMode,
          response,
        })),
      ),
    );

    // Step 3: Adapt successful responses
    const routes: RouteOption[] = [];
    const errors: ServiceErrorShape[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { domainMode, response } = result.value;
        if (response.routes && response.routes.length > 0) {
          routes.push(this.adaptRoute(response.routes[0], domainMode, req));
        }
      } else {
        errors.push(normalizeGoogleError(result.reason));
      }
    }

    // Step 4: Handle total failure
    if (routes.length === 0) {
      throw selectMostActionableError(errors);
    }

    return {
      routes,
      generatedAt: new Date().toISOString(),
      cacheKey: buildCacheKey(req),
    };
  }

  private buildModeRequests(
    req: RouteRequest,
  ): Array<{ domainMode: TransportMode; googleMode: string; request: object }> {
    const seen = new Map<string, TransportMode>();
    const requests: Array<{ domainMode: TransportMode; googleMode: string; request: object }> = [];

    for (const mode of req.modes) {
      const googleMode = DOMAIN_TO_GOOGLE_MODE[mode];
      if (!googleMode) continue;

      // Deduplicate: only one call per unique Google mode
      if (seen.has(googleMode)) continue;
      seen.set(googleMode, mode);

      const request: Record<string, unknown> = {
        origin: {
          location: { latLng: { latitude: req.from.lat, longitude: req.from.lng } },
        },
        destination: {
          location: { latLng: { latitude: req.to.lat, longitude: req.to.lng } },
        },
        travelMode: googleMode,
        computeAlternativeRoutes: false,
        polylineQuality: 'OVERVIEW',
        polylineEncoding: 'ENCODED_POLYLINE',
        languageCode: 'en-IN',
        regionCode: 'in',
        units: 'METRIC',
      };

      if (TRAFFIC_AWARE_MODES.has(googleMode)) {
        request.routingPreference = 'TRAFFIC_AWARE';
      }

      if (googleMode === 'TRANSIT' && req.departAt) {
        request.departureTime = req.departAt;
      }

      requests.push({ domainMode: mode, googleMode, request });
    }

    return requests;
  }

  private async callRoutesApi(request: object): Promise<GoogleRouteResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODE_TIMEOUT_MS);

    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.serverKey,
          'X-Goog-FieldMask': ROUTES_FIELD_MASK,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const err = new Error('Routes API error') as Error & { status: number };
        err.status = response.status;
        throw err;
      }

      return (await response.json()) as GoogleRouteResponse;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  private adaptRoute(
    googleRoute: GoogleRouteResponse['routes'][0],
    domainMode: TransportMode,
    req: RouteRequest,
  ): RouteOption {
    const duration = parseGoogleDuration(googleRoute.duration);
    const staticDuration = parseGoogleDuration(googleRoute.staticDuration);
    const distance = googleRoute.distanceMeters ?? 0;
    const geometry = googleRoute.polyline?.encodedPolyline ?? '';

    // Adapt steps from all legs
    const steps: RouteStep[] = [];
    let walkDistance = 0;
    let numTransfers = 0;

    if (googleRoute.legs) {
      for (const leg of googleRoute.legs) {
        if (leg.steps) {
          for (const step of leg.steps) {
            const adapted = adaptStep(step, domainMode);
            steps.push(adapted);

            if (adapted.mode === 'walk') {
              walkDistance += adapted.distance;
            }
            if (step.transitDetails) {
              numTransfers++;
            }
          }
        }
      }
    }

    // Transit transfers are one less than transit segments
    if (numTransfers > 0) {
      numTransfers = numTransfers - 1;
    }

    // Use traffic-aware duration for modes that have it, else static
    const totalDuration = duration > 0 ? duration : staticDuration;

    // Generate deterministic ID
    const id = `${domainMode}-${req.from.lat.toFixed(4)},${req.from.lng.toFixed(4)}-${req.to.lat.toFixed(4)},${req.to.lng.toFixed(4)}`;

    return {
      id,
      modes: [domainMode],
      totalDuration,
      totalDistance: distance,
      estimatedCost: 0, // Cost estimation not provided by Google Routes API
      numTransfers,
      walkDistance,
      carbonGrams: 0, // Not provided by Routes API
      steps,
      geometry,
    };
  }

  // ─── Error Helpers ────────────────────────────────────────────────

  private buildError(status: number): ServiceError {
    const shape = mapHttpStatus(status);
    return new ServiceError(shape.code, shape.message, shape.retryable);
  }
}
