import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  getSearchRelevantUrlKey,
  useSearchUrlSyncEffect,
} from './useSearchUrlSyncEffect';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { executeCatalogSearch } from '../../../services/searchService';

describe('useSearchUrlSyncEffect', () => {
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
  });
});
