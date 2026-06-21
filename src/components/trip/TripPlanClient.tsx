'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, RefreshCw, Clock } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RouteSortTabs } from './RouteSortTabs';
import { RouteOptionCard } from './RouteOptionCard';
import { RouteListSkeleton } from './RouteListSkeleton';
import { PlanErrorState } from './PlanErrorState';
import { PlanEmptyState } from './PlanEmptyState';
import { EssentialsChecklist } from './EssentialsChecklist';
import { LeaveNowScheduler } from './LeaveNowScheduler';
import { ShareTripButton } from './ShareTripButton';
import { MapCanvas } from '@/components/map/MapCanvas';
import { RouteOverlay } from '@/components/map/RouteOverlay';
import { WeatherLayer } from '@/components/map/WeatherLayer';
import { MapControls } from '@/components/map/MapControls';
import { usePlanTrip, parseLocationParam } from '@/hooks/usePlanTrip';
import { useTrafficPolling } from '@/hooks/useTrafficPolling';
import { useTripStore } from '@/store/tripStore';
import { sortRoutes } from '@/lib/scoring';
import { haversineMeters } from '@/lib/geo';
import { planRoute } from '@/services/routing';
import { formatDuration } from '@/lib/format';
import type { SortMode } from '@/types';

type MapLayer = 'base' | 'traffic' | 'transit';

interface Props {
  rawFrom: string;
  rawTo: string;
  departAt?: string;
}

function deriveZoom(distanceMeters: number): number {
  if (distanceMeters < 2_000) return 14;
  if (distanceMeters < 10_000) return 12;
  if (distanceMeters < 50_000) return 10;
  return 8;
}

export function TripPlanClient({ rawFrom, rawTo, departAt }: Props) {
  const [sortBy, setSortBy] = useState<SortMode>('fastest');
  const [tileLayer, setTileLayer] = useState<MapLayer>('base');
  const [currentDepartAt, setCurrentDepartAt] = useState<string>(departAt || '');
  // Render the map only after mount to avoid SSR/CSR hydration mismatch
  // (Google Maps is client-only and would otherwise diverge from the server HTML).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  // Mobile-only tab state. Desktop always shows both panels side-by-side.
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');

  const { status, trip, error, retry } = usePlanTrip(rawFrom, rawTo, departAt);
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

  // Calculate estimated arrival time
  const getEstimatedArrival = (): Date | null => {
    if (!selectedRoute) return null;
    const durationSec = selectedRoute.totalDuration;
    if (currentDepartAt) {
      const departDate = new Date(currentDepartAt);
      const arrivalDate = new Date(departDate.getTime() + durationSec * 1000);
      return arrivalDate;
    }
    return null;
  };

  const estimatedArrival = getEstimatedArrival();

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
      {selectedRoute && status === 'success' && (
        <LeaveNowScheduler
          durationSec={selectedRoute.totalDuration}
          bufferMinutes={selectedRoute.weatherRisk?.bufferMinutesRecommended ?? 5}
          routeLabel={fromLabel + ' → ' + toLabel}
        />
      )}
      {selectedRoute?.weatherRisk?.gear && selectedRoute.weatherRisk.gear.length > 0 && (
        <EssentialsChecklist gear={selectedRoute.weatherRisk.gear} />
      )}
    </div>
  );

  const mapPanel = mounted ? (
    <div className="relative h-[60vh] min-h-64 w-full overflow-hidden rounded-xl border border-border lg:h-[600px]">
      <MapCanvas center={mapCenter} zoom={mapZoom}>
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
          activeLayer={tileLayer}
          onLayerChange={setTileLayer}
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
      {/* Header with time info */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
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

        {/* Time section */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="depart-at-plan"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <Clock className="size-3.5" />
              Depart at
            </label>
            <input
              id="depart-at-plan"
              type="datetime-local"
              value={currentDepartAt}
              onChange={(e) => setCurrentDepartAt(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          {selectedRoute && estimatedArrival && (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="size-3.5" />
                Estimated arrival
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <Clock className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {estimatedArrival.toLocaleTimeString('en-IN', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Journey time: {formatDuration(selectedRoute.totalDuration)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
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
