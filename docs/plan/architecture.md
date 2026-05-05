# CommuteWise — Architecture

## 1. Goals

- **Local-first**: persistent state lives on-device (IndexedDB).
- **Provider-agnostic**: maps and weather are abstracted so we can swap vendors.
- **Offline-tolerant**: graceful degradation, not hard failure.
- **Edge-light**: only thin Next.js Route Handlers exist server-side, solely to keep API keys secret and to apply server-side caching.

## 2. High-Level Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                           BROWSER (PWA)                            │
│                                                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │  app/ (UI)   │──▶│  hooks/      │──▶│  store/ (Zustand)    │   │
│  │  - pages     │   │  - useTrip   │   │  - locations         │   │
│  │  - components│   │  - useWeather│   │  - preferences       │   │
│  └──────┬───────┘   └──────┬───────┘   │  - history           │   │
│         │                  │           │  - trip (ephemeral)  │   │
│         ▼                  ▼           └─────────┬────────────┘   │
│  ┌──────────────────────────────┐                │                │
│  │  services/ (provider facade) │                ▼                │
│  │  - maps                      │      ┌──────────────────┐       │
│  │  - weather                   │      │  IndexedDB       │       │
│  │  - geolocation               │      │  (idb-keyval)    │       │
│  │  - routing (orchestrator)    │      └──────────────────┘       │
│  └──────────────┬───────────────┘                                 │
│                 │ (fetch via /api proxy)                          │
│                 ▼                                                 │
│  ┌──────────────────────────────┐                                 │
│  │  Service Worker (Workbox)    │  caches tiles, weather, routes  │
│  └──────────────┬───────────────┘                                 │
└─────────────────┼─────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS ROUTE HANDLERS                      │
│  /api/maps/* /api/weather/*  (key injection + LRU cache)         │
└─────────┬──────────────────────────────────┬─────────────────────┘
          ▼                                  ▼
   ┌─────────────┐                    ┌─────────────────┐
   │ MapmyIndia  │                    │ OpenWeatherMap  │
   └─────────────┘                    └─────────────────┘
```

## 3. Layering Rules

1. **`app/` (UI)** imports from `components/`, `hooks/`, `store/`. **Never** imports `services/` directly.
2. **`hooks/`** is the only layer permitted to call `services/`. Hooks own loading/error state and return well-shaped view models.
3. **`services/`** depends on `lib/` (pure helpers) and **never** on `store/` or `hooks/` (no React).
4. **`store/`** depends on `types/`. No I/O calls. Persistence is delegated to a storage adapter.
5. **`lib/`** is pure TypeScript: no React, no fetch, no globals. Easiest to test.
6. **`types/`** holds shared interfaces only.

A dependency from a lower layer to a higher one is a lint error (enforced by `eslint-plugin-boundaries`).

## 4. State Management

- **Zustand** with `persist` middleware over a custom `idb-keyval` adapter.
- Each store:
  - Has a `schemaVersion` and a `migrate(state, fromVersion)` function.
  - Exports memoized selectors for derived data (no `useStore(s => s.x.filter(...))` in the JSX).
- **Ephemeral state** (current trip session) is _not_ persisted — it lives in memory and `sessionStorage` only.

## 5. Provider Abstraction

```ts
interface MapsProvider {
  geocode(query: string): Promise<GeoResult[]>;
  reverseGeocode(coords: LatLng): Promise<GeoResult>;
  autocomplete(query: string, signal?: AbortSignal): Promise<GeoSuggestion[]>;
  route(req: RouteRequest): Promise<RouteResponse>;
  trafficFor(routeId: string): Promise<TrafficSnapshot>;
  tilesUrl(layer: TileLayer): string;
}

interface WeatherProvider {
  current(coords: LatLng): Promise<CurrentWeather>;
  hourly(coords: LatLng, hours: number): Promise<HourlyForecast[]>;
  airQuality(coords: LatLng): Promise<AQIReading>;
}
```

Providers are wired in `services/index.ts`. Tests inject `MockMapsProvider` / `MockWeatherProvider`.

## 6. Caching Strategy

| Resource                 | Layer           | Strategy             | TTL    | Cap |
| ------------------------ | --------------- | -------------------- | ------ | --- |
| Map tiles                | SW              | CacheFirst           | 1 day  | 200 |
| Geocode results          | Server LRU + SW | StaleWhileRevalidate | 24 h   | 500 |
| Routes                   | Server LRU + SW | NetworkFirst         | 5 min  | 100 |
| Weather (current/hourly) | Server LRU + SW | StaleWhileRevalidate | 10 min | 50  |
| AQI                      | Server LRU      | SWR                  | 1 h    | 50  |

## 7. Error Handling

- **Service errors**: every service throws `ServiceError` with `{ code, message, cause }`. Hooks translate into user-friendly toasts.
- **UI errors**: top-level `<ErrorBoundary>` per route group. Logs to console (Sentry stub in prod).
- **Network errors**: distinguished by `code === 'NETWORK_OFFLINE'` and trigger offline banners + cached fallback.

## 8. Offline Strategy

- App shell precached at install.
- IndexedDB accessible offline.
- On planning request, if offline:
  1. Try cached route response (by `from-to-mode` key) within 1 hour.
  2. Else show "Offline — connect to plan new trips" with the last-known commute available read-only.

## 9. Security

- API keys live only in server env (`MAPS_SECRET`, `OWM_KEY`).
- Client-side `NEXT_PUBLIC_MAPS_KEY` is the _publishable_ MapmyIndia key with origin restriction.
- All `/api/*` handlers validate query params with Zod and rate-limit per IP via in-memory token bucket.
- No PII leaves the device.

## 10. Performance Budget

- First-load JS on `/`: ≤ 180 KB gzip.
- LCP on 4G mid-range Android: ≤ 2.5 s.
- TTI on `/trip/plan`: ≤ 3.0 s.
- Map page initial render: ≤ 1.5 s after route data is in memory.
