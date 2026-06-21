'use client';

import { useEffect, useRef, useState } from 'react';
import type { LatLng } from '@/types';
import { loadMapsLibrary, isGoogleMapsConfigured } from '@/lib/googleMapsLoader';
import { MapInstanceContext } from './MapInstanceContext';

export interface MapCanvasProps {
  center: LatLng;
  zoom?: number;
  children?: React.ReactNode;
  onReady?: (map: google.maps.Map) => void;
  onError?: (error: Error) => void;
}

type MapStatus = 'loading' | 'ready' | 'error';

/** Timeout in ms for map initialization. */
const INIT_TIMEOUT_MS = 10_000;

export function MapCanvas({ center, zoom = 12, children, onReady, onError }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Store latest callbacks in refs to avoid re-running the init effect
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!containerRef.current) return;

    // If Google Maps is not configured (missing browser key or map ID), show error immediately
    if (!isGoogleMapsConfigured()) {
      // Use a microtask to avoid synchronous setState in effect body
      queueMicrotask(() => {
        setStatus('error');
        setErrorMessage('Map configuration is incomplete. Please check your environment settings.');
        onErrorRef.current?.(new Error('Google Maps is not configured'));
      });
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function init() {
      // Set up a timeout to fail if loading takes too long
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Map initialization timed out'));
        }, INIT_TIMEOUT_MS);
      });

      try {
        // Race: load maps library vs timeout
        const mapsLib = await Promise.race([loadMapsLibrary(), timeoutPromise]);

        if (cancelled || !containerRef.current) return;

        const map = new mapsLib.Map(containerRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
          disableDefaultUI: false,
          gestureHandling: 'greedy',
        });

        if (cancelled) return;

        mapRef.current = map;
        setMapInstance(map);
        setStatus('ready');
        onReadyRef.current?.(map);
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Map failed to load');
          setStatus('error');
          setErrorMessage(error.message);
          onErrorRef.current?.(error);
        }
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      // Clean up: set map container ref to null
      mapRef.current = null;
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when props change without re-instantiating the map
  const prevCenterRef = useRef(center);
  useEffect(() => {
    if (!mapRef.current) return;
    if (prevCenterRef.current.lat !== center.lat || prevCenterRef.current.lng !== center.lng) {
      mapRef.current.panTo({ lat: center.lat, lng: center.lng });
      prevCenterRef.current = center;
    }
  }, [center]);

  // Update zoom when props change without re-instantiating the map
  const prevZoomRef = useRef(zoom);
  useEffect(() => {
    if (!mapRef.current) return;
    if (prevZoomRef.current !== zoom) {
      mapRef.current.setZoom(zoom);
      prevZoomRef.current = zoom;
    }
  }, [zoom]);

  return (
    <MapInstanceContext.Provider value={mapInstance}>
      <div className="relative size-full">
        {/* Map container — always rendered so the div is available for Google Maps */}
        <div
          ref={containerRef}
          className="size-full"
          role="application"
          aria-label="Interactive route map"
          style={{ display: status === 'error' ? 'none' : undefined }}
        />

        {/* Loading skeleton */}
        {status === 'loading' && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-muted/50"
            aria-label="Map loading"
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Loading map…</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/30 p-4"
            role="alert"
            aria-label="Map unavailable"
          >
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">Map unavailable</p>
              <p className="mt-1">
                {errorMessage ||
                  'The map could not be loaded. Route cards and form inputs remain available below.'}
              </p>
            </div>
          </div>
        )}

        {/* Children (overlays, layers, controls) rendered inside context when map is ready */}
        {mapInstance && children}
      </div>
    </MapInstanceContext.Provider>
  );
}
