import { ServiceError } from './http';

/**
 * Validated configuration for Google Maps Platform integration.
 */
export interface MapsConfig {
  /** Server-restricted Google Maps API key (never exposed to browser). */
  serverKey: string;
  /** Browser-restricted Google Maps API key (NEXT_PUBLIC_). */
  browserKey: string;
  /** Cloud-based map styling identifier. */
  mapId: string;
  /** Whether mock mode is active. */
  isMockMode: boolean;
}

/**
 * Returns true when the application should use mock services instead of
 * real Google Maps Platform APIs.
 *
 * Mock mode activates when:
 * - NEXT_PUBLIC_USE_MOCK_SERVICES is exactly "true", OR
 * - NODE_ENV is "test"
 */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_SERVICES === 'true' || process.env.NODE_ENV === 'test';
}

/**
 * Returns the validated maps configuration.
 *
 * In mock mode: returns placeholder values without requiring real keys.
 * In live mode: throws a ServiceError (PROVIDER_ERROR, retryable: false) if
 * any required key is missing. Error messages never reveal variable names or
 * key values.
 */
export function getMapsConfig(): MapsConfig {
  const mock = isMockMode();

  if (mock) {
    return {
      serverKey: 'mock-server-key',
      browserKey: 'mock-browser-key',
      mapId: 'mock-map-id',
      isMockMode: true,
    };
  }

  // Live mode — validate all required keys are present.
  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY ?? '';
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? '';

  if (!serverKey) {
    throw new ServiceError(
      'PROVIDER_ERROR',
      'Map service configuration is incomplete — server credentials are not available',
      false,
    );
  }

  if (!browserKey) {
    throw new ServiceError(
      'PROVIDER_ERROR',
      'Map service configuration is incomplete — browser credentials are not available',
      false,
    );
  }

  if (!mapId) {
    throw new ServiceError(
      'PROVIDER_ERROR',
      'Map service configuration is incomplete — map identifier is not available',
      false,
    );
  }

  return {
    serverKey,
    browserKey,
    mapId,
    isMockMode: false,
  };
}
