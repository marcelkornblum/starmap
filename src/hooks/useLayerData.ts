import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  fetchEntityAnnotations,
  fetchLayerManifest,
  getCachedEntityAnnotations,
  getCachedLayerManifest,
} from '../data/layerRepository';
import { extractUrlSelectSlugs } from '../services/searchService';
import { useLayerStore } from '../stores/useLayerStore';
import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../types/astro';
import type { DecodedEntityAnnotation } from '../utils/datasetLayerCodec';

const getLayerIndexSnapshot = (): readonly DatasetLayerIndexEntry[] =>
  useLayerStore.getState().index;

/**
 * Subscribes to the bootstrapped layer index. The same snapshot is used for server rendering so
 * that synchronous renders observe the current index rather than the store's initial state.
 */
export const useLayerIndex = (): readonly DatasetLayerIndexEntry[] =>
  useSyncExternalStore(
    useLayerStore.subscribe,
    getLayerIndexSnapshot,
    getLayerIndexSnapshot,
  );

/**
 * Resolves the layer manifests referenced by the URL (`?layer=` / `?select=layer:`) against the
 * bootstrapped layer index. Already-fetched manifests are returned synchronously; missing ones are
 * fetched once and trigger a re-render. Returns only the manifests loaded so far.
 */
export const useLoadedLayerManifests = (
  search: string,
): readonly DatasetLayerManifest[] => {
  const layerIndex = useLayerIndex();
  const [, setLoadTick] = useState<number>(0);

  const layerIds = [
    ...new Set(extractUrlSelectSlugs(search, layerIndex).layerSlugs),
  ];
  const layerKey = layerIds.join(',');

  useEffect(() => {
    if (!layerKey || typeof window === 'undefined') {
      return;
    }
    let cancelled = false;
    void Promise.all(
      layerKey.split(',').map((id) => fetchLayerManifest(id).catch(() => undefined)),
    ).then(() => {
      if (!cancelled) {
        setLoadTick((n) => n + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [layerKey]);

  return layerIds.flatMap((id) => {
    const manifest = getCachedLayerManifest(id);
    return manifest ? [manifest] : [];
  });
};

/**
 * Resolves the decoded by-entity canon annotation records for the given entity IDs.
 * Already-fetched buckets are returned synchronously; missing ones are fetched once and
 * trigger a re-render.
 */
export const useEntityAnnotations = (
  entityIds: readonly string[],
): readonly DecodedEntityAnnotation[] => {
  const [, setLoadTick] = useState<number>(0);
  const entityKey = [...new Set(entityIds.filter((id) => id.length > 0))].join(
    '\n',
  );

  useEffect(() => {
    if (!entityKey || typeof window === 'undefined') {
      return;
    }
    let cancelled = false;
    void fetchEntityAnnotations(entityKey.split('\n'))
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) {
          setLoadTick((n) => n + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entityKey]);

  return getCachedEntityAnnotations(entityIds);
};
