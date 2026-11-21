import { useMemo } from 'react';
import type { SpatialEntityDefinition } from '../types/spatial';
import { buildJourneyPlan } from '../services/journey/journeyBuilder';
import {
  extractUrlJourneyOptionId,
  extractUrlRouteStops,
} from '../services/journey/journeyProfilesAndUrls';
import { resolveActiveLayerCard } from '../services/layerCardService';
import { useSystemData } from '../hooks/useSystemData';
import { buildFocusedEntityDetails } from '../services/details/focusedEntityDetails';
import { buildFocusedPreviewSummary } from '../services/details/detailsPreview';
import { buildGalaxyMinimapOrientation } from '../services/details/galaxyMinimap';
import { buildSystemOrbitalSchematic } from '../services/details/systemOrbitalSchematic';
import { extractGalaxyBodies } from '../services/details/galaxyBodiesExtractor';
import { findFocusedEntryInCorpus } from '../services/search/searchCorpusHelpers';
import { appendExtraEntriesToCorpus } from '../services/details/activeStarsCorpus';
import type {
  GalacticInstrumentApertureResult,
  SceneCameraUrlState,
} from '../services/details/detailsNavigationTypes';
import type { DatasetLayerManifest } from '../types/datasetLayers';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { toAnnotationLookupKey } from '../utils/datasetLayerSlugs';
import { useEntityAnnotations } from '../hooks/useLayerData';

export interface UseGalaxyPanelsParams {
  readonly focusedEntity: SpatialEntityDefinition | null;
  readonly apertureCorpus: readonly CompactSearchEntry[];
  readonly targetSystemId: string;
  readonly urlFocusSlug: string | null;
  readonly hasExplicitFocus: boolean;
  readonly pathname: string;
  readonly search: string;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly loadedLayers: readonly DatasetLayerManifest[];
  readonly layerParam: string | null;
  readonly cameraState: SceneCameraUrlState;
  readonly centerEntity: SpatialEntityDefinition | null;
  readonly selectedEntities: readonly SpatialEntityDefinition[];
  readonly instrumentAperture: GalacticInstrumentApertureResult;
  readonly route?: string;
}

export const stripFocusFromSearch = (rawSearch: string): string => {
  if (!rawSearch || rawSearch === '?') {
    return '';
  }
  if (!rawSearch.includes('focus=')) {
    return rawSearch;
  }
  const clean = rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch;
  const params = new URLSearchParams(clean);
  params.delete('focus');
  const serialized = params.toString();
  if (!serialized) {
    return '';
  }
  return `?${serialized.replace(/%3A/gi, ':').replace(/%2C/gi, ',')}`;
};

export function useGalaxyPanels({
  focusedEntity,
  apertureCorpus,
  targetSystemId,
  urlFocusSlug,
  hasExplicitFocus,
  pathname,
  search,
  activeCorpus,
  loadedLayers,
  layerParam,
  cameraState,
  centerEntity,
  selectedEntities,
  instrumentAperture,
  route,
}: UseGalaxyPanelsParams) {
  const canonLookupIds = useMemo(
    () => [toAnnotationLookupKey(focusedEntity?.id ?? targetSystemId), targetSystemId],
    [focusedEntity?.id, targetSystemId],
  );
  const canonRecords = useEntityAnnotations(canonLookupIds);

  const focusedEntityId = focusedEntity?.id ?? '';
  const { systemSummary, systemDetail, focusedDetail } = useSystemData(
    targetSystemId,
    focusedEntityId,
  );

  const focusedExtraEntry = useMemo(() => {
    if (activeCorpus.length === 0) return undefined;
    const lookup = focusedEntity?.id || urlFocusSlug || targetSystemId;
    if (!lookup || findFocusedEntryInCorpus(lookup, activeCorpus)) {
      return undefined;
    }
    return findFocusedEntryInCorpus(lookup, apertureCorpus);
  }, [activeCorpus, apertureCorpus, focusedEntity?.id, urlFocusSlug, targetSystemId]);

  const detailsCorpus = useMemo(() => {
    if (activeCorpus.length === 0) return apertureCorpus;
    return focusedExtraEntry
      ? appendExtraEntriesToCorpus(activeCorpus, [focusedExtraEntry])
      : activeCorpus;
  }, [activeCorpus, apertureCorpus, focusedExtraEntry]);

  const focusedDetails = useMemo(
    () =>
      buildFocusedEntityDetails({
        focusedEntity,
        corpus: detailsCorpus,
        summaryNode: systemSummary,
        systemDetail,
        entityDetail: focusedDetail,
        urlSystemSlug: urlFocusSlug,
        hasExplicitFocus,
        canonRecords,
        viewScope: 'galaxy',
        currentPathname: pathname,
        currentSearch: search,
      }),
    [
      focusedEntity,
      detailsCorpus,
      systemSummary,
      systemDetail,
      focusedDetail,
      urlFocusSlug,
      hasExplicitFocus,
      canonRecords,
      pathname,
      search,
    ],
  );

  const focusedPreview = useMemo(
    () => buildFocusedPreviewSummary(focusedDetails, focusedDetail),
    [focusedDetails, focusedDetail],
  );

  const nonFocusSearch = useMemo(() => stripFocusFromSearch(search), [search]);

  const galaxyBodies = useMemo(
    () =>
      extractGalaxyBodies({
        corpus: apertureCorpus,
        focusedEntity,
        selectedEntities,
        cameraState,
        centerEntity,
        urlSystemSlug: urlFocusSlug,
        hasExplicitFocus,
        currentSearch: nonFocusSearch,
        aperture: instrumentAperture,
      }),
    [
      apertureCorpus,
      focusedEntity,
      selectedEntities,
      cameraState,
      centerEntity,
      urlFocusSlug,
      hasExplicitFocus,
      nonFocusSearch,
      instrumentAperture,
    ],
  );

  const minimapOrientation = useMemo(
    () =>
      buildGalaxyMinimapOrientation(
        focusedEntity,
        selectedEntities,
        focusedDetails,
        cameraState,
        centerEntity,
      ),
    [focusedEntity, selectedEntities, focusedDetails, cameraState, centerEntity],
  );

  const { routeStops, activeJourney } = useMemo(() => {
    if (!route && !search.includes('route=')) {
      return { routeStops: null, activeJourney: null };
    }
    const routeSearchQuery = route ? `?route=${encodeURIComponent(route)}` : search;
    const stops = extractUrlRouteStops(routeSearchQuery, 'galaxy');
    const optionId = extractUrlJourneyOptionId(routeSearchQuery);
    const journey = stops
      ? buildJourneyPlan({
          stops,
          selectedOptionId: optionId,
          corpus: activeCorpus,
          viewScope: 'galaxy',
          currentPathname: pathname,
          currentSearch: search,
        })
      : null;
    return { routeStops: stops, activeJourney: journey };
  }, [route, search, activeCorpus, pathname]);

  const isSystemFocused = focusedDetails?.focusedKind === 'system';
  const focusedId = focusedDetails?.id;
  const focusedSysId = focusedDetails?.systemId;
  const focusedName = focusedDetails?.name;
  const focusedSysName = focusedDetails?.systemName;
  const focusedStars = focusedDetails?.stars;
  const focusedPlanets = focusedDetails?.planets;
  const focusedDisks = focusedDetails?.disks;

  const orbitalSchematic = useMemo(
    () =>
      isSystemFocused && focusedId && focusedSysId && focusedStars && focusedPlanets
        ? buildSystemOrbitalSchematic(
            {
              id: focusedId,
              systemId: focusedSysId,
              name: focusedName ?? '',
              systemName: focusedSysName ?? '',
              focusedKind: 'system',
              stars: focusedStars,
              planets: focusedPlanets,
              disks: focusedDisks,
            },
            activeCorpus,
          )
        : null,
    [
      isSystemFocused,
      focusedId,
      focusedSysId,
      focusedName,
      focusedSysName,
      focusedStars,
      focusedPlanets,
      focusedDisks,
      activeCorpus,
    ],
  );

  const activeLayerCard = useMemo(
    () =>
      resolveActiveLayerCard({
        layerParam,
        currentPathname: pathname,
        currentSearch: search,
        corpus: activeCorpus,
        layers: loadedLayers,
      }),
    [layerParam, pathname, search, activeCorpus, loadedLayers],
  );

  return {
    focusedDetails,
    focusedPreview,
    galaxyBodies,
    minimapOrientation,
    activeJourney,
    orbitalSchematic,
    activeLayerCard,
    routeStops,
  };
}
