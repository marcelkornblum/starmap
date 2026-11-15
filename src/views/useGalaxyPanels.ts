import { useMemo } from 'react';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
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
  const canonRecords = useEntityAnnotations([
    toAnnotationLookupKey(focusedEntity?.id ?? targetSystemId),
    targetSystemId,
  ]);

  const focusedEntityId = focusedEntity?.id ?? '';
  const { systemSummary, systemDetail, focusedDetail } = useSystemData(
    targetSystemId,
    focusedEntityId,
  );

  const focusedDetails = useMemo(
    () =>
      buildFocusedEntityDetails({
        focusedEntity,
        corpus: apertureCorpus,
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
      apertureCorpus,
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
        currentSearch: search,
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
      search,
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

  const routeSearchQuery = route ? `?route=${encodeURIComponent(route)}` : search;
  const routeStops = extractUrlRouteStops(routeSearchQuery, 'galaxy');
  const routeOptionId = extractUrlJourneyOptionId(routeSearchQuery);
  const activeJourney = routeStops
    ? buildJourneyPlan({
        stops: routeStops,
        selectedOptionId: routeOptionId,
        corpus: activeCorpus,
        viewScope: 'galaxy',
        currentPathname: pathname,
        currentSearch: search,
      })
    : null;

  const orbitalSchematic = useMemo(
    () =>
      focusedDetails && focusedDetails.focusedKind === 'system'
        ? buildSystemOrbitalSchematic(focusedDetails, apertureCorpus)
        : null,
    [focusedDetails, apertureCorpus],
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
