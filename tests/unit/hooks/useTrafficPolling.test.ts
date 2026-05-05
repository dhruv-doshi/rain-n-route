import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTrafficPolling } from '@/hooks/useTrafficPolling';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
  setVisibility('visible');
});

describe('useTrafficPolling', () => {
  it('does not poll when baselineSec is null', () => {
    const refetch = vi.fn(async () => 600);
    renderHook(() => useTrafficPolling({ baselineSec: null, refetch, intervalMs: 1_000 }));
    vi.advanceTimersByTime(5_000);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('does not poll when enabled is false', () => {
    const refetch = vi.fn(async () => 600);
    renderHook(() =>
      useTrafficPolling({ baselineSec: 600, refetch, intervalMs: 1_000, enabled: false }),
    );
    vi.advanceTimersByTime(5_000);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('polls at the configured interval and reports delta', async () => {
    const refetch = vi.fn(async () => 720);
    const { result } = renderHook(() =>
      useTrafficPolling({ baselineSec: 600, refetch, intervalMs: 1_000 }),
    );

    expect(refetch).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      // Flush microtasks so the awaited refetch resolves and setState commits.
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(result.current.currentSec).toBe(720);
    expect(result.current.delta?.shouldPromptReroute).toBe(true);
    expect(result.current.delta?.deltaSec).toBe(120);
  });

  it('pauses on visibilitychange to hidden, resumes on visible', async () => {
    const refetch = vi.fn(async () => 600);
    renderHook(() => useTrafficPolling({ baselineSec: 600, refetch, intervalMs: 1_000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);

    act(() => setVisibility('hidden'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1); // no new calls while hidden

    act(() => setVisibility('visible'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('cleans up the interval on unmount', async () => {
    const refetch = vi.fn(async () => 600);
    const { unmount } = renderHook(() =>
      useTrafficPolling({ baselineSec: 600, refetch, intervalMs: 1_000 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1); // no further calls after unmount
  });

  it('does not auto-start when document is already hidden', async () => {
    setVisibility('hidden');
    const refetch = vi.fn(async () => 600);
    renderHook(() => useTrafficPolling({ baselineSec: 600, refetch, intervalMs: 1_000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(refetch).not.toHaveBeenCalled();
  });
});
