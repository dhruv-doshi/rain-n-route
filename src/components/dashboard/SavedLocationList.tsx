'use client';

import { useState } from 'react';
import { Home, Briefcase, Star, Clock, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useLocationsStore } from '@/store/locationsStore';
import type { SavedLocation, SavedLocationKind } from '@/types';

const KIND_ICON: Record<SavedLocationKind, React.ElementType> = {
  home: Home,
  office: Briefcase,
  favorite: Star,
  recent: Clock,
};

const KIND_LABEL: Record<SavedLocationKind, string> = {
  home: 'Home',
  office: 'Office',
  favorite: 'Favorite',
  recent: 'Recent',
};

const MAX_LOCATIONS = 15;

export function SavedLocationList() {
  const locations = useLocationsStore((s) => s.locations);
  const add = useLocationsStore((s) => s.add);
  const remove = useLocationsStore((s) => s.remove);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    label: '',
    address: '',
    kind: 'favorite' as SavedLocationKind,
    lat: '',
    lng: '',
  });

  const atCap = locations.length >= MAX_LOCATIONS;

  function handleAdd() {
    const lat = Number(draft.lat);
    const lng = Number(draft.lng);
    if (!draft.label || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const now = new Date().toISOString();
    const loc: SavedLocation = {
      id: crypto.randomUUID(),
      kind: draft.kind,
      label: draft.label,
      address: draft.address || draft.label,
      coords: { lat, lng },
      createdAt: now,
      lastUsedAt: now,
    };
    add(loc);
    setDraft({ label: '', address: '', kind: 'favorite', lat: '', lng: '' });
    setShowAdd(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {locations.length} of {MAX_LOCATIONS} saved
        </p>
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          disabled={atCap}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Add location
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
            <Input
              placeholder="Label (e.g. Home)"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as SavedLocationKind })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {(['home', 'office', 'favorite', 'recent'] as SavedLocationKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <Input
              placeholder="Address"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className="sm:col-span-2"
            />
            <Input
              placeholder="Latitude"
              value={draft.lat}
              onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
              inputMode="decimal"
            />
            <Input
              placeholder="Longitude"
              value={draft.lng}
              onChange={(e) => setDraft({ ...draft, lng: e.target.value })}
              inputMode="decimal"
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button size="sm" onClick={handleAdd}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {locations.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No saved locations yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => {
            const Icon = KIND_ICON[loc.kind];
            return (
              <li key={loc.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 pt-4">
                    <Icon className="size-4 shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{loc.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{loc.address}</p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => remove(loc.id)}
                      aria-label={`Remove ${loc.label}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
