'use client';

import { useEffect, useRef, useState } from 'react';
import { computeEtaDelta, type EtaDelta } from '@/lib/etaDelta';

export interface UseTrafficPollingArgs {
  baselineSec: number | null;
  refetch: (signal: AbortSignal) => Promise<number>;
  intervalMs?: number;
  thresholdPct?: number;
  enabled?: boolean;
}

export interface UseTrafficPollingResult {
  currentSec: number | null;
  delta: EtaDelta | null;
  lastUpdatedAt: Date | null;
}

const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Polls `refetch()` every `intervalMs` (default 60s) and reports the ETA delta
 * vs `baselineSec`. Pauses when the document is hidden (visibility API),
 * resumes on visible. Cancels in-flight fetches on unmount or visibility change.
 *
 * The polling interval is independent of `baselineSec` and `refetch` (those go
 * through refs) so re-renders / route-selection changes do NOT reset the timer.
 *
 * Note: this hook only computes deltas — it does not trigger re-routing itself.
 * The consuming UI decides what to do when `delta.shouldPromptReroute` is true.
 */
export function useTrafficPolling({
  baselineSec,
  refetch,
  intervalMs = DEFAULT_INTERVAL_MS,
  thresholdPct,
  enabled = true,
}: UseTrafficPollingArgs): UseTrafficPollingResult {
  const [currentSec, setCurrentSec] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // Refs let the interval keep running across re-renders without tearing down.
  // Updated in a layout effect so render itself stays pure.
  const refetchRef = useRef(refetch);
  const baselineRef = useRef(baselineSec);
  useEffect(() => {
    refetchRef.current = refetch;
    baselineRef.current = baselineSec;
  });

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let controller: AbortController | null = null;
    let cancelled = false;

    async function poll() {
      // Skip polls until we have a baseline to compare against.
      if (baselineRef.current == null || baselineRef.current <= 0) return;
      controller?.abort();
      controller = new AbortController();
      try {
        const next = await refetchRef.current(controller.signal);
        if (cancelled || controller.signal.aborted) return;
        setCurrentSec(next);
        setLastUpdatedAt(new Date());
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Swallow other errors; polling is best-effort and shouldn't break the UI.
      }
    }

    function start() {
      if (timer != null) return;
      timer = setInterval(poll, intervalMs);
    }
    function stop() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
      controller?.abort();
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') stop();
      else start();
    }

    if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
      start();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);

  const delta =
    baselineSec != null && currentSec != null
      ? computeEtaDelta(baselineSec, currentSec, thresholdPct)
      : null;

  return { currentSec, delta, lastUpdatedAt };
}
