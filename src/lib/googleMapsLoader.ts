'use client';

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/**
 * Client-only singleton module managing the Google Maps JavaScript API
 * script loading and library imports.
 *
 * Uses the functional API from @googlemaps/js-api-loader:
 * - `setOptions()` configures the loader (called exactly once)
 * - `importLibrary()` lazy-loads individual libraries on demand
 */

/** Module-level flag preventing duplicate initialization. */
let initialized = false;

/**
 * Initializes the Google Maps JavaScript API loader.
 *
 * Calls `setOptions` exactly once with the browser key and map ID.
 * Subsequent calls are no-ops (idempotent).
 *
 * This does NOT trigger a network request — the actual script loads
 * on the first `importLibrary()` call.
 */
export function initGoogleMaps(): void {
  if (initialized) return;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? '';

  setOptions({
    key: apiKey,
    v: 'weekly',
    mapIds: mapId ? [mapId] : [],
  });

  initialized = true;
}

/**
 * Loads the `maps` library from the Google Maps JavaScript API.
 *
 * Automatically initializes the loader on first call if not already done.
 * Returns the maps library containing the `Map` constructor and related classes.
 *
 * @throws {Error} Normalized error if the script fails to load
 */
export async function loadMapsLibrary(): Promise<google.maps.MapsLibrary> {
  initGoogleMaps();

  try {
    return await importLibrary('maps');
  } catch (error) {
    throw normalizeLoaderError(error);
  }
}

/**
 * Loads the `marker` library from the Google Maps JavaScript API.
 *
 * Automatically initializes the loader on first call if not already done.
 * Returns the marker library containing `AdvancedMarkerElement` and related classes.
 *
 * @throws {Error} Normalized error if the script fails to load
 */
export async function loadMarkerLibrary(): Promise<google.maps.MarkerLibrary> {
  initGoogleMaps();

  try {
    return await importLibrary('marker');
  } catch (error) {
    throw normalizeLoaderError(error);
  }
}

/**
 * Returns whether the Google Maps JavaScript API is properly configured.
 *
 * Checks that both the browser key and map ID are present.
 * Returns `false` when either is missing — used by MapCanvas to render
 * an error state instead of attempting to load the map.
 */
export function isGoogleMapsConfigured(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? '';
  return apiKey.length > 0 && mapId.length > 0;
}

/**
 * Normalizes errors from the Maps JavaScript API loader into
 * user-friendly Error instances. Never exposes API keys or
 * internal URLs in the error message.
 */
function normalizeLoaderError(error: unknown): Error {
  if (error instanceof Error) {
    // Strip any potential key/URL references from the message
    const safeMessage = error.message
      .replace(/key=[^&\s]*/gi, 'key=[REDACTED]')
      .replace(/https?:\/\/[^\s]*/gi, '[URL_REDACTED]');

    return new Error(`Google Maps failed to load: ${safeMessage}`);
  }

  return new Error('Google Maps failed to load: an unknown error occurred');
}
