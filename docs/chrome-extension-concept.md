# Rain-N-Route Maps Lens — Browser Extension Concept

> An **independent** browser extension that augments **Google Maps** with rain, water-logging, and route-condition intelligence. It is not connected to the Rain-N-Route PWA: no shared backend, no shared accounts, no deep-links. The user supplies their own OpenWeatherMap API key, and the extension does the rest locally.

---

## 1. Overview

The extension watches `https://www.google.com/maps/*`, detects when the user has a route loaded, and renders rain/flood/condition information **directly on top of Google's map** — small SVG icons projected onto the route polyline, the same way Google itself shows accident and road-block markers. A side panel sits next to the directions sidebar and surfaces deeper detail (timeline, gear checklist, leave-time advice). When the on-canvas overlay can't project (rare Google Maps changes, unsupported viewport), the side panel becomes the fallback so the user never loses the data.

It runs on Chrome, Edge, and Firefox from day one.

---

## 2. Bring-Your-Own API Key

The extension is fully self-contained. There is **no Rain-N-Route server** behind it.

- **First-run onboarding** walks the user through:
  1. Creating a free OpenWeatherMap account at `openweathermap.org/api`.
  2. Copying their API key from the OWM dashboard.
  3. Pasting it into the extension's options page.
  4. (Optional) Pasting an OpenRouteService or Mappls key if they want server-side route geometry instead of the great-circle approximation (see §3.2).
- Keys are stored in `chrome.storage.local` (never `sync` — keys should not roam across devices). On uninstall, Chrome wipes them automatically.
- The extension calls weather and routing APIs **directly from the background service worker**. No proxy.
- A built-in **rate-limit guard** caches results per `(routeHash, hourBucket)` to keep the user inside OWM's free-tier (60 calls/min, 1M/month).
- A **"reset key"** button in options + a help link to the OWM dashboard for revocation.
- Onboarding ships with a screenshot walkthrough so non-technical users can complete it in under two minutes.

---

## 3. Feasibility Assessment

Google Maps is a closed, frequently-changing web app. There is no public JS hook that lets a third party "ask Maps for the current route." The plan below works around that — by parsing the URL, scraping a few stable DOM nodes, and computing geometry ourselves when needed.

### 3.1 Allowed and straightforward

- **Manifest V3 extension** with `content_scripts` matched to `https://www.google.com/maps/*` and a background `service_worker`. The same MV3 bundle works on Chrome, Edge, and (with `browser_specific_settings`) Firefox 115+.
- **Detect route state from the URL.** `/maps/dir/<from>/<to>/@<lat>,<lng>,<zoom>z/data=...` is the canonical, comparatively stable signal. Origin/destination text is also readable from the directions sidebar via known DOM nodes (with the caveat in §3.4).
- **Inject our own UI.** A floating side panel mounted into a Shadow DOM root pinned next to Google's directions sidebar. Shadow DOM keeps Google's CSS from bleeding into our React tree and vice-versa.
- **Sample weather along the route.** Once we have a polyline (see §3.2), sample OpenWeatherMap One Call 3.0 every ~5 km / 15 min along it.
- **Desktop notifications** via the cross-browser `notifications` API.

### 3.2 Hard but possible

- **Reading Google's actual route polyline.** Google does not expose the route geometry on the page. Two options, in increasing fidelity:
  1. **Great-circle approximation.** Geocode origin + destination through OWM's free geocoder, then sample weather on a straight-line interpolation between them. Zero extra setup. Accurate enough for short urban trips; noisier on long routes that bend.
  2. **Bring-your-own routing key.** If the user adds an OpenRouteService (free) or Mappls key, the extension fetches a real polyline from that provider and samples weather on it. Most accurate.
  3. _(Rejected)_ **Intercepting Google's internal XHR/fetch.** Works today but is undocumented and breaks every time Google ships a Maps update. We will not depend on it.
- **Drawing icons on Google's map canvas.** Google Maps renders into a single WebGL `<canvas>`; we cannot poke pixels into it. The workaround:
  - Mount an absolutely-positioned `<div>` on top of the map, render rain/flood SVG icons inside it, and project lat/lng → screen pixel ourselves using the URL's `@lat,lng,zoom` plus a Web Mercator helper. Re-project on every pan/zoom by listening to URL changes and a throttled `MutationObserver` on the map container. Visually identical to native Google markers; structurally just our DOM sitting on top.
  - This is the **primary** path. The side panel is a supplement during normal operation and a **fallback** if projection ever fails.

### 3.3 Not allowed (will get the extension rejected)

- Modifying or scraping Google Maps content for redistribution outside the user's session.
- Programmatically driving Maps to issue paid Google API requests against Google's account.
- Calling the Google Maps JavaScript API from a `google.com/maps` page using a stolen or shared key.

### 3.4 Risks

- **DOM and URL fragility.** Selectors and URL schema are not contracts. Expect breakage every few months. Mitigate by hiding all selector knowledge behind a thin `GoogleMapsAdapter`. Probe-on-load: if a probe fails, show a banner ("Google Maps update detected — overlay paused, side panel still active") and degrade gracefully.
- **Browser-store review.** Extensions that touch a Google property tend to draw extra scrutiny on the Chrome Web Store. Listing copy must make it unmistakable that this is a third-party tool, not Google. Edge and Firefox reviews are usually faster.
- **Performance.** A `MutationObserver` on Maps' DOM is expensive. Throttle projection updates with `requestAnimationFrame` plus a 100 ms idle floor.
- **Free-tier limits.** The user owns their OWM key, but a chatty extension burns their quota. Aggressive caching (per route + per hour bucket) is mandatory, not optional.

---

## 4. Architecture Sketch

```
[ google.com/maps/* page ]
        │
        │ content_scripts
        ▼
┌─────────────────────────────────┐
│  GoogleMapsAdapter (DOM/URL)    │  ← isolated; the only file that knows Google's selectors
│  ─ URL watcher (history API)    │
│  ─ origin/destination scraper   │
│  ─ pan/zoom listener            │
│  ─ overlay container injection  │
└──────────────┬──────────────────┘
               │ events: routeChanged, viewportChanged
               ▼
┌─────────────────────────────────┐
│  React app (Shadow DOM root)    │
│  ─ Map overlay (icons + tint)   │  ← hero surface
│  ─ Side panel (extra detail)    │  ← supplement + fallback
│  ─ Notification scheduler       │
└──────────────┬──────────────────┘
               │ messages
               ▼
┌─────────────────────────────────┐
│  background service_worker      │
│  ─ OpenWeatherMap calls         │
│  ─ Optional routing-API calls   │
│  ─ Cache by (routeHash,         │
│    hourBucket) in IndexedDB     │
│  ─ chrome.notifications         │
│  ─ chrome.storage.local (key,   │
│    saved locations, settings)   │
└─────────────────────────────────┘
```

**Cross-browser packaging:** one source tree, three artifacts.

- Chrome / Edge — same MV3 zip, two store listings.
- Firefox — same MV3 zip with `browser_specific_settings.gecko` added; submitted to AMO.
- Polyfill `chrome.*` → `browser.*` via `webextension-polyfill`.

The extension is a **clean-room implementation**. None of Rain-N-Route's PWA code, store, backend, or branding is reused. Internal modules (weather risk computation, gear suggestions, Mercator projection) are written from scratch inside the extension repo.

---

## 5. Feature List — V1

The hero is the on-map overlay. Everything else supports or extends it.

### 5.1 On-map overlay (primary)

- **Rain / flood / heat / AQI icons** projected onto the route polyline, colored by severity.
- **Severity tint** drawn as our own polyline overlay on top of Google's: low=blue, moderate=yellow, high=orange, severe=red.
- **Water-logging hotspot pins** at known flood-prone coordinates (curated, bundled list users can extend).
- **Click any icon** → side panel opens to that segment's detail.
- Re-projects smoothly on pan/zoom; auto-hides at very low zoom levels where icons would overlap.

### 5.2 Side panel (supplement and fallback)

- **Route weather report card** — rain, flood, heat, AQI risk per segment.
- **Hour-by-hour timeline** for the journey window (now → ETA + 30 min buffer).
- **Gear checklist** (umbrella, raincoat, mask, hydration), auto-derived from the risk profile, with tickable items.
- **"Best leave time"** — scans the next 3 hours and recommends the lowest-risk departure window.
- **Stale-data indicator** when the network is flaky or the OWM call rate-limited.
- **"Overlay paused"** banner with the reason (Google Maps update detected, viewport too zoomed out, no key configured).

### 5.3 Settings & onboarding

- **First-run wizard** for the OWM key (and optional routing key).
- **Options page**: keys, units (metric/imperial), severity thresholds, hotspot list editor, notification preferences.
- **Privacy disclosure**: nothing leaves the device except calls to the user's chosen API providers.

### 5.4 Notifications (V1, light)

- A "leave in N minutes" reminder if the user has set a target arrival time on the current route.
- A "severe weather on this route" toast while the Maps tab is open.

### 5.5 Degradation rules

- **No key configured** → side panel shows the onboarding card; overlay stays empty.
- **Overlay projection fails** → icons render in the side-panel timeline; banner explains why.
- **OWM rate-limited** → cached data is shown with a "last updated 14 min ago" stamp.
- **Google Maps DOM changes** → adapter probe fails, side panel keeps working with a "limited mode" banner.

---

## 6. Feature List — V2 (post-launch)

| Feature                                                                                                                                                                                                          | Notes |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **Recurring commute watcher** — pin a daily home↔office route inside the extension; background SW polls weather every 30 min and fires desktop notifications on severe-weather change, even when Maps isn't open |
| **Multi-route comparison badges** — when Google shows alternate routes, annotate each with a weather-risk badge ("via ORR — clear", "via Silk Board — heavy rain at 6 PM")                                       |
| **Saved locations** (Home / Office / custom) stored locally; quick-pick chips on the side panel                                                                                                                  |
| **Trip history** stored locally — past routes, observed conditions, gear actually used                                                                                                                           |
| **Hindi / Kannada localization** (and other Indian-language packs)                                                                                                                                               |
| **"Avoid water-logged roads" hint** — when severe water-logging is detected on the user's route, surface the user-extensible hotspot list and suggest waypoints to add in Google Maps manually                   |
| **Crowd-sourced flood reports** — right-click on the map → "Report flooding here" → adds to a local hotspot list, optionally exported/imported as JSON for sharing in communities (no central server)            |
| **Two-wheeler / pedestrian profile** — stricter rain thresholds, stronger gear nudges; user picks the profile in settings                                                                                        |
| **Multi-stop trips** — when Google shows a multi-stop route, sample weather per leg                                                                                                                              |
| **Carbon + cost estimator** — per-route badges, mode-aware                                                                                                                                                       |

---

## 7. What We Deliberately Won't Do

- No reverse-engineering of Google's tile server or WebGL state.
- No injecting markers _into_ Google's WebGL canvas (only on top, as our own DOM).
- No telemetry, no analytics, no central server. Privacy stance: **everything stays on the user's machine** except the user's own API calls to providers they signed up with.
- No bundling third-party API keys.
- No connection, deep-link, or shared storage with the Rain-N-Route PWA. The two products are independent.

---

## 8. Effort Estimate (single engineer, rough)

| Slice                                                                                                                       | Effort    |
| --------------------------------------------------------------------------------------------------------------------------- | --------- |
| Project skeleton (MV3 + Vite + cross-browser polyfill + Shadow DOM React root)                                              | ~1 day    |
| First-run onboarding + options page + key storage + cache layer                                                             | ~2 days   |
| `GoogleMapsAdapter` (URL watcher, origin/destination scraper, pan/zoom listener, overlay container)                         | ~2–3 days |
| Mercator projection helper + on-map icon overlay + severity tint                                                            | ~3 days   |
| Side panel (timeline + gear + leave-time + degraded-mode banners)                                                           | ~2 days   |
| Weather risk + gear logic (clean-room implementation)                                                                       | ~1 day    |
| Notifications + rate-limit guard                                                                                            | ~1 day    |
| Cross-browser smoke testing (Chrome / Edge / Firefox) + bug-fix tail                                                        | ~2 days   |
| Store assets (screenshots, listing copy, privacy disclosure) and submissions to Chrome Web Store, Edge Add-ons, Firefox AMO | ~2 days   |

**Total to first listings on all three stores: ~16–18 days**, plus an ongoing maintenance tax of roughly one or two days every few months when Google ships a Maps update that breaks the adapter.

---

## 9. Open Decisions Resolved

The following decisions are now locked, per the user:

1. **Independence.** The extension is a standalone tool. No connection to the Rain-N-Route PWA — separate codebase, separate branding optional, separate release.
2. **Bring-your-own keys.** Self-contained. The user obtains and supplies their own OpenWeatherMap API key (and optional routing key) via an in-extension onboarding flow.
3. **Cross-browser.** Chrome, Edge, and Firefox supported from day one via a single MV3 source tree.
4. **On-map overlay is the headline feature.** The side panel exists to surface extra detail and to serve as a graceful fallback when the overlay can't render.
