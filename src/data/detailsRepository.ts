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
  decodeSummaryNode,
  decodeSystemManifest,
  getShardKey,
  type CompactDetailRecord,
  type CompactSummaryNode,
  type ShardedBucketEnvelope,
} from '../utils/compactDataCodec';
import { fnv1a32, getShardKeyFromHash } from '../utils/binarySectorCodec';
import { resolveDataUrl } from '../utils/url';
import { BoundedLruCache } from '../utils/lruCache';
import {
  DETAIL_BUCKET_CACHE_LIMIT,
  DETAIL_RECORD_CACHE_LIMIT,
  SUMMARY_BUCKET_CACHE_LIMIT,
  SUMMARY_NODE_CACHE_LIMIT,
} from '../config/cacheConfig';

export type DecodedDetailRecord =
  | { readonly kind: 'system'; readonly record: SystemManifest }
  | { readonly kind: 'structure'; readonly record: GalacticStructureRecord }
  | { readonly kind: 'solar-body'; readonly record: SolarSystemBodyRecord };

const SUMMARY_BUCKET_CACHE = new BoundedLruCache<
  string,
  Promise<Record<string, CompactSummaryNode>>
>(SUMMARY_BUCKET_CACHE_LIMIT);
const RESOLVED_SUMMARY_BUCKET_CACHE = new BoundedLruCache<
  string,
  Record<string, CompactSummaryNode>
>(SUMMARY_BUCKET_CACHE_LIMIT);
const RESOLVED_SUMMARY_HASH_INDEX = new BoundedLruCache<
  string,
  Map<number, string>
>(SUMMARY_BUCKET_CACHE_LIMIT);
const RESOLVED_SUMMARY_NODE_CACHE = new BoundedLruCache<
  string,
  SystemSummaryNode
>(SUMMARY_NODE_CACHE_LIMIT);
const RESOLVED_DETAIL_RECORD_CACHE = new BoundedLruCache<
  string,
  DecodedDetailRecord
>(DETAIL_RECORD_CACHE_LIMIT);

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

/**
 * Builds or retrieves a reverse mapping from 32-bit FNV-1a hash to canonical string ID for a summary bucket.
 */
function getOrBuildBucketHashIndex(
  bucketKey: string,
  data: Record<string, CompactSummaryNode>,
): Map<number, string> {
  let index = RESOLVED_SUMMARY_HASH_INDEX.get(bucketKey);
  if (!index) {
    index = new Map<number, string>();
    for (const id of Object.keys(data)) {
      index.set(fnv1a32(id) >>> 0, id);
    }
    RESOLVED_SUMMARY_HASH_INDEX.set(bucketKey, index);
  }
  return index;
}

const DETAIL_BUCKET_CACHE = new BoundedLruCache<
  string,
  Promise<Record<string, CompactDetailRecord>>
>(DETAIL_BUCKET_CACHE_LIMIT);
const RESOLVED_DETAIL_BUCKET_CACHE = new BoundedLruCache<
  string,
  Record<string, CompactDetailRecord>
>(DETAIL_BUCKET_CACHE_LIMIT);

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
 * Synchronously retrieves a decoded `SystemSummaryNode` by ID if its 36-bucket shard
 * is already cached in memory.
 */
export const getCachedSummaryNode = (
  id: string,
): SystemSummaryNode | undefined => {
  if (!id) {
    return undefined;
  }
  const cachedDecoded = RESOLVED_SUMMARY_NODE_CACHE.get(id);
  if (cachedDecoded) {
    return cachedDecoded;
  }
  const bucketKey = getShardKey(id);
  const bucket = RESOLVED_SUMMARY_BUCKET_CACHE.get(bucketKey);
  const compact = bucket?.[id];
  if (!compact) {
    return undefined;
  }
  const decoded = decodeSummaryNode(compact, id);
  RESOLVED_SUMMARY_NODE_CACHE.set(id, decoded);
  return decoded;
};

/**
 * Synchronously retrieves a decoded `SystemSummaryNode` by 32-bit FNV-1a ID hash if its bucket is cached in memory.
 */
export const getCachedSummaryNodeByHash = (
  idHash: number,
): SystemSummaryNode | undefined => {
  if (!Number.isFinite(idHash)) {
    return undefined;
  }
  const unsignedHash = idHash >>> 0;
  const bucketKey = getShardKeyFromHash(unsignedHash);
  const bucket = RESOLVED_SUMMARY_BUCKET_CACHE.get(bucketKey);
  if (!bucket) {
    return undefined;
  }
  const index = getOrBuildBucketHashIndex(bucketKey, bucket);
  const canonicalId = index.get(unsignedHash);
  return canonicalId ? getCachedSummaryNode(canonicalId) : undefined;
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

const loadSummaryBucket = (
  bucketKey: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Record<string, CompactSummaryNode>> => {
  let pending = SUMMARY_BUCKET_CACHE.get(bucketKey);
  if (!pending) {
    pending = (async () => {
      const url = resolveDataUrl(`/data/summaries/${bucketKey}.json`);
      const response = signal
        ? await fetchImpl(url, { signal })
        : await fetchImpl(url);
      if (!response.ok) {
        throw new Error(
          `Failed to load summary shard "${bucketKey}": ${response.status} ${response.statusText}`,
        );
      }
      const envelope =
        (await response.json()) as ShardedBucketEnvelope<CompactSummaryNode>;
      const data = envelope.d ?? {};
      RESOLVED_SUMMARY_BUCKET_CACHE.set(bucketKey, data);
      getOrBuildBucketHashIndex(bucketKey, data);
      notifyDetailsListeners();
      return data;
    })().catch((err: unknown) => {
      SUMMARY_BUCKET_CACHE.delete(bucketKey);
      throw err;
    });
    SUMMARY_BUCKET_CACHE.set(bucketKey, pending);
  }
  return pending;
};

/**
 * Fetches and caches the summary shard bucket (`public/data/summaries/<0..z>.json`) for a given entity ID.
 */
export const fetchSummaryNode = async (
  id: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SystemSummaryNode | undefined> => {
  if (!id) {
    return undefined;
  }
  const cached = getCachedSummaryNode(id);
  if (cached) {
    return cached;
  }

  const bucketKey = getShardKey(id);
  await loadSummaryBucket(bucketKey, fetchImpl, signal);
  return getCachedSummaryNode(id);
};

/**
 * Fetches and caches the summary shard bucket for a given 32-bit FNV-1a ID hash.
 */
export const fetchSummaryNodeByHash = async (
  idHash: number,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SystemSummaryNode | undefined> => {
  if (!Number.isFinite(idHash)) {
    return undefined;
  }
  const cached = getCachedSummaryNodeByHash(idHash);
  if (cached) {
    return cached;
  }

  const unsignedHash = idHash >>> 0;
  const bucketKey = getShardKeyFromHash(unsignedHash);
  await loadSummaryBucket(bucketKey, fetchImpl, signal);
  return getCachedSummaryNodeByHash(unsignedHash);
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
    DETAIL_BUCKET_CACHE.set(bucketKey, pending);
  }
  return pending;
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
 * Seeds a decoded summary node into the in-memory cache (used in unit tests).
 */
export const seedSummaryNode = (
  id: string,
  node: SystemSummaryNode,
): void => {
  RESOLVED_SUMMARY_NODE_CACHE.set(id, node);
  notifyDetailsListeners();
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
  SUMMARY_BUCKET_CACHE.clear();
  RESOLVED_SUMMARY_BUCKET_CACHE.clear();
  RESOLVED_SUMMARY_HASH_INDEX.clear();
  RESOLVED_SUMMARY_NODE_CACHE.clear();
  DETAIL_BUCKET_CACHE.clear();
  RESOLVED_DETAIL_BUCKET_CACHE.clear();
  RESOLVED_DETAIL_RECORD_CACHE.clear();
  notifyDetailsListeners();
};

export const resetDetailsRepositoryCache = clearDetailsRepositoryCache;
