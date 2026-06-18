# Project Status

Last reviewed: 2026-06-18

## Objective

Ship a dependable weather-aware trip-planning MVP before adding more features.

## MVP Status

| Area                       | Status  | Notes                                                                |
| -------------------------- | ------- | -------------------------------------------------------------------- |
| Local setup                | Ready   | Frozen install works; mock services require no API keys              |
| Trip input                 | Done    | Address search, saved-location shortcuts, and current location       |
| Route planning             | Done    | Multi-mode results with sorting and step-by-step directions          |
| Weather guidance           | Done    | Route risk, forecast context, and gear suggestions                   |
| Map                        | Done    | Route and weather layers with basic controls                         |
| Local data                 | Done    | Locations, preferences, recurring trips, and history persist locally |
| Offline shell              | Done    | Service worker, offline fallback, and install prompt                 |
| Automated checks           | Done    | Lint, typecheck, 278 tests, production build, and smoke E2E pass     |
| Live-provider verification | Pending | Requires valid MapmyIndia and OpenWeatherMap credentials             |
| Browser QA                 | Pending | Critical flows need manual mobile and desktop verification           |
| Production release         | Pending | Final QA, deployment configuration, and release tag                  |

## Working Basic Flow

1. Start the app with mock services enabled.
2. Enter or select an origin and destination.
3. Submit the planner.
4. Review route cards, weather risk, and directions.
5. Select a route and inspect it on the map.
6. Save reusable local preferences or locations.

## Release Criteria

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- The planner works in mock mode from a fresh clone.
- Live map and weather calls are verified with deployment credentials.
- The primary flow is checked on Android Chrome, iOS Safari, and a desktop browser.
- No deferred item from [docs/BACKLOG.md](./docs/BACKLOG.md) is required for the first release.

## Scope Rule

New feature work stays out of the MVP until the release criteria above are complete. Capture it in [docs/BACKLOG.md](./docs/BACKLOG.md) instead.
