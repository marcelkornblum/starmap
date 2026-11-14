import { useMemo } from 'react';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
import {
  findFocusedEntryInCorpus,
  resolveFocusedEntityFromCorpus,
  resolveSelectedSystemsFromUrlSelect,
  toUrlSlug,
} from '../services/searchService';
import type { DatasetLayerIndexEntry, DatasetLayerManifest } from '../types/astro';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface UseGalaxyFocusAndSelectionParams {
  readonly urlFocusSlug: string | null;
  readonly storeFocusedEntity: SpatialEntityDefinition | null;
  readonly apertureCorpus: readonly CompactSearchEntry[];
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly storeSelected: readonly SpatialEntityDefinition[];
  readonly layerIndex: readonly DatasetLayerIndexEntry[];
  readonly loadedLayers: readonly DatasetLayerManifest[];
  readonly selectQuery: string;
}

export function useGalaxyFocusAndSelection({
  urlFocusSlug,
  storeFocusedEntity,
  apertureCorpus,
  activeCorpus,
  storeSelected,
  layerIndex,
  loadedLayers,
  selectQuery,
}: UseGalaxyFocusAndSelectionParams) {
  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, apertureCorpus)
        : null,
    [urlFocusSlug, apertureCorpus],
  );

  const focusedEntity = useMemo(() => {
    if (!urlFocusSlug) return storeFocusedEntity;
    if (
      storeFocusedEntity &&
      (storeFocusedEntity.id === urlFocusSlug ||
        toUrlSlug(storeFocusedEntity.id) === urlFocusSlug ||
        toUrlSlug(storeFocusedEntity.name) === urlFocusSlug)
    ) {
      const realEntry = findFocusedEntryInCorpus(urlFocusSlug, apertureCorpus);
      if (realEntry && realEntry.i === storeFocusedEntity.id) {
        const nextName = storeFocusedEntity.name || realEntry.n || realEntry.i;
        const nextSpectral = storeFocusedEntity.spectralType ?? realEntry.m?.[1];
        if (
          nextName === storeFocusedEntity.name &&
          nextSpectral === storeFocusedEntity.spectralType
        ) {
          return storeFocusedEntity;
        }
        return {
          ...storeFocusedEntity,
          name: nextName,
          spectralType: nextSpectral,
        };
      }
      if (!realEntry) return storeFocusedEntity;
    }
    return urlFocusEntity ?? storeFocusedEntity;
  }, [urlFocusSlug, storeFocusedEntity, apertureCorpus, urlFocusEntity]);

  const urlSelectedEntities = useMemo(
    () =>
      resolveSelectedSystemsFromUrlSelect(
        selectQuery,
        activeCorpus,
        layerIndex,
        loadedLayers,
      ),
    [activeCorpus, layerIndex, loadedLayers, selectQuery],
  );

  const selectedEntities = useMemo(
    () => (storeSelected.length > 0 ? storeSelected : urlSelectedEntities),
    [storeSelected, urlSelectedEntities],
  );

  const canvasEntities = useMemo(() => {
    if (!focusedEntity) return selectedEntities;
    if (selectedEntities.some((e) => e.id === focusedEntity.id)) {
      return selectedEntities;
    }
    return [focusedEntity, ...selectedEntities];
  }, [focusedEntity, selectedEntities]);

  const matchedEntry = focusedEntity
    ? (findFocusedEntryInCorpus(focusedEntity.id, apertureCorpus) ??
       findFocusedEntryInCorpus(focusedEntity.name, apertureCorpus))
    : undefined;
  const urlSystemEntry = urlFocusSlug
    ? findFocusedEntryInCorpus(urlFocusSlug, apertureCorpus)
    : undefined;
  const targetSystemId =
    matchedEntry?.s ??
    matchedEntry?.i ??
    urlSystemEntry?.s ??
    urlSystemEntry?.i ??
    focusedEntity?.parentBodyId ??
    focusedEntity?.id ??
    '';

  return {
    focusedEntity,
    urlSelectedEntities,
    selectedEntities,
    canvasEntities,
    targetSystemId,
  };
}
