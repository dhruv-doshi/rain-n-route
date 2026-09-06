# Deferred Work

This file holds work that is not required for the basic Rain-N-Route MVP. Items here should not block stabilization or the first release.

## Provider-Dependent Features

- Per-segment traffic coloring. The current MapmyIndia tier does not expose the required traffic data.
- Public-transit delay alerts. There is no suitable free India-focused data source configured.
- More reliable live rerouting based on traffic-aware duration data.

## Backend-Dependent Features

- Web Push notifications that work after the app is closed.
- Accounts and cloud synchronization.
- Live ETA sharing and collaboration.
- Crowd-sourced road or flooding reports.

## Product Expansion

- Multi-stop trips.
- Hindi and Kannada localization.
- Native iOS and Android wrappers.
- Booking and payment integrations.
- Imperial units.

## Bengaluru Explore (shipped)

- `/explore` tab with bundled OpenCity / MOD Foundation GIS (see `data/bengaluru/SOURCES.md`).
- Topic picker (dropdown) to focus map layers and sidebar content — flood, water systems, lakes, traffic, or stories.
- Spatial flood enrichment on planned routes.
- Stuck-in-traffic playbook, IndexedDB hotspot memory, Web Speech stories.
- Wikipedia story excerpts (cached API) and static Metro/BMTC transit snapshot for jam advice.

## Deferred (Bengaluru Step 3+)

- Live BMTC GTFS feed (replace static `transit-stops.json` snapshot).
- HydroSHEDS stream-order layer (only if simplified under data budget).

## PWA and Release Polish

- Design and add 192px, 512px, and maskable application icons.
- Add a Playwright offline scenario.
- Run a full automated accessibility sweep.
- Add Lighthouse and JavaScript bundle budgets to CI.
- Complete the cross-browser manual QA matrix.

## Separate Product Concepts

- The browser extension proposal is documented in [chrome-extension-concept.md](./chrome-extension-concept.md). It is not part of this application or its MVP.
