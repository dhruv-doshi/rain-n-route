'use client';

import { useEffect, useRef } from 'react';
import type { RiskLevel } from '@/types';
import { useLocalNotifications } from './useLocalNotifications';

const CHECK_INTERVAL_MS = 30 * 60 * 1_000;

interface Args {
  /** Current overall weather risk for the active trip (or null if unknown). */
  currentRisk: RiskLevel | null;
  /** Re-fetch weather risk for the active trip. Returns the latest risk level. */
  refetch: () => Promise<RiskLevel | null>;
  enabled?: boolean;
}

/**
 * Re-checks weather risk on tab focus + every 30 min while visible. Fires a
 * local notification if the risk crosses *up to* severe (we only notify on
 * the upward transition, not on every poll).
 *
 * Notifications require prior permission via `useLocalNotifications().request()`.
 */
export function useSevereWeatherWatcher({ currentRisk, refetch, enabled = true }: Args): void {
  const { notify } = useLocalNotifications();
  const lastRiskRef = useRef<RiskLevel | null>(currentRisk);
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
    lastRiskRef.current = currentRisk;
  });

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function check() {
      const next = await refetchRef.current();
      if (cancelled) return;
      const prev = lastRiskRef.current;
      if (next === 'severe' && prev !== 'severe') {
        notify('Severe weather alert', {
          body: 'Conditions on your route have escalated to severe. Consider re-planning.',
          tag: 'severe-weather',
        });
      }
      lastRiskRef.current = next;
    }

    function start() {
      if (timer != null) return;
      timer = setInterval(check, CHECK_INTERVAL_MS);
    }
    function stop() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') stop();
      else {
        start();
        check();
      }
    }

    if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
      start();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', check);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', check);
    };
  }, [enabled, notify]);
}
