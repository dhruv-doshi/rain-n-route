import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { GoogleMapsProvider, normalizeGoogleError } from '@/services/maps/google';
import { ServiceError } from '@/lib/http';

/**
 * Property 1: Key Isolation
 *
 * For any response from Route_Handlers and any error from Google_Provider,
 * never contains server key value, key substrings (4+ chars), internal URLs,
 * or Google headers.
 *
 * **Validates: Requirements 2.5, 13.8, 14.1**
 */

// ────────────────────────────────────────────────────────────────────
// Google-specific patterns that must never appear in domain responses
// ────────────────────────────────────────────────────────────────────

const GOOGLE_INTERNAL_PATTERNS = [
  'X-Goog-Api-Key',
  'X-Goog-FieldMask',
  'googleapis.com/v1/places',
  'routes.googleapis.com',
  'maps.googleapis.com/maps/api',
];

// ────────────────────────────────────────────────────────────────────
// MSW Handlers returning clean fixture data
// ────────────────────────────────────────────────────────────────────

const successHandlers = [
  // Autocomplete
  http.post('https://places.googleapis.com/v1/places:autocomplete', () => {
    return HttpResponse.json({
      suggestions: [
        {
          placePrediction: {
            placeId: 'ChIJ_test123',
            text: { text: 'Test Place' },
            structuredFormat: {
              mainText: { text: 'Test Place' },
              secondaryText: { text: 'Test City' },
            },
            types: ['locality'],
          },
        },
      ],
    });
  }),

  // Place Details
  http.get('https://places.googleapis.com/v1/places/:placeId', () => {
    return HttpResponse.json({
      id: 'ChIJ_test123',
      formattedAddress: 'Test Place, Test City',
      location: { latitude: 12.9716, longitude: 77.5946 },
      types: ['locality'],
    });
  }),

  // Geocode (forward + reverse)
  http.get('https://maps.googleapis.com/maps/api/geocode/json', () => {
    return HttpResponse.json({
      results: [
        {
          place_id: 'ChIJ_test123',
          formatted_address: 'Test Place, Test City',
          geometry: { location: { lat: 12.9716, lng: 77.5946 } },
          types: ['locality'],
        },
      ],
      status: 'OK',
    });
  }),

  // Routes
  http.post('https://routes.googleapis.com/directions/v2:computeRoutes', () => {
    return HttpResponse.json({
      routes: [
        {
          distanceMeters: 5000,
          duration: '600s',
          staticDuration: '600s',
          polyline: { encodedPolyline: 'oqcnAm}ciMeAeA{@kA' },
          legs: [
            {
              steps: [
                {
                  distanceMeters: 5000,
                  staticDuration: '600s',
                  polyline: { encodedPolyline: 'oqcnAm}ciMeAeA{@kA' },
                  navigationInstruction: { instructions: 'Head north' },
                  travelMode: 'DRIVE',
                },
              ],
            },
          ],
        },
      ],
    });
  }),
];

// ────────────────────────────────────────────────────────────────────
// Arbitrary for API key generation
//
// Generates realistic Google-style API key strings using characters
// that won't trivially collide with common fixture data.
// ────────────────────────────────────────────────────────────────────

const arbApiKey = fc.noShrink(
  fc
    .tuple(
      fc.constantFrom('AIzaSy', 'AIzaXq', 'AIzaZm', 'AIzaWv'),
      fc.string({
        minLength: 25,
        maxLength: 35,
        unit: fc.constantFrom(...'BCDFGHJKLMNPQRSTVWXYZ2345679bcdfghjkmnpqrstvwxyz'.split('')),
      }),
    )
    .map(([prefix, suffix]) => `${prefix}${suffix}`),
);

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Check that no substring of length >= 4 from the key appears in text.
 */
function containsKeySubstring(text: string, key: string): boolean {
  if (key.length < 4) return text.includes(key);
  for (let i = 0; i <= key.length - 4; i++) {
    const sub = key.slice(i, i + 4);
    if (text.includes(sub)) return true;
  }
  return false;
}

/**
 * Check that text doesn't contain any Google-specific internal URLs or headers.
 */
function containsGoogleInternals(text: string): boolean {
  return GOOGLE_INTERNAL_PATTERNS.some((pattern) => text.includes(pattern));
}

// ────────────────────────────────────────────────────────────────────
// Test Suite
// ────────────────────────────────────────────────────────────────────

describe('Property 1: Key Isolation', () => {
  const server = setupServer(...successHandlers);

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('successful responses never leak the API key or its substrings', () => {
    it('for any random API key, autocomplete response contains no key material', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          const provider = new GoogleMapsProvider(key);

          const results = await provider.autocomplete('test query', {
            sessionToken: 'session-1',
          });

          const serialized = JSON.stringify(results);
          expect(serialized).not.toContain(key);
          expect(containsKeySubstring(serialized, key)).toBe(false);
          expect(containsGoogleInternals(serialized)).toBe(false);
        }),
        { numRuns: 30 },
      );
    });

    it('for any random API key, resolvePlace response contains no key material', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          const provider = new GoogleMapsProvider(key);

          const result = await provider.resolvePlace('ChIJ_test123', {
            sessionToken: 'session-1',
            fallbackLabel: 'Test Place',
          });

          const serialized = JSON.stringify(result);
          expect(serialized).not.toContain(key);
          expect(containsKeySubstring(serialized, key)).toBe(false);
          expect(containsGoogleInternals(serialized)).toBe(false);
        }),
        { numRuns: 30 },
      );
    });

    it('for any random API key, geocode response contains no key material', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          const provider = new GoogleMapsProvider(key);

          const results = await provider.geocode('Test Address');

          const serialized = JSON.stringify(results);
          expect(serialized).not.toContain(key);
          expect(containsKeySubstring(serialized, key)).toBe(false);
          expect(containsGoogleInternals(serialized)).toBe(false);
        }),
        { numRuns: 30 },
      );
    });

    it('for any random API key, reverseGeocode response contains no key material', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          const provider = new GoogleMapsProvider(key);

          const result = await provider.reverseGeocode({ lat: 12.9716, lng: 77.5946 });

          const serialized = JSON.stringify(result);
          expect(serialized).not.toContain(key);
          expect(containsKeySubstring(serialized, key)).toBe(false);
          expect(containsGoogleInternals(serialized)).toBe(false);
        }),
        { numRuns: 30 },
      );
    });

    it('for any random API key, route response contains no key material', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          const provider = new GoogleMapsProvider(key);

          const response = await provider.route({
            from: { lat: 12.9716, lng: 77.5946 },
            to: { lat: 12.9784, lng: 77.6408 },
            modes: ['car'],
          });

          const serialized = JSON.stringify(response);
          expect(serialized).not.toContain(key);
          expect(containsKeySubstring(serialized, key)).toBe(false);
          expect(containsGoogleInternals(serialized)).toBe(false);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('error responses never leak the API key, URLs, or Google headers', () => {
    it('for any random API key, 403 error does not contain key or internals', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          server.use(
            http.post(
              'https://places.googleapis.com/v1/places:autocomplete',
              () =>
                new HttpResponse(JSON.stringify({ error: { message: 'Forbidden' } }), {
                  status: 403,
                }),
            ),
          );
          const provider = new GoogleMapsProvider(key);

          try {
            await provider.autocomplete('test', { sessionToken: 'session-1' });
            expect.fail('Expected an error to be thrown');
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceError);
            const error = err as ServiceError;
            const serialized = JSON.stringify({
              code: error.code,
              message: error.message,
              retryable: error.retryable,
            });
            expect(serialized).not.toContain(key);
            expect(containsKeySubstring(serialized, key)).toBe(false);
            expect(containsGoogleInternals(serialized)).toBe(false);
          }
        }),
        { numRuns: 30 },
      );
    });

    it('for any random API key, 429 error does not contain key or internals', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          server.use(
            http.get(
              'https://maps.googleapis.com/maps/api/geocode/json',
              () =>
                new HttpResponse(JSON.stringify({ error: { message: 'Rate limited' } }), {
                  status: 429,
                }),
            ),
          );
          const provider = new GoogleMapsProvider(key);

          try {
            await provider.geocode('test address');
            expect.fail('Expected an error to be thrown');
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceError);
            const error = err as ServiceError;
            const serialized = JSON.stringify({
              code: error.code,
              message: error.message,
              retryable: error.retryable,
            });
            expect(serialized).not.toContain(key);
            expect(containsKeySubstring(serialized, key)).toBe(false);
            expect(containsGoogleInternals(serialized)).toBe(false);
          }
        }),
        { numRuns: 30 },
      );
    });

    it('for any random API key, route total failure error does not contain key', async () => {
      await fc.assert(
        fc.asyncProperty(arbApiKey, async (key) => {
          server.use(
            http.post(
              'https://routes.googleapis.com/directions/v2:computeRoutes',
              () =>
                new HttpResponse(JSON.stringify({ error: { message: 'Server error' } }), {
                  status: 500,
                }),
            ),
          );
          const provider = new GoogleMapsProvider(key);

          try {
            await provider.route({
              from: { lat: 12.9716, lng: 77.5946 },
              to: { lat: 12.9784, lng: 77.6408 },
              modes: ['car'],
            });
            expect.fail('Expected an error to be thrown');
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceError);
            const error = err as ServiceError;
            const serialized = JSON.stringify({
              code: error.code,
              message: error.message,
              retryable: error.retryable,
            });
            expect(serialized).not.toContain(key);
            expect(containsKeySubstring(serialized, key)).toBe(false);
            expect(containsGoogleInternals(serialized)).toBe(false);
          }
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('normalizeGoogleError never leaks keys for any error shape', () => {
    it('for any random API key and HTTP status, normalized error never contains key', () => {
      fc.assert(
        fc.property(
          arbApiKey,
          fc.constantFrom(400, 403, 404, 429, 500, 502, 503),
          (key, status) => {
            // Simulate error objects that might contain the key in raw data
            const errorWithKey = { status, message: `Error with key=${key}` };
            const normalized = normalizeGoogleError(errorWithKey);

            expect(normalized.message).not.toContain(key);
            expect(containsKeySubstring(normalized.message, key)).toBe(false);
            expect(containsGoogleInternals(normalized.message)).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('for any random error message containing a key, normalized output is clean', () => {
      fc.assert(
        fc.property(
          arbApiKey,
          fc.constantFrom(
            'Request failed with key',
            'Forbidden: invalid API key',
            'Rate limited on endpoint',
            'Server error at googleapis.com',
          ),
          (key, msgTemplate) => {
            // Create an Error that might contain the key in its message
            const rawError = new Error(`${msgTemplate}: ${key}`);
            const normalized = normalizeGoogleError(rawError);

            expect(normalized.message).not.toContain(key);
            expect(containsKeySubstring(normalized.message, key)).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('AbortError normalization never contains key or internal URLs', () => {
      fc.assert(
        fc.property(arbApiKey, (key) => {
          const abortError = new Error(`Aborted request to googleapis.com with key=${key}`);
          abortError.name = 'AbortError';
          const normalized = normalizeGoogleError(abortError);

          expect(normalized.message).not.toContain(key);
          expect(containsKeySubstring(normalized.message, key)).toBe(false);
          expect(containsGoogleInternals(normalized.message)).toBe(false);
          expect(normalized.code).toBe('PROVIDER_TIMEOUT');
          expect(normalized.retryable).toBe(true);
        }),
        { numRuns: 30 },
      );
    });

    it('TypeError (network) normalization never contains key', () => {
      fc.assert(
        fc.property(arbApiKey, (key) => {
          const networkError = new TypeError(
            `fetch failed: https://routes.googleapis.com?key=${key}`,
          );
          const normalized = normalizeGoogleError(networkError);

          expect(normalized.message).not.toContain(key);
          expect(containsKeySubstring(normalized.message, key)).toBe(false);
          expect(containsGoogleInternals(normalized.message)).toBe(false);
        }),
        { numRuns: 30 },
      );
    });
  });
});
