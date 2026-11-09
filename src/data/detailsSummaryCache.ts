import type { SystemSummaryNode } from '../types/astro';
import {
  decodeSummaryNode,
  getShardKey,
  type CompactSummaryNode,
  type ShardedBucketEnvelope,
} from '../utils/compactDataCodec';
import { fnv1a32, getShardKeyFromHash } from '../utils/binarySectorCodec';
import { resolveDataUrl } from '../utils/url';
import { BoundedLruCache } from '../utils/lruCache';
import {
  SUMMARY_BUCKET_CACHE_LIMIT,
  SUMMARY_NODE_CACHE_LIMIT,
} from '../config/cacheConfig';

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

export const loadSummaryBucket = (
  bucketKey: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  onLoaded?: () => void,
): Promise<Record<string, CompactSummaryNode>> => {
  let pending = SUMMARY_BUCKET_CACHE.get(bucketKey);
  if (!pending) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        signal.removeEventListener('abort', onAbort!);
        if (SUMMARY_BUCKET_CACHE.get(bucketKey) === pending) {
          SUMMARY_BUCKET_CACHE.delete(bucketKey);
        }
      };
      signal.addEventListener('abort', onAbort);
    }

    pending = (async () => {
      try {
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
        onLoaded?.();
        return data;
      } finally {
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
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
  onLoaded?: () => void,
): Promise<SystemSummaryNode | undefined> => {
  if (!id) {
    return undefined;
  }
  const cached = getCachedSummaryNode(id);
  if (cached) {
    return cached;
  }

  const bucketKey = getShardKey(id);
  await loadSummaryBucket(bucketKey, fetchImpl, signal, onLoaded);
  return getCachedSummaryNode(id);
};

/**
 * Fetches and caches the summary shard bucket for a given 32-bit FNV-1a ID hash.
 */
export const fetchSummaryNodeByHash = async (
  idHash: number,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  onLoaded?: () => void,
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
  await loadSummaryBucket(bucketKey, fetchImpl, signal, onLoaded);
  return getCachedSummaryNodeByHash(unsignedHash);
};

/**
 * Seeds a decoded summary node into the in-memory cache (used in unit tests).
 */
export const seedSummaryNode = (
  id: string,
  node: SystemSummaryNode,
  onLoaded?: () => void,
): void => {
  RESOLVED_SUMMARY_NODE_CACHE.set(id, node);
  onLoaded?.();
};

/**
 * Clears all in-memory summary caches.
 */
export const clearSummaryCache = (): void => {
  SUMMARY_BUCKET_CACHE.clear();
  RESOLVED_SUMMARY_BUCKET_CACHE.clear();
  RESOLVED_SUMMARY_HASH_INDEX.clear();
  RESOLVED_SUMMARY_NODE_CACHE.clear();
};
