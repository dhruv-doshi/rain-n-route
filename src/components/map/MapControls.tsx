'use client';

import { Crosshair, Maximize2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { decodePolyline } from '@/lib/geo';
import type { LatLng, RouteOption, TileLayer } from '@/types';
import { useMapInstance } from './MapInstanceContext';

const TILE_LAYERS: TileLayer[] = ['base', 'traffic', 'transit'];

interface Props {
  center: LatLng;
  routes: RouteOption[];
  currentLayer: TileLayer;
  onLayerChange: (layer: TileLayer) => void;
  tilesUrlForLayer: (layer: TileLayer) => string;
}

export function MapControls({
  center,
  routes,
  currentLayer,
  onLayerChange,
  tilesUrlForLayer,
}: Props) {
  const map = useMapInstance();

  function handleRecenter() {
    map?.flyTo({ center: [center.lng, center.lat], zoom: 12 });
  }

  function handleFitRoute() {
    if (!map) return;
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    let hasCoords = false;

    for (const route of routes) {
      if (!route.geometry) continue;
      for (const pt of decodePolyline(route.geometry)) {
        minLat = Math.min(minLat, pt.lat);
        maxLat = Math.max(maxLat, pt.lat);
        minLng = Math.min(minLng, pt.lng);
        maxLng = Math.max(maxLng, pt.lng);
        hasCoords = true;
      }
    }

    if (hasCoords) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 48 },
      );
    }
  }

  function handleLayerToggle() {
    const nextIdx = (TILE_LAYERS.indexOf(currentLayer) + 1) % TILE_LAYERS.length;
    const next = TILE_LAYERS[nextIdx];
    onLayerChange(next);
    const source = map?.getSource('base');
    if (source && 'setTiles' in source) {
      (source as { setTiles: (tiles: string[]) => void }).setTiles([tilesUrlForLayer(next)]);
    }
  }

  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
      <Button
        size="icon"
        variant="secondary"
        onClick={handleRecenter}
        aria-label="Recenter map"
        title="Recenter"
      >
        <Crosshair className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={handleFitRoute}
        aria-label="Fit route in view"
        title="Fit route"
      >
        <Maximize2 className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={handleLayerToggle}
        aria-label={`Toggle map layer (current: ${currentLayer})`}
        title={`Layer: ${currentLayer}`}
      >
        <Layers className="size-4" />
      </Button>
    </div>
  );
}
