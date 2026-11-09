import React, { useEffect, useMemo } from 'react';
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
import type { DecodedDetailRecord } from '../data/detailsRepository';
import { useSystemData } from '../hooks/useSystemData';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
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
import { useParams, useSearch } from '@tanstack/react-router';
import {
  findFocusedEntryInCorpus,
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
import { useSpaLocation } from '../hooks/useSpaLocation';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';

export interface SystemViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly systemId?: string;
}

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];

const useResolvedSystemDetails = (
  { initialCorpus, locationPathname, locationSearch, systemId: propSystemId }: SystemViewProps,
  _shouldFetchShards = false,
): {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly systemContextDetails: FocusedEntityDetails | null;
  readonly focusedEntity: SpatialEntityDefinition | null;
  readonly focusedEntityId?: string;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly canonRecords: readonly DecodedEntityAnnotation[];
  readonly urlSystemSlug: string | null;
  readonly hasExplicitFocus: boolean;
  readonly focusedDetail: DecodedDetailRecord | undefined;
} => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/system/sol',
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as Record<string, unknown> | undefined;

  const rawSystemId =
    routeParams?.systemId ??
    propSystemId ??
    (pathname.startsWith('/system/') ? pathname.replace(/^\/system\//, '').split(/[?#]/)[0] : undefined) ??
    'sol';
  const urlSystemSlug = toUrlSlug(rawSystemId) || 'sol';

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focusParam = (routeSearch?.focus as string | undefined) ?? searchParams.get('focus') ?? undefined;
  const urlFocusSlug = focusParam ? toUrlSlug(focusParam) || null : null;
  const hasExplicitFocus = Boolean(focusParam && urlFocusSlug && urlFocusSlug.length > 0);

  const { corpus } = useSearchCorpus('all', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, activeCorpus],
  );

  const rawStoreFocused = storeApi.getState().getEntitiesByState('focused')[0] ?? null;

  const isStoreFocusedInCurrentSystem =
    rawStoreFocused && urlSystemSlug
      ? toUrlSlug(rawStoreFocused.id) === urlSystemSlug ||
        toUrlSlug(rawStoreFocused.name) === urlSystemSlug ||
        toUrlSlug(rawStoreFocused.parentBodyId ?? '') === urlSystemSlug ||
        rawStoreFocused.parentBodyId === urlSystemSlug ||
        rawStoreFocused.id === urlSystemSlug
      : false;

  const storeFocusedEntity = isStoreFocusedInCurrentSystem ? rawStoreFocused : null;

  const explicitFocusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? storeFocusedEntity)
    : storeFocusedEntity;

  const focusedEntity = explicitFocusedEntity;
  const matchedEntry = focusedEntity
    ? (findFocusedEntryInCorpus(focusedEntity.id, activeCorpus) ??
       findFocusedEntryInCorpus(focusedEntity.name, activeCorpus))
    : undefined;
  const urlSystemEntry = urlSystemSlug
    ? findFocusedEntryInCorpus(urlSystemSlug, activeCorpus)
    : undefined;
  const targetSystemId =
    matchedEntry?.s ??
    matchedEntry?.i ??
    urlSystemEntry?.s ??
    urlSystemEntry?.i ??
    urlSystemSlug ??
    '';

  const focusedEntityId = focusedEntity?.id ?? '';

  const { systemSummary, systemDetail, focusedDetail } = useSystemData(
    targetSystemId,
    focusedEntityId,
  );

  const matchingDisk =
    !explicitFocusedEntity &&
    urlFocusSlug &&
    systemDetail?.kind === 'system'
      ? systemDetail.record.disks?.find((d) => {
          const dSlug = toUrlSlug(d.id);
          const nameSlug = toUrlSlug(d.name);
          return dSlug === urlFocusSlug || nameSlug === urlFocusSlug;
        })
      : undefined;

  useEffect(() => {
    if (!urlFocusSlug) {
      const currentFocusedId = storeApi.getState().focusedId;
      if (
        currentFocusedId &&
        toUrlSlug(currentFocusedId) !== urlSystemSlug &&
        currentFocusedId !== urlSystemSlug &&
        currentFocusedId !== targetSystemId
      ) {
        storeApi.getState().setFocused(null);
      }
    }
  }, [urlSystemSlug, urlFocusSlug, targetSystemId, storeApi]);

  const canonRecords = useEntityAnnotations([
    toAnnotationLookupKey(
      matchingDisk?.id ?? focusedEntity?.id ?? targetSystemId,
    ),
    targetSystemId,
  ]);

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: systemSummary,
    systemDetail,
    entityDetail: focusedDetail,
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
    focusedDetail,
  };
};

export const SystemView: React.FC<SystemViewProps> = (props) => {
  const { initialCorpus, locationPathname, locationSearch, systemId: propSystemId } = props;
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
    focusedDetail,
  } = useResolvedSystemDetails(props, true);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/system/sol',
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as Record<string, unknown> | undefined;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focus = (routeSearch?.focus as string | undefined) ?? searchParams.get('focus') ?? undefined;
  const select = (routeSearch?.select as string | undefined) ?? searchParams.get('select') ?? undefined;
  const layer = (routeSearch?.layer as string | undefined) ?? searchParams.get('layer') ?? undefined;
  const route = (routeSearch?.route as string | undefined) ?? searchParams.get('route') ?? undefined;
  const center = (routeSearch?.center as string | undefined) ?? searchParams.get('center') ?? undefined;
  const journeyOption = (routeSearch?.journeyOption as string | undefined) ?? searchParams.get('journeyOption') ?? undefined;

  const rawSystemId =
    routeParams?.systemId ??
    propSystemId ??
    (pathname.startsWith('/system/') ? pathname.replace(/^\/system\//, '').split(/[?#]/)[0] : undefined) ??
    'sol';
  const targetId = toUrlSlug(rawSystemId) || 'sol';
  const urlFocusSlug = focus ? toUrlSlug(focus) || null : null;
  const cameraState = extractUrlSceneCameraState(search);
  const effectiveCenterId = center ? toUrlSlug(center) : cameraState.center;

  useEffect(() => {
    if (!urlFocusSlug || !focusedEntity) return;
    const store = storeApi.getState();
    if (!store.entities[focusedEntity.id]) {
      store.registerEntity(focusedEntity);
    }
    if (store.focusedId !== focusedEntity.id) {
      store.setFocused(focusedEntity.id);
    }
    if (useUIStore.getState().detailsDetent === 'collapsed') {
      useUIStore.getState().setDetailsDetent('peek');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFocusSlug, focusedEntity?.id, storeApi]);

  const breadcrumbs = buildSystemViewBreadcrumbs(
    systemContextDetails,
    urlSystemSlug,
  );

  const lastGalaxySearch = useCameraStore((s) => s.lastGalaxySearch);
  const resolvedBreadcrumbs = useMemo(() => {
    if (!lastGalaxySearch) return breadcrumbs;
    const query = lastGalaxySearch.startsWith('?') ? lastGalaxySearch : `?${lastGalaxySearch}`;
    return breadcrumbs.map((item) =>
      item.label === 'Galaxy' ? { ...item, href: `/galaxy${query}` } : item,
    );
  }, [breadcrumbs, lastGalaxySearch]);

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const storeSelected = storeApi
    .getState()
    .getEntitiesByState('selected');
  const selectQuery = select ? `?select=${encodeURIComponent(select)}` : search;
  const selectedEntities =
    storeSelected.length > 0
      ? storeSelected
      : resolveSelectedSystemsFromUrlSelect(
          selectQuery,
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
    focusedDetail,
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

  const routeSearchQuery = route
    ? `?route=${encodeURIComponent(route)}&journeyOption=${encodeURIComponent(journeyOption ?? '')}`
    : search;
  const routeStops = extractUrlRouteStops(routeSearchQuery, 'system');
  const routeOptionId = journeyOption ?? extractUrlJourneyOptionId(routeSearchQuery);
  const activeJourney = routeStops
    ? buildJourneyPlan({
        stops: routeStops,
        selectedOptionId: routeOptionId,
        corpus: activeCorpus,
        viewScope: 'system',
        currentPathname: pathname,
        currentSearch: routeSearchQuery,
      })
    : null;

  const layerParam = layer ?? searchParams.get('layer');
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
          centerId={effectiveCenterId}
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
      breadcrumbs={<Breadcrumbs items={resolvedBreadcrumbs} />}
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
      detailsPanel={
        focusedDetails ? (
          <DetailsPanel
            details={focusedDetails}
            schematic={orbitalSchematic}
            preview={focusedPreview}
          />
        ) : undefined
      }
      directionsPanel={
        activeJourney && routeStops && routeStops.length >= 2 ? (
          <DirectionsPanel journey={activeJourney} />
        ) : undefined
      }
      preview={activeJourney ? <PreviewPanel preview={focusedPreview} /> : null}
      minimap={<Minimap orientation={minimapOrientation} />}
      bodies={<BodiesPanel elements={systemBodies} schematic={orbitalSchematic} />}
    />
  );
};
