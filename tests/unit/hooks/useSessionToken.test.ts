import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSessionToken } from '@/hooks/useSessionToken';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('useSessionToken', () => {
  it('initializes with a valid UUID v4 token', () => {
    const { result } = renderHook(() => useSessionToken());
    expect(result.current.sessionToken).toMatch(UUID_REGEX);
  });

  it('resetSession generates a new token', () => {
    const { result } = renderHook(() => useSessionToken());
    const initial = result.current.sessionToken;

    act(() => {
      result.current.resetSession();
    });

    expect(result.current.sessionToken).toMatch(UUID_REGEX);
    expect(result.current.sessionToken).not.toBe(initial);
  });

  it('handleFocus generates a new token when field is empty (hasContent=false)', () => {
    const { result } = renderHook(() => useSessionToken());
    const initial = result.current.sessionToken;

    act(() => {
      result.current.handleFocus(false);
    });

    expect(result.current.sessionToken).toMatch(UUID_REGEX);
    expect(result.current.sessionToken).not.toBe(initial);
  });

  it('handleFocus keeps the existing token when field has content (hasContent=true)', () => {
    const { result } = renderHook(() => useSessionToken());
    const initial = result.current.sessionToken;

    act(() => {
      result.current.handleFocus(true);
    });

    expect(result.current.sessionToken).toBe(initial);
  });

  it('From and To fields maintain independent tokens via separate hook instances', () => {
    const { result: fromResult } = renderHook(() => useSessionToken());
    const { result: toResult } = renderHook(() => useSessionToken());

    // Tokens are independently generated UUIDs (extremely unlikely to collide)
    expect(fromResult.current.sessionToken).toMatch(UUID_REGEX);
    expect(toResult.current.sessionToken).toMatch(UUID_REGEX);

    // Resetting one does not affect the other
    const toToken = toResult.current.sessionToken;

    act(() => {
      fromResult.current.resetSession();
    });

    expect(toResult.current.sessionToken).toBe(toToken);
  });

  it('generates distinct tokens on consecutive resetSession calls', () => {
    const { result } = renderHook(() => useSessionToken());
    const tokens = new Set<string>();

    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.resetSession();
      });
      tokens.add(result.current.sessionToken);
    }

    // All 10 tokens should be unique
    expect(tokens.size).toBe(10);
  });
});
