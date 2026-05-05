# CommuteWise — API Design

There are two API surfaces:

1. **External APIs** consumed (MapmyIndia, OpenWeatherMap) — wrapped behind providers.
2. **Internal Route Handlers** (`app/api/*`) — Next.js endpoints that proxy external APIs to keep keys server-side and add caching.

---

## 1. Internal Route Handlers

All endpoints:

- Accept JSON or query string.
- Return `application/json`.
- Validate inputs with Zod; respond `400` with `{ code: 'VALIDATION_ERROR', issues }` on failure.
- Apply rate limiting (60 req / IP / minute).
- Set `Cache-Control: public, s-maxage=...` for CDN caching.

### 1.1 `GET /api/maps/autocomplete`

Search-as-you-type address suggestions.

**Query**:
| name | type | required | example |
|---|---|---|---|
| `q` | string ≥ 2 chars | yes | `Indirana` |
| `lat` | number | no | `12.9716` |
| `lng` | number | no | `77.5946` |

**Response 200**:

```json
{
  "suggestions": [
    { "id": "mmi_abc", "label": "Indiranagar, Bengaluru", "lat": 12.97, "lng": 77.64 }
  ]
}
```

### 1.2 `GET /api/maps/geocode` and `GET /api/maps/reverse-geocode`

Standard forward / reverse geocoding.

### 1.3 `POST /api/maps/route`

**Body**:

```json
{
  "from": { "lat": 12.97, "lng": 77.64 },
  "to": { "lat": 12.93, "lng": 77.62 },
  "modes": ["car", "two_wheeler", "transit", "walk"],
  "departAt": "2026-05-04T09:00:00+05:30"
}
```

**Response 200**: `RouteResponse` (see `data-models.ts`).

### 1.4 `GET /api/maps/traffic?routeId=...`

Returns `TrafficSnapshot` with per-segment delay buckets.

### 1.5 `GET /api/weather/current?lat=&lng=`

### 1.6 `GET /api/weather/hourly?lat=&lng=&hours=12`

### 1.7 `GET /api/weather/aqi?lat=&lng=`

### 1.8 Error envelope (all endpoints)

```json
{
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "Upstream service unavailable",
    "retryable": true
  }
}
```

| HTTP | Code               | Meaning            |
| ---- | ------------------ | ------------------ |
| 400  | `VALIDATION_ERROR` | Bad input          |
| 429  | `RATE_LIMITED`     | Too many requests  |
| 502  | `PROVIDER_ERROR`   | Upstream failure   |
| 504  | `PROVIDER_TIMEOUT` | Upstream timed out |

---

## 2. Internal Service Interfaces

These are the TypeScript contracts the UI depends on. Implementations may call the Route Handlers above or talk directly to providers in tests.

```ts
// services/maps/types.ts
export interface MapsProvider {
  geocode(query: string): Promise<GeoResult[]>;
  reverseGeocode(coords: LatLng): Promise<GeoResult>;
  autocomplete(query: string, signal?: AbortSignal): Promise<GeoSuggestion[]>;
  route(req: RouteRequest): Promise<RouteResponse>;
  trafficFor(routeId: string): Promise<TrafficSnapshot>;
  tilesUrl(layer: TileLayer): string;
}

// services/weather/types.ts
export interface WeatherProvider {
  current(coords: LatLng): Promise<CurrentWeather>;
  hourly(coords: LatLng, hours: number): Promise<HourlyForecast[]>;
  airQuality(coords: LatLng): Promise<AQIReading>;
}

// services/routing.ts (orchestrator)
export interface RoutingService {
  plan(req: PlanRequest): Promise<PlannedTrip>;
  enrichWithWeather(trip: PlannedTrip): Promise<PlannedTrip>;
  rescore(trip: PlannedTrip, sortBy: SortMode): PlannedTrip;
}

// services/geolocation.ts
export interface GeolocationService {
  getCurrent(): Promise<LatLng>;
  watch(cb: (pos: LatLng) => void): () => void;
}
```

---

## 3. External API Notes

### MapmyIndia

- Auth: OAuth client_credentials → bearer token; refreshed server-side.
- Endpoints used: `/places/api/autosuggest`, `/places/api/geocode`, `/places/api/reverse_geocode`, `/advancedmaps/v1/route_adv`, `/traffic/api/v2`.
- `place_detail` is gated on the free tier (consistent 404); we use `geocode` by label as the resolver after autosuggest.
- Quota: monitored by server; if 80% consumed in a day, we serve cached responses preferentially.

### OpenWeatherMap (One Call 3.0)

- Single endpoint: `/data/3.0/onecall?lat=&lon=&exclude=minutely,daily,alerts&appid=...`.
- AQI: `/data/2.5/air_pollution?lat=&lon=&appid=...`.
- Free tier sufficient for MVP-1; we rate-budget at 1 req / 10 min / coord-bucket (0.01° rounding).

---

## 4. Versioning

Internal Route Handlers are versioned via URL path when breaking changes ship: `/api/v2/maps/route`. MVP-1 stays on unversioned (effectively v1) routes.
