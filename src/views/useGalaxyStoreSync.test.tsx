import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { useGalaxyStoreSync, type UseGalaxyStoreSyncParams } from './useGalaxyStoreSync';
import { createSpatialEntityStore } from '../components/canvas/entity/SpatialEntityStore';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';

describe('useGalaxyStoreSync', () => {
  beforeEach(() => {
    useUIStore.setState({ detailsDetent: 'collapsed' });
    useCameraStore.setState({ lastGalaxySearch: '' });
  });

  const createParams = (storeApi: ReturnType<typeof createSpatialEntityStore>): UseGalaxyStoreSyncParams => ({
    storeApi,
    urlFocusSlug: null,
    hasExplicitFocus: false,
    focusedEntity: null,
    urlSelectedEntities: [],
    hasExplicitSelection: false,
    apertureIds: new Set(),
    liveApertureRadius: null,
    pathname: '/galaxy',
    search: '?search=test',
    isExplicitLocation: false,
  });

  it('syncs lastGalaxySearch to cameraStore when on /galaxy pathname', () => {
    const store = createSpatialEntityStore();
    renderHook(() => useGalaxyStoreSync(createParams(store)));

    expect(useCameraStore.getState().lastGalaxySearch).toBe('?search=test');
  });

  it('registers focusedEntity in store and elevates detailsDetent from collapsed to peek', () => {
    const store = createSpatialEntityStore();
    const entity = {
      id: 'sirius',
      name: 'Sirius',
      classification: 'star' as const,
      position: [8.6, 0, 0] as [number, number, number],
    };

    renderHook(() =>
      useGalaxyStoreSync({
        ...createParams(store),
        urlFocusSlug: 'sirius',
        hasExplicitFocus: true,
        focusedEntity: entity,
      }),
    );

    expect(store.getState().entities['sirius']).toEqual(entity);
    expect(store.getState().focusedId).toBe('sirius');
    expect(useUIStore.getState().detailsDetent).toBe('peek');
  });

  it('sets focusedId directly to urlFocusSlug when focusedEntity definition is missing', () => {
    const store = createSpatialEntityStore();

    renderHook(() =>
      useGalaxyStoreSync({
        ...createParams(store),
        urlFocusSlug: 'unregistered-target',
        hasExplicitFocus: true,
        focusedEntity: null,
      }),
    );

    expect(store.getState().focusedId).toBe('unregistered-target');
  });

  it('clears focus when transition from focused to null focus occurs', () => {
    const store = createSpatialEntityStore({ focusedId: 'initial-target' });

    const { rerender } = renderHook<void, UseGalaxyStoreSyncParams>(
      (props) => useGalaxyStoreSync(props),
      {
        initialProps: {
          ...createParams(store),
          urlFocusSlug: 'initial-target',
          hasExplicitFocus: true,
        },
      },
    );

    expect(store.getState().focusedId).toBe('initial-target');

    act(() => {
      rerender({
        ...createParams(store),
        urlFocusSlug: null,
        hasExplicitFocus: false,
      });
    });

    expect(store.getState().focusedId).toBeNull();
  });

  it('does NOT call setFocused during render execution, and clears focusedId to null in effect when isExplicitLocation is true without focus slug', () => {
    const store = createSpatialEntityStore({ focusedId: 'lingering-focus' });
    let focusedDuringRender: string | null = 'not-called';
    const originalSetFocused = store.getState().setFocused;
    const setFocusedSpy = vi.fn((id: string | null) => {
      originalSetFocused(id);
    });
    store.setState({ setFocused: setFocusedSpy });

    function TestComponent() {
      useGalaxyStoreSync({
        ...createParams(store),
        isExplicitLocation: true,
        urlFocusSlug: null,
        hasExplicitFocus: false,
      });
      focusedDuringRender = store.getState().focusedId;
      expect(setFocusedSpy).not.toHaveBeenCalled();
      return null;
    }

    render(<TestComponent />);

    expect(focusedDuringRender).toBe('lingering-focus');
    expect(setFocusedSpy).toHaveBeenCalledWith(null);
    expect(store.getState().focusedId).toBeNull();
  });

  it('syncs selected IDs to store when urlSelectedEntities are provided', () => {
    const store = createSpatialEntityStore();
    const selected = [
      { id: 'alpha', name: 'Alpha', type: 'star' as const, position: [1, 1, 1] as [number, number, number] },
      { id: 'beta', name: 'Beta', type: 'star' as const, position: [2, 2, 2] as [number, number, number] },
    ];

    renderHook(() =>
      useGalaxyStoreSync({
        ...createParams(store),
        urlSelectedEntities: selected,
        hasExplicitSelection: true,
      }),
    );

    expect(store.getState().selectedIds.has('alpha')).toBe(true);
    expect(store.getState().selectedIds.has('beta')).toBe(true);
  });

  it('syncs apertureIds when liveApertureRadius is null', () => {
    const store = createSpatialEntityStore();
    const apertureIds = new Set(['entity-1', 'entity-2']);

    renderHook(() =>
      useGalaxyStoreSync({
        ...createParams(store),
        apertureIds,
        liveApertureRadius: null,
      }),
    );

    expect(store.getState().apertureIds).toEqual(apertureIds);
  });

  it('preserves pendingCenterSlug across URL sync for GalacticCameraController, and clears it when focus clears from truthy to null', () => {
    const store = createSpatialEntityStore();
    useCameraStore.setState({ pendingCenterSlug: 'sirius' });

    const { rerender } = renderHook<void, UseGalaxyStoreSyncParams>(
      (props) => useGalaxyStoreSync(props),
      {
        initialProps: {
          ...createParams(store),
          actualUrlFocusSlug: null,
        },
      },
    );

    expect(useCameraStore.getState().pendingCenterSlug).toBe('sirius');

    act(() => {
      rerender({
        ...createParams(store),
        actualUrlFocusSlug: 'sirius',
      });
    });
    expect(useCameraStore.getState().pendingCenterSlug).toBe('sirius');

    act(() => {
      rerender({
        ...createParams(store),
        actualUrlFocusSlug: null,
      });
    });
    expect(useCameraStore.getState().pendingCenterSlug).toBeNull();
  });
});
