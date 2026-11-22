import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useColdLoadCenter, useColdLoadFocusActive } from './useColdLoadCenterId';

describe('useColdLoadCenterId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('treats x/y/z cameraState coordinates as an explicit center param', () => {
    const { result } = renderHook(() =>
      useColdLoadCenter(undefined, { x: 1, y: 2, z: 3 }, 'earth'),
    );

    expect(result.current.effectiveCenterId).toBeUndefined();
    expect(result.current.resolvedCenterCoordinates).toEqual([1, 2, 3]);
  });

  it('clears cold-load focus in an effect without triggering render-phase setState warnings', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result, rerender } = renderHook(
      ({ hasExplicitCenter, focusSlug }) =>
        useColdLoadFocusActive(hasExplicitCenter, focusSlug),
      { initialProps: { hasExplicitCenter: false, focusSlug: 'earth' as string | null } },
    );

    expect(result.current).toBe(true);

    rerender({ hasExplicitCenter: false, focusSlug: 'sol' });
    expect(result.current).toBe(false);

    rerender({ hasExplicitCenter: false, focusSlug: 'earth' });
    expect(result.current).toBe(false);

    const hasRenderWarning = errorSpy.mock.calls.some((args) =>
      args.some(
        (arg) =>
          typeof arg === 'string' &&
          (arg.includes('Cannot update a component') ||
            arg.includes('Too many re-renders') ||
            arg.includes('state update on an unmounted')),
      ),
    );
    expect(hasRenderWarning).toBe(false);
  });
});
