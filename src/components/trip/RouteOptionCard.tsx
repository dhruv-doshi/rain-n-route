'use client';

import {
  Car,
  Bike,
  Train,
  Zap,
  Footprints,
  ArrowLeftRight,
  Clock,
  IndianRupee,
  ArrowUpDown,
  PersonStanding,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StepByStepList } from './StepByStepList';
import { WeatherRiskBadge } from './WeatherRiskBadge';
import { CarbonBadge } from './CarbonBadge';
import { CostCalculatorDialog } from './CostCalculatorDialog';
import { formatDuration, formatCost, formatDistance } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { RouteOption, TransportMode } from '@/types';

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

const MODE_LABEL: Record<TransportMode, string> = {
  car: 'Car',
  two_wheeler: 'Two-wheeler',
  transit: 'Transit',
  cab: 'Cab',
  auto: 'Auto',
  walk: 'Walk',
  cycle: 'Cycle',
  mixed: 'Mixed',
};

interface Props {
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
}

export function RouteOptionCard({ route, isSelected, onSelect }: Props) {
  const primaryMode = route.modes[0] ?? 'mixed';
  const Icon = MODE_ICON[primaryMode] ?? ArrowLeftRight;
  const modeLabel = route.modes.map((m) => MODE_LABEL[m]).join(' + ');

  return (
    <Card
      className={cn('transition-shadow', isSelected && 'ring-2 ring-brand')}
      data-selected={isSelected || undefined}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-brand">
            {route.modes.map((m) => {
              const ModeIcon = MODE_ICON[m] ?? ArrowLeftRight;
              return <ModeIcon key={m} className="size-4" />;
            })}
          </span>
          <span className="text-sm">{modeLabel}</span>
        </CardTitle>
        <CardAction>
          <Button
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            onClick={onSelect}
            aria-pressed={isSelected}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
          <Stat icon={Clock} label="Duration" value={formatDuration(route.totalDuration)} />
          <Stat icon={IndianRupee} label="Cost" value={formatCost(route.estimatedCost)} />
          <Stat
            icon={ArrowUpDown}
            label="Transfers"
            value={
              route.numTransfers === 0
                ? 'Non-stop'
                : `${route.numTransfers} transfer${route.numTransfers > 1 ? 's' : ''}`
            }
          />
          {route.walkDistance > 0 && (
            <Stat icon={PersonStanding} label="Walk" value={formatDistance(route.walkDistance)} />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CarbonBadge carbonGrams={route.carbonGrams} />
          <CostCalculatorDialog route={route} />
        </div>

        {route.weatherRisk && (
          <div className="mt-3">
            <WeatherRiskBadge risk={route.weatherRisk} />
          </div>
        )}

        <StepByStepList steps={route.steps} />
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium leading-tight">{value}</p>
      </div>
    </div>
  );
}
