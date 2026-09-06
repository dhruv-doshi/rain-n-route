# Bengaluru Hazard Data — Sources

Retrieved: 2026-09-06

This pack is **indicative public GIS**, not a flood warning or engineering survey. See the MOD Foundation GIS disclaimer below.

## Layers

| File                  | Source                                                                                                                                                     | License / credit                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `flood-points.json`   | [OpenCity — Flooding Locations in Bengaluru Urban](https://data.opencity.in/dataset/flooding-locations-in-bengaluru-urban)                                 | Public Domain; KSRSAC / BBMP via OpenCity            |
| `low-lying.json`      | OpenCity — BBMP Low Lying Areas (KML)                                                                                                                      | Public Domain; OpenCity / BBMP                       |
| `valleys.json`        | [MOD Foundation download center](https://github.com/mod-foundation/mod-foundation.github.io) — `valley.geojson`                                            | MOD Foundation; HydroSHEDS                           |
| `drains-primary.json` | MOD Foundation — primary rajakaluves from [CAG audit / OpenCity](https://data.opencity.in/dataset/cag-performance-audit-of-stormwater-drains-in-bengaluru) | MOD Foundation / OpenCity                            |
| `lakes.json`          | MOD Foundation — existing tanks (Well Labs, ATREE, BBMP, KTCDA)                                                                                            | MOD Foundation                                       |
| `hotspots.json`       | Curated by Rain-N-Route                                                                                                                                    | Original                                             |
| `stories.json`        | Curated by Rain-N-Route; links to Wikipedia, MOD, Bengawalk                                                                                                | Original text; external links cited                  |
| `transit-stops.json`  | Curated Namma Metro + BMTC hub snapshot (no live GTFS)                                                                                                     | Original; station coords from public Metro open data |

## Step 3 network sources (runtime, free)

| Feature                  | Source                                                      | Notes                                                                                    |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Wikipedia story excerpts | [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) | Fetched via `/api/story/wikipedia`, LRU-cached 24h; fails soft to curated `stories.json` |
| Nearby transit hints     | `transit-stops.json`                                        | Static snapshot; not a live BMTC GTFS feed                                               |

## Raw inputs

Place downloads in `data/bengaluru/raw/` then run:

```bash
node scripts/prepare-bengaluru-data.mjs
```

## MOD Foundation GIS disclaimer

> While every effort has been made to ensure the accuracy of this information, Mod Foundation makes no warranty, expressed or implied, as to its absolute accuracy. This product is for informational purposes and is not suitable for legal, engineering, or surveying purposes.

## Topology note (Bengaluru)

Bengaluru sits on a plateau (~900 m). Rain on granite/laterite runs off quickly into three main valley systems — Hebbal, Koramangala–Challaghatta, and Vrishabhavathi — that historically fed a cascade of tanks (`kere`) linked by stormwater drains (`rajakaluves`). Waterlogging occurs where valley floors, blocked drains, and filled lake beds intersect intense rain.
