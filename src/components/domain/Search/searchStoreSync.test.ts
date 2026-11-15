import { describe, expect, it } from 'vitest';
import {
  syncSelectedSystemsToStore,
  syncUrlFocusToStore,
} from './searchStoreSync';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { executeCatalogSearch } from '../../../services/search/searchExecution';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import type { DatasetLayerIndexEntry, DatasetLayerManifest } from '../../../types/datasetLayers';

const TEST_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    k: 1,
    m: [-26.74, 'G2V', 8, 1],
    p: [0, 0, 0],
    h: 1,
  },
  {
    i: 'earth',
    n: 'Earth',
    s: 'sol',
    k: 2,
    u: 'terrestrial',
    p: [0, 0, 0],
    h: 1,
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    k: 1,
    m: [3.49, 'G8V', 4, 1],
    p: [-3.1, -0.4, -2.0],
  },
  {
    i: 'tau-ceti-e',
    n: 'Tau Ceti e',
    s: 'tau-ceti',
    k: 2,
    u: 'super-earth',
    p: [-3.1, -0.4, -2.0],
  },
];

const LAYER_INDEX: readonly DatasetLayerIndexEntry[] = [
  {
    layerId: 'canon-project-hail-mary',
    title: 'Project Hail Mary',
    description: 'Project Hail Mary canon layer',
    kind: 'fictional-canon',
    entryCount: 1,
    path: 'data/layers/canon-project-hail-mary.json',
  },
];

const LOADED_LAYERS: readonly DatasetLayerManifest[] = [
  {
    layerId: 'canon-project-hail-mary',
    title: 'Project Hail Mary',
    description: 'Project Hail Mary canon layer',
    kind: 'fictional-canon',
    version: 1,
    entries: {
      'tau-ceti': {
        targetId: 'tau-ceti',
        targetType: 'system',
        systemId: 'tau-ceti',
        text: 'Tau Ceti canon entry',
      },
    },
  },
];

describe('searchStoreSync', () => {
  describe('syncSelectedSystemsToStore', () => {
    it('synchronises search results to store when query is present', () => {
      const store = createSpatialEntityStore();
      const results = executeCatalogSearch(TEST_CORPUS, {
        query: 'Tau Ceti',
        filter: 'all',
      });

      syncSelectedSystemsToStore(
        store,
        results,
        '',
        TEST_CORPUS,
        LAYER_INDEX,
        LOADED_LAYERS,
      );

      const state = store.getState();
      expect(state.selectedIds.has('tau-ceti')).toBe(true);
      expect(state.entities['tau-ceti']).toBeDefined();
    });

    it('synchronises url select grammar to store when query is empty', () => {
      const store = createSpatialEntityStore();
      const emptyResults = executeCatalogSearch(TEST_CORPUS, {
        query: '',
        filter: 'all',
      });

      syncSelectedSystemsToStore(
        store,
        emptyResults,
        '?select=sol',
        TEST_CORPUS,
        LAYER_INDEX,
        LOADED_LAYERS,
      );

      const state = store.getState();
      expect(state.selectedIds.has('sol')).toBe(true);
    });
  });

  describe('syncUrlFocusToStore', () => {
    it('sets focused entity when focusSlug matches corpus entry', () => {
      const store = createSpatialEntityStore();

      syncUrlFocusToStore(store, 'tau-ceti', TEST_CORPUS);

      const state = store.getState();
      expect(state.focusedId).toBe('tau-ceti');
      expect(state.entities['tau-ceti']).toBeDefined();
    });

    it('clears focus when focusSlug is null and no route stop is present', () => {
      const store = createSpatialEntityStore();
      store.getState().setFocused('sol');
      expect(store.getState().focusedId).toBe('sol');

      syncUrlFocusToStore(store, null, TEST_CORPUS);

      expect(store.getState().focusedId).toBeNull();
    });

    it('clears un-apertured fallback focus entity from store', () => {
      const store = createSpatialEntityStore();
      store.getState().registerEntity({
        id: 'fallback-entity',
        name: 'Fallback Entity',
        position: [10, 10, 10],
        classification: 'star',
      });
      const fallbackRef = { current: 'fallback-entity' };

      syncUrlFocusToStore(store, null, TEST_CORPUS, fallbackRef);

      expect(store.getState().entities['fallback-entity']).toBeUndefined();
      expect(fallbackRef.current).toBeNull();
    });
  });
});
