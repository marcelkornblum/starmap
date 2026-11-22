import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportStoreSync } from './useViewportStoreSync';
import { createSpatialEntityStore } from '../entity';

describe('useViewportStoreSync hook', () => {
  let localStore: ReturnType<typeof createSpatialEntityStore>;
  let outerStore: ReturnType<typeof createSpatialEntityStore>;

  beforeEach(() => {
    localStore = createSpatialEntityStore();
    outerStore = createSpatialEntityStore();
    localStore.getState().registerEntity({
      id: 'star-1',
      name: 'Star 1',
      classification: 'star',
      position: [10, 0, 0],
    });
    outerStore.getState().registerEntity({
      id: 'star-1',
      name: 'Star 1',
      classification: 'star',
      position: [10, 0, 0],
    });
  });

  it('initializes selection when initialSelectedId is provided', () => {
    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        initialSelectedId: 'star-1',
      }),
    );

    expect(localStore.getState().selectedId).toBe('star-1');
  });

  it('synchronizes outer store selectedIds inward to local store', () => {
    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      outerStore.getState().setSelectedIds(new Set(['star-1']));
    });

    expect(localStore.getState().selectedIds.has('star-1')).toBe(true);
  });

  it('synchronizes local store selectedId outward to outer store', () => {
    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      localStore.getState().setSelected('star-1');
    });

    expect(outerStore.getState().selectedId).toBe('star-1');
  });

  it('synchronizes local store focusedId outward to outer store', () => {
    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      localStore.getState().setFocused('star-1');
    });

    expect(outerStore.getState().focusedId).toBe('star-1');
  });

  it('synchronizes outer store focus inward resolving by slug or name in O(1)', () => {
    localStore.getState().registerEntity({
      id: 'gliese-581',
      name: 'Gliese 581',
      classification: 'star',
      position: [20, 0, 0],
    });

    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      outerStore.getState().setFocused('Gliese 581');
    });

    expect(localStore.getState().focusedId).toBe('gliese-581');
  });

  it('synchronizes outer store hover inward resolving by slug or name in O(1)', () => {
    localStore.getState().registerEntity({
      id: 'hip-71683',
      name: 'Alpha Centauri',
      classification: 'star',
      position: [1.34, 0, 0],
    });
    outerStore.getState().registerEntity({
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      classification: 'star',
      position: [1.34, 0, 0],
    });

    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      outerStore.getState().setHovered('alpha-centauri');
    });

    expect(localStore.getState().hoveredId).toBe('hip-71683');
  });

  it('resolves outerStore selectedIds slugs to canonical local entity IDs when local entities exist beforehand', () => {
    localStore.getState().registerEntity({
      id: 'HYG-10847',
      name: 'Epsilon Eridani',
      classification: 'star',
      position: [3.2, 0, 0],
    });
    outerStore.getState().registerEntity({
      id: 'epsilon-eridani',
      name: 'Epsilon Eridani',
      classification: 'star',
      position: [3.2, 0, 0],
    });

    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      outerStore.getState().setSelectedIds(new Set(['epsilon-eridani']));
    });

    expect(localStore.getState().selectedIds.has('HYG-10847')).toBe(true);
    expect(localStore.getState().selectedIds.has('epsilon-eridani')).toBe(false);
  });

  it('re-resolves outerStore selectedIds asynchronously when local entities register after selection', () => {
    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      outerStore.getState().setSelectedIds(new Set(['epsilon-eridani']));
    });
    expect(localStore.getState().selectedIds.has('epsilon-eridani')).toBe(true);

    act(() => {
      localStore.getState().registerEntity({
        id: 'HYG-10847',
        name: 'Epsilon Eridani',
        classification: 'star',
        position: [3.2, 0, 0],
      });
    });

    expect(localStore.getState().selectedIds.has('HYG-10847')).toBe(true);
    expect(localStore.getState().selectedIds.has('epsilon-eridani')).toBe(false);
  });

  it('preserves multi-selection in outerStore without clobbering when inward slug resolution updates local selectedId', () => {
    localStore.getState().registerEntity({
      id: 'HYG-10847',
      name: 'Epsilon Eridani',
      classification: 'star',
      position: [3.2, 0, 0],
    });
    localStore.getState().registerEntity({
      id: 'HYG-8102',
      name: 'Tau Ceti',
      classification: 'star',
      position: [-3.1, 0, 0],
    });

    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      outerStore.getState().setSelectedIds(new Set(['epsilon-eridani', 'tau-ceti']));
    });

    expect(localStore.getState().selectedIds).toEqual(new Set(['HYG-10847', 'HYG-8102']));
    expect(outerStore.getState().selectedIds).toEqual(new Set(['epsilon-eridani', 'tau-ceti']));
  });

  it('re-resolves outerStore focusedId asynchronously when local entity registers after outer focus', () => {
    renderHook(() =>
      useViewportStoreSync({
        storeApi: localStore,
        outerStore,
      }),
    );

    act(() => {
      outerStore.getState().setFocused('epsilon-eridani');
    });
    expect(localStore.getState().focusedId).toBe('epsilon-eridani');

    act(() => {
      localStore.getState().registerEntity({
        id: 'HYG-10847',
        name: 'Epsilon Eridani',
        classification: 'star',
        position: [3.2, 0, 0],
      });
    });

    expect(localStore.getState().focusedId).toBe('HYG-10847');
  });
});
