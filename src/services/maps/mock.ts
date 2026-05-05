import type {
  GeoResult,
  GeoSuggestion,
  LatLng,
  RouteRequest,
  RouteResponse,
  TileLayer,
  TrafficSnapshot,
} from '@/types';
import type { MapsProvider } from './types';

const BENGALURU: LatLng = { lat: 12.9716, lng: 77.5946 };

export const MOCK_SUGGESTIONS: GeoSuggestion[] = [
  {
    id: 'mock-1',
    label: 'Indiranagar, Bengaluru',
    secondary: 'Bengaluru, Karnataka',
    coords: { lat: 12.9784, lng: 77.641 },
  },
  {
    id: 'mock-2',
    label: 'MG Road, Bengaluru',
    secondary: 'Bengaluru, Karnataka',
    coords: { lat: 12.9752, lng: 77.6069 },
  },
  {
    id: 'mock-3',
    label: 'Whitefield, Bengaluru',
    secondary: 'Bengaluru, Karnataka',
    coords: { lat: 12.9698, lng: 77.7499 },
  },
];

export const MOCK_GEO_RESULT: GeoResult = {
  id: 'mock-geo-1',
  label: 'Indiranagar, Bengaluru',
  coords: { lat: 12.9784, lng: 77.641 },
  placeType: 'locality',
};

export const MOCK_ROUTE_RESPONSE: RouteResponse = {
  routes: [
    {
      id: 'mock-route-car',
      modes: ['car'],
      totalDuration: 2700,
      totalDistance: 12500,
      estimatedCost: 0,
      numTransfers: 0,
      walkDistance: 0,
      carbonGrams: 2875,
      steps: [
        {
          instruction: 'Head south on 100 Feet Rd',
          mode: 'car',
          distance: 500,
          duration: 120,
          polyline: '',
        },
        {
          instruction: 'Turn right onto Outer Ring Rd',
          mode: 'car',
          distance: 12000,
          duration: 2580,
          polyline: '',
        },
      ],
      geometry: 'mock_polyline_car',
    },
    {
      id: 'mock-route-transit',
      modes: ['transit'],
      totalDuration: 3600,
      totalDistance: 14000,
      estimatedCost: 4500,
      numTransfers: 1,
      walkDistance: 800,
      carbonGrams: 700,
      steps: [
        {
          instruction: 'Walk to Indiranagar Metro',
          mode: 'walk',
          distance: 400,
          duration: 300,
          polyline: '',
        },
        {
          instruction: 'Take Purple Line towards Whitefield',
          mode: 'transit',
          distance: 13200,
          duration: 2700,
          polyline: '',
          transitInfo: {
            agency: 'BMRCL',
            line: 'Purple Line',
            headsign: 'Whitefield',
            numStops: 8,
            departAt: new Date(Date.now() + 120_000).toISOString(),
            arriveAt: new Date(Date.now() + 2_820_000).toISOString(),
          },
        },
        {
          instruction: 'Walk to destination',
          mode: 'walk',
          distance: 400,
          duration: 300,
          polyline: '',
        },
      ],
      geometry: 'mock_polyline_transit',
    },
    {
      id: 'mock-route-two_wheeler',
      modes: ['two_wheeler'],
      totalDuration: 2100,
      totalDistance: 12000,
      estimatedCost: 0,
      numTransfers: 0,
      walkDistance: 0,
      carbonGrams: 960,
      steps: [
        {
          instruction: 'Head south on 100 Feet Rd',
          mode: 'two_wheeler',
          distance: 12000,
          duration: 2100,
          polyline: '',
        },
      ],
      geometry: 'mock_polyline_two_wheeler',
    },
  ],
  generatedAt: new Date().toISOString(),
  cacheKey: 'mock-cache-key',
};

export class MockMapsProvider implements MapsProvider {
  async autocomplete(_query: string, _signal?: AbortSignal): Promise<GeoSuggestion[]> {
    return MOCK_SUGGESTIONS;
  }

  async geocode(_query: string): Promise<GeoResult[]> {
    return [MOCK_GEO_RESULT];
  }

  async reverseGeocode(_coords: LatLng): Promise<GeoResult> {
    return MOCK_GEO_RESULT;
  }

  async route(_req: RouteRequest): Promise<RouteResponse> {
    return MOCK_ROUTE_RESPONSE;
  }

  async trafficFor(routeId: string): Promise<TrafficSnapshot> {
    return {
      routeId,
      takenAt: new Date().toISOString(),
      segments: [
        { startIdx: 0, endIdx: 5, level: 'moderate', delaySeconds: 180 },
        { startIdx: 5, endIdx: 10, level: 'free', delaySeconds: 0 },
      ],
      totalDelay: 180,
    };
  }

  tilesUrl(_layer: TileLayer): string {
    return `https://tiles.example.com/${_layer}/{z}/{x}/{y}.png`;
  }
}

export const mockMapsProvider = new MockMapsProvider();

// Expose for use in msw fixtures
export { BENGALURU };
