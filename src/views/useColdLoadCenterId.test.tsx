import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCameraStore } from '../stores/useCameraStore';
import {
  resolveEffectiveScaleCenterSlug,
  useColdLoadFocusActive,
  useScaleCenterResolution,
} from './useColdLoadCenterId';

describe('useColdLoadCenterId / scale center resolution', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveEffectiveScaleCenterSlug', () => {
    it('prioritizes explicit center over pendingCenterSlug and cold-load focus', () => {
      expect(
        resolveEffectiveScaleCenterSlug({
          center: 'Mars',
          cameraCenter: 'venus',
          pendingCenterSlug: 'titan',
          urlFocusSlug: 'earth',
          isColdLoadFocus: true,
          canvasFocusedSlugs: new Set(),
        }),
      ).toBe('mars');
    });

    it('returns undefined when center is a coordinate string or explicit x/y/z coordinates exist', () => {
      expect(
        resolveEffectiveScaleCenterSlug({
          center: '1.5,2.5,3.5',
          pendingCenterSlug: 'titan',
          urlFocusSlug: 'earth',
          isColdLoadFocus: true,
          canvasFocusedSlugs: new Set(),
        }),
      ).toBeUndefined();

      expect(
        resolveEffectiveScaleCenterSlug({
          hasExplicitCoords: true,
          pendingCenterSlug: 'titan',
          urlFocusSlug: 'earth',
          isColdLoadFocus: true,
          canvasFocusedSlugs: new Set(),
        }),
      ).toBeUndefined();
    });

    it('returns pendingCenterSlug ahead of cold-load urlFocusSlug and ignores canvasFocusedSlugs for explicit search intent', () => {
      expect(
        resolveEffectiveScaleCenterSlug({
          pendingCenterSlug: 'titan',
          urlFocusSlug: 'earth',
          isColdLoadFocus: true,
          canvasFocusedSlugs: new Set(['titan', 'earth']),
        }),
      ).toBe('titan');
    });

    it('returns urlFocusSlug only when isColdLoadFocus is true and slug is not in canvasFocusedSlugs', () => {
      expect(
        resolveEffectiveScaleCenterSlug({
          pendingCenterSlug: null,
          urlFocusSlug: 'earth',
          isColdLoadFocus: true,
          canvasFocusedSlugs: new Set(),
        }),
      ).toBe('earth');

      expect(
        resolveEffectiveScaleCenterSlug({
          pendingCenterSlug: null,
          urlFocusSlug: 'earth',
          isColdLoadFocus: true,
          canvasFocusedSlugs: new Set(['earth']),
        }),
      ).toBeUndefined();

      expect(
        resolveEffectiveScaleCenterSlug({
          pendingCenterSlug: null,
          urlFocusSlug: 'earth',
          isColdLoadFocus: false,
          canvasFocusedSlugs: new Set(),
        }),
      ).toBeUndefined();
    });
  });

  it('treats x/y/z cameraState coordinates as an explicit center param', () => {
    const { result } = renderHook(() =>
      useScaleCenterResolution({
        center: undefined,
        cameraState: { x: 1, y: 2, z: 3 },
        urlFocusSlug: 'earth',
      }),
    );

    expect(result.current.effectiveCenterId).toBeUndefined();
    expect(result.current.resolvedCenterCoordinates).toEqual([1, 2, 3]);
  });

  it('updates effectiveCenterId when focusFromSearch is dispatched intra-view', () => {
    const { result } = renderHook(() =>
      useScaleCenterResolution({
        center: undefined,
        cameraState: {},
        urlFocusSlug: null,
      }),
    );

    expect(result.current.effectiveCenterId).toBeUndefined();

    act(() => {
      useCameraStore.getState().focusFromSearch('titan');
    });

    expect(result.current.effectiveCenterId).toBe('titan');
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
