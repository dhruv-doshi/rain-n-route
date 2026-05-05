'use client';

import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreferencesStore } from '@/store/preferencesStore';
import type { TransportMode, WeatherSensitivity, SortMode } from '@/types';

const SENSITIVITIES: WeatherSensitivity[] = ['low', 'medium', 'high'];
const SORTS: SortMode[] = ['fastest', 'cheapest', 'least_transfers', 'eco'];

export function PreferencesForm() {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPref = usePreferencesStore((s) => s.set);
  const reset = usePreferencesStore((s) => s.reset);

  function move(idx: number, delta: -1 | 1) {
    const next = [...prefs.transportPriority];
    const swap = idx + delta;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setPref({ transportPriority: next });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transport priority</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">
            Order modes from most to least preferred.
          </p>
          <ol className="space-y-1.5">
            {prefs.transportPriority.map((m: TransportMode, i: number) => (
              <li
                key={m}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 font-medium">{m}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${m} up`}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => move(i, 1)}
                  disabled={i === prefs.transportPriority.length - 1}
                  aria-label={`Move ${m} down`}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Max walk distance: {prefs.maxWalkMeters} m
            </span>
            <input
              type="range"
              min={100}
              max={3000}
              step={100}
              value={prefs.maxWalkMeters}
              onChange={(e) => setPref({ maxWalkMeters: Number(e.target.value) })}
              className="w-full"
            />
          </label>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Weather sensitivity</p>
            <div className="flex gap-1.5">
              {SENSITIVITIES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={prefs.weatherSensitivity === s ? 'default' : 'outline'}
                  onClick={() => setPref({ weatherSensitivity: s })}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Default sort</p>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={prefs.preferredSort === s ? 'default' : 'outline'}
                  onClick={() => setPref({ preferredSort: s })}
                >
                  {s.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Default buffer (minutes)
            </span>
            <Input
              type="number"
              min={0}
              max={60}
              value={prefs.defaultBufferMinutes}
              onChange={(e) => setPref({ defaultBufferMinutes: Number(e.target.value) || 0 })}
            />
          </label>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
        <RotateCcw className="size-3.5" />
        Reset to defaults
      </Button>
    </div>
  );
}
