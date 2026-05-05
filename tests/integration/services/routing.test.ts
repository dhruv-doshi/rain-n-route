import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { planRoute } from '@/services/routing';
import { MOCK_ROUTE_RESPONSE } from '@/services/maps/mock';

const FROM = { lat: 12.9784, lng: 77.641 };
const TO = { lat: 12.9698, lng: 77.7499 };

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...MOCK_ROUTE_RESPONSE, generatedAt: '2026-05-04T09:00:00+05:30' }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('planRoute', () => {
  it('POSTs to /api/maps/route with the correct body', async () => {
    await planRoute({ from: FROM, to: TO, sortBy: 'fastest' });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/maps/route',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"modes"'),
      }),
    );
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.from).toEqual(FROM);
    expect(body.to).toEqual(TO);
    expect(body.modes).toContain('car');
    expect(body.modes).toContain('transit');
  });

  it('returns a PlannedTrip with scored routes', async () => {
    const trip = await planRoute({ from: FROM, to: TO, sortBy: 'fastest' });
    expect(trip.routes.length).toBeGreaterThan(0);
    for (const route of trip.routes) {
      expect(route.scoreBreakdown).toHaveProperty('fastest');
      expect(route.scoreBreakdown).toHaveProperty('cheapest');
      expect(route.scoreBreakdown).toHaveProperty('least_transfers');
      expect(route.scoreBreakdown).toHaveProperty('eco');
    }
  });

  it('returns routes sorted by fastest by default', async () => {
    const trip = await planRoute({ from: FROM, to: TO, sortBy: 'fastest' });
    const durations = trip.routes.map((r) => r.totalDuration);
    for (let i = 1; i < durations.length; i++) {
      expect(durations[i]).toBeGreaterThanOrEqual(durations[i - 1]);
    }
  });

  it('generatedAt matches the API response', async () => {
    const trip = await planRoute({ from: FROM, to: TO, sortBy: 'fastest' });
    expect(trip.generatedAt).toBe('2026-05-04T09:00:00+05:30');
  });

  it('throws with RATE_LIMITED code when API returns 429', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'RATE_LIMITED' } }),
    }) as unknown as typeof fetch;
    await expect(planRoute({ from: FROM, to: TO, sortBy: 'fastest' })).rejects.toThrow(
      'RATE_LIMITED',
    );
  });

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;
    await expect(planRoute({ from: FROM, to: TO, sortBy: 'fastest' })).rejects.toThrow();
  });
});
