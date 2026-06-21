'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LatLng, PlannedTrip, SortMode } from '@/types';
import { planRoute, enrichWithWeather } from '@/services/routing';
import { useTripStore } from '@/store/tripStore';

export function parseLocationParam(raw: string): { coords: LatLng; label: string } | null {
  if (!raw) return null;
  // Format: "lat,lng,encodedLabel" — label may contain commas once decoded
  const firstComma = raw.indexOf(',');
  if (firstComma === -1) return null;
  const secondComma = raw.indexOf(',', firstComma + 1);
  if (secondComma === -1) return null;

  const lat = Number(raw.slice(0, firstComma));
  const lng = Number(raw.slice(firstComma + 1, secondComma));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const label = decodeURIComponent(raw.slice(secondComma + 1));
  return { coords: { lat, lng }, label };
}

export type PlanStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UsePlanTripResult {
  status: PlanStatus;
  trip: PlannedTrip | null;
  error: string | null;
  retry: () => void;
}

const DEFAULT_SORT: SortMode = 'fastest';

export function usePlanTrip(rawFrom: string, rawTo: string, departAt?: string): UsePlanTripResult {
  const setTrip = useTripStore((s) => s.set);

  const [status, setStatus] = useState<PlanStatus>('idle');
  const [trip, setLocalTrip] = useState<PlannedTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((n) => n + 1), []);

  useEffect(() => {
    const from = parseLocationParam(rawFrom);
    const to = parseLocationParam(rawTo);

    if (!from || !to) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');

      setError('Invalid trip locations — please go back and try again.');
      return;
    }

    const controller = new AbortController();

    setStatus('loading');

    setError(null);

    planRoute({
      from: from.coords,
      to: to.coords,
      sortBy: DEFAULT_SORT,
      departAt: departAt || undefined,
      signal: controller.signal,
    })
      .then(async (result) => {
        if (controller.signal.aborted) return;
        setTrip(result);
        setLocalTrip(result);
        setStatus('success');
        // Enrich with weather in the background — failure is non-fatal
        const enriched = await enrichWithWeather(result);
        if (controller.signal.aborted) return;
        setTrip(enriched);
        setLocalTrip(enriched);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        const msg =
          (err as { code?: string }).code === 'RATE_LIMITED'
            ? 'Too many requests — please wait a moment and try again.'
            : 'Could not fetch routes. Check your connection and try again.';
        setError(msg);
        setStatus('error');
      });

    return () => controller.abort();
    // retryCount in deps triggers re-fetch on retry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFrom, rawTo, departAt, retryCount]);

  return { status, trip, error, retry };
}
