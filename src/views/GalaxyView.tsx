import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  buildGalaxyMinimapOrientation,
  buildSystemOrbitalSchematic,
  extractGalaxyBodies,
  extractUrlSceneCameraState,
  mergeActiveStarsIntoCorpus,
  resolveGalacticInstrumentAperture,
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
import { toAnnotationLookupKey } from '../utils/datasetLayerCodec';
import {
  useEntityAnnotations,
  useLayerIndex,
  useLoadedLayerManifests,
} from '../hooks/useLayerData';
import { router, useSpaLocation } from '../router';
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

  const [, setShardTick] = useState<number>(0);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/galaxy',
  );

  const urlSystemSlug = extractUrlSystemSlug(pathname);
  const urlFocusSlug = extractUrlFocusSlug(pathname, search);
  const hasExplicitFocus = hasExplicitFocusParam(search);
  const pendingCenterSlug = useCameraStore((state) => state.pendingCenterSlug);
  const canvasFocusedSlugsRef = useRef<Set<string>>(new Set());
  const pendingCanvasFocusRef = useRef<{ active: boolean; slug: string | null }>({
    active: false,
    slug: null,
  });

  if (pendingCenterSlug) {
    canvasFocusedSlugsRef.current.delete(pendingCenterSlug);
  }
  if (
    pendingCanvasFocusRef.current.active &&
    urlFocusSlug === pendingCanvasFocusRef.current.slug
  ) {
    pendingCanvasFocusRef.current.active = false;
  }

  const prevUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const nextUrl = `${pathname}${search}`;
    const urlChanged = prevUrlRef.current !== null && prevUrlRef.current !== nextUrl;
    const isExplicitLocation = locationPathname !== undefined || locationSearch !== undefined;
    prevUrlRef.current = nextUrl;

    if (
      pendingCanvasFocusRef.current.active &&
      pendingCanvasFocusRef.current.slug !== null
    ) {
      return;
    }

    if ((isExplicitLocation || urlChanged) && !urlFocusSlug && !hasExplicitFocus) {
      if (storeApi.getState().focusedId) {
        storeApi.getState().setFocused(null);
      }
    }
  }, [locationPathname, locationSearch, pathname, search, urlFocusSlug, hasExplicitFocus, storeApi]);

  const cachedAllCorpus = getCachedCorpusForFilter('all');
  const activeCorpus = initialCorpus ?? cachedAllCorpus ?? EMPTY_CORPUS;

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
    if (
      pendingCanvasFocusRef.current.active &&
      urlFocusSlug !== pendingCanvasFocusRef.current.slug
    ) {
      return pendingCanvasFocusRef.current.slug ? storeFocusedEntity : null;
    }
    if (!urlFocusSlug) {
      return hasExplicitFocus
        ? storeFocusedEntity
        : (typeof window !== 'undefined' ? storeFocusedEntity : null);
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
  }, [urlFocusSlug, hasExplicitFocus, storeFocusedEntity, apertureCorpus, urlFocusEntity]);

  useEffect(() => {
    if (
      pendingCanvasFocusRef.current.active &&
      urlFocusSlug !== pendingCanvasFocusRef.current.slug
    ) {
      return;
    }
    if (!urlFocusSlug || !focusedEntity) return;

    if (useUIStore.getState().detailsDetent === 'collapsed') {
      useUIStore.getState().setDetailsDetent('peek');
    }

    const isUnhydratedFallback =
      apertureCorpus.length === 0 &&
      focusedEntity.id !== 'sol' &&
      Array.isArray(focusedEntity.position) &&
      focusedEntity.position[0] === 0 &&
      focusedEntity.position[1] === 0 &&
      focusedEntity.position[2] === 0;

    if (isUnhydratedFallback) {
      return;
    }

    const store = storeApi.getState();
    if (!store.entities[focusedEntity.id]) {
      store.registerEntity(focusedEntity);
    }
    if (store.focusedId !== focusedEntity.id) {
      store.setFocused(focusedEntity.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFocusSlug, focusedEntity?.id, apertureCorpus.length, storeApi]);

  useEffect(() => {
    if (pathname === '/galaxy') {
      useCameraStore.getState().setLastGalaxySearch(search);
    }
  }, [pathname, search]);

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const urlSelectedEntities = useMemo(
    () =>
      resolveSelectedSystemsFromUrlSelect(
        search,
        activeCorpus,
        layerIndex,
        loadedLayers,
      ),
    [activeCorpus, layerIndex, loadedLayers, search],
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

  useEffect(() => {
    if (initialCorpus || cachedAllCorpus || typeof window === 'undefined') {
      return;
    }
    let cancelled = false;
    void loadSearchCorpusForFilter('all')
      .then(() => {
        if (!cancelled) {
          setShardTick((n) => n + 1);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialCorpus, cachedAllCorpus]);

  const focusedEntityId = focusedEntity?.id ?? '';

  useEffect(() => {
    if (!focusedEntityId || initialCorpus || typeof window === 'undefined') {
      return;
    }

    const hasSummary = Boolean(getCachedSummaryNode(targetSystemId));
    const hasSystemDetail = Boolean(getCachedDetailRecord(targetSystemId));
    const hasEntityDetail =
      !focusedEntityId ||
      focusedEntityId === targetSystemId ||
      Boolean(getCachedDetailRecord(focusedEntityId));

    if (hasSummary && hasSystemDetail && hasEntityDetail) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      fetchSummaryNode(targetSystemId).catch(() => undefined),
      fetchDetailRecord(targetSystemId).catch(() => undefined),
      focusedEntityId !== targetSystemId
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
  }, [focusedEntityId, initialCorpus, targetSystemId]);

  const focusedDetails = buildFocusedEntityDetails({
    focusedEntity,
    corpus: apertureCorpus,
    summaryNode: getCachedSummaryNode(targetSystemId),
    systemDetail: getCachedDetailRecord(targetSystemId),
    entityDetail: focusedEntity
      ? getCachedDetailRecord(focusedEntity.id)
      : undefined,
    urlSystemSlug,
    hasExplicitFocus,
    canonRecords,
    viewScope: 'galaxy',
    currentPathname: pathname,
    currentSearch: search,
  });

  const focusedPreview = buildFocusedPreviewSummary(
    focusedDetails,
    focusedEntity ? getCachedDetailRecord(focusedEntity.id) : undefined,
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

  const routeStops = extractUrlRouteStops(search);
  const routeOptionId = extractUrlJourneyOptionId(search);
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

  const searchParams = new URLSearchParams(search);
  const layerParam = searchParams.get('layer');
  const activeLayerCard = resolveActiveLayerCard({
    layerParam,
    currentPathname: pathname,
    currentSearch: search,
    corpus: activeCorpus,
    layers: loadedLayers,
  });

  const resolvedCenterCoordinates = useMemo<readonly [number, number, number] | undefined>(() => {
    if (
      cameraState.x !== undefined &&
      cameraState.y !== undefined &&
      cameraState.z !== undefined
    ) {
      return [cameraState.x, cameraState.y, cameraState.z];
    }

    const isCanvasClickFocus =
      pendingCanvasFocusRef.current.active ||
      (Boolean(urlFocusSlug) &&
        canvasFocusedSlugsRef.current.has(urlFocusSlug!) &&
        pendingCenterSlug !== urlFocusSlug);

    const effectiveCenterSlug =
      cameraState.center ??
      pendingCenterSlug ??
      (!isCanvasClickFocus ? urlFocusSlug : undefined) ??
      undefined;

    if (
      effectiveCenterSlug &&
      (effectiveCenterSlug === urlFocusSlug || effectiveCenterSlug === pendingCenterSlug) &&
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

      const directCorpusMatch = apertureCorpus.find(
        (e) =>
          e.i === centerSlug ||
          toUrlSlug(e.i) === centerSlug ||
          toUrlSlug(e.n) === centerSlug,
      );
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
          const host = apertureCorpus.find(
            (e) => e.i === directCorpusMatch.s || toUrlSlug(e.i) === directCorpusMatch.s,
          );
          if (
            host?.p &&
            (centerSlug === 'sol' || host.p[0] !== 0 || host.p[1] !== 0 || host.p[2] !== 0)
          ) {
            return [host.p[0], host.p[1], host.p[2]];
          }
        }
      }

      const hostCorpusMatch = apertureCorpus.find(
        (e) =>
          (e.i === centerSlug || toUrlSlug(e.i) === centerSlug) &&
          e.p &&
          (centerSlug === 'sol' || e.p[0] !== 0 || e.p[1] !== 0 || e.p[2] !== 0),
      );
      if (hostCorpusMatch?.p) {
        return [hostCorpusMatch.p[0], hostCorpusMatch.p[1], hostCorpusMatch.p[2]];
      }

      const childCorpusMatch = apertureCorpus.find(
        (e) => e.s && (e.s === centerSlug || toUrlSlug(e.s) === centerSlug),
      );
      if (childCorpusMatch?.s) {
        const host = apertureCorpus.find(
          (e) => e.i === childCorpusMatch.s || toUrlSlug(e.i) === childCorpusMatch.s,
        );
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
    centerEntity,
    focusedEntity,
    pendingCenterSlug,
    selectedEntities,
    urlFocusSlug,
  ]);

  const handleSelectSystem = useCallback((id: string | null) => {
    const slug = id ? toUrlSlug(id) : null;
    if (slug) {
      canvasFocusedSlugsRef.current.add(slug);
    }
    if (id) {
      canvasFocusedSlugsRef.current.add(id);
    }
    pendingCanvasFocusRef.current = { active: true, slug };
    useCameraStore.getState().setPendingCenterSlug(null);
    if (id) {
      void router
        .navigate({
          to: '/galaxy',
          search: (prev) => ({
            ...prev,
            focus: id,
          }),
          replace: true,
        })
        .catch(() => {});
    } else {
      void router
        .navigate({
          to: '/galaxy',
          search: (prev) => ({
            ...prev,
            focus: undefined,
          }),
          replace: true,
        })
        .catch(() => {});
    }
  }, []);

  return (
    <SpatialShell
      testId="galaxy-view-root"
      canvas={
        <CanvasLayer
          scope="galaxy"
          selectedEntities={canvasEntities}
          centerId={cameraState.center}
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
        />
      }
      breadcrumbs={<Breadcrumbs items={[{ label: 'Galaxy' }]} />}
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
          onHoverEntity={(id) => storeApi.getState().setHovered(id)}
        />
      }
    />
  );
};
