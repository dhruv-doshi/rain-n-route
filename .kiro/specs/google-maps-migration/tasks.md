# Implementation Plan: Google Maps Migration

## Overview

This plan implements the complete migration from MapmyIndia/Nominatim/MapLibre to Google Maps Platform, including dashboard removal, across 8 stages. Each stage produces a reviewable commit that leaves the repository in a passing state. The implementation uses TypeScript with Next.js 16, Vitest for testing, and Playwright for E2E.

## Tasks

- [x] 1. Stage 0: Baseline + Fixtures/Contracts
  - [x] 1.1 Add Google response type definitions
    - Create `src/services/maps/google-types.ts` with `GooglePlacePrediction`, `GoogleAutocompleteResponse`, `GooglePlaceDetails`, `GoogleRouteResponse`, `GoogleRouteStep`, `GoogleTransitDetails` interfaces
    - These are internal types for type-safe adaptation — never exported to UI components
    - _Requirements: 14.3, 15.1_
  - [x] 1.2 Add Google API response fixture JSON files
    - Create `tests/fixtures/google-autocomplete.json` with sample Places Autocomplete response
    - Create `tests/fixtures/google-place-details.json` with Place Details response including location and types
    - Create `tests/fixtures/google-geocode.json` with forward geocode response
    - Create `tests/fixtures/google-reverse-geocode.json` with reverse geocode response
    - Create `tests/fixtures/google-routes-drive.json` with DRIVE route including encoded polyline
    - Create `tests/fixtures/google-routes-two-wheeler.json` with TWO_WHEELER route
    - Create `tests/fixtures/google-routes-transit.json` with TRANSIT route including transitDetails
    - Create `tests/fixtures/google-routes-walk.json` with WALK route
    - All polyline fixtures must contain valid encoded polylines that decode to ≥3 coordinate pairs
    - _Requirements: 12.3_

- [x] 2. Stage 1: Dashboard Removal
  - [x] 2.1 Delete dashboard routes, components, and tests
    - Delete `src/app/dashboard/` directory
    - Delete `src/components/dashboard/` directory
    - Delete `tests/unit/dashboard/` directory
    - Verify `/dashboard` returns Next.js default 404
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Delete orphaned planner widgets and their tests
    - Delete `src/components/planner/QuickLocationChips.tsx` and `tests/unit/planner/QuickLocationChips.test.tsx`
    - Delete `src/components/planner/TodaysCommuteCard.tsx` and `tests/unit/planner/TodaysCommuteCard.test.tsx`
    - Update `src/components/planner/FromToForm.tsx` to remove quick-fill UI and imports
    - Update `src/app/page.tsx` to remove TodaysCommuteCard
    - _Requirements: 1.3_
  - [x] 2.3 Delete dashboard-only stores, persistence layer, and insights
    - Delete `src/store/locationsStore.ts`, `src/store/preferencesStore.ts`, `src/store/historyStore.ts`, `src/store/recurringStore.ts`, `src/store/persistAdapter.ts`, `src/store/migrations.ts`
    - Delete `src/lib/insights.ts`
    - Delete corresponding test files in `tests/unit/store/` and `tests/unit/lib/`
    - Retain `src/store/tripStore.ts`
    - _Requirements: 1.4_
  - [x] 2.4 Remove BottomNav and simplify Header navigation
    - Delete `src/components/shell/BottomNav.tsx` and its test file
    - Remove Dashboard link from `src/components/shell/Header.tsx`
    - Remove BottomNav from layout
    - Remove `/dashboard` from `src/app/sitemap.ts`
    - _Requirements: 1.6, 1.7_
  - [x] 2.5 Remove dashboard-only dependencies from package.json
    - Remove `recharts` from dependencies
    - Remove `idb-keyval` from dependencies
    - Remove `fake-indexeddb` from devDependencies (if no remaining test uses it)
    - Run `pnpm install` to update lockfile
    - Retain `zustand` for tripStore
    - _Requirements: 1.5, 16.4_
  - [x] 2.6 Remove dashboard-only types from data-models
    - Remove `SavedLocationKind`, `SavedLocation`, `UserPreferences`, `DayOfWeek`, `RecurringCommute`, `CommuteLogEntry`, `WeeklyInsight`, `PersistedState` from `src/types/data-models.ts`
    - Retain all route, trip, weather, traffic, and service-error types
    - _Requirements: 1.1_
  - [x] 2.7 Update usePlanTrip and TripPlanClient to remove preferences store dependency
    - Remove `usePreferencesStore` from `src/hooks/usePlanTrip.ts`
    - Remove preferences store usage from `src/components/trip/TripPlanClient.tsx`
    - Default sort mode to `fastest`
    - _Requirements: 1.4_

- [x] 3. Stage 1 Checkpoint
  - Ensure `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass
  - Verify `rg -n "dashboard|Dashboard" src tests` returns no product code references
  - Verify `/dashboard` returns 404
  - Ask the user if questions arise

- [x] 4. Stage 2: Google Server Provider
  - [x] 4.1 Create environment validation module
    - Create `src/lib/env.ts` (or similar) with `getMapsConfig()` function
    - In mock mode: return config without requiring Google keys
    - In live mode: throw descriptive error if any required key is missing (never reveal key values)
    - Export `isMockMode()` helper
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.8_
  - [x] 4.2 Update MapsProvider interface
    - Rewrite `src/services/maps/types.ts` to include exactly 5 methods: `autocomplete`, `resolvePlace`, `geocode`, `reverseGeocode`, `route`
    - Add `AutocompleteOptions` (sessionToken, bias?) and `ResolvePlaceOptions` (sessionToken, fallbackLabel) interfaces
    - Remove `trafficFor` and `tilesUrl` methods
    - Remove `TileLayer` and `TrafficSnapshot` imports if no longer used
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [x] 4.3 Implement GoogleMapsProvider
    - Create `src/services/maps/google.ts` implementing the full `MapsProvider` interface
    - Implement `autocomplete`: POST to Places API (New) with server key, session token, field mask, region `in`
    - Implement `resolvePlace`: GET Place Details with session token, field mask, adapt to GeoResult
    - Implement `geocode`: GET Geocoding API with query and region `in`
    - Implement `reverseGeocode`: GET Geocoding API with latlng, validate coordinate ranges
    - Implement `route`: concurrent per-mode calls with Promise.allSettled, partial failure tolerance
    - Implement `parseGoogleDuration`, `classifyGooglePlaceTypes`, `buildCacheKey`, `normalizeGoogleError` helpers
    - Apply `routingPreference: 'TRAFFIC_AWARE'` only for DRIVE and TWO_WHEELER
    - Use explicit field masks (never `*`) for all Google API calls
    - Never expose server key or Google-specific response data beyond the provider
    - _Requirements: 3.3, 3.4, 3.9, 5.1–5.9, 6.1–6.12, 13.6–13.9, 14.3_
  - [x] 4.4 Update MockMapsProvider to new interface
    - Rewrite `src/services/maps/mock.ts` to implement the 5-method interface
    - Accept sessionToken parameters on autocomplete and resolvePlace without issuing network calls
    - Return fixture data using valid encoded polyline strings (≥3 coordinate pairs per route)
    - Remove `trafficFor` and `tilesUrl` implementations
    - Ensure deterministic output with no time/random dependencies
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 15.2_
  - [x] 4.5 Update service factory to use GoogleMapsProvider
    - Update `src/services/index.ts` to import and return `GoogleMapsProvider` in live mode
    - Pass `GOOGLE_MAPS_SERVER_KEY` to provider constructor
    - Keep mock mode returning `MockMapsProvider`
    - _Requirements: 2.2, 12.6_
  - [x] 4.6 Write integration tests for GoogleMapsProvider via MSW
    - Create `tests/integration/services/googleMapsProvider.test.ts`
    - Create/update `tests/integration/services/mswHandlers.ts` with Google API mock handlers
    - Test autocomplete: success, empty, malformed prediction, 400, 403, 429, 500, timeout
    - Test resolvePlace: success, missing location, invalid placeId, quota error
    - Test geocode: success, zero results
    - Test reverseGeocode: success, zero results, invalid coordinates
    - Test route: DRIVE, TWO_WHEELER, TRANSIT, WALK success, partial failure, total failure
    - Verify field masks are present and not `*`
    - Verify no server key appears in response bodies
    - _Requirements: 5.1–5.9, 6.1–6.12, 14.1_
  - [x] 4.7 Write property test for parseGoogleDuration
    - **Property 11: Duration Parsing Correctness**
    - For any valid duration string matching `/^\d+(\.\d+)?s$/`, returns `Math.ceil` of numeric value
    - For any invalid/empty/undefined input, returns 0 and never throws
    - **Validates: Requirements 6.10**
  - [x] 4.8 Write property test for buildCacheKey determinism
    - **Property 10: Cache Key Determinism**
    - For any two requests with identical rounded coords, sorted modes, and time bucket, produces identical keys
    - **Validates: Requirements 7.2, 7.4**
  - [x] 4.9 Write property test for partial failure tolerance
    - **Property 3: Partial Failure Tolerance**
    - For any route request with N modes where K succeed (1 ≤ K < N), response contains exactly K routes
    - **Validates: Requirements 6.2, 13.3**
  - [x] 4.10 Write property test for domain mode preservation
    - **Property 4: Domain Type Preservation**
    - For any adapted RouteOption, `modes[0]` is always the domain mode, never a Google enum
    - **Validates: Requirements 6.4, 14.3**

- [x] 5. Stage 2 Checkpoint
  - Ensure all tests pass, no live Google API calls occur in test suite
  - Ask the user if questions arise

- [x] 6. Stage 3: Planner Place Flow
  - [x] 6.1 Create `/api/maps/place` route handler
    - Create `src/app/api/maps/place/route.ts` with GET handler
    - Validate `placeId`, `sessionToken`, `label` params with Zod
    - Reject with VALIDATION_ERROR if sessionToken is empty
    - Call `GoogleMapsProvider.resolvePlace` (or mock in mock mode)
    - Return adapted `GeoResult`, never raw Google response
    - _Requirements: 3.5, 3.6, 14.4, 15.4, 15.6_
  - [x] 6.2 Create session token hook
    - Create or update `src/hooks/useSessionToken.ts`
    - Generate UUID v4 on focus-when-empty, after selection, and after clear
    - Maintain separate tokens for From and To fields
    - Never persist tokens to localStorage or IndexedDB
    - Do not regenerate on refocus when field has text or resolved place
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 6.3 Update useAutocomplete hook
    - Update `src/hooks/useAutocomplete.ts` to accept and pass `sessionToken` and `bias` parameters
    - Enforce 300ms debounce and minimum 3-character threshold
    - Truncate input exceeding 100 characters
    - Abort prior pending requests on new input
    - Return empty suggestions for <3 characters without sending request
    - _Requirements: 3.1, 3.2, 3.7, 3.8_
  - [x] 6.4 Update AddressAutocomplete component for place resolution
    - Update `src/components/planner/AddressAutocomplete.tsx`
    - On suggestion select: call `/api/maps/place` with sessionToken and label, then reset session
    - On input clear: reset session token
    - On focus-when-empty: generate new session token
    - Display empty list when zero results (no error shown)
    - Retain input text and coords on autocomplete failure
    - Show error notification on place resolution failure (≥5 seconds), keep field editable
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 13.1, 13.2_
  - [x] 6.5 Update geolocation reverse lookup
    - Update the reverse geocode flow to use the new provider interface
    - Ensure browser geolocation coordinates are passed to `/api/maps/reverse-geocode`
    - Handle ZERO_RESULTS → NOT_FOUND error appropriately
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 6.6 Write property test for session token billing optimization
    - **Property 2: Session Token Billing Optimization**
    - Same token used for all autocomplete requests AND final Place Details call within a session
    - New token generated after selection, clear, or focus-on-empty
    - From and To fields use independent tokens
    - **Validates: Requirements 4.2, 4.4**
  - [x] 6.7 Write unit tests for useAutocomplete and AddressAutocomplete
    - Test debounce behavior, abort on re-type, min 3 chars, 100 char truncation
    - Test session token lifecycle through selection and clear flows
    - Test error retention behavior (input text preserved on failure)
    - _Requirements: 3.1, 3.2, 3.7, 13.1, 13.2_

- [x] 7. Stage 3 Checkpoint
  - Ensure all tests pass, verify From/To inputs have independent sessions
  - Selected predictions always contain coordinates before route submit
  - Ask the user if questions arise

- [x] 8. Stage 4: Routing Switch + MapmyIndia Removal
  - [x] 8.1 Complete route handler adaptation
    - Update `src/app/api/maps/route/route.ts` (POST handler) to use new provider route method
    - Implement 5-minute TTL LRU cache (max 100 entries) with deterministic cache key
    - Round coordinates to 4 decimal places, sort modes alphabetically, bucket departure time to 5-min intervals
    - Support `?fresh=1` to bypass cache read (still write result to cache)
    - Never cache error responses
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 8.2 Update FromToForm and usePlanTrip for new route flow
    - Ensure route request is not submitted with undefined coordinates
    - Handle partial mode success (display only successful route cards)
    - Handle all-mode failure (display PlanErrorState with retry)
    - _Requirements: 6.1, 13.3, 13.4_
  - [x] 8.3 Delete MapmyIndia provider, Nominatim provider, and traffic endpoint
    - Delete `src/services/maps/mapmyindia.ts`
    - Delete `src/services/maps/nominatim.ts`
    - Delete `src/app/api/maps/traffic/route.ts`
    - Delete all MapmyIndia/Nominatim fixtures and test files
    - _Requirements: 15.5, 16.1, 16.2_
  - [x] 8.4 Clean all MapmyIndia/Nominatim/traffic references
    - Remove all imports and references to deleted providers across the codebase
    - Ensure `rg -ni "mapmyindia|mappls|nominatim" src tests package.json .env.example` returns no results
    - Update any remaining route handlers that referenced old providers
    - _Requirements: 16.1_
  - [x] 8.5 Write property test for key isolation
    - **Property 1: Key Isolation**
    - For any response from Route_Handlers and any error from Google_Provider, never contains server key value, key substrings, internal URLs, or Google headers
    - **Validates: Requirements 2.5, 13.8, 14.1**
  - [x] 8.6 Write integration tests for route caching behavior
    - Test cache hit returns same response without Google call
    - Test `?fresh=1` bypasses cache read
    - Test error responses are not cached
    - Test deterministic cache key generation
    - _Requirements: 7.1–7.5_

- [x] 9. Stage 4 Checkpoint
  - Ensure all tests pass, verify no MapmyIndia/Nominatim references remain
  - Verify route computation works for all modes via MSW
  - Ask the user if questions arise

- [x] 10. Stage 5: MapLibre → Google Maps Rendering
  - [x] 10.1 Create Google Maps loader module
    - Create `src/lib/googleMapsLoader.ts` as client-only singleton
    - Call `setOptions` once with `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` (idempotent)
    - Expose `loadMapsLibrary()`, `loadMarkerLibrary()`, and `isGoogleMapsConfigured()`
    - Prevent duplicate script initialization
    - Normalize loader errors
    - _Requirements: 8.1, 8.2_
  - [x] 10.2 Rewrite MapCanvas with google.maps.Map
    - Rewrite `src/components/map/MapCanvas.tsx`
    - Instantiate `google.maps.Map` once after mount with mapId
    - Provide map instance through `MapInstanceContext`
    - Render loading skeleton while initializing, error state on failure
    - Update `src/components/map/MapInstanceContext.ts` to use `google.maps.Map | null`
    - Route cards and form inputs remain functional if map fails
    - Clean up all listeners on unmount
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 2.4_
  - [x] 10.3 Rewrite RouteOverlay with google.maps.Polyline
    - Rewrite `src/components/map/RouteOverlay.tsx`
    - Create one Polyline per route with decoded encoded polyline coordinates
    - Skip routes with absent or zero-point geometry
    - Selected route: stroke weight 6, opacity 1.0, higher z-index
    - Unselected routes: stroke weight 3, opacity 0.5
    - Mode-specific stroke colors
    - Click listener triggers route selection
    - Call `setMap(null)` on all polylines and remove listeners on cleanup/route change
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 10.4 Rewrite WeatherLayer with AdvancedMarkerElement
    - Rewrite `src/components/map/WeatherLayer.tsx`
    - Load `marker` library lazily via `loadMarkerLibrary()`
    - Create one `AdvancedMarkerElement` per sampled waypoint with weather icon
    - Skip creation when geometry, weather risk, or map is absent
    - Defer creation if map instance unavailable until it becomes available
    - Remove markers, unmount React roots, clear refs on route change/unmount
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 10.5 Rewrite MapControls with TrafficLayer/TransitLayer
    - Rewrite `src/components/map/MapControls.tsx`
    - Default to base layer (no overlay)
    - Cycle: base → traffic → transit → base
    - Attach/detach layers mutually exclusively (at most one overlay at a time)
    - Call `setMap(null)` on all layers on unmount
    - Skip operations if map instance is unavailable
    - Include recenter (`panTo` + `setZoom(12)`) and fit-route (`fitBounds`) controls
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  - [x] 10.6 Update TripPlanClient and trip plan page
    - Simplify `src/app/trip/plan/page.tsx` to stop constructing maps provider server-side
    - Remove tile URL props from `src/components/trip/TripPlanClient.tsx`
    - Retain list/map mobile tabs, route selection, weather overlay, traffic polling, route sorting
    - Default sort to `fastest`
    - _Requirements: 8.4, 13.5_
  - [x] 10.7 Remove maplibre-gl dependency
    - Remove `maplibre-gl` from `package.json` dependencies
    - Add `@googlemaps/js-api-loader` to dependencies
    - Add `@types/google.maps` to devDependencies
    - Run `pnpm install` to update lockfile
    - Verify no MapLibre types or imports remain in source
    - _Requirements: 16.2, 16.3_
  - [x] 10.8 Write property test for layer exclusivity
    - **Property 7: Layer Exclusivity**
    - For any sequence of layer switches, at most one overlay (TrafficLayer OR TransitLayer) is attached at any time
    - **Validates: Requirements 11.4**
  - [x] 10.9 Write property test for route overlay fidelity
    - **Property 15: Route Overlay Fidelity**
    - For N routes with valid geometry, exactly N Polyline instances are created
    - Selected route has strictly greater stroke weight, opacity, and z-index than unselected
    - **Validates: Requirements 9.1, 9.2**
  - [x] 10.10 Write unit tests for map component lifecycle and cleanup
    - Test MapCanvas loading/error/ready states
    - Test RouteOverlay cleanup on route change and unmount (setMap(null) called)
    - Test WeatherLayer marker removal on route change and unmount
    - Test MapControls layer detachment on unmount
    - _Requirements: 8.5, 9.4, 10.3, 11.7_

- [x] 11. Stage 5 Checkpoint
  - Ensure all tests pass
  - Verify `rg -ni "maplibre|openstreetmap|carto|tilesUrl" src tests package.json` returns no results
  - Ask the user if questions arise

- [x] 12. Stage 6: Docs, Privacy, CI, Cleanup
  - [x] 12.1 Update .env.example with new environment variables
    - Replace `NEXT_PUBLIC_MAPS_KEY` and `MAPS_SECRET` with Google variables
    - Add `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `GOOGLE_MAPS_SERVER_KEY`
    - Keep `NEXT_PUBLIC_USE_MOCK_SERVICES=true` and `OWM_KEY`
    - Remove `MAPS_CLIENT_ID` references
    - _Requirements: 16.5_
  - [x] 12.2 Update privacy page
    - Update `src/app/privacy/page.tsx` to state Google Places, Routes, and Maps JS API usage
    - Remove MapmyIndia/Nominatim references
    - Keep OpenWeatherMap disclosure
    - _Requirements: 16.1_
  - [x] 12.3 Update CI workflow
    - Update `.github/workflows/ci.yml` to set `NEXT_PUBLIC_USE_MOCK_SERVICES=true` in test env
    - Ensure no live Google API keys are required for CI
    - Ensure mock mode builds and tests pass without credentials
    - _Requirements: 12.2, 12.6_
  - [x] 12.4 Final dependency and reference cleanup
    - Verify no `mapmyindia`, `mappls`, `nominatim`, `maplibre`, `openstreetmap` references in src, tests, or config
    - Verify `pnpm-lock.yaml` has no references to `maplibre-gl`, `recharts`, or `idb-keyval`
    - Remove `TileLayer` type from `src/types/data-models.ts` if still present
    - _Requirements: 16.1, 16.2, 16.6_
  - [x] 12.5 Write security verification tests
    - Test that `GOOGLE_MAPS_SERVER_KEY` does not appear in `.next/static/` after build
    - Test that API error responses never echo request headers or keys
    - Test that mock mode produces zero Google network calls
    - _Requirements: 2.5, 2.7, 14.1, 14.5, 14.6_

- [x] 13. Stage 6 Checkpoint
  - Ensure full build passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
  - Ask the user if questions arise

- [x] 14. Stage 7: E2E Verification
  - [x] 14.1 Write Playwright tests for full planner flow in mock mode
    - Test: Home page loads without dashboard navigation
    - Test: `/dashboard` returns 404
    - Test: User searches and selects From and To locations via autocomplete
    - Test: User submits and receives multiple route options
    - Test: Route cards display weather enrichment
    - Test: Sort mode change re-orders route cards
    - Test: User selects a route from the list
    - Test: Mobile map tab switch works
    - Test: Share-trip link round-trip remains valid
    - All tests run in mock mode with `NEXT_PUBLIC_USE_MOCK_SERVICES=true`
    - _Requirements: 1.2, 1.3, 12.2, 13.3, 13.4_
  - [x] 14.2 Run complete verification suite
    - Execute: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, `pnpm build`, `pnpm test:e2e`
    - All commands must pass with zero failures
    - No test depends on live Google or OpenWeatherMap credentials
    - _Requirements: 1.8, 12.2_

- [x] 15. Final Checkpoint
  - Ensure all tests pass end-to-end
  - Verify mock mode works completely without external keys
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between stages
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Stage 8 (Manual Live Verification) is owner-performed with real keys and not included as a coding task
- The `AGENTS.md` rule requires reading Next.js 16 docs before modifying Next.js files — this applies during implementation of each task

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6"] },
    { "id": 3, "tasks": ["2.7"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "4.6", "4.7", "4.8"] },
    { "id": 7, "tasks": ["4.9", "4.10"] },
    { "id": 8, "tasks": ["6.1", "6.2"] },
    { "id": 9, "tasks": ["6.3", "6.5"] },
    { "id": 10, "tasks": ["6.4", "6.6", "6.7"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2", "8.3"] },
    { "id": 13, "tasks": ["8.4", "8.5", "8.6"] },
    { "id": 14, "tasks": ["10.1"] },
    { "id": 15, "tasks": ["10.2", "10.7"] },
    { "id": 16, "tasks": ["10.3", "10.4", "10.5"] },
    { "id": 17, "tasks": ["10.6", "10.8", "10.9", "10.10"] },
    { "id": 18, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 19, "tasks": ["12.4", "12.5"] },
    { "id": 20, "tasks": ["14.1"] },
    { "id": 21, "tasks": ["14.2"] }
  ]
}
```
