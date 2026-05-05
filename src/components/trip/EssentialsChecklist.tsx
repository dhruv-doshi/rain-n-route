'use client';

import { useEffect, useState } from 'react';
import { Check, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GearItem } from '@/types';

const STORAGE_KEY = 'cw:essentials:checked';

function loadChecked(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

interface Props {
  gear: GearItem[];
}

export function EssentialsChecklist({ gear }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // sessionStorage is only available client-side; reading it during render
    // would cause SSR/CSR hydration mismatch. Hydrate after mount instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(loadChecked());
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota / SSR */
      }
      return next;
    });
  }

  if (gear.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ListChecks className="size-4 text-brand" />
          Essentials checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {gear.map((item) => {
            const isChecked = !!checked[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-pressed={isChecked}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border border-border p-2 text-left transition-colors hover:bg-accent/40',
                    isChecked && 'opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                      isChecked
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-background',
                    )}
                  >
                    {isChecked && <Check className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', isChecked && 'line-through')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
