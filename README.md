# CommuteWise (rain-n-route)

A weather-aware, India-first commute planning progressive web app. Plan your trip, check weather along the route, and get gear suggestions — all without creating an account.

## Tech Stack

| Layer     | Choice                                       |
| --------- | -------------------------------------------- |
| Framework | Next.js 16 (App Router)                      |
| Language  | TypeScript (strict)                          |
| Styling   | Tailwind CSS v4 + shadcn/ui                  |
| State     | Zustand + IndexedDB persistence              |
| Maps      | MapmyIndia (primary), Google Maps (fallback) |
| Weather   | OpenWeatherMap One Call 3.0                  |
| PWA       | next-pwa (Workbox)                           |
| Testing   | Vitest + React Testing Library + Playwright  |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
# Clone the repo
git clone https://github.com/dhruv-doshi/rain-n-route.git
cd rain-n-route

# Install dependencies
pnpm install

# Copy env template and fill in your keys
cp .env.example .env.local

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable               | Description                                        | Required |
| ---------------------- | -------------------------------------------------- | -------- |
| `NEXT_PUBLIC_MAPS_KEY` | MapmyIndia client key (safe to expose)             | Yes      |
| `MAPS_SECRET`          | MapmyIndia secret (server-side only)               | Yes      |
| `OWM_KEY`              | OpenWeatherMap One Call 3.0 key (server-side only) | Yes      |

## Scripts

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `pnpm dev`           | Start development server              |
| `pnpm build`         | Production build                      |
| `pnpm start`         | Start production server               |
| `pnpm lint`          | Run ESLint                            |
| `pnpm lint:fix`      | Run ESLint with auto-fix              |
| `pnpm format`        | Format with Prettier                  |
| `pnpm typecheck`     | Run TypeScript compiler check         |
| `pnpm test`          | Run unit + integration tests (Vitest) |
| `pnpm test:coverage` | Run tests with coverage report        |
| `pnpm test:e2e`      | Run end-to-end tests (Playwright)     |

## Project Structure

```
src/
├── app/          # Next.js App Router pages and API routes
├── components/   # React components (shell, planner, routes, map, dashboard)
├── hooks/        # Custom React hooks
├── services/     # External API adapters (maps, weather, geolocation)
├── store/        # Zustand stores with IndexedDB persistence
├── lib/          # Pure utility functions (scoring, weather impact, geo)
└── types/        # Canonical TypeScript types
```

Layer boundaries are enforced via `eslint-plugin-boundaries` (see `eslint.config.mjs`).

## Development Phases

See [`docs/plan/plan.md`](./docs/plan/plan.md) for the full incremental build plan.

| Phase                         | Status     |
| ----------------------------- | ---------- |
| 1 — Project Foundation        | ✅ Done    |
| 2 — Design System & Shell     | ⬜ Pending |
| 3 — Data Models & Local Store | ⬜ Pending |
| 4 — Service Layer Adapters    | ⬜ Pending |
| 5 — Quick Planner (Home)      | ⬜ Pending |
| 6–15                          | ⬜ Pending |

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Husky enforces this on every commit via `commitlint`.

## License

MIT
