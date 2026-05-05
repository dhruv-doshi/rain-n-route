'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map } from 'maplibre-gl';
import type { LatLng } from '@/types';
import { MapInstanceContext } from './MapInstanceContext';

interface Props {
  center: LatLng;
  zoom?: number;
  tilesUrl: string;
  children?: React.ReactNode;
  onReady?: (map: Map) => void;
}

export function MapCanvas({ center, zoom = 12, tilesUrl, children, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: Map;

    async function init() {
      const maplibregl = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css').catch(() => {
        /* CSS handled by bundler */
      });

      if (!containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            base: {
              type: 'raster',
              tiles: [tilesUrl],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: 'base-tiles',
              type: 'raster',
              source: 'base',
            },
          ],
        },
        center: [center.lng, center.lat],
        zoom,
      });

      mapRef.current = map;

      map.on('load', () => {
        setMapInstance(map);
        onReady?.(map);
      });
    }

    init().catch(console.error);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MapInstanceContext.Provider value={mapInstance}>
      <div className="relative size-full">
        <div ref={containerRef} className="size-full" aria-label="Route map" role="img" />
        {mapInstance && children}
      </div>
    </MapInstanceContext.Provider>
  );
}
