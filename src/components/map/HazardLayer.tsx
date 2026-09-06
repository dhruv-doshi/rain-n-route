'use client';

import { useEffect, useRef } from 'react';
import type { FloodExposureHit } from '@/types';
import { decodePolyline } from '@/lib/geo';
import { useMapInstance } from './MapInstanceContext';

const HIT_COLOR = '#dc2626';
const ROUTE_HALO_COLOR = '#fca5a5';

interface Props {
  hits: FloodExposureHit[];
  routeGeometry?: string;
  onHitClick?: (hit: FloodExposureHit) => void;
}

export function HazardLayer({ hits, routeGeometry, onHitClick }: Props) {
  const map = useMapInstance();
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);

  useEffect(() => {
    if (!map) return;

    const overlays: (google.maps.Marker | google.maps.Polyline)[] = [];

    if (routeGeometry && hits.length > 0) {
      const path = decodePolyline(routeGeometry).map((p) => ({ lat: p.lat, lng: p.lng }));
      if (path.length > 1) {
        overlays.push(
          new google.maps.Polyline({
            path,
            strokeColor: ROUTE_HALO_COLOR,
            strokeOpacity: 0.45,
            strokeWeight: 14,
            map,
            zIndex: 1,
          }),
          new google.maps.Polyline({
            path,
            strokeColor: HIT_COLOR,
            strokeOpacity: 0.35,
            strokeWeight: 6,
            map,
            zIndex: 2,
          }),
        );
      }
    }

    for (const hit of hits.slice(0, 16)) {
      const marker = new google.maps.Marker({
        map,
        position: { lat: hit.lat, lng: hit.lng },
        title: hit.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: HIT_COLOR,
          fillOpacity: 0.95,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        zIndex: 3,
      });
      if (onHitClick) {
        marker.addListener('click', () => onHitClick(hit));
      }
      overlays.push(marker);
    }

    overlaysRef.current = overlays;

    return () => {
      for (const o of overlaysRef.current) o.setMap(null);
      overlaysRef.current = [];
    };
  }, [map, hits, routeGeometry, onHitClick]);

  return null;
}
