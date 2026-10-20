import type { SearchCategoryFilter } from '../services/searchService';
import type { CompactSearchEntry, SearchIndexEnvelope } from '../utils/compactDataCodec';

export type SearchShardName =
  | 'core'
  | 'full'
  | 'stars'
  | 'planets'
  | 'structures'
  | 'minor-bodies'
  | 'fiction'
  | 'layers';

const SHARD_URLS: Record<SearchShardName, string> = {
  core: '/data/search/core.json',
  full: '/data/search/full.json',
  stars: '/data/search/stars.json',
  planets: '/data/search/planets.json',
  structures: '/data/search/structures.json',
  'minor-bodies': '/data/search/minor-bodies.json',
  fiction: '/data/search/fiction.json',
  layers: '/data/search/layers.json',
};

const shardCache = new Map<SearchShardName, Promise<readonly CompactSearchEntry[]>>();
const resolvedShardCache = new Map<SearchShardName, readonly CompactSearchEntry[]>();
const resolvedFilterCache = new Map<SearchCategoryFilter, readonly CompactSearchEntry[]>();

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
};

/**
 * Fetches, validates, and caches a single search index shard (`public/data/search/<shard>.json`).
 */
export const fetchSearchShard = async (
  shard: SearchShardName,
  fetcher: typeof fetch = fetch,
): Promise<readonly CompactSearchEntry[]> => {
  const cached = shardCache.get(shard);
  if (cached && fetcher === fetch) {
    return cached;
  }

  const loadPromise = (async (): Promise<readonly CompactSearchEntry[]> => {
    const response = await fetcher(SHARD_URLS[shard]);
    if (!response.ok) {
      throw new Error(`Failed to load search shard "${shard}" (${response.status})`);
    }
    const payload: unknown = await response.json();
    if (!isSearchIndexEnvelope(payload)) {
      throw new Error(`Invalid search index envelope in shard "${shard}"`);
    }
    if (fetcher === fetch) {
      resolvedShardCache.set(shard, payload.d);
    }
    return payload.d;
  })();

  if (fetcher === fetch) {
    shardCache.set(shard, loadPromise);
    loadPromise.catch(() => {
      shardCache.delete(shard);
    });
  }

  return loadPromise;
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
    const shardName: SearchShardName = filter === 'fiction' ? 'fiction' : (filter as SearchShardName);
    const shard = resolvedShardCache.get(shardName);
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
): Promise<readonly CompactSearchEntry[]> => {
  if (fetcher === fetch) {
    const cached = getCachedCorpusForFilter(filter);
    if (cached) {
      return cached;
    }
  }

  if (filter !== 'all') {
    const shardName: SearchShardName = filter === 'fiction' ? 'fiction' : (filter as SearchShardName);
    const shard = await fetchSearchShard(shardName, fetcher);
    if (fetcher === fetch) {
      resolvedFilterCache.set(filter, shard);
    }
    return shard;
  }

  const [core, structures, minorBodies] = await Promise.all([
    fetchSearchShard('core', fetcher),
    fetchSearchShard('structures', fetcher),
    fetchSearchShard('minor-bodies', fetcher),
  ]);

  const merged = mergeSearchShards([core, structures, minorBodies]);
  if (fetcher === fetch) {
    resolvedFilterCache.set('all', merged);
  }
  return merged;
};
