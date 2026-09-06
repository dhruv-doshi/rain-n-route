'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchExploreFeatures, type ExploreSearchHit } from '@/lib/exploreSearch';
import { cn } from '@/lib/utils';

interface Props {
  onSelect: (hit: ExploreSearchHit) => void;
  className?: string;
}

export function ExploreSearchBar({ onSelect, className }: Props) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchExploreFeatures(query), [query]);

  return (
    <div className={cn('relative', className)}>
      <label htmlFor="explore-search" className="sr-only">
        Search places, lakes, drains, hotspots
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="explore-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search lakes, drains, hotspots, Metro…"
          className="pl-8"
          autoComplete="off"
          role="combobox"
          aria-expanded={query.length >= 2 && results.length > 0}
          aria-controls="explore-search-results"
        />
      </div>

      {query.length >= 2 && results.length > 0 && (
        <ul
          id="explore-search-results"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-md"
        >
          {results.map((hit) => (
            <li key={hit.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                onClick={() => {
                  onSelect(hit);
                  setQuery('');
                }}
              >
                <span className="text-sm font-medium">{hit.name}</span>
                <span className="text-xs text-muted-foreground">
                  {hit.category} · {hit.detail}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && results.length === 0 && (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-md">
          No matches in bundled Bengaluru data.
        </p>
      )}
    </div>
  );
}

export type { ExploreSearchHit };
