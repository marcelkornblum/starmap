import { afterEach, describe, it, expect, vi } from 'vitest';
import { REDUCED_MOTION_MEDIA_QUERY, prefersReducedMotion } from './reducedMotion';

describe('reducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes the standard prefers-reduced-motion media query', () => {
    expect(REDUCED_MOTION_MEDIA_QUERY).toBe('(prefers-reduced-motion: reduce)');
  });

  it('returns false safely when window is undefined', () => {
    expect(typeof window).toBe('undefined');
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns false safely when window.matchMedia is missing', () => {
    vi.stubGlobal('window', {});
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reads window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches when available', () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === REDUCED_MOTION_MEDIA_QUERY,
    }));
    vi.stubGlobal('window', { matchMedia });

    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_MEDIA_QUERY);

    matchMedia.mockReturnValueOnce({ matches: false });
    expect(prefersReducedMotion()).toBe(false);
  });
});
