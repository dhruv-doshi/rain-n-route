# Requirements Document

## Introduction

This document defines the requirements for the Google Maps Migration feature of Rain-N-Route — a weather-enriched route planner on Next.js 16. The migration replaces the MapmyIndia/Nominatim/MapLibre mapping stack with a unified Google Maps Platform integration and removes the dashboard feature with all its dependent stores, components, and dependencies. Requirements are derived from the approved design document and organized by functional area.

## Glossary

- **Planner**: The main route planning UI consisting of the From/To form, route computation, and route card display
- **Route_Handler**: A Next.js server-side API route handler at `/api/maps/*` that proxies requests to Google APIs
- **Google_Provider**: The server-side `GoogleMapsProvider` service that calls Google Maps Platform APIs and adapts responses to domain types
- **Mock_Provider**: The `MockMapsProvider` service returning deterministic fixtures without any external API calls
- **Maps_Loader**: The client-side singleton `googleMapsLoader.ts` module managing the Maps JavaScript API script loading
- **Map_Canvas**: The React component wrapping `google.maps.Map` for browser map rendering
- **Route_Overlay**: The component rendering `google.maps.Polyline` instances for route visualization
- **Weather_Layer**: The component placing `AdvancedMarkerElement` weather markers at route waypoints
- **Map_Controls**: The component managing traffic/transit layer switching, recenter, and fit-route
- **Session_Token**: A UUID generated per autocomplete search session, used for Google Places billing optimization
- **Domain_Type**: Application-internal types (`GeoSuggestion`, `GeoResult`, `RouteOption`, `RouteResponse`) consumed by UI components
- **Field_Mask**: An explicit list of Google API response fields to request, avoiding wildcard (`*`) usage
- **Server_Key**: The `GOOGLE_MAPS_SERVER_KEY` environment variable restricted to server-side use only
- **Browser_Key**: The `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` environment variable used by Maps JavaScript API in the browser
- **LRU_Cache**: The existing 5-minute Least Recently Used in-memory cache for route responses
- **ServiceErrorShape**: The normalized error type returned to clients from Route_Handlers

## Requirements

### Requirement 1: Dashboard Feature Removal

**User Story:** As a developer, I want to remove the entire dashboard feature and its dependent code, so that the application is simpler, has fewer dependencies, and only contains actively used functionality.

#### Acceptance Criteria

1. WHEN the application builds, THE Planner SHALL contain no imports, references, or routes related to dashboard functionality, including the `src/app/dashboard/` route directory, the `src/components/dashboard/` component directory, and their associated test files
2. WHEN a user navigates to `/dashboard`, THE application SHALL return the framework's default not-found page with an HTTP 404 status code
3. WHEN the home page renders, THE Planner SHALL display only the From/To route planning form without QuickLocationChips or TodaysCommuteCard widgets, and the source files `QuickLocationChips.tsx`, `TodaysCommuteCard.tsx`, and their corresponding test files SHALL be deleted
4. WHEN the application initializes, THE application SHALL not initialize any IndexedDB adapter, location store, preferences store, history store, or recurring store, and the `persistAdapter.ts`, `locationsStore.ts`, `preferencesStore.ts`, `historyStore.ts`, `recurringStore.ts`, and `migrations.ts` files SHALL be removed from the store directory
5. WHEN the application builds, THE application SHALL not include `recharts`, `idb-keyval`, or `fake-indexeddb` in the production or development dependency tree, and these packages SHALL be removed from `package.json`
6. WHEN the header renders, THE application SHALL not display a Dashboard navigation link, and the BottomNav component SHALL be removed from the layout and its source file deleted
7. WHEN the sitemap generates, THE application SHALL not include a `/dashboard` entry
8. WHEN the application builds after all removals, THE application SHALL compile without TypeScript errors and all remaining tests SHALL pass

### Requirement 2: Environment Configuration and Validation

**User Story:** As a developer, I want a validated environment configuration module, so that missing or invalid keys produce clear errors without exposing secrets.

#### Acceptance Criteria

1. THE application SHALL require three map-related environment variables for live mode: `GOOGLE_MAPS_SERVER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
2. WHILE mock mode is active (`NEXT_PUBLIC_USE_MOCK_SERVICES=true`), THE application SHALL operate without requiring any Google API keys
3. WHEN a required server-side key (`GOOGLE_MAPS_SERVER_KEY`) is missing in live mode, THE Route_Handler SHALL return an HTTP 502 response with a JSON body containing `code: 'PROVIDER_ERROR'`, a message that describes the misconfiguration without including the variable name, the key value, or any infrastructure-identifying details, and `retryable: false`
4. WHEN the browser key (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`) or map ID (`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`) is missing in live mode, THE Map_Canvas SHALL render a visible, non-blank error state containing a text message indicating that map configuration is incomplete, in place of the map panel
5. THE application SHALL never log, serialize, or include full or partial API key values (4 or more consecutive characters from any configured key) in HTTP responses, client-rendered error messages, server logs, or build output
6. THE Server*Key (`GOOGLE_MAPS_SERVER_KEY`) SHALL never have the `NEXT_PUBLIC*` prefix and SHALL never appear in client JavaScript bundles
7. WHEN the application builds, THE build output SHALL not contain the `GOOGLE_MAPS_SERVER_KEY` value in any file within `.next/static/`
8. IF `NEXT_PUBLIC_USE_MOCK_SERVICES` is not set or is set to any value other than `true`, THEN THE application SHALL treat the mode as live and enforce all key-presence validations at request time

### Requirement 3: Place Autocomplete Search

**User Story:** As a user, I want to search for places by name with real-time suggestions, so that I can quickly select origin and destination locations.

#### Acceptance Criteria

1. WHEN a user types at least 3 characters in an address input, THE Planner SHALL send an autocomplete request to the Route_Handler after a 300ms debounce, ignoring any input exceeding 100 characters by truncating to 100 characters before sending
2. WHEN the user types additional characters before the debounce completes, THE Planner SHALL abort the prior pending request and restart the debounce timer
3. WHEN the Route_Handler receives an autocomplete request, THE Google_Provider SHALL call the Places API (New) `places:autocomplete` endpoint with the server key, session token, included region code `in`, and an explicit field mask
4. WHEN autocomplete results are returned, THE Google_Provider SHALL adapt at most 5 place predictions into `GeoSuggestion` objects with `id` set to the Google Place ID, `label` from `structuredFormat.mainText.text`, and `coords` left undefined
5. WHEN a user selects a suggestion, THE Planner SHALL call the Place Resolution endpoint with the same session token used during autocomplete
6. WHEN the Place Resolution succeeds, THE Google_Provider SHALL return a `GeoResult` with resolved coordinates from `place.location` and a `placeType` classified from the Google `place.types` array
7. WHEN the input contains fewer than 3 characters, THE Planner SHALL display an empty suggestion list without sending a request to the Route_Handler
8. WHEN the Route_Handler returns zero autocomplete results, THE Planner SHALL display an empty suggestion list without showing an error
9. THE Google_Provider SHALL never use a wildcard (`*`) field mask for autocomplete or place detail requests

### Requirement 4: Autocomplete Session Token Management

**User Story:** As a system operator, I want autocomplete billing optimized through session tokens, so that grouped autocomplete-plus-place requests are billed as a single session.

#### Acceptance Criteria

1. WHEN an address input that contains no text and has no resolved place receives focus, THE Planner SHALL generate a new UUID v4 session token for that field
2. WHEN a user selects a place suggestion, THE Planner SHALL include the current session token in the Place Resolution request and then immediately replace it with a newly generated UUID v4 token
3. WHEN a user clears the address input value to an empty string, THE Planner SHALL discard the current session token for that field and generate a new UUID v4 token
4. THE Planner SHALL maintain separate session tokens for the From and To input fields such that autocomplete and Place Resolution calls for one field never use the other field's token
5. THE Planner SHALL never persist session tokens to localStorage, IndexedDB, or any persistent storage
6. WHEN a user refocuses an address input that already contains text or a resolved place, THE Planner SHALL continue using the existing session token for that field without generating a new one

### Requirement 5: Forward and Reverse Geocoding

**User Story:** As a user, I want to geocode text addresses and resolve my browser location to a named place, so that I can use varied input methods.

#### Acceptance Criteria

1. WHEN a forward geocode request is received, THE Google_Provider SHALL call the Geocoding API with the query string, region parameter `in`, and the server key, and SHALL return an array of `GeoResult` objects adapted from the response
2. WHEN a reverse geocode request is received, THE Google_Provider SHALL call the Geocoding API with the latitude and longitude, region parameter `in`, and the server key, and SHALL return a single `GeoResult` adapted from the first result
3. WHEN Google returns status `ZERO_RESULTS` for a forward geocode request, THE Google_Provider SHALL return an empty array
4. WHEN Google returns status `ZERO_RESULTS` for a reverse geocode request, THE Google_Provider SHALL throw a `NOT_FOUND` error
5. WHEN Google returns `OVER_QUERY_LIMIT` or `RESOURCE_EXHAUSTED`, THE Google_Provider SHALL normalize to `RATE_LIMITED` with `retryable: true`
6. WHEN Google returns `REQUEST_DENIED`, THE Google_Provider SHALL normalize to `PROVIDER_ERROR` with a non-secret message that does not include the API key or variable name
7. WHEN Google returns `INVALID_REQUEST`, THE Google_Provider SHALL normalize to `VALIDATION_ERROR`
8. WHEN a network timeout occurs (no response within 10 seconds), THE Google_Provider SHALL normalize to `PROVIDER_TIMEOUT` with `retryable: true`
9. WHEN reverse geocode is called with coordinates outside valid ranges (latitude not in -90 to 90, longitude not in -180 to 180), THE Google_Provider SHALL reject with `VALIDATION_ERROR` without making a network request

### Requirement 6: Route Computation

**User Story:** As a user, I want to compute routes for multiple transport modes simultaneously, so that I can compare travel options between my origin and destination.

#### Acceptance Criteria

1. WHEN a route request is received with one or more modes, THE Google_Provider SHALL execute one Routes API call per requested mode concurrently using `Promise.allSettled`, up to a maximum of 8 concurrent calls (one per distinct `TransportMode` value)
2. WHEN K of N mode requests succeed (where 1 ≤ K < N), THE Google_Provider SHALL return the K successful routes without failing the entire request
3. WHEN all mode requests fail, THE Google_Provider SHALL throw the normalized error from the first request whose `ServiceErrorCode` is not `PROVIDER_TIMEOUT`, preferring `RATE_LIMITED` over `PROVIDER_ERROR` over `UNKNOWN`; if all errors are identical, it SHALL throw the first
4. WHEN adapting a Google route response, THE Google_Provider SHALL map Google travel modes to domain `TransportMode` values (`DRIVE` → `car`, `TWO_WHEELER` → `two_wheeler`, `WALK` → `walk`, `BICYCLE` → `cycle`, `TRANSIT` → `transit`) and SHALL never expose Google enum strings to the UI
5. WHEN computing routes for `DRIVE` or `TWO_WHEELER` modes, THE Google_Provider SHALL set `routingPreference` to `TRAFFIC_AWARE`
6. WHEN computing routes for `WALK`, `BICYCLE`, or `TRANSIT` modes, THE Google_Provider SHALL not include a `routingPreference` field
7. WHEN a `departureTime` is provided for `TRANSIT` mode, THE Google_Provider SHALL include it in the request; WHEN `departureTime` is absent for `TRANSIT` mode, THE Google_Provider SHALL omit the departure time field
8. THE Google_Provider SHALL use `OVERVIEW` polyline quality and `ENCODED_POLYLINE` encoding for all route requests
9. THE Google_Provider SHALL use an explicit field mask containing only consumed fields and SHALL never use `*`
10. WHEN parsing Google duration strings (e.g., `"3.5s"`), THE Google_Provider SHALL return `Math.ceil` of the numeric value as integer seconds, defaulting to 0 for invalid or missing values
11. IF an individual mode API call does not receive a response within 10 seconds, THEN THE Google_Provider SHALL treat that mode as failed with a `PROVIDER_TIMEOUT` error and SHALL not block the remaining mode results
12. WHEN a route request includes modes that map to duplicate Google travel modes (e.g., `cab` → `DRIVE` when `car` → `DRIVE` is already requested), THE Google_Provider SHALL execute only one API call per unique Google travel mode and assign the result to the originally-requested domain mode

### Requirement 7: Route Caching

**User Story:** As a system operator, I want route responses cached for 5 minutes, so that repeated identical queries do not incur additional API costs.

#### Acceptance Criteria

1. THE Route_Handler SHALL maintain a 5-minute TTL LRU in-memory cache for route responses with a maximum capacity of 100 entries
2. WHEN building a cache key, THE Route_Handler SHALL round coordinates to 4 decimal places, sort modes alphabetically, and bucket departure time to 5-minute intervals
3. WHEN a request includes `?fresh=1`, THE Route_Handler SHALL bypass the cache read and fetch fresh route data from Google, and SHALL write the fresh result back into the cache
4. WHEN identical rounded coordinates, sorted modes, and time bucket are provided, THE Route_Handler SHALL produce an identical cache key (deterministic)
5. THE Route_Handler SHALL not cache error responses; only successful route responses SHALL be stored in the LRU_Cache

### Requirement 8: Google Maps Browser Rendering

**User Story:** As a user, I want to see my routes displayed on an interactive map, so that I can visually understand the journey.

#### Acceptance Criteria

1. WHEN the Map_Canvas mounts, THE Maps_Loader SHALL initialize the Maps JavaScript API using the browser key and configured map ID within 10 seconds
2. THE Maps_Loader SHALL call `setOptions` exactly once and subsequent calls SHALL be no-ops (idempotent initialization)
3. WHEN map initialization succeeds, THE Map_Canvas SHALL instantiate a `google.maps.Map` and provide it through `MapInstanceContext`
4. IF the Maps_Loader rejects or does not resolve within 10 seconds, THEN THE Map_Canvas SHALL render a visible error message indicating the map is unavailable while route cards, step-by-step directions, and all Planner form inputs remain interactive and operable
5. WHEN the component unmounts, THE Map_Canvas SHALL remove all event listeners attached to the map instance and set the map container reference to null
6. WHILE the Maps JavaScript API is loading, THE Map_Canvas SHALL render a loading indicator in place of the map area

### Requirement 9: Route Overlay Rendering

**User Story:** As a user, I want routes displayed as polylines on the map with visual distinction between selected and unselected routes, so that I can identify my chosen route.

#### Acceptance Criteria

1. WHEN routes are available, THE Route_Overlay SHALL create one `google.maps.Polyline` per route using decoded encoded polyline coordinates, skipping any route whose geometry is absent or decodes to zero points
2. WHEN a route is selected, THE Route_Overlay SHALL render the selected polyline with a stroke weight of 6, opacity of 1.0, and a higher z-index than unselected routes, and SHALL render unselected polylines with a stroke weight of 3 and opacity of 0.5
3. WHEN a user clicks a polyline, THE Route_Overlay SHALL trigger route selection for the clicked route
4. WHEN routes change or the component unmounts, THE Route_Overlay SHALL call `setMap(null)` on all existing polyline instances and remove all click listeners before creating new polylines
5. THE Route_Overlay SHALL assign each polyline a stroke color determined by the route's primary transport mode

### Requirement 10: Weather Markers

**User Story:** As a user, I want weather condition markers displayed at points along my route, so that I can anticipate weather during my journey.

#### Acceptance Criteria

1. WHEN weather risk data is available for a route and the map instance is ready, THE Weather_Layer SHALL create one `AdvancedMarkerElement` per waypoint sampled at regular intervals along the decoded route geometry, displaying a weather icon representing the dominant risk factor
2. IF route geometry is absent, decodes to zero points, or weather risk data is undefined, THEN THE Weather_Layer SHALL not create any markers
3. WHEN the selected route changes or the component unmounts, THE Weather_Layer SHALL call remove on all existing marker instances, unmount all associated React roots, and clear the internal marker reference list before creating new markers
4. IF the map instance is unavailable when weather risk data is present, THEN THE Weather_Layer SHALL defer marker creation until the map instance becomes available

### Requirement 11: Map Layer Controls

**User Story:** As a user, I want to toggle traffic and transit overlays on the map, so that I can view real-time traffic conditions or transit routes.

#### Acceptance Criteria

1. WHEN the Map_Controls component mounts, THE Map_Controls SHALL default to the base layer with no overlay layer attached to the map
2. WHEN a user clicks the layer toggle button, THE Map_Controls SHALL cycle the active layer in the fixed order base → traffic → transit → base
3. WHEN the active layer changes to traffic, THE Map_Controls SHALL attach a `google.maps.TrafficLayer` to the map and call `setMap(null)` on any existing transit layer instance
4. WHEN the active layer changes to transit, THE Map_Controls SHALL attach a `google.maps.TransitLayer` to the map and call `setMap(null)` on any existing traffic layer instance
5. WHEN the active layer changes to base, THE Map_Controls SHALL call `setMap(null)` on both traffic and transit layer instances
6. THE Map_Controls SHALL ensure at most one overlay layer (traffic OR transit) is attached to the map at any time
7. WHEN the component unmounts, THE Map_Controls SHALL call `setMap(null)` on all instantiated layer objects to detach them from the map
8. IF the map instance is unavailable when the user clicks the layer toggle, THEN THE Map_Controls SHALL skip the layer attach/detach operation without throwing an error

### Requirement 12: Mock Mode

**User Story:** As a developer, I want the application to operate completely without Google API keys in mock mode, so that tests, CI, and local development work without paid API calls.

#### Acceptance Criteria

1. WHILE mock mode is active, THE Mock_Provider SHALL return identical fixture data for every invocation of autocomplete, resolvePlace, geocode, reverseGeocode, and route, with no values derived from wall-clock time, random generators, or external state
2. WHILE mock mode is active, THE application SHALL make zero HTTP requests to any `*.googleapis.com` or `*.gstatic.com` domain
3. WHEN the Mock_Provider returns route fixtures, THE Mock_Provider SHALL use valid encoded polyline strings that decode to at least 3 coordinate pairs per route, exercising latitude/longitude sign changes
4. WHILE mock mode is active, THE Mock_Provider SHALL implement every method defined in the `MapsProvider` interface (autocomplete, resolvePlace, geocode, reverseGeocode, route), accepting session token parameters on autocomplete and resolvePlace without issuing network calls
5. WHILE mock mode is active, THE Mock_Provider SHALL not implement or reference `trafficFor` or `tilesUrl` methods
6. WHEN the environment variable `NEXT_PUBLIC_USE_MOCK_SERVICES` is set to `"true"` or `NODE_ENV` is set to `"test"`, THE application SHALL select the Mock_Provider for all maps operations without requiring any API key environment variables to be set

### Requirement 13: Error Handling and Graceful Degradation

**User Story:** As a user, I want the application to handle service failures gracefully, so that partial functionality remains available when individual services fail.

#### Acceptance Criteria

1. WHEN autocomplete fails, THE Planner SHALL retain the current input text and any previously resolved location coordinates, and SHALL keep the input field editable for the user to retype or modify the query
2. WHEN place resolution fails after a user selects a suggestion, THE Planner SHALL display an error notification for at least 5 seconds, retain the user's typed text in the input field, and leave the input editable so the user can re-select or modify the query
3. WHEN some route modes fail but others succeed, THE Planner SHALL display only the successfully returned route cards and SHALL not render error indicators, disabled cards, or empty placeholders for the failed modes
4. WHEN all route modes fail, THE Planner SHALL display the `PlanErrorState` component with a retry action that re-submits the route request using the current origin and destination
5. WHEN the Maps JavaScript API fails to load, THE Map_Canvas SHALL render a static error state in the map region while route cards, step-by-step directions, and all Planner form inputs remain interactive and functional
6. IF a Google API returns HTTP 429 or `RESOURCE_EXHAUSTED`, THEN THE Google_Provider SHALL normalize to `RATE_LIMITED` with `retryable: true`
7. IF a Google API returns HTTP 403 or `REQUEST_DENIED`, THEN THE Google_Provider SHALL normalize to `PROVIDER_ERROR` without revealing which key failed
8. THE Google_Provider SHALL never include API keys, request URLs, or internal headers in error messages returned to clients
9. IF a Google API request receives no response within 10 seconds, THEN THE Google_Provider SHALL normalize to `PROVIDER_TIMEOUT` with `retryable: true`

### Requirement 14: Security and Key Isolation

**User Story:** As a system operator, I want API keys isolated by scope with the server key never exposed to the browser, so that billing and access are properly controlled.

#### Acceptance Criteria

1. THE Server_Key SHALL only be used within Next.js Route_Handlers and SHALL never appear in browser JavaScript, network responses, or build artifacts (any file within `.next/static/`)
2. THE Browser_Key SHALL be restricted to loading the Maps JavaScript API via `@googlemaps/js-api-loader` only and SHALL not be passed to any Route_Handler request or used in any server-side API call
3. WHEN the Route_Handler returns a response, THE response body SHALL contain only adapted Domain_Types (`GeoSuggestion`, `GeoResult`, `RouteOption`, `RouteResponse`, or `ServiceErrorShape`) and SHALL never include Google-specific fields such as `geocodedWaypoints`, `travel_mode` enums, or raw `routes` objects from the Google API
4. IF a Route_Handler receives input parameters that fail Zod schema validation, THEN THE Route_Handler SHALL reject the request with a `VALIDATION_ERROR` response and SHALL not make any Google API call
5. THE application SHALL not prefix `GOOGLE_MAPS_SERVER_KEY` with `NEXT_PUBLIC_` to prevent client bundle inclusion
6. IF any client-side code attempts to import or reference the `GOOGLE_MAPS_SERVER_KEY` environment variable, THEN THE application build SHALL either exclude the value (resolve to `undefined`) or fail the build

### Requirement 15: Provider Interface Migration

**User Story:** As a developer, I want the maps provider interface updated to reflect the Google Maps integration, so that the codebase has no dead interface methods and supports the new session-token-based place resolution flow.

#### Acceptance Criteria

1. THE `MapsProvider` interface SHALL include exactly five methods: `autocomplete`, `resolvePlace`, `geocode`, `reverseGeocode`, and `route`, each returning a Promise of the corresponding domain type (`GeoSuggestion[]`, `GeoResult`, `GeoResult[]`, `GeoResult`, and `RouteResponse` respectively)
2. THE `MapsProvider` interface SHALL not include `trafficFor` or `tilesUrl` methods, and no implementation of `MapsProvider` SHALL define or export these methods
3. WHEN `autocomplete` is called, THE `MapsProvider` SHALL accept a `query` string parameter and an `AutocompleteOptions` parameter containing a required `sessionToken` string and an optional `bias` of type `LatLng`
4. WHEN `resolvePlace` is called, THE `MapsProvider` SHALL accept a `placeId` string parameter and a `ResolvePlaceOptions` parameter containing a required `sessionToken` string and a required `fallbackLabel` string, and SHALL return a `Promise<GeoResult>`
5. THE `/api/maps/traffic` route handler file SHALL be removed from the application, and no server route SHALL respond to GET requests at the `/api/maps/traffic` path
6. IF `autocomplete` or `resolvePlace` is called with an empty `sessionToken`, THEN THE `MapsProvider` SHALL reject with an error indicating that a valid session token is required

### Requirement 16: Dependency and Legacy Code Cleanup

**User Story:** As a developer, I want all legacy mapping providers and unused dependencies removed, so that the codebase contains no dead code or conflicting implementations.

#### Acceptance Criteria

1. WHEN the application builds successfully, THE source files (`src/**`), test files (`tests/**`), and configuration files (`package.json`, `.env.example`) SHALL not contain any case-insensitive references to `mapmyindia`, `mappls`, `nominatim`, `maplibre`, or `openstreetmap` tile URLs
2. WHEN the application builds successfully, THE `package.json` SHALL not list `maplibre-gl` in either `dependencies` or `devDependencies`
3. WHEN the application builds successfully, THE `package.json` SHALL list `@googlemaps/js-api-loader` in `dependencies` and `@types/google.maps` in `devDependencies`
4. THE `package.json` SHALL retain `zustand` in `dependencies` for `tripStore` session state management
5. WHEN the environment file template (`.env.example`) is updated, THE template SHALL reference `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `GOOGLE_MAPS_SERVER_KEY`, and `NEXT_PUBLIC_USE_MOCK_SERVICES` and SHALL not reference `NEXT_PUBLIC_MAPS_KEY`, `MAPS_SECRET`, or `MAPS_CLIENT_ID`
6. WHEN the application builds successfully, THE `pnpm-lock.yaml` SHALL not contain direct or transitive references to `maplibre-gl`, `recharts`, or `idb-keyval`
