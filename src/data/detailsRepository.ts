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

export type DecodedDetailRecord =
  | { readonly kind: 'system'; readonly record: SystemManifest }
  | { readonly kind: 'structure'; readonly record: GalacticStructureRecord }
  | { readonly kind: 'solar-body'; readonly record: SolarSystemBodyRecord };

const SUMMARY_BUCKET_CACHE = new Map<
  string,
  Promise<Record<string, CompactSummaryNode>>
>();
const RESOLVED_SUMMARY_BUCKET_CACHE = new Map<
  string,
  Record<string, CompactSummaryNode>
>();

const DETAIL_BUCKET_CACHE = new Map<
  string,
  Promise<Record<string, CompactDetailRecord>>
>();
const RESOLVED_DETAIL_BUCKET_CACHE = new Map<
  string,
  Record<string, CompactDetailRecord>
>();

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
  const bucketKey = getShardKey(id);
  const bucket = RESOLVED_SUMMARY_BUCKET_CACHE.get(bucketKey);
  const compact = bucket?.[id];
  return compact ? decodeSummaryNode(compact, id) : undefined;
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
  const bucketKey = getShardKey(id);
  const bucket = RESOLVED_DETAIL_BUCKET_CACHE.get(bucketKey);
  const compact = bucket?.[id];
  return compact ? decodeDetailRecord(compact, id) : undefined;
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

/**
 * Fetches and caches the summary shard bucket (`public/data/summaries/<0..z>.json`) for a given entity ID.
 */
export const fetchSummaryNode = async (
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SystemSummaryNode | undefined> => {
  if (!id) {
    return undefined;
  }
  const cached = getCachedSummaryNode(id);
  if (cached) {
    return cached;
  }

  const bucketKey = getShardKey(id);
  let pending = SUMMARY_BUCKET_CACHE.get(bucketKey);
  if (!pending) {
    pending = (async () => {
      const response = await fetchImpl(`/data/summaries/${bucketKey}.json`);
      if (!response.ok) {
        throw new Error(
          `Failed to load summary shard "${bucketKey}": ${response.status} ${response.statusText}`,
        );
      }
      const envelope =
        (await response.json()) as ShardedBucketEnvelope<CompactSummaryNode>;
      const data = envelope.d ?? {};
      RESOLVED_SUMMARY_BUCKET_CACHE.set(bucketKey, data);
      return data;
    })().catch((err: unknown) => {
      SUMMARY_BUCKET_CACHE.delete(bucketKey);
      throw err;
    });
    SUMMARY_BUCKET_CACHE.set(bucketKey, pending);
  }

  const dict = await pending;
  const compact = dict[id];
  return compact ? decodeSummaryNode(compact, id) : undefined;
};

/**
 * Fetches and caches the detail shard bucket (`public/data/details/<0..z>.json`) for a given entity ID.
 */
export const fetchDetailRecord = async (
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DecodedDetailRecord | undefined> => {
  if (!id) {
    return undefined;
  }
  const cached = getCachedDetailRecord(id);
  if (cached) {
    return cached;
  }

  const bucketKey = getShardKey(id);
  let pending = DETAIL_BUCKET_CACHE.get(bucketKey);
  if (!pending) {
    pending = (async () => {
      const response = await fetchImpl(`/data/details/${bucketKey}.json`);
      if (!response.ok) {
        throw new Error(
          `Failed to load detail shard "${bucketKey}": ${response.status} ${response.statusText}`,
        );
      }
      const envelope =
        (await response.json()) as ShardedBucketEnvelope<CompactDetailRecord>;
      const data = envelope.d ?? {};
      RESOLVED_DETAIL_BUCKET_CACHE.set(bucketKey, data);
      return data;
    })().catch((err: unknown) => {
      DETAIL_BUCKET_CACHE.delete(bucketKey);
      throw err;
    });
    DETAIL_BUCKET_CACHE.set(bucketKey, pending);
  }

  const dict = await pending;
  const compact = dict[id];
  return compact ? decodeDetailRecord(compact, id) : undefined;
};

/**
 * Clears all in-memory summary and detail bucket caches (used in tests).
 */
export const clearDetailsRepositoryCache = (): void => {
  SUMMARY_BUCKET_CACHE.clear();
  RESOLVED_SUMMARY_BUCKET_CACHE.clear();
  DETAIL_BUCKET_CACHE.clear();
  RESOLVED_DETAIL_BUCKET_CACHE.clear();
};
