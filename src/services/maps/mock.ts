import type {
  GeoResult,
  GeoSuggestion,
  LatLng,
  RouteOption,
  RouteRequest,
  RouteResponse,
} from '@/types';
import type { AutocompleteOptions, MapsProvider, ResolvePlaceOptions } from './types';

// ────────────────────────────────────────────────────────────────────
// Valid encoded polyline: "oqcnAm}ciMeAeA{@kAaBqB" decodes to 4 points
// around Indiranagar–Majestic corridor in Bengaluru.
// ────────────────────────────────────────────────────────────────────
const VALID_POLYLINE = 'oqcnAm}ciMeAeA{@kAaBqB';

// Deterministic timestamp — no Date.now() or Math.random()
const GENERATED_AT = '2024-03-15T09:00:00+05:30';

// ────────────────────────────────────────────────────────────────────
// Fixture Data (adapted from tests/fixtures/google-*.json)
// ────────────────────────────────────────────────────────────────────

export const MOCK_SUGGESTIONS: GeoSuggestion[] = [
  {
    id: 'ChIJbU60yXAWrjsR4E9-UejD3_g',
    label: 'Indiranagar',
    secondary: 'Bengaluru, Karnataka, India',
  },
  {
    id: 'ChIJLfyY2E4UrjsRVq4AjI7zgkY',
    label: 'Indira Nagar BDA Complex',
    secondary: 'Bengaluru, Karnataka, India',
  },
  {
    id: 'ChIJkbeSa_BZwjsRqq1PAL7cHSM',
    label: 'Indiranagar Metro Station',
    secondary: 'Bengaluru, Karnataka, India',
  },
];

export const MOCK_GEO_RESULT: GeoResult = {
  id: 'ChIJbU60yXAWrjsR4E9-UejD3_g',
  label: 'Indiranagar, Bengaluru, Karnataka 560038, India',
  coords: { lat: 12.9783692, lng: 77.6408356 },
  placeType: 'locality',
};

export const MOCK_REVERSE_GEO_RESULT: GeoResult = {
  id: 'ChIJ2wd_0HAWrjsRfGl8rM3gESQ',
  label: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038, India',
  coords: { lat: 12.9784, lng: 77.6408 },
  placeType: 'address',
};

const MOCK_ROUTE_CAR: RouteOption = {
  id: 'mock-route-car',
  modes: ['car'],
  totalDuration: 2700,
  totalDistance: 8420,
  estimatedCost: 0,
  numTransfers: 0,
  walkDistance: 0,
  carbonGrams: 1936,
  steps: [
    {
      instruction: 'Head south on 100 Feet Rd',
      mode: 'car',
      distance: 3200,
      duration: 1200,
      polyline: VALID_POLYLINE,
    },
    {
      instruction: 'Turn right onto Outer Ring Rd',
      mode: 'car',
      distance: 2100,
      duration: 900,
      polyline: VALID_POLYLINE,
    },
    {
      instruction: 'Continue onto Whitefield Main Rd',
      mode: 'car',
      distance: 3120,
      duration: 600,
      polyline: VALID_POLYLINE,
    },
  ],
  geometry: VALID_POLYLINE,
};

const MOCK_ROUTE_TWO_WHEELER: RouteOption = {
  id: 'mock-route-two-wheeler',
  modes: ['two_wheeler'],
  totalDuration: 840,
  totalDistance: 8420,
  estimatedCost: 0,
  numTransfers: 0,
  walkDistance: 0,
  carbonGrams: 674,
  steps: [
    {
      instruction: 'Head north on 100 Feet Rd toward 12th Main Rd',
      mode: 'two_wheeler',
      distance: 3200,
      duration: 360,
      polyline: VALID_POLYLINE,
    },
    {
      instruction: 'Turn right onto CMH Rd',
      mode: 'two_wheeler',
      distance: 2100,
      duration: 240,
      polyline: VALID_POLYLINE,
    },
    {
      instruction: 'Continue onto Outer Ring Rd',
      mode: 'two_wheeler',
      distance: 3120,
      duration: 240,
      polyline: VALID_POLYLINE,
    },
  ],
  geometry: VALID_POLYLINE,
};

const MOCK_ROUTE_TRANSIT: RouteOption = {
  id: 'mock-route-transit',
  modes: ['transit'],
  totalDuration: 1800,
  totalDistance: 9800,
  estimatedCost: 4500,
  numTransfers: 1,
  walkDistance: 800,
  carbonGrams: 490,
  steps: [
    {
      instruction: 'Walk to Indiranagar Metro Station',
      mode: 'walk',
      distance: 450,
      duration: 340,
      polyline: VALID_POLYLINE,
    },
    {
      instruction: 'Take Purple Line towards Whitefield',
      mode: 'transit',
      distance: 8200,
      duration: 1080,
      polyline: VALID_POLYLINE,
      transitInfo: {
        agency: 'Bangalore Metro Rail Corporation',
        line: 'Purple Line',
        headsign: 'Whitefield',
        numStops: 7,
        departAt: '2024-03-15T09:07:00+05:30',
        arriveAt: '2024-03-15T09:25:00+05:30',
      },
    },
    {
      instruction: 'Walk to destination',
      mode: 'walk',
      distance: 1150,
      duration: 380,
      polyline: VALID_POLYLINE,
    },
  ],
  geometry: VALID_POLYLINE,
};

const MOCK_ROUTE_WALK: RouteOption = {
  id: 'mock-route-walk',
  modes: ['walk'],
  totalDuration: 5880,
  totalDistance: 8420,
  estimatedCost: 0,
  numTransfers: 0,
  walkDistance: 8420,
  carbonGrams: 0,
  steps: [
    {
      instruction: 'Head north on 100 Feet Rd',
      mode: 'walk',
      distance: 3200,
      duration: 2280,
      polyline: VALID_POLYLINE,
    },
    {
      instruction: 'Turn right onto CMH Rd',
      mode: 'walk',
      distance: 2100,
      duration: 1500,
      polyline: VALID_POLYLINE,
    },
    {
      instruction: 'Continue onto Outer Ring Rd',
      mode: 'walk',
      distance: 3120,
      duration: 2100,
      polyline: VALID_POLYLINE,
    },
  ],
  geometry: VALID_POLYLINE,
};

const ROUTES_BY_MODE: Record<string, RouteOption> = {
  car: MOCK_ROUTE_CAR,
  two_wheeler: MOCK_ROUTE_TWO_WHEELER,
  transit: MOCK_ROUTE_TRANSIT,
  walk: MOCK_ROUTE_WALK,
};

// ────────────────────────────────────────────────────────────────────
// MockMapsProvider — 5-method MapsProvider interface
// ────────────────────────────────────────────────────────────────────

export class MockMapsProvider implements MapsProvider {
  /**
   * Returns fixture-based suggestions.
   * sessionToken is accepted but never used for network calls.
   */
  async autocomplete(_query: string, _options: AutocompleteOptions): Promise<GeoSuggestion[]> {
    return MOCK_SUGGESTIONS;
  }

  /**
   * Returns fixture-based GeoResult for a placeId.
   * sessionToken is accepted but never used for network calls.
   */
  async resolvePlace(_placeId: string, _options: ResolvePlaceOptions): Promise<GeoResult> {
    return MOCK_GEO_RESULT;
  }

  /** Returns fixture-based GeoResult array. */
  async geocode(_query: string): Promise<GeoResult[]> {
    return [MOCK_GEO_RESULT];
  }

  /** Returns fixture-based GeoResult for reverse geocoding. */
  async reverseGeocode(_coords: LatLng): Promise<GeoResult> {
    return MOCK_REVERSE_GEO_RESULT;
  }

  /**
   * Returns fixture-based RouteResponse with valid encoded polylines.
   * Includes routes for all requested modes that have fixture data.
   */
  async route(req: RouteRequest): Promise<RouteResponse> {
    const routes: RouteOption[] = req.modes
      .map((mode) => ROUTES_BY_MODE[mode])
      .filter((r): r is RouteOption => r !== undefined);

    // Fallback: if no requested modes match, return car route
    if (routes.length === 0) {
      routes.push(MOCK_ROUTE_CAR);
    }

    return {
      routes,
      generatedAt: GENERATED_AT,
      cacheKey: `mock-${req.from.lat.toFixed(4)},${req.from.lng.toFixed(4)}-${req.to.lat.toFixed(4)},${req.to.lng.toFixed(4)}`,
    };
  }
}

export const mockMapsProvider = new MockMapsProvider();

// ────────────────────────────────────────────────────────────────────
// Exported constants for test assertions
// ────────────────────────────────────────────────────────────────────

export const BENGALURU: LatLng = { lat: 12.9716, lng: 77.5946 };

/**
 * Pre-built route response for use in tests that mock fetch responses.
 * Contains all 4 mode routes with the deterministic timestamp.
 */
export const MOCK_ROUTE_RESPONSE: RouteResponse = {
  routes: [MOCK_ROUTE_CAR, MOCK_ROUTE_TRANSIT, MOCK_ROUTE_TWO_WHEELER, MOCK_ROUTE_WALK],
  generatedAt: GENERATED_AT,
  cacheKey: 'mock-12.9784,77.6410-12.9698,77.7499',
};
