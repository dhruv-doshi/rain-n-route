'use client';

import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StuckAction } from '@/lib/stuckPlaybook';

interface Props {
  actions: StuckAction[];
  delayLabel: string;
  onReroute: () => void;
}

export function StuckPlaybookBanner({ actions, delayLabel, onReroute }: Props) {
  if (actions.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium">
          <Lightbulb className="size-4 shrink-0" />
          Stuck in traffic · {delayLabel}
        </div>
        <Button size="sm" variant="outline" onClick={onReroute} className="shrink-0">
          Re-plan
        </Button>
      </div>
      <ul className="space-y-2">
        {actions.map((a) => (
          <li key={a.id}>
            <p className="font-medium">{a.title}</p>
            <p className="text-xs opacity-90">{a.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
