'use client';

import { useState } from 'react';
import {
  Car,
  Bike,
  Train,
  Zap,
  Footprints,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDuration, formatDistance } from '@/lib/format';
import type { RouteStep, TransportMode } from '@/types';

const MODE_ICON: Record<TransportMode, React.ElementType> = {
  car: Car,
  two_wheeler: Bike,
  transit: Train,
  cab: Zap,
  auto: Zap,
  walk: Footprints,
  cycle: Bike,
  mixed: ArrowLeftRight,
};

interface Props {
  steps: RouteStep[];
}

export function StepByStepList({ steps }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) return null;

  const visibleSteps = expanded ? steps : [];

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? (
          <>
            <ChevronUp className="size-3.5" />
            Hide steps
          </>
        ) : (
          <>
            <ChevronDown className="size-3.5" />
            Show {steps.length} step{steps.length !== 1 ? 's' : ''}
          </>
        )}
      </button>

      {expanded && (
        <ol className="mt-2 space-y-2">
          {visibleSteps.map((step, i) => {
            const Icon = MODE_ICON[step.mode] ?? ArrowLeftRight;
            return (
              <li key={i} className="flex gap-3 text-xs">
                <span className="mt-0.5 shrink-0 text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <div className="flex-1">
                  <p className="text-foreground">{step.instruction}</p>
                  {step.transitInfo && (
                    <p className="mt-0.5 text-muted-foreground">
                      {step.transitInfo.line} → {step.transitInfo.headsign} ·{' '}
                      {step.transitInfo.numStops} stop{step.transitInfo.numStops !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-muted-foreground">
                  {formatDuration(step.duration)} · {formatDistance(step.distance)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
