import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  areEntityAnnotationsCached,
  fetchEntityAnnotations,
  fetchLayerManifest,
  getCachedEntityAnnotations,
  getCachedLayerManifest,
} from '../data/layerRepository';
import { extractUrlSelectSlugs } from '../services/search/searchUrlSelection';
import { findCanonLayerById } from '../utils/datasetLayerSlugs';
import { useLayerStore } from '../stores/useLayerStore';
import type { DatasetLayerIndexEntry, DatasetLayerManifest } from '../types/datasetLayers';
import type { DecodedEntityAnnotation } from '../utils/datasetLayerTypes';
import { parseLayerQueryParam } from '../utils/url';

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
  const [loadTick, setLoadTick] = useState<number>(0);

  const selectLayerSlugs = extractUrlSelectSlugs(search, layerIndex).layerSlugs;
  const rawLayers = new URLSearchParams(search).getAll('layer');
  const layerParamSlugs: string[] = [];
  for (const raw of rawLayers) {
    const parsed = parseLayerQueryParam(raw);
    if (parsed) {
      const matched = findCanonLayerById(parsed.layerSlug, layerIndex);
      layerParamSlugs.push(matched ? matched.layerId : parsed.layerSlug);
    }
  }

  const layerIds = [...new Set([...selectLayerSlugs, ...layerParamSlugs])];
  const layerKey = layerIds.join(',');

  useEffect(() => {
    if (!layerKey || typeof window === 'undefined') {
      return;
    }
    const ids = layerKey.split(',');
    if (ids.every((id) => getCachedLayerManifest(id) !== undefined)) {
      return;
    }
    let cancelled = false;
    void Promise.all(
      ids.map((id) => fetchLayerManifest(id).catch(() => undefined)),
    ).then(() => {
      if (!cancelled) {
        if (import.meta.env.MODE !== 'test') {
          startTransition(() => {
            setLoadTick((n) => n + 1);
          });
        } else {
          setLoadTick((n) => n + 1);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [layerKey]);

  return useMemo(() => {
    if (!layerKey || loadTick < 0) {
      return [];
    }
    return layerKey.split(',').flatMap((id) => {
      const manifest = getCachedLayerManifest(id);
      return manifest ? [manifest] : [];
    });
  }, [layerKey, loadTick]);
};

/**
 * Resolves the decoded by-entity canon annotation records for the given entity IDs.
 * Already-fetched buckets are returned synchronously; missing ones are fetched once and
 * trigger a re-render.
 */
export const useEntityAnnotations = (
  entityIds: readonly string[],
): readonly DecodedEntityAnnotation[] => {
  const [loadTick, setLoadTick] = useState<number>(0);
  const entityKey = [...new Set(entityIds.filter((id) => id.length > 0))].join('\n');

  useEffect(() => {
    if (!entityKey || typeof window === 'undefined') {
      return;
    }
    const ids = entityKey.split('\n');
    if (ids.length === 0 || areEntityAnnotationsCached(ids)) {
      return;
    }
    let cancelled = false;
    void fetchEntityAnnotations(ids)
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) {
          if (import.meta.env.MODE !== 'test') {
            startTransition(() => {
              setLoadTick((n) => n + 1);
            });
          } else {
            setLoadTick((n) => n + 1);
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entityKey]);

  return useMemo(() => {
    if (loadTick < 0) {
      return [];
    }
    return getCachedEntityAnnotations(entityKey ? entityKey.split('\n') : []);
  }, [entityKey, loadTick]);
};
