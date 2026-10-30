// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { Search } from '../src/components/search';
import { SEARCH_DEBOUNCE_MS } from '../src/components/search/Search';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';
import * as detailsRepo from '../src/data/detailsRepository';
import * as layerRepo from '../src/data/layerRepository';

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

describe('SearchInput Immediate Update & Deferred Search Execution', () => {
  let originalUserAgent: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalUserAgent = Object.getOwnPropertyDescriptor(
      window.navigator,
      'userAgent',
    );
  });

  afterEach(() => {
    if (originalUserAgent) {
      Object.defineProperty(window.navigator, 'userAgent', originalUserAgent);
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('updates input value immediately on onChange in synchronous JSDOM environment', () => {
    const store = createSpatialEntityStore();
    render(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(
          Search.Root,
          {
            initialCorpus: TEST_CORPUS,
            syncUrl: false,
          },
          createElement(Search.Panel, null, createElement(Search.Input)),
          createElement(Search.Results),
        ),
      ),
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: 'Tau' } });
    expect(input.value).toBe('Tau');
    expect(screen.getByText('Tau Ceti')).toBeDefined();
  });

  it('updates input UI immediately and defers catalog search until 3 characters and the debounce elapse in browser mode', () => {
    // Simulate real browser environment (non-JSDOM user agent)
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
      writable: true,
    });

    vi.useFakeTimers();

    const summarySpy = vi
      .spyOn(detailsRepo, 'fetchSummaryNode')
      .mockImplementation(() => Promise.resolve(undefined));
    const detailSpy = vi
      .spyOn(detailsRepo, 'fetchDetailRecord')
      .mockImplementation(() => Promise.resolve(undefined));
    vi.spyOn(layerRepo, 'fetchLayerManifest').mockImplementation(() =>
      Promise.resolve({} as any),
    );
    const annotationsSpy = vi
      .spyOn(layerRepo, 'fetchEntityAnnotations')
      .mockImplementation(() => Promise.resolve([]));

    const store = createSpatialEntityStore();
    render(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(
          Search.Root,
          {
            initialCorpus: TEST_CORPUS,
            syncUrl: false,
          },
          createElement(Search.Panel, null, createElement(Search.Input)),
          createElement(Search.Results),
        ),
      ),
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('');

    // Type 2 characters: "Ta"
    fireEvent.change(input, { target: { value: 'Ta' } });

    // 1. Input value must update and paint immediately on current frame
    expect(input.value).toBe('Ta');

    // 2. Before deferred timer fires (0ms), results should not have updated yet
    expect(screen.queryByText('Tau Ceti')).toBeNull();

    // 3. Advance past the debounce: a 2-character query is below the minimum, so nothing is searched
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(screen.queryByText('Tau Ceti')).toBeNull();
    expect(summarySpy).not.toHaveBeenCalled();

    // 4. Type 3rd character: "Tau" (length >= 3)
    fireEvent.change(input, { target: { value: 'Tau' } });
    expect(input.value).toBe('Tau');

    // Still deferred: results must not appear before the debounce elapses
    expect(screen.queryByText('Tau Ceti')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText('Tau Ceti')).toBeDefined();
    // Prefetch must now be lazily triggered for Tau Ceti
    expect(summarySpy).toHaveBeenCalledWith('tau-ceti');
    expect(detailSpy).toHaveBeenCalledWith('tau-ceti');
    expect(annotationsSpy).toHaveBeenCalledWith(
      expect.arrayContaining(['tau-ceti']),
    );

    // 5. Clicking "Clear search" must execute immediately without deferral
    const clearButton = screen.getByTestId('search-clear-button');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
    expect(screen.queryByText('Tau Ceti')).toBeNull();
  });
});
