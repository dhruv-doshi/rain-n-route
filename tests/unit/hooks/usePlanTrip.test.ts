import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseLocationParam, usePlanTrip } from '@/hooks/usePlanTrip';
import { useTripStore } from '@/store/tripStore';
import { MOCK_ROUTE_RESPONSE } from '@/services/maps/mock';

const MOCK_RESPONSE = { ...MOCK_ROUTE_RESPONSE, generatedAt: new Date().toISOString() };

beforeEach(() => {
  useTripStore.setState({ current: null });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_RESPONSE,
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseLocationParam', () => {
  it('parses a valid param', () => {
    const result = parseLocationParam('12.97,77.64,Indiranagar%2C%20Bengaluru');
    expect(result).toEqual({
      coords: { lat: 12.97, lng: 77.64 },
      label: 'Indiranagar, Bengaluru',
    });
  });

  it('returns null for empty string', () => {
    expect(parseLocationParam('')).toBeNull();
  });

  it('returns null for only one comma', () => {
    expect(parseLocationParam('12.97,77.64')).toBeNull();
  });

  it('returns null for non-numeric lat/lng', () => {
    expect(parseLocationParam('bad,data,label')).toBeNull();
  });

  it('handles labels containing commas', () => {
    const label = encodeURIComponent('MG Road, Bengaluru, KA');
    const result = parseLocationParam(`12.97,77.59,${label}`);
    expect(result?.label).toBe('MG Road, Bengaluru, KA');
  });
});

describe('usePlanTrip', () => {
  const FROM = '12.97,77.64,Indiranagar';
  const TO = '12.93,77.62,Whitefield';

  it('starts in loading status', () => {
    const { result } = renderHook(() => usePlanTrip(FROM, TO));
    expect(result.current.status).toBe('loading');
  });

  it('transitions to success and writes to store', async () => {
    const { result } = renderHook(() => usePlanTrip(FROM, TO));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.trip).not.toBeNull();
    expect(useTripStore.getState().current).not.toBeNull();
  });

  it('trip has scored routes', async () => {
    const { result } = renderHook(() => usePlanTrip(FROM, TO));
    await waitFor(() => expect(result.current.status).toBe('success'));
    for (const route of result.current.trip!.routes) {
      expect(route.scoreBreakdown).toBeDefined();
    }
  });

  it('transitions to error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;
    const { result } = renderHook(() => usePlanTrip(FROM, TO));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeTruthy();
  });

  it('transitions to error on !res.ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'RATE_LIMITED' } }),
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => usePlanTrip(FROM, TO));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatch(/wait a moment/i);
  });

  it('transitions to error for invalid params', async () => {
    const { result } = renderHook(() => usePlanTrip('bad', 'params'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('retry re-fetches (fetch called twice)', async () => {
    const { result } = renderHook(() => usePlanTrip(FROM, TO));
    await waitFor(() => expect(result.current.status).toBe('success'));
    result.current.retry();
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
  });

  it('does not set error state on AbortError', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Aborted'), { name: 'AbortError' }),
      ) as unknown as typeof fetch;
    const { result, unmount } = renderHook(() => usePlanTrip(FROM, TO));
    unmount();
    // Should not transition to error
    expect(result.current.status).toBe('loading');
  });
});
