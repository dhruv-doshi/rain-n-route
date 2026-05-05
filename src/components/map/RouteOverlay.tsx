'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!map) return;

    const sourceIds: string[] = [];
    const layerIds: string[] = [];

    for (const route of routes) {
      if (!route.geometry) continue;

      const coords = decodePolyline(route.geometry);
      if (coords.length === 0) continue;

      const sourceId = `route-source-${route.id}`;
      const layerId = `route-layer-${route.id}`;
      const isSelected = route.id === selectedRouteId;
      const primaryMode = route.modes[0] ?? 'mixed';
      const color = MODE_COLOR[primaryMode] ?? '#3b82f6';

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords.map((p) => [p.lng, p.lat]),
            },
            properties: { routeId: route.id },
          },
        });
        sourceIds.push(sourceId);
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': color,
            'line-width': isSelected ? 6 : 3,
            'line-opacity': isSelected ? 1 : 0.5,
          },
        });
        layerIds.push(layerId);

        if (onRouteClick) {
          map.on('click', layerId, () => onRouteClick(route.id));
          map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
          });
        }
      } else {
        map.setPaintProperty(layerId, 'line-width', isSelected ? 6 : 3);
        map.setPaintProperty(layerId, 'line-opacity', isSelected ? 1 : 0.5);
      }
    }

    return () => {
      // Map may already be torn down by the parent MapCanvas's cleanup
      // (map.remove() nulls internal state). Guard against that.
      if (!map || typeof map.getLayer !== 'function') return;
      for (const id of layerIds) {
        try {
          if (map.getLayer(id)) map.removeLayer(id);
        } catch {
          /* style already torn down */
        }
      }
      for (const id of sourceIds) {
        try {
          if (map.getSource(id)) map.removeSource(id);
        } catch {
          /* style already torn down */
        }
      }
    };
  }, [map, routes, selectedRouteId, onRouteClick]);

  return null;
}
