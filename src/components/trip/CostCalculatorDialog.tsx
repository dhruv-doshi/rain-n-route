'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { computeCost, DEFAULT_INPUTS, type CostInputs } from '@/lib/costCalculator';
import { formatCost } from '@/lib/format';
import type { RouteOption } from '@/types';

interface Props {
  route: RouteOption;
}

export function CostCalculatorDialog({ route }: Props) {
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<CostInputs>(DEFAULT_INPUTS);
  const breakdown = computeCost(route, inputs);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
            <Calculator className="size-3" />
            Cost
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cost breakdown</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Fuel price (₹/L)"
              value={inputs.fuelPricePerLitre / 100}
              onChange={(v) => setInputs({ ...inputs, fuelPricePerLitre: Math.round(v * 100) })}
            />
            <Field
              label="Mileage (km/L)"
              value={inputs.fuelEfficiencyKmPerLitre}
              onChange={(v) => setInputs({ ...inputs, fuelEfficiencyKmPerLitre: v })}
            />
            <Field
              label="Parking (₹)"
              value={inputs.parkingFee / 100}
              onChange={(v) => setInputs({ ...inputs, parkingFee: Math.round(v * 100) })}
            />
            <Field
              label="Tolls (₹)"
              value={inputs.tolls / 100}
              onChange={(v) => setInputs({ ...inputs, tolls: Math.round(v * 100) })}
            />
          </div>

          <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3 text-sm">
            {breakdown.fuel > 0 && <Row label="Fuel" value={breakdown.fuel} />}
            {breakdown.fare > 0 && <Row label="Fare" value={breakdown.fare} />}
            {breakdown.parking > 0 && <Row label="Parking" value={breakdown.parking} />}
            {breakdown.tolls > 0 && <Row label="Tolls" value={breakdown.tolls} />}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-medium">
              <span>Total</span>
              <span>{formatCost(breakdown.total)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatCost(value)}</span>
    </div>
  );
}
