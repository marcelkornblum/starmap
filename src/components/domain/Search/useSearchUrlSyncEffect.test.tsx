import { StrictMode } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';
import {
  getSearchRelevantUrlKey,
  useSearchUrlSyncEffect,
} from './useSearchUrlSyncEffect';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { executeCatalogSearch } from '../../../services/search/searchExecution';
import * as searchRepo from '../../../data/searchRepository';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import type { DatasetLayerIndexEntry } from '../../../types/datasetLayers';

describe('useSearchUrlSyncEffect', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSearchRelevantUrlKey', () => {
    it('creates deterministic key from path and relevant search params', () => {
      const key = getSearchRelevantUrlKey('/galaxy', '?q=Sol&searchCategory=stars&select=layer:phm&unrelated=123');
      expect(key).toBe('/galaxy?q=Sol&cat=stars&select=layer:phm&layer=');
    });

    it('handles empty search parameters gracefully', () => {
      const key = getSearchRelevantUrlKey('/system/sol', '');
      expect(key).toBe('/system/sol?q=&cat=&select=&layer=');
    });
  });

  describe('useSearchUrlSyncEffect hook', () => {
    it('does not crash and sets up URL sync effect correctly', () => {
      const store = createSpatialEntityStore();
      const setQueryState = vi.fn();
      const setFilterState = vi.fn();
      const setStatus = vi.fn();
      const submitSearch = vi.fn().mockResolvedValue(undefined);
      const updateResultsAndSelection = vi.fn();
      const results = executeCatalogSearch([], { query: '', filter: 'all' });

      expect(() => {
        renderHook(() =>
          useSearchUrlSyncEffect({
            activePathname: '/galaxy',
            activeSearch: '',
            syncUrl: false,
            initialQuery: '',
            initialFilter: 'all',
            store,
            layerIndex: [],
            loadedLayers: [],
            results,
            filter: 'all',
            setQueryState,
            setFilterState,
            setStatus,
            submitSearch,
            updateResultsAndSelection,
          }),
        );
      }).not.toThrow();
    });

    it('suppresses duplicate submitSearch when URL update echoes self-written query and filter', () => {
      const store = createSpatialEntityStore();
      const setQueryState = vi.fn();
      const setFilterState = vi.fn();
      const setStatus = vi.fn();
      const submitSearch = vi.fn().mockResolvedValue(undefined);
      const updateResultsAndSelection = vi.fn();
      const results = executeCatalogSearch([], { query: '', filter: 'all' });
      const lastSelfWrittenSearchRef = {
        current: { pathname: '/galaxy', q: 'Tau', cat: 'stars', layer: '' },
      };

      const { rerender } = renderHook(
        ({ activeSearch }: { activeSearch: string }) =>
          useSearchUrlSyncEffect({
            activePathname: '/galaxy',
            activeSearch,
            syncUrl: true,
            initialQuery: '',
            initialFilter: 'all',
            store,
            layerIndex: [],
            loadedLayers: [],
            results,
            filter: 'stars',
            setQueryState,
            setFilterState,
            setStatus,
            submitSearch,
            updateResultsAndSelection,
            lastSelfWrittenSearchRef,
          }),
        { initialProps: { activeSearch: '' } },
      );

      rerender({ activeSearch: '?q=Tau&select=search&searchCategory=stars' });
      expect(submitSearch).not.toHaveBeenCalled();
      expect(setQueryState).not.toHaveBeenCalled();
      expect(setFilterState).not.toHaveBeenCalled();
      expect(lastSelfWrittenSearchRef.current).toBeNull();

      rerender({ activeSearch: '?q=Sirius&select=search' });
      expect(submitSearch).toHaveBeenCalledTimes(1);
      expect(submitSearch).toHaveBeenCalledWith('Sirius', 'all');
    });

    it('re-runs prewarm under StrictMode so cold-load search results still hydrate', async () => {
      const solCorpus: readonly CompactSearchEntry[] = [
        { i: 'sol', n: 'Sol', m: [-26.74, 'G2V', 8, 1], h: 1, a: 'sol sun' },
      ];
      let resolveCorpus!: (entries: readonly CompactSearchEntry[]) => void;
      vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCorpus = resolve;
          }),
      );

      const store = createSpatialEntityStore();
      const setQueryState = vi.fn();
      const setFilterState = vi.fn();
      const setStatus = vi.fn();
      const submitSearch = vi.fn().mockResolvedValue(undefined);
      const updateResultsAndSelection = vi.fn();
      const emptyResults = executeCatalogSearch([], { query: 'Sol', filter: 'all' });

      const Harness = () => {
        useSearchUrlSyncEffect({
          activePathname: '/search',
          activeSearch: '?q=Sol',
          syncUrl: true,
          initialQuery: '',
          initialFilter: 'all',
          store,
          layerIndex: [],
          loadedLayers: [],
          results: emptyResults,
          filter: 'all',
          setQueryState,
          setFilterState,
          setStatus,
          submitSearch,
          updateResultsAndSelection,
        });
        return null;
      };

      render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      );

      resolveCorpus(solCorpus);

      await waitFor(() => {
        expect(updateResultsAndSelection).toHaveBeenCalled();
      });
      const lastCall = updateResultsAndSelection.mock.calls.at(-1)?.[0];
      expect(lastCall?.groups.stars.items.map((item: { id: string }) => item.id)).toContain('sol');
      expect(setStatus).toHaveBeenCalledWith('ready');
    });

    it('refreshes results when layerIndex hydrates mid-flight or after empty-layer prewarm completes', async () => {
      const solCorpus: readonly CompactSearchEntry[] = [
        { i: 'sol', n: 'Sol', m: [-26.74, 'G2V', 8, 1], h: 1, a: 'sol sun' },
      ];
      const hydratedLayerIndex: readonly DatasetLayerIndexEntry[] = [
        {
          layerId: 'project-hail-mary',
          title: 'Project Hail Mary',
          description: 'Test layer',
          kind: 'fictional-canon',
          entryCount: 1,
          path: 'data/layers/project-hail-mary.json',
        },
      ];

      let resolveFirst!: (entries: readonly CompactSearchEntry[]) => void;
      const loadSpy = vi
        .spyOn(searchRepo, 'loadSearchCorpusForFilter')
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockResolvedValue(solCorpus);

      const store = createSpatialEntityStore();
      const setQueryState = vi.fn();
      const setFilterState = vi.fn();
      const setStatus = vi.fn();
      const submitSearch = vi.fn().mockResolvedValue(undefined);
      const updateResultsAndSelection = vi.fn();
      const emptyResults = executeCatalogSearch([], { query: 'Sol', filter: 'all' });

      const { rerender } = renderHook(
        ({ layerIndex }: { layerIndex: readonly DatasetLayerIndexEntry[] }) =>
          useSearchUrlSyncEffect({
            activePathname: '/search',
            activeSearch: '?q=Sol',
            syncUrl: true,
            initialQuery: '',
            initialFilter: 'all',
            store,
            layerIndex,
            loadedLayers: [],
            results: emptyResults,
            filter: 'all',
            setQueryState,
            setFilterState,
            setStatus,
            submitSearch,
            updateResultsAndSelection,
          }),
        { initialProps: { layerIndex: [] as readonly DatasetLayerIndexEntry[] } },
      );

      // Hydrate layerIndex before the first prewarm settles -> cleans up & must re-run
      rerender({ layerIndex: hydratedLayerIndex });
      resolveFirst(solCorpus);

      await waitFor(() => {
        expect(updateResultsAndSelection).toHaveBeenCalled();
      });
      expect(loadSpy).toHaveBeenCalledTimes(2);
      expect(setStatus).toHaveBeenCalledWith('ready');

      // Also verify refresh when prewarm completed while layerIndex was empty and layerIndex hydrates later
      updateResultsAndSelection.mockClear();
      loadSpy.mockClear();
      const { rerender: rerenderAfter } = renderHook(
        ({ layerIndex }: { layerIndex: readonly DatasetLayerIndexEntry[] }) =>
          useSearchUrlSyncEffect({
            activePathname: '/search',
            activeSearch: '?q=Sol',
            syncUrl: true,
            initialQuery: '',
            initialFilter: 'all',
            store,
            layerIndex,
            loadedLayers: [],
            results: emptyResults,
            filter: 'all',
            setQueryState,
            setFilterState,
            setStatus,
            submitSearch,
            updateResultsAndSelection,
          }),
        { initialProps: { layerIndex: [] as readonly DatasetLayerIndexEntry[] } },
      );

      await waitFor(() => {
        expect(updateResultsAndSelection).toHaveBeenCalledTimes(1);
      });

      updateResultsAndSelection.mockClear();
      rerenderAfter({ layerIndex: hydratedLayerIndex });

      await waitFor(() => {
        expect(updateResultsAndSelection).toHaveBeenCalledTimes(1);
      });
    });
  });
});
