'use client';

import { useState, useRef, useId, KeyboardEvent } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import type { GeoResult, GeoSuggestion } from '@/types';
import { cn } from '@/lib/utils';

async function resolveCoords(label: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(label)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: GeoResult[] };
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

interface Props {
  label: string;
  placeholder: string;
  value: GeoSuggestion | null;
  onSelect: (suggestion: GeoSuggestion) => void;
  onClear: () => void;
  onResolvingChange?: (resolving: boolean) => void;
  onResolutionError?: (msg: string) => void;
  icon?: React.ReactNode;
}

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  onSelect,
  onClear,
  onResolvingChange,
  onResolutionError,
  icon,
}: Props) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  const { suggestions, loading } = useAutocomplete(query);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setActiveIndex(-1);
    setOpen(true);
  }

  async function handleSelect(suggestion: GeoSuggestion) {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);

    if (suggestion.coords) {
      onSelect(suggestion);
      return;
    }

    // Short label guard — geocode API requires at least 2 chars
    if (suggestion.label.length < 2) {
      onResolutionError?.("Couldn't find this location — please pick a different one");
      return;
    }

    // Suggestion has no coords — resolve before confirming selection
    setResolving(true);
    onResolvingChange?.(true);
    const details = await resolveCoords(suggestion.label);
    setResolving(false);
    onResolvingChange?.(false);

    if (!details?.coords) {
      onResolutionError?.("Couldn't resolve this location — please pick a different one");
      return;
    }

    onSelect({ ...suggestion, coords: details.coords });
  }

  function handleClear() {
    onClear();
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = open && (suggestions.length > 0 || loading) && !value;

  return (
    <div className="relative w-full">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>

      {value || resolving ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          {resolving ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            (icon ?? <MapPin className="size-4 shrink-0 text-brand" />)
          )}
          <span className="flex-1 truncate">{value?.label ?? query}</span>
          {!resolving && (
            <button
              type="button"
              aria-label={`Clear ${label}`}
              onClick={handleClear}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                (icon ?? <MapPin className="size-4 text-brand" />)
              )}
            </span>
            <Input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={placeholder}
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
              }
              aria-expanded={showDropdown}
              role="combobox"
              className="pl-9"
            />
          </div>

          {showDropdown && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={`${label} suggestions`}
              className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
            >
              {loading && suggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">Loading…</li>
              )}
              {suggestions.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listboxId}-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={() => handleSelect(s)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm',
                    i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                  )}
                >
                  <div className="truncate font-medium">{s.label}</div>
                  {s.secondary && (
                    <div className="truncate text-xs text-muted-foreground">{s.secondary}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
