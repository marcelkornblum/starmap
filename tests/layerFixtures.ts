import { LAYER_MANIFESTS } from '../content/layers';
import {
  clearLayerRepositoryCache,
  fetchEntityAnnotations,
  fetchLayerManifest,
} from '../src/data/layerRepository';
import { useLayerStore } from '../src/stores/useLayerStore';
import type { DatasetLayerIndexEntry } from '../src/types/astro';
import { getShardKey } from '../src/utils/compactDataCodec';
import {
  buildEntityAnnotationBuckets,
  buildLayerIndexManifest,
  decodeEntityAnnotation,
  encodeLayerManifest,
  type DecodedEntityAnnotation,
} from '../src/utils/datasetLayerCodec';

/**
 * Layer index entries derived from the authored layers via the production builder.
 */
export const LAYER_INDEX_ENTRIES: readonly DatasetLayerIndexEntry[] =
  buildLayerIndexManifest(LAYER_MANIFESTS).d;

const ANNOTATION_BUCKETS = buildEntityAnnotationBuckets(LAYER_MANIFESTS);

/**
 * Decoded by-entity annotation records for the given entity IDs, mirroring the
 * runtime union lookup (`records[id]` for each id, deduplicated by layer + target).
 */
export function annotationRecordsFor(
  entityIds: readonly string[],
): readonly DecodedEntityAnnotation[] {
  const seen = new Set<string>();
  const records: DecodedEntityAnnotation[] = [];
  for (const id of entityIds) {
    for (const compact of ANNOTATION_BUCKETS[getShardKey(id)]?.[id] ?? []) {
      const key = `${compact.i}:${compact.t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      records.push(decodeEntityAnnotation(compact));
    }
  }
  return records;
}

const jsonResponse = (payload: unknown, ok = true): Response =>
  ({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => payload,
  }) as unknown as Response;

/**
 * Fetch implementation serving the generated layer shards (index, per-layer manifests and
 * by-entity buckets) from the authored layers via the production encoders.
 */
export function createLayerFetch(): typeof fetch {
  return (async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    if (url.endsWith('/data/overlays/layers/index.json')) {
      return jsonResponse(buildLayerIndexManifest(LAYER_MANIFESTS));
    }
    const bucketMatch = /\/by-entity\/([0-9a-z])\.json$/.exec(url);
    if (bucketMatch) {
      const bucket = bucketMatch[1]!;
      const entities = ANNOTATION_BUCKETS[bucket] ?? {};
      return jsonResponse({ i: bucket, c: Object.keys(entities).length, d: entities });
    }
    for (const layer of LAYER_MANIFESTS) {
      if (url.endsWith(`/data/overlays/layers/${layer.layerId}.json`)) {
        return jsonResponse(encodeLayerManifest(layer));
      }
    }
    return jsonResponse({}, false);
  }) as typeof fetch;
}

/**
 * Seeds the layer runtime (index store plus manifest and by-entity caches) so that
 * synchronous renders of views read the same data the bootstrap and hooks would fetch.
 */
export async function seedLayerRuntime(options: {
  readonly manifestIds?: readonly string[];
  readonly entityIds?: readonly string[];
}): Promise<void> {
  clearLayerRepositoryCache();
  const fetchImpl = createLayerFetch();
  useLayerStore.setState({ index: LAYER_INDEX_ENTRIES, status: 'ready' });
  await Promise.all(
    (options.manifestIds ?? []).map((id) => fetchLayerManifest(id, fetchImpl)),
  );
  await fetchEntityAnnotations(options.entityIds ?? [], fetchImpl);
}

/**
 * Seeds every authored layer manifest and every by-entity annotation bucket.
 */
export async function seedAllLayerData(): Promise<void> {
  await seedLayerRuntime({
    manifestIds: LAYER_MANIFESTS.map((layer) => layer.layerId),
    entityIds: LAYER_MANIFESTS.flatMap((layer) =>
      Object.values(layer.entries).flatMap((entry) => [
        entry.targetId,
        entry.systemId,
      ]),
    ),
  });
}

/**
 * Resets the layer runtime to its pristine, unloaded state.
 */
export function resetLayerRuntime(): void {
  clearLayerRepositoryCache();
  useLayerStore.setState({ index: [], status: 'idle' });
}
