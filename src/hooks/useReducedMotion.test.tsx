import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { REDUCED_MOTION_MEDIA_QUERY } from '../utils/reducedMotion';
import { useReducedMotion } from './useReducedMotion';

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchChange: (nextMatches: boolean) => void;
}

function createMockMatchMedia(initialMatches: boolean): {
  matchMedia: ReturnType<typeof vi.fn>;
  mql: MockMediaQueryList;
} {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql: MockMediaQueryList = {
    matches: initialMatches,
    media: REDUCED_MOTION_MEDIA_QUERY,
    addEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') {
        listeners.add(listener);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') {
        listeners.delete(listener);
      }
    }),
    dispatchChange(nextMatches: boolean) {
      mql.matches = nextMatches;
      const event = { matches: nextMatches, media: REDUCED_MOTION_MEDIA_QUERY } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  };

  const matchMedia = vi.fn(() => mql as unknown as MediaQueryList);
  return { matchMedia, mql };
}

describe('useReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('returns the initial reduced-motion state and reacts to media query change events', () => {
    const { matchMedia, mql } = createMockMatchMedia(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMedia,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_MEDIA_QUERY);
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    act(() => {
      mql.dispatchChange(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql.dispatchChange(false);
    });
    expect(result.current).toBe(false);
  });

  it('cleans up the media query listener on unmount', () => {
    const { matchMedia, mql } = createMockMatchMedia(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMedia,
    });

    const { result, unmount } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    const registeredHandler = mql.addEventListener.mock.calls[0]?.[1];
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', registeredHandler);
  });
});
