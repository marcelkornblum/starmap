import type { SearchCategoryFilter } from '../types/search';
import { assertSchemaVersion } from '../utils/compactDataCodec';
import { COMPACT_SCHEMA_VERSION } from '../utils/compactDataConstants';
import type { CompactSearchEntry, SearchIndexEnvelope } from '../utils/compactDataTypes';
import { BoundedLruCache } from '../utils/lruCache';
import { SEARCH_SHARD_CACHE_LIMIT } from '../config/cacheConfig';
import { resolveManifestDataUrl } from './dataManifestRepository';
import { fetchAndParseJson, JsonHttpError } from './workerJsonParser';

export type SearchShardName =
  | 'startup'
  | 'core'
  | 'stars'
  | 'planets'
  | 'structures'
  | 'minor-bodies'
  | 'layers';

export type SearchCorpusScope = SearchCategoryFilter | 'startup';

const SHARD_LOGICAL_PATHS: Record<SearchShardName, string> = {
  startup: 'search/startup.json',
  core: 'search/core.json',
  stars: 'search/stars.json',
  planets: 'search/planets.json',
  structures: 'search/structures.json',
  'minor-bodies': 'search/minor-bodies.json',
  layers: 'search/layers.json',
};

const shardCache = new BoundedLruCache<SearchShardName, Promise<readonly CompactSearchEntry[]>>(
  SEARCH_SHARD_CACHE_LIMIT,
);
const resolvedShardCache = new BoundedLruCache<SearchShardName, readonly CompactSearchEntry[]>(
  SEARCH_SHARD_CACHE_LIMIT,
);
const resolvedFilterCache = new BoundedLruCache<SearchCorpusScope, readonly CompactSearchEntry[]>(
  SEARCH_SHARD_CACHE_LIMIT,
);

const searchListeners = new Set<() => void>();
const clearCacheListeners = new Set<() => void>();
let searchRepoVersion = 0;

/**
 * Registers a listener invoked when `clearSearchRepositoryCache()` runs (e.g. test cleanup).
 */
export const registerSearchCacheClearListener = (listener: () => void): (() => void) => {
  clearCacheListeners.add(listener);
  return () => {
    clearCacheListeners.delete(listener);
  };
};

/**
 * Returns the current version counter of the search repository cache.
 */
export const getSearchRepositoryVersion = (): number => searchRepoVersion;

/**
 * Subscribes to changes in the search repository in-memory cache.
 * Returns an unsubscribe callback.
 */
export const subscribeSearchRepository = (listener: () => void): (() => void) => {
  searchListeners.add(listener);
  return () => {
    searchListeners.delete(listener);
  };
};

const notifySearchListeners = (): void => {
  searchRepoVersion++;
  for (const listener of searchListeners) {
    listener();
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSearchIndexEnvelope = (value: unknown): value is SearchIndexEnvelope => {
  if (!isRecord(value)) {
    return false;
  }
  return Array.isArray(value.d);
};

/**
 * Clears the in-memory search shard cache (primarily for unit test isolation).
 */
export const clearSearchRepositoryCache = (): void => {
  shardCache.clear();
  resolvedShardCache.clear();
  resolvedFilterCache.clear();
  for (const listener of clearCacheListeners) {
    listener();
  }
  notifySearchListeners();
};

/**
 * Fetches, validates, and caches a single search index shard (`public/data/search/<shard>.json`)
 * using the background Web Worker JSON parser when available.
 */
export const fetchSearchShard = async (
  shard: SearchShardName,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<readonly CompactSearchEntry[]> => {
  const cached = shardCache.get(shard);
  if (cached) {
    return cached;
  }

  let loadPromise = shardCache.get(shard);
  if (!loadPromise) {
    loadPromise = (async (): Promise<readonly CompactSearchEntry[]> => {
      const url = await resolveManifestDataUrl(
        SHARD_LOGICAL_PATHS[shard],
        fetcher,
        signal,
      );
      let payload: unknown;
      try {
        payload = await fetchAndParseJson(url, fetcher, signal);
      } catch (err: unknown) {
        if (err instanceof JsonHttpError) {
          throw new Error(`Failed to load search shard "${shard}" (${err.status})`);
        }
        throw err;
      }
      if (!isSearchIndexEnvelope(payload)) {
        throw new Error(`Invalid search index envelope in shard "${shard}"`);
      }
      assertSchemaVersion(payload, COMPACT_SCHEMA_VERSION, `search shard "${shard}"`);
      resolvedShardCache.set(shard, payload.d);
      resolvedFilterCache.delete('startup');
      resolvedFilterCache.delete('all');
      notifySearchListeners();
      return payload.d;
    })().catch((err: unknown) => {
      shardCache.delete(shard);
      throw err;
    });

    if (signal) {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        if (shardCache.get(shard) === loadPromise) {
          shardCache.delete(shard);
        }
      };
      signal.addEventListener('abort', onAbort);
    }

    shardCache.set(shard, loadPromise);
  }

  return loadPromise.catch((err: unknown) => {
    if (err instanceof Error && err.name === 'AbortError' && !signal?.aborted) {
      return fetchSearchShard(shard, fetcher, signal);
    }
    throw err;
  });
};

/**
 * Merges multiple search entry arrays while deduplicating by entity ID (`entry.i`).
 */
export const mergeSearchShards = (
  shards: readonly (readonly CompactSearchEntry[])[],
): readonly CompactSearchEntry[] => {
  const merged: CompactSearchEntry[] = [];
  const seenIds = new Set<string>();

  for (const shard of shards) {
    for (const entry of shard) {
      if (!seenIds.has(entry.i)) {
        seenIds.add(entry.i);
        merged.push(entry);
      }
    }
  }

  return merged;
};

/**
 * Synchronously returns the already-loaded search corpus for a filter if cached in memory.
 * Enables zero-latency keystroke search without async state transitions on every key press.
 */
export const getCachedCorpusForFilter = (
  filter: SearchCorpusScope,
): readonly CompactSearchEntry[] | undefined => {
  const cachedFilterCorpus = resolvedFilterCache.get(filter);
  if (cachedFilterCorpus) {
    return cachedFilterCorpus;
  }

  if (filter === 'startup') {
    const startup = resolvedShardCache.get('startup');
    const stars = resolvedShardCache.get('stars');
    const planets = resolvedShardCache.get('planets');
    const minorBodies = resolvedShardCache.get('minor-bodies');
    const core = resolvedShardCache.get('core');
    const structures = resolvedShardCache.get('structures');

    if (stars || planets || minorBodies || (core && structures)) {
      const layersToMerge: (readonly CompactSearchEntry[])[] = [];
      if (startup) layersToMerge.push(startup);
      if (core) layersToMerge.push(core);
      if (structures) layersToMerge.push(structures);
      if (stars) layersToMerge.push(stars);
      if (planets) layersToMerge.push(planets);
      if (minorBodies) layersToMerge.push(minorBodies);
      if (layersToMerge.length > 0) {
        const upgraded =
          layersToMerge.length === 1 ? layersToMerge[0]! : mergeSearchShards(layersToMerge);
        resolvedFilterCache.set('startup', upgraded);
        return upgraded;
      }
    }

    if (startup) {
      resolvedFilterCache.set('startup', startup);
    }
    return startup;
  }

  if (filter !== 'all') {
    const shard = resolvedShardCache.get(filter);
    if (shard) {
      resolvedFilterCache.set(filter, shard);
    }
    return shard;
  }

  const core = resolvedShardCache.get('core');
  const structures = resolvedShardCache.get('structures');
  const minorBodies = resolvedShardCache.get('minor-bodies');
  if (core && structures && minorBodies) {
    const merged = mergeSearchShards([core, structures, minorBodies]);
    resolvedFilterCache.set('all', merged);
    return merged;
  }

  const stars = resolvedShardCache.get('stars');
  const planets = resolvedShardCache.get('planets');
  const layers = resolvedShardCache.get('layers');
  if (stars && planets && structures && layers && minorBodies) {
    const merged = mergeSearchShards([stars, planets, structures, layers, minorBodies]);
    resolvedFilterCache.set('all', merged);
    return merged;
  }

  return undefined;
};

/**
 * Loads the appropriate search corpus for the requested category filter or `'startup'` tier.
 * - `'startup'` loads ONLY `search/startup` (~lean focus/layers/Sol/structures corpus).
 * - Specific category filters load only their dedicated category shard.
 * - `'all'` loads `core` + `structures` + `minor-bodies` in parallel.
 */
export const loadSearchCorpusForFilter = async (
  filter: SearchCorpusScope,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<readonly CompactSearchEntry[]> => {
  if (fetcher === fetch) {
    const cached = getCachedCorpusForFilter(filter);
    if (cached) {
      return cached;
    }
  }

  if (filter === 'startup') {
    const shard = await fetchSearchShard('startup', fetcher, signal);
    if (fetcher === fetch) {
      resolvedFilterCache.set('startup', shard);
      notifySearchListeners();
    }
    return shard;
  }

  if (filter !== 'all') {
    const shard = await fetchSearchShard(filter, fetcher, signal);
    if (fetcher === fetch) {
      resolvedFilterCache.set(filter, shard);
      notifySearchListeners();
    }
    return shard;
  }

  const [core, structures, minorBodies] = await Promise.all([
    fetchSearchShard('core', fetcher, signal),
    fetchSearchShard('structures', fetcher, signal),
    fetchSearchShard('minor-bodies', fetcher, signal),
  ]);

  const merged = mergeSearchShards([core, structures, minorBodies]);
  if (fetcher === fetch) {
    resolvedFilterCache.set('all', merged);
    notifySearchListeners();
  }
  return merged;
};
