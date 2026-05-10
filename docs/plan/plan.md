# CommuteWise — Incremental Development Plan (MVP-1)

> **Methodology**: Spec-Driven Development. Every phase has a clear scope, deliverables, tests, and a Definition of Done (DoD). Phases are sequential but each one ships a _runnable, demonstrable_ increment.

> **Companion documents**:
>
> - [`architecture.md`](./architecture.md) — System architecture, layering, data flow
> - [`api-design.md`](./api-design.md) — External API contracts and internal service interfaces
> - [`data-models.ts`](./data-models.ts) — Canonical TypeScript types
> - [`folder-structure.md`](./folder-structure.md) — Directory layout
> - [`testing-strategy.md`](./testing-strategy.md) — Test layers, tooling, coverage targets
> - [`phase-breakdown.md`](./phase-breakdown.md) — Detailed checklist per phase

---

## Status (as of 2026-05-05)

MVP-1 is essentially shipped. All 15 phases have landed code; the only outstanding code-side gap is generating manifest icons for the PWA install. The remaining items are CI gates, manual cross-browser QA, and deployment.

| Phase                         | Status | Outstanding                                                                                                              |
| ----------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------ |
| 1 — Project Foundation        |   ✅   | —                                                                                                                        |
| 2 — Design System & Shell     |   ✅   | —                                                                                                                        |
| 3 — Data Models & Local Store |   ✅   | —                                                                                                                        |
| 4 — Service Layer Adapters    |   ✅   | —                                                                                                                        |
| 5 — Quick Planner             |   ✅   | —                                                                                                                        |
| 6 — Trip Planning Engine      |   ✅   | —                                                                                                                        |
| 7 — Weather Intelligence      |   ✅   | —                                                                                                                        |
| 8 — Map Visualization         |   ✅   | —                                                                                                                        |
| 9 — Real-Time Conditions      |   🟡   | Per-segment traffic overlay + transit-delay banner — deferred (free-tier API limits)                                     |
| 10 — Dashboard                |   ✅   | —                                                                                                                        |
| 11 — Additional Tools         |   ✅   | —                                                                                                                        |
| 12 — Notifications            |   🟡   | Service-worker push handler — deferred (needs backend; out of portfolio scope)                                           |
| 13 — PWA & Offline            |   🟡   | **Generate manifest icons** (`/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`) — only actionable code-side gap |
| 14 — A11y / SEO / Perf        |   🟡   | Full axe sweep, JS bundle-budget CI gate, Lighthouse CI thresholds (CI gates, not code)                                  |
| 15 — Hardening & Release      |   🟡   | Manual cross-browser QA matrix, tag `v0.1.0`, deploy                                                                     |

See [`phase-breakdown.md`](./phase-breakdown.md) for the line-item checklist.

---

## 0. Guiding Principles

1. **No premature abstraction.** Build the simplest thing that works for MVP-1; refactor when a second use case appears.
2. **Local-first.** All user data lives in IndexedDB/localStorage. No accounts, no servers other than thin Next.js Route Handlers that proxy 3rd-party APIs to keep keys server-side.
3. **Offline-first.** The app must remain useful when the network is flaky. Cache aggressively; degrade gracefully.
4. **Mobile-first.** Design and test on a 360px viewport before desktop polish.
5. **Heavily documented.** JSDoc on every exported symbol. README at every layer (`src/services/README.md`, etc.). Inline comments only when the _why_ is non-obvious.
6. **Test what matters.** Unit-test pure logic (route scoring, weather impact). Integration-test stores and services. E2E-test the 3 critical user flows.

---

## 1. Tech Stack (locked)

| Layer     | Choice                                                       | Reason                                                                    |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Framework | Next.js 14+ (App Router)                                     | SSR for landing-page SEO, Route Handlers as API key proxy                 |
| Language  | TypeScript (strict)                                          | Compile-time safety on data models that flow between map/weather services |
| Styling   | Tailwind CSS + shadcn/ui                                     | Mobile-first utilities + accessible primitives                            |
| State     | Zustand (with `persist` + `idb-keyval` storage)              | Tiny API, IndexedDB-friendly persistence                                  |
| Maps      | MapmyIndia (primary), Google Maps (fallback adapter)         | India-first; abstracted behind `MapsProvider` interface                   |
| Weather   | OpenWeatherMap One Call 3.0                                  | Current + hourly + AQI in one call                                        |
| PWA       | `next-pwa` (Workbox)                                         | Service worker, offline cache, install prompt                             |
| Testing   | Vitest + React Testing Library + Playwright                  | Fast unit/integration + reliable E2E                                      |
| Linting   | ESLint (next/core-web-vitals) + Prettier + TypeScript strict | Consistency                                                               |
| Charts    | Recharts                                                     | Used only in Dashboard insights                                           |

---

## 2. Phase Overview

| Phase  | Theme                     | Approx. effort | Status | Ships                                                            |
| ------ | ------------------------- | -------------- | :----: | ---------------------------------------------------------------- |
| **1**  | Project foundation        | 0.5 day        |   ✅   | Empty Next.js app, lint/test/CI green                            |
| **2**  | Design system & shell     | 1 day          |   ✅   | Layout, theme, navigation, dark mode                             |
| **3**  | Data models & local store | 1 day          |   ✅   | Zustand stores + IndexedDB persistence + tests                   |
| **4**  | Service layer adapters    | 1.5 days       |   ✅   | Maps + Weather + Geo adapters with mocks                         |
| **5**  | Quick Planner (Home)      | 1.5 days       |   ✅   | From/To inputs, autocomplete, geolocation                        |
| **6**  | Trip planning engine      | 2 days         |   ✅   | Multi-modal routes + sorting + step-by-step                      |
| **7**  | Weather intelligence      | 1.5 days       |   ✅   | Forecast along route, impact analysis, gear suggestions          |
| **8**  | Map visualization         | 1.5 days       |   ✅   | Full-screen map, route overlay, weather layer                    |
| **9**  | Real-time conditions      | 1 day          |   🟡   | Traffic polling + reroute prompt (overlay/transit deferred)      |
| **10** | Dashboard                 | 2 days         |   ✅   | Saved locations, recurring commutes, history, insights           |
| **11** | Additional tools          | 1 day          |   ✅   | Cost calc, carbon, checklist, share-trip link                    |
| **12** | Notifications             | 0.5 day        |   🟡   | Local notifications + leave-now (SW push deferred)               |
| **13** | PWA & offline polish      | 1 day          |   🟡   | Service worker, install prompt, offline fallback (icons pending) |
| **14** | Accessibility, SEO, perf  | 1 day          |   🟡   | Code-side a11y/SEO done; CI perf gates deferred                  |
| **15** | Hardening & release       | 0.5 day        |   🟡   | Error boundaries + telemetry done; QA + deploy pending           |

**Total**: ~17 working days for a single engineer.

---

## 3. Phase Details

### Phase 1 — Project Foundation ✅

**Goal**: Bootable Next.js project with all tooling green.
**Scope**:

- `create-next-app` with TS, App Router, Tailwind, ESLint.
- Add Prettier, Husky pre-commit (lint + typecheck), commitlint.
- Vitest + RTL setup; Playwright skeleton.
- `.env.example` documenting `NEXT_PUBLIC_MAPS_KEY`, `MAPS_SECRET`, `OWM_KEY`.
- GitHub Actions: typecheck → lint → test → build.
- README with setup steps.

**Tests**: a smoke unit test (`1 + 1 === 2`), a smoke Playwright test that loads `/`.

**DoD**:

- `pnpm dev` boots. `pnpm test` passes. `pnpm build` succeeds. CI green on a throwaway commit.

---

### Phase 2 — Design System & App Shell ✅

**Goal**: Consistent look-and-feel before any feature work.
**Scope**:

- Install shadcn/ui core components (Button, Input, Card, Dialog, Sheet, Tabs, Toast).
- Theme tokens in `tailwind.config.ts` (brand color, spacing scale).
- `next-themes` for dark/light with system default.
- App shell: `src/app/layout.tsx` with header, mobile bottom nav, content slot.
- Loading skeletons + error boundary component.

**Tests**:

- Snapshot test for the layout.
- Theme toggle integration test (Vitest + RTL).
- a11y check via `@axe-core/react` in dev.

**DoD**:

- All shadcn components render in both themes.
- Mobile bottom nav visible < 768px; replaced by sidebar ≥ 768px.

---

### Phase 3 — Data Models & Local Store ✅

**Goal**: Single source of truth for all entities, persisted locally.
**Scope**:

- Implement types from [`data-models.ts`](./data-models.ts).
- Zustand stores:
  - `useLocationsStore` (saved locations)
  - `usePreferencesStore` (transport priority, walk limit, weather sensitivity)
  - `useHistoryStore` (commute log, capped at 500 entries)
  - `useRecurringStore` (recurring commutes — required by Phases 10 & 12)
  - `useTripStore` (current trip session, ephemeral)
- Persistence via `zustand/middleware` + custom `idb-keyval` storage adapter.
- Migration framework (`schemaVersion` field; runs `migrate(state, fromVersion)`).

**Tests** (Vitest):

- Adding/removing/updating saved locations enforces 15-item cap.
- Preferences default values are applied on first load.
- History trimming at 500.
- Migration from `v0` to `v1` on a hand-crafted blob.
- Persistence round-trip via fake-indexeddb.

**DoD**:

- 100% line coverage on stores.
- Hard-refresh in browser preserves a saved location.

---

### Phase 4 — Service Layer Adapters ✅

**Goal**: Pluggable maps + weather + geolocation with strict interfaces and mockable defaults.
**Scope**:

- `MapsProvider` interface: `geocode`, `reverseGeocode`, `autocomplete`, `route(req: RouteRequest)`, `trafficFor(routeId)`, `tilesUrl(layer: TileLayer)`.
- `MapmyIndiaProvider` + `GoogleMapsProvider` (stub) behind feature flag.
- `WeatherProvider` interface: `current`, `hourly(coords)`, `airQuality(coords)`.
- `OpenWeatherMapProvider`.
- `GeolocationService`: `getCurrent()` + `watch(cb)` wrapping `navigator.geolocation` with permission handling.
- Server-side Route Handlers (`app/api/maps/*`, `app/api/weather/*`) so secret keys never ship to the client.
- Caching layer (in-memory LRU with 5-min TTL on the server, SWR on the client).
- Telemetry hooks (no-op for MVP; emit `service.call` events to console).

**Tests**:

- Contract tests against an in-memory `MockMapsProvider` and `MockWeatherProvider`.
- Route Handler tests with `next/test` + msw.
- Cache hit/miss assertions.

**DoD**:

- Swapping providers requires changing only `services/index.ts`.
- No client bundle contains `OWM_KEY` or `MAPS_SECRET` (verified via grep on `.next/static`).

---

### Phase 5 — Quick Planner (Home) ✅

**Goal**: User can type/select From + To and hit "Plan My Trip".
**Scope**:

- Hero with `From` and `To` inputs (shadcn `Combobox` powered by autocomplete).
- "Use current location" button → `navigator.geolocation` → reverse-geocode.
- Quick chips: Home / Office (pulled from `useLocationsStore`).
- "Today's Commute" card: shows next recurring commute if any, else CTA to set one.
- Form validation (Zod): non-empty, distinct from-to, optional time.

**Tests**:

- RTL: typing triggers debounced autocomplete (msw-mocked).
- Geolocation mocked + reverse-geocode flow.
- Form errors display correctly.

**DoD**:

- On submit, navigates to `/trip/plan?from=…&to=…` with state hydrated.

---

### Phase 6 — Trip Planning Engine ✅

**Goal**: Compute and display 3–5 route options.
**Scope**:

- `services/routing.ts`: orchestrates `MapsProvider.route` for each mode (car, two-wheeler, transit, cab, walk, mixed).
- Pure scoring functions in `lib/scoring.ts`:
  - `scoreFastest`, `scoreCheapest`, `scoreLeastTransfers`, `scoreEco`.
- Sort tabs: Fastest | Cheapest | Least transfers | Eco.
- Route card: total time, cost, transfers, walk distance, weather risk badge (placeholder until Phase 7).
- Step-by-step directions in expandable section.
- Loading skeleton + empty state + error state.

**Tests** (Vitest, fixture-based):

- Scoring functions are pure and deterministic.
- Sorting respects ties (stable).
- Multi-modal merge: a transit-only route never appears under "Two-wheeler" tab.

**DoD**:

- For Bangalore demo coords (Indiranagar → Whitefield), all 4 sort modes produce sensible orderings.

---

### Phase 7 — Weather Intelligence ✅

**Goal**: Each route is annotated with weather risk and gear suggestions.
**Scope**:

- `services/routing.ts.enrichWithWeather()`: samples forecast at route waypoints (every ~5 km or 15 min) via `WeatherProvider`.
- `lib/weatherImpact.ts` (pure):
  - `computeRainRisk`, `computeFloodRisk`, `computeHeatRisk`, `computeAQIRisk`.
  - Each returns `{ level: 'low'|'moderate'|'high'|'severe', reason: string }`.
- `lib/gearSuggestions.ts`: maps risk profile → gear list (umbrella, raincoat, mask, hydration).
- Weather risk badge on each route card; expand → shows hour-by-hour mini timeline.

**Tests**:

- Snapshot of impact analyzer for 12 fixture forecasts.
- Gear suggestion table covers every combination of risk level × mode.

**DoD**:

- Heavy-rain fixture surfaces flood risk + raincoat + extra travel time advisory.

---

### Phase 8 — Map Visualization ✅

**Goal**: Full-screen interactive map for the selected route.
**Scope**:

- `/trip/[id]/map` page: full-bleed MapmyIndia map.
- Route polyline rendering with mode-colored segments.
- Weather icons at sampled waypoints (toggle in legend).
- Basic POIs: metro stations, fuel pumps (toggleable layer).
- "Recenter" + "Fit route" controls.

**Tests**:

- Component test that polyline coordinates equal the route's geometry (no transformation drift).
- Manual checklist for mobile pinch-zoom.

**DoD**:

- Switching routes re-renders without leaking listeners (verified via React Profiler).

---

### Phase 9 — Real-Time Conditions 🟡

**Goal**: Live traffic + transit delays inform "best route now".
**Scope**:

- Poll `MapsProvider.traffic(routeId)` every 60s while map page is open (visibility-API gated).
- Public transit delay banner where applicable.
- "Reroute" prompt when ETA changes by >15%.

**Tests**:

- Polling stops when tab is hidden.
- Reroute prompt threshold logic (pure function tests).

**DoD**:

- Killing network for 30s shows a "stale data" indicator; recovers automatically.

**Remaining**: per-segment traffic overlay and transit-delay banner — both deferred. Mappls free tier returns HTTP 412 on `/traffic/api/v2`, and there is no free transit-delay data source for India. Polling + reroute prompt are implemented; see [`phase-breakdown.md`](./phase-breakdown.md#phase-9--real-time-conditions) for details.

---

### Phase 10 — Dashboard ✅

**Goal**: Personal hub for saved locations, recurring commutes, history, insights.
**Scope**:

- `/dashboard` route with tabs: Locations, Recurring, History, Insights, Preferences.
- Saved Locations CRUD (cap 15).
- Recurring Commutes: name, from, to, days-of-week, time, preferred mode.
- History list with filters; "Log actual" button captures real time/cost.
- Insights:
  - Bar chart of weekly time by mode.
  - Total spend (₹) + monthly trend.
  - Carbon footprint estimate.
- Preferences form (writes to `usePreferencesStore`).

**Tests**:

- CRUD enforces caps, validation.
- Insights charts pull from `useHistoryStore` selectors with memoization.

**DoD**:

- Dashboard usable end-to-end without network.

---

### Phase 11 — Additional Tools ✅

**Goal**: One-shot helpers that boost trip-planning UX.
**Scope**:

- Cost Calculator dialog (per-route breakdown editable).
- Carbon Estimate badge per route.
- Weather-Based Essentials Checklist (auto-populated from gear suggestions, user can tick off).
- Share Trip link: encodes route summary in URL hash → opens read-only viewer.

**Tests**:

- Share link round-trip: encode + decode preserves route.
- Carbon estimate matches a published reference table within ±5%.

**DoD**:

- Sharing a trip from device A and opening on device B (same browser) shows the same data without account.

---

### Phase 12 — Notifications & Alerts 🟡

**Goal**: Tell the user when to leave and warn of severe conditions.
**Scope**:

- Permission prompt UI (deferred until user opts in).
- Service worker push handler.
- "Leave now" scheduler: for the next recurring commute, schedules a local notification at `departureTime - travelTime - bufferMinutes`.
- Severe-weather watcher: every 30 min while app is open, checks weather along recurring routes.

**Tests**:

- Schedule math (pure).
- SW push payload parsing.

**DoD**:

- Manual: granted permission shows a test notification in 5s.

**Remaining**: SW push handler — deferred. Web Push requires a backend (VAPID keys + push service), which is out of scope for the portfolio. Local notifications fire only while the tab is open; documented in `useLocalNotifications.ts`.

---

### Phase 13 — PWA & Offline Polish 🟡

**Goal**: Install prompt + meaningful offline experience.
**Scope** (as built):

- Hand-rolled `public/sw.js` (not `next-pwa`): cache-first for static assets, network-first for navigations with offline fallback, network-only for `/api/*`.
- `app/manifest.ts` with theme color and icon references.
- "Add to home screen" custom prompt with 7-day localStorage cooldown.
- `public/offline.html` fallback page.

**DoD**:

- Installs on iOS Safari, Android Chrome, Desktop Chrome.

**Remaining**: generate manifest icons (`/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`). They are referenced in `manifest.ts` but not yet present in `/public` — needs design assets before deploy. **This is the only actionable code-side gap left in MVP-1.**

---

### Phase 14 — Accessibility, SEO, Performance 🟡

**Goal**: Production-grade quality bar.
**Scope**:

- Axe scan zero violations on top 5 routes.
- Lighthouse: Performance ≥ 90, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 90.
- `next/font` for fonts; `next/image` for any raster assets.
- Skip-to-content link, focus rings, ARIA on map controls.
- `metadata` export on every page; sitemap.xml; robots.txt.
- First-load JS budget: < 180 KB gzip on `/`.

**Tests**:

- Lighthouse CI in pipeline (warn-only at first, then fail < threshold).

**DoD**:

- All thresholds met on production build.

**Remaining**: full axe-core + Playwright a11y sweep, `@next/bundle-analyzer` JS-budget enforcement in CI, and Lighthouse CI threshold gates. All are CI gates rather than code changes. Code-side a11y/SEO (skip-link, focus rings, `next/font`, metadata, sitemap, robots) is done.

---

### Phase 15 — Hardening & Release 🟡

**Goal**: Ready to share with real users.
**Scope**:

- Top-level error boundary with friendly message + reload CTA.
- Sentry stub (env-gated; off by default).
- Privacy page (we collect nothing) + open-source license.
- Production env file template.
- Final manual QA pass on iOS Safari, Android Chrome, Desktop Chrome/Firefox/Safari.
- Tag `v0.1.0`.

**DoD**:

- All E2E green. Smoke test on production deploy. README links to live URL.

**Remaining**: manual cross-browser QA matrix, tag `v0.1.0`, deploy. All are user/release tasks rather than code changes. Error boundary, telemetry stub, privacy page, and MIT LICENSE are in place.

---

## 4. Critical User Flows (E2E targets)

1. **Plan a one-way trip** — Land on home → enter from/to → see ≥3 route options → expand directions.
2. **Save & reuse** — Save "Home" → next session, "Home" chip auto-fills From.
3. **Offline replan** — Pre-cache a route → go offline → re-open app → route still visible with stale weather indicator.

---

## 5. Risks & Mitigations

| Risk                            | Mitigation                                                                 |
| ------------------------------- | -------------------------------------------------------------------------- |
| MapmyIndia API surface changes  | `MapsProvider` interface; swap to Google in <1 day                         |
| OWM rate limits                 | Server-side LRU + SWR; one fetch per hour per coord-bucket                 |
| IndexedDB quota in private mode | Fallback to in-memory store with banner                                    |
| Geolocation denied              | Address autocomplete still works; show explainer                           |
| Service worker stale shell      | Skip-waiting + immediate-claim with toast "New version available — reload" |

---

## 6. Out of Scope (post-MVP-1)

- Accounts and cloud sync.
- Multi-stop trips.
- Real-time collaboration / sharing live ETA.
- Native iOS/Android wrappers.
- Hindi/Kannada localization (planned for MVP-2).
- Payment / booking integrations.

---

## 7. Definition of "MVP-1 Done"

A first-time visitor on a mid-range Android phone in Bangalore can:

1. Open the app cold (< 3s LCP).
2. Plan a trip (Indiranagar → MG Road) in < 10 seconds.
3. See weather-aware route recommendations with gear suggestions.
4. Save "Home" and "Office" without creating an account.
5. Re-open the app offline the next day and still get cached results.

When all 5 hold and Phases 1–15 DoDs are checked, MVP-1 is shipped.
