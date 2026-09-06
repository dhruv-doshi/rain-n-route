/**
 * Rain-N-Route — Canonical Data Models (MVP-1)
 *
 * This file is the single source of truth for the shapes that flow
 * between the UI, stores, and service adapters. Keep it free of any
 * runtime imports — types only — so it can be referenced by every layer.
 *
 * Conventions:
 * - All timestamps are ISO 8601 strings in the user's local timezone unless
 *   the field name ends with `Utc`.
 * - All durations are in seconds. All distances are in meters. All money
 *   amounts are in INR paise (integer) to avoid floating-point drift.
 * - Enums are string-literal unions for forward compatibility with JSON
 *   persistence and easy log reading.
 */

// ────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export type ISODateTime = string; // e.g. "2026-05-04T09:00:00+05:30"

export type Paise = number; // INR * 100, integer

export type Meters = number;
export type Seconds = number;

// ────────────────────────────────────────────────────────────────────
// Geocoding
// ────────────────────────────────────────────────────────────────────

export interface GeoSuggestion {
  id: string;
  label: string;
  secondary?: string; // e.g. "Bengaluru, Karnataka"
  coords?: LatLng; // optional — some providers require a follow-up detail call
}

export interface GeoResult {
  id: string;
  label: string;
  coords: LatLng;
  placeType?: 'address' | 'poi' | 'locality' | 'station';
}

// ────────────────────────────────────────────────────────────────────
// Transport
// ────────────────────────────────────────────────────────────────────

export type TransportMode =
  | 'car'
  | 'two_wheeler'
  | 'transit'
  | 'cab'
  | 'auto'
  | 'walk'
  | 'cycle'
  | 'mixed';

// ────────────────────────────────────────────────────────────────────
// Routing
// ────────────────────────────────────────────────────────────────────

export type SortMode = 'fastest' | 'cheapest' | 'least_transfers' | 'eco';

export interface RouteRequest {
  from: LatLng;
  to: LatLng;
  modes: TransportMode[];
  departAt?: ISODateTime;
}

export interface PlanRequest extends RouteRequest {
  sortBy: SortMode;
}

export interface RouteStep {
  instruction: string;
  mode: TransportMode;
  distance: Meters;
  duration: Seconds;
  polyline: string; // encoded
  fromLabel?: string;
  toLabel?: string;
  transitInfo?: TransitLeg;
}

export interface TransitLeg {
  agency: string;
  line: string; // e.g. "Purple Line"
  headsign: string;
  numStops: number;
  departAt: ISODateTime;
  arriveAt: ISODateTime;
}

export interface RouteOption {
  id: string;
  modes: TransportMode[]; // multi-modal possible
  totalDuration: Seconds;
  totalDistance: Meters;
  estimatedCost: Paise;
  numTransfers: number;
  walkDistance: Meters;
  carbonGrams: number;
  steps: RouteStep[];
  geometry: string; // encoded polyline
  weatherRisk?: WeatherRiskSummary; // attached in Phase 7
  scoreBreakdown?: Record<SortMode, number>;
}

export interface RouteResponse {
  routes: RouteOption[];
  generatedAt: ISODateTime;
  cacheKey: string;
}

export interface PlannedTrip {
  request: PlanRequest;
  routes: RouteOption[];
  selectedRouteId?: string;
  generatedAt: ISODateTime;
}

// ────────────────────────────────────────────────────────────────────
// Real-time / Traffic
// ────────────────────────────────────────────────────────────────────

export type TrafficLevel = 'free' | 'light' | 'moderate' | 'heavy' | 'jam';

export interface TrafficSegment {
  startIdx: number; // index into route geometry
  endIdx: number;
  level: TrafficLevel;
  delaySeconds: Seconds;
}

export interface TrafficSnapshot {
  routeId: string;
  takenAt: ISODateTime;
  segments: TrafficSegment[];
  totalDelay: Seconds;
}

// ────────────────────────────────────────────────────────────────────
// Weather
// ────────────────────────────────────────────────────────────────────

export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'haze'
  | 'fog';

export interface CurrentWeather {
  coords: LatLng;
  observedAt: ISODateTime;
  tempC: number;
  feelsLikeC: number;
  humidity: number; // 0–100
  windKph: number;
  precipitationMm: number;
  condition: WeatherCondition;
  description: string;
  iconCode: string;
}

export interface HourlyForecast {
  forecastFor: ISODateTime;
  tempC: number;
  feelsLikeC: number;
  precipitationMm: number;
  precipitationProbability: number; // 0–1
  windKph: number;
  condition: WeatherCondition;
  iconCode: string;
}

export interface AQIReading {
  observedAt: ISODateTime;
  aqi: 1 | 2 | 3 | 4 | 5; // OWM scale: 1 good → 5 very poor
  pm2_5: number;
  pm10: number;
  no2: number;
  o3: number;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface RiskFactor {
  kind: 'rain' | 'flood' | 'heat' | 'aqi' | 'wind';
  level: RiskLevel;
  reason: string;
}

export interface WeatherRiskSummary {
  overall: RiskLevel;
  factors: RiskFactor[];
  gear: GearItem[];
  bufferMinutesRecommended: number;
}

export interface GearItem {
  id: 'umbrella' | 'raincoat' | 'mask' | 'water' | 'sunscreen' | 'jacket';
  label: string;
  reason: string;
}

// ────────────────────────────────────────────────────────────────────
// Bengaluru hazard / explore layers
// ────────────────────────────────────────────────────────────────────

export type HazardCategory =
  | 'flood_prone'
  | 'flood_vulnerable'
  | 'low_lying'
  | 'valley'
  | 'drain'
  | 'lake'
  | 'hotspot'
  | 'story';

export interface HazardPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: HazardCategory;
  source: string;
  valley?: string | null;
  reason?: string;
  peakHours?: string;
}

export interface HazardPolygon {
  id: string;
  name: string;
  category: HazardCategory;
  source: string;
  /** GeoJSON-style: [lng, lat][] outer ring */
  polygon: number[][][];
  valley?: string | null;
}

export interface HazardLine {
  id: string;
  name: string;
  category: HazardCategory;
  source: string;
  valley?: string | null;
  /** Array of line strings, each [lng, lat][] */
  lines: number[][][];
}

export interface PlaceStory {
  id: string;
  name: string;
  lat: number;
  lng: number;
  durationSec: number;
  text: string;
  links: { label: string; url: string }[];
  source: string;
}

export interface TrafficHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  valley: string;
  reason: string;
  peakHours: string;
  source: string;
}

export type TransitMode = 'metro' | 'bus';

export interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  mode: TransitMode;
  /** Namma Metro line name(s), when mode is metro */
  line?: string;
  source: string;
}

export interface FloodExposureHit {
  id: string;
  name: string;
  category: HazardCategory;
  distanceM: number;
  lat: number;
  lng: number;
  valley?: string | null;
  reason?: string;
}

export interface FloodExposureResult {
  hits: FloodExposureHit[];
  dominantValley: string | null;
  spatialLevel: RiskLevel;
}

export interface BengaluruDataPack {
  floodPoints: HazardPoint[];
  lowLying: HazardPoint[];
  valleys: HazardPolygon[];
  drains: HazardLine[];
  lakes: HazardPolygon[];
  hotspots: TrafficHotspot[];
  stories: PlaceStory[];
  transitStops: TransitStop[];
}

// ────────────────────────────────────────────────────────────────────
// Service Errors
// ────────────────────────────────────────────────────────────────────

export type ServiceErrorCode =
  | 'NETWORK_OFFLINE'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export interface ServiceErrorShape {
  code: ServiceErrorCode;
  message: string;
  retryable: boolean;
  cause?: unknown;
}
