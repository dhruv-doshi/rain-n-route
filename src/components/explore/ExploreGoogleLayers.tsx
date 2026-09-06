'use client';

import { useEffect, useRef } from 'react';
import type { ExploreLayerId } from '@/lib/bengaluruData';
import { getBengaluruData } from '@/lib/bengaluruData';
import { useMapInstance } from '@/components/map/MapInstanceContext';

const LAYER_COLORS: Record<ExploreLayerId, string> = {
  flood: '#ef4444',
  low_lying: '#f97316',
  valleys: '#6366f1',
  drains: '#0ea5e9',
  lakes: '#06b6d4',
  hotspots: '#eab308',
  stories: '#a855f7',
  transit: '#7c3aed',
};

const TRANSIT_MODE_COLORS = {
  metro: '#7c3aed',
  bus: '#16a34a',
} as const;

interface Props {
  activeLayers: Set<ExploreLayerId>;
  onFeatureClick?: (feature: { id: string; name: string; detail: string; source: string }) => void;
}

export function ExploreGoogleLayers({ activeLayers, onFeatureClick }: Props) {
  const map = useMapInstance();
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline | google.maps.Polygon)[]>(
    [],
  );

  useEffect(() => {
    if (!map) return;
    const data = getBengaluruData();
    const overlays: (google.maps.Marker | google.maps.Polyline | google.maps.Polygon)[] = [];

    function addMarker(
      lat: number,
      lng: number,
      color: string,
      title: string,
      detail: string,
      source: string,
      id: string,
    ) {
      const marker = new google.maps.Marker({
        map,
        position: { lat, lng },
        title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: color,
          fillOpacity: 0.85,
          strokeColor: '#fff',
          strokeWeight: 1,
        },
      });
      if (onFeatureClick) {
        marker.addListener('click', () => onFeatureClick({ id, name: title, detail, source }));
      }
      overlays.push(marker);
    }

    if (activeLayers.has('valleys')) {
      for (const v of data.valleys) {
        for (const ring of v.polygon) {
          const poly = new google.maps.Polygon({
            map,
            paths: ring.map(([lng, lat]) => ({ lat, lng })),
            strokeColor: LAYER_COLORS.valleys,
            strokeOpacity: 0.6,
            strokeWeight: 1,
            fillColor: LAYER_COLORS.valleys,
            fillOpacity: 0.08,
          });
          overlays.push(poly);
        }
      }
    }

    if (activeLayers.has('drains')) {
      for (const d of data.drains) {
        for (const line of d.lines) {
          overlays.push(
            new google.maps.Polyline({
              map,
              path: line.map(([lng, lat]) => ({ lat, lng })),
              strokeColor: LAYER_COLORS.drains,
              strokeOpacity: 0.7,
              strokeWeight: 2,
            }),
          );
        }
      }
    }

    if (activeLayers.has('lakes')) {
      for (const lake of data.lakes) {
        if (!lake.polygon?.[0]) continue;
        overlays.push(
          new google.maps.Polygon({
            map,
            paths: lake.polygon[0].map(([lng, lat]) => ({ lat, lng })),
            strokeColor: LAYER_COLORS.lakes,
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: LAYER_COLORS.lakes,
            fillOpacity: 0.15,
          }),
        );
      }
    }

    if (activeLayers.has('flood')) {
      for (const p of data.floodPoints) {
        addMarker(
          p.lat,
          p.lng,
          LAYER_COLORS.flood,
          p.name,
          'BBMP flood-prone location',
          p.source,
          p.id,
        );
      }
    }

    if (activeLayers.has('low_lying')) {
      for (const p of data.lowLying) {
        addMarker(
          p.lat,
          p.lng,
          LAYER_COLORS.low_lying,
          p.name,
          'Low-lying area — water collects here during heavy rain',
          p.source,
          p.id,
        );
      }
    }

    if (activeLayers.has('hotspots')) {
      for (const h of data.hotspots) {
        addMarker(
          h.lat,
          h.lng,
          LAYER_COLORS.hotspots,
          h.name,
          `${h.reason} Peak: ${h.peakHours}`,
          h.source,
          h.id,
        );
      }
    }

    if (activeLayers.has('stories')) {
      for (const s of data.stories) {
        addMarker(
          s.lat,
          s.lng,
          LAYER_COLORS.stories,
          s.name,
          s.text.slice(0, 120) + '…',
          s.source,
          s.id,
        );
      }
    }

    if (activeLayers.has('transit')) {
      for (const stop of data.transitStops) {
        const detail =
          stop.mode === 'metro'
            ? `Namma Metro${stop.line ? ` · ${stop.line}` : ''}`
            : 'BMTC interchange hub';
        addMarker(
          stop.lat,
          stop.lng,
          TRANSIT_MODE_COLORS[stop.mode],
          stop.name,
          detail,
          stop.source,
          stop.id,
        );
      }
    }

    overlaysRef.current = overlays;
    return () => {
      for (const o of overlaysRef.current) o.setMap(null);
      overlaysRef.current = [];
    };
  }, [map, activeLayers, onFeatureClick]);

  return null;
}

export { LAYER_COLORS };
