'use client';

import { useEffect, useState } from 'react';
import type { PlaceStory } from '@/types';
import type { WikipediaSummary } from '@/lib/wikipedia';
import { pickWikipediaLink } from '@/lib/wikipedia';

const clientCache = new Map<string, WikipediaSummary>();

function wikipediaApiUrl(storyUrl: string): string {
  const path = `/api/story/wikipedia?url=${encodeURIComponent(storyUrl)}`;
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

/** Batch-fetch Wikipedia extracts for visible stories (Explore panel). Fail-soft. */
export function useStoryEnrichments(stories: PlaceStory[]): Record<string, WikipediaSummary> {
  const [map, setMap] = useState<Record<string, WikipediaSummary>>({});

  useEffect(() => {
    const withWiki = stories.filter((s) => pickWikipediaLink(s.links));
    if (withWiki.length === 0) return;

    let cancelled = false;

    void Promise.all(
      withWiki.map(async (story) => {
        try {
          const cached = clientCache.get(story.id);
          if (cached) return { id: story.id, data: cached };
          const url = pickWikipediaLink(story.links)!;
          const res = await fetch(wikipediaApiUrl(url));
          if (!res.ok) return null;
          const data = (await res.json()) as WikipediaSummary;
          if (data?.extract) clientCache.set(story.id, data);
          return { id: story.id, data };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, WikipediaSummary> = {};
      for (const r of results) {
        if (r?.data?.extract) next[r.id] = r.data;
      }
      setMap(next);
    });

    return () => {
      cancelled = true;
    };
  }, [stories]);

  return map;
}
