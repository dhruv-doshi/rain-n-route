'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Crosshair, Layers, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapCanvas } from '@/components/map/MapCanvas';
import { ExploreGoogleLayers, LAYER_COLORS } from './ExploreGoogleLayers';
import { PlaceStoriesPanel } from './PlaceStoriesPanel';
import {
  DEFAULT_EXPLORE_TOPIC,
  EXPLORE_LAYERS,
  EXPLORE_TOPIC_GROUPS,
  EXPLORE_TOPICS,
  getBengaluruData,
  type ExploreLayerId,
  type ExploreTopicId,
} from '@/lib/bengaluruData';
import { haversineMeters } from '@/lib/geo';
import { getHotspotDelayHint } from '@/lib/hotspotMemory';
import { isGoogleMapsConfigured } from '@/lib/googleMapsLoader';
import { useGeolocation } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';

const selectClassName = cn(
  'h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors outline-none',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'dark:bg-input/30',
);

interface SelectedFeature {
  id: string;
  name: string;
  detail: string;
  source: string;
}

function getTopic(topicId: ExploreTopicId) {
  return EXPLORE_TOPICS.find((topic) => topic.id === topicId) ?? EXPLORE_TOPICS[0];
}

export function ExploreClient() {
  const [mounted, setMounted] = useState(false);
  const [topicId, setTopicId] = useState<ExploreTopicId>(DEFAULT_EXPLORE_TOPIC);
  const [extraLayers, setExtraLayers] = useState<Set<ExploreLayerId>>(() => new Set());
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const [hintForId, setHintForId] = useState<{ id: string; hint: string } | null>(null);
  const geo = useGeolocation();
  const googleAvailable = mounted && isGoogleMapsConfigured();
  const userCoords = geo.result?.coords ?? null;

  const topic = getTopic(topicId);
  const activeLayers = useMemo(() => {
    const layers = new Set<ExploreLayerId>(topic.layers);
    for (const layer of extraLayers) layers.add(layer);
    return layers;
  }, [topic.layers, extraLayers]);

  const activeLayerMeta = useMemo(
    () => EXPLORE_LAYERS.filter((layer) => activeLayers.has(layer.id)),
    [activeLayers],
  );

  const selectedHotspot = selected?.id.startsWith('hs-')
    ? getBengaluruData().hotspots.find((h) => h.id === selected.id)
    : undefined;

  const delayHint =
    selectedHotspot &&
    (hintForId?.id === selectedHotspot.id
      ? hintForId.hint
      : `Usually slow ${selectedHotspot.peakHours}`);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const onTopicChange = useCallback((nextTopicId: ExploreTopicId) => {
    setTopicId(nextTopicId);
    setSelected(null);
    setExtraLayers(new Set());
    setShowLayerPicker(false);
  }, []);

  useEffect(() => {
    if (!selectedHotspot) return;
    let cancelled = false;
    void getHotspotDelayHint(selectedHotspot.id, selectedHotspot.peakHours).then((hint) => {
      if (!cancelled && hint) setHintForId({ id: selectedHotspot.id, hint });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedHotspot]);

  const toggleExtraLayer = useCallback((id: ExploreLayerId) => {
    setExtraLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onFeatureClick = useCallback((f: SelectedFeature) => setSelected(f), []);

  const nearby = useMemo(() => {
    if (!userCoords || topic.nearbyKind === 'none') return [];
    const data = getBengaluruData();
    const items: { name: string; distanceM: number; kind: string }[] = [];

    if (topic.nearbyKind === 'flood') {
      for (const p of data.floodPoints.slice(0, 40)) {
        items.push({
          name: p.name,
          distanceM: haversineMeters(userCoords, { lat: p.lat, lng: p.lng }),
          kind: 'flood',
        });
      }
    }

    if (topic.nearbyKind === 'hotspot') {
      for (const h of data.hotspots) {
        items.push({
          name: h.name,
          distanceM: haversineMeters(userCoords, { lat: h.lat, lng: h.lng }),
          kind: 'hotspot',
        });
      }
    }

    if (topic.nearbyKind === 'transit') {
      for (const stop of data.transitStops) {
        items.push({
          name: stop.name,
          distanceM: haversineMeters(userCoords, { lat: stop.lat, lng: stop.lng }),
          kind: stop.mode,
        });
      }
    }

    if (topic.nearbyKind === 'commute') {
      for (const h of data.hotspots) {
        items.push({
          name: h.name,
          distanceM: haversineMeters(userCoords, { lat: h.lat, lng: h.lng }),
          kind: 'hotspot',
        });
      }
      for (const stop of data.transitStops) {
        items.push({
          name: stop.name,
          distanceM: haversineMeters(userCoords, { lat: stop.lat, lng: stop.lng }),
          kind: stop.mode,
        });
      }
    }

    return items.sort((a, b) => a.distanceM - b.distanceM).slice(0, 5);
  }, [topic.nearbyKind, userCoords]);

  const center = userCoords ?? { lat: 12.9716, lng: 77.5946 };

  const mapPanel = (
    <div className="relative h-[50vh] min-h-64 w-full overflow-hidden rounded-xl border border-border lg:h-[560px]">
      {googleAvailable ? (
        <MapCanvas center={center} zoom={11}>
          <ExploreGoogleLayers activeLayers={activeLayers} onFeatureClick={onFeatureClick} />
        </MapCanvas>
      ) : mounted ? (
        <div className="flex h-full flex-col items-center justify-center bg-muted/20 px-6 text-center">
          <p className="text-sm font-medium">Map requires Google Maps</p>
          <p className="mt-2 max-w-sm text-xs text-muted-foreground">
            Set <code className="text-foreground">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to view
            hazard layers on the map. Topic details, nearby hazards, and place stories still work in
            the panel.
          </p>
        </div>
      ) : (
        <div className="h-full w-full animate-pulse bg-muted/30" />
      )}
      {userCoords && googleAvailable && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 right-3 z-20 gap-1.5 shadow-sm"
          onClick={() => void geo.trigger()}
          disabled={geo.loading}
        >
          <Crosshair className="size-3.5" />
          Near me
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Explore Bengaluru</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a topic to focus the map and panel — flood pockets, water systems, traffic
            corridors, or place stories.
          </p>
        </div>

        <div className="w-full lg:max-w-sm">
          <label htmlFor="explore-topic" className="text-xs font-medium text-muted-foreground">
            What to explore
          </label>
          <div className="relative mt-1.5">
            <select
              id="explore-topic"
              className={cn(selectClassName, 'appearance-none pr-9')}
              value={topicId}
              onChange={(event) => onTopicChange(event.target.value as ExploreTopicId)}
            >
              {EXPLORE_TOPIC_GROUPS.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {EXPLORE_TOPICS.filter((item) => item.group === group.id).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div
        role="note"
        className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>
          Indicative public maps — not a flood warning or engineering survey. Sources: OpenCity, MOD
          Foundation, BBMP / KSRSAC. See{' '}
          <a href="/privacy" className="underline">
            privacy &amp; attribution
          </a>
          .
        </span>
      </div>

      {geo.error && <p className="mb-4 text-sm text-amber-800 dark:text-amber-200">{geo.error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {mapPanel}

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{topic.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{topic.summary}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={() => setShowLayerPicker((open) => !open)}
                aria-expanded={showLayerPicker}
              >
                <Layers className="size-3.5" />
                Layers
              </Button>
            </div>

            <ul className="mt-3 flex flex-wrap gap-2">
              {activeLayerMeta.map((layer) => (
                <li
                  key={layer.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: LAYER_COLORS[layer.id] }}
                    aria-hidden
                  />
                  {layer.label}
                </li>
              ))}
            </ul>

            {showLayerPicker && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground">Add more map layers</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXPLORE_LAYERS.filter((layer) => !topic.layers.includes(layer.id)).map(
                    (layer) => (
                      <Button
                        key={layer.id}
                        size="sm"
                        variant={extraLayers.has(layer.id) ? 'default' : 'outline'}
                        onClick={() => toggleExtraLayer(layer.id)}
                      >
                        {layer.label}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {topicId === 'stories' ? (
            <PlaceStoriesPanel />
          ) : selected ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-medium">{selected.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{selected.detail}</p>
              {delayHint && (
                <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                  {delayHint}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Source: {selected.source}</p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {googleAvailable
                ? `Tap a marker on the map to learn more about this ${topic.label.toLowerCase()} view.`
                : 'Enable Google Maps to interact with map markers, or switch topics above.'}
            </div>
          )}

          {userCoords && nearby.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="size-3.5 text-brand" />
                Near you
              </div>
              <ul className="space-y-2">
                {nearby.map((n) => (
                  <li key={n.name} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{n.name}</span>
                    <Badge variant="secondary">{(n.distanceM / 1000).toFixed(1)} km</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
