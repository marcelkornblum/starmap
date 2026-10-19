import React, { useEffect, useState } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import {
  BodiesPanel,
  Breadcrumbs,
  CanvasLayer,
  ControlBar,
  DetailsPanel,
  DirectionsPanel,
  Minimap,
  PreviewPanel,
  SearchResultItem,
} from '../components/domain';
import {
  buildJourneyPlan,
  extractUrlJourneyOptionId,
  extractUrlRouteStops,
} from '../services/journeyService';
import { Search } from '../components/search';
import {
  fetchDetailRecord,
  fetchSummaryNode,
  getCachedDetailRecord,
  getCachedSummaryNode,
} from '../data/detailsRepository';
import {
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
} from '../data/searchRepository';
import {
  buildFocusedEntityDetails,
  buildFocusedPreviewSummary,
  buildPlanetaryBodiesSummary,
  buildPlanetMinimapOrientation,
  buildPlanetaryOrbitalSchematic,
  buildPlanetViewBreadcrumbs,
  extractUrlSceneCameraState,
  type FocusedEntityDetails,
  type FocusedPreviewSummary,
  type MinimapOrientationSummary,
  type OrbitalSchematicSummary,
  type PlanetaryBodiesSummary,
} from '../services/detailsService';
import {
  extractUrlFocusSlug,
  extractUrlPlanetSlug,
  findFocusedEntryInCorpus,
  hasExplicitFocusParam,
  resolveFocusedEntityFromCorpus,
  resolveSelectedSystemsFromUrlSelect,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface PlanetViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const useResolvedPlanetDetails = (
  { initialCorpus, locationPathname, locationSearch }: PlanetViewProps,
  shouldFetchShards = false,
): {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly focusedPreview: FocusedPreviewSummary | null;
  readonly minimapOrientation: MinimapOrientationSummary | null;
  readonly planetaryBodies: PlanetaryBodiesSummary | null;
  readonly orbitalSchematic: OrbitalSchematicSummary | null;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlPlanetSlug: string | null;
  readonly hasExplicitFocus: boolean;
} => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);
  useSpatialEntityStore((state) => state.selectedIds);

  const [, setShardTick] = useState<number>(0);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/planet/earth');
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const urlPlanetSlug = extractUrlPlanetSlug(pathname);
  const urlFocusSlug = extractUrlFocusSlug(pathname, search);
  const hasExplicitFocus = hasExplicitFocusParam(search);

  const activeCorpus =
    initialCorpus ??
    getCachedCorpusForFilter('all') ??
    getCachedCorpusForFilter('stars') ??
    [];

  const focusedEntity =
    storeApi.getState().getEntitiesByState('focused')[0] ??
    (urlFocusSlug
      ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
      : null);
  const matchedEntry = focusedEntity
    ? findFocusedEntryInCorpus(focusedEntity.id, activeCorpus)
    : undefined;
  const urlPlanetEntry = urlPlanetSlug
    ? findFocusedEntryInCorpus(urlPlanetSlug, activeCorpus)
    : undefined;
  const targetPlanetId = urlPlanetEntry?.i ?? urlPlanetSlug ?? '';
  const targetSystemId =
    matchedEntry?.s ??
    urlPlanetEntry?.s ??
    (urlPlanetEntry && urlPlanetEntry.k === 1
      ? urlPlanetEntry.i
      : 'sol');

  useEffect(() => {
    if (
      !shouldFetchShards ||
      !targetSystemId ||
      initialCorpus ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      loadSearchCorpusForFilter('all').catch(() => undefined),
      fetchSummaryNode(targetSystemId).catch(() => undefined),
      fetchDetailRecord(targetSystemId).catch(() => undefined),
      targetPlanetId && targetPlanetId !== targetSystemId
        ? fetchDetailRecord(targetPlanetId).catch(() => undefined)
        : Promise.resolve(undefined),
      focusedEntity &&
      focusedEntity.id !== targetSystemId &&
      focusedEntity.id !== targetPlanetId
        ? fetchDetailRecord(focusedEntity.id).catch(() => undefined)
        : Promise.resolve(undefined),
    ]).then(() => {
      if (!cancelled) {
        setShardTick((n) => n + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    focusedEntity,
    initialCorpus,
    shouldFetchShards,
    targetPlanetId,
    targetSystemId,
  ]);

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: getCachedSummaryNode(targetSystemId),
    systemDetail: getCachedDetailRecord(targetSystemId),
    entityDetail: focusedEntity
      ? getCachedDetailRecord(focusedEntity.id)
      : undefined,
    urlSystemSlug: targetSystemId,
    urlPlanetSlug,
    hasExplicitFocus,
    viewScope: 'planet',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedDetails = focusedEntity ? systemContextDetails : null;

  const storeSelected = storeApi
    .getState()
    .getEntitiesByState('selected');
  const selectedEntities =
    storeSelected.length > 0
      ? storeSelected
      : resolveSelectedSystemsFromUrlSelect(search, activeCorpus);
  const selectedEntityIds = selectedEntities.map((e) => e.id);

  const planetaryBodies = buildPlanetaryBodiesSummary({
    details: systemContextDetails,
    urlPlanetSlug,
    planetEntityDetail: targetPlanetId
      ? getCachedDetailRecord(targetPlanetId)
      : undefined,
    corpus: activeCorpus,
    selectedEntityIds,
    focusedEntityId: focusedEntity?.id,
  });

  const orbitalSchematic = buildPlanetaryOrbitalSchematic(
    planetaryBodies,
    activeCorpus,
  );

  const focusedPreview = buildFocusedPreviewSummary(
    focusedDetails,
    focusedEntity ? getCachedDetailRecord(focusedEntity.id) : undefined,
  );

  const cameraState = extractUrlSceneCameraState(search);

  const minimapOrientation = planetaryBodies
    ? buildPlanetMinimapOrientation(
        planetaryBodies,
        focusedEntity,
        selectedEntities,
        cameraState,
      )
    : null;

  return {
    focusedDetails,
    focusedPreview,
    minimapOrientation,
    planetaryBodies,
    orbitalSchematic,
    activeCorpus,
    urlPlanetSlug,
    hasExplicitFocus,
  };
};

export const PlanetView: React.FC<PlanetViewProps> = (props) => {
  const { initialCorpus, locationPathname, locationSearch } = props;
  const {
    focusedDetails,
    focusedPreview,
    minimapOrientation,
    planetaryBodies,
    orbitalSchematic,
    activeCorpus,
    urlPlanetSlug,
  } = useResolvedPlanetDetails(props, true);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/planet/earth');
  const targetId = extractUrlPlanetSlug(pathname) ?? 'earth';
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');
  const cameraState = extractUrlSceneCameraState(search);

  const breadcrumbs = buildPlanetViewBreadcrumbs(
    focusedDetails,
    planetaryBodies,
    urlPlanetSlug,
  );

  const routeStops = extractUrlRouteStops(search);
  const routeOptionId = extractUrlJourneyOptionId(search);
  const activeJourney = routeStops
    ? buildJourneyPlan({
        stops: routeStops,
        selectedOptionId: routeOptionId,
        corpus: activeCorpus,
        viewScope: 'planet',
        currentPathname: pathname,
        currentSearch: search,
      })
    : null;

  return (
    <main data-testid="planet-view-root">
      <CanvasLayer
        scope="planet"
        targetId={targetId}
        centerId={cameraState.center}
        centerCoordinates={
          cameraState.x !== undefined && cameraState.y !== undefined && cameraState.z !== undefined
            ? [cameraState.x, cameraState.y, cameraState.z]
            : undefined
        }
        cameraAzimuthDeg={cameraState.az}
        cameraElevationDeg={cameraState.el}
        cameraDistance={cameraState.dist}
        journeyLegs={activeJourney?.chordLegs}
        activeJourneyMethod={
          activeJourney?.selectedOption?.id ??
          activeJourney?.options[0]?.id
        }
      />
      <Breadcrumbs items={breadcrumbs} />
      <ControlBar scope="planet" />
      <Search.Root
        limitPerCategory={3}
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      >
        <Search.Panel scope="planet" />
        <Search.Results
          searchViewPath="/search"
          renderItem={(result) => (
            <SearchResultItem key={result.id} result={result} />
          )}
        />
      </Search.Root>
      {activeJourney ? (
        <DirectionsPanel journey={activeJourney} />
      ) : (
        <DetailsPanel details={focusedDetails} />
      )}
      <PreviewPanel preview={focusedPreview} />
      <Minimap orientation={minimapOrientation} />
      <BodiesPanel elements={planetaryBodies} schematic={orbitalSchematic} />
    </main>
  );
};
