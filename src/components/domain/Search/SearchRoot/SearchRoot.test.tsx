import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { SearchRoot } from './SearchRoot';
import { SearchPanel } from '../SearchPanel';
import { SearchInput } from '../SearchInput';
import { SearchResults } from '../SearchResults';
import { SEARCH_DEBOUNCE_MS } from '../searchHelpers';
import { SEARCH_FRAMING_SETTLE_MS } from '../../../../utils/searchFraming';
import { SOL_REFERENCE_TARGET } from '../../../../config/referenceTargets';
import {
  consumeSearchFocusForViewTransition,
  markSearchFocusForViewTransition,
  resetSearchFocusContinuity,
} from '../searchFocusContinuity';
import { useCameraStore } from '../../../../stores/useCameraStore';
import { SpatialEntityProvider } from '../../../canvas/entity/SpatialEntityProvider';
import { createSpatialEntityStore } from '../../../canvas/entity/SpatialEntityStore';
import type { CompactSearchEntry } from '../../../../utils/compactDataTypes';
import type { DatasetLayerManifest } from '../../../../types/datasetLayers';
import * as detailsRepo from '../../../../data/detailsRepository';
import * as layerRepo from '../../../../data/layerRepository';

const TEST_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    m: [-26.74, 'G2V', 8, 1],
    h: 1,
    a: 'sol sun',
  },
  {
    i: 'earth',
    n: 'Earth',
    s: 'sol',
    k: 2,
    u: 'terrestrial',
    h: 1,
    a: 'earth terra',
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    m: [3.49, 'G8V', 4, 1],
    h: 1,
    a: 'tau ceti',
  },
];

describe('<SearchRoot />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetSearchFocusContinuity();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders children inside search-root container with focus attributes', () => {
    const store = createSpatialEntityStore();

    render(
      <SpatialEntityProvider store={store}>
        <SearchRoot syncUrl={false} initialCorpus={[]} initialQuery="">
          <input data-testid="dummy-input" />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    const root = screen.getByTestId('search-root');
    expect(root).toBeDefined();
    expect(root.getAttribute('data-search-focused')).toBe('false');

    const input = screen.getByTestId('dummy-input');
    fireEvent.focus(input);
    expect(root.getAttribute('data-search-focused')).toBe('true');
  });

  it('updates input value immediately on onChange in synchronous mode', () => {
    const store = createSpatialEntityStore();
    render(
      <SpatialEntityProvider store={store}>
        <SearchRoot initialCorpus={TEST_CORPUS} syncUrl={false} syncMode={true}>
          <SearchPanel>
            <SearchInput />
          </SearchPanel>
          <SearchResults />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: 'Tau' } });
    expect(input.value).toBe('Tau');
    expect(screen.getByText('Tau Ceti')).toBeInTheDocument();
  });

  it('updates input UI immediately and defers catalog search until 3 characters and the debounce elapse in standard mode', () => {
    vi.useFakeTimers();

    const summarySpy = vi
      .spyOn(detailsRepo, 'fetchSummaryNode')
      .mockResolvedValue(undefined);
    const detailSpy = vi
      .spyOn(detailsRepo, 'fetchDetailRecord')
      .mockResolvedValue(undefined);
    const mockManifest: DatasetLayerManifest = {
      layerId: 'test-layer',
      title: 'Test Layer',
      description: 'Test layer description',
      kind: 'fictional-canon',
      version: 1,
      entries: {},
    };
    vi.spyOn(layerRepo, 'fetchLayerManifest').mockResolvedValue(mockManifest);
    const annotationsSpy = vi
      .spyOn(layerRepo, 'fetchEntityAnnotations')
      .mockResolvedValue([]);

    const store = createSpatialEntityStore();
    render(
      <SpatialEntityProvider store={store}>
        <SearchRoot initialCorpus={TEST_CORPUS} syncUrl={false}>
          <SearchPanel>
            <SearchInput />
          </SearchPanel>
          <SearchResults />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('');

    // Type 2 characters: "Ta"
    fireEvent.change(input, { target: { value: 'Ta' } });

    // 1. Input value must update immediately
    expect(input.value).toBe('Ta');

    // 2. Before deferred timer fires, results should not appear
    expect(screen.queryByText('Tau Ceti')).toBeNull();

    // 3. Advance past debounce: 2 chars < min length 3, so still null
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(screen.queryByText('Tau Ceti')).toBeNull();
    expect(summarySpy).not.toHaveBeenCalled();

    // 4. Type 3rd character: "Tau" (length >= 3)
    fireEvent.change(input, { target: { value: 'Tau' } });
    expect(input.value).toBe('Tau');
    expect(screen.queryByText('Tau Ceti')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText('Tau Ceti')).toBeInTheDocument();
    expect(summarySpy).not.toHaveBeenCalled();
    expect(detailSpy).not.toHaveBeenCalled();
    expect(annotationsSpy).not.toHaveBeenCalled();

    // 5. Clicking clear search clears immediately
    const clearButton = screen.getByTestId('search-clear-button');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
    expect(screen.queryByText('Tau Ceti')).toBeNull();
  });

  it('triggers galactic search framing 600ms after typing settles on a spatial route when syncUrl is true and cancels on result click or clear', () => {
    vi.useFakeTimers();
    useCameraStore.getState().reset();
    const store = createSpatialEntityStore();
    const corpusWithPositions: readonly CompactSearchEntry[] = [
      ...TEST_CORPUS,
      {
        i: 'tau-ceti-alt',
        n: 'Tau Ceti',
        p: [4, 2, -1],
        m: [3.49, 'G8V', 4, 1],
        a: 'tau ceti',
      },
    ];

    render(
      <SpatialEntityProvider store={store}>
        <SearchRoot
          initialCorpus={corpusWithPositions}
          syncUrl={true}
          syncMode={true}
          locationPathname="/galaxy"
          locationSearch=""
        >
          <SearchPanel>
            <SearchInput />
          </SearchPanel>
          <SearchResults />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Tau' } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS - 10);
    });
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();

    // Clicking a result link before 800ms cancels the pending framing timer
    const link = screen.getAllByRole('link')[0];
    fireEvent.click(link);

    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();

    // Typing again and letting 600ms settle triggers requestSearchFrame
    fireEvent.change(input, { target: { value: 'Tau' } });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame).not.toBeNull();
  });

  it('restores pre-search pose on Clear search but discards it when selecting a search result', () => {
    vi.useFakeTimers();
    useCameraStore.getState().reset();
    useCameraStore.getState().setCameraPose({
      position: [5, -8, 16],
      target: [1, 2, 3],
      focalDistance: 15,
    });
    const store = createSpatialEntityStore();
    const corpusWithPositions: readonly CompactSearchEntry[] = [
      ...TEST_CORPUS,
      {
        i: 'tau-ceti-alt',
        n: 'Tau Ceti',
        p: [12, 4, -2],
        m: [3.49, 'G8V', 4, 1],
        a: 'tau ceti',
      },
    ];

    render(
      <SpatialEntityProvider store={store}>
        <SearchRoot
          initialCorpus={corpusWithPositions}
          syncUrl={true}
          syncMode={true}
          locationPathname="/galaxy"
          locationSearch=""
        >
          <SearchPanel>
            <SearchInput />
          </SearchPanel>
          <SearchResults />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Tau' } });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame?.target).toEqual([6, 2, -1]);

    act(() => {
      useCameraStore.getState().clearSearchFrame();
    });

    // Clearing search restores the pre-search pose
    fireEvent.click(screen.getByTestId('search-clear-button'));
    expect(useCameraStore.getState().pendingSearchFrame).toMatchObject({
      target: [1, 2, 3],
      distance: 15,
    });

    // Search again, settle, then click a result link -> pre-search pose must be discarded
    act(() => {
      useCameraStore.getState().clearSearchFrame();
    });
    fireEvent.change(input, { target: { value: 'Tau' } });
    act(() => {
      vi.advanceTimersByTime(SEARCH_FRAMING_SETTLE_MS);
    });
    expect(useCameraStore.getState().pendingSearchFrame?.target).toEqual([6, 2, -1]);

    act(() => {
      useCameraStore.getState().clearSearchFrame();
    });
    const link = screen.getAllByRole('link')[0];
    fireEvent.click(link);
    expect(useCameraStore.getState().pendingSearchFrame).toBeNull();
  });

  it('restores search focus, opens SearchResults, and focuses the query input at end of text when mounted after a cross-scale transition', () => {
    const store = createSpatialEntityStore();
    markSearchFocusForViewTransition();

    const { unmount } = render(
      <SpatialEntityProvider store={store}>
        <SearchRoot
          initialCorpus={TEST_CORPUS}
          syncUrl={true}
          syncMode={true}
          locationPathname={SOL_REFERENCE_TARGET.href}
          locationSearch="?focus=earth&q=Earth"
        >
          <SearchPanel>
            <SearchInput />
          </SearchPanel>
          <SearchResults />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    const root = screen.getByTestId('search-root');
    const resultsPanel = screen.getByTestId('search-results-panel');
    const input = screen.getByRole('searchbox') as HTMLInputElement;

    expect(root.getAttribute('data-search-focused')).toBe('true');
    expect(resultsPanel.getAttribute('data-open')).toBe('true');
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Earth');
    expect(input.selectionStart).toBe('Earth'.length);
    expect(input.selectionEnd).toBe('Earth'.length);
    expect(consumeSearchFocusForViewTransition()).toBe(false);

    unmount();

    // Subsequent mount without a pending transition starts unfocused
    render(
      <SpatialEntityProvider store={store}>
        <SearchRoot
          initialCorpus={TEST_CORPUS}
          syncUrl={true}
          syncMode={true}
          locationPathname="/galaxy"
          locationSearch="?q=Earth"
        >
          <SearchPanel>
            <SearchInput />
          </SearchPanel>
          <SearchResults />
        </SearchRoot>
      </SpatialEntityProvider>,
    );

    expect(screen.getByTestId('search-root').getAttribute('data-search-focused')).toBe('false');
    expect(screen.getByTestId('search-results-panel').getAttribute('data-open')).toBe('false');
  });
});
