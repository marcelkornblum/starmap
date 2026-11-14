import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLazyRef } from './useLazyRef';

describe('useLazyRef', () => {
  it('initializes ref value once using the provided factory', () => {
    const factory = vi.fn(() => ({ count: 42 }));

    const { result, rerender } = renderHook(() => useLazyRef(factory));

    expect(result.current.current).toEqual({ count: 42 });
    expect(factory).toHaveBeenCalledTimes(1);

    rerender();
    expect(result.current.current).toEqual({ count: 42 });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('allows mutating ref.current across renders', () => {
    const { result, rerender } = renderHook(() =>
      useLazyRef(() => ({ value: 'alpha' })),
    );

    expect(result.current.current.value).toBe('alpha');

    result.current.current.value = 'beta';
    expect(result.current.current.value).toBe('beta');

    rerender();
    expect(result.current.current.value).toBe('beta');
  });
});
