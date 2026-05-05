'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownUp, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from './AddressAutocomplete';
import { QuickLocationChips } from './QuickLocationChips';
import type { GeoSuggestion } from '@/types';

const planSchema = z.object({
  from: z.object({
    id: z.string(),
    label: z.string().min(1),
    coords: z.object({ lat: z.number(), lng: z.number() }),
  }),
  to: z.object({
    id: z.string(),
    label: z.string().min(1),
    coords: z.object({ lat: z.number(), lng: z.number() }),
  }),
});

type PlanFields = z.infer<typeof planSchema>;

function buildUrl(fields: PlanFields): string {
  const fromParam = `${fields.from.coords.lat},${fields.from.coords.lng},${encodeURIComponent(fields.from.label)}`;
  const toParam = `${fields.to.coords.lat},${fields.to.coords.lng},${encodeURIComponent(fields.to.label)}`;
  return `/trip/plan?from=${fromParam}&to=${toParam}`;
}

export function FromToForm() {
  const router = useRouter();
  const [from, setFrom] = useState<GeoSuggestion | null>(null);
  const [to, setTo] = useState<GeoSuggestion | null>(null);
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const [resolutionError, setResolutionError] = useState<{ from?: string; to?: string }>({});
  const [resolving, setResolving] = useState(false);

  function swap() {
    setFrom(to);
    setTo(from);
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const result = planSchema.safeParse({ from, to });

    if (!result.success) {
      const fieldErrors: { from?: string; to?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'from' | 'to';
        fieldErrors[field] = 'Please select a location';
      }
      setErrors(fieldErrors);
      return;
    }

    router.push(buildUrl(result.data));
  }

  function selectFrom(suggestion: GeoSuggestion) {
    setFrom(suggestion);
    setErrors((e) => ({ ...e, from: undefined }));
    setResolutionError((e) => ({ ...e, from: undefined }));
  }

  function selectTo(suggestion: GeoSuggestion) {
    setTo(suggestion);
    setErrors((e) => ({ ...e, to: undefined }));
    setResolutionError((e) => ({ ...e, to: undefined }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Trip planner"
      className="flex w-full flex-col gap-3"
    >
      <div className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <AddressAutocomplete
          label="From"
          placeholder="Search starting point…"
          value={from}
          onSelect={selectFrom}
          onClear={() => {
            setFrom(null);
            setErrors((e) => ({ ...e, from: undefined }));
            setResolutionError((e) => ({ ...e, from: undefined }));
          }}
          onResolvingChange={setResolving}
          onResolutionError={(msg) => setResolutionError((e) => ({ ...e, from: msg }))}
        />
        {(errors.from ?? resolutionError.from) && (
          <p className="text-xs text-destructive">{errors.from ?? resolutionError.from}</p>
        )}

        {/* Swap button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            aria-label="Swap from and to"
            onClick={swap}
            className="flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowDownUp className="size-3.5" />
          </button>
        </div>

        <AddressAutocomplete
          label="To"
          placeholder="Search destination…"
          value={to}
          onSelect={selectTo}
          onClear={() => {
            setTo(null);
            setErrors((e) => ({ ...e, to: undefined }));
            setResolutionError((e) => ({ ...e, to: undefined }));
          }}
          onResolvingChange={setResolving}
          onResolutionError={(msg) => setResolutionError((e) => ({ ...e, to: msg }))}
        />
        {(errors.to ?? resolutionError.to) && (
          <p className="text-xs text-destructive">{errors.to ?? resolutionError.to}</p>
        )}
      </div>

      <div className="px-1">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Quick fill — From</p>
        <QuickLocationChips onSelect={selectFrom} />
      </div>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={resolving}>
        {resolving ? 'Resolving location…' : 'Plan my trip'}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
