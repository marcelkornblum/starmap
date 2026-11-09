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
import { useEntityDetails } from '../hooks/useEntityDetails';
import { useSystemData } from '../hooks/useSystemData';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
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
import { useParams, useSearch } from '@tanstack/react-router';
import {
  findFocusedEntryInCorpus,
  resolveFocusedEntityFromCorpus,
  resolveSelectedSystemsFromUrlSelect,
  toUrlSlug,
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import { toAnnotationLookupKey } from '../utils/datasetLayerCodec';
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

export interface PlanetViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly planetId?: string;
}

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];

const useResolvedPlanetDetails = (
  { initialCorpus, locationPathname, locationSearch, planetId: propPlanetId }: PlanetViewProps,
  _shouldFetchShards = false,
): {
  readonly focusedDetails: FocusedEntityDetails | null;
  readonly focusedPreview: FocusedPreviewSummary | null;
  readonly minimapOrientation: MinimapOrientationSummary | null;
  readonly planetaryBodies: PlanetaryBodiesSummary | null;
  readonly orbitalSchematic: OrbitalSchematicSummary | null;
  readonly activeCorpus: readonly CompactSearchEntry[];
  readonly urlPlanetSlug: string | null;
  readonly hasExplicitFocus: boolean;
  readonly focusedEntity: SpatialEntityDefinition | null;
} => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);
  useSpatialEntityStore((state) => state.selectedIds);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/planet/earth',
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const rawPlanetId = routeParams?.planetId ?? propPlanetId;
  const fallbackPlanetSlug = pathname.startsWith('/planet/') ? toUrlSlug(pathname.slice('/planet/'.length).split('/')[0]) : null;
  const urlPlanetSlug = toUrlSlug(rawPlanetId ?? '') || fallbackPlanetSlug || null;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focusParam = routeSearch?.focus ?? searchParams.get('focus') ?? undefined;
  const selectParam = routeSearch?.select ?? searchParams.get('select') ?? undefined;
  const centerParam = routeSearch?.center ?? searchParams.get('center') ?? undefined;
  const urlFocusSlug = focusParam ? toUrlSlug(focusParam) || null : null;
  const hasExplicitFocus = Boolean(focusParam && urlFocusSlug && urlFocusSlug.length > 0);

  const { corpus } = useSearchCorpus('all', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const urlPlanetEntry = urlPlanetSlug
    ? findFocusedEntryInCorpus(urlPlanetSlug, activeCorpus)
    : undefined;
  const targetPlanetId = urlPlanetEntry?.i ?? urlPlanetSlug ?? '';
  const targetSystemId =
    urlPlanetEntry?.s ??
    (urlPlanetEntry && urlPlanetEntry.k === 1
      ? urlPlanetEntry.i
      : 'sol');

  const planetSlugs = useMemo(
    () =>
      new Set(
        [toUrlSlug(targetPlanetId), urlPlanetSlug ? toUrlSlug(urlPlanetSlug) : '']
          .filter((slug) => slug.length > 0),
      ),
    [targetPlanetId, urlPlanetSlug],
  );

  const { systemSummary, systemDetail, focusedDetail } = useSystemData(
    targetSystemId,
    urlFocusSlug ?? '',
  );

  const orbitingBodyIds = useMemo(
    () =>
      activeCorpus
        .filter((entry) => entry.o && planetSlugs.has(toUrlSlug(entry.o)))
        .map((entry) => entry.i),
    [activeCorpus, planetSlugs],
  );

  const isFocusInPlanetScope = useMemo(() => {
    if (!urlFocusSlug) return false;
    const isPlanetItself =
      urlFocusSlug === urlPlanetSlug ||
      urlFocusSlug === toUrlSlug(targetPlanetId);
    if (isPlanetItself) return true;
    if (systemDetail?.kind === 'system') {
      const rec = systemDetail.record;
      const planet = rec.planets.find(
        (p) =>
          p.id === targetPlanetId ||
          toUrlSlug(p.id) === urlPlanetSlug ||
          toUrlSlug(p.name) === urlPlanetSlug,
      );
      if (planet?.satellites) {
        if (
          planet.satellites.some(
            (sat) =>
              sat.id === urlFocusSlug ||
              toUrlSlug(sat.id) === urlFocusSlug ||
              toUrlSlug(sat.name) === urlFocusSlug,
          )
        ) {
          return true;
        }
      }
      if (orbitingBodyIds.length > 0) {
        return orbitingBodyIds.some(
          (id) => id === urlFocusSlug || toUrlSlug(id) === urlFocusSlug,
        );
      }
      return false;
    }
    if (activeCorpus.length > 0) {
      return orbitingBodyIds.some(
        (id) => id === urlFocusSlug || toUrlSlug(id) === urlFocusSlug,
      );
    }
    return true;
  }, [urlFocusSlug, urlPlanetSlug, targetPlanetId, systemDetail, orbitingBodyIds, activeCorpus.length]);

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug && isFocusInPlanetScope
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, isFocusInPlanetScope, activeCorpus],
  );
  const focusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? (isFocusInPlanetScope ? storeApi.getState().getEntitiesByState('focused')[0] ?? null : null))
    : (storeApi.getState().getEntitiesByState('focused')[0] ?? null);

  const focusedEntityId = focusedEntity?.id ?? '';

  const isPlanetDistinctFromSystem = Boolean(
    targetPlanetId && targetPlanetId !== targetSystemId,
  );
  const isPlanetDistinctFromFocused = Boolean(
    targetPlanetId && targetPlanetId !== focusedEntityId,
  );
  const { detail: distinctPlanetDetail } = useEntityDetails(
    isPlanetDistinctFromSystem && isPlanetDistinctFromFocused
      ? targetPlanetId
      : null,
  );

  const planetEntityDetail = !isPlanetDistinctFromSystem
    ? systemDetail
    : !isPlanetDistinctFromFocused
      ? focusedDetail
      : distinctPlanetDetail;

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const canonRecords = useEntityAnnotations(
    [
      targetPlanetId,
      urlPlanetSlug ?? '',
      focusedEntity?.id ?? targetSystemId,
      targetSystemId,
      ...orbitingBodyIds,
    ].map(toAnnotationLookupKey),
  );

  const effectiveUrlFocusSlug = isFocusInPlanetScope ? urlFocusSlug : null;

  const systemContextDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: activeCorpus,
    summaryNode: systemSummary,
    systemDetail,
    entityDetail: focusedDetail,
    urlSystemSlug: targetSystemId,
    urlPlanetSlug,
    urlFocusSlug: effectiveUrlFocusSlug,
    hasExplicitFocus: Boolean(hasExplicitFocus && isFocusInPlanetScope),
    canonRecords,
    viewScope: 'planet',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedDetails = (focusedEntity && isFocusInPlanetScope) ? systemContextDetails : null;

  const storeSelected = storeApi
    .getState()
    .getEntitiesByState('selected');
  const selectQuery = selectParam ? `?select=${encodeURIComponent(selectParam)}` : search;
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
    return (selectParam ?? searchParams.get('select') ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.includes(':'));
  }, [selectParam, searchParams]);

  const selectedEntityIds = useMemo(() => {
    const ids = new Set(selectedEntities.map((e) => e.id));
    for (const slug of urlExplicitSelectSlugs) {
      ids.add(slug);
    }
    return Array.from(ids);
  }, [selectedEntities, urlExplicitSelectSlugs]);

  useEffect(() => {
    if (!urlPlanetSlug) return;
    if (activeCorpus.length === 0 && !systemDetail) return;

    if (urlFocusSlug && !isFocusInPlanetScope) {
      if (import.meta.env?.DEV) {
        console.warn(`[router] Out-of-scope focus '${urlFocusSlug}' stripped on /planet/${urlPlanetSlug}`);
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

    if (centerParam && !centerParam.includes(',')) {
      const centerSlug = toUrlSlug(centerParam);
      const isCenterInPlanetScope =
        centerSlug === urlPlanetSlug ||
        centerSlug === toUrlSlug(targetPlanetId) ||
        orbitingBodyIds.some((id) => id === centerSlug || toUrlSlug(id) === centerSlug);

      if (!isCenterInPlanetScope) {
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
    urlPlanetSlug,
    activeCorpus.length,
    urlFocusSlug,
    isFocusInPlanetScope,
    centerParam,
    targetPlanetId,
    orbitingBodyIds,
    systemDetail,
  ]);

  const planetaryBodies = buildPlanetaryBodiesSummary({
    details: systemContextDetails,
    urlPlanetSlug,
    planetEntityDetail,
    corpus: activeCorpus,
    canonRecords,
    selectedEntityIds,
    focusedEntityId: focusedEntity?.id,
  });

  const orbitalSchematic = buildPlanetaryOrbitalSchematic(
    planetaryBodies,
    activeCorpus,
  );

  const focusedPreview = buildFocusedPreviewSummary(
    focusedDetails,
    focusedDetail,
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
    focusedEntity,
  };
};

export const PlanetView: React.FC<PlanetViewProps> = (props) => {
  const { initialCorpus, locationPathname, locationSearch, planetId: propPlanetId } = props;
  const {
    focusedDetails,
    focusedPreview,
    minimapOrientation,
    planetaryBodies,
    orbitalSchematic,
    activeCorpus,
    urlPlanetSlug,
    focusedEntity,
  } = useResolvedPlanetDetails(props, true);

  const storeApi = useSpatialEntityStoreApi();
  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/planet/earth',
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const focus = routeSearch?.focus ?? searchParams.get('focus') ?? undefined;
  const layer = routeSearch?.layer ?? searchParams.get('layer') ?? undefined;
  const route = routeSearch?.route ?? searchParams.get('route') ?? undefined;
  const journeyOption = routeSearch?.journeyOption ?? searchParams.get('journeyOption') ?? undefined;
  const center = routeSearch?.center ?? searchParams.get('center') ?? undefined;

  const rawPlanetId = routeParams?.planetId ?? propPlanetId;
  const targetId = toUrlSlug(rawPlanetId ?? '') || 'earth';
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

  const breadcrumbs = buildPlanetViewBreadcrumbs(
    focusedDetails,
    planetaryBodies,
    urlPlanetSlug,
  );

  const lastGalaxySearch = useCameraStore((s) => s.lastGalaxySearch);
  const resolvedBreadcrumbs = useMemo(() => {
    if (!lastGalaxySearch) return breadcrumbs;
    const query = lastGalaxySearch.startsWith('?') ? lastGalaxySearch : `?${lastGalaxySearch}`;
    return breadcrumbs.map((item) =>
      item.label === 'Galaxy' ? { ...item, href: `/galaxy${query}` } : item,
    );
  }, [breadcrumbs, lastGalaxySearch]);

  const routeSearchQuery = route
    ? `?route=${encodeURIComponent(route)}${journeyOption ? `&journeyOption=${encodeURIComponent(journeyOption)}` : ''}`
    : search;
  const routeStops = extractUrlRouteStops(routeSearchQuery, 'planet');
  const routeOptionId = journeyOption ?? extractUrlJourneyOptionId(routeSearchQuery);
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

  const layerParam = layer ?? searchParams.get('layer');
  const loadedLayers = useLoadedLayerManifests(layer ? `?layer=${encodeURIComponent(layer)}` : search);
  const activeLayerCard = resolveActiveLayerCard({
    layerParam,
    currentPathname: pathname,
    currentSearch: search,
    corpus: activeCorpus,
    layers: loadedLayers,
  });

  return (
    <SpatialShell
      testId="planet-view-root"
      canvas={
        <CanvasLayer
          scope="planet"
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
      controls={<ControlBar scope="planet" />}
      search={
        <Search.Root
          limitPerCategory={3}
          initialCorpus={initialCorpus}
          locationPathname={pathname}
          locationSearch={search}
        >
          <Search.Panel scope="planet" />
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
      bodies={<BodiesPanel elements={planetaryBodies} schematic={orbitalSchematic} />}
    />
  );
};
