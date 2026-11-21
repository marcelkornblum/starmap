import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalaxyViewModel } from './useGalaxyViewModel';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));
import { useRouter } from '@tanstack/react-router';
import { createSpatialEntityStore } from '../components/canvas/entity/SpatialEntityStore';
import { SpatialEntityStoreContext } from '../components/canvas/entity/SpatialEntityContext';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import {
  clearSearchRepositoryCache,
  fetchSearchShard,
} from '../data/searchRepository';

describe('useGalaxyViewModel', () => {
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useUIStore.setState({ detailsDetent: 'collapsed' });
    useCameraStore.setState({
      canvasFocusedSlugs: new Set(),
      pendingCenterSlug: null,
    });
    navigateSpy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useRouter).mockReturnValue({ navigate: navigateSpy } as never);
  });

  afterEach(() => {
    vi.mocked(useRouter).mockReturnValue(undefined as never);
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

  it('preserves root path "/" when router.state.location.pathname is "/" during focus change', async () => {
    vi.mocked(useRouter).mockReturnValue({
      navigate: navigateSpy,
      state: { location: { pathname: '/' } },
    } as never);

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

  it('centres on ?focus= on cold load, but does not force-re-centre when ?focus= changes subsequently without ?center=', async () => {
    const store = createSpatialEntityStore();
    const corpus = [
      { i: 'tau-ceti', n: 'Tau Ceti', p: [3.16, 1.54, -1.0] as [number, number, number] },
      { i: 'sol', n: 'Sol', p: [0, 0, 0] as [number, number, number] },
    ];
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, { search: string }>>;
    await act(async () => {
      hookResult = renderHook(
        ({ search }) =>
          useGalaxyViewModel({
            initialCorpus: corpus,
            locationPathname: '/galaxy',
            locationSearch: search,
          }),
        { wrapper: createWrapper(store), initialProps: { search: '?focus=tau-ceti' } },
      );
    });

    expect(hookResult.result.current.resolvedCenterCoordinates).toEqual([3.16, 1.54, -1.0]);

    await act(async () => {
      hookResult.rerender({ search: '?focus=sol' });
    });

    expect(hookResult.result.current.resolvedCenterCoordinates).toBeUndefined();
  });

  it('does not mutate window.history.replaceState when router.navigate is undefined', async () => {
    vi.mocked(useRouter).mockReturnValue(undefined as never);
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

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

    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(useCameraStore.getState().inFlightFocusSlug).toBeUndefined();
    replaceStateSpy.mockRestore();
  });

  it('prefers cached all corpus over startup corpus when initialCorpus is omitted', async () => {
    clearSearchRepositoryCache();
    const mockFetch = vi.fn(async (url: string) => {
      const d = url.includes('core.json')
        ? [{ i: 'epsilon-indi', n: 'Epsilon Indi', p: [2.5, -1.2, 0.8] }]
        : url.includes('startup.json')
          ? [{ i: 'sol', n: 'Sol', p: [0, 0, 0] }]
          : [];
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          v: 1,
          i: url,
          n: url,
          c: d.length,
          t: '2026-10-17T00:00:00Z',
          d,
        }),
      } as unknown as Response;
    });

    await fetchSearchShard('startup', mockFetch as unknown as typeof fetch);
    await fetchSearchShard('core', mockFetch as unknown as typeof fetch);
    await fetchSearchShard('structures', mockFetch as unknown as typeof fetch);
    await fetchSearchShard('minor-bodies', mockFetch as unknown as typeof fetch);

    const store = createSpatialEntityStore();
    let hookResult!: ReturnType<typeof renderHook<ReturnType<typeof useGalaxyViewModel>, unknown>>;
    await act(async () => {
      hookResult = renderHook(
        () =>
          useGalaxyViewModel({
            locationPathname: '/galaxy',
            locationSearch: '?focus=epsilon-indi',
          }),
        { wrapper: createWrapper(store) },
      );
    });

    expect(hookResult.result.current.resolvedCenterCoordinates).toEqual([2.5, -1.2, 0.8]);
    await act(async () => {
      hookResult.unmount();
      clearSearchRepositoryCache();
    });
  });
});
