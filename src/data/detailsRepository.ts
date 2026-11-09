import type {
  ExoplanetRecord,
  GalacticStructureRecord,
  SolarSystemBodyRecord,
  SystemManifest,
  SystemSummaryNode,
} from '../types/astro';
import {
  decodeGalacticStructure,
  decodeSolarSystemBody,
  decodeSystemManifest,
  getShardKey,
  type CompactDetailRecord,
  type ShardedBucketEnvelope,
} from '../utils/compactDataCodec';
import { resolveDataUrl } from '../utils/url';
import { BoundedLruCache } from '../utils/lruCache';
import {
  DETAIL_BUCKET_CACHE_LIMIT,
  DETAIL_RECORD_CACHE_LIMIT,
} from '../config/cacheConfig';
import {
  clearSummaryCache,
  fetchSummaryNode as fetchSummaryNodeImpl,
  fetchSummaryNodeByHash as fetchSummaryNodeByHashImpl,
  getCachedSummaryNode,
  getCachedSummaryNodeByHash,
  seedSummaryNode as seedSummaryNodeImpl,
} from './detailsSummaryCache';

export {
  getCachedSummaryNode,
  getCachedSummaryNodeByHash,
};

export type DecodedDetailRecord =
  | { readonly kind: 'system'; readonly record: SystemManifest }
  | { readonly kind: 'structure'; readonly record: GalacticStructureRecord }
  | { readonly kind: 'solar-body'; readonly record: SolarSystemBodyRecord };

const detailsListeners = new Set<() => void>();
let detailsRepoVersion = 0;

/**
 * Returns the current version counter of the details repository cache.
 */
export const getDetailsRepositoryVersion = (): number => detailsRepoVersion;

/**
 * Subscribes to changes in the details repository in-memory cache.
 * Returns an unsubscribe callback.
 */
export const subscribeDetailsRepository = (listener: () => void): (() => void) => {
  detailsListeners.add(listener);
  return () => {
    detailsListeners.delete(listener);
  };
};

const notifyDetailsListeners = (): void => {
  detailsRepoVersion++;
  for (const listener of detailsListeners) {
    listener();
  }
};

export const fetchSummaryNode = async (
  id: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SystemSummaryNode | undefined> => {
  return fetchSummaryNodeImpl(id, fetchImpl, signal, notifyDetailsListeners);
};

export const fetchSummaryNodeByHash = async (
  idHash: number,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SystemSummaryNode | undefined> => {
  return fetchSummaryNodeByHashImpl(idHash, fetchImpl, signal, notifyDetailsListeners);
};

export const seedSummaryNode = (
  id: string,
  node: SystemSummaryNode,
): void => {
  seedSummaryNodeImpl(id, node, notifyDetailsListeners);
};

const DETAIL_BUCKET_CACHE = new BoundedLruCache<
  string,
  Promise<Record<string, CompactDetailRecord>>
>(DETAIL_BUCKET_CACHE_LIMIT);
const RESOLVED_DETAIL_BUCKET_CACHE = new BoundedLruCache<
  string,
  Record<string, CompactDetailRecord>
>(DETAIL_BUCKET_CACHE_LIMIT);
const RESOLVED_DETAIL_RECORD_CACHE = new BoundedLruCache<
  string,
  DecodedDetailRecord
>(DETAIL_RECORD_CACHE_LIMIT);

/**
 * Pure decoder converting a `CompactDetailRecord` from `public/data/details/<0..z>.json`
 * into its strongly-typed domain representation.
 */
export const decodeDetailRecord = (
  compact: CompactDetailRecord,
  id: string,
): DecodedDetailRecord => {
  if (compact.t === 'str') {
    return {
      kind: 'structure',
      record: decodeGalacticStructure(compact, id),
    };
  }
  if (compact.t === 'sol') {
    return {
      kind: 'solar-body',
      record: decodeSolarSystemBody(compact, id),
    };
  }
  return {
    kind: 'system',
    record: decodeSystemManifest(compact, id),
  };
};

/**
 * Synchronously retrieves a decoded detail record by ID if its 36-bucket shard
 * is already cached in memory.
 */
export const getCachedDetailRecord = (
  id: string,
): DecodedDetailRecord | undefined => {
  if (!id) {
    return undefined;
  }
  const cachedDecoded = RESOLVED_DETAIL_RECORD_CACHE.get(id);
  if (cachedDecoded) {
    return cachedDecoded;
  }
  const bucketKey = getShardKey(id);
  const bucket = RESOLVED_DETAIL_BUCKET_CACHE.get(bucketKey);
  const compact = bucket?.[id];
  if (!compact) {
    return undefined;
  }
  const decoded = decodeDetailRecord(compact, id);
  RESOLVED_DETAIL_RECORD_CACHE.set(id, decoded);
  return decoded;
};

/**
 * Synchronously looks up an exoplanet record across a cached host system manifest.
 */
export const getCachedExoplanetFromSystem = (
  systemId: string,
  planetId: string,
): ExoplanetRecord | undefined => {
  const sysDetail = getCachedDetailRecord(systemId);
  if (sysDetail?.kind !== 'system') {
    return undefined;
  }
  return sysDetail.record.planets.find((p) => p.id === planetId);
};

const loadDetailBucket = (
  bucketKey: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Record<string, CompactDetailRecord>> => {
  let pending = DETAIL_BUCKET_CACHE.get(bucketKey);
  if (!pending) {
    pending = (async () => {
      const url = resolveDataUrl(`/data/details/${bucketKey}.json`);
      const response = signal
        ? await fetchImpl(url, { signal })
        : await fetchImpl(url);
      if (!response.ok) {
        throw new Error(
          `Failed to load detail shard "${bucketKey}": ${response.status} ${response.statusText}`,
        );
      }
      const envelope =
        (await response.json()) as ShardedBucketEnvelope<CompactDetailRecord>;
      const data = envelope.d ?? {};
      RESOLVED_DETAIL_BUCKET_CACHE.set(bucketKey, data);
      notifyDetailsListeners();
      return data;
    })().catch((err: unknown) => {
      DETAIL_BUCKET_CACHE.delete(bucketKey);
      throw err;
    });

    if (signal) {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        if (DETAIL_BUCKET_CACHE.get(bucketKey) === pending) {
          DETAIL_BUCKET_CACHE.delete(bucketKey);
        }
      };
      signal.addEventListener('abort', onAbort);
    }

    DETAIL_BUCKET_CACHE.set(bucketKey, pending);
  }

  return pending.catch((err: unknown) => {
    if (err instanceof Error && err.name === 'AbortError' && !signal?.aborted) {
      return loadDetailBucket(bucketKey, fetchImpl, signal);
    }
    throw err;
  });
};

/**
 * Fetches and caches the detail shard bucket (`public/data/details/<0..z>.json`) for a given entity ID.
 */
export const fetchDetailRecord = async (
  id: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<DecodedDetailRecord | undefined> => {
  if (!id) {
    return undefined;
  }
  const cached = getCachedDetailRecord(id);
  if (cached) {
    return cached;
  }

  const bucketKey = getShardKey(id);
  await loadDetailBucket(bucketKey, fetchImpl, signal);
  return getCachedDetailRecord(id);
};

/**
 * Seeds a decoded detail record into the in-memory cache (used in unit tests).
 */
export const seedDetailRecord = (
  id: string,
  record: DecodedDetailRecord,
): void => {
  RESOLVED_DETAIL_RECORD_CACHE.set(id, record);
  notifyDetailsListeners();
};

/**
 * Clears all in-memory summary and detail bucket caches (used in tests).
 */
export const clearDetailsRepositoryCache = (): void => {
  clearSummaryCache();
  DETAIL_BUCKET_CACHE.clear();
  RESOLVED_DETAIL_BUCKET_CACHE.clear();
  RESOLVED_DETAIL_RECORD_CACHE.clear();
  notifyDetailsListeners();
};

export const resetDetailsRepositoryCache = clearDetailsRepositoryCache;
