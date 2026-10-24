import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../types/astro';
import {
  getShardKey,
  type ShardedBucketEnvelope,
} from '../utils/compactDataCodec';
import {
  decodeEntityAnnotation,
  decodeLayerManifest,
  type CompactEntityAnnotation,
  type CompactLayerManifest,
  type DecodedEntityAnnotation,
} from '../utils/datasetLayerCodec';
import { resolveDataUrl } from '../utils/url';

interface LayerIndexEnvelope {
  readonly d: readonly DatasetLayerIndexEntry[];
}

let layerIndexPromise: Promise<readonly DatasetLayerIndexEntry[]> | undefined;

const MANIFEST_CACHE = new Map<string, Promise<DatasetLayerManifest>>();
const RESOLVED_MANIFEST_CACHE = new Map<string, DatasetLayerManifest>();

const ENTITY_BUCKET_CACHE = new Map<
  string,
  Promise<Record<string, CompactEntityAnnotation[]>>
>();
const RESOLVED_ENTITY_BUCKET_CACHE = new Map<
  string,
  Record<string, CompactEntityAnnotation[]>
>();

/**
 * Synchronously retrieves a decoded layer manifest if it has already been fetched.
 */
export const getCachedLayerManifest = (
  layerId: string,
): DatasetLayerManifest | undefined => RESOLVED_MANIFEST_CACHE.get(layerId);

const collectEntityAnnotations = (
  ids: readonly string[],
  bucketsByKey: ReadonlyMap<string, Record<string, CompactEntityAnnotation[]>>,
): readonly DecodedEntityAnnotation[] => {
  const seen = new Set<string>();
  const records: DecodedEntityAnnotation[] = [];
  for (const id of ids) {
    for (const compact of bucketsByKey.get(getShardKey(id))?.[id] ?? []) {
      const dedupeKey = `${compact.i}:${compact.t}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      records.push(decodeEntityAnnotation(compact));
    }
  }
  return records;
};

const normaliseEntityIds = (entityIds: readonly string[]): string[] => [
  ...new Set(entityIds.filter((id) => id.length > 0)),
];

/**
 * Synchronously retrieves the decoded union of annotation records for the given entity IDs
 * from by-entity buckets that have already been fetched (unfetched buckets contribute nothing).
 */
export const getCachedEntityAnnotations = (
  entityIds: readonly string[],
): readonly DecodedEntityAnnotation[] =>
  collectEntityAnnotations(
    normaliseEntityIds(entityIds),
    RESOLVED_ENTITY_BUCKET_CACHE,
  );

/**
 * Fetches and caches the dataset layer index (`public/data/overlays/layers/index.json`).
 */
export const fetchLayerIndex = (
  fetchImpl: typeof fetch = fetch,
): Promise<readonly DatasetLayerIndexEntry[]> => {
  if (!layerIndexPromise) {
    layerIndexPromise = (async () => {
      const response = await fetchImpl(
        resolveDataUrl('/data/overlays/layers/index.json'),
      );
      if (!response.ok) {
        throw new Error(
          `Failed to load layer index: ${response.status} ${response.statusText}`,
        );
      }
      const envelope = (await response.json()) as LayerIndexEnvelope;
      return envelope.d ?? [];
    })().catch((err: unknown) => {
      layerIndexPromise = undefined;
      throw err;
    });
  }
  return layerIndexPromise;
};

/**
 * Fetches, decodes and caches a single layer manifest (`public/data/overlays/layers/<layerId>.json`).
 */
export const fetchLayerManifest = (
  layerId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DatasetLayerManifest> => {
  let pending = MANIFEST_CACHE.get(layerId);
  if (!pending) {
    pending = (async () => {
      const response = await fetchImpl(
        resolveDataUrl(`/data/overlays/layers/${layerId}.json`),
      );
      if (!response.ok) {
        throw new Error(
          `Failed to load layer manifest "${layerId}": ${response.status} ${response.statusText}`,
        );
      }
      return decodeLayerManifest((await response.json()) as CompactLayerManifest);
    })()
      .then((manifest) => {
        RESOLVED_MANIFEST_CACHE.set(layerId, manifest);
        return manifest;
      })
      .catch((err: unknown) => {
        MANIFEST_CACHE.delete(layerId);
        throw err;
      });
    MANIFEST_CACHE.set(layerId, pending);
  }
  return pending;
};

const fetchEntityBucket = (
  bucketKey: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, CompactEntityAnnotation[]>> => {
  let pending = ENTITY_BUCKET_CACHE.get(bucketKey);
  if (!pending) {
    pending = (async () => {
      const response = await fetchImpl(
        resolveDataUrl(`/data/overlays/layers/by-entity/${bucketKey}.json`),
      );
      if (!response.ok) {
        throw new Error(
          `Failed to load by-entity layer shard "${bucketKey}": ${response.status} ${response.statusText}`,
        );
      }
      const envelope = (await response.json()) as ShardedBucketEnvelope<
        CompactEntityAnnotation[]
      >;
      return envelope.d ?? {};
    })().then((data) => {
      RESOLVED_ENTITY_BUCKET_CACHE.set(bucketKey, data);
      return data;
    }).catch((err: unknown) => {
      ENTITY_BUCKET_CACHE.delete(bucketKey);
      throw err;
    });
    ENTITY_BUCKET_CACHE.set(bucketKey, pending);
  }
  return pending;
};

/**
 * Fetches the by-entity annotation buckets covering the given entity IDs (cached per bucket)
 * and returns the decoded union of `records[id]`, deduplicated by layer + target.
 */
export const fetchEntityAnnotations = async (
  entityIds: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<readonly DecodedEntityAnnotation[]> => {
  const ids = normaliseEntityIds(entityIds);
  const bucketKeys = [...new Set(ids.map((id) => getShardKey(id)))];
  const loaded = await Promise.all(
    bucketKeys.map(
      async (key) => [key, await fetchEntityBucket(key, fetchImpl)] as const,
    ),
  );
  return collectEntityAnnotations(ids, new Map(loaded));
};

/**
 * Clears all in-memory layer caches (used in tests).
 */
export const clearLayerRepositoryCache = (): void => {
  layerIndexPromise = undefined;
  MANIFEST_CACHE.clear();
  RESOLVED_MANIFEST_CACHE.clear();
  ENTITY_BUCKET_CACHE.clear();
  RESOLVED_ENTITY_BUCKET_CACHE.clear();
};
