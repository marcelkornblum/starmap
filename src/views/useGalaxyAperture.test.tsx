import React from 'react';
import { describe, it, expect } from 'vitest';
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
});
