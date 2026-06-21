import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { useSessionToken } from '@/hooks/useSessionToken';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Property 2: Session Token Billing Optimization
 *
 * - Same token used for all autocomplete requests AND final Place Details call within a session
 * - New token generated after selection, clear, or focus-on-empty
 * - From and To fields use independent tokens
 *
 * **Validates: Requirements 4.2, 4.4**
 */
describe('Property 2: Session Token Billing Optimization', () => {
  /**
   * Operation types that can be performed within a session lifecycle.
   * 'query' simulates typing (autocomplete requests) — token should NOT change.
   * 'select' simulates selecting a place — token should change.
   * 'clear' simulates clearing the field — token should change.
   * 'focusEmpty' simulates focusing on an empty field — token should change.
   * 'focusWithContent' simulates focusing on a field with text — token should NOT change.
   */
  type SessionOp = 'query' | 'select' | 'clear' | 'focusEmpty' | 'focusWithContent';

  const sessionOpArb: fc.Arbitrary<SessionOp> = fc.constantFrom(
    'query',
    'select',
    'clear',
    'focusEmpty',
    'focusWithContent',
  );

  describe('token stability within a session', () => {
    it('token stays the same throughout multiple queries in a single session', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 20 }), (queryCount) => {
          const { result } = renderHook(() => useSessionToken());
          const initialToken = result.current.sessionToken;

          // Simulate multiple autocomplete queries — token must remain the same
          // (The hook doesn't change token on queries; it only provides the current token)
          for (let i = 0; i < queryCount; i++) {
            // Reading sessionToken for each "autocomplete request"
            expect(result.current.sessionToken).toBe(initialToken);
          }
        }),
      );
    });

    it('token does NOT change on focusWithContent', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (focusCount) => {
          const { result } = renderHook(() => useSessionToken());
          const initialToken = result.current.sessionToken;

          for (let i = 0; i < focusCount; i++) {
            act(() => {
              result.current.handleFocus(true); // field has content
            });
            expect(result.current.sessionToken).toBe(initialToken);
          }
        }),
      );
    });
  });

  describe('token changes after session-ending actions', () => {
    it('token always changes after resetSession (selection)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (resetCount) => {
          const { result } = renderHook(() => useSessionToken());
          let previousToken = result.current.sessionToken;

          for (let i = 0; i < resetCount; i++) {
            act(() => {
              result.current.resetSession();
            });
            const newToken = result.current.sessionToken;
            expect(newToken).toMatch(UUID_REGEX);
            expect(newToken).not.toBe(previousToken);
            previousToken = newToken;
          }
        }),
      );
    });

    it('token always changes after handleFocus(false) (focus on empty field)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (focusCount) => {
          const { result } = renderHook(() => useSessionToken());
          let previousToken = result.current.sessionToken;

          for (let i = 0; i < focusCount; i++) {
            act(() => {
              result.current.handleFocus(false); // empty field
            });
            const newToken = result.current.sessionToken;
            expect(newToken).toMatch(UUID_REGEX);
            expect(newToken).not.toBe(previousToken);
            previousToken = newToken;
          }
        }),
      );
    });
  });

  describe('arbitrary operation sequences preserve session semantics', () => {
    it('all autocomplete calls within a session use the same token; new sessions start with a different token', () => {
      fc.assert(
        fc.property(fc.array(sessionOpArb, { minLength: 2, maxLength: 30 }), (ops) => {
          const { result } = renderHook(() => useSessionToken());

          let currentSessionToken = result.current.sessionToken;
          const sessionTokens: string[] = [currentSessionToken];

          for (const op of ops) {
            switch (op) {
              case 'query':
                // Autocomplete request: token should still be the current session token
                expect(result.current.sessionToken).toBe(currentSessionToken);
                break;

              case 'focusWithContent':
                // Refocus with content: token should stay the same
                act(() => {
                  result.current.handleFocus(true);
                });
                expect(result.current.sessionToken).toBe(currentSessionToken);
                break;

              case 'select':
                // Selection ends session: token changes
                act(() => {
                  result.current.resetSession();
                });
                expect(result.current.sessionToken).not.toBe(currentSessionToken);
                currentSessionToken = result.current.sessionToken;
                sessionTokens.push(currentSessionToken);
                break;

              case 'clear':
                // Clear ends session: token changes
                act(() => {
                  result.current.resetSession();
                });
                expect(result.current.sessionToken).not.toBe(currentSessionToken);
                currentSessionToken = result.current.sessionToken;
                sessionTokens.push(currentSessionToken);
                break;

              case 'focusEmpty':
                // Focus on empty field ends session: token changes
                act(() => {
                  result.current.handleFocus(false);
                });
                expect(result.current.sessionToken).not.toBe(currentSessionToken);
                currentSessionToken = result.current.sessionToken;
                sessionTokens.push(currentSessionToken);
                break;
            }

            // Invariant: token is always a valid UUID
            expect(result.current.sessionToken).toMatch(UUID_REGEX);
          }

          // All session tokens captured across session boundaries should be distinct
          const uniqueTokens = new Set(sessionTokens);
          expect(uniqueTokens.size).toBe(sessionTokens.length);
        }),
      );
    });
  });

  describe('From and To fields use independent tokens', () => {
    it('two separate hook instances maintain independent tokens across arbitrary operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              field: fc.constantFrom('from', 'to') as fc.Arbitrary<'from' | 'to'>,
              op: sessionOpArb,
            }),
            { minLength: 2, maxLength: 20 },
          ),
          (actions) => {
            const { result: fromResult } = renderHook(() => useSessionToken());
            const { result: toResult } = renderHook(() => useSessionToken());

            let fromToken = fromResult.current.sessionToken;
            let toToken = toResult.current.sessionToken;

            for (const { field, op } of actions) {
              const hookResult = field === 'from' ? fromResult : toResult;
              const otherResult = field === 'from' ? toResult : fromResult;
              const otherTokenBefore = otherResult.current.sessionToken;

              switch (op) {
                case 'query':
                case 'focusWithContent':
                  if (op === 'focusWithContent') {
                    act(() => {
                      hookResult.current.handleFocus(true);
                    });
                  }
                  // Token unchanged for this field
                  break;

                case 'select':
                case 'clear':
                  act(() => {
                    hookResult.current.resetSession();
                  });
                  break;

                case 'focusEmpty':
                  act(() => {
                    hookResult.current.handleFocus(false);
                  });
                  break;
              }

              // Key property: operations on one field never affect the other field's token
              expect(otherResult.current.sessionToken).toBe(otherTokenBefore);

              // Update tracked tokens
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              fromToken = fromResult.current.sessionToken;
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              toToken = toResult.current.sessionToken;
            }

            // Both fields always hold valid UUID tokens
            expect(fromResult.current.sessionToken).toMatch(UUID_REGEX);
            expect(toResult.current.sessionToken).toMatch(UUID_REGEX);
          },
        ),
      );
    });

    it('resetting one field token does not affect the other', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (resetCount) => {
          const { result: fromResult } = renderHook(() => useSessionToken());
          const { result: toResult } = renderHook(() => useSessionToken());

          const toInitial = toResult.current.sessionToken;

          // Reset the 'from' field multiple times
          for (let i = 0; i < resetCount; i++) {
            act(() => {
              fromResult.current.resetSession();
            });
          }

          // 'to' field token should remain unchanged
          expect(toResult.current.sessionToken).toBe(toInitial);
        }),
      );
    });
  });
});
