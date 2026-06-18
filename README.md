# Rain-N-Route

An India-first, weather-aware trip planner built with Next.js. It compares transport options, adds weather risk and gear guidance, and stores user data locally without requiring an account.

## Current Scope

The current priority is a reliable MVP:

- Enter an origin and destination.
- Compare route options by time, cost, transfers, and carbon impact.
- View directions and route geometry on a map.
- See weather risks and practical gear suggestions.
- Save locations, preferences, recurring commutes, and trip history locally.
- Use mock services for local development without API keys.

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for the verified implementation status. Future ideas and nonessential work live in [docs/BACKLOG.md](./docs/BACKLOG.md).

## Setup

Prerequisites:

- Node.js 20+
- pnpm 10+

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The example environment enables mock services, so the basic app works without third-party credentials. To use live data, set `NEXT_PUBLIC_USE_MOCK_SERVICES=false` and provide the MapmyIndia and OpenWeatherMap keys in `.env.local`.

## Environment

| Variable                        | Purpose                                           | Default |
| ------------------------------- | ------------------------------------------------- | ------- |
| `NEXT_PUBLIC_USE_MOCK_SERVICES` | Use deterministic local map and weather data      | `true`  |
| `NEXT_PUBLIC_MAPS_KEY`          | MapmyIndia client ID for live services            | empty   |
| `MAPS_SECRET`                   | MapmyIndia client secret; server only             | empty   |
| `OWM_KEY`                       | OpenWeatherMap API key; server only               | empty   |
| `NEXT_PUBLIC_SITE_URL`          | Canonical URL used by sitemap and robots metadata | local   |

Never commit `.env.local` or real credentials.

## Commands

| Command              | Purpose                                |
| -------------------- | -------------------------------------- |
| `pnpm dev`           | Start the development server           |
| `pnpm build`         | Create a production build              |
| `pnpm start`         | Run the production build               |
| `pnpm lint`          | Run ESLint with zero warning tolerance |
| `pnpm typecheck`     | Run the TypeScript compiler            |
| `pnpm test`          | Run unit and integration tests         |
| `pnpm test:coverage` | Run tests with coverage                |
| `pnpm test:e2e`      | Run Playwright tests                   |
| `pnpm format`        | Format the repository                  |

## Structure

```text
src/
├── app/          Next.js pages and API route handlers
├── components/   UI grouped by product area
├── hooks/        Client-side orchestration
├── services/     Maps, weather, routing, and sharing adapters
├── store/        Zustand stores and persistence
├── lib/          Pure domain utilities
└── types/        Canonical TypeScript models
```

## Documentation

- [PROJECT_STATUS.md](./PROJECT_STATUS.md): current scope, completed work, and release blockers
- [docs/BACKLOG.md](./docs/BACKLOG.md): deferred features and optional engineering work
- [docs/plan/](./docs/plan): historical architecture and implementation planning
- [docs/chrome-extension-concept.md](./docs/chrome-extension-concept.md): separate product concept, not part of this app

## License

MIT
