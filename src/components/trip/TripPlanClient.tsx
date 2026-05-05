'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RouteSortTabs } from './RouteSortTabs';
import { RouteOptionCard } from './RouteOptionCard';
import { RouteListSkeleton } from './RouteListSkeleton';
import { PlanErrorState } from './PlanErrorState';
import { PlanEmptyState } from './PlanEmptyState';
import { EssentialsChecklist } from './EssentialsChecklist';
import { ShareTripButton } from './ShareTripButton';
import { MapCanvas } from '@/components/map/MapCanvas';
import { RouteOverlay } from '@/components/map/RouteOverlay';
import { WeatherLayer } from '@/components/map/WeatherLayer';
import { MapControls } from '@/components/map/MapControls';
import { usePlanTrip, parseLocationParam } from '@/hooks/usePlanTrip';
import { useTrafficPolling } from '@/hooks/useTrafficPolling';
import { useTripStore } from '@/store/tripStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { sortRoutes } from '@/lib/scoring';
import { haversineMeters } from '@/lib/geo';
import { planRoute } from '@/services/routing';
import type { SortMode, TileLayer } from '@/types';

interface Props {
  rawFrom: string;
  rawTo: string;
  baseTilesUrl: string;
  trafficTilesUrl: string;
  transitTilesUrl: string;
}

function tileLayerToUrl(layer: TileLayer, base: string, traffic: string, transit: string): string {
  if (layer === 'traffic') return traffic;
  if (layer === 'transit') return transit;
  return base;
}

function deriveZoom(distanceMeters: number): number {
  if (distanceMeters < 2_000) return 14;
  if (distanceMeters < 10_000) return 12;
  if (distanceMeters < 50_000) return 10;
  return 8;
}

export function TripPlanClient({
  rawFrom,
  rawTo,
  baseTilesUrl,
  trafficTilesUrl,
  transitTilesUrl,
}: Props) {
  const preferredSort = usePreferencesStore((s) => s.preferences.preferredSort);
  const [sortBy, setSortBy] = useState<SortMode>(preferredSort as SortMode);
  const [tileLayer, setTileLayer] = useState<TileLayer>('base');
  // Render the map only after mount to avoid SSR/CSR hydration mismatch
  // (MapLibre is client-only and would otherwise diverge from the server HTML).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  // Mobile-only tab state. Desktop always shows both panels side-by-side.
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');

  const { status, trip, error, retry } = usePlanTrip(rawFrom, rawTo);
  const selectedRouteId = useTripStore((s) => s.current?.selectedRouteId);
  const selectRoute = useTripStore((s) => s.selectRoute);

  const fromParsed = parseLocationParam(rawFrom);
  const toParsed = parseLocationParam(rawTo);
  const fromLabel = fromParsed?.label ?? rawFrom;
  const toLabel = toParsed?.label ?? rawTo;

  const sortedRoutes = trip ? sortRoutes(trip.routes, sortBy) : [];

  const mapCenter =
    fromParsed?.coords && toParsed?.coords
      ? {
          lat: (fromParsed.coords.lat + toParsed.coords.lat) / 2,
          lng: (fromParsed.coords.lng + toParsed.coords.lng) / 2,
        }
      : (fromParsed?.coords ?? { lat: 12.9716, lng: 77.5946 });

  const mapZoom =
    fromParsed?.coords && toParsed?.coords
      ? deriveZoom(haversineMeters(fromParsed.coords, toParsed.coords))
      : 12;

  const selectedRoute = sortedRoutes.find((r) => r.id === selectedRouteId) ?? sortedRoutes[0];
  const baselineSec = selectedRoute?.totalDuration ?? null;

  // Visibility-gated traffic polling. Re-fetches the same route every 60s and
  // exposes an ETA delta vs the original baseline so we can offer a re-plan.
  // The hook stores this fn in a ref, so re-creating it per render is fine.
  const refetchDuration = async (signal: AbortSignal): Promise<number> => {
    if (!fromParsed?.coords || !toParsed?.coords || !selectedRoute) return baselineSec ?? 0;
    const updated = await planRoute({
      from: fromParsed.coords,
      to: toParsed.coords,
      sortBy,
      signal,
      noCache: true, // bypass server LRU so we actually detect upstream duration changes
    });
    const matched = updated.routes.find((r) => r.id === selectedRoute.id) ?? updated.routes[0];
    return matched?.totalDuration ?? baselineSec ?? 0;
  };

  const traffic = useTrafficPolling({
    baselineSec,
    refetch: refetchDuration,
    enabled: status === 'success' && sortedRoutes.length > 0,
  });

  const routeList = (
    <div className="space-y-3">
      {status === 'loading' && <RouteListSkeleton />}
      {status === 'error' && error && <PlanErrorState error={error} onRetry={retry} />}
      {status === 'success' && sortedRoutes.length === 0 && <PlanEmptyState />}
      {traffic.delta?.shouldPromptReroute && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <span>ETA increased by {Math.round(traffic.delta.deltaPct * 100)}% — re-plan?</span>
          <Button size="sm" variant="outline" onClick={retry} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Re-plan
          </Button>
        </div>
      )}
      {status === 'success' &&
        sortedRoutes.length > 0 &&
        sortedRoutes.map((route) => (
          <RouteOptionCard
            key={route.id}
            route={route}
            isSelected={route.id === selectedRouteId}
            onSelect={() => selectRoute(route.id)}
          />
        ))}
      {selectedRoute?.weatherRisk?.gear && selectedRoute.weatherRisk.gear.length > 0 && (
        <EssentialsChecklist gear={selectedRoute.weatherRisk.gear} />
      )}
    </div>
  );

  const mapPanel = mounted ? (
    <div className="relative h-[60vh] min-h-64 w-full overflow-hidden rounded-xl border border-border lg:h-[600px]">
      <MapCanvas center={mapCenter} zoom={mapZoom} tilesUrl={baseTilesUrl}>
        {sortedRoutes.length > 0 && (
          <RouteOverlay
            routes={sortedRoutes}
            selectedRouteId={selectedRouteId}
            onRouteClick={selectRoute}
          />
        )}
        {selectedRoute && <WeatherLayer route={selectedRoute} />}
        <MapControls
          center={fromParsed?.coords ?? mapCenter}
          routes={sortedRoutes}
          currentLayer={tileLayer}
          onLayerChange={setTileLayer}
          tilesUrlForLayer={(l) =>
            tileLayerToUrl(l, baseTilesUrl, trafficTilesUrl, transitTilesUrl)
          }
        />
      </MapCanvas>
    </div>
  ) : (
    <div
      className="h-[60vh] min-h-64 w-full rounded-xl border border-border bg-muted/30 lg:h-[600px]"
      aria-label="Map loading"
    />
  );

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <Link
          href="/"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          aria-label="Back to planner"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="size-3.5 shrink-0 text-brand" />
            <span className="truncate">{fromLabel}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{toLabel}</span>
          </div>
        </div>
        <ShareTripButton
          payload={
            fromParsed?.coords && toParsed?.coords
              ? {
                  from: fromParsed.coords,
                  to: toParsed.coords,
                  fromLabel,
                  toLabel,
                  selectedRouteId,
                }
              : null
          }
        />
      </div>

      {/* Sort tabs */}
      <RouteSortTabs sortBy={sortBy} onChange={setSortBy} disabled={status === 'loading'} />

      {/* Mobile-only tab toggle (hidden on lg+) */}
      <div className="mt-4 lg:hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'map')}>
          <TabsList className="w-full">
            <TabsTrigger value="list" className="flex-1">
              List
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1">
              Map
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Single layout: list + map. Each rendered exactly once. CSS hides per breakpoint + mobile tab. */}
      <div className="mt-4 lg:flex lg:gap-6">
        <div
          className={cn(
            'w-full lg:max-w-[440px] lg:shrink-0 space-y-3',
            activeTab === 'map' && 'hidden lg:block',
          )}
        >
          {routeList}
        </div>
        <div
          className={cn('mt-4 w-full lg:mt-0 lg:flex-1', activeTab === 'list' && 'hidden lg:block')}
        >
          {mapPanel}
        </div>
      </div>
    </div>
  );
}
