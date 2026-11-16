import type {
  DatasetLayerIndexEntry,
  DatasetLayerManifest,
} from '../../../types/datasetLayers';
import { findFocusedEntryInCorpus } from '../../../services/search/searchCorpusHelpers';
import {
  resolveFocusedEntityFromCorpus,
  resolveSelectedSystemsFromSearchResults,
} from '../../../services/search/searchSelection';
import { resolveSelectedSystemsFromUrlSelect } from '../../../services/search/searchUrlSelectionResolvers';
import type { GroupedSearchResults } from '../../../services/search/searchTypes';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import { extractUrlRouteStops } from '../../../services/journey/journeyProfilesAndUrls';
import type { SpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';

export const syncSelectedSystemsToStore = (
  store: SpatialEntityStore,
  results: GroupedSearchResults,
  activeSearch: string,
  corpus: readonly CompactSearchEntry[],
  layerIndex: readonly DatasetLayerIndexEntry[],
  loadedLayers: readonly DatasetLayerManifest[],
): void => {
  const urlSelected =
    results.query.trim().length === 0
      ? resolveSelectedSystemsFromUrlSelect(
          activeSearch,
          corpus,
          layerIndex,
          loadedLayers,
        )
      : [];
  const selectedSystems =
    urlSelected.length > 0
      ? urlSelected
      : resolveSelectedSystemsFromSearchResults(results);
  const state = store.getState();
  for (const system of selectedSystems) {
    state.registerEntity(system);
  }
  state.setSelectedIds(selectedSystems.map((s) => s.id));
};

export const syncUrlFocusToStore = (
  store: SpatialEntityStore,
  focusSlug: string | null,
  corpus: readonly CompactSearchEntry[],
  fallbackFocusIdRef?: { current: string | null },
  activeSearch = '',
): void => {
  const state = store.getState();
  const routeStops = extractUrlRouteStops(activeSearch);
  const firstRouteStop = routeStops && routeStops.length > 0 ? routeStops[0] : null;

  if (!focusSlug && !firstRouteStop) {
    if (
      fallbackFocusIdRef?.current &&
      !state.apertureIds.has(fallbackFocusIdRef.current)
    ) {
      state.unregisterEntity(fallbackFocusIdRef.current);
    }
    if (fallbackFocusIdRef) {
      fallbackFocusIdRef.current = null;
    }
    state.setFocused(null);
    return;
  }

  let primaryEntity = null;
  let hasValidPosition = false;
  if (focusSlug) {
    const matchedId = state.resolveEntityId(focusSlug);
    const existingMatch = matchedId ? state.entities[matchedId] : undefined;
    hasValidPosition = Boolean(
      existingMatch &&
        (existingMatch.id === SOL_REFERENCE_TARGET.id ||
          (Array.isArray(existingMatch.position)
            ? existingMatch.position[0] !== 0 ||
              existingMatch.position[1] !== 0 ||
              existingMatch.position[2] !== 0
            : existingMatch.position.x !== 0 ||
              existingMatch.position.y !== 0 ||
              existingMatch.position.z !== 0)),
    );

    primaryEntity =
      hasValidPosition && existingMatch
        ? existingMatch
        : resolveFocusedEntityFromCorpus(focusSlug, corpus);
  }
  const routeOriginEntity = firstRouteStop
    ? resolveFocusedEntityFromCorpus(firstRouteStop, corpus)
    : null;

  if (!primaryEntity && !routeOriginEntity) {
    state.setFocused(null);
    return;
  }

  if (
    fallbackFocusIdRef?.current &&
    fallbackFocusIdRef.current !== primaryEntity?.id &&
    fallbackFocusIdRef.current !== routeOriginEntity?.id &&
    !state.apertureIds.has(fallbackFocusIdRef.current)
  ) {
    state.unregisterEntity(fallbackFocusIdRef.current);
  }
  if (fallbackFocusIdRef && focusSlug && primaryEntity) {
    const matchedInCorpus = findFocusedEntryInCorpus(focusSlug, corpus);
    fallbackFocusIdRef.current =
      matchedInCorpus || hasValidPosition ? null : primaryEntity.id;
  }

  const focusedIds: string[] = [];
  if (primaryEntity) {
    state.registerEntity(primaryEntity);
    focusedIds.push(primaryEntity.id);
  }
  if (routeOriginEntity) {
    state.registerEntity(routeOriginEntity);
    if (!focusedIds.includes(routeOriginEntity.id)) {
      focusedIds.push(routeOriginEntity.id);
    }
  }

  if (focusedIds.length === 1) {
    state.setFocused(focusedIds[0]);
  } else {
    state.setFocusedIds(focusedIds);
  }
};
