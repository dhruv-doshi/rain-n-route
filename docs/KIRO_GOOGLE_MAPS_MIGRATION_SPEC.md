# Rain-N-Route: Dashboard Removal and Google Maps Migration Specification

Document status: Implementation-ready  
Target branch: `kiro_dev`  
Baseline commit: `482f1a1`  
Prepared: 2026-06-18  
Primary implementer: Kiro

## 1. Implementation Directive

Implement this specification end to end. Do not stop after introducing adapters, placeholders,
or partially migrated screens. Each stage must leave the repository runnable and must pass its
stage gate before the next stage begins.

The final application must:

1. Have no dashboard route, dashboard navigation, dashboard-only UI, or orphaned dashboard data
   model.
2. Have no MapmyIndia, Mappls, Nominatim, MapLibre, OpenStreetMap tile, or CARTO runtime
   integration.
3. Use Google Maps Platform for map rendering, place autocomplete, place resolution, forward and
   reverse geocoding, route computation, transit routing, two-wheeler routing, and traffic-aware
   driving durations.
4. Keep OpenWeatherMap as the weather and AQI provider.
5. Preserve mock mode so the app, tests, CI, and local development can run without paid API calls.
6. Preserve the primary user flow from location search through weather-enriched route display.
7. Pass lint, typecheck, unit tests, integration tests, production build, and Playwright E2E tests.

## 2. Scope

### 2.1 In Scope

- Remove the entire dashboard feature and all code that exists only to support it.
- Remove home-page features that become unusable when the dashboard is removed.
- Simplify the header and remove the one-item mobile bottom navigation.
- Replace MapmyIndia and Nominatim service implementations with Google Maps Platform web services.
- Replace MapLibre rendering with the Google Maps JavaScript API.
- Replace raster tile switching with Google `TrafficLayer` and `TransitLayer`.
- Adapt Google Places and Routes responses into the existing application domain models.
- Preserve route cards, sorting, step-by-step directions, weather enrichment, map selection,
  route sharing, local notifications, offline fallback, and PWA behavior where technically
  compatible.
- Update environment configuration, privacy copy, CI configuration, tests, mocks, fixtures, and
  current project documentation.
- Add live-provider smoke verification instructions, but never run live API tests automatically
  in CI.

### 2.2 Explicitly Out of Scope

- Importing Google Maps shared URLs.
- Reproducing the exact route selected inside a consumer Google Maps share link.
- GPX, KML, or GeoJSON import.
- Google Weather API or Google Air Quality API migration.
- Accounts, cloud synchronization, payments, booking, or a replacement dashboard.
- Traffic-colored route polylines. Use Google traffic-aware duration plus the Google
  `TrafficLayer`; do not request `TRAFFIC_ON_POLYLINE`.
- New route modes, multi-stop routing, or route optimization.
- A compatibility layer that keeps MapmyIndia available behind a flag.

If Google Maps link import is added later, it must be a separate specification and should be
described as "import locations and recalculate," not "import the exact Google route."

## 3. Non-Negotiable Engineering Rules

1. Before changing Next.js files, read the relevant Next.js 16 guides in
   `node_modules/next/dist/docs/`, as required by `AGENTS.md`.
2. Use current Google APIs:
   - Maps JavaScript API
   - Places API (New)
   - Routes API
   - Geocoding API
3. Do not use legacy Places Autocomplete or the legacy Directions API.
4. Do not expose the server key to the browser.
5. Do not call Places, Routes, or Geocoding web services directly from client components.
6. Use explicit Google response field masks. Do not use `*` in production code.
7. Use separate browser and server API keys.
8. Preserve provider-independent domain types at the UI boundary.
9. Preserve mock mode and deterministic fixtures.
10. Do not leave commented-out MapmyIndia or MapLibre code.
11. Do not retain unused dependencies, tests, types, stores, or documentation.
12. Do not weaken lint, typecheck, test, or security checks to make the migration pass.

## 4. Current-State Problems This Migration Must Resolve

### 4.1 Dashboard

The `/dashboard` route currently owns UI for:

- Saved locations
- Recurring commutes
- History
- Insights
- Preferences

The home page also depends on dashboard-managed data through:

- `QuickLocationChips`
- `TodaysCommuteCard`
- persisted location and recurring-commute stores

Removing only `/dashboard` would leave features that existing users can see but new users cannot
configure. That partial state is forbidden.

### 4.2 Mapping

The current mapping stack is split:

- MapmyIndia for autocomplete and routing
- Nominatim for geocoding
- MapLibre with OSM/CARTO raster tiles for rendering
- an unavailable MapmyIndia traffic endpoint

This split causes inconsistent place identity, unsupported traffic behavior, mixed attribution,
and provider-specific dead paths. The target state is one Google mapping stack with one place ID
model and one route provider.

## 5. Target Architecture

```text
Browser
  |
  |-- GET /api/maps/autocomplete
  |-- GET /api/maps/place
  |-- GET /api/maps/geocode
  |-- GET /api/maps/reverse-geocode
  |-- POST /api/maps/route
  |
Next.js Route Handlers
  |
  |-- GoogleMapsProvider
  |     |-- Places API (New)
  |     |-- Geocoding API
  |     `-- Routes API
  |
  `-- OpenWeatherMapProvider

Browser map rendering
  |
  `-- Maps JavaScript API
        |-- google.maps.Map
        |-- google.maps.Polyline
        |-- google.maps.marker.AdvancedMarkerElement
        |-- google.maps.TrafficLayer
        `-- google.maps.TransitLayer
```

The browser key is used only by the Maps JavaScript API loader. All billable web-service calls
remain behind Next.js route handlers and use the server key.

## 6. Required Environment Contract

Replace the current map environment variables with:

```dotenv
NEXT_PUBLIC_USE_MOCK_SERVICES=true

# Browser-visible. Restrict by HTTP referrer and to Maps JavaScript API only.
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=

# Browser-visible map style identifier used by Advanced Markers.
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=

# Server-only. Restrict to Routes API, Places API (New), and Geocoding API.
GOOGLE_MAPS_SERVER_KEY=

# Existing server-only weather key.
OWM_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Delete all references to:

```text
NEXT_PUBLIC_MAPS_KEY
MAPS_SECRET
MAPS_CLIENT_ID
```

### 6.1 Configuration Validation

Add a small typed environment module or equivalent validation:

- Mock mode must not require Google keys.
- Live mode must fail with a clear startup or request-time configuration error when a required
  key is missing.
- The browser map must render an explicit configuration error rather than a blank panel when the
  browser key or map ID is missing.
- Never log key values.

## 7. Dashboard Feature Removal

### 7.1 Delete Routes and Components

Delete:

```text
src/app/dashboard/
src/components/dashboard/
tests/unit/dashboard/
```

### 7.2 Delete Orphaned Planner Features

Delete:

```text
src/components/planner/QuickLocationChips.tsx
src/components/planner/TodaysCommuteCard.tsx
tests/unit/planner/QuickLocationChips.test.tsx
tests/unit/planner/TodaysCommuteCard.test.tsx
```

Update:

- `src/components/planner/FromToForm.tsx`: remove quick-fill UI and imports.
- `src/app/page.tsx`: remove today's commute card.
- Home page remains focused on the From/To planner only.

### 7.3 Delete Dashboard-Only State and Domain Code

Delete:

```text
src/store/locationsStore.ts
src/store/preferencesStore.ts
src/store/historyStore.ts
src/store/recurringStore.ts
src/store/persistAdapter.ts
src/store/migrations.ts
src/lib/insights.ts

tests/unit/store/locationsStore.test.ts
tests/unit/store/preferencesStore.test.ts
tests/unit/store/historyStore.test.ts
tests/unit/store/recurringStore.test.ts
tests/unit/store/persistAdapter.test.ts
tests/unit/store/migrations.test.ts
tests/unit/lib/insights.test.ts
```

Retain:

```text
src/store/tripStore.ts
tests/unit/store/tripStore.test.ts
```

`tripStore` remains because it owns the current trip selection and session state.

### 7.4 Simplify Preferences Behavior

- Remove `usePreferencesStore` from `usePlanTrip` and `TripPlanClient`.
- Initialize sort mode to `fastest`.
- Keep `RouteSortTabs`; users can still change sorting during the current trip.
- Do not add a new settings screen or replacement persistence mechanism.

### 7.5 Remove Dashboard-Only Types

Remove types if no remaining references exist:

- `SavedLocationKind`
- `SavedLocation`
- `UserPreferences`
- `DayOfWeek`
- `RecurringCommute`
- `CommuteLogEntry`
- `WeeklyInsight`
- `PersistedState`

Do not remove route, trip, weather, traffic, or service-error types still used by the planner.

### 7.6 Navigation and Metadata

- Remove the Dashboard link from `Header`.
- Remove `BottomNav` from the layout and delete the component and its tests if it has no remaining
  purpose.
- Remove `/dashboard` from `sitemap.ts`.
- `/dashboard` must return the standard Next.js 404.
- Update shell tests to assert that no dashboard link exists.

### 7.7 Dependency Cleanup

Remove dependencies that become unused:

- `recharts`
- `idb-keyval`
- `fake-indexeddb`, if no remaining test uses it

Retain `zustand` for `tripStore`.

### 7.8 Dashboard Removal Acceptance Criteria

- `rg -n "dashboard|Dashboard" src tests` returns no product code reference.
- `/dashboard` returns 404.
- Home page has no empty quick-fill or commute sections.
- Route planning still starts from the home page.
- No IndexedDB adapter initializes at runtime.
- No dashboard-only dependency remains in `package.json` or lockfile.

## 8. Google Places Integration

### 8.1 Provider Interface

Replace the map provider contract with:

```ts
interface AutocompleteOptions {
  sessionToken: string;
  bias?: LatLng;
}

interface ResolvePlaceOptions {
  sessionToken: string;
  fallbackLabel: string;
}

interface MapsProvider {
  autocomplete(query: string, options: AutocompleteOptions): Promise<GeoSuggestion[]>;
  resolvePlace(placeId: string, options: ResolvePlaceOptions): Promise<GeoResult>;
  geocode(query: string): Promise<GeoResult[]>;
  reverseGeocode(coords: LatLng): Promise<GeoResult>;
  route(req: RouteRequest): Promise<RouteResponse>;
}
```

Remove:

```ts
trafficFor(routeId: string)
tilesUrl(layer: TileLayer)
```

The map renderer owns visual traffic and transit layers. Fresh route requests own ETA polling.

### 8.2 Autocomplete API

Use:

```text
POST https://places.googleapis.com/v1/places:autocomplete
```

Headers:

```text
Content-Type: application/json
X-Goog-Api-Key: GOOGLE_MAPS_SERVER_KEY
X-Goog-FieldMask:
  suggestions.placePrediction.placeId,
  suggestions.placePrediction.text.text,
  suggestions.placePrediction.structuredFormat.mainText.text,
  suggestions.placePrediction.structuredFormat.secondaryText.text,
  suggestions.placePrediction.types
```

The actual header value must contain no whitespace or line breaks.

Request rules:

- `input`: trimmed user query.
- `sessionToken`: token received from the client.
- `includedRegionCodes`: `["in"]`.
- If bias coordinates are supplied, add a reasonable `locationBias.circle`, capped to a valid
  Google radius.
- Do not enable query predictions.
- Do not use `*` field masks.
- Do not cache autocomplete responses across sessions.

Adapter rules:

- `GeoSuggestion.id` is the Google Place ID.
- `label` comes from `structuredFormat.mainText.text`, falling back to prediction text.
- `secondary` comes from `structuredFormat.secondaryText.text`.
- `coords` remains undefined until Place Details resolves the selection.
- Ignore query predictions and malformed predictions.

### 8.3 Autocomplete Session Lifecycle

The client must generate a UUID session token:

- when an empty input receives focus;
- after a place is selected;
- after the input is cleared;
- after a completed or abandoned search session.

The same token must be sent to:

- every autocomplete request in that session;
- the Place Details request that resolves the selected prediction.

Implementation requirements:

- Minimum input length: 3 characters.
- Debounce: 300 ms.
- Abort the prior request when input changes.
- Keep separate session tokens for From and To inputs.
- Do not put session tokens into persistent storage.

### 8.4 Place Resolution API

Add:

```text
GET /api/maps/place?placeId=...&sessionToken=...&label=...
```

The route handler validates all values with Zod and calls:

```text
GET https://places.googleapis.com/v1/places/{PLACE_ID}
```

Headers:

```text
X-Goog-Api-Key: GOOGLE_MAPS_SERVER_KEY
X-Goog-FieldMask: id,formattedAddress,location,types
```

Query:

```text
sessionToken={SESSION_TOKEN}
languageCode=en
regionCode=IN
```

Do not request `displayName`; the prediction already supplies the display label and requesting
`displayName` moves Place Details to a more expensive SKU.

Adapter result:

```ts
{
  id: place.id,
  label: fallbackLabel || place.formattedAddress,
  coords: {
    lat: place.location.latitude,
    lng: place.location.longitude,
  },
  placeType: classifyGooglePlaceTypes(place.types),
}
```

### 8.5 Forward and Reverse Geocoding

Use the Geocoding API:

```text
GET https://maps.googleapis.com/maps/api/geocode/json
```

Forward geocode parameters:

```text
address={query}
region=in
key={GOOGLE_MAPS_SERVER_KEY}
```

Reverse geocode parameters:

```text
latlng={lat},{lng}
region=in
key={GOOGLE_MAPS_SERVER_KEY}
```

Use these endpoints for:

- browser geolocation reverse lookup;
- fallback text geocoding;
- compatibility with existing internal route handlers.

Map Google statuses deliberately:

- `OK`: adapt results.
- `ZERO_RESULTS`: empty result or `NOT_FOUND`, depending on endpoint.
- `OVER_QUERY_LIMIT` and `RESOURCE_EXHAUSTED`: `RATE_LIMITED`.
- `REQUEST_DENIED`: `PROVIDER_ERROR` with a non-secret configuration message.
- `INVALID_REQUEST`: `VALIDATION_ERROR`.
- network timeout: `PROVIDER_TIMEOUT`.

### 8.6 API Route Changes

Update:

```text
src/app/api/maps/autocomplete/route.ts
src/app/api/maps/geocode/route.ts
src/app/api/maps/reverse-geocode/route.ts
```

Add:

```text
src/app/api/maps/place/route.ts
```

Delete:

```text
src/app/api/maps/traffic/route.ts
```

Do not return raw Google responses to the browser.

## 9. Google Routes Integration

### 9.1 Endpoint

Use:

```text
POST https://routes.googleapis.com/directions/v2:computeRoutes
```

Headers:

```text
Content-Type: application/json
X-Goog-Api-Key: GOOGLE_MAPS_SERVER_KEY
X-Goog-FieldMask: {explicit field mask}
```

### 9.2 Mode Mapping

| Domain mode   | Google travel mode |
| ------------- | ------------------ |
| `car`         | `DRIVE`            |
| `cab`         | `DRIVE`            |
| `auto`        | `DRIVE`            |
| `mixed`       | `DRIVE`            |
| `two_wheeler` | `TWO_WHEELER`      |
| `transit`     | `TRANSIT`          |
| `walk`        | `WALK`             |
| `cycle`       | `BICYCLE`          |

The response route must retain the original domain mode, not the Google enum.

### 9.3 Request Policy

For every requested mode:

```json
{
  "origin": {
    "location": {
      "latLng": {
        "latitude": 0,
        "longitude": 0
      }
    }
  },
  "destination": {
    "location": {
      "latLng": {
        "latitude": 0,
        "longitude": 0
      }
    }
  },
  "travelMode": "DRIVE",
  "computeAlternativeRoutes": false,
  "polylineQuality": "OVERVIEW",
  "polylineEncoding": "ENCODED_POLYLINE",
  "languageCode": "en-IN",
  "regionCode": "in",
  "units": "METRIC"
}
```

Additional rules:

- For `DRIVE` and `TWO_WHEELER`, set `routingPreference: "TRAFFIC_AWARE"`.
- Do not use `TRAFFIC_AWARE_OPTIMAL`.
- Do not request `TRAFFIC_ON_POLYLINE`.
- For `TRANSIT`, include `departureTime` when supplied.
- For non-transit modes, reject past departure times before calling Google.
- Do not send `routingPreference` for `WALK`, `BICYCLE`, or `TRANSIT`.
- Run per-mode calls concurrently with `Promise.allSettled`.
- A failed mode must not discard successful modes.
- If every mode fails, throw the most actionable normalized service error.
- Use one upstream call per requested mode. Do not silently duplicate DRIVE calls for aliases not
  requested by the planner.

### 9.4 Route Field Mask

Use an explicit production field mask containing only data consumed by the app:

```text
routes.distanceMeters
routes.duration
routes.staticDuration
routes.polyline.encodedPolyline
routes.viewport
routes.legs.steps.distanceMeters
routes.legs.steps.staticDuration
routes.legs.steps.polyline.encodedPolyline
routes.legs.steps.navigationInstruction.instructions
routes.legs.steps.travelMode
routes.legs.steps.transitDetails.stopDetails.arrivalStop.name
routes.legs.steps.transitDetails.stopDetails.departureStop.name
routes.legs.steps.transitDetails.stopDetails.arrivalTime
routes.legs.steps.transitDetails.stopDetails.departureTime
routes.legs.steps.transitDetails.headsign
routes.legs.steps.transitDetails.transitLine.name
routes.legs.steps.transitDetails.transitLine.agencies.name
routes.legs.steps.transitDetails.stopCount
```

Join these with commas and no spaces.

If Google rejects a nested transit field because its schema has changed, inspect the current
official REST reference and update the narrowest valid field path. Do not replace the mask with
`*`.

### 9.5 Response Adaptation

Add explicit internal Google response types. Do not cast the response directly to domain types.

Duration conversion:

```ts
function parseGoogleDuration(value?: string): number {
  // "3.5s" -> 4; undefined or invalid -> 0
}
```

Route mapping:

- `totalDuration`: parsed `route.duration`.
- `totalDistance`: `route.distanceMeters ?? 0`.
- `geometry`: `route.polyline.encodedPolyline`.
- `estimatedCost`: keep current domain estimation behavior; do not invent Google fare values.
- `numTransfers`: for transit, count changes between transit vehicle steps; otherwise zero.
- `walkDistance`: sum WALK steps.
- `carbonGrams`: use existing `estimateCarbonGrams`.
- `steps`: flatten all leg steps.
- `id`: deterministic hash or stable string from request cache key, domain mode, and route index.
- `generatedAt`: server timestamp.
- `cacheKey`: include origin, destination, modes, and departure time bucket.

Step mapping:

- instruction: `navigationInstruction.instructions`, with a mode-aware fallback.
- mode: map `step.travelMode` to domain mode.
- distance: `distanceMeters ?? 0`.
- duration: parsed `staticDuration`.
- polyline: step encoded polyline or empty string.
- transit info: populate only when `transitDetails` exists.

Transit mapping:

- agency: first agency name or `"Transit agency"`.
- line: transit line name or `"Transit"`.
- headsign: provided headsign or line name.
- numStops: `stopCount ?? 0`.
- departAt and arriveAt: Google stop detail timestamps, with safe ISO fallbacks.

### 9.6 Route Cache and Polling

Preserve the existing five-minute server LRU for normal route searches.

Cache key must include:

- rounded origin and destination coordinates;
- ordered modes;
- departure time bucket when present.

`?fresh=1` must continue bypassing cache reads for ETA polling.

Traffic polling behavior:

- Continue to call `/api/maps/route?fresh=1`.
- Compare the freshly returned Google traffic-aware duration to the original duration.
- Keep existing visibility gating and 60-second interval.
- Remove all direct `trafficFor` and `/api/maps/traffic` behavior.

## 10. Google Maps JavaScript Rendering

### 10.1 Dependencies

Add:

```text
@googlemaps/js-api-loader
@types/google.maps
```

Remove:

```text
maplibre-gl
```

Use the current loader API:

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
```

Do not use the removed legacy `Loader` class.

### 10.2 Loader Module

Create a client-only singleton module, for example:

```text
src/lib/googleMapsLoader.ts
```

Responsibilities:

- call `setOptions` once;
- use `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`;
- use the current weekly or stable channel intentionally;
- expose typed helpers for `maps` and `marker` libraries;
- prevent duplicate script initialization;
- normalize loader errors.

### 10.3 Map Canvas

Rewrite `MapCanvas` around `google.maps.Map`.

Required behavior:

- instantiate once after mount;
- use `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`;
- preserve current center and zoom behavior;
- expose the map through `MapInstanceContext`;
- update center and zoom when props change;
- disable unnecessary default controls if custom controls cover them;
- retain keyboard and gesture usability;
- render a visible loading state;
- render a visible provider/configuration error state;
- clean all listeners on unmount.

The map container must continue to have an accessible label. Do not use `role="img"` if the
interactive Google map requires keyboard interaction; use an appropriate labeled region.

### 10.4 Map Context

Change:

```ts
Map | null;
```

from MapLibre to:

```ts
google.maps.Map | null;
```

No MapLibre type may remain in source or tests.

### 10.5 Route Overlay

Replace MapLibre sources and layers with one `google.maps.Polyline` per route.

Required behavior:

- decode the existing encoded polyline with `decodePolyline`;
- convert to `google.maps.LatLngLiteral[]`;
- preserve mode colors;
- selected route uses greater stroke weight, opacity, and z-index;
- unselected routes remain visible;
- polyline click selects the route;
- update styles when selection changes;
- remove polylines and listeners during cleanup;
- avoid recreating all polylines for selection-only changes when practical.

### 10.6 Weather Markers

Replace MapLibre markers with `google.maps.marker.AdvancedMarkerElement`.

Required behavior:

- load the `marker` library lazily;
- retain existing weather icon content;
- place markers at sampled route waypoints;
- remove markers and unmount React roots on route change and unmount;
- do not create markers when route geometry or weather risk is absent;
- use the configured map ID required by Advanced Markers.

### 10.7 Map Controls and Layers

Replace raster tile switching with Google layers:

- base: no traffic/transit overlay;
- traffic: attach `google.maps.TrafficLayer`;
- transit: attach `google.maps.TransitLayer`.

Only one overlay layer is active at a time.

Recenter:

```ts
map.panTo(center);
map.setZoom(12);
```

Fit route:

- decode all displayed route points;
- extend `google.maps.LatLngBounds`;
- call `map.fitBounds(bounds, padding)`;
- handle empty and single-point geometry safely.

Cleanup:

- call `trafficLayer.setMap(null)`;
- call `transitLayer.setMap(null)`;
- clear listeners.

### 10.8 Trip Page

Simplify `src/app/trip/plan/page.tsx`:

- stop constructing a maps provider server-side;
- stop requesting tile URLs;
- pass only route query values required by `TripPlanClient`.

Simplify `TripPlanClient`:

- remove tile URL props;
- retain list/map mobile tabs;
- retain route selection;
- retain weather overlay;
- retain traffic polling;
- retain route sorting;
- default sort to `fastest`.

## 11. Mock Mode

Mock mode is mandatory.

### 11.1 Mock Provider

Update `MockMapsProvider` to the new interface:

- autocomplete returns place-ID-like suggestions;
- resolvePlace returns deterministic coordinates;
- geocode and reverse geocode remain deterministic;
- route returns valid Google-compatible encoded polylines;
- remove `trafficFor`;
- remove `tilesUrl`.

The current mock strings such as `mock_polyline_car` are not valid encoded polylines. Replace them
with valid fixtures so route overlays and weather waypoint sampling exercise real geometry.

### 11.2 Mock Browser Map

Unit tests must mock the loader and Google classes. E2E mock mode may choose one of:

1. supply a local fake map component under test mode; or
2. mock the Maps JavaScript API network/script boundary.

The production component must still use Google Maps. Do not require a live Google browser key for
CI.

Preferred approach:

- abstract map loading behind `googleMapsLoader.ts`;
- unit-test map components with deterministic class fakes;
- keep E2E focused on the full planner flow and allow a controlled test-map adapter only when
  `NEXT_PUBLIC_USE_MOCK_SERVICES=true`.

Mock mode must not make any request to:

```text
googleapis.com
maps.googleapis.com
maps.gstatic.com
openweathermap.org
```

## 12. Error Handling

Normalize Google failures to existing service errors:

| Google condition          | Domain error       |
| ------------------------- | ------------------ |
| invalid input             | `VALIDATION_ERROR` |
| no place or route         | `NOT_FOUND`        |
| quota exhaustion          | `RATE_LIMITED`     |
| timeout or abort          | `PROVIDER_TIMEOUT` |
| network unavailable       | `NETWORK_OFFLINE`  |
| denied key/API            | `PROVIDER_ERROR`   |
| unknown upstream response | `PROVIDER_ERROR`   |

User-facing requirements:

- Autocomplete failure must not erase a previously selected location.
- Place resolution failure must leave the field editable.
- Partial mode failure must show available routes.
- All-mode failure must show `PlanErrorState`.
- Map loader failure must not hide route cards.
- Weather failure must continue returning unenriched routes, as today.

## 13. Privacy, Attribution, and Terms

Update `/privacy` to state:

- search text and selected place IDs are sent to Google Places;
- coordinates and route options are sent to Google Routes;
- browser map tiles and map interactions are served by Google Maps;
- weather coordinates are sent to OpenWeatherMap;
- no MapmyIndia or Nominatim requests remain.

Do not obscure Google attribution or logo.

Do not persist Google route content beyond what Google Maps Platform terms allow. The existing
five-minute in-memory route cache is acceptable as a transient performance cache, but the
implementer must verify current policy before increasing persistence duration or storing route
content in IndexedDB.

## 14. Security and Cost Controls

### 14.1 Keys

Browser key:

- HTTP referrer restrictions for localhost, preview domain, and production domain.
- API restriction: Maps JavaScript API only.
- Optional App Check may be added later, not required for this migration.

Server key:

- never prefixed with `NEXT_PUBLIC_`;
- API restrictions: Routes API, Places API (New), Geocoding API;
- stored only in local environment and deployment secrets;
- never included in logs, responses, snapshots, or client bundles.

### 14.2 Cost Guardrails

- Keep autocomplete at 300 ms debounce and minimum 3 characters.
- Use session tokens correctly.
- Do not cache autocomplete across users or sessions.
- Use narrow field masks.
- Use `OVERVIEW` polyline quality.
- Use `TRAFFIC_AWARE`, not `TRAFFIC_AWARE_OPTIMAL`.
- Do not request traffic-on-polyline extra computations.
- Keep route caching enabled for normal searches.
- Set Google Cloud quotas and billing alerts outside code.
- Four planner modes mean up to four route computations per completed search. Document this in
  owner-facing operations notes.

## 15. File-Level Migration Matrix

### 15.1 Delete

```text
src/app/dashboard/**
src/app/api/maps/traffic/route.ts
src/components/dashboard/**
src/components/planner/QuickLocationChips.tsx
src/components/planner/TodaysCommuteCard.tsx
src/components/shell/BottomNav.tsx
src/services/maps/mapmyindia.ts
src/services/maps/nominatim.ts
src/store/locationsStore.ts
src/store/preferencesStore.ts
src/store/historyStore.ts
src/store/recurringStore.ts
src/store/persistAdapter.ts
src/store/migrations.ts
src/lib/insights.ts

tests/unit/dashboard/**
tests/unit/planner/QuickLocationChips.test.tsx
tests/unit/planner/TodaysCommuteCard.test.tsx
tests/unit/store/locationsStore.test.ts
tests/unit/store/preferencesStore.test.ts
tests/unit/store/historyStore.test.ts
tests/unit/store/recurringStore.test.ts
tests/unit/store/persistAdapter.test.ts
tests/unit/store/migrations.test.ts
tests/unit/lib/insights.test.ts
```

Delete MapLibre and MapmyIndia-specific tests and fixtures after equivalent Google coverage exists.

### 15.2 Add

```text
src/app/api/maps/place/route.ts
src/lib/googleMapsLoader.ts
src/services/maps/google.ts

tests/fixtures/google-autocomplete.json
tests/fixtures/google-place-details.json
tests/fixtures/google-geocode.json
tests/fixtures/google-reverse-geocode.json
tests/fixtures/google-routes-drive.json
tests/fixtures/google-routes-two-wheeler.json
tests/fixtures/google-routes-transit.json
tests/fixtures/google-routes-walk.json
tests/integration/services/googleMapsProvider.test.ts
```

Names may vary slightly, but responsibilities must not be merged into unrelated files.

### 15.3 Rewrite or Update

```text
.env.example
.github/workflows/ci.yml
README.md
PROJECT_STATUS.md
docs/BACKLOG.md
package.json
pnpm-lock.yaml

src/app/layout.tsx
src/app/page.tsx
src/app/privacy/page.tsx
src/app/sitemap.ts
src/app/trip/plan/page.tsx

src/components/map/MapCanvas.tsx
src/components/map/MapControls.tsx
src/components/map/MapInstanceContext.ts
src/components/map/RouteOverlay.tsx
src/components/map/WeatherLayer.tsx
src/components/planner/AddressAutocomplete.tsx
src/components/planner/FromToForm.tsx
src/components/shell/Header.tsx
src/components/trip/TripPlanClient.tsx

src/hooks/useAutocomplete.ts
src/hooks/usePlanTrip.ts
src/services/index.ts
src/services/maps/mock.ts
src/services/maps/types.ts
src/services/routing.ts
src/store/index.ts
src/types/data-models.ts

tests/integration/services/mswHandlers.ts
tests/unit/map/**
tests/unit/planner/AddressAutocomplete.test.tsx
tests/unit/planner/FromToForm.test.tsx
tests/unit/shell/Header.test.tsx
tests/unit/hooks/useAutocomplete.test.ts
tests/unit/hooks/usePlanTrip.test.ts
tests/e2e/**
```

## 16. Staged Implementation Plan

Each stage should be a reviewable commit. Do not combine the entire migration into one commit.

### Stage 0: Baseline and Contract Lock

Tasks:

- Read repository instructions and Next.js 16 docs.
- Run baseline lint, typecheck, tests, build, and E2E.
- Record current passing counts.
- Add Google fixtures before deleting MapmyIndia fixtures.
- Add type-only Google response contracts.

Gate:

- Baseline checks pass.
- No product behavior changes.

Suggested commit:

```text
test: add google maps provider fixtures and contracts
```

### Stage 1: Remove Dashboard Feature

Tasks:

- Perform all work in section 7.
- Remove orphaned stores, types, dependencies, planner widgets, and navigation.
- Keep primary planner functional.

Gate:

- `/dashboard` returns 404.
- Home -> plan route flow works in mock mode.
- Lint, typecheck, unit tests, and build pass.
- No dashboard references remain in source/tests/current docs.

Suggested commit:

```text
refactor: remove dashboard and orphaned personalization features
```

### Stage 2: Introduce Google Server Provider

Tasks:

- Add environment validation.
- Add `GoogleMapsProvider`.
- Implement autocomplete, place resolution, geocoding, reverse geocoding, and routes.
- Update `MapsProvider`.
- Keep mock provider compiling.
- Do not switch rendering yet.

Gate:

- Google provider integration tests pass entirely through MSW.
- No live calls occur in tests.
- MapmyIndia provider may still exist only until Stage 4, but production selection must be prepared
  for Google.

Suggested commit:

```text
feat: add google places geocoding and routes provider
```

### Stage 3: Migrate Planner Place Flow

Tasks:

- Add `/api/maps/place`.
- Add autocomplete session tokens.
- Resolve selected predictions by Place ID.
- Update geolocation reverse lookup.
- Update planner tests.

Gate:

- From and To inputs have independent sessions.
- Selected predictions always contain coordinates before submit.
- Keyboard and screen-reader combobox behavior still passes tests.
- Mock mode uses no Google requests.

Suggested commit:

```text
feat: migrate planner search to google place ids
```

### Stage 4: Switch Routing and Remove MapmyIndia

Tasks:

- Select `GoogleMapsProvider` in live mode.
- Complete Google route adaptation for all four default modes.
- Preserve weather enrichment and fresh polling.
- Delete MapmyIndia, Nominatim, traffic endpoint, handlers, and fixtures.

Gate:

- `rg -ni "mapmyindia|mappls|nominatim" src tests package.json .env.example` returns no result.
- All route modes have fixture-backed integration tests.
- Partial mode failure is tested.
- All-mode failure is tested.

Suggested commit:

```text
refactor: replace mapmyindia routing with google routes
```

### Stage 5: Replace MapLibre Rendering

Tasks:

- Add loader and Google map implementation.
- Rewrite route polylines, weather markers, controls, traffic layer, and transit layer.
- Remove tile URL plumbing.
- Remove MapLibre dependency and tests.

Gate:

- `rg -ni "maplibre|openstreetmap|carto|tilesUrl" src tests package.json` returns no result.
- Map component tests verify lifecycle cleanup.
- Route click selection works.
- Fit route, recenter, traffic, and transit controls work.
- Route cards remain usable if the map loader fails.

Suggested commit:

```text
refactor: replace maplibre rendering with google maps
```

### Stage 6: Documentation, Privacy, CI, and Dependency Cleanup

Tasks:

- Update environment template and CI secrets.
- Update README setup and provider descriptions.
- Update privacy policy.
- Update project status and backlog.
- Remove obsolete dependencies and lockfile entries.
- Update historical docs only where they incorrectly describe the current runtime.

Gate:

- Fresh mock setup works from documented instructions.
- Production build succeeds without live server calls.
- No obsolete environment variable remains.

Suggested commit:

```text
docs: update setup privacy and operations for google maps
```

### Stage 7: End-to-End Verification

Add Playwright coverage for:

1. Home page loads without dashboard navigation.
2. `/dashboard` returns 404.
3. User searches and selects From and To locations in mock mode.
4. User submits and receives multiple routes.
5. Route cards show weather enrichment.
6. User changes sort mode.
7. User selects a route from the list.
8. User switches to map on mobile.
9. Map test adapter shows the selected route.
10. Share-trip link round trip remains valid.

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
```

Gate:

- Every command passes.
- No skipped test covers a migration-critical path.
- No test depends on live Google or OpenWeatherMap credentials.

Suggested commit:

```text
test: cover google maps planner migration end to end
```

### Stage 8: Manual Live Verification

This stage requires owner-provided keys and is not a CI step.

Verify:

- Places autocomplete in Bengaluru.
- Place Details coordinate resolution.
- Current-location reverse geocoding.
- DRIVE route with traffic-aware ETA.
- TWO_WHEELER route.
- TRANSIT route with meaningful steps.
- WALK route.
- Map renders and route selection works.
- Traffic and transit layer controls work.
- Weather markers render on Google Maps.
- Browser key fails outside allowed referrers.
- Server key does not appear in browser source or `.next/static`.

Gate:

- Evidence is recorded in the pull request or implementation report.

## 17. Test Requirements

### 17.1 Unit Tests

At minimum:

- Google duration parsing.
- Google place type classification.
- Google travel mode conversion in both directions.
- Google route step adaptation.
- transit detail adaptation.
- route ID determinism.
- all-mode failure selection.
- partial-mode success.
- autocomplete session lifecycle.
- loader initialization and error handling.
- map overlay cleanup.
- weather marker cleanup.
- traffic/transit layer exclusivity.

### 17.2 Integration Tests

MSW-backed tests must cover:

- Places Autocomplete success, empty response, malformed prediction, 400, 403, 429, 500, timeout.
- Place Details success, missing location, invalid place ID, quota error.
- Forward geocode success and zero results.
- Reverse geocode success and zero results.
- Routes for DRIVE, TWO_WHEELER, TRANSIT, WALK.
- route response with decimal-second durations.
- one failed mode and three successful modes.
- all modes failed.
- request field masks are present and not `*`.
- browser key is never used in server requests.

### 17.3 Component Tests

- No dashboard link in header.
- Planner has no quick-location or today's-commute section.
- Autocomplete preserves accessibility behavior.
- Map displays loading, error, and ready states.
- Clicking a Google polyline selects a route.
- Fit bounds includes all route points.
- map object, polylines, markers, layers, and listeners are cleaned up.

### 17.4 Security Tests

- `GOOGLE_MAPS_SERVER_KEY` does not appear in `.next/static`.
- API errors never echo request headers or keys.
- `.env.local` remains ignored.
- Mock mode produces zero Google network calls.

## 18. Final Acceptance Criteria

The implementation is complete only when all criteria below are true.

### Dashboard

- [ ] `/dashboard` is absent and returns 404.
- [ ] Dashboard navigation is absent on desktop and mobile.
- [ ] Dashboard components, tests, stores, types, and dependencies are removed.
- [ ] Home page contains only functional planner content.

### Google Provider

- [ ] Google Places Autocomplete (New) powers live suggestions.
- [ ] Place Details resolves selected Place IDs with session tokens.
- [ ] Google Geocoding handles forward and reverse geocoding.
- [ ] Google Routes computes DRIVE, TWO_WHEELER, TRANSIT, and WALK routes.
- [ ] Traffic-aware duration is used for DRIVE and TWO_WHEELER.
- [ ] OpenWeatherMap continues enriching routes.

### Google Map

- [ ] Google Maps JavaScript API renders the trip map.
- [ ] Route polylines are selectable.
- [ ] Weather markers render with Advanced Markers.
- [ ] Recenter and fit-route controls work.
- [ ] Traffic and transit layers work and are mutually exclusive.
- [ ] Map failure does not remove route-list functionality.

### Removal

- [ ] No MapmyIndia, Mappls, Nominatim, MapLibre, OSM tile, or CARTO runtime code remains.
- [ ] No obsolete map keys remain.
- [ ] No obsolete package remains.
- [ ] No raw Google response leaks through internal API routes.

### Quality

- [ ] Mock mode works without external keys.
- [ ] Lint passes with zero warnings.
- [ ] Typecheck passes.
- [ ] Unit and integration tests pass.
- [ ] Coverage does not regress materially in critical planner and provider modules.
- [ ] Production build passes.
- [ ] Desktop and mobile Playwright flows pass.
- [ ] Manual live-provider verification passes.

## 19. Rollback and Failure Strategy

The migration is staged so each commit can be reverted independently.

- Do not delete MapmyIndia until Google provider tests and planner place flow pass.
- Do not remove MapLibre until Google map component tests pass.
- Do not merge a branch where live provider selection points to Google but the renderer still
  depends on removed tile URLs.
- If a Google route mode is unavailable for a location, return other successful modes.
- If Google map rendering fails, retain route cards and directions.
- If weather fails, retain unenriched Google routes.

No runtime dual-provider fallback is required in the final code. Git history is the rollback
mechanism.

## 20. Required Implementation Report

Kiro must finish with a report containing:

1. Commits produced by stage.
2. Files deleted, added, and materially rewritten.
3. Final environment variable list.
4. Test commands and exact pass counts.
5. Production build result.
6. E2E result.
7. Live verification result or explicit owner-key blocker.
8. Google API SKUs used by each user action.
9. Known limitations that remain within this specification.
10. Confirmation that repository searches for removed providers return no matches.

## 21. Official References

- Maps JavaScript loading:
  https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- Routes API compute routes:
  https://developers.google.com/maps/documentation/routes/compute_route_directions
- Routes REST reference:
  https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes
- Route polylines and traffic:
  https://developers.google.com/maps/documentation/routes/traffic_on_polylines
- Places Autocomplete (New):
  https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
- Place Details (New):
  https://developers.google.com/maps/documentation/places/web-service/place-details
- API key security:
  https://developers.google.com/maps/api-security-best-practices
- India pricing:
  https://developers.google.com/maps/billing-and-pricing/pricing-india
