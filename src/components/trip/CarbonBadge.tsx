'use client';

import { Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tier = 'low' | 'moderate' | 'high';

function tierFor(grams: number): Tier {
  if (grams < 500) return 'low';
  if (grams < 2_500) return 'moderate';
  return 'high';
}

const TIER_CLASS: Record<Tier, string> = {
  low: 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400',
  moderate: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  high: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400',
};

interface Props {
  carbonGrams: number;
  className?: string;
}

export function CarbonBadge({ carbonGrams, className }: Props) {
  if (carbonGrams <= 0) return null;
  const tier = tierFor(carbonGrams);
  const display =
    carbonGrams >= 1_000
      ? `${(carbonGrams / 1_000).toFixed(1)} kg`
      : `${Math.round(carbonGrams)} g`;
  return (
    <Badge variant="outline" className={cn('gap-1', TIER_CLASS[tier], className)}>
      <Leaf className="size-3" />
      <span>{display} CO₂</span>
    </Badge>
  );
}
