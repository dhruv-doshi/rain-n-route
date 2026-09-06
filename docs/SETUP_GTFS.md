# Live BMTC / GTFS setup (future)

Rain-N-Route currently uses a **static snapshot** at `src/data/bengaluru/transit-stops.json` for Explore and the stuck-in-traffic playbook. To switch to live transit data, you will need:

## From your side

1. **A GTFS feed URL or API key** for BMTC (or a third-party aggregator with Bengaluru coverage).
2. **Vercel/host env vars** (server-only):
   - `BMTC_GTFS_URL` — HTTPS URL to `gtfs.zip` or a stable API endpoint
   - Optional `BMTC_GTFS_API_KEY` if the provider requires auth
3. **Cron or scheduled job** to refresh the feed (daily is usually enough for station list; realtime needs shorter intervals).

## Implementation notes (when feed is available)

- Add `scripts/prepare-transit-gtfs.mjs` to download, parse stops, and emit `transit-stops.json`.
- Optionally add `/api/transit/nearby` for live stop search instead of bundled JSON.
- Update `docs/BACKLOG.md` when live GTFS ships.

Until then, Metro/BMTC hub markers and fare estimates use the curated snapshot only.
