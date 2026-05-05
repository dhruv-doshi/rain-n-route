'use client';

import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { useRecurringStore } from '@/store/recurringStore';
import { useLocationsStore } from '@/store/locationsStore';
import type { DayOfWeek, RecurringCommute } from '@/types';

const DAY_MAP: Record<string, DayOfWeek> = {
  '0': 'sun',
  '1': 'mon',
  '2': 'tue',
  '3': 'wed',
  '4': 'thu',
  '5': 'fri',
  '6': 'sat',
};

function todayKey(): DayOfWeek {
  return DAY_MAP[new Date().getDay().toString()];
}

function buildPlanUrl(commute: RecurringCommute, fromCoords: string, toCoords: string): string {
  return `/trip/plan?${new URLSearchParams({ from: fromCoords, to: toCoords }).toString()}`;
}

export function TodaysCommuteCard() {
  const commutes = useRecurringStore((s) => s.commutes);
  const locations = useLocationsStore((s) => s.locations);

  const today = todayKey();
  const todaysCommutes = commutes.filter((c) => c.active && c.daysOfWeek.includes(today));

  if (todaysCommutes.length === 0) return null;

  return (
    <div className="w-full space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Today&apos;s commutes</p>
      {todaysCommutes.map((commute) => {
        const from = locations.find((l) => l.id === commute.fromLocationId);
        const to = locations.find((l) => l.id === commute.toLocationId);
        if (!from || !to) return null;

        const fromParam = `${from.coords.lat},${from.coords.lng},${encodeURIComponent(from.label)}`;
        const toParam = `${to.coords.lat},${to.coords.lng},${encodeURIComponent(to.label)}`;

        return (
          <Card key={commute.id} className="border-brand/20 bg-brand-muted/30">
            <CardContent className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{commute.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3 shrink-0" />
                  <span>Leave at {commute.departTime}</span>
                  <span>·</span>
                  <span className="truncate">
                    {from.label} → {to.label}
                  </span>
                </div>
              </div>
              <Link
                href={buildPlanUrl(commute, fromParam, toParam)}
                className={buttonVariants({
                  size: 'sm',
                  variant: 'default',
                  className: 'shrink-0 gap-1',
                })}
              >
                Plan
                <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
