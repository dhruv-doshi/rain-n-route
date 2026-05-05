import type {
  GeoResult,
  GeoSuggestion,
  LatLng,
  RouteRequest,
  RouteResponse,
  TileLayer,
  TrafficSnapshot,
} from '@/types';

export interface MapsProvider {
  geocode(query: string): Promise<GeoResult[]>;
  reverseGeocode(coords: LatLng): Promise<GeoResult>;
  autocomplete(query: string, signal?: AbortSignal): Promise<GeoSuggestion[]>;
  route(req: RouteRequest): Promise<RouteResponse>;
  trafficFor(routeId: string): Promise<TrafficSnapshot>;
  tilesUrl(layer: TileLayer): string;
}
