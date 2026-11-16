import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBoundedDeferredValue } from './useBoundedDeferredValue';

describe('useBoundedDeferredValue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
