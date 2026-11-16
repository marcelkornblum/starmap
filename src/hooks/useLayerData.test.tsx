import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as layerRepository from '../data/layerRepository';
import {
  useEntityAnnotations,
  useLoadedLayerManifests,
} from './useLayerData';
import { resetLayerRuntime, seedLayerRuntime } from '../../tests/fixtures/layerFixtures';

describe('useLayerData hooks', () => {
  afterEach(async () => {
    await act(async () => {
      resetLayerRuntime();
    });
  });

  it('useLoadedLayerManifests returns nothing until the index and manifests are loaded', async () => {
    let result!: { current: ReturnType<typeof useLoadedLayerManifests> };
    await act(async () => {
      const hook = renderHook(() =>
        useLoadedLayerManifests('?layer=recent-discoveries'),
      );
      result = hook.result;
    });
    expect(result.current).toEqual([]);
  });

  it('useLoadedLayerManifests returns the cached manifests for layers referenced by ?layer= and ?select=layer:', async () => {
    await seedLayerRuntime({
      manifestIds: ['overlay-recent-discoveries', 'canon-halo'],
    });

    let res1!: { current: ReturnType<typeof useLoadedLayerManifests> };
    await act(async () => {
      const hook1 = renderHook(() =>
        useLoadedLayerManifests('?layer=recent-discoveries:lhs-1140-b'),
      );
      res1 = hook1.result;
    });
    expect(res1.current.map((m) => m.layerId)).toEqual([
      'overlay-recent-discoveries',
    ]);

    let res2!: { current: ReturnType<typeof useLoadedLayerManifests> };
    await act(async () => {
      const hook2 = renderHook(() =>
        useLoadedLayerManifests('?select=layer:halo,layer:recent-discoveries'),
      );
      res2 = hook2.result;
    });
    expect(res2.current.map((m) => m.layerId)).toEqual([
      'canon-halo',
      'overlay-recent-discoveries',
    ]);

    let res3!: { current: ReturnType<typeof useLoadedLayerManifests> };
    await act(async () => {
      const hook3 = renderHook(() =>
        useLoadedLayerManifests('?select=layer:dune'),
      );
      res3 = hook3.result;
    });
    expect(res3.current).toEqual([]);

    let res4!: { current: ReturnType<typeof useLoadedLayerManifests> };
    await act(async () => {
      const hook4 = renderHook(() => useLoadedLayerManifests(''));
      res4 = hook4.result;
    });
    expect(res4.current).toEqual([]);
  });

  it('useEntityAnnotations returns decoded records from cached by-entity buckets', async () => {
    let res1!: { current: ReturnType<typeof useEntityAnnotations> };
    await act(async () => {
      const hook1 = renderHook(() => useEntityAnnotations(['tau-ceti-e']));
      res1 = hook1.result;
    });
    expect(res1.current).toEqual([]);

    await seedLayerRuntime({ entityIds: ['tau-ceti-e'] });

    let res2!: { current: ReturnType<typeof useEntityAnnotations> };
    await act(async () => {
      const hook2 = renderHook(() => useEntityAnnotations(['tau-ceti-e']));
      res2 = hook2.result;
    });
    expect(
      res2.current.some(
        (r) =>
          r.layerId === 'canon-project-hail-mary' && r.targetId === 'tau-ceti-e',
      ),
    ).toBe(true);

    let res3!: { current: ReturnType<typeof useEntityAnnotations> };
    await act(async () => {
      const hook3 = renderHook(() => useEntityAnnotations(['']));
      res3 = hook3.result;
    });
    expect(res3.current).toEqual([]);
  });

  it('resolves cached entity annotations synchronously without triggering fetchEntityAnnotations', async () => {
    await seedLayerRuntime({ entityIds: ['tau-ceti-e'] });

    const fetchSpy = vi.spyOn(layerRepository, 'fetchEntityAnnotations');

    let res!: { current: ReturnType<typeof useEntityAnnotations> };
    await act(async () => {
      const hook = renderHook(() => useEntityAnnotations(['tau-ceti-e']));
      res = hook.result;
    });

    expect(res.current.length).toBeGreaterThan(0);
    expect(res.current.some((r) => r.targetId === 'tau-ceti-e')).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
