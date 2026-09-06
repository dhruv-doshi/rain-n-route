'use client';

import { useEffect, useRef } from 'react';
import type { FloodExposureHit } from '@/types';
import { decodePolyline } from '@/lib/geo';
import { useMapInstance } from './MapInstanceContext';

const HIT_COLOR = '#ef4444';

interface Props {
  hits: FloodExposureHit[];
  routeGeometry?: string;
}

export function HazardLayer({ hits, routeGeometry }: Props) {
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
            strokeColor: HIT_COLOR,
            strokeOpacity: 0.25,
            strokeWeight: 10,
            map,
            zIndex: 1,
          }),
        );
      }
    }

    for (const hit of hits.slice(0, 12)) {
      overlays.push(
        new google.maps.Marker({
          map,
          position: { lat: hit.lat, lng: hit.lng },
          title: hit.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: HIT_COLOR,
            fillOpacity: 0.9,
            strokeColor: '#fff',
            strokeWeight: 1,
          },
        }),
      );
    }

    overlaysRef.current = overlays;

    return () => {
      for (const o of overlaysRef.current) o.setMap(null);
      overlaysRef.current = [];
    };
  }, [map, hits, routeGeometry]);

  return null;
}
