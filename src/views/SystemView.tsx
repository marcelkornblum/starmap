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
import {
  appRouter,
  useSpaLocation,
  type StarmapSearchParams,
} from '../hooks/useSpaLocation';
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
  readonly systemDetail: DecodedDetailRecord | undefined;
  readonly isFocusInThisSystem: boolean;
  readonly targetSystemId: string;
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
  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const rawSystemId = routeParams?.systemId ?? propSystemId;
  const fallbackSlug = pathname.startsWith('/system/') ? toUrlSlug(pathname.slice('/system/'.length).split('/')[0]) : null;
  const urlSystemSlug = toUrlSlug(rawSystemId ?? '') || fallbackSlug || null;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focusParam = routeSearch?.focus ?? searchParams.get('focus') ?? undefined;
  const urlFocusSlug = focusParam ? toUrlSlug(focusParam) || null : null;
  const hasExplicitFocus = Boolean(focusParam && urlFocusSlug && urlFocusSlug.length > 0);

  const { corpus } = useSearchCorpus('all', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const urlSystemEntry = urlSystemSlug
    ? findFocusedEntryInCorpus(urlSystemSlug, activeCorpus)
    : undefined;
  const targetSystemId =
    urlSystemEntry?.s ??
    urlSystemEntry?.i ??
    urlSystemSlug ??
    '';

  const { systemSummary, systemDetail, focusedDetail } = useSystemData(
    targetSystemId,
    urlFocusSlug ?? '',
  );

  const isFocusInThisSystem = useMemo(() => {
    if (!urlFocusSlug) return false;
    if (urlFocusSlug === urlSystemSlug || urlFocusSlug === toUrlSlug(targetSystemId)) {
      return true;
    }
    if (systemDetail?.kind === 'system') {
      const rec = systemDetail.record;
      if (
        toUrlSlug(rec.id) === urlFocusSlug ||
        toUrlSlug(rec.name) === urlFocusSlug ||
        rec.stars.some((s) => s.id === urlFocusSlug || toUrlSlug(s.id) === urlFocusSlug || toUrlSlug(s.name) === urlFocusSlug) ||
        rec.planets.some((p) => p.id === urlFocusSlug || toUrlSlug(p.id) === urlFocusSlug || toUrlSlug(p.name) === urlFocusSlug) ||
        rec.planets.some((p) => p.satellites?.some((sat) => sat.id === urlFocusSlug || toUrlSlug(sat.id) === urlFocusSlug || toUrlSlug(sat.name) === urlFocusSlug)) ||
        rec.disks?.some((d) => d.id === urlFocusSlug || toUrlSlug(d.id) === urlFocusSlug || toUrlSlug(d.name) === urlFocusSlug)
      ) {
        return true;
      }
      return false;
    }
    if (activeCorpus.length > 0) {
      const entry = findFocusedEntryInCorpus(urlFocusSlug, activeCorpus);
      if (entry) {
        if (
          entry.i === targetSystemId ||
          toUrlSlug(entry.i) === urlSystemSlug ||
          entry.s === targetSystemId ||
          (entry.s && toUrlSlug(entry.s) === urlSystemSlug)
        ) {
          return true;
        }
      }
      return false;
    }
    return true;
  }, [urlFocusSlug, urlSystemSlug, targetSystemId, activeCorpus, systemDetail]);

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug && isFocusInThisSystem
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, isFocusInThisSystem, activeCorpus],
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

  const effectiveUrlFocusSlug = isFocusInThisSystem ? urlFocusSlug : null;

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: systemSummary,
    systemDetail,
    entityDetail: focusedDetail,
    urlSystemSlug,
    urlFocusSlug: effectiveUrlFocusSlug,
    hasExplicitFocus: Boolean(hasExplicitFocus && isFocusInThisSystem),
    canonRecords,
    viewScope: 'system',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedDetails = (focusedEntity && isFocusInThisSystem) || matchingDisk ? systemContextDetails : null;

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
    systemDetail,
    isFocusInThisSystem,
    targetSystemId,
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
    systemDetail,
    isFocusInThisSystem,
    targetSystemId,
  } = useResolvedSystemDetails(props, true);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/system/sol',
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focus = routeSearch?.focus ?? searchParams.get('focus') ?? undefined;
  const select = routeSearch?.select ?? searchParams.get('select') ?? undefined;
  const layer = routeSearch?.layer ?? searchParams.get('layer') ?? undefined;
  const route = routeSearch?.route ?? searchParams.get('route') ?? undefined;
  const center = routeSearch?.center ?? searchParams.get('center') ?? undefined;
  const journeyOption = routeSearch?.journeyOption ?? searchParams.get('journeyOption') ?? undefined;

  const rawSystemId = routeParams?.systemId ?? propSystemId;
  const targetId = toUrlSlug(rawSystemId ?? '') || 'sol';
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
  }, [urlFocusSlug, focusedEntity, storeApi]);

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

  const urlExplicitSelectSlugs = useMemo(() => {
    return (select ?? searchParams.get('select') ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.includes(':'));
  }, [select, searchParams]);

  const selectedEntityIds = useMemo(() => {
    const ids = new Set(selectedEntities.map((e) => e.id));
    for (const slug of urlExplicitSelectSlugs) {
      ids.add(slug);
    }
    return Array.from(ids);
  }, [selectedEntities, urlExplicitSelectSlugs]);

  useEffect(() => {
    if (!urlSystemSlug) return;
    if (activeCorpus.length === 0 && !systemDetail) return;

    if (urlFocusSlug && !isFocusInThisSystem) {
      if (import.meta.env?.DEV) {
        console.warn(`[router] Out-of-scope focus '${urlFocusSlug}' stripped on /system/${urlSystemSlug}`);
      }
      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        if (nextUrl.searchParams.has('focus')) {
          nextUrl.searchParams.delete('focus');
          const nextHref = nextUrl.pathname + (nextUrl.search ? nextUrl.search : '');
          if (appRouter.history?.replace) {
            appRouter.history.replace(nextHref);
          } else if (window.history?.replaceState) {
            window.history.replaceState(null, '', nextHref);
          }
        }
      }
    }

    if (center && !center.includes(',')) {
      const centerSlug = toUrlSlug(center);
      const isCenterInThisSystem =
        centerSlug === urlSystemSlug ||
        centerSlug === toUrlSlug(targetSystemId) ||
        (() => {
          if (systemDetail?.kind === 'system') {
            const rec = systemDetail.record;
            return (
              rec.stars.some((s) => s.id === centerSlug || toUrlSlug(s.id) === centerSlug) ||
              rec.planets.some((p) => p.id === centerSlug || toUrlSlug(p.id) === centerSlug)
            );
          }
          if (activeCorpus.length > 0) {
            const entry = findFocusedEntryInCorpus(centerSlug, activeCorpus);
            if (entry && (entry.s === targetSystemId || (entry.s && toUrlSlug(entry.s) === urlSystemSlug))) return true;
            return false;
          }
          return true;
        })();

      if (!isCenterInThisSystem) {
        if (typeof window !== 'undefined') {
          const nextUrl = new URL(window.location.href);
          if (nextUrl.searchParams.has('center')) {
            nextUrl.searchParams.delete('center');
            const nextHref = nextUrl.pathname + (nextUrl.search ? nextUrl.search : '');
            if (appRouter.history?.replace) {
              appRouter.history.replace(nextHref);
            } else if (window.history?.replaceState) {
              window.history.replaceState(null, '', nextHref);
            }
          }
        }
      }
    }
  }, [
    urlSystemSlug,
    activeCorpus.length,
    urlFocusSlug,
    isFocusInThisSystem,
    center,
    targetSystemId,
    systemDetail,
    activeCorpus,
  ]);

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
        currentSearch: search,
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
