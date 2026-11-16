import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalaxyViewModel } from './useGalaxyViewModel';
import { createSpatialEntityStore } from '../components/canvas/entity/SpatialEntityStore';
import { SpatialEntityStoreContext } from '../components/canvas/entity/SpatialEntityContext';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import { registerAppRouter } from '../hooks/useSpaLocation';

describe('useGalaxyViewModel', () => {
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useUIStore.setState({ detailsDetent: 'collapsed' });
    useCameraStore.setState({
      canvasFocusedSlugs: new Set(),
      pendingCenterSlug: null,
    });
    navigateSpy = vi.fn().mockResolvedValue(undefined);
    registerAppRouter({ navigate: navigateSpy });
  });

  afterEach(() => {
    registerAppRouter(null);
  });

  const createWrapper = (store: ReturnType<typeof createSpatialEntityStore>) => {
    return ({ children }: { children: React.ReactNode }) => (
      <SpatialEntityStoreContext.Provider value={store}>
        {children}
      </SpatialEntityStoreContext.Provider>
    );
  };

  it('initializes galaxy view model with defaults and handles hover', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useGalaxyViewModel({
            locationPathname: '/galaxy',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.pathname).toBe('/galaxy');
    expect(hookResult.result.current.search).toBe('');
    expect(hookResult.result.current.focusedDetails).toBeNull();
    expect(hookResult.result.current.activeJourney).toBeNull();

    act(() => {
      hookResult.result.current.handleHoverEntity('star-1');
    });

    expect(store.getState().hoveredId).toBe('star-1');
  });

  it('handles focus change with canvas focus recording, UI detent elevation, and navigation', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useGalaxyViewModel({
            locationPathname: '/galaxy',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    await act(async () => {
      hookResult.result.current.handleFocusChange('sol');
    });

    expect(useCameraStore.getState().canvasFocusedSlugs.has('sol')).toBe(true);
    expect(useUIStore.getState().detailsDetent).toBe('peek');
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/galaxy',
      }),
    );
  });

  it('handles focus clearance by navigating to remove focus', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useGalaxyViewModel({
            locationPathname: '/galaxy',
            locationSearch: '?focus=sol',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    await act(async () => {
      hookResult.result.current.handleFocusChange(null);
    });

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/galaxy',
      }),
    );
  });

  it('does not select entities when ?layer=<slug> alone is present without select=', async () => {
    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useGalaxyViewModel({
            locationPathname: '/galaxy',
            locationSearch: '?layer=project-hail-mary',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.canvasEntities).toEqual([]);
    expect(store.getState().selectedIds.size).toBe(0);
  });

  it('preserves root path "/" when appRouter.state.location.pathname is "/" during focus change', async () => {
    registerAppRouter({
      navigate: navigateSpy,
      state: { location: { pathname: '/' } },
    });

    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useGalaxyViewModel({
            locationPathname: '/',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    await act(async () => {
      hookResult.result.current.handleFocusChange('sol');
    });

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/',
      }),
    );
  });

  it('updates window.history.replaceState and dispatches starmap:locationchange when appRouter.navigate is undefined', async () => {
    registerAppRouter(null);
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useGalaxyViewModel({
            locationPathname: '/galaxy',
            locationSearch: '',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    await act(async () => {
      hookResult.result.current.handleFocusChange('sol');
    });

    expect(replaceStateSpy).toHaveBeenCalledWith(
      window.history.state,
      '',
      expect.stringContaining('focus=sol'),
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'starmap:locationchange' }),
    );
    expect(useCameraStore.getState().inFlightFocusSlug).toBeUndefined();
  });
});
