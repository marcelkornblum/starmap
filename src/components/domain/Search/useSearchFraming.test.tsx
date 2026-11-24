import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import {
  MIN_SEARCH_FRAMING_DISTANCE_PC,
  SEARCH_FRAMING_SETTLE_MS,
} from '../../../utils/searchFraming';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { AppRouterAdapter } from '../../../hooks/useSpaLocation';
import { searchCatalog } from './searchHelpers';
import {
  getPendingSpatialRouteTarget,
  setPendingSpatialNavigationHref,
} from '../../../utils/spatialRoute';
import { appendSearchParamsToHref } from './searchFramingHelpers';
import {
  useSearchFraming,
  type UseSearchFramingOptions,
} from './useSearchFraming';

const FRAMING_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: SOL_REFERENCE_TARGET.id,
    n: 'Sol',
    m: [-26.74, 'G2V', 8, 1],
    h: 1,
    a: 'sol sun',
  },
  {
    i: 'earth',
    n: 'Earth',
    s: SOL_REFERENCE_TARGET.id,
    k: 2,
    u: 'terrestrial',
    h: 1,
    a: 'earth',
  },
  {
    i: 'kepler-1',
    n: 'Kepler One',
    p: [10, 0, 0],
    m: [11.2, 'G2V', 1],
    a: 'kepler-1',
  },
  {
    i: 'kepler-2',
    n: 'Kepler Two',
    p: [-10, 0, 0],
    m: [11.5, 'G5V', 1],
    a: 'kepler-2',
  },
  {
    i: 'kepler-3',
    n: 'Kepler Three',
    p: [0, 20, 0],
    m: [12.0, 'K1V', 1],
    a: 'kepler-3',
  },
  {
    i: 'kepler-4',
    n: 'Kepler Four',
    p: [0, -20, 0],
    m: [12.1, 'K2V', 1],
    a: 'kepler-4',
  },
];

function createMockRouter(pathname = '/galaxy', searchStr = ''): {
  router: AppRouterAdapter;
  navigate: ReturnType<typeof vi.fn>;
} {
  const navigate = vi.fn();
  const router: AppRouterAdapter = {
    navigate,
    state: {
      location: {
        pathname,
        searchStr,
      },
    },
  };
  return { router, navigate };
}

describe('useSearchFraming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setPendingSpatialNavigationHref(null);
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not arm framing on initial cold mount even when query and status are ready', () => {
    const { router, navigate } = createMockRouter('/galaxy', '?q=Kepler');
    const results = searchCatalog(FRAMING_CORPUS, {
      query: 'Kepler',
      filter: 'all',
      limitPerCategory: 3,
    });

    renderHook(() =>
      useSearchFraming({
        enabled: true,
        activePathname: '/galaxy',
        activeSearch: '?q=Kepler',
        query: 'Kepler',
        filter: 'all',
        status: 'ready',
        results,
        initialCorpus: FRAMING_CORPUS,
        router,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS + 100);
    });

    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('never triggers framing on /search or when enabled is false', () => {
    const { router, navigate } = createMockRouter('/search', '?q=Kepler');
    const results = searchCatalog(FRAMING_CORPUS, {
      query: 'Kepler',
      filter: 'all',
    });

    const { result: searchRouteHook } = renderHook(() =>
      useSearchFraming({
        enabled: true,
        activePathname: '/search',
        activeSearch: '?q=Kepler',
        query: 'Kepler',
        filter: 'all',
        status: 'ready',
        results,
        initialCorpus: FRAMING_CORPUS,
        router,
      }),
    );

    act(() => {
      searchRouteHook.current.markUserSearchActivity();
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS + 50);
    });

    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    const { result: disabledHook } = renderHook(() =>
      useSearchFraming({
        enabled: false,
        activePathname: '/galaxy',
        activeSearch: '',
        query: 'Kepler',
        filter: 'all',
        status: 'ready',
        results,
        initialCorpus: FRAMING_CORPUS,
        router,
      }),
    );

    act(() => {
      disabledHook.current.markUserSearchActivity();
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS + 50);
    });

    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
  });

  it('frames untruncated multi-results after 600ms and respects safeRect from useUIStore', () => {
    expect(SEARCH_FRAMING_SETTLE_MS).toBe(600);
    const { router, navigate } = createMockRouter('/galaxy', '');
    const truncatedResults = searchCatalog(FRAMING_CORPUS, {
      query: 'Kepler',
      filter: 'all',
      limitPerCategory: 2,
    });

    useUIStore.getState().setViewportSafeRect({
      top: 50,
      right: 300,
      bottom: 80,
      left: 300,
      width: 840,
      height: 770,
      bypass: false,
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });

    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Kepler',
      query: 'Kepler',
      filter: 'all',
      status: 'ready',
      results: truncatedResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    // Before 600ms elapses, nothing has fired
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS - 50);
    });
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();

    // At 600ms, framing fires using the displayed/highlighted Kepler stars (radius = 10)
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const frame = useCameraStore.getState().pendingSearchFrame;
    expect(frame).not.toBeNull();
    expect(frame?.target).toEqual([0, 0, 0]);
    // Tight framing around the highlighted matches (radius=10) + safeRect inset, without distant unhighlighted tail
    expect(frame?.distance).toBeGreaterThan(20);
    expect(frame?.distance).toBeLessThan(50);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cancels pending framing timer when query changes again or cancelSearchFraming is called', () => {
    const { router } = createMockRouter('/galaxy', '');
    const results1 = searchCatalog(FRAMING_CORPUS, { query: 'Kepler', filter: 'all' });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Kepler',
      query: 'Kepler',
      filter: 'all',
      status: 'ready',
      results: results1,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(500);
      result.current.cancelSearchFraming();
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
  });

  it('navigates into Solar System on single Solar System planet match unless already on that target', () => {
    const { router, navigate } = createMockRouter('/galaxy', '');
    const earthResults = searchCatalog(FRAMING_CORPUS, {
      query: 'Earth',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Earth',
      query: 'Earth',
      filter: 'all',
      status: 'ready',
      results: earthResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({
      href: `${SOL_REFERENCE_TARGET.href}?focus=earth&q=Earth`,
    });
    expect(useCameraStore.getState().consumeSearchFocusForViewTransition()).toBe(true);
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();

    // When already on /system/sol?focus=earth, do not redundantly navigate
    navigate.mockClear();
    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: SOL_REFERENCE_TARGET.href,
      activeSearch: '?focus=earth&q=Earth',
      query: 'Earth',
      filter: 'all',
      status: 'ready',
      results: earthResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('requests search frame and navigates back to /galaxy preserving q and searchCategory when framing from /system/... or /planet/...', () => {
    const { router, navigate } = createMockRouter(SOL_REFERENCE_TARGET.href, '?focus=earth');
    const keplerResults = searchCatalog(FRAMING_CORPUS, {
      query: 'Kepler',
      filter: 'stars',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: SOL_REFERENCE_TARGET.href,
          activeSearch: '?focus=earth',
          query: '',
          filter: 'stars',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'stars' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: SOL_REFERENCE_TARGET.href,
      activeSearch: '?focus=earth&q=Kepler&searchCategory=stars',
      query: 'Kepler',
      filter: 'stars',
      status: 'ready',
      results: keplerResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    expect(useCameraStore.getState().pendingSearchFrame).not.toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({
      href: '/galaxy?q=Kepler&searchCategory=stars',
    });
    expect(useCameraStore.getState().consumeSearchFocusForViewTransition()).toBe(true);
  });

  it('restores pre-search camera pose via requestSearchFrame when search is cleared after framing', () => {
    const { router } = createMockRouter('/galaxy', '');
    useCameraStore.getState().setCameraPose({
      position: [12, -10, 20],
      target: [2, -3, 4],
      focalDistance: 23,
    });

    const keplerResults = searchCatalog(FRAMING_CORPUS, {
      query: 'Kepler',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Kepler',
      query: 'Kepler',
      filter: 'all',
      status: 'ready',
      results: keplerResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame?.target).toEqual([0, 0, 0]);

    // Simulate camera controller consuming the search frame and moving away
    act(() => {
      useCameraStore.getState().clearSearchFrame();
      useCameraStore.getState().setCameraPose({
        position: [0, 0, 60],
        target: [0, 0, 0],
        focalDistance: 60,
      });
    });

    // Clear the search query
    act(() => {
      result.current.cancelSearchFraming();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '',
      query: '',
      filter: 'all',
      status: 'idle',
      results: searchCatalog([], { query: '', filter: 'all' }),
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    const restoredFrame = useCameraStore.getState().pendingSearchFrame;
    expect(restoredFrame).not.toBeNull();
    expect(restoredFrame?.target).toEqual([2, -3, 4]);
    expect(restoredFrame?.distance).toBe(23);

    // Subsequent re-render with empty query does not re-dispatch
    act(() => {
      useCameraStore.getState().clearSearchFrame();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '',
      query: '',
      filter: 'all',
      status: 'idle',
      results: searchCatalog([], { query: '', filter: 'all' }),
      initialCorpus: FRAMING_CORPUS,
      router,
    });
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
  });

  it('clamps restored pre-search distance to MIN_SEARCH_FRAMING_DISTANCE_PC', () => {
    const { router } = createMockRouter('/galaxy', '');
    useCameraStore.getState().setCameraPose({
      position: [1, 1, 3],
      target: [1, 1, 0],
      focalDistance: 3,
    });

    const keplerResults = searchCatalog(FRAMING_CORPUS, {
      query: 'Kepler',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Kepler',
      query: 'Kepler',
      filter: 'all',
      status: 'ready',
      results: keplerResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
      useCameraStore.getState().clearSearchFrame();
      result.current.cancelSearchFraming();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '',
      query: '',
      filter: 'all',
      status: 'idle',
      results: searchCatalog([], { query: '', filter: 'all' }),
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    expect(useCameraStore.getState().pendingSearchFrame?.distance).toBe(
      MIN_SEARCH_FRAMING_DISTANCE_PC,
    );
  });

  it('discards saved pre-search pose when discardPreSearchPose is called on result selection', () => {
    const { router } = createMockRouter('/galaxy', '');
    useCameraStore.getState().setCameraPose({
      position: [12, -10, 20],
      target: [2, -3, 4],
      focalDistance: 23,
    });

    const keplerResults = searchCatalog(FRAMING_CORPUS, {
      query: 'Kepler',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Kepler',
      query: 'Kepler',
      filter: 'all',
      status: 'ready',
      results: keplerResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
      useCameraStore.getState().clearSearchFrame();
      result.current.cancelSearchFraming();
      result.current.discardPreSearchPose();
    });

    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '',
      query: '',
      filter: 'all',
      status: 'idle',
      results: searchCatalog([], { query: '', filter: 'all' }),
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
  });

  it('appendSearchParamsToHref preserves q and searchCategory without clobbering existing params', () => {
    expect(appendSearchParamsToHref('/system/sol?focus=earth', 'Earth', 'all')).toBe(
      '/system/sol?focus=earth&q=Earth',
    );
    expect(
      appendSearchParamsToHref('/system/sol?layer=canon-x', '  titan  ', 'planets'),
    ).toBe('/system/sol?layer=canon-x&q=titan&searchCategory=planets');
    expect(appendSearchParamsToHref('/system/sol?focus=earth', '   ', 'all')).toBe(
      '/system/sol?focus=earth',
    );
    expect(appendSearchParamsToHref('/galaxy', 'Kepler', 'stars')).toBe(
      '/galaxy?q=Kepler&searchCategory=stars',
    );
  });

  it('navigates to /system/sol root with preserved query and marks focus continuity on multi-match Solar System query', () => {
    const multiSolCorpus: readonly CompactSearchEntry[] = [
      ...FRAMING_CORPUS,
      {
        i: 'titan',
        n: 'Titan',
        s: SOL_REFERENCE_TARGET.id,
        k: 3,
        u: 'terrestrial',
        h: 1,
        a: 'titan',
      },
      {
        i: 'titania',
        n: 'Titania',
        s: SOL_REFERENCE_TARGET.id,
        k: 3,
        u: 'terrestrial',
        h: 1,
        a: 'titania',
      },
    ];
    const { router, navigate } = createMockRouter('/galaxy', '');
    const titanResults = searchCatalog(multiSolCorpus, {
      query: 'titan',
      filter: 'planets',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'planets',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'planets' }),
          initialCorpus: multiSolCorpus,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=titan&searchCategory=planets',
      query: 'titan',
      filter: 'planets',
      status: 'ready',
      results: titanResults,
      initialCorpus: multiSolCorpus,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({
      href: `${SOL_REFERENCE_TARGET.href}?q=titan&searchCategory=planets`,
    });
    expect(useCameraStore.getState().consumeSearchFocusForViewTransition()).toBe(true);
  });

  it('skips redundant requestSearchFrame when typing extra characters yields identical framed bounds (epsi -> epsil)', () => {
    const epsiCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'epsilon-alpha',
        n: 'Epsilon Alpha',
        p: [4, 2, -1],
        m: [3.5, 'K2V', 1],
        a: 'epsilon alpha',
      },
      {
        i: 'epsilon-beta',
        n: 'Epsilon Beta',
        p: [-4, 2, -1],
        m: [4.2, 'K5V', 1],
        a: 'epsilon beta',
      },
    ];
    const { router } = createMockRouter('/galaxy', '');
    const epsiResults = searchCatalog(epsiCorpus, {
      query: 'epsi',
      filter: 'all',
    });
    const epsilResults = searchCatalog(epsiCorpus, {
      query: 'epsil',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: epsiCorpus,
          router,
        } as UseSearchFramingOptions,
      },
    );

    // 1. Type "epsi" and settle -> frames once
    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=epsi',
      query: 'epsi',
      filter: 'all',
      status: 'ready',
      results: epsiResults,
      initialCorpus: epsiCorpus,
      router,
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame).not.toBeNull();

    // Clear store flag (simulating camera controller starting glide)
    act(() => {
      useCameraStore.getState().clearSearchFrame();
    });

    // 2. Type "epsil" (same matches, identical bounds) and settle -> skips redundant glide
    act(() => {
      result.current.cancelSearchFraming();
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=epsil',
      query: 'epsil',
      filter: 'all',
      status: 'ready',
      results: epsilResults,
      initialCorpus: epsiCorpus,
      router,
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();

    // 3. Clearing search restores pre-search pose and resets lastFramedBoundsRef so a new search frames again
    act(() => {
      result.current.cancelSearchFraming();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '',
      query: '',
      filter: 'all',
      status: 'idle',
      results: searchCatalog([], { query: '', filter: 'all' }),
      initialCorpus: epsiCorpus,
      router,
    });
    expect(useCameraStore.getState().pendingSearchFrame).not.toBeNull();

    act(() => {
      useCameraStore.getState().clearSearchFrame();
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=epsi',
      query: 'epsi',
      filter: 'all',
      status: 'ready',
      results: epsiResults,
      initialCorpus: epsiCorpus,
      router,
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame).not.toBeNull();
  });

  it('preserves preSearchOrigin across view unmount/remount and returns to saved pathname and camera pose when search is cleared', () => {
    const multiSolCorpus: readonly CompactSearchEntry[] = [
      ...FRAMING_CORPUS,
      {
        i: 'titan',
        n: 'Titan',
        s: SOL_REFERENCE_TARGET.id,
        o: 'saturn',
        k: 3,
        u: 'terrestrial',
        h: 1,
        a: 'titan',
      },
      {
        i: 'titania',
        n: 'Titania',
        s: SOL_REFERENCE_TARGET.id,
        o: 'uranus',
        k: 3,
        u: 'terrestrial',
        h: 1,
        a: 'titania',
      },
    ];
    const { router: galaxyRouter, navigate: galaxyNavigate } = createMockRouter('/galaxy', '');
    useCameraStore.getState().setCameraPose({
      position: [5, -2, 45],
      target: [5, -2, 3],
      focalDistance: 42,
    });

    const titanResults = searchCatalog(multiSolCorpus, {
      query: 'titan',
      filter: 'all',
    });

    const galaxyHook = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: multiSolCorpus,
          router: galaxyRouter,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      galaxyHook.result.current.markUserSearchActivity();
    });
    galaxyHook.rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=titan',
      query: 'titan',
      filter: 'all',
      status: 'ready',
      results: titanResults,
      initialCorpus: multiSolCorpus,
      router: galaxyRouter,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    expect(galaxyNavigate).toHaveBeenCalledWith({
      href: `${SOL_REFERENCE_TARGET.href}?q=titan`,
    });
    expect(useCameraStore.getState().preSearchOrigin).toEqual({
      pathname: '/galaxy',
      search: '?q=titan',
      target: [5, -2, 3],
      distance: 42,
    });

    // Unmount Galaxy SearchRoot and mount System SearchRoot (cross-scale transition)
    galaxyHook.unmount();
    useCameraStore.getState().clearSearchFrame();
    setPendingSpatialNavigationHref(null);

    const { router: solRouter, navigate: solNavigate } = createMockRouter(
      SOL_REFERENCE_TARGET.href,
      '?q=titan',
    );
    const solHook = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: SOL_REFERENCE_TARGET.href,
          activeSearch: '?q=titan',
          query: 'titan',
          filter: 'all',
          status: 'ready',
          results: titanResults,
          initialCorpus: multiSolCorpus,
          router: solRouter,
        } as UseSearchFramingOptions,
      },
    );

    // Clear search in /system/sol -> must restore saved preSearchOrigin target/distance and navigate back to /galaxy
    solHook.rerender({
      enabled: true,
      activePathname: SOL_REFERENCE_TARGET.href,
      activeSearch: '',
      query: '',
      filter: 'all',
      status: 'idle',
      results: searchCatalog([], { query: '', filter: 'all' }),
      initialCorpus: multiSolCorpus,
      router: solRouter,
    });

    expect(useCameraStore.getState().preSearchOrigin).toBeNull();
    expect(useCameraStore.getState().pendingSearchFrame).toMatchObject({
      target: [5, -2, 3],
      distance: 42,
    });
    expect(getPendingSpatialRouteTarget()).toEqual({ scope: 'galaxy' });
    expect(solNavigate).toHaveBeenCalledWith({ href: '/galaxy' });

    act(() => {
      useCameraStore.getState().clearSearchFrame();
      setPendingSpatialNavigationHref(null);
      solHook.result.current.markUserSearchActivity();
    });
    solHook.rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=titan',
      query: 'titan',
      filter: 'all',
      status: 'ready',
      results: titanResults,
      initialCorpus: multiSolCorpus,
      router: galaxyRouter,
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().preSearchOrigin).not.toBeNull();

    act(() => {
      solHook.result.current.discardPreSearchPose();
      useCameraStore.getState().clearSearchFrame();
    });
    expect(useCameraStore.getState().preSearchOrigin).toBeNull();
    solNavigate.mockClear();
    solHook.rerender({
      enabled: true,
      activePathname: SOL_REFERENCE_TARGET.href,
      activeSearch: '',
      query: '',
      filter: 'all',
      status: 'idle',
      results: searchCatalog([], { query: '', filter: 'all' }),
      initialCorpus: multiSolCorpus,
      router: solRouter,
    });
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
    expect(solNavigate).not.toHaveBeenCalled();
  });

  it('calls focusFromSearch without marking view transition when enter-scale targets the same view pathname', () => {
    const saturnCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'titan',
        n: 'Titan',
        s: 'sol',
        o: 'saturn',
        k: 3,
        u: 'terrestrial',
        h: 1,
        a: 'titan',
      },
    ];
    const { router, navigate } = createMockRouter('/planet/saturn', '');
    const titanResults = searchCatalog(saturnCorpus, {
      query: 'titan',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/planet/saturn',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: saturnCorpus,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/planet/saturn',
      activeSearch: '?q=titan',
      query: 'titan',
      filter: 'all',
      status: 'ready',
      results: titanResults,
      initialCorpus: saturnCorpus,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    expect(navigate).toHaveBeenCalledWith({
      href: '/planet/saturn?focus=titan&q=titan',
    });
    expect(useCameraStore.getState().pendingViewTransitionFocus).toBe(false);
    expect(useCameraStore.getState().pendingCenterSlug).toBe('titan');
    expect(useCameraStore.getState().recenterTick).toBe(1);
  });

  it('clears pendingSpatialNavigationHref in finally when router.navigate rejects', async () => {
    const navigate = vi.fn().mockRejectedValue(new Error('Aborted'));
    const router: AppRouterAdapter = {
      navigate,
      state: { location: { pathname: '/galaxy', searchStr: '' } },
    };
    const earthResults = searchCatalog(FRAMING_CORPUS, {
      query: 'Earth',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: FRAMING_CORPUS,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Earth',
      query: 'Earth',
      filter: 'all',
      status: 'ready',
      results: earthResults,
      initialCorpus: FRAMING_CORPUS,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    expect(getPendingSpatialRouteTarget()).toEqual({ scope: 'system', targetId: 'sol' });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getPendingSpatialRouteTarget()).toBeNull();
  });

  it('clamps search framing distance using computeCeilingMaxCameraDistancePc hardware budget without dense-volume choke', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 16 });
    vi.stubGlobal('innerWidth', 1440);
    vi.stubGlobal('innerHeight', 900);

    // Distant >100 pc cluster: centroid at [200, 0, 0], radius = 80 pc -> framed using hardware ceiling
    const distantCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'distant-1',
        n: 'Distant One',
        p: [120, 0, 0],
        m: [8.0, 'G2V', 1],
        a: 'distant one',
      },
      {
        i: 'distant-2',
        n: 'Distant Two',
        p: [280, 0, 0],
        m: [8.2, 'G5V', 1],
        a: 'distant two',
      },
    ];
    const { router } = createMockRouter('/galaxy', '');
    const distantResults = searchCatalog(distantCorpus, {
      query: 'Distant',
      filter: 'all',
    });

    const { result, rerender } = renderHook(
      (props: UseSearchFramingOptions) => useSearchFraming(props),
      {
        initialProps: {
          enabled: true,
          activePathname: '/galaxy',
          activeSearch: '',
          query: '',
          filter: 'all',
          status: 'idle',
          results: searchCatalog([], { query: '', filter: 'all' }),
          initialCorpus: distantCorpus,
          router,
        } as UseSearchFramingOptions,
      },
    );

    act(() => {
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Distant',
      query: 'Distant',
      filter: 'all',
      status: 'ready',
      results: distantResults,
      initialCorpus: distantCorpus,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    const frame = useCameraStore.getState().pendingSearchFrame;
    expect(frame).not.toBeNull();
    expect(frame?.target).toEqual([200, 0, 0]);
    expect(frame?.distance).toBeGreaterThan(100);

    // Inside-100 pc wide cluster: centroid at [50, 0, 0], radius = 30 pc -> NOT choked to ~53 pc dense ceiling
    const denseCorpus: readonly CompactSearchEntry[] = [
      {
        i: 'dense-1',
        n: 'Dense One',
        p: [20, 0, 0],
        m: [8.0, 'G2V', 1],
        a: 'dense one',
      },
      {
        i: 'dense-2',
        n: 'Dense Two',
        p: [80, 0, 0],
        m: [8.2, 'G5V', 1],
        a: 'dense two',
      },
    ];
    const denseResults = searchCatalog(denseCorpus, {
      query: 'Dense',
      filter: 'all',
    });

    act(() => {
      useCameraStore.getState().clearSearchFrame();
      result.current.cancelSearchFraming();
      result.current.markUserSearchActivity();
    });
    rerender({
      enabled: true,
      activePathname: '/galaxy',
      activeSearch: '?q=Dense',
      query: 'Dense',
      filter: 'all',
      status: 'ready',
      results: denseResults,
      initialCorpus: denseCorpus,
      router,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });

    const denseFrame = useCameraStore.getState().pendingSearchFrame;
    expect(denseFrame).not.toBeNull();
    expect(denseFrame?.target).toEqual([50, 0, 0]);
    expect(denseFrame?.distance).toBeGreaterThan(60);
  });
});
