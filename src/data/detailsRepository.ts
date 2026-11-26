import type {
  ExoplanetRecord,
  SystemManifest,
  SystemSummaryNode,
} from '../types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../types/astroStructures';
import { decodeSystemManifest, getShardKey } from '../utils/compactDataCodec';
import { decodeGalacticStructure, decodeSolarSystemBody } from '../utils/compactEntityDecoder';
import type { CompactDetailRecord } from '../utils/compactDataTypes';
import { BoundedLruCache } from '../utils/lruCache';
import { formatSectorId } from '../utils/sectorMath';
import {
  DETAIL_BUCKET_CACHE_LIMIT,
  DETAIL_RECORD_CACHE_LIMIT,
} from '../config/cacheConfig';
import { COMPACT_SOLAR_BODY_TAG, SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import { clearDetailsRoutingCache, fetchDetailsRoutingTable } from './detailsRouting';
import { getCachedSearchEntryById } from './searchRepository';
import { loadShardedEnvelopeData } from './shardFetchHelper';
import {
  clearSummaryCache,
  fetchSummaryNode as fetchSummaryNodeImpl,
  fetchSummaryNodeByHash as fetchSummaryNodeByHashImpl,
  getCachedSummaryNode,
  getCachedSummaryNodeByHash,
  getCachedSummaryNodeByHashInSector,
  isSummarySectorCached,
  loadSummarySector as loadSummarySectorImpl,
  preloadSummarySectors as preloadSummarySectorsImpl,
  seedSummaryNode as seedSummaryNodeImpl,
} from './detailsSummaryCache';

export {
  fetchDetailsRoutingTable,
  getCachedSummaryNode,
  getCachedSummaryNodeByHash,
  getCachedSummaryNodeByHashInSector,
  isSummarySectorCached,
};

export type DecodedDetailRecord =
  | { readonly kind: 'system'; readonly record: SystemManifest }
  | { readonly kind: 'structure'; readonly record: GalacticStructureRecord }
  | { readonly kind: 'solar-body'; readonly record: SolarSystemBodyRecord };

const SECTOR_SHARD_PREFIX = 'details/sectors/';
const SOL_PRIMARY_SHARD = 'details/sol-primary.json';
const STRUCTURES_SHARD = 'details/structures.json';
const MINOR_INFERRED_PREFIXES = ['pha-', 'distant-', 'comet-'] as const;

const detailsListeners = new Set<() => void>();
let detailsRepoVersion = 0;

export const getDetailsRepositoryVersion = (): number => detailsRepoVersion;

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

export const loadSummarySector = (
  sectorId: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
) => loadSummarySectorImpl(sectorId, fetchImpl, signal, notifyDetailsListeners);

export const preloadSummarySectors = (
  sectorIds: readonly string[],
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
) => preloadSummarySectorsImpl(sectorIds, fetchImpl, signal, notifyDetailsListeners);

export const fetchSummaryNode = async (
  id: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SystemSummaryNode | undefined> =>
  fetchSummaryNodeImpl(id, fetchImpl, signal, notifyDetailsListeners);

export const fetchSummaryNodeByHash = async (
  idHash: number,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  sectorId?: string,
): Promise<SystemSummaryNode | undefined> =>
  fetchSummaryNodeByHashImpl(idHash, fetchImpl, signal, notifyDetailsListeners, sectorId);

export const seedSummaryNode = (
  id: string,
  node: SystemSummaryNode,
): void => {
  seedSummaryNodeImpl(id, node, notifyDetailsListeners);
};

const DETAIL_SHARD_CACHE = new BoundedLruCache<
  string,
  Promise<Record<string, CompactDetailRecord>>
>(DETAIL_BUCKET_CACHE_LIMIT);
const RESOLVED_DETAIL_SHARD_CACHE = new BoundedLruCache<
  string,
  Record<string, CompactDetailRecord>
>(DETAIL_BUCKET_CACHE_LIMIT);
const RESOLVED_DETAIL_RECORD_CACHE = new BoundedLruCache<
  string,
  DecodedDetailRecord
>(DETAIL_RECORD_CACHE_LIMIT);

function extractSectorIdFromShardPath(shardPath: string): string | undefined {
  if (!shardPath.startsWith(SECTOR_SHARD_PREFIX) || !shardPath.endsWith('.json')) {
    return undefined;
  }
  return shardPath.slice(SECTOR_SHARD_PREFIX.length, -'.json'.length);
}

/**
 * Pure decoder converting a `CompactDetailRecord` into its strongly-typed domain representation.
 */
export const decodeDetailRecord = (
  compact: CompactDetailRecord,
  id: string,
  fallbackSectorId?: string,
): DecodedDetailRecord => {
  if (compact.t === 'str') {
    return { kind: 'structure', record: decodeGalacticStructure(compact, id) };
  }
  if (compact.t === COMPACT_SOLAR_BODY_TAG) {
    return { kind: 'solar-body', record: decodeSolarSystemBody(compact, id) };
  }
  return { kind: 'system', record: decodeSystemManifest(compact, id, fallbackSectorId) };
};

/**
 * Synchronously retrieves a decoded detail record by ID if already cached in memory.
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
  for (const [shardPath, shardData] of RESOLVED_DETAIL_SHARD_CACHE.entries()) {
    const compact = shardData[id];
    if (compact) {
      const decoded = decodeDetailRecord(
        compact,
        id,
        extractSectorIdFromShardPath(shardPath),
      );
      RESOLVED_DETAIL_RECORD_CACHE.set(id, decoded);
      return decoded;
    }
  }
  return undefined;
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

function resolveFastDetailShardPath(id: string): string | undefined {
  if (MINOR_INFERRED_PREFIXES.some((prefix) => id.startsWith(prefix))) {
    return `details/sol-minor/${getShardKey(id)}.json`;
  }

  const cachedSummary = getCachedSummaryNode(id);
  if (cachedSummary) {
    return `${SECTOR_SHARD_PREFIX}${cachedSummary.sectorId}.json`;
  }

  const searchEntry = getCachedSearchEntryById(id);
  if (!searchEntry) {
    return undefined;
  }

  if (searchEntry.k === undefined || searchEntry.k === 1) {
    if (searchEntry.p) {
      const sectorId = formatSectorId(searchEntry.p[0], searchEntry.p[1], searchEntry.p[2]);
      return `${SECTOR_SHARD_PREFIX}${sectorId}.json`;
    }
    if (searchEntry.h === 1 || id === SOL_REFERENCE_TARGET.id) {
      return `${SECTOR_SHARD_PREFIX}${formatSectorId(0, 0, 0)}.json`;
    }
  } else if (searchEntry.k === 2) {
    if (searchEntry.s === SOL_REFERENCE_TARGET.id || searchEntry.h === 1) {
      return SOL_PRIMARY_SHARD;
    }
  } else if (searchEntry.k === 3 || searchEntry.k === 4 || searchEntry.k === 6) {
    return SOL_PRIMARY_SHARD;
  } else if (searchEntry.k === 5) {
    return STRUCTURES_SHARD;
  }

  return undefined;
}

/**
 * Fetches and caches the hybrid detail shard (`sectors/`, `sol-primary`, `sol-minor/`, `structures`)
 * for a given entity ID, using O(1) cache/search inference before falling back to `details/routing.json`.
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

  let shardPath = resolveFastDetailShardPath(id);
  if (!shardPath) {
    const routing = await fetchDetailsRoutingTable(fetchImpl, signal);
    const code = routing?.d[id];
    if (code === undefined) {
      return undefined;
    }
    if (code === -1) {
      shardPath = SOL_PRIMARY_SHARD;
    } else if (code === -2) {
      shardPath = STRUCTURES_SHARD;
    } else if (code === -3) {
      shardPath = `details/sol-minor/${getShardKey(id)}.json`;
    } else if (code >= 0) {
      const sectorId = routing?.k[code];
      if (!sectorId) {
        return undefined;
      }
      shardPath = `${SECTOR_SHARD_PREFIX}${sectorId}.json`;
    }
  }

  if (!shardPath) {
    return undefined;
  }

  await loadShardedEnvelopeData({
    cacheKey: shardPath,
    logicalPath: shardPath,
    label: `detail shard "${shardPath}"`,
    pendingCache: DETAIL_SHARD_CACHE,
    resolvedCache: RESOLVED_DETAIL_SHARD_CACHE,
    fetchImpl,
    signal,
    onLoaded: notifyDetailsListeners,
  });
  return getCachedDetailRecord(id);
};

export const isSolPrimaryShardCached = (): boolean =>
  RESOLVED_DETAIL_SHARD_CACHE.has(SOL_PRIMARY_SHARD);

export const fetchSolPrimaryShard = async (
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<boolean> => {
  if (RESOLVED_DETAIL_SHARD_CACHE.has(SOL_PRIMARY_SHARD)) {
    return true;
  }
  await loadShardedEnvelopeData({
    cacheKey: SOL_PRIMARY_SHARD,
    logicalPath: SOL_PRIMARY_SHARD,
    label: `detail shard "${SOL_PRIMARY_SHARD}"`,
    pendingCache: DETAIL_SHARD_CACHE,
    resolvedCache: RESOLVED_DETAIL_SHARD_CACHE,
    fetchImpl,
    signal,
    onLoaded: notifyDetailsListeners,
  });
  return RESOLVED_DETAIL_SHARD_CACHE.has(SOL_PRIMARY_SHARD);
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
 * Clears all in-memory summary, routing, and detail shard caches (used in tests).
 */
export const clearDetailsRepositoryCache = (): void => {
  clearSummaryCache();
  clearDetailsRoutingCache();
  DETAIL_SHARD_CACHE.clear();
  RESOLVED_DETAIL_SHARD_CACHE.clear();
  RESOLVED_DETAIL_RECORD_CACHE.clear();
  notifyDetailsListeners();
};
