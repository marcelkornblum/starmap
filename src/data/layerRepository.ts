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
import { BoundedLruCache } from '../utils/lruCache';
import {
  LAYER_ENTITY_BUCKET_CACHE_LIMIT,
  LAYER_MANIFEST_CACHE_LIMIT,
} from '../config/cacheConfig';

interface LayerIndexEnvelope {
  readonly d: readonly DatasetLayerIndexEntry[];
}

let layerIndexPromise: Promise<readonly DatasetLayerIndexEntry[]> | undefined;

const MANIFEST_CACHE = new BoundedLruCache<string, Promise<DatasetLayerManifest>>(
  LAYER_MANIFEST_CACHE_LIMIT,
);
const RESOLVED_MANIFEST_CACHE = new BoundedLruCache<string, DatasetLayerManifest>(
  LAYER_MANIFEST_CACHE_LIMIT,
);

const ENTITY_BUCKET_CACHE = new BoundedLruCache<
  string,
  Promise<Record<string, CompactEntityAnnotation[]>>
>(LAYER_ENTITY_BUCKET_CACHE_LIMIT);
const RESOLVED_ENTITY_BUCKET_CACHE = new BoundedLruCache<
  string,
  Record<string, CompactEntityAnnotation[]>
>(LAYER_ENTITY_BUCKET_CACHE_LIMIT);

/**
 * Synchronously retrieves a decoded layer manifest if it has already been fetched.
 */
export const getCachedLayerManifest = (
  layerId: string,
): DatasetLayerManifest | undefined => RESOLVED_MANIFEST_CACHE.get(layerId);

const collectEntityAnnotations = (
  ids: readonly string[],
  bucketsByKey: { get(key: string): Record<string, CompactEntityAnnotation[]> | undefined },
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
  signal?: AbortSignal,
): Promise<readonly DatasetLayerIndexEntry[]> => {
  if (!layerIndexPromise) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        signal.removeEventListener('abort', onAbort!);
        layerIndexPromise = undefined;
      };
      signal.addEventListener('abort', onAbort);
    }

    layerIndexPromise = (async () => {
      try {
        const url = resolveDataUrl('/data/overlays/layers/index.json');
        const response = signal
          ? await fetchImpl(url, { signal })
          : await fetchImpl(url);
        if (!response.ok) {
          throw new Error(
            `Failed to load layer index: ${response.status} ${response.statusText}`,
          );
        }
        const envelope = (await response.json()) as LayerIndexEnvelope;
        return envelope.d ?? [];
      } finally {
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
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
  signal?: AbortSignal,
): Promise<DatasetLayerManifest> => {
  let pending = MANIFEST_CACHE.get(layerId);
  if (!pending) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        signal.removeEventListener('abort', onAbort!);
        if (MANIFEST_CACHE.get(layerId) === pending) {
          MANIFEST_CACHE.delete(layerId);
        }
      };
      signal.addEventListener('abort', onAbort);
    }

    pending = (async () => {
      try {
        const url = resolveDataUrl(`/data/overlays/layers/${layerId}.json`);
        const response = signal
          ? await fetchImpl(url, { signal })
          : await fetchImpl(url);
        if (!response.ok) {
          throw new Error(
            `Failed to load layer manifest "${layerId}": ${response.status} ${response.statusText}`,
          );
        }
        const manifest = decodeLayerManifest((await response.json()) as CompactLayerManifest);
        RESOLVED_MANIFEST_CACHE.set(layerId, manifest);
        return manifest;
      } finally {
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    })().catch((err: unknown) => {
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
  signal?: AbortSignal,
): Promise<Record<string, CompactEntityAnnotation[]>> => {
  let pending = ENTITY_BUCKET_CACHE.get(bucketKey);
  if (!pending) {
    let onAbort: (() => void) | undefined;
    if (signal) {
      onAbort = () => {
        signal.removeEventListener('abort', onAbort!);
        if (ENTITY_BUCKET_CACHE.get(bucketKey) === pending) {
          ENTITY_BUCKET_CACHE.delete(bucketKey);
        }
      };
      signal.addEventListener('abort', onAbort);
    }

    pending = (async () => {
      try {
        const url = resolveDataUrl(`/data/overlays/layers/by-entity/${bucketKey}.json`);
        const response = signal
          ? await fetchImpl(url, { signal })
          : await fetchImpl(url);
        if (!response.ok) {
          throw new Error(
            `Failed to load by-entity layer shard "${bucketKey}": ${response.status} ${response.statusText}`,
          );
        }
        const envelope = (await response.json()) as ShardedBucketEnvelope<
          CompactEntityAnnotation[]
        >;
        const data = envelope.d ?? {};
        RESOLVED_ENTITY_BUCKET_CACHE.set(bucketKey, data);
        return data;
      } finally {
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    })().catch((err: unknown) => {
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
  signal?: AbortSignal,
): Promise<readonly DecodedEntityAnnotation[]> => {
  const ids = normaliseEntityIds(entityIds);
  const bucketKeys = [...new Set(ids.map((id) => getShardKey(id)))];
  const loaded = await Promise.all(
    bucketKeys.map(
      async (key) => [key, await fetchEntityBucket(key, fetchImpl, signal)] as const,
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
