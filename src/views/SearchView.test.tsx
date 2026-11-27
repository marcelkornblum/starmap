import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { SearchView } from './SearchView';
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityProvider';
import * as searchRepo from '../data/searchRepository';
import { useLayerStore } from '../stores/useLayerStore';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

describe('<SearchView />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    searchRepo.clearSearchRepositoryCache();
    useLayerStore.setState({ index: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    searchRepo.clearSearchRepositoryCache();
    useLayerStore.setState({ index: [] });
  });

  it('renders search view root, breadcrumbs, and search panel with alwaysOpen results', () => {
    render(
      <SpatialEntityProvider>
        <SearchView />
      </SpatialEntityProvider>,
    );

    const root = screen.getByTestId('search-view-root');
    expect(root).toBeTruthy();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');

    expect(screen.getByTestId('console-dock')).toBeTruthy();
    expect(screen.getByTestId('console-dock-map').getAttribute('data-active')).toBe('true');

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.textContent).toContain('Galaxy');
    expect(breadcrumbs.textContent).toContain('Search');

    const searchRoot = screen.getByTestId('search-root');
    expect(searchRoot).toBeTruthy();

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeTruthy();
  });

  it('hydrates and renders SearchResultItem entries on cold-load /search?q=Sol under StrictMode and async layerIndex loading', async () => {
    const solEntries: readonly CompactSearchEntry[] = [
      { i: 'sol', n: 'Sol', m: [-26.74, 'G2V', 8, 1], h: 1, a: 'sol sun' },
    ];
    let resolveCorpus!: (entries: readonly CompactSearchEntry[]) => void;
    vi.spyOn(searchRepo, 'fetchSearchShard').mockResolvedValue(solEntries);
    vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCorpus = resolve;
        }),
    );

    render(
      <StrictMode>
        <SpatialEntityProvider>
          <SearchView locationPathname="/search" locationSearch="?q=Sol" />
        </SpatialEntityProvider>
      </StrictMode>,
    );

    const searchInput = screen.getByRole('searchbox') as HTMLInputElement;
    expect(searchInput.value).toBe('Sol');

    // Simulate layer index arriving while the search shard fetch is still in flight
    act(() => {
      useLayerStore.setState({
        index: [
          {
            layerId: 'project-hail-mary',
            title: 'Project Hail Mary',
            description: 'Test layer',
            kind: 'fictional-canon',
            entryCount: 1,
            path: 'data/layers/project-hail-mary.json',
          },
        ],
      });
    });

    act(() => {
      resolveCorpus(solEntries);
    });

    await waitFor(() => {
      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems.length).toBeGreaterThan(0);
      expect(resultItems[0]?.textContent).toContain('Sol');
    });
  });
});
