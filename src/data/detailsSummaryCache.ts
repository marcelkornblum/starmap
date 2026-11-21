import type { SystemSummaryNode } from '../types/astro';
import { decodeSummaryNode } from '../utils/compactDataCodec';
import type { CompactSummaryNode } from '../utils/compactDataTypes';
import { fnv1a32 } from '../utils/binarySectorCodec';
import { BoundedLruCache } from '../utils/lruCache';
import { formatSectorId } from '../utils/sectorMath';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import {
  SUMMARY_BUCKET_CACHE_LIMIT,
  SUMMARY_NODE_CACHE_LIMIT,
} from '../config/cacheConfig';
import { hasManifestDataPath } from './dataManifestRepository';
import { fetchDetailsRoutingTable } from './detailsRouting';
import { getCachedSearchEntryById } from './searchRepository';
import { loadShardedEnvelopeData } from './shardFetchHelper';

const SUMMARY_SECTOR_CACHE = new BoundedLruCache<
  string,
  Promise<Record<string, CompactSummaryNode>>
>(SUMMARY_BUCKET_CACHE_LIMIT);

const RESOLVED_SUMMARY_SECTOR_CACHE = new BoundedLruCache<
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

const summaryLogicalPath = (sectorId: string): string =>
  `summaries/${sectorId}.json`;

function getOrBuildSectorHashIndex(
  sectorId: string,
  data: Record<string, CompactSummaryNode>,
): Map<number, string> {
  let index = RESOLVED_SUMMARY_HASH_INDEX.get(sectorId);
  if (!index) {
    index = new Map<number, string>();
    for (const id of Object.keys(data)) {
      index.set(fnv1a32(id) >>> 0, id);
    }
    RESOLVED_SUMMARY_HASH_INDEX.set(sectorId, index);
  }
  return index;
}

function getOrDecodeSummaryNode(
  id: string,
  compact: CompactSummaryNode,
  sectorId: string,
): SystemSummaryNode {
  const cachedDecoded = RESOLVED_SUMMARY_NODE_CACHE.get(id);
  if (cachedDecoded) {
    return cachedDecoded;
  }
  const decoded = decodeSummaryNode(compact, id, sectorId);
  RESOLVED_SUMMARY_NODE_CACHE.set(id, decoded);
  return decoded;
}

/**
 * Returns whether a sector's summary shard is already resolved in memory.
 */
export const isSummarySectorCached = (sectorId: string): boolean =>
  Boolean(sectorId && RESOLVED_SUMMARY_SECTOR_CACHE.has(sectorId));

/**
 * Synchronously retrieves a decoded `SystemSummaryNode` by ID if already cached
 * or present in any loaded summary sector shard.
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
  for (const [sectorId, sectorData] of RESOLVED_SUMMARY_SECTOR_CACHE.entries()) {
    const compact = sectorData[id];
    if (compact) {
      return getOrDecodeSummaryNode(id, compact, sectorId);
    }
  }
  return undefined;
};

/**
 * Synchronously retrieves a decoded `SystemSummaryNode` by 32-bit FNV-1a ID hash
 * within a specific cached sector shard in O(1).
 */
export const getCachedSummaryNodeByHashInSector = (
  sectorId: string,
  idHash: number,
): SystemSummaryNode | undefined => {
  if (!sectorId || !Number.isFinite(idHash)) {
    return undefined;
  }
  const sectorData = RESOLVED_SUMMARY_SECTOR_CACHE.get(sectorId);
  if (!sectorData) {
    return undefined;
  }
  const unsignedHash = idHash >>> 0;
  const canonicalId = getOrBuildSectorHashIndex(sectorId, sectorData).get(unsignedHash);
  const compact = canonicalId ? sectorData[canonicalId] : undefined;
  return canonicalId && compact ? getOrDecodeSummaryNode(canonicalId, compact, sectorId) : undefined;
};

/**
 * Synchronously retrieves a decoded `SystemSummaryNode` by 32-bit FNV-1a ID hash
 * across all currently cached summary sector shards.
 */
export const getCachedSummaryNodeByHash = (
  idHash: number,
): SystemSummaryNode | undefined => {
  if (!Number.isFinite(idHash)) {
    return undefined;
  }
  const unsignedHash = idHash >>> 0;
  for (const [sectorId, sectorData] of RESOLVED_SUMMARY_SECTOR_CACHE.entries()) {
    const canonicalId = getOrBuildSectorHashIndex(sectorId, sectorData).get(unsignedHash);
    const compact = canonicalId ? sectorData[canonicalId] : undefined;
    if (canonicalId && compact) {
      return getOrDecodeSummaryNode(canonicalId, compact, sectorId);
    }
  }
  return undefined;
};

/**
 * Fetches, parses (via Web Worker when available), validates, and caches
 * a spatial summary sector shard (`public/data/summaries/<sectorId>.json`).
 */
export const loadSummarySector = (
  sectorId: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  onLoaded?: () => void,
): Promise<Record<string, CompactSummaryNode>> =>
  loadShardedEnvelopeData({
    cacheKey: sectorId,
    logicalPath: summaryLogicalPath(sectorId),
    label: `summary shard "${sectorId}"`,
    pendingCache: SUMMARY_SECTOR_CACHE,
    resolvedCache: RESOLVED_SUMMARY_SECTOR_CACHE,
    fetchImpl,
    signal,
    onLoaded,
  });

/**
 * Deduplicates and batch-preloads summary sector shards in parallel.
 */
export const preloadSummarySectors = async (
  sectorIds: readonly string[],
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  onLoaded?: () => void,
): Promise<void> => {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
  const uniqueSectors: string[] = [];
  const seen = new Set<string>();
  for (const sectorId of sectorIds) {
    if (!sectorId || seen.has(sectorId)) continue;
    seen.add(sectorId);
    if (RESOLVED_SUMMARY_SECTOR_CACHE.has(sectorId)) continue;
    if (hasManifestDataPath(summaryLogicalPath(sectorId)) === false) {
      RESOLVED_SUMMARY_SECTOR_CACHE.set(sectorId, {});
      continue;
    }
    uniqueSectors.push(sectorId);
  }

  if (uniqueSectors.length === 0) {
    return;
  }

  await Promise.allSettled(
    uniqueSectors.map((sectorId) => loadSummarySector(sectorId, fetchImpl, signal, onLoaded)),
  );
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
};

function resolveSectorIdFromSearchEntry(id: string): string | undefined {
  const entry = getCachedSearchEntryById(id);
  if (!entry) {
    return undefined;
  }
  if (entry.k === undefined || entry.k === 1) {
    if (entry.p) {
      return formatSectorId(entry.p[0], entry.p[1], entry.p[2]);
    }
    if (entry.h === 1 || id === SOL_REFERENCE_TARGET.id) {
      return formatSectorId(0, 0, 0);
    }
  }
  return undefined;
}

/**
 * Fetches and caches the spatial summary shard (`public/data/summaries/<sectorId>.json`)
 * for a given entity ID using O(1) search entry coordinates or `details/routing.json`.
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

  let sectorId = resolveSectorIdFromSearchEntry(id);
  if (!sectorId) {
    const routing = await fetchDetailsRoutingTable(fetchImpl, signal);
    const sectorIdx = routing?.s[id];
    if (sectorIdx !== undefined) {
      sectorId = routing?.k[sectorIdx];
    }
  }
  if (!sectorId) {
    return undefined;
  }

  await loadSummarySector(sectorId, fetchImpl, signal, onLoaded);
  return getCachedSummaryNode(id);
};

/**
 * Fetches and caches the summary sector shard for a given 32-bit FNV-1a ID hash.
 * When `sectorId` is provided, resolves strictly within that sector's shard.
 */
export const fetchSummaryNodeByHash = async (
  idHash: number,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  onLoaded?: () => void,
  sectorId?: string,
): Promise<SystemSummaryNode | undefined> => {
  if (!Number.isFinite(idHash)) {
    return undefined;
  }
  const unsignedHash = idHash >>> 0;
  if (sectorId) {
    const cachedInSector = getCachedSummaryNodeByHashInSector(sectorId, unsignedHash);
    if (cachedInSector) {
      return cachedInSector;
    }
    if (RESOLVED_SUMMARY_SECTOR_CACHE.has(sectorId)) {
      return undefined;
    }
    await loadSummarySector(sectorId, fetchImpl, signal, onLoaded);
    return getCachedSummaryNodeByHashInSector(sectorId, unsignedHash);
  }

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
  SUMMARY_SECTOR_CACHE.clear();
  RESOLVED_SUMMARY_SECTOR_CACHE.clear();
  RESOLVED_SUMMARY_HASH_INDEX.clear();
  RESOLVED_SUMMARY_NODE_CACHE.clear();
};
