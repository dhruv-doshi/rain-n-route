'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaceStory } from '@/types';

export function usePlaceStorySpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (story: PlaceStory, textOverride?: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return false;

      stop();
      const utterance = new SpeechSynthesisUtterance(textOverride ?? story.text);
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      utteranceRef.current = utterance;
      setSpeakingId(story.id);
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [stop],
  );

  return { speakingId, speak, stop, supported };
}
