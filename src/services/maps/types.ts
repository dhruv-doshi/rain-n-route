import type { GeoResult, GeoSuggestion, LatLng, RouteRequest, RouteResponse } from '@/types';

export interface AutocompleteOptions {
  sessionToken: string;
  bias?: LatLng;
}

export interface ResolvePlaceOptions {
  sessionToken: string;
  fallbackLabel: string;
}

export interface MapsProvider {
  autocomplete(query: string, options: AutocompleteOptions): Promise<GeoSuggestion[]>;
  resolvePlace(placeId: string, options: ResolvePlaceOptions): Promise<GeoResult>;
  geocode(query: string): Promise<GeoResult[]>;
  reverseGeocode(coords: LatLng): Promise<GeoResult>;
  route(req: RouteRequest): Promise<RouteResponse>;
}
