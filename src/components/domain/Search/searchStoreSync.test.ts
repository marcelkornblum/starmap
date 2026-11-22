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

    it('resolves host planet IDs in system scope and body IDs in planet scope without overwriting existing entities', () => {
      const corpusWithMoons: readonly CompactSearchEntry[] = [
        ...TEST_CORPUS,
        {
          i: 'saturn',
          n: 'Saturn',
          s: 'sol',
          k: 2,
          u: 'gas-giant',
          h: 1,
        },
        {
          i: 'titan',
          n: 'Titan',
          s: 'sol',
          o: 'saturn',
          k: 3,
          u: 'terrestrial',
          h: 1,
        },
        {
          i: 'uranus',
          n: 'Uranus',
          s: 'sol',
          k: 2,
          u: 'ice-giant',
          h: 1,
        },
        {
          i: 'titania',
          n: 'Titania',
          s: 'sol',
          o: 'uranus',
          k: 3,
          u: 'terrestrial',
          h: 1,
        },
      ];
      const results = executeCatalogSearch(corpusWithMoons, {
        query: 'titan',
        filter: 'all',
      });

      // System scope: highlights host planets Saturn and Uranus and preserves existing 3D coordinates
      const systemStore = createSpatialEntityStore();
      systemStore.getState().registerEntity({
        id: 'Saturn',
        name: 'Saturn',
        position: [10, 0, 5],
        classification: 'gas-giant',
      });
      systemStore.getState().registerEntity({
        id: 'uranus',
        name: 'Uranus',
        position: [-18, 0, 2],
        classification: 'ice-giant',
      });

      syncSelectedSystemsToStore(
        systemStore,
        results,
        '',
        corpusWithMoons,
        LAYER_INDEX,
        LOADED_LAYERS,
        'system',
      );

      const sysState = systemStore.getState();
      expect(sysState.selectedIds).toEqual(new Set(['Saturn', 'uranus']));
      expect(sysState.entities['Saturn']?.position).toEqual([10, 0, 5]);
      expect(sysState.entities['titan']).toBeUndefined();

      // Planet scope: highlights moon Titan itself without overwriting its orbital position
      const planetStore = createSpatialEntityStore();
      planetStore.getState().registerEntity({
        id: 'titan',
        name: 'Titan',
        position: [3.2, 0.1, -1.4],
        classification: 'terrestrial',
      });

      syncSelectedSystemsToStore(
        planetStore,
        results,
        '',
        corpusWithMoons,
        LAYER_INDEX,
        LOADED_LAYERS,
        'planet',
      );

      const planetState = planetStore.getState();
      expect(planetState.selectedIds).toEqual(new Set(['titan', 'titania']));
      expect(planetState.entities['titan']?.position).toEqual([3.2, 0.1, -1.4]);
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

    it('uses existing registered entity when focusSlug matches via resolveEntityId', () => {
      const store = createSpatialEntityStore();
      store.getState().registerEntity({
        id: 'gliese-581',
        name: 'Gliese 581',
        position: [20, 1, 0],
        classification: 'star',
      });

      syncUrlFocusToStore(store, 'Gliese-581', TEST_CORPUS);

      const state = store.getState();
      expect(state.focusedId).toBe('gliese-581');
      expect(state.entities['gliese-581'].position).toEqual([20, 1, 0]);
    });
  });
});
