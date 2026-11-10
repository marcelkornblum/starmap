import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
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
import { useSystemData } from '../hooks/useSystemData';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
import {
  buildFocusedEntityDetails,
  buildFocusedPreviewSummary,
  buildGalaxyMinimapOrientation,
  buildSystemOrbitalSchematic,
  extractGalaxyBodies,
  extractUrlSceneCameraState,
  mergeActiveStarsIntoCorpus,
  resolveGalacticInstrumentAperture,
} from '../services/detailsService';
import { useSearch } from '@tanstack/react-router';
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
import { useActiveStarsStore } from '../stores/useActiveStarsStore';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';

export interface GalaxyViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];
const EMPTY_SELECTED_ENTITIES: readonly SpatialEntityDefinition[] = [];
const GALAXY_BREADCRUMBS = [{ label: 'Galaxy' }];

const corpusSystemFirstChildCache = new WeakMap<
  readonly CompactSearchEntry[],
  Map<string, CompactSearchEntry>
>();

function getCorpusSystemFirstChildMap(
  corpus: readonly CompactSearchEntry[],
): Map<string, CompactSearchEntry> {
  let map = corpusSystemFirstChildCache.get(corpus);
  if (!map) {
    map = new Map<string, CompactSearchEntry>();
    for (const entry of corpus) {
      if (!entry.s) continue;
      const rawS = entry.s;
      const slugS = toUrlSlug(rawS);
      if (!map.has(slugS)) {
        map.set(slugS, entry);
      }
      if (rawS !== slugS && !map.has(rawS)) {
        map.set(rawS, entry);
      }
    }
    corpusSystemFirstChildCache.set(corpus, map);
  }
  return map;
}

export const GalaxyView: React.FC<GalaxyViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  const storeFocusedEntity = useSpatialEntityStore((state) => {
    if (state.focusedId && state.entities[state.focusedId]) {
      return state.entities[state.focusedId];
    }
    return state.getEntitiesByState('focused')[0] ?? null;
  });
  const storeSelected = useSpatialEntityStore(
    useShallow((state) => {
      if (!state.selectedIds || state.selectedIds.size === 0) {
        return EMPTY_SELECTED_ENTITIES;
      }
      return state.getEntitiesByState('selected');
    }),
  );
  // Quantize aperture radius to 0.5 pc to throttle re-renders during micro-zooming
  const liveApertureRadius = useSpatialEntityStore((state) => {
    const raw = state.apertureRadius;
    if (raw === null || raw === undefined) {
      return null;
    }
    return Math.round(raw * 2) / 2;
  });

  // Quantize aperture center coordinates to 0.1 pc with shallow equality to retain referential stability
  const liveApertureCenter = useSpatialEntityStore(
    useShallow((state) => {
      const raw = state.apertureCenter;
      if (!raw) return null;
      return [
        Math.round(raw[0] * 10) / 10,
        Math.round(raw[1] * 10) / 10,
        Math.round(raw[2] * 10) / 10,
      ] as const;
    }),
  );

  const { corpus } = useSearchCorpus('all', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/galaxy',
  );

  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const isExplicitLocation = locationPathname !== undefined || locationSearch !== undefined;
  const focus = (isExplicitLocation ? searchParams.get('focus') : (routeSearch?.focus ?? searchParams.get('focus'))) ?? undefined;
  const select = (isExplicitLocation ? searchParams.get('select') : (routeSearch?.select ?? searchParams.get('select'))) ?? undefined;
  const layer = (isExplicitLocation ? searchParams.get('layer') : (routeSearch?.layer ?? searchParams.get('layer'))) ?? undefined;
  const route = (isExplicitLocation ? searchParams.get('route') : (routeSearch?.route ?? searchParams.get('route'))) ?? undefined;
  const journeyOption = (isExplicitLocation ? searchParams.get('journeyOption') : (routeSearch?.journeyOption ?? searchParams.get('journeyOption'))) ?? undefined;
  const center = (isExplicitLocation ? searchParams.get('center') : (routeSearch?.center ?? searchParams.get('center'))) ?? undefined;

  const urlFocusSlug = focus ? toUrlSlug(focus) || null : null;
  const urlSystemSlug = urlFocusSlug;
  const hasExplicitFocus = Boolean(focus && urlFocusSlug && urlFocusSlug.length > 0);
  const pendingCenterSlug = useCameraStore((state) => state.pendingCenterSlug);
  const canvasFocusedSlugs = useCameraStore((state) => state.canvasFocusedSlugs);

  if (
    (locationPathname !== undefined || locationSearch !== undefined) &&
    !urlFocusSlug &&
    !hasExplicitFocus
  ) {
    if (storeApi.getState().focusedId) {
      storeApi.getState().setFocused(null);
    }
  }

  // Every star inside the live aperture (streamed from sector partitions), not just search entries
  const activeStars = useActiveStarsStore((state) => state.summaries);
  const apertureCorpus = useMemo(
    () => mergeActiveStarsIntoCorpus(activeCorpus, activeStars),
    [activeCorpus, activeStars],
  );

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, apertureCorpus)
        : null,
    [urlFocusSlug, apertureCorpus],
  );
  const focusedEntity = useMemo(() => {
    if (!urlFocusSlug) {
      return storeFocusedEntity;
    }
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
        if (
          nextName === storeFocusedEntity.name &&
          nextSpectral === storeFocusedEntity.spectralType
        ) {
          return storeFocusedEntity;
        }
        return {
          ...storeFocusedEntity,
          name: nextName,
          spectralType: nextSpectral,
        };
      }
      if (!realEntry) {
        return storeFocusedEntity;
      }
    }
    return urlFocusEntity ?? storeFocusedEntity;
  }, [urlFocusSlug, storeFocusedEntity, apertureCorpus, urlFocusEntity]);

  const prevUrlFocusSlugRef = useRef<string | null>(urlFocusSlug);
  useEffect(() => {
    const store = storeApi.getState();
    const currentFocusedId = store.focusedId;

    if (urlFocusSlug) {
      if (focusedEntity) {
        if (!store.entities[focusedEntity.id]) {
          store.registerEntity(focusedEntity);
        }
        if (store.focusedId !== focusedEntity.id) {
          store.setFocused(focusedEntity.id);
        }
      } else if (currentFocusedId !== urlFocusSlug) {
        store.setFocused(urlFocusSlug);
      }
      if (useUIStore.getState().detailsDetent === 'collapsed') {
        useUIStore.getState().setDetailsDetent('peek');
      }
    } else if (prevUrlFocusSlugRef.current !== null && !urlFocusSlug) {
      if (currentFocusedId !== null) {
        store.setFocused(null);
      }
    }
    prevUrlFocusSlugRef.current = urlFocusSlug;
  }, [urlFocusSlug, focusedEntity, storeApi]);

  useEffect(() => {
    if (pathname === '/galaxy') {
      useCameraStore.getState().setLastGalaxySearch(search);
    }
  }, [pathname, search]);

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(layer ? `?layer=${encodeURIComponent(layer)}` : search);

  const selectQuery = select ? `?select=${encodeURIComponent(select)}` : search;
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
    if (!focusedEntity) return selectedEntities;
    if (selectedEntities.some((e) => e.id === focusedEntity.id)) {
      return selectedEntities;
    }
    return [focusedEntity, ...selectedEntities];
  }, [focusedEntity, selectedEntities]);

  const hasExplicitSelection = Boolean(
    search.includes('select=') || search.includes('layer='),
  );

  useEffect(() => {
    if (urlSelectedEntities.length > 0 || hasExplicitSelection) {
      const nextIds = urlSelectedEntities.map((e) => e.id);
      const current = storeApi.getState().selectedIds;
      if (
        current.size !== nextIds.length ||
        !nextIds.every((id) => current.has(id))
      ) {
        storeApi.getState().setSelectedIds(nextIds);
      }
    }
  }, [urlSelectedEntities, hasExplicitSelection, storeApi]);

  const matchedEntry = focusedEntity
    ? (findFocusedEntryInCorpus(focusedEntity.id, apertureCorpus) ??
       findFocusedEntryInCorpus(focusedEntity.name, apertureCorpus))
    : undefined;
  const urlSystemEntry = urlSystemSlug
    ? findFocusedEntryInCorpus(urlSystemSlug, apertureCorpus)
    : undefined;
  const targetSystemId =
    matchedEntry?.s ??
    matchedEntry?.i ??
    urlSystemEntry?.s ??
    urlSystemEntry?.i ??
    focusedEntity?.parentBodyId ??
    focusedEntity?.id ??
    '';

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
        urlSystemSlug,
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
      urlSystemSlug,
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

  const cameraState = useMemo(() => extractUrlSceneCameraState(search), [search]);
  const centerEntity = useMemo(() => {
    if (!cameraState.center) {
      return null;
    }
    const inStore = storeApi.getState().entities[cameraState.center];
    if (inStore) {
      return inStore;
    }
    return apertureCorpus.length > 0
      ? resolveFocusedEntityFromCorpus(cameraState.center, apertureCorpus)
      : null;
  }, [cameraState.center, storeApi, apertureCorpus]);

  const instrumentAperture = useMemo(
    () =>
      resolveGalacticInstrumentAperture({
        cameraState,
        corpus: apertureCorpus,
        focusedEntity,
        centerEntity,
        urlSystemSlug,
        liveApertureCenterPc: liveApertureCenter,
        liveApertureRadiusPc: liveApertureRadius,
      }),
    [
      cameraState,
      apertureCorpus,
      focusedEntity,
      centerEntity,
      urlSystemSlug,
      liveApertureCenter,
      liveApertureRadius,
    ],
  );

  useEffect(() => {
    if (liveApertureRadius === null) {
      storeApi.getState().setApertureIds(instrumentAperture.apertureIds);
    }
  }, [storeApi, instrumentAperture.apertureIds, liveApertureRadius]);

  const galaxyBodies = useMemo(
    () =>
      extractGalaxyBodies({
        corpus: apertureCorpus,
        focusedEntity,
        selectedEntities,
        cameraState,
        centerEntity,
        urlSystemSlug,
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
      urlSystemSlug,
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

  const routeSearchQuery = route
    ? `?route=${encodeURIComponent(route)}${journeyOption ? `&journeyOption=${encodeURIComponent(journeyOption)}` : ''}`
    : search;
  const routeStops = extractUrlRouteStops(routeSearchQuery, 'galaxy');
  const routeOptionId = journeyOption ?? extractUrlJourneyOptionId(routeSearchQuery);
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

  const layerParam = layer ?? searchParams.get('layer');
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

  const resolvedCenterCoordinates = useMemo<readonly [number, number, number] | undefined>(() => {
    if (
      cameraState.x !== undefined &&
      cameraState.y !== undefined &&
      cameraState.z !== undefined
    ) {
      return [cameraState.x, cameraState.y, cameraState.z];
    }

    const isCanvasClickFocus =
      urlFocusSlug !== null &&
      (canvasFocusedSlugs.has(urlFocusSlug) ||
        canvasFocusedSlugs.has(toUrlSlug(urlFocusSlug))) &&
      pendingCenterSlug !== urlFocusSlug;

    const effectiveCenterSlug =
      (center ? toUrlSlug(center) : undefined) ??
      cameraState.center ??
      pendingCenterSlug ??
      (!isCanvasClickFocus && urlFocusSlug ? toUrlSlug(urlFocusSlug) : undefined) ??
      undefined;

    if (
      effectiveCenterSlug &&
      (effectiveCenterSlug === urlFocusSlug ||
        effectiveCenterSlug === pendingCenterSlug ||
        effectiveCenterSlug === (center ? toUrlSlug(center) : undefined) ||
        effectiveCenterSlug === cameraState.center) &&
      focusedEntity?.position &&
      (focusedEntity.id === effectiveCenterSlug ||
        toUrlSlug(focusedEntity.id) === effectiveCenterSlug ||
        toUrlSlug(focusedEntity.name) === effectiveCenterSlug)
    ) {
      const p = focusedEntity.position;
      const coords: [number, number, number] =
        p instanceof THREE.Vector3 ? [p.x, p.y, p.z] : [p[0], p[1], p[2]];
      if (effectiveCenterSlug === 'sol' || coords[0] !== 0 || coords[1] !== 0 || coords[2] !== 0) {
        return coords;
      }
    }

    if (centerEntity?.position) {
      const p = centerEntity.position;
      const coords: [number, number, number] =
        p instanceof THREE.Vector3 ? [p.x, p.y, p.z] : [p[0], p[1], p[2]];
      if (effectiveCenterSlug === 'sol' || coords[0] !== 0 || coords[1] !== 0 || coords[2] !== 0) {
        return coords;
      }
    }

    if (effectiveCenterSlug) {
      const centerSlug = effectiveCenterSlug;

      const selectedMatch = selectedEntities.find(
        (s) =>
          s.id === centerSlug ||
          toUrlSlug(s.id) === centerSlug ||
          toUrlSlug(s.name) === centerSlug,
      );
      if (selectedMatch?.position) {
        const p = selectedMatch.position;
        const coords: [number, number, number] =
          p instanceof THREE.Vector3 ? [p.x, p.y, p.z] : [p[0], p[1], p[2]];
        if (centerSlug === 'sol' || coords[0] !== 0 || coords[1] !== 0 || coords[2] !== 0) {
          return coords;
        }
      }

      const directCorpusMatch = findFocusedEntryInCorpus(centerSlug, apertureCorpus);
      if (directCorpusMatch) {
        if (
          directCorpusMatch.p &&
          (centerSlug === 'sol' ||
            directCorpusMatch.p[0] !== 0 ||
            directCorpusMatch.p[1] !== 0 ||
            directCorpusMatch.p[2] !== 0)
        ) {
          return [directCorpusMatch.p[0], directCorpusMatch.p[1], directCorpusMatch.p[2]];
        }
        if (directCorpusMatch.s) {
          const host = findFocusedEntryInCorpus(directCorpusMatch.s, apertureCorpus);
          if (
            host?.p &&
            (centerSlug === 'sol' || host.p[0] !== 0 || host.p[1] !== 0 || host.p[2] !== 0)
          ) {
            return [host.p[0], host.p[1], host.p[2]];
          }
        }
      }

      const childCorpusMatch = getCorpusSystemFirstChildMap(apertureCorpus).get(centerSlug);
      if (childCorpusMatch?.s) {
        const host = findFocusedEntryInCorpus(childCorpusMatch.s, apertureCorpus);
        if (
          host?.p &&
          (centerSlug === 'sol' || host.p[0] !== 0 || host.p[1] !== 0 || host.p[2] !== 0)
        ) {
          return [host.p[0], host.p[1], host.p[2]];
        }
      }
    }

    return undefined;
  }, [
    apertureCorpus,
    cameraState.center,
    cameraState.x,
    cameraState.y,
    cameraState.z,
    center,
    centerEntity,
    focusedEntity,
    pendingCenterSlug,
    selectedEntities,
    urlFocusSlug,
    canvasFocusedSlugs,
  ]);

  const handleHoverEntity = useCallback(
    (id: string | null) => {
      storeApi.getState().setHovered(id);
    },
    [storeApi],
  );

  const handleFocusChange = useCallback((id: string | null) => {
    if (id) {
      const slug = toUrlSlug(id);
      if (!useCameraStore.getState().canvasFocusedSlugs.has(slug)) {
        useCameraStore.getState().recordCanvasFocus(slug);
        useCameraStore.getState().recordCanvasFocus(id);
      }
      if (useUIStore.getState().detailsDetent === 'collapsed') {
        useUIStore.getState().setDetailsDetent('peek');
      }
    }
    useCameraStore.getState().setPendingCenterSlug(null);
    if (id) {
      void appRouter
        .navigate?.({
          to: '/galaxy',
          search: (prev: StarmapSearchParams = {}) => ({
            ...prev,
            focus: id,
          }),
          replace: true,
        })
        ?.catch(() => {});
    } else {
      void appRouter
        .navigate?.({
          to: '/galaxy',
          search: (prev: StarmapSearchParams = {}) => {
            const next = { ...prev };
            delete next.focus;
            return next;
          },
          replace: true,
        })
        ?.catch(() => {});
    }
  }, []);

  const handleSelectSystem = handleFocusChange;

  return (
    <SpatialShell
      testId="galaxy-view-root"
      canvas={
        <CanvasLayer
          scope="galaxy"
          selectedEntities={canvasEntities}
          centerId={center ? toUrlSlug(center) : cameraState.center}
          centerCoordinates={resolvedCenterCoordinates}
          cameraAzimuthDeg={cameraState.az}
          cameraElevationDeg={cameraState.el}
          cameraDistance={cameraState.dist}
          journeyLegs={activeJourney?.chordLegs}
          activeJourneyMethod={
            activeJourney?.selectedOption?.id ??
            activeJourney?.options[0]?.id
          }
          onInspect={handleSelectSystem}
          onSelect={handleSelectSystem}
          onFocusChange={handleFocusChange}
        />
      }
      breadcrumbs={<Breadcrumbs items={GALAXY_BREADCRUMBS} />}
      controls={<ControlBar scope="galaxy" />}
      search={
        <Search.Root
          limitPerCategory={3}
          initialCorpus={initialCorpus}
          locationPathname={pathname}
          locationSearch={search}
        >
          <Search.Panel scope="galaxy" />
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
      bodies={
        <BodiesPanel
          elements={galaxyBodies}
          onHoverEntity={handleHoverEntity}
        />
      }
    />
  );
};
