import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runSearchCorpusPrewarm } from './searchCorpusPrewarm';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import * as searchRepo from '../../../data/searchRepository';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';

const SAMPLE_ENTRIES: CompactSearchEntry[] = [
  { i: 'sol', n: 'Sol', m: [-26.74, 'G2V', 8, 1], h: 1 },
  { i: 'tau-ceti', n: 'Tau Ceti', m: [3.49, 'G8V', 4, 1] },
];

describe('searchCorpusPrewarm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aborts early and returns undefined if isCancelled returns true', async () => {
    vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockResolvedValue(SAMPLE_ENTRIES);

    const store = createSpatialEntityStore();
    const updateResultsSpy = vi.fn();
    const setStatusSpy = vi.fn();

    const result = await runSearchCorpusPrewarm({
      initialFilter: 'all',
      activeSearch: '',
      initialQuery: '',
      syncUrl: false,
      store,
      layerIndex: [],
      loadedLayers: [],
      resolveCurrentFocusSlug: () => null,
      updateResultsAndSelection: updateResultsSpy,
      setStatus: setStatusSpy,
      fallbackFocusIdRef: { current: null },
      isCancelled: () => true,
    });

    expect(result).toBeUndefined();
    expect(updateResultsSpy).not.toHaveBeenCalled();
    expect(setStatusSpy).not.toHaveBeenCalled();
  });

  it('prewarms corpus, runs search when start query >= 3 chars, updates results and status', async () => {
    vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockResolvedValue(SAMPLE_ENTRIES);

    const store = createSpatialEntityStore();
    const updateResultsSpy = vi.fn();
    const setStatusSpy = vi.fn();

    const result = await runSearchCorpusPrewarm({
      initialFilter: 'all',
      activeSearch: '',
      initialQuery: 'Tau',
      syncUrl: false,
      store,
      layerIndex: [],
      loadedLayers: [],
      resolveCurrentFocusSlug: () => null,
      updateResultsAndSelection: updateResultsSpy,
      setStatus: setStatusSpy,
      fallbackFocusIdRef: { current: null },
      isCancelled: () => false,
    });

    expect(result).toBeDefined();
    expect(updateResultsSpy).toHaveBeenCalled();
    expect(setStatusSpy).toHaveBeenCalledWith('ready');
  });

  it('fetches extra shards if initialFocusSlug is not found in base corpus', async () => {
    vi.spyOn(searchRepo, 'loadSearchCorpusForFilter').mockResolvedValue([SAMPLE_ENTRIES[0]]);
    const fetchShardSpy = vi.spyOn(searchRepo, 'fetchSearchShard').mockResolvedValue([SAMPLE_ENTRIES[1]]);

    const store = createSpatialEntityStore();
    const updateResultsSpy = vi.fn();
    const setStatusSpy = vi.fn();

    const result = await runSearchCorpusPrewarm({
      initialFilter: 'all',
      activeSearch: '?focus=tau-ceti',
      initialQuery: '',
      syncUrl: false,
      store,
      layerIndex: [],
      loadedLayers: [],
      resolveCurrentFocusSlug: () => 'tau-ceti',
      updateResultsAndSelection: updateResultsSpy,
      setStatus: setStatusSpy,
      fallbackFocusIdRef: { current: null },
      isCancelled: () => false,
    });

    expect(fetchShardSpy).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
