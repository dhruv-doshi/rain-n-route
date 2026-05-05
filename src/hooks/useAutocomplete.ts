'use client';

import { useState, useEffect, useRef } from 'react';
import type { GeoSuggestion } from '@/types';

interface UseAutocompleteResult {
  suggestions: GeoSuggestion[];
  loading: boolean;
  error: string | null;
}

export function useAutocomplete(query: string, debounceMs = 300): UseAutocompleteResult {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      // Resetting derived state when the query becomes too short. setState in
      // effect is intentional here — alternative would require lifting state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);

      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/maps/autocomplete?q=${encodeURIComponent(query)}`, {
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
  }, [query, debounceMs]);

  return { suggestions, loading, error };
}
