import React, { useEffect, useState } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
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
  buildSystemBodiesSummary,
  buildSystemMinimapOrientation,
  buildSystemOrbitalSchematic,
  buildSystemViewBreadcrumbs,
  extractUrlSceneCameraState,
  type FocusedEntityDetails,
} from '../services/detailsService';
import {
  extractUrlFocusSlug,
  extractUrlSystemSlug,
  findFocusedEntryInCorpus,
  hasExplicitFocusParam,
  resolveFocusedEntityFromCorpus,
  resolveSelectedSystemsFromUrlSelect,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

export interface SystemViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const useResolvedSystemDetails = (
  { initialCorpus, locationPathname, locationSearch }: SystemViewProps,
  shouldFetchShards = false,
): {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly systemContextDetails: FocusedEntityDetails | null;
  readonly focusedEntity: SpatialEntityDefinition | null;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlSystemSlug: string | null;
  readonly hasExplicitFocus: boolean;
} => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);

  const [, setShardTick] = useState<number>(0);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/system/sol');
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const urlSystemSlug = extractUrlSystemSlug(pathname);
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
  const urlSystemEntry = urlSystemSlug
    ? findFocusedEntryInCorpus(urlSystemSlug, activeCorpus)
    : undefined;
  const targetSystemId =
    matchedEntry?.s ??
    urlSystemEntry?.s ??
    urlSystemEntry?.i ??
    focusedEntity?.id ??
    urlSystemSlug ??
    '';

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
      focusedEntity && focusedEntity.id !== targetSystemId
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
  }, [focusedEntity, initialCorpus, shouldFetchShards, targetSystemId]);

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: getCachedSummaryNode(targetSystemId),
    systemDetail: getCachedDetailRecord(targetSystemId),
    entityDetail: focusedEntity
      ? getCachedDetailRecord(focusedEntity.id)
      : undefined,
    urlSystemSlug,
    hasExplicitFocus,
    viewScope: 'system',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedDetails = focusedEntity ? systemContextDetails : null;

  return {
    focusedDetails,
    systemContextDetails,
    focusedEntity,
    activeCorpus,
    urlSystemSlug,
    hasExplicitFocus,
  };
};

export const SystemView: React.FC<SystemViewProps> = (props) => {
  const { initialCorpus, locationPathname, locationSearch } = props;
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.selectedId);
  useSpatialEntityStore((state) => state.selectedIds);

  const {
    focusedDetails,
    systemContextDetails,
    focusedEntity,
    activeCorpus,
    urlSystemSlug,
  } = useResolvedSystemDetails(props, true);

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/system/sol');
  const targetId = extractUrlSystemSlug(pathname) ?? 'sol';
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');
  const cameraState = extractUrlSceneCameraState(search);

  const breadcrumbs = buildSystemViewBreadcrumbs(
    systemContextDetails,
    urlSystemSlug,
  );

  const storeSelected = storeApi
    .getState()
    .getEntitiesByState('selected');
  const selectedEntities =
    storeSelected.length > 0
      ? storeSelected
      : resolveSelectedSystemsFromUrlSelect(search, activeCorpus);
  const selectedEntityIds = selectedEntities.map((e) => e.id);

  const systemBodies = buildSystemBodiesSummary({
    details: systemContextDetails,
    corpus: activeCorpus,
    selectedEntityIds,
    focusedEntityId: focusedEntity?.id,
  });

  const orbitalSchematic = buildSystemOrbitalSchematic(
    systemBodies,
    activeCorpus,
  );

  const focusedPreview = buildFocusedPreviewSummary(
    focusedDetails,
    focusedEntity ? getCachedDetailRecord(focusedEntity.id) : undefined,
  );

  const minimapOrientation = systemBodies
    ? buildSystemMinimapOrientation(
        systemBodies,
        orbitalSchematic,
        systemContextDetails ?? focusedDetails,
        focusedEntity,
        selectedEntities,
        cameraState,
      )
    : null;

  const routeStops = extractUrlRouteStops(search);
  const routeOptionId = extractUrlJourneyOptionId(search);
  const activeJourney = routeStops
    ? buildJourneyPlan({
        stops: routeStops,
        selectedOptionId: routeOptionId,
        corpus: activeCorpus,
        viewScope: 'system',
        currentPathname: pathname,
        currentSearch: search,
      })
    : null;

  return (
    <main data-testid="system-view-root">
      <CanvasLayer
        scope="system"
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
      <ControlBar scope="system" />
      <Search.Root
        limitPerCategory={3}
        initialCorpus={initialCorpus}
        locationPathname={locationPathname}
        locationSearch={locationSearch}
      >
        <Search.Panel scope="system" />
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
      <BodiesPanel elements={systemBodies} schematic={orbitalSchematic} />
    </main>
  );
};
