'use client';

import { useState, useEffect, useRef } from 'react';
import type { GeoSuggestion, LatLng } from '@/types';

interface UseAutocompleteResult {
  suggestions: GeoSuggestion[];
  loading: boolean;
  error: string | null;
}

/**
 * Autocomplete hook for place search.
 *
 * - Debounces input by `debounceMs` (default 300ms)
 * - Returns empty suggestions without sending a request if query < 3 chars
 * - Truncates input to 100 characters before sending
 * - Aborts prior pending request when new input arrives
 * - Passes sessionToken and optional bias (lat/lng) to the autocomplete endpoint
 */
export function useAutocomplete(
  query: string,
  sessionToken: string,
  bias?: LatLng,
  debounceMs = 300,
): UseAutocompleteResult {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Requirement 3.7: Return empty suggestions for <3 characters without sending request
    if (query.length < 3) {
      // Use a microtask to avoid synchronous setState in effect body
      queueMicrotask(() => {
        setSuggestions([]);
        setLoading(false);
      });
      return;
    }

    // Requirement 3.1: 300ms debounce
    const timer = setTimeout(async () => {
      // Requirement 3.2: Abort prior pending request on new input
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        // Requirement 3.1: Truncate input exceeding 100 characters
        const truncatedQuery = query.slice(0, 100);

        // Build URL with sessionToken and optional bias params
        const params = new URLSearchParams({
          q: truncatedQuery,
          sessionToken,
        });

        if (bias) {
          params.set('lat', String(bias.lat));
          params.set('lng', String(bias.lng));
        }

        const res = await fetch(`/api/maps/autocomplete?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error('Autocomplete request failed');
        const data = (await res.json()) as { suggestions: GeoSuggestion[] };
        setSuggestions(data.suggestions);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Failed to load suggestions');
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, sessionToken, bias, debounceMs]);

  return { suggestions, loading, error };
}
