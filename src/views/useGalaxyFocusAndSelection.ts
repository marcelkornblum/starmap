import { useMemo } from 'react';
import type { SpatialEntityDefinition } from '../types/spatial';
import { findFocusedEntryInCorpus } from '../services/search/searchCorpusHelpers';
import { resolveFocusedEntityFromCorpus } from '../services/search/searchSelection';
import { resolveSelectedSystemsFromUrlSelect } from '../services/search/searchUrlSelectionResolvers';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import type { DatasetLayerIndexEntry, DatasetLayerManifest } from '../types/datasetLayers';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

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

const EMPTY_ENTITIES: readonly SpatialEntityDefinition[] = [];

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
        const pos = storeFocusedEntity.position;
        const isPlaceholderZero = Array.isArray(pos)
          ? pos[0] === 0 && pos[1] === 0 && pos[2] === 0
          : pos.x === 0 && pos.y === 0 && pos.z === 0;
        const hasRealNonZeroCoords =
          realEntry.p !== undefined &&
          (realEntry.p[0] !== 0 || realEntry.p[1] !== 0 || realEntry.p[2] !== 0);
        const nextPosition: SpatialEntityDefinition['position'] =
          isPlaceholderZero && realEntry.i !== SOL_REFERENCE_TARGET.id && hasRealNonZeroCoords && realEntry.p
            ? [realEntry.p[0], realEntry.p[1], realEntry.p[2]]
            : storeFocusedEntity.position;
        if (
          nextName === storeFocusedEntity.name &&
          nextSpectral === storeFocusedEntity.spectralType &&
          nextPosition === storeFocusedEntity.position
        ) {
          return storeFocusedEntity;
        }
        return {
          ...storeFocusedEntity,
          name: nextName,
          spectralType: nextSpectral,
          position: nextPosition,
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
    if (!focusedEntity) {
      return selectedEntities.length > 0 ? selectedEntities : EMPTY_ENTITIES;
    }
    if (selectedEntities.some((e) => e.id === focusedEntity.id)) {
      return selectedEntities;
    }
    return [focusedEntity, ...selectedEntities];
  }, [focusedEntity, selectedEntities]);

  const targetSystemId = useMemo(() => {
    const matchedEntry = focusedEntity
      ? (findFocusedEntryInCorpus(focusedEntity.id, apertureCorpus) ??
         findFocusedEntryInCorpus(focusedEntity.name, apertureCorpus))
      : undefined;
    const urlSystemEntry = urlFocusSlug
      ? findFocusedEntryInCorpus(urlFocusSlug, apertureCorpus)
      : undefined;
    return (
      matchedEntry?.s ??
      matchedEntry?.i ??
      urlSystemEntry?.s ??
      urlSystemEntry?.i ??
      focusedEntity?.parentBodyId ??
      focusedEntity?.id ??
      ''
    );
  }, [focusedEntity, urlFocusSlug, apertureCorpus]);

  return {
    focusedEntity,
    urlSelectedEntities,
    selectedEntities,
    canvasEntities,
    targetSystemId,
  };
}
