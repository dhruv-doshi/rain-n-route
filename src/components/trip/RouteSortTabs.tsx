'use client';

import { Timer, IndianRupee, ArrowLeftRight, Leaf } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SortMode } from '@/types';

interface Props {
  sortBy: SortMode;
  onChange: (mode: SortMode) => void;
  disabled?: boolean;
}

const TABS: { value: SortMode; label: string; Icon: React.ElementType }[] = [
  { value: 'fastest', label: 'Fastest', Icon: Timer },
  { value: 'cheapest', label: 'Cheapest', Icon: IndianRupee },
  { value: 'least_transfers', label: 'Fewest stops', Icon: ArrowLeftRight },
  { value: 'eco', label: 'Eco', Icon: Leaf },
];

export function RouteSortTabs({ sortBy, onChange, disabled }: Props) {
  return (
    <Tabs
      value={sortBy}
      onValueChange={(v) => {
        if (v && !disabled) onChange(v as SortMode);
      }}
    >
      <TabsList className="w-full">
        {TABS.map(({ value, label, Icon }) => (
          <TabsTrigger key={value} value={value} disabled={disabled} className="flex-1 gap-1">
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
