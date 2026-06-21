# Rain-N-Route Google Maps Migration: Owner Task List

This list contains work that requires the project owner's accounts, credentials, billing access,
domain ownership, or manual product verification. Do not put real keys into this document, Git,
issues, screenshots, or chat transcripts.

## A. Google Cloud Project

- [ ] O-01: Select or create the Google Cloud project that will own Rain-N-Route mapping usage.
- [ ] O-02: Attach an active billing account to the project.
- [ ] O-03: Confirm the billing account country and pricing eligibility applicable to the project.
- [ ] O-04: Record the Google Cloud project ID privately for deployment administration.

Required APIs:

- [ ] O-05: Enable Maps JavaScript API.
- [ ] O-06: Enable Places API (New).
- [ ] O-07: Enable Routes API.
- [ ] O-08: Enable Geocoding API.

Do not enable legacy Directions API or legacy Places API for this migration.

## B. Browser Key and Map ID

- [ ] O-09: Create a dedicated browser API key.
- [ ] O-10: Restrict the browser key to Websites.
- [ ] O-11: Add local referrers:

```text
http://localhost:3000/*
http://127.0.0.1:3000/*
```

- [ ] O-12: Add the final production domain referrer.
- [ ] O-13: Add preview deployment referrers only if previews need live Google Maps.
- [ ] O-14: Restrict the browser key to Maps JavaScript API only.
- [ ] O-15: Create a Google Maps map ID for a JavaScript raster or vector map.
- [ ] O-16: Store the values locally:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=...
```

The browser key is visible by design. Its security comes from referrer and API restrictions.

## C. Server Key

- [ ] O-17: Create a separate server API key.
- [ ] O-18: Restrict the server key to:

```text
Routes API
Places API (New)
Geocoding API
```

- [ ] O-19: Apply an application restriction compatible with the production host where possible.
      If the deployment platform does not provide stable outbound IP addresses, retain strict API
      restrictions, tight quotas, monitoring, and secret storage.
- [ ] O-20: Store the key locally:

```dotenv
GOOGLE_MAPS_SERVER_KEY=...
```

- [ ] O-21: Add the key to the deployment platform's encrypted environment variables.
- [ ] O-22: Never prefix this key with `NEXT_PUBLIC_`.

## D. Existing Weather Configuration

- [ ] O-23: Provide or retain the OpenWeatherMap key:

```dotenv
OWM_KEY=...
```

- [ ] O-24: Verify that the key has access to the currently used One Call and Air Pollution
      endpoints.

## E. Billing and Quota Guardrails

- [ ] O-25: Create a monthly Google Cloud billing budget.
- [ ] O-26: Add alert thresholds at 50%, 80%, and 100%.
- [ ] O-27: Send alerts to an email address that is actively monitored.
- [ ] O-28: Set initial daily quotas appropriate for expected traffic.
- [ ] O-29: Review quotas for these SKUs or API methods:

```text
Maps JavaScript map loads
Places Autocomplete requests and sessions
Place Details Essentials
Geocoding
Routes Compute Routes
```

- [ ] O-30: Account for up to four route computations per completed planner search because the
      application requests car, two-wheeler, transit, and walking modes.
- [ ] O-31: Review Google Maps Platform usage after the first day, first week, and first month.

Suggested initial budget:

- Portfolio or private beta: USD 10 monthly alert budget.
- Public MVP: USD 25 to USD 50 monthly alert budget.

A budget alert does not automatically stop usage. Quotas are the hard safety control.

## F. Repository and CI Secrets

- [ ] O-32: Add CI secrets only if CI runs a live-key build:

```text
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
GOOGLE_MAPS_SERVER_KEY
OWM_KEY
```

Preferred CI policy:

- Unit, integration, build, and E2E run in mock mode.
- Live-provider tests are manual or run in a separately protected workflow.
- Pull requests from forks never receive production secrets.

- [ ] O-33: Remove obsolete CI or deployment secrets:

```text
NEXT_PUBLIC_MAPS_KEY
MAPS_SECRET
MAPS_CLIENT_ID
```

- [ ] O-34: Confirm no key is committed:

```bash
git grep -n "AIza"
git log -p --all -- .env.local .env
```

If a real key was ever committed, rotate it.

## G. Domain and Deployment Inputs

Provide these values to the implementer without exposing secrets publicly:

- [ ] O-35: Production URL.
- [ ] O-36: Preview URL pattern, if previews require live maps.
- [ ] O-37: Deployment provider.
- [ ] O-38: Whether the deployment provider offers stable outbound IP addresses.
- [ ] O-39: `NEXT_PUBLIC_SITE_URL` value.

## H. Manual Live Verification

Perform these checks only after Kiro completes automated stages.

### Places

- [ ] O-40: Search `Indiranagar, Bengaluru`.
- [ ] O-41: Search `Whitefield, Bengaluru`.
- [ ] O-42: Confirm predictions are India-focused and have sensible secondary labels.
- [ ] O-43: Select each prediction and confirm coordinates resolve without an extra visible error.
- [ ] O-44: Deny geolocation and confirm manual search still works.
- [ ] O-45: Allow geolocation and confirm reverse geocoding produces a readable address.

### Routes

Use Indiranagar to Whitefield and one shorter route such as Indiranagar to MG Road.

- [ ] O-46: Confirm a car route is returned.
- [ ] O-47: Confirm a two-wheeler route is returned where supported.
- [ ] O-48: Confirm a transit route is returned where supported.
- [ ] O-49: Confirm a walking route is returned.
- [ ] O-50: Confirm unavailable modes do not erase successful modes.
- [ ] O-51: Confirm route duration, distance, steps, and encoded geometry are present.
- [ ] O-52: Confirm a fresh re-plan can change traffic-aware ETA without breaking selection.

### Map

- [ ] O-53: Confirm the Google map loads without watermark errors or configuration warnings.
- [ ] O-54: Confirm Google attribution remains visible.
- [ ] O-55: Confirm all returned route polylines render.
- [ ] O-56: Confirm route-card selection changes the emphasized polyline.
- [ ] O-57: Confirm clicking a polyline changes route selection.
- [ ] O-58: Confirm recenter works.
- [ ] O-59: Confirm fit-route works.
- [ ] O-60: Confirm traffic layer works.
- [ ] O-61: Confirm transit layer works.
- [ ] O-62: Confirm weather markers render.

### Devices

- [ ] O-63: Android Chrome.
- [ ] O-64: iOS Safari.
- [ ] O-65: Desktop Chrome.
- [ ] O-66: Desktop Firefox or Safari.

### Negative Security Checks

- [ ] O-67: Open the production site from an unapproved referrer and confirm the browser key is
      rejected.
- [ ] O-68: Search browser source and network responses for `GOOGLE_MAPS_SERVER_KEY`; it must not
      appear.
- [ ] O-69: Inspect `.next/static` for the server key; it must not appear.
- [ ] O-70: Confirm provider errors do not display key values.

## I. Product Decisions Already Fixed by the Specification

No owner response is required for these decisions:

- Dashboard and its dependent personalization/history feature set are removed.
- No replacement settings page is added.
- Google Maps Platform becomes the only live map/place/route provider.
- OpenWeatherMap remains the weather provider.
- Default trip sorting is `fastest`.
- Four route modes remain: car, two-wheeler, transit, and walking.
- Google traffic-aware durations are used without traffic-colored route polylines.
- Google Maps shared-link import is not part of this migration.
- Mock mode remains the default setup path for development and CI.

## J. Completion Handoff

Before approving the migration, require Kiro to provide:

- [ ] O-71: Stage-by-stage commit list.
- [ ] O-72: Exact automated test results.
- [ ] O-73: Exact production build result.
- [ ] O-74: Confirmation that removed-provider repository searches are empty.
- [ ] O-75: List of enabled Google APIs and runtime environment variables.
- [ ] O-76: Live verification evidence for sections H.
- [ ] O-77: Known limitations and unsupported geographic cases.
- [ ] O-78: Estimated API calls per completed route search.
