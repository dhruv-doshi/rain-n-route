'use client';

import { useState } from 'react';
import { CloudRain, AlertTriangle, Flame, Wind, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RiskFactor, RiskLevel, WeatherRiskSummary } from '@/types';

const RISK_VARIANT: Record<RiskLevel, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'secondary',
  moderate: 'default',
  high: 'destructive',
  severe: 'destructive',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
};

const FACTOR_ICON: Record<RiskFactor['kind'], React.ElementType> = {
  rain: CloudRain,
  flood: CloudRain,
  heat: Flame,
  aqi: AlertTriangle,
  wind: Wind,
};

const FACTOR_LABEL: Record<RiskFactor['kind'], string> = {
  rain: 'Rain',
  flood: 'Flood risk',
  heat: 'Heat',
  aqi: 'Air quality',
  wind: 'Wind',
};

const LEVEL_COLOR: Record<RiskLevel, string> = {
  low: 'text-green-600 dark:text-green-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  high: 'text-orange-600 dark:text-orange-400',
  severe: 'text-red-600 dark:text-red-400',
};

interface Props {
  risk: WeatherRiskSummary;
  className?: string;
}

export function WeatherRiskBadge({ risk, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = risk.factors.length > 0 || risk.gear.length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Badge variant={RISK_VARIANT[risk.overall]}>{RISK_LABEL[risk.overall]} weather risk</Badge>

        {risk.bufferMinutesRecommended > 0 && (
          <span className="text-xs text-muted-foreground">
            +{risk.bufferMinutesRecommended} min buffer advised
          </span>
        )}

        {hasDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse weather details' : 'Expand weather details'}
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-3">
          {risk.factors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Conditions
              </p>
              {risk.factors.map((factor) => {
                const Icon = FACTOR_ICON[factor.kind];
                return (
                  <div key={factor.kind} className="flex items-start gap-2">
                    <Icon className={cn('size-3.5 mt-0.5 shrink-0', LEVEL_COLOR[factor.level])} />
                    <div>
                      <span className={cn('font-medium text-xs', LEVEL_COLOR[factor.level])}>
                        {FACTOR_LABEL[factor.kind]}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">— {factor.reason}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {risk.gear.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recommended gear
              </p>
              <ul className="space-y-0.5">
                {risk.gear.map((item) => (
                  <li key={item.id} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">— {item.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
