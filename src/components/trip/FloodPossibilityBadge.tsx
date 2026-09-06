'use client';

import Link from 'next/link';
import { Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RiskLevel, RouteFloodPossibility } from '@/types';

const LEVEL_VARIANT: Record<RiskLevel, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'secondary',
  moderate: 'default',
  high: 'destructive',
  severe: 'destructive',
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
};

interface Props {
  flood: RouteFloodPossibility;
  compact?: boolean;
  className?: string;
}

export function FloodPossibilityBadge({ flood, compact = false, className }: Props) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-xs', className)}>
        <Droplets className="size-3.5 shrink-0 text-muted-foreground" />
        <Badge variant={LEVEL_VARIANT[flood.level]} className="text-[10px] px-1.5 py-0">
          {flood.possibilityPercent}% flood · {LEVEL_LABEL[flood.level]}
        </Badge>
      </div>
    );
  }

  if (flood.showAlert) {
    return (
      <div
        role="alert"
        className={cn(
          'rounded-lg border border-red-300/70 bg-red-50 p-4 text-sm text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
          className,
        )}
      >
        <div className="mb-2 flex items-center gap-1.5 font-medium">
          <Droplets className="size-4 shrink-0" />
          Flood alert — {flood.possibilityPercent}% possibility ({LEVEL_LABEL[flood.level]})
        </div>
        <p className="text-red-900/90 dark:text-red-100/90">{flood.summary}</p>
        {flood.hits.length > 0 && (
          <ul className="mt-2 space-y-1 text-red-900/90 dark:text-red-100/90">
            {flood.hits.slice(0, 4).map((h) => (
              <li key={h.id}>
                {h.name}
                {h.valley ? ` (${h.valley})` : ''}
              </li>
            ))}
          </ul>
        )}
        {flood.dominantValley && (
          <p className="mt-2 text-xs opacity-90">
            Valley: {flood.dominantValley} — water runs downhill into rajakaluves and tanks.
          </p>
        )}
        <Link
          href="/explore?topic=monsoon"
          className="mt-3 inline-block text-xs font-medium underline"
        >
          Open monsoon hazard map
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Droplets className="size-3.5 shrink-0" />
        <span>
          Flood possibility:{' '}
          <span className="font-medium text-foreground">{flood.possibilityPercent}%</span> (
          {LEVEL_LABEL[flood.level]})
        </span>
      </div>
      {flood.hits.length > 0 && <p className="mt-1 pl-5">{flood.summary}</p>}
    </div>
  );
}
