'use client';

import { useEffect, useRef } from 'react';
import { decodePolyline } from '@/lib/geo';
import type { RouteOption, TransportMode } from '@/types';
import { useMapInstance } from './MapInstanceContext';

const MODE_COLOR: Record<TransportMode, string> = {
  car: '#3b82f6',
  two_wheeler: '#8b5cf6',
  transit: '#10b981',
  cab: '#f59e0b',
  auto: '#f97316',
  walk: '#6b7280',
  cycle: '#22c55e',
  mixed: '#ec4899',
};

interface Props {
  routes: RouteOption[];
  selectedRouteId?: string;
  onRouteClick?: (routeId: string) => void;
}

export function RouteOverlay({ routes, selectedRouteId, onRouteClick }: Props) {
  const map = useMapInstance();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clean up previous polylines
    for (const listener of listenersRef.current) {
      listener.remove();
    }
    listenersRef.current = [];
    for (const polyline of polylinesRef.current) {
      polyline.setMap(null);
    }
    polylinesRef.current = [];

    for (const route of routes) {
      if (!route.geometry) continue;

      const coords = decodePolyline(route.geometry);
      if (coords.length === 0) continue;

      const isSelected = route.id === selectedRouteId;
      const primaryMode = route.modes[0] ?? 'mixed';
      const color = MODE_COLOR[primaryMode] ?? '#3b82f6';

      const polyline = new google.maps.Polyline({
        path: coords.map((p) => ({ lat: p.lat, lng: p.lng })),
        strokeColor: color,
        strokeWeight: isSelected ? 6 : 3,
        strokeOpacity: isSelected ? 1.0 : 0.5,
        zIndex: isSelected ? 2 : 1,
        map,
      });

      polylinesRef.current.push(polyline);

      if (onRouteClick) {
        const listener = polyline.addListener('click', () => {
          onRouteClick(route.id);
        });
        listenersRef.current.push(listener);
      }
    }

    return () => {
      for (const listener of listenersRef.current) {
        listener.remove();
      }
      listenersRef.current = [];
      for (const polyline of polylinesRef.current) {
        polyline.setMap(null);
      }
      polylinesRef.current = [];
    };
  }, [map, routes, selectedRouteId, onRouteClick]);

  return null;
}
