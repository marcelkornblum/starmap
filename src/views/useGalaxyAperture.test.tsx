import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalaxyAperture } from './useGalaxyAperture';
import { createSpatialEntityStore } from '../components/canvas/entity/SpatialEntityStore';
import { SpatialEntityStoreContext } from '../components/canvas/entity/SpatialEntityContext';

describe('useGalaxyAperture', () => {
  it('returns null for live aperture properties when store is unset', () => {
    const store = createSpatialEntityStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SpatialEntityStoreContext.Provider value={store}>
        {children}
      </SpatialEntityStoreContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useGalaxyAperture({
          cameraState: {},
          apertureCorpus: [],
          focusedEntity: null,
          centerEntity: null,
          urlFocusSlug: null,
        }),
      { wrapper },
    );

    expect(result.current.liveApertureRadius).toBeNull();
    expect(result.current.liveApertureCenter).toBeNull();
    expect(result.current.instrumentAperture).toBeTruthy();
    expect(result.current.instrumentAperture.apertureRadiusPc).toBeGreaterThan(0);
  });

  it('rounds live aperture radius and center to nearest increments when updated in store', () => {
    const store = createSpatialEntityStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SpatialEntityStoreContext.Provider value={store}>
        {children}
      </SpatialEntityStoreContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useGalaxyAperture({
          cameraState: {},
          apertureCorpus: [],
          focusedEntity: null,
          centerEntity: null,
          urlFocusSlug: null,
        }),
      { wrapper },
    );

    act(() => {
      store.getState().setApertureFrame([10.123, -5.678, 2.345], 14.89);
    });

    expect(result.current.liveApertureRadius).toBe(15);
    expect(result.current.liveApertureCenter).toEqual([10.1, -5.7, 2.3]);
  });

  it('throttles rapid camera glide updates to 100ms intervals after initial hydration', () => {
    vi.useFakeTimers();
    try {
      const store = createSpatialEntityStore();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SpatialEntityStoreContext.Provider value={store}>
          {children}
        </SpatialEntityStoreContext.Provider>
      );

      const { result } = renderHook(
        () =>
          useGalaxyAperture({
            cameraState: {},
            apertureCorpus: [],
            focusedEntity: null,
            centerEntity: null,
            urlFocusSlug: null,
          }),
        { wrapper },
      );

      // Initial hydration: commits immediately
      act(() => {
        store.getState().setApertureFrame([0, 0, 0], 10);
      });
      expect(result.current.liveApertureRadius).toBe(10);
      expect(result.current.liveApertureCenter).toEqual([0, 0, 0]);

      // Rapid update 20ms later: should be throttled
      act(() => {
        vi.advanceTimersByTime(20);
        store.getState().setApertureFrame([1, 1, 1], 20);
      });
      // Should still be old values before 100ms
      expect(result.current.liveApertureRadius).toBe(10);
      expect(result.current.liveApertureCenter).toEqual([0, 0, 0]);

      // Another rapid update at 40ms later
      act(() => {
        vi.advanceTimersByTime(20);
        store.getState().setApertureFrame([2, 2, 2], 30);
      });
      expect(result.current.liveApertureRadius).toBe(10);

      // Advance past remaining time to complete 100ms
      act(() => {
        vi.advanceTimersByTime(70);
      });
      expect(result.current.liveApertureRadius).toBe(30);
      expect(result.current.liveApertureCenter).toEqual([2, 2, 2]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prevents micro-jitter flip-flopping near rounding boundaries while committing genuine changes', () => {
    vi.useFakeTimers();
    try {
      const store = createSpatialEntityStore();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SpatialEntityStoreContext.Provider value={store}>
          {children}
        </SpatialEntityStoreContext.Provider>
      );

      const { result } = renderHook(
        () =>
          useGalaxyAperture({
            cameraState: {},
            apertureCorpus: [],
            focusedEntity: null,
            centerEntity: null,
            urlFocusSlug: null,
          }),
        { wrapper },
      );

      // Hydrate with radius 10 and center [5, 5, 5]
      act(() => {
        store.getState().setApertureFrame([5, 5, 5], 10);
      });
      expect(result.current.liveApertureRadius).toBe(10);
      expect(result.current.liveApertureCenter).toEqual([5, 5, 5]);

      // Micro-jitter near 0.25 rounding boundary:
      // Without hysteresis, 10.26 quantises to 10.5. With hysteresis (< 0.35 delta), radius remains 10.
      // Similarly, center jitter of [5.04, 5.03, 4.97] (< 0.08 delta) remains [5, 5, 5].
      act(() => {
        vi.advanceTimersByTime(120);
        store.getState().setApertureFrame([5.04, 5.03, 4.97], 10.26);
      });
      expect(result.current.liveApertureRadius).toBe(10);
      expect(result.current.liveApertureCenter).toEqual([5, 5, 5]);

      // Genuine change: zoom to 12 (> 0.35 delta) and pan to [6, 6, 6] (> 0.08 delta)
      act(() => {
        vi.advanceTimersByTime(120);
        store.getState().setApertureFrame([6, 6, 6], 12);
      });
      expect(result.current.liveApertureRadius).toBe(12);
      expect(result.current.liveApertureCenter).toEqual([6, 6, 6]);
    } finally {
      vi.useRealTimers();
    }
  });
});
