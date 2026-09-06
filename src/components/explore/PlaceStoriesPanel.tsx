'use client';

import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBengaluruData } from '@/lib/bengaluruData';
import { usePlaceStorySpeech } from '@/hooks/usePlaceStorySpeech';
import { useStoryEnrichments } from '@/hooks/useStoryEnrichment';
import { cn } from '@/lib/utils';
import type { PlaceStory } from '@/types';

const selectClassName = cn(
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'dark:bg-input/30',
);

interface Props {
  onSelect?: (story: PlaceStory) => void;
}

export function PlaceStoriesPanel({ onSelect }: Props) {
  const stories = getBengaluruData().stories;
  const [selectedId, setSelectedId] = useState(stories[0]?.id ?? '');
  const selectedStory = stories.find((story) => story.id === selectedId) ?? stories[0];
  const visibleStories = selectedStory ? [selectedStory] : [];
  const enrichments = useStoryEnrichments(visibleStories);
  const { speakingId, speak, stop, supported } = usePlaceStorySpeech();

  if (!selectedStory) return null;

  const wiki = enrichments[selectedStory.id];
  const displayText = wiki?.extract ?? selectedStory.text;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="story-select" className="text-sm font-medium">
            Place story
          </label>
          <select
            id="story-select"
            className={cn(selectClassName, 'mt-1.5')}
            value={selectedStory.id}
            onChange={(event) => {
              const next = stories.find((story) => story.id === event.target.value);
              if (!next) return;
              setSelectedId(next.id);
              onSelect?.(next);
            }}
          >
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.name}
              </option>
            ))}
          </select>
        </div>

        <article className="rounded-md border border-border/60 bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium">{selectedStory.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{displayText}</p>
              {wiki && (
                <p className="mt-2 text-xs text-muted-foreground/80">
                  Also from{' '}
                  <a
                    href={wiki.wikipediaUrl}
                    className="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Wikipedia
                  </a>
                </p>
              )}
              {selectedStory.links.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedStory.links.map((link, index) => (
                    <span key={link.url}>
                      {index > 0 && ' · '}
                      <a
                        href={link.url}
                        className="underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
            {supported && (
              <Button
                size="sm"
                variant={speakingId === selectedStory.id ? 'default' : 'outline'}
                className="shrink-0 gap-1"
                onClick={() =>
                  speakingId === selectedStory.id
                    ? stop()
                    : speak(
                        selectedStory,
                        wiki?.extract ? `${selectedStory.text} ${wiki.extract}` : undefined,
                      )
                }
                aria-label={
                  speakingId === selectedStory.id ? 'Stop story' : `Listen to ${selectedStory.name}`
                }
              >
                {speakingId === selectedStory.id ? (
                  <VolumeX className="size-3.5" />
                ) : (
                  <Volume2 className="size-3.5" />
                )}
                {speakingId === selectedStory.id ? 'Stop' : 'Listen'}
              </Button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
