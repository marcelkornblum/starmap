import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { SearchRoot } from './SearchRoot';
import { SearchPanel } from '../SearchPanel';
import { SearchInput } from '../SearchInput';
import { SearchResults } from '../SearchResults';
import { SEARCH_DEBOUNCE_MS } from '../searchHelpers';
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
});
