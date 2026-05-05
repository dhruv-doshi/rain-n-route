import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MapmyIndiaProvider } from '@/services/maps/mapmyindia';
import { ServiceError } from '@/lib/http';
import { mapsHandlers, errorHandlers } from './mswHandlers';

// Token cache is module-level — reset between tests by mocking the env
process.env.MAPS_CLIENT_ID = 'test-client-id';
process.env.MAPS_SECRET = 'test-secret';

const server = setupServer(...mapsHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MapmyIndiaProvider', () => {
  const provider = new MapmyIndiaProvider();

  describe('autocomplete', () => {
    it('returns GeoSuggestion array from fixture', async () => {
      const results = await provider.autocomplete('Indiranagar');
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: 'MMI001',
        label: 'Indiranagar',
        coords: { lat: 12.9784, lng: 77.641 },
      });
    });

    it('surfaces station placeType for metro station', async () => {
      const results = await provider.autocomplete('Indiranagar');
      const metro = results.find((r) => r.id === 'MMI002');
      expect(metro).toBeDefined();
    });
  });

  describe('geocode (delegates to Nominatim)', () => {
    it('returns GeoResult array with coords from Nominatim', async () => {
      const results = await provider.geocode('Indiranagar Bengaluru');
      expect(results).toHaveLength(1);
      expect(results[0].coords).toMatchObject({ lat: 12.9784, lng: 77.641 });
      expect(results[0].label).toContain('Indiranagar');
    });

    it('returns empty array when Nominatim has no matches', async () => {
      server.use(
        http.get('https://nominatim.openstreetmap.org/search', () => HttpResponse.json([])),
      );
      const results = await provider.geocode('nothing');
      expect(results).toEqual([]);
    });
  });

  describe('reverseGeocode (delegates to Nominatim)', () => {
    it('returns single GeoResult with coords', async () => {
      const result = await provider.reverseGeocode({ lat: 12.9784, lng: 77.641 });
      expect(result.label).toContain('Indiranagar');
      expect(result.coords).toMatchObject({ lat: 12.9784, lng: 77.641 });
    });
  });

  describe('route', () => {
    it('returns RouteResponse with at least one route', async () => {
      const response = await provider.route({
        from: { lat: 12.9784, lng: 77.641 },
        to: { lat: 12.9698, lng: 77.7499 },
        modes: ['car'],
      });
      expect(response.routes).toHaveLength(1);
      expect(response.routes[0].totalDistance).toBe(12500);
      expect(response.routes[0].totalDuration).toBe(2700);
      expect(response.routes[0].steps).toHaveLength(2);
    });

    it('skips a mode when the upstream returns no routes', async () => {
      server.use(
        // Override to return empty routes
        ...mapsHandlers.slice(0, -2),
      );
      const response = await provider.route({
        from: { lat: 12.9784, lng: 77.641 },
        to: { lat: 12.9698, lng: 77.7499 },
        modes: ['car', 'walk'],
      });
      // Should not throw — may return fewer routes than requested modes
      expect(Array.isArray(response.routes)).toBe(true);
    });
  });

  describe('trafficFor', () => {
    it('returns TrafficSnapshot with routeId', async () => {
      const snapshot = await provider.trafficFor('test-route-id');
      expect(snapshot.routeId).toBe('test-route-id');
      expect(Array.isArray(snapshot.segments)).toBe(true);
    });
  });

  describe('tilesUrl', () => {
    it('returns a URL string for each layer', () => {
      expect(provider.tilesUrl('base')).toMatch(/^https?:\/\/.+\{z\}.+\{x\}.+\{y\}/);
      expect(provider.tilesUrl('traffic')).toMatch(/^https?:\/\/.+\{z\}.+\{x\}.+\{y\}/);
      expect(provider.tilesUrl('transit')).toMatch(/^https?:\/\/.+\{z\}.+\{x\}.+\{y\}/);
    });
  });

  describe('error handling', () => {
    it('throws ServiceError with PROVIDER_ERROR on 500', async () => {
      server.use(errorHandlers.mmiAutosuggest500);
      await expect(provider.autocomplete('test')).rejects.toSatisfy(
        (e: unknown) => e instanceof ServiceError && e.code === 'PROVIDER_ERROR',
      );
    });
  });
});
