'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRecurringStore } from '@/store/recurringStore';
import { useLocationsStore } from '@/store/locationsStore';
import { cn } from '@/lib/utils';
import type { DayOfWeek, RecurringCommute, TransportMode } from '@/types';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL: Record<DayOfWeek, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const MODES: TransportMode[] = ['car', 'two_wheeler', 'transit', 'walk', 'cycle'];

interface DraftState {
  name: string;
  fromLocationId: string;
  toLocationId: string;
  daysOfWeek: DayOfWeek[];
  departTime: string;
  preferredMode: TransportMode;
  bufferMinutes: number;
}

const DEFAULT_DRAFT: DraftState = {
  name: '',
  fromLocationId: '',
  toLocationId: '',
  daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
  departTime: '09:00',
  preferredMode: 'transit',
  bufferMinutes: 10,
};

export function RecurringCommuteForm() {
  const commutes = useRecurringStore((s) => s.commutes);
  const add = useRecurringStore((s) => s.add);
  const remove = useRecurringStore((s) => s.remove);
  const setActive = useRecurringStore((s) => s.setActive);
  const locations = useLocationsStore((s) => s.locations);

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);

  function toggleDay(day: DayOfWeek) {
    setDraft((d) => ({
      ...d,
      daysOfWeek: d.daysOfWeek.includes(day)
        ? d.daysOfWeek.filter((x) => x !== day)
        : [...d.daysOfWeek, day],
    }));
  }

  function handleSave() {
    if (
      !draft.name ||
      !draft.fromLocationId ||
      !draft.toLocationId ||
      draft.daysOfWeek.length === 0
    )
      return;
    const commute: RecurringCommute = {
      id: crypto.randomUUID(),
      name: draft.name,
      fromLocationId: draft.fromLocationId,
      toLocationId: draft.toLocationId,
      daysOfWeek: draft.daysOfWeek,
      departTime: draft.departTime,
      preferredMode: draft.preferredMode,
      bufferMinutes: draft.bufferMinutes,
      active: true,
      createdAt: new Date().toISOString(),
    };
    add(commute);
    setDraft(DEFAULT_DRAFT);
    setShowAdd(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {commutes.length} recurring commute{commutes.length !== 1 && 's'}
        </p>
        <Button
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          disabled={locations.length < 2}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Add commute
        </Button>
      </div>

      {locations.length < 2 && (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Add at least two saved locations first (Locations tab) before creating a recurring
          commute.
        </p>
      )}

      {showAdd && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <Input
              placeholder="Name (e.g. Work morning)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={draft.fromLocationId}
                onChange={(e) => setDraft({ ...draft, fromLocationId: e.target.value })}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">From location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <select
                value={draft.toLocationId}
                onChange={(e) => setDraft({ ...draft, toLocationId: e.target.value })}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">To location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Days</p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const on = draft.daysOfWeek.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={on}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        on
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-border bg-background hover:bg-accent',
                      )}
                    >
                      {DAY_LABEL[d]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Depart</p>
                <Input
                  type="time"
                  value={draft.departTime}
                  onChange={(e) => setDraft({ ...draft, departTime: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Mode</p>
                <select
                  value={draft.preferredMode}
                  onChange={(e) =>
                    setDraft({ ...draft, preferredMode: e.target.value as TransportMode })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Buffer (min)</p>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={draft.bufferMinutes}
                  onChange={(e) =>
                    setDraft({ ...draft, bufferMinutes: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {commutes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No recurring commutes yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {commutes.map((c) => {
            const fromLoc = locations.find((l) => l.id === c.fromLocationId);
            const toLoc = locations.find((l) => l.id === c.toLocationId);
            return (
              <li key={c.id}>
                <Card className={cn(!c.active && 'opacity-60')}>
                  <CardContent className="flex items-center gap-3 pt-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {fromLoc?.label ?? '?'} → {toLoc?.label ?? '?'} · {c.departTime} ·{' '}
                        {c.daysOfWeek.map((d) => DAY_LABEL[d]).join(' ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={c.active ? 'outline' : 'default'}
                      onClick={() => setActive(c.id, !c.active)}
                    >
                      {c.active ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => remove(c.id)}
                      aria-label={`Remove ${c.name}`}
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
