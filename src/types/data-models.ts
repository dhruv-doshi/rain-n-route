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
// Saved Locations & Preferences
// ────────────────────────────────────────────────────────────────────

export type SavedLocationKind = 'home' | 'office' | 'favorite' | 'recent';

export interface SavedLocation {
  id: string;
  kind: SavedLocationKind;
  label: string;
  coords: LatLng;
  address: string;
  createdAt: ISODateTime;
  lastUsedAt: ISODateTime;
}

export type TransportMode =
  | 'car'
  | 'two_wheeler'
  | 'transit'
  | 'cab'
  | 'auto'
  | 'walk'
  | 'cycle'
  | 'mixed';

export type WeatherSensitivity = 'low' | 'medium' | 'high';

export interface UserPreferences {
  transportPriority: TransportMode[]; // ordered preference
  maxWalkMeters: Meters;
  weatherSensitivity: WeatherSensitivity;
  preferredSort: SortMode;
  defaultBufferMinutes: number;
  unitSystem: 'metric'; // future: 'imperial'
  theme: 'system' | 'light' | 'dark';
}

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
// Recurring Commutes & History
// ────────────────────────────────────────────────────────────────────

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface RecurringCommute {
  id: string;
  name: string;
  fromLocationId: string;
  toLocationId: string;
  daysOfWeek: DayOfWeek[];
  departTime: string; // "HH:mm"
  preferredMode: TransportMode;
  bufferMinutes: number;
  active: boolean;
  createdAt: ISODateTime;
}

export interface CommuteLogEntry {
  id: string;
  recurringCommuteId?: string;
  date: ISODateTime;
  from: SavedLocation | { coords: LatLng; address: string };
  to: SavedLocation | { coords: LatLng; address: string };
  mode: TransportMode;
  estimatedDuration: Seconds;
  actualDuration?: Seconds;
  estimatedCost: Paise;
  actualCost?: Paise;
  weatherSummary?: string;
  notes?: string;
}

// ────────────────────────────────────────────────────────────────────
// Insights (derived; not persisted)
// ────────────────────────────────────────────────────────────────────

export interface WeeklyInsight {
  weekStart: ISODateTime;
  totalCommutes: number;
  totalMinutes: number;
  totalSpendPaise: Paise;
  totalCarbonGrams: number;
  byMode: Record<TransportMode, { commutes: number; minutes: number }>;
}

// ────────────────────────────────────────────────────────────────────
// Persistence Envelope
// ────────────────────────────────────────────────────────────────────

export interface PersistedState<T> {
  schemaVersion: number;
  state: T;
  savedAt: ISODateTime;
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

// ────────────────────────────────────────────────────────────────────
// Tile layers
// ────────────────────────────────────────────────────────────────────

export type TileLayer = 'base' | 'traffic' | 'transit';
