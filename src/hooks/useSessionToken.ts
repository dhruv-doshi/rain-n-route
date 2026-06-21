'use client';

import { useState, useCallback } from 'react';

function generateToken(): string {
  return crypto.randomUUID();
}

interface UseSessionTokenResult {
  /** Current UUID v4 session token */
  sessionToken: string;
  /** Generate a new token — call after selection or clear */
  resetSession: () => void;
  /** Regenerate token only if the field is empty (no text and no resolved place) */
  handleFocus: (hasContent: boolean) => void;
}

/**
 * Manages a Google Places autocomplete session token for a single input field.
 *
 * Each From/To field should use its own instance of this hook so tokens are
 * independent. Tokens are never persisted — they live only in React state.
 *
 * Lifecycle:
 * - Focus on empty field → new token
 * - After selection → new token (via resetSession)
 * - After clear → new token (via resetSession)
 * - Refocus with existing text or resolved place → keep current token
 */
export function useSessionToken(): UseSessionTokenResult {
  const [sessionToken, setSessionToken] = useState<string>(generateToken);

  const resetSession = useCallback(() => {
    setSessionToken(generateToken());
  }, []);

  const handleFocus = useCallback((hasContent: boolean) => {
    if (!hasContent) {
      setSessionToken(generateToken());
    }
    // If field already has text or a resolved place, keep the existing token
  }, []);

  return { sessionToken, resetSession, handleFocus };
}
