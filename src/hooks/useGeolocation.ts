'use client';

import { useState, useCallback } from 'react';
import type { GeoSuggestion } from '@/types';

interface GeolocationState {
  loading: boolean;
  error: string | null;
  result: GeoSuggestion | null;
}

interface UseGeolocationReturn extends GeolocationState {
  trigger: () => Promise<GeoSuggestion | null>;
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    result: null,
  });

  const trigger = useCallback(async (): Promise<GeoSuggestion | null> => {
    if (!navigator.geolocation) {
      setState({ loading: false, error: 'Geolocation is not supported', result: null });
      return null;
    }

    setState({ loading: true, error: null, result: null });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res = await fetch(
              `/api/maps/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`,
            );
            if (!res.ok) throw new Error('Reverse geocode failed');
            const data = (await res.json()) as { result: { label: string } };
            const suggestion: GeoSuggestion = {
              id: `geo:${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`,
              label: data.result.label,
              secondary: 'Your current location',
              coords: { lat: coords.latitude, lng: coords.longitude },
            };
            setState({ loading: false, error: null, result: suggestion });
            resolve(suggestion);
          } catch {
            setState({ loading: false, error: 'Could not determine your address', result: null });
            resolve(null);
          }
        },
        () => {
          setState({ loading: false, error: 'Location access denied', result: null });
          resolve(null);
        },
        { timeout: 8000 },
      );
    });
  }, []);

  return { ...state, trigger };
}
