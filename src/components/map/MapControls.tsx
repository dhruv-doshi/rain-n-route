'use client';

import { useEffect, useRef } from 'react';
import { Crosshair, Maximize2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { decodePolyline } from '@/lib/geo';
import type { LatLng, RouteOption } from '@/types';
import { useMapInstance } from './MapInstanceContext';

type MapLayer = 'base' | 'traffic' | 'transit';

const LAYERS: MapLayer[] = ['base', 'traffic', 'transit'];

interface Props {
  center: LatLng;
  routes: RouteOption[];
  activeLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
}

export function MapControls({ center, routes, activeLayer, onLayerChange }: Props) {
  const map = useMapInstance();
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);

  // Manage traffic/transit layer attachment based on activeLayer
  useEffect(() => {
    if (!map) return;

    // Ensure layer instances exist
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }
    if (!transitLayerRef.current) {
      transitLayerRef.current = new google.maps.TransitLayer();
    }

    // Detach both first
    trafficLayerRef.current.setMap(null);
    transitLayerRef.current.setMap(null);

    // Attach the active overlay
    if (activeLayer === 'traffic') {
      trafficLayerRef.current.setMap(map);
    } else if (activeLayer === 'transit') {
      transitLayerRef.current.setMap(map);
    }
  }, [map, activeLayer]);

  // Clean up layers on unmount
  useEffect(() => {
    return () => {
      trafficLayerRef.current?.setMap(null);
      transitLayerRef.current?.setMap(null);
    };
  }, []);

  function handleRecenter() {
    if (!map) return;
    map.panTo({ lat: center.lat, lng: center.lng });
    map.setZoom(12);
  }

  function handleFitRoute() {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    for (const route of routes) {
      if (!route.geometry) continue;
      for (const pt of decodePolyline(route.geometry)) {
        bounds.extend({ lat: pt.lat, lng: pt.lng });
        hasCoords = true;
      }
    }

    if (hasCoords) {
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }

  function handleLayerToggle() {
    if (!map) return;
    const nextIdx = (LAYERS.indexOf(activeLayer) + 1) % LAYERS.length;
    const next = LAYERS[nextIdx];
    onLayerChange(next);
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
        aria-label={`Toggle map layer (current: ${activeLayer})`}
        title={`Layer: ${activeLayer}`}
      >
        <Layers className="size-4" />
      </Button>
    </div>
  );
}
