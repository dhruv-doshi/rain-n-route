'use client';

import { Home, Briefcase, Loader2, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocationsStore } from '@/store/locationsStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { GeoSuggestion } from '@/types';

interface Props {
  onSelect: (suggestion: GeoSuggestion) => void;
}

export function QuickLocationChips({ onSelect }: Props) {
  const locations = useLocationsStore((s) => s.locations);
  const { loading, trigger } = useGeolocation();

  const home = locations.find((l) => l.kind === 'home');
  const office = locations.find((l) => l.kind === 'office');

  async function handleCurrentLocation() {
    const suggestion = await trigger();
    if (suggestion) onSelect(suggestion);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {home && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() =>
            onSelect({
              id: home.id,
              label: home.label,
              secondary: home.address,
              coords: home.coords,
            })
          }
        >
          <Home className="size-3" />
          Home
        </Button>
      )}

      {office && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() =>
            onSelect({
              id: office.id,
              label: office.label,
              secondary: office.address,
              coords: office.coords,
            })
          }
        >
          <Briefcase className="size-3" />
          Office
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2.5 text-xs"
        disabled={loading}
        onClick={handleCurrentLocation}
      >
        {loading ? <Loader2 className="size-3 animate-spin" /> : <LocateFixed className="size-3" />}
        My location
      </Button>
    </div>
  );
}
