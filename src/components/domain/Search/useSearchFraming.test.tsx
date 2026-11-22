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
import { useSearchFraming, type UseSearchFramingOptions } from './useSearchFraming';

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
      href: `${SOL_REFERENCE_TARGET.href}?focus=earth`,
    });
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
});
