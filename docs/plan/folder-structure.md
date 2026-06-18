# CommuteWise — Folder Structure

```
commutewise/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # typecheck, lint, test, build
│       └── lighthouse.yml          # PWA / performance audits
├── .husky/
│   └── pre-commit                  # lint-staged + typecheck
├── public/
│   ├── icons/                      # PWA icons (192, 384, 512)
│   ├── manifest.webmanifest
│   ├── robots.txt
│   └── offline.html
├── docs/
│   └── plan/                       # this folder
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (marketing)/
│   │   │   └── page.tsx            # landing / quick planner
│   │   ├── trip/
│   │   │   ├── plan/
│   │   │   │   ├── page.tsx        # route options list
│   │   │   │   └── loading.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # route detail
│   │   │       └── map/
│   │   │           └── page.tsx    # full-screen map
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── locations/page.tsx
│   │   │   ├── recurring/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── insights/page.tsx
│   │   │   └── preferences/page.tsx
│   │   ├── share/[token]/page.tsx  # read-only shared trip
│   │   ├── api/
│   │   │   ├── maps/
│   │   │   │   ├── autocomplete/route.ts
│   │   │   │   ├── geocode/route.ts
│   │   │   │   ├── reverse-geocode/route.ts
│   │   │   │   ├── route/route.ts
│   │   │   │   └── traffic/route.ts
│   │   │   └── weather/
│   │   │       ├── current/route.ts
│   │   │       ├── hourly/route.ts
│   │   │       └── aqi/route.ts
│   │   ├── layout.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── globals.css
│   │   └── manifest.ts             # generates manifest.webmanifest
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn primitives (generated)
│   │   ├── shell/
│   │   │   ├── Header.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── PWAInstallPrompt.tsx
│   │   ├── planner/
│   │   │   ├── FromToForm.tsx
│   │   │   ├── AddressAutocomplete.tsx
│   │   │   ├── QuickLocationChips.tsx
│   │   │   └── TodaysCommuteCard.tsx
│   │   ├── routes/
│   │   │   ├── RouteOptionCard.tsx
│   │   │   ├── RouteSortTabs.tsx
│   │   │   ├── StepByStepList.tsx
│   │   │   └── WeatherRiskBadge.tsx
│   │   ├── map/
│   │   │   ├── MapCanvas.tsx
│   │   │   ├── RouteOverlay.tsx
│   │   │   ├── WeatherLayer.tsx
│   │   │   └── MapControls.tsx
│   │   ├── dashboard/
│   │   │   ├── SavedLocationList.tsx
│   │   │   ├── RecurringCommuteForm.tsx
│   │   │   ├── HistoryTable.tsx
│   │   │   ├── InsightsCharts.tsx
│   │   │   └── PreferencesForm.tsx
│   │   ├── tools/
│   │   │   ├── CostCalculator.tsx
│   │   │   ├── EssentialsChecklist.tsx
│   │   │   └── ShareTripDialog.tsx
│   │   └── feedback/
│   │       ├── ErrorBoundary.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingSkeleton.tsx
│   │       └── OfflineBanner.tsx
│   │
│   ├── hooks/
│   │   ├── useAutocomplete.ts
│   │   ├── useGeolocation.ts
│   │   ├── usePlanTrip.ts
│   │   ├── useWeatherAlong.ts
│   │   ├── useTrafficPolling.ts
│   │   ├── useDebouncedValue.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── services/
│   │   ├── index.ts                # provider wiring
│   │   ├── README.md
│   │   ├── maps/
│   │   │   ├── types.ts
│   │   │   ├── mapmyindia.ts
│   │   │   ├── googleMaps.ts       # stub for fallback
│   │   │   └── mock.ts             # for tests
│   │   ├── weather/
│   │   │   ├── types.ts
│   │   │   ├── openweathermap.ts
│   │   │   └── mock.ts
│   │   ├── geolocation.ts
│   │   ├── routing.ts              # orchestrator
│   │   └── share.ts                # encode/decode trip share links
│   │
│   ├── store/
│   │   ├── index.ts
│   │   ├── README.md
│   │   ├── locationsStore.ts
│   │   ├── preferencesStore.ts
│   │   ├── historyStore.ts
│   │   ├── tripStore.ts
│   │   ├── recurringStore.ts
│   │   ├── persistAdapter.ts       # idb-keyval bridge
│   │   └── migrations.ts
│   │
│   ├── lib/
│   │   ├── scoring.ts              # pure: fastest/cheapest/transfers/eco
│   │   ├── weatherImpact.ts        # pure: risk computation
│   │   ├── gearSuggestions.ts      # pure: risk → gear mapping
│   │   ├── carbon.ts               # pure: g CO2 per mode/distance
│   │   ├── polyline.ts             # encode/decode
│   │   ├── time.ts                 # date/duration helpers
│   │   ├── money.ts                # paise formatting
│   │   ├── distance.ts
│   │   ├── geo.ts                  # haversine, sampling, bbox
│   │   ├── ids.ts                  # stable id generator
│   │   ├── zod-schemas.ts
│   │   ├── env.ts                  # typed env access
│   │   ├── http.ts                 # fetch wrapper with retry/timeout
│   │   └── logger.ts
│   │
│   ├── types/
│   │   ├── index.ts                # re-exports from data-models.ts
│   │   └── data-models.ts          # canonical types
│   │
│   └── styles/
│       └── tokens.css              # CSS variables consumed by Tailwind
│
├── tests/
│   ├── unit/                       # mirrors src/lib and src/store
│   ├── integration/                # services + stores + hooks
│   ├── e2e/                        # Playwright
│   └── fixtures/                   # static JSON fixtures
│
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── eslint.config.mjs               # boundaries plugin
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json                   # strict
├── vitest.config.ts
├── playwright.config.ts
├── package.json
└── README.md
```

## Layer Boundary Rules (enforced via ESLint)

```
app        → components, hooks, lib, types
components → components, hooks, lib, types
hooks      → services, store, lib, types
services   → lib, types
store      → lib, types
lib        → types
types      → (none)
```

Any reverse dependency is a build-failing error.

## Conventions

- File names: `kebab-case.tsx` for components is _avoided_ — components are `PascalCase.tsx` to match the export.
- Each top-level folder under `src/` has a `README.md` describing its responsibility.
- Tests live next to fixtures under `tests/`, mirroring the `src/` path. Co-located `*.test.ts` is allowed only for tightly coupled unit tests.
- All imports use the `@/` alias mapped to `src/`.
