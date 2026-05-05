# CommuteWise — Testing Strategy

## 1. Pyramid

```
            ▲
            │   E2E (Playwright) — 3 critical flows
            │
            │   Integration (Vitest + RTL + msw)
            │   - hooks ↔ services ↔ stores
            │
            │   Unit (Vitest)
            │   - lib/* pure functions
            │   - store reducers / selectors
            │   - service adapters (against mock providers)
            ▼
```

Approximate distribution: **70% unit, 25% integration, 5% E2E**.

## 2. Tooling

| Need                      | Tool                                                 |
| ------------------------- | ---------------------------------------------------- |
| Unit / integration runner | Vitest                                               |
| React component testing   | @testing-library/react + @testing-library/user-event |
| Network mocking           | msw (Node + Browser)                                 |
| IndexedDB in tests        | fake-indexeddb                                       |
| E2E                       | Playwright (Chromium, WebKit, Mobile Chrome)         |
| Accessibility             | @axe-core/playwright + jest-axe (RTL)                |
| Visual regression         | (Phase 14+) Playwright screenshots, threshold 0.1%   |
| Performance               | Lighthouse CI                                        |

## 3. Coverage Targets

| Layer         | Statements | Branches  |
| ------------- | ---------- | --------- |
| `lib/` (pure) | 100%       | 95%       |
| `store/`      | 100%       | 90%       |
| `services/`   | 90%        | 80%       |
| `hooks/`      | 80%        | 70%       |
| `components/` | 60%        | 50%       |
| **Overall**   | **≥ 80%**  | **≥ 70%** |

Coverage gates run in CI; PRs cannot drop overall coverage by more than 1%.

## 4. Test Cases by Module

### 4.1 `lib/scoring.ts`

- Empty route list → returns empty array.
- Stable sort: tied routes preserve original order.
- `scoreEco` weights low-carbon modes higher than cab.
- Each scoring function is **deterministic** (run 1000× with same input, identical output).

### 4.2 `lib/weatherImpact.ts`

- Heavy rain (>10 mm/h) → `flood: high`.
- AQI 5 → `aqi: severe`, gear includes mask.
- Temp > 38 °C → `heat: high`, gear includes water.
- All-clear → `overall: low`, gear is empty.
- Snapshot test against 12 fixture forecasts.

### 4.3 `lib/gearSuggestions.ts`

- Cartesian table over `{mode} × {risk profiles}`; expected gear list snapshot.
- No duplicate gear items.

### 4.4 `lib/carbon.ts`

- Per-mode g CO2 / km within ±5% of published reference (DEFRA/Bangalore Metro figures).
- Mixed mode sums weighted segments.

### 4.5 `lib/polyline.ts`

- Round-trip encode/decode preserves coordinates within 1 e-5 degrees.
- Empty input handled safely.

### 4.6 `store/locationsStore.ts`

- Add up to 15; 16th is rejected with a typed error.
- Update merges fields without losing `createdAt`.
- Remove updates `lastUsedAt` on remaining items.
- Persistence round-trip via `fake-indexeddb`.

### 4.7 `store/preferencesStore.ts`

- Defaults present on cold start.
- Theme change emits a single subscription update.

### 4.8 `store/historyStore.ts`

- Trim at 500 entries (oldest evicted).
- Selector `weeklyInsights(weekStart)` excludes entries outside the week.

### 4.9 `services/maps/*` and `services/weather/*`

- Contract tests run against `MockMapsProvider` and `MockWeatherProvider`.
- Real adapters tested with msw fixtures captured from sandbox APIs.
- Cache: hit/miss/expiry behavior.
- Errors map to `ServiceError` with correct codes (network → `NETWORK_OFFLINE`, 5xx → `PROVIDER_ERROR`).

### 4.10 Route Handlers (`app/api/*`)

- Validation errors return 400 with Zod issues.
- Rate limiter returns 429 after threshold.
- Upstream timeout → 504 with retryable=true.
- API keys never appear in response bodies.

### 4.11 Hooks

- `useAutocomplete`: debounces (300ms), aborts in-flight on new input.
- `useGeolocation`: handles denied permission gracefully.
- `usePlanTrip`: surfaces loading/error/data states correctly.
- `useTrafficPolling`: pauses when `document.hidden`, resumes on visibility.

### 4.12 Components (selected)

- `FromToForm`: validation messages; submit dispatches with correct payload.
- `RouteOptionCard`: renders all fields; expand toggles steps.
- `WeatherRiskBadge`: color matches risk level; aria-label readable.
- `ShareTripDialog`: copy-to-clipboard fallback when API missing.

## 5. End-to-End Tests (Playwright)

### Flow 1 — Plan a one-way trip

1. Visit `/`.
2. Type "Indiranagar" in From, select first suggestion.
3. Type "MG Road" in To, select first suggestion.
4. Click "Plan My Trip".
5. Assert ≥ 3 route cards appear in < 5 s.
6. Click first card → step-by-step expands.

### Flow 2 — Save & reuse a location

1. Plan a trip.
2. From route detail, save destination as "Office".
3. Reload the page; visit `/`.
4. Assert "Office" chip is present and pre-fills the To field on click.

### Flow 3 — Offline replan

1. Plan + view a trip while online (caches it).
2. Set browser offline.
3. Reload the app; assert offline banner.
4. Re-plan the same from-to → cached routes still shown with "stale" indicator.

## 6. CI Pipeline

```
lint  →  typecheck  →  unit  →  integration  →  build  →  e2e (against built app)  →  lighthouse
```

- Each stage fails fast.
- E2E runs on `ubuntu-latest` with all 3 Playwright projects (Chromium, WebKit, Mobile Chrome).
- Lighthouse thresholds (Phase 14): Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 90, PWA ≥ 90.

## 7. Conventions

- One assert per test where reasonable; otherwise group via `describe` / `test.each`.
- Test names read as sentences: `"rejects 16th saved location with QUOTA_EXCEEDED"`.
- No real network in unit/integration tests — msw or mock providers only.
- Fixtures are committed JSON under `tests/fixtures/` and regenerated only via documented scripts.
- Flaky tests are quarantined within 24h: `test.fixme` + linked issue, never `test.skip` silently.
