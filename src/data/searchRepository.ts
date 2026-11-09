import type { SearchCategoryFilter } from '../types/search';
import type { CompactSearchEntry, SearchIndexEnvelope } from '../utils/compactDataCodec';
import { resolveDataUrl } from '../utils/url';
import { BoundedLruCache } from '../utils/lruCache';
import { SEARCH_SHARD_CACHE_LIMIT } from '../config/cacheConfig';

export type SearchShardName =
  | 'core'
  | 'full'
  | 'stars'
  | 'planets'
  | 'structures'
  | 'minor-bodies'
  | 'layers';


const SHARD_URLS: Record<SearchShardName, string> = {
  core: resolveDataUrl('/data/search/core.json'),
  full: resolveDataUrl('/data/search/full.json'),
  stars: resolveDataUrl('/data/search/stars.json'),
  planets: resolveDataUrl('/data/search/planets.json'),
  structures: resolveDataUrl('/data/search/structures.json'),
  'minor-bodies': resolveDataUrl('/data/search/minor-bodies.json'),
  layers: resolveDataUrl('/data/search/layers.json'),
};

const shardCache = new BoundedLruCache<SearchShardName, Promise<readonly CompactSearchEntry[]>>(
  SEARCH_SHARD_CACHE_LIMIT,
);
const resolvedShardCache = new BoundedLruCache<SearchShardName, readonly CompactSearchEntry[]>(
  SEARCH_SHARD_CACHE_LIMIT,
);
const resolvedFilterCache = new BoundedLruCache<SearchCategoryFilter, readonly CompactSearchEntry[]>(
  SEARCH_SHARD_CACHE_LIMIT,
);

const searchListeners = new Set<() => void>();
let searchRepoVersion = 0;

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
  notifySearchListeners();
};

/**
 * Fetches, validates, and caches a single search index shard (`public/data/search/<shard>.json`).
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
      const response = signal
        ? await fetcher(SHARD_URLS[shard], { signal })
        : await fetcher(SHARD_URLS[shard]);
      if (!response.ok) {
        throw new Error(`Failed to load search shard "${shard}" (${response.status})`);
      }
      const payload: unknown = await response.json();
      if (!isSearchIndexEnvelope(payload)) {
        throw new Error(`Invalid search index envelope in shard "${shard}"`);
      }
      resolvedShardCache.set(shard, payload.d);
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
  filter: SearchCategoryFilter,
): readonly CompactSearchEntry[] | undefined => {
  const cachedFilterCorpus = resolvedFilterCache.get(filter);
  if (cachedFilterCorpus) {
    return cachedFilterCorpus;
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

  return undefined;
};

/**
 * Loads the appropriate search corpus for the requested category filter.
 * - Specific category filters load only their dedicated category shard.
 * - `'all'` loads `core.json` + `structures.json` + `minor-bodies.json` in parallel for
 *   complete coverage across all 5 categories without waiting for the 10.7 MB faint-star tail.
 */
export const loadSearchCorpusForFilter = async (
  filter: SearchCategoryFilter,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<readonly CompactSearchEntry[]> => {
  if (fetcher === fetch) {
    const cached = getCachedCorpusForFilter(filter);
    if (cached) {
      return cached;
    }
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
