import React, { useEffect, useMemo, useState } from 'react';
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
  LayerCard,
  Minimap,
  PreviewPanel,
  SearchResultItem,
  SpatialShell,
} from '../components/domain';
import {
  buildJourneyPlan,
  extractUrlJourneyOptionId,
  extractUrlRouteStops,
} from '../services/journeyService';
import { Search } from '../components/search';
import { resolveActiveLayerCard } from '../services/layerCardService';
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
  toUrlSlug,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import {
  toAnnotationLookupKey,
  type DecodedEntityAnnotation,
} from '../utils/datasetLayerCodec';
import {
  useEntityAnnotations,
  useLayerIndex,
  useLoadedLayerManifests,
} from '../hooks/useLayerData';
import { useSpaLocation } from '../router';

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
  readonly focusedEntityId?: string;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly canonRecords: readonly DecodedEntityAnnotation[];
  readonly urlSystemSlug: string | null;
  readonly hasExplicitFocus: boolean;
} => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);

  const [, setShardTick] = useState<number>(0);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/system/sol',
  );

  const urlSystemSlug = extractUrlSystemSlug(pathname);
  const urlFocusSlug = extractUrlFocusSlug(pathname, search);
  const hasExplicitFocus = hasExplicitFocusParam(search);

  const activeCorpus =
    initialCorpus ??
    getCachedCorpusForFilter('all') ??
    getCachedCorpusForFilter('stars') ??
    [];

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, activeCorpus],
  );
  const explicitFocusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? storeApi.getState().getEntitiesByState('focused')[0] ?? null)
    : (storeApi.getState().getEntitiesByState('focused')[0] ?? null);

  const cachedSystemRecord = urlSystemSlug
    ? getCachedDetailRecord(urlSystemSlug)
    : undefined;

  const matchingDisk =
    !explicitFocusedEntity &&
    urlFocusSlug &&
    cachedSystemRecord?.kind === 'system'
      ? cachedSystemRecord.record.disks?.find((d) => {
          const dSlug = toUrlSlug(d.id);
          const nameSlug = toUrlSlug(d.name);
          return dSlug === urlFocusSlug || nameSlug === urlFocusSlug;
        })
      : undefined;

  const focusedEntity = explicitFocusedEntity;
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

  const canonRecords = useEntityAnnotations([
    toAnnotationLookupKey(
      matchingDisk?.id ?? focusedEntity?.id ?? targetSystemId,
    ),
    targetSystemId,
  ]);

  const focusedEntityId = focusedEntity?.id ?? '';

  useEffect(() => {
    if (
      !shouldFetchShards ||
      !targetSystemId ||
      initialCorpus ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const hasCorpus = Boolean(getCachedCorpusForFilter('all'));
    const hasSummary = Boolean(getCachedSummaryNode(targetSystemId));
    const hasSystemDetail = Boolean(getCachedDetailRecord(targetSystemId));
    const hasEntityDetail =
      !focusedEntityId ||
      focusedEntityId === targetSystemId ||
      Boolean(getCachedDetailRecord(focusedEntityId));

    if (hasCorpus && hasSummary && hasSystemDetail && hasEntityDetail) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      loadSearchCorpusForFilter('all').catch(() => undefined),
      fetchSummaryNode(targetSystemId).catch(() => undefined),
      fetchDetailRecord(targetSystemId).catch(() => undefined),
      focusedEntityId && focusedEntityId !== targetSystemId
        ? fetchDetailRecord(focusedEntityId).catch(() => undefined)
        : Promise.resolve(undefined),
    ]).then(() => {
      if (!cancelled) {
        setShardTick((n) => n + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [focusedEntityId, initialCorpus, shouldFetchShards, targetSystemId]);

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: getCachedSummaryNode(targetSystemId),
    systemDetail: getCachedDetailRecord(targetSystemId),
    entityDetail: focusedEntity
      ? getCachedDetailRecord(focusedEntity.id)
      : undefined,
    urlSystemSlug,
    urlFocusSlug,
    hasExplicitFocus,
    canonRecords,
    viewScope: 'system',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedDetails = (focusedEntity || matchingDisk) ? systemContextDetails : null;

  return {
    focusedDetails,
    systemContextDetails,
    focusedEntity,
    focusedEntityId: focusedEntity?.id ?? matchingDisk?.id,
    activeCorpus,
    canonRecords,
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
    focusedEntityId,
    activeCorpus,
    canonRecords,
    urlSystemSlug,
  } = useResolvedSystemDetails(props, true);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/system/sol',
  );
  const targetId = extractUrlSystemSlug(pathname) ?? 'sol';
  const cameraState = extractUrlSceneCameraState(search);

  const breadcrumbs = buildSystemViewBreadcrumbs(
    systemContextDetails,
    urlSystemSlug,
  );

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const storeSelected = storeApi
    .getState()
    .getEntitiesByState('selected');
  const selectedEntities =
    storeSelected.length > 0
      ? storeSelected
      : resolveSelectedSystemsFromUrlSelect(
          search,
          activeCorpus,
          layerIndex,
          loadedLayers,
        );
  const selectedEntityIds = selectedEntities.map((e) => e.id);

  const systemBodies = buildSystemBodiesSummary({
    details: systemContextDetails,
    corpus: activeCorpus,
    canonRecords,
    selectedEntityIds,
    focusedEntityId,
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

  const searchParams = new URLSearchParams(search);
  const layerParam = searchParams.get('layer');
  const activeLayerCard = resolveActiveLayerCard({
    layerParam,
    currentPathname: pathname,
    currentSearch: search,
    corpus: activeCorpus,
    layers: loadedLayers,
  });

  return (
    <SpatialShell
      testId="system-view-root"
      canvas={
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
      }
      breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
      controls={<ControlBar scope="system" />}
      search={
        <Search.Root
          limitPerCategory={3}
          initialCorpus={initialCorpus}
          locationPathname={pathname}
          locationSearch={search}
        >
          <Search.Panel scope="system" />
          <Search.Results
            searchViewPath="/search"
            renderItem={(result) => (
              <SearchResultItem key={result.id} result={result} />
            )}
          />
        </Search.Root>
      }
      layerCard={<LayerCard card={activeLayerCard} />}
      primaryFloat={
        activeJourney ? (
          <DirectionsPanel journey={activeJourney} />
        ) : (
          <DetailsPanel
            details={focusedDetails}
            schematic={
              focusedDetails?.focusedKind === 'system' ? orbitalSchematic : null
            }
          />
        )
      }
      preview={<PreviewPanel preview={focusedPreview} />}
      minimap={<Minimap orientation={minimapOrientation} />}
      bodies={<BodiesPanel elements={systemBodies} schematic={orbitalSchematic} />}
    />
  );
};
