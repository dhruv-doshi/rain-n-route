/**
 * Internal Google Maps API response types.
 * Used for type-safe adaptation within the maps service layer.
 * These types are NEVER exported to UI components — they exist solely
 * to type the raw JSON responses from Google APIs before adaptation
 * to domain types (GeoSuggestion, GeoResult, RouteOption, etc.).
 */

export interface GooglePlacePrediction {
  placeId: string;
  text: { text: string };
  structuredFormat: {
    mainText: { text: string };
    secondaryText: { text: string };
  };
  types: string[];
}

export interface GoogleAutocompleteResponse {
  suggestions: Array<{
    placePrediction?: GooglePlacePrediction;
  }>;
}

export interface GooglePlaceDetails {
  id: string;
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  types: string[];
}

export interface GoogleRouteResponse {
  routes: Array<{
    distanceMeters?: number;
    duration?: string; // e.g. "1234.5s"
    staticDuration?: string;
    polyline?: { encodedPolyline?: string };
    viewport?: object;
    legs: Array<{
      steps: GoogleRouteStep[];
    }>;
  }>;
}

export interface GoogleRouteStep {
  distanceMeters?: number;
  staticDuration?: string;
  polyline?: { encodedPolyline?: string };
  navigationInstruction?: { instructions?: string };
  travelMode?: string;
  transitDetails?: GoogleTransitDetails;
}

export interface GoogleTransitDetails {
  stopDetails: {
    arrivalStop: { name: string };
    departureStop: { name: string };
    arrivalTime: string;
    departureTime: string;
  };
  headsign: string;
  transitLine: {
    name: string;
    agencies: Array<{ name: string }>;
  };
  stopCount: number;
}
