# CommuteWise — Phase Checklist

A granular, copy-pasteable checklist per phase. Mirrors `plan.md` but with line-item tasks, suggested commits, and verification steps. Use this as the working punch list.

Legend: `[ ]` todo · `[x]` done · `(✓)` verified

---

## Phase 1 — Project Foundation

- [ ] `pnpm create next-app@latest commutewise --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [ ] Add Prettier + `eslint-config-prettier`.
- [ ] Add Husky + lint-staged: `pre-commit` runs `pnpm lint-staged && pnpm typecheck`.
- [ ] Add `commitlint` with conventional commits config.
- [ ] Install Vitest + RTL + jsdom + fake-indexeddb + msw. `pnpm test` runs.
- [ ] Install Playwright; baseline test loads `/`.
- [ ] Add `eslint-plugin-boundaries` config (will become enforcing in Phase 3).
- [ ] `.env.example` with `NEXT_PUBLIC_MAPS_KEY`, `MAPS_SECRET`, `OWM_KEY`.
- [ ] GitHub Actions CI: matrix Node 20.
- [ ] README.

**Verify**: green CI. `pnpm dev` boots at `localhost:3000`.

---

## Phase 2 — Design System & App Shell

- [ ] `pnpm dlx shadcn@latest init`. Add Button, Input, Card, Dialog, Sheet, Tabs, Toast, Skeleton, Badge, DropdownMenu, Popover, Combobox.
- [ ] Tailwind tokens: brand color, radius, shadow scale.
- [ ] Install `next-themes`. Wrap `app/layout.tsx` with provider.
- [ ] `<Header>`, `<BottomNav>` (mobile), `<ThemeToggle>`.
- [ ] `<ErrorBoundary>` + `<OfflineBanner>`.
- [ ] Snapshot test for layout.
- [ ] `axe` smoke test on `/`.

**Verify**: light/dark toggle works. Mobile nav < 768px.

---

## Phase 3 — Data Models & Local Store

- [ ] Copy `docs/plan/data-models.ts` → `src/types/data-models.ts`.
- [ ] `src/store/persistAdapter.ts` wrapping `idb-keyval` to satisfy Zustand `StateStorage`.
- [ ] `src/store/migrations.ts` with `runMigrations(state, fromVersion)`.
- [ ] `useLocationsStore` (CRUD + 15 cap).
- [ ] `usePreferencesStore` (defaults + setters).
- [ ] `useHistoryStore` (append, trim 500, selectors).
- [ ] `useRecurringStore`.
- [ ] `useTripStore` (ephemeral, `sessionStorage`).
- [ ] Tests for each store with `fake-indexeddb`.
- [ ] Enable `eslint-plugin-boundaries` enforcement.

**Verify**: hard refresh persists locations. `pnpm test:coverage` ≥ 95% on stores.

---

## Phase 4 — Service Layer Adapters

- [ ] Define `MapsProvider` + `WeatherProvider` interfaces in `services/*/types.ts`.
- [ ] `services/maps/mapmyindia.ts` (geocode, autocomplete, route, traffic).
- [ ] `services/maps/mock.ts` returning static fixtures.
- [ ] `services/weather/openweathermap.ts`.
- [ ] `services/weather/mock.ts`.
- [ ] `lib/http.ts` with timeout + retry-with-jitter.
- [ ] Route Handlers `app/api/maps/*` + `app/api/weather/*` with Zod validation, LRU cache, rate limiter.
- [ ] `services/index.ts` wires providers from env.
- [ ] Contract tests with msw fixtures.
- [ ] Grep `.next/static` to verify no secret leaks.

**Verify**: provider swap is a 1-line change. CI green.

---

## Phase 5 — Quick Planner (Home)

- [ ] `<FromToForm>` with Zod validation.
- [ ] `<AddressAutocomplete>` (combobox + debounced fetch via `useAutocomplete`).
- [ ] `<QuickLocationChips>` reading from `useLocationsStore`.
- [ ] "Use current location" → `useGeolocation` + reverse-geocode.
- [ ] `<TodaysCommuteCard>` from `useRecurringStore`.
- [ ] Submit → push to `/trip/plan?from=…&to=…`.
- [ ] RTL tests.

**Verify**: Lighthouse mobile perf on `/` ≥ 90 (preliminary).

---

## Phase 6 — Trip Planning Engine

- [ ] `services/routing.ts`: orchestrate per-mode calls + merge.
- [ ] `lib/scoring.ts`: 4 scoring fns + sort utility.
- [ ] `<RouteSortTabs>`, `<RouteOptionCard>`, `<StepByStepList>`.
- [ ] `usePlanTrip` hook: loading / error / data.
- [ ] Empty + error states.
- [ ] Fixture-based unit tests for scoring; integration test for orchestrator.

**Verify**: Indiranagar → Whitefield demo returns ≥ 3 routes; sort tabs reorder sensibly.

---

## Phase 7 — Weather Intelligence

- [ ] `lib/geo.ts` `sampleWaypoints(geometry, everyMeters)`.
- [ ] `services/routing.enrichWithWeather()`.
- [ ] `lib/weatherImpact.ts`.
- [ ] `lib/gearSuggestions.ts`.
- [ ] `<WeatherRiskBadge>` + expandable mini timeline.
- [ ] Snapshot tests on 12 fixture forecasts.

**Verify**: heavy-rain fixture surfaces flood + raincoat + buffer.

---

## Phase 8 — Map Visualization

- [ ] `<MapCanvas>` — MapLibre GL JS wrapper. (Original plan specified MapmyIndia SDK, but Mappls tile streams aren't available on our free tier; we use OSM/CARTO tiles via MapLibre instead. Mappls APIs continue to power geocode/route/traffic data.)
- [ ] `<RouteOverlay>` mode-colored polyline.
- [ ] `<WeatherLayer>` icon markers.
- [ ] `<MapControls>`: recenter, fit-route, layer toggles.
- [ ] No-listener-leak test (mount/unmount 100×).

**Verify**: smooth on a mid-range Android emulator.

---

## Phase 9 — Real-Time Conditions

- [x] `useTrafficPolling` (60 s, visibility-gated). — `src/hooks/useTrafficPolling.ts`
- [x] Reroute prompt at >15% ETA delta. — banner in `TripPlanClient`, math in `src/lib/etaDelta.ts`
- [x] Pure tests for delta logic. — `tests/unit/lib/etaDelta.test.ts` + `tests/unit/hooks/useTrafficPolling.test.ts`
- [ ] ~~Public-transit delay banner.~~ **Deferred** — no free transit-delay data source available for India.
- [ ] ~~Per-segment traffic overlay on map.~~ **Deferred** — Mappls `/traffic/api/v2` and incident endpoints return HTTP 412 on our free tier.

**Caveat (live-API reality):** The current Mappls `route_adv` response on our tier returns a `routability` weight, not a traffic-aware duration (`duration_typical` is absent). The polling infrastructure is in place and visibility-gated, but the reroute prompt rarely fires until either (a) the Mappls tier is upgraded to one that returns traffic-aware durations, or (b) the routing provider is swapped for one that does. The pure delta math + visibility-gating are tested and remain correct regardless of the upstream data source.

**Verify**: tab-hide pauses polling (covered by unit test); offline shows stale indicator.

---

## Phase 10 — Dashboard

- [x] `/dashboard` shell + tabs. — `src/app/dashboard/page.tsx`, `DashboardClient.tsx`
- [x] `<SavedLocationList>` CRUD. — uses existing `useLocationsStore`
- [x] `<RecurringCommuteForm>`. — uses existing `useRecurringStore`
- [x] `<HistoryTable>` + "Log actual" dialog. — uses existing `useHistoryStore`
- [x] `<InsightsCharts>` (Recharts) wired to selectors. — `src/lib/insights.ts` aggregates, charts memoized via `useMemo`
- [x] `<PreferencesForm>`. — uses existing `usePreferencesStore`
- [x] Tests on selectors + memoization. — `tests/unit/lib/insights.test.ts`, `tests/unit/dashboard/*`

**Verify**: dashboard fully usable offline.

---

## Phase 11 — Additional Tools

- [x] `<CostCalculator>` dialog. — `src/lib/costCalculator.ts` (pure) + `src/components/trip/CostCalculatorDialog.tsx`
- [x] Carbon badge on each route card. — `src/components/trip/CarbonBadge.tsx`, low/moderate/high tiers
- [x] `<EssentialsChecklist>` driven by gear suggestions. — `src/components/trip/EssentialsChecklist.tsx`, sessionStorage-backed check state
- [x] `services/share.ts` encode/decode (base64 URL-safe). — versioned payload, validates on decode
- [x] `/share/[token]` read-only viewer. — `src/app/share/[token]/page.tsx` decodes and redirects to `/trip/plan`

**Verify**: share-link round-trip across browsers.

---

## Phase 12 — Notifications & Alerts

- [ ] Permission UX (deferred prompt on intent).
- [ ] SW push handler.
- [ ] `lib/leaveNow.ts` scheduling math + tests.
- [ ] Severe-weather watcher every 30 min on app focus.

**Verify**: granted permission + manual trigger shows test notification.

---

## Phase 13 — PWA & Offline Polish

- [ ] `next-pwa` runtime caching matrix from `architecture.md` §6.
- [ ] `app/manifest.ts` + icons.
- [ ] `<PWAInstallPrompt>` (debounced 7d).
- [ ] `public/offline.html` fallback.
- [ ] Playwright offline scenario green.

**Verify**: Lighthouse PWA ≥ 90.

---

## Phase 14 — Accessibility, SEO, Performance

- [ ] Axe pass on top 5 routes.
- [ ] `next/font` + `next/image` everywhere.
- [ ] Skip-to-content + focus rings.
- [ ] `metadata` exports + sitemap + robots.
- [ ] First-load JS budget enforced via `@next/bundle-analyzer` check in CI.
- [ ] Lighthouse CI with thresholds.

**Verify**: all four Lighthouse categories ≥ stated bars.

---

## Phase 15 — Hardening & Release

- [ ] Top-level error boundary + reload CTA.
- [ ] Sentry stub (opt-in via env).
- [ ] Privacy page + LICENSE.
- [ ] Manual QA matrix: iOS Safari, Android Chrome, Desktop Chrome/Firefox/Safari.
- [ ] Tag `v0.1.0` and deploy.

**Verify**: production smoke test of all 3 E2E flows.

---

## Definition-of-Done quick reference

A phase is **done** when:

1. All checkboxes are checked.
2. New code is covered per `testing-strategy.md` thresholds.
3. CI is green on the phase's PR.
4. The "Verify" line at the bottom of the phase has been hand-tested and recorded in the PR description.
