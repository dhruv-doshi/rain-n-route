import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAutocomplete } from '@/hooks/useAutocomplete';

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          { id: 'place1', label: 'Indiranagar', secondary: 'Bengaluru' },
          { id: 'place2', label: 'Indore', secondary: 'MP' },
        ],
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('debounce behavior (Requirement 3.1)', () => {
    it('does not fetch before 300ms elapses', async () => {
      renderHook(() => useAutocomplete('Ind', 'token-1'));

      // Advance less than 300ms
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches after 300ms debounce', async () => {
      const { result } = renderHook(() => useAutocomplete('Ind', 'token-1'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(310);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.suggestions).toHaveLength(2);
    });
  });

  describe('abort on re-type (Requirement 3.2)', () => {
    it('aborts prior request when query changes before debounce fires', async () => {
      const { rerender } = renderHook(({ query }) => useAutocomplete(query, 'token-1'), {
        initialProps: { query: 'Ind' },
      });

      // Advance partially into debounce but not enough to trigger
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      // User types more — new query triggers cleanup which clears timeout and aborts
      rerender({ query: 'Indi' });

      // Now advance the new debounce to fire
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Only one fetch should have been made — for the final query
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(fetchUrl).toContain('q=Indi');
    });

    it('only the latest query results in a fetch call', async () => {
      const { rerender } = renderHook(({ query }) => useAutocomplete(query, 'token-1'), {
        initialProps: { query: 'Ind' },
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      rerender({ query: 'Indi' });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      rerender({ query: 'Indir' });

      // Now let the final debounce complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(fetchUrl).toContain('q=Indir');
    });
  });

  describe('minimum 3 characters (Requirement 3.7)', () => {
    it('returns empty suggestions for input < 3 chars without fetching', async () => {
      const { result } = renderHook(() => useAutocomplete('In', 'token-1'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.suggestions).toEqual([]);
    });

    it('returns empty suggestions for empty string without fetching', async () => {
      const { result } = renderHook(() => useAutocomplete('', 'token-1'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.suggestions).toEqual([]);
    });

    it('fetches when input reaches exactly 3 chars', async () => {
      const { result } = renderHook(() => useAutocomplete('Ind', 'token-1'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(310);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.suggestions).toHaveLength(2);
    });
  });

  describe('100 character truncation (Requirement 3.1)', () => {
    it('truncates input exceeding 100 characters in fetch URL', async () => {
      const longQuery = 'A'.repeat(150);

      renderHook(() => useAutocomplete(longQuery, 'token-1'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      const url = new URL(fetchUrl, 'http://localhost');
      const qParam = url.searchParams.get('q')!;
      expect(qParam.length).toBe(100);
      expect(qParam).toBe('A'.repeat(100));
    });
  });

  describe('sessionToken passed (Requirement 4.2)', () => {
    it('includes the session token in the fetch request URL', async () => {
      const token = 'my-session-token-123';

      renderHook(() => useAutocomplete('Bengaluru', token));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(fetchUrl).toContain(`sessionToken=${token}`);
    });
  });

  describe('error handling', () => {
    it('sets error state on fetch failure without aborting', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useAutocomplete('Ind', 'token-1'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(310);
      });

      expect(result.current.error).toBe('Failed to load suggestions');
      expect(result.current.suggestions).toEqual([]);
    });

    it('does not set error state on abort', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        Object.assign(new Error('Aborted'), { name: 'AbortError' }),
      );

      const { result } = renderHook(() => useAutocomplete('Ind', 'token-1'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Give some time for the promise chain to resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
