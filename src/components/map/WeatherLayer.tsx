'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CloudRain, Sun, Wind } from 'lucide-react';
import { sampleWaypoints } from '@/lib/geo';
import { loadMarkerLibrary } from '@/lib/googleMapsLoader';
import type { RouteOption, RiskLevel } from '@/types';
import { useMapInstance } from './MapInstanceContext';

const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#f97316',
  severe: '#ef4444',
};

function WeatherMarkerIcon({ condition, color }: { condition: string; color: string }) {
  if (condition === 'rain' || condition === 'flood') {
    return <CloudRain style={{ color, width: 20, height: 20 }} />;
  }
  if (condition === 'wind') {
    return <Wind style={{ color, width: 20, height: 20 }} />;
  }
  return <Sun style={{ color, width: 20, height: 20 }} />;
}

interface MarkerHandle {
  root: Root;
  marker: { map?: unknown | null };
}

interface Props {
  route: RouteOption;
}

export function WeatherLayer({ route }: Props) {
  const map = useMapInstance();
  const markersRef = useRef<MarkerHandle[]>([]);

  useEffect(() => {
    if (!map || !route.weatherRisk) return;

    const { overall, factors } = route.weatherRisk;
    const dominantFactor = factors[0]?.kind ?? 'heat';
    const color = RISK_COLOR[overall];
    let cancelled = false;

    async function addMarkers() {
      const { AdvancedMarkerElement } = await loadMarkerLibrary();
      if (cancelled) return;

      const waypoints = sampleWaypoints(route.geometry, 5000);

      for (const wp of waypoints) {
        if (cancelled) break;

        const el = document.createElement('div');
        el.style.cssText =
          'background:white;border-radius:50%;padding:2px;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;';

        const root = createRoot(el);
        root.render(<WeatherMarkerIcon condition={dominantFactor} color={color} />);

        const marker = new AdvancedMarkerElement({
          map: map!,
          position: { lat: wp.lat, lng: wp.lng },
          content: el,
        });

        markersRef.current.push({ root, marker });
      }
    }

    addMarkers().catch(console.error);

    return () => {
      cancelled = true;
      // Defer unmount to avoid calling root.unmount() during an active React render cycle.
      const handles = markersRef.current;
      markersRef.current = [];
      queueMicrotask(() => {
        for (const { root, marker } of handles) {
          root.unmount();
          marker.map = null;
        }
      });
    };
  }, [map, route.id, route.geometry, route.weatherRisk]);

  return null;
}
