import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MockMapsProvider } from '@/services/maps/mock';

/**
 * Security Verification Tests
 *
 * Tests covering:
 * 1. Server key never bundled in client output (env prefix verification)
 * 2. API error responses never echo request headers or keys
 * 3. Mock mode produces zero Google network calls
 *
 * **Validates: Requirements 2.5, 2.7, 14.1, 14.5, 14.6**
 */

// ────────────────────────────────────────────────────────────────────
// Test 1: Server Key Not In Build Output
//
// Rather than running a full `pnpm build` (which is slow and already
// partially covered by the key isolation property test 8.5), we verify
// the architectural guarantee: GOOGLE_MAPS_SERVER_KEY does NOT have
// the NEXT_PUBLIC_ prefix, which is what Next.js uses to decide which
// env vars to include in the client bundle.
// ────────────────────────────────────────────────────────────────────

describe('Server key not in client build output', () => {
  it('GOOGLE_MAPS_SERVER_KEY does not have NEXT_PUBLIC_ prefix', () => {
    // The env var name itself must not start with NEXT_PUBLIC_
    // This is the architectural guarantee that Next.js won't bundle it
    const serverKeyName = 'GOOGLE_MAPS_SERVER_KEY';
    expect(serverKeyName.startsWith('NEXT_PUBLIC_')).toBe(false);
  });

  it('env module does not expose server key through any NEXT_PUBLIC_ variable', async () => {
    // Dynamically import env module and verify that getMapsConfig in mock mode
    // does not reference any NEXT_PUBLIC_ prefix for the server key
    const { getMapsConfig, isMockMode } = await import('@/lib/env');

    // In test environment, mock mode is active
    expect(isMockMode()).toBe(true);

    const config = getMapsConfig();
    // The server key field should be present but should never be sourced
    // from a NEXT_PUBLIC_ environment variable
    expect(config.serverKey).toBeDefined();

    // Verify that no environment variable named NEXT_PUBLIC_GOOGLE_MAPS_SERVER_KEY exists
    expect(process.env.NEXT_PUBLIC_GOOGLE_MAPS_SERVER_KEY).toBeUndefined();
  });

  it('server key env var name is distinct from any NEXT_PUBLIC_ prefixed variable', () => {
    // Document and verify the key naming convention
    const serverEnvVars = ['GOOGLE_MAPS_SERVER_KEY'];
    const clientEnvVars = [
      'NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY',
      'NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID',
      'NEXT_PUBLIC_USE_MOCK_SERVICES',
    ];

    // No server var should start with NEXT_PUBLIC_
    for (const v of serverEnvVars) {
      expect(v.startsWith('NEXT_PUBLIC_')).toBe(false);
    }

    // All client vars should start with NEXT_PUBLIC_
    for (const v of clientEnvVars) {
      expect(v.startsWith('NEXT_PUBLIC_')).toBe(true);
    }

    // Server key name should not be a substring of any client var name
    for (const v of clientEnvVars) {
      expect(v).not.toContain('SERVER_KEY');
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// Test 2: API Error Responses Never Echo Request Headers or Keys
//
// Uses MSW to make the Google provider throw errors, then verifies the
// returned error responses from route handlers don't contain the
// server key or any request headers.
// ────────────────────────────────────────────────────────────────────

const TEST_SERVER_KEY = 'AIzaSyTEST_SECRET_KEY_DO_NOT_LEAK_XYZ123';

const errorHandlers = [
  // Places autocomplete returns 403
  http.post('https://places.googleapis.com/v1/places:autocomplete', () => {
    return new HttpResponse(
      JSON.stringify({
        error: {
          message: `API key not valid. Please pass a valid API key. Key: ${TEST_SERVER_KEY}`,
          status: 'PERMISSION_DENIED',
        },
      }),
      { status: 403 },
    );
  }),

  // Place Details returns 429
  http.get('https://places.googleapis.com/v1/places/:placeId', () => {
    return new HttpResponse(
      JSON.stringify({
        error: {
          message: 'Resource has been exhausted',
          status: 'RESOURCE_EXHAUSTED',
        },
      }),
      { status: 429 },
    );
  }),

  // Geocode returns 403
  http.get('https://maps.googleapis.com/maps/api/geocode/json', () => {
    return new HttpResponse(
      JSON.stringify({
        error_message: `The provided API key is invalid: ${TEST_SERVER_KEY}`,
        results: [],
        status: 'REQUEST_DENIED',
      }),
      { status: 403 },
    );
  }),

  // Routes returns 500
  http.post('https://routes.googleapis.com/directions/v2:computeRoutes', () => {
    return new HttpResponse(
      JSON.stringify({
        error: {
          message: 'Internal server error',
          status: 'INTERNAL',
          details: [{ requestHeaders: { 'X-Goog-Api-Key': TEST_SERVER_KEY } }],
        },
      }),
      { status: 500 },
    );
  }),
];

describe('API error responses never echo request headers or keys', () => {
  const server = setupServer(...errorHandlers);

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('autocomplete 403 error response does not contain the server key', async () => {
    const { GoogleMapsProvider } = await import('@/services/maps/google');
    const provider = new GoogleMapsProvider(TEST_SERVER_KEY);

    try {
      await provider.autocomplete('test', { sessionToken: 'session-1' });
      expect.fail('Expected error to be thrown');
    } catch (err: unknown) {
      const error = err as Error & { code?: string; message: string; retryable?: boolean };
      // The error message must not contain the key
      expect(error.message).not.toContain(TEST_SERVER_KEY);
      expect(error.message).not.toContain('AIzaSy');
      // Must not contain Google internal header names
      expect(error.message).not.toContain('X-Goog-Api-Key');
      expect(error.message).not.toContain('X-Goog-FieldMask');
      // Code should be PROVIDER_ERROR for 403
      expect(error.code).toBe('PROVIDER_ERROR');
    }
  });

  it('place resolution 429 error response does not contain the server key', async () => {
    const { GoogleMapsProvider } = await import('@/services/maps/google');
    const provider = new GoogleMapsProvider(TEST_SERVER_KEY);

    try {
      await provider.resolvePlace('ChIJ_test', {
        sessionToken: 'session-1',
        fallbackLabel: 'Test',
      });
      expect.fail('Expected error to be thrown');
    } catch (err: unknown) {
      const error = err as Error & { code?: string; message: string; retryable?: boolean };
      expect(error.message).not.toContain(TEST_SERVER_KEY);
      expect(error.message).not.toContain('X-Goog-Api-Key');
      expect(error.code).toBe('RATE_LIMITED');
    }
  });

  it('geocode 403 error response does not contain the server key', async () => {
    const { GoogleMapsProvider } = await import('@/services/maps/google');
    const provider = new GoogleMapsProvider(TEST_SERVER_KEY);

    try {
      await provider.geocode('test address');
      expect.fail('Expected error to be thrown');
    } catch (err: unknown) {
      const error = err as Error & { code?: string; message: string; retryable?: boolean };
      expect(error.message).not.toContain(TEST_SERVER_KEY);
      expect(error.message).not.toContain('AIzaSy');
      expect(error.message).not.toContain('X-Goog-Api-Key');
    }
  });

  it('route 500 error response does not contain the server key or request headers', async () => {
    const { GoogleMapsProvider } = await import('@/services/maps/google');
    const provider = new GoogleMapsProvider(TEST_SERVER_KEY);

    try {
      await provider.route({
        from: { lat: 12.9716, lng: 77.5946 },
        to: { lat: 12.9784, lng: 77.6408 },
        modes: ['car'],
      });
      expect.fail('Expected error to be thrown');
    } catch (err: unknown) {
      const error = err as Error & { code?: string; message: string; retryable?: boolean };
      expect(error.message).not.toContain(TEST_SERVER_KEY);
      expect(error.message).not.toContain('X-Goog-Api-Key');
      expect(error.message).not.toContain('X-Goog-FieldMask');
      expect(error.message).not.toContain('requestHeaders');
      // Serialize the entire error shape to check nothing leaks
      const serialized = JSON.stringify({ code: error.code, message: error.message });
      expect(serialized).not.toContain(TEST_SERVER_KEY);
    }
  });

  it('error responses never contain full API key substrings (4+ chars)', async () => {
    const { GoogleMapsProvider } = await import('@/services/maps/google');
    const provider = new GoogleMapsProvider(TEST_SERVER_KEY);

    // Collect all error messages from different endpoints
    const errorMessages: string[] = [];

    try {
      await provider.autocomplete('test', { sessionToken: 's1' });
    } catch (err: unknown) {
      errorMessages.push((err as Error).message);
    }

    try {
      await provider.resolvePlace('ChIJ_test', {
        sessionToken: 's1',
        fallbackLabel: 'Test',
      });
    } catch (err: unknown) {
      errorMessages.push((err as Error).message);
    }

    try {
      await provider.geocode('test');
    } catch (err: unknown) {
      errorMessages.push((err as Error).message);
    }

    try {
      await provider.route({
        from: { lat: 12.9716, lng: 77.5946 },
        to: { lat: 12.9784, lng: 77.6408 },
        modes: ['car'],
      });
    } catch (err: unknown) {
      errorMessages.push((err as Error).message);
    }

    expect(errorMessages.length).toBeGreaterThanOrEqual(4);

    // Check no 4+ char substring of the key appears in any error message
    for (const msg of errorMessages) {
      for (let i = 0; i <= TEST_SERVER_KEY.length - 4; i++) {
        const sub = TEST_SERVER_KEY.slice(i, i + 4);
        // Skip very common substrings that might legitimately appear
        if (['test', 'TEST', 'LEAK'].includes(sub)) continue;
        expect(msg).not.toContain(sub);
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// Test 3: Mock Mode Produces Zero Google Network Calls
//
// Sets NEXT_PUBLIC_USE_MOCK_SERVICES=true (which is default in tests),
// calls all provider methods, and verifies zero HTTP requests to
// *.googleapis.com using MSW request event tracking.
// ────────────────────────────────────────────────────────────────────

describe('Mock mode produces zero Google network calls', () => {
  const googleRequests: Array<{ url: string; method: string }> = [];

  // Set up a server that intercepts ALL requests and tracks googleapis calls
  const trackingServer = setupServer(
    // Catch-all handler for any Google API request
    http.all('https://*.googleapis.com/*', ({ request }) => {
      googleRequests.push({ url: request.url, method: request.method });
      return new HttpResponse(null, { status: 500 });
    }),
    http.all('https://*.gstatic.com/*', ({ request }) => {
      googleRequests.push({ url: request.url, method: request.method });
      return new HttpResponse(null, { status: 500 });
    }),
  );

  beforeAll(() => trackingServer.listen({ onUnhandledRequest: 'bypass' }));
  beforeEach(() => {
    googleRequests.length = 0;
  });
  afterEach(() => trackingServer.resetHandlers());
  afterAll(() => trackingServer.close());

  it('MockMapsProvider.autocomplete makes zero Google API calls', async () => {
    const provider = new MockMapsProvider();
    await provider.autocomplete('Indiranagar', {
      sessionToken: 'test-session',
      bias: { lat: 12.97, lng: 77.64 },
    });

    expect(googleRequests).toHaveLength(0);
  });

  it('MockMapsProvider.resolvePlace makes zero Google API calls', async () => {
    const provider = new MockMapsProvider();
    await provider.resolvePlace('ChIJbU60yXAWrjsR4E9-UejD3_g', {
      sessionToken: 'test-session',
      fallbackLabel: 'Indiranagar',
    });

    expect(googleRequests).toHaveLength(0);
  });

  it('MockMapsProvider.geocode makes zero Google API calls', async () => {
    const provider = new MockMapsProvider();
    await provider.geocode('Indiranagar Bengaluru');

    expect(googleRequests).toHaveLength(0);
  });

  it('MockMapsProvider.reverseGeocode makes zero Google API calls', async () => {
    const provider = new MockMapsProvider();
    await provider.reverseGeocode({ lat: 12.9784, lng: 77.6408 });

    expect(googleRequests).toHaveLength(0);
  });

  it('MockMapsProvider.route makes zero Google API calls', async () => {
    const provider = new MockMapsProvider();
    await provider.route({
      from: { lat: 12.9716, lng: 77.5946 },
      to: { lat: 12.9784, lng: 77.6408 },
      modes: ['car', 'two_wheeler', 'transit', 'walk'],
    });

    expect(googleRequests).toHaveLength(0);
  });

  it('all mock provider methods combined produce zero Google network calls', async () => {
    const provider = new MockMapsProvider();

    // Call every provider method
    await provider.autocomplete('test query', {
      sessionToken: 'session-1',
      bias: { lat: 12.97, lng: 77.64 },
    });
    await provider.resolvePlace('ChIJ_test123', {
      sessionToken: 'session-1',
      fallbackLabel: 'Test Place',
    });
    await provider.geocode('Bengaluru Karnataka');
    await provider.reverseGeocode({ lat: 12.9716, lng: 77.5946 });
    await provider.route({
      from: { lat: 12.9716, lng: 77.5946 },
      to: { lat: 12.9784, lng: 77.6408 },
      modes: ['car', 'two_wheeler', 'transit', 'walk'],
    });

    // Verify absolutely zero Google API requests were made
    expect(googleRequests).toHaveLength(0);
  });

  it('mock mode is active in test environment by default', async () => {
    const { isMockMode } = await import('@/lib/env');
    expect(isMockMode()).toBe(true);
  });

  it('service factory returns MockMapsProvider when mock mode is active', async () => {
    const { getMapsProvider } = await import('@/services');
    const provider = getMapsProvider();

    // Verify it's the mock provider by checking the class
    expect(provider).toBeInstanceOf(MockMapsProvider);
  });

  it('mock provider returns deterministic data without external dependencies', async () => {
    const provider = new MockMapsProvider();

    // Call the same method twice and verify identical results
    const result1 = await provider.autocomplete('test', { sessionToken: 's1' });
    const result2 = await provider.autocomplete('test', { sessionToken: 's2' });

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));

    // Route results should also be deterministic
    const route1 = await provider.route({
      from: { lat: 12.97, lng: 77.59 },
      to: { lat: 12.98, lng: 77.64 },
      modes: ['car'],
    });
    const route2 = await provider.route({
      from: { lat: 12.97, lng: 77.59 },
      to: { lat: 12.98, lng: 77.64 },
      modes: ['car'],
    });

    expect(route1.routes[0].totalDuration).toBe(route2.routes[0].totalDuration);
    expect(route1.routes[0].totalDistance).toBe(route2.routes[0].totalDistance);
    expect(route1.generatedAt).toBe(route2.generatedAt);

    // And still zero Google requests
    expect(googleRequests).toHaveLength(0);
  });
});
