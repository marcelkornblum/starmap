import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../stores/useUIStore';

let useMockDeferred = false;
let mockedDeferredValue: string | null = null;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useDeferredValue: <T,>(value: T, initialValue?: T): T => {
      if (useMockDeferred) {
        return mockedDeferredValue as T;
      }
      return actual.useDeferredValue(value, initialValue as T);
    },
  };
});

import { useBoundedDeferredValue } from './useBoundedDeferredValue';

describe('useBoundedDeferredValue', () => {
  afterEach(() => {
    useMockDeferred = false;
    mockedDeferredValue = null;
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    act(() => {
      useUIStore.getState().resetUI();
    });
  });

  it('returns value synchronously in test mode', () => {
    const { result } = renderHook(() => useBoundedDeferredValue({ count: 1 }, null, 150));
    expect(result.current).toEqual({ count: 1 });
  });

  it('handles custom maxWaitMs without throwing', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useBoundedDeferredValue(val, null, 150),
      { initialProps: { val: 'first' } },
    );
    expect(result.current).toBe('first');

    act(() => {
      rerender({ val: 'second' });
    });
    expect(result.current).toBe('second');
  });

  it('defers properly on an A -> (timeout) -> B -> A round-trip until B -> A itself times out', () => {
    vi.useFakeTimers();
    vi.stubEnv('MODE', 'production');
    useMockDeferred = true;
    mockedDeferredValue = null;

    const { result, rerender } = renderHook(
      ({ val }) => useBoundedDeferredValue(val, null, 200),
      { initialProps: { val: 'A' } },
    );

    expect(result.current).toBeNull();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('A');

    mockedDeferredValue = 'A';
    act(() => {
      rerender({ val: 'B' });
    });
    expect(result.current).toBe('A');

    mockedDeferredValue = 'B';
    act(() => {
      rerender({ val: 'A' });
    });
    expect(result.current).toBe('B');

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe('B');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('A');
  });
});
