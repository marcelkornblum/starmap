import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
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
import { CANDIDATE_SYSTEMS } from '../data';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import { toAnnotationLookupKey } from '../utils/datasetLayerCodec';
import {
  useEntityAnnotations,
  useLayerIndex,
  useLoadedLayerManifests,
} from '../hooks/useLayerData';
import { router, useSpaLocation } from '../router';

export interface GalaxyViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

export const GalaxyView: React.FC<GalaxyViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  const storeApi = useSpatialEntityStoreApi();
  useSpatialEntityStore((state) => state.entities);
  useSpatialEntityStore((state) => state.focusedId);
  useSpatialEntityStore((state) => state.selectedId);
  const hoveredId = useSpatialEntityStore((state) => state.hoveredId);
  const liveApertureRadius = useSpatialEntityStore((state) => state.apertureRadius);
  const liveApertureCenter = useSpatialEntityStore((state) => state.apertureCenter);

  const [, setShardTick] = useState<number>(0);

  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '/galaxy',
  );

  const urlSystemSlug = extractUrlSystemSlug(pathname);
  const urlFocusSlug = extractUrlFocusSlug(pathname, search);
  const hasExplicitFocus = hasExplicitFocusParam(search);

  if (
    (locationPathname !== undefined || locationSearch !== undefined) &&
    !urlFocusSlug &&
    !hasExplicitFocus
  ) {
    if (storeApi.getState().focusedId) {
      storeApi.getState().setFocused(null);
    }
  }

  const prevUrlRef = useRef<string>(`${pathname}${search}`);
  useEffect(() => {
    const nextUrl = `${pathname}${search}`;
    if (prevUrlRef.current !== nextUrl) {
      prevUrlRef.current = nextUrl;
      if (!urlFocusSlug && !hasExplicitFocus) {
        storeApi.getState().setFocused(null);
      }
    }
  }, [pathname, search, urlFocusSlug, hasExplicitFocus, storeApi]);

  const cachedAllCorpus = getCachedCorpusForFilter('all');
  const activeCorpus = initialCorpus ?? cachedAllCorpus ?? [];

  const urlFocusEntity = useMemo(
    () =>
      urlFocusSlug
        ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
        : null,
    [urlFocusSlug, activeCorpus],
  );
  const focusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? storeApi.getState().getEntitiesByState('focused')[0] ?? null)
    : (storeApi.getState().getEntitiesByState('focused')[0] ?? null);
  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const storeSelected = storeApi.getState().getEntitiesByState('selected');
  const selectedEntities = useMemo(
    () =>
      storeSelected.length > 0
        ? storeSelected
        : resolveSelectedSystemsFromUrlSelect(
            search,
            activeCorpus,
            layerIndex,
            loadedLayers,
          ),
    [activeCorpus, layerIndex, loadedLayers, search, storeSelected],
  );

  useEffect(() => {
    const nextIds = selectedEntities.map((e) => e.id);
    const current = storeApi.getState().selectedIds;
    if (
      current.size !== nextIds.length ||
      !nextIds.every((id) => current.has(id))
    ) {
      storeApi.getState().setSelectedIds(nextIds);
    }
  }, [selectedEntities, storeApi]);
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
    corpus: activeCorpus,
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
    return activeCorpus.length > 0
      ? resolveFocusedEntityFromCorpus(cameraState.center, activeCorpus)
      : null;
  }, [cameraState.center, storeApi, activeCorpus]);

  const instrumentAperture = useMemo(
    () =>
      resolveGalacticInstrumentAperture({
        cameraState,
        corpus: activeCorpus,
        focusedEntity,
        centerEntity,
        urlSystemSlug,
        liveApertureCenterPc: liveApertureCenter,
        liveApertureRadiusPc: liveApertureRadius,
      }),
    [
      cameraState,
      activeCorpus,
      focusedEntity,
      centerEntity,
      urlSystemSlug,
      liveApertureCenter,
      liveApertureRadius,
    ],
  );

  useEffect(() => {
    storeApi.getState().setApertureIds(instrumentAperture.apertureIds);
  }, [storeApi, instrumentAperture.apertureIds]);

  const galaxyBodies = useMemo(
    () =>
      extractGalaxyBodies({
        corpus: activeCorpus,
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
      activeCorpus,
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
        ? buildSystemOrbitalSchematic(focusedDetails, activeCorpus)
        : null,
    [focusedDetails, activeCorpus],
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

    if (centerEntity?.position) {
      const p = centerEntity.position;
      const coords: [number, number, number] =
        p instanceof THREE.Vector3 ? [p.x, p.y, p.z] : [p[0], p[1], p[2]];
      if (cameraState.center === 'sol' || coords[0] !== 0 || coords[1] !== 0 || coords[2] !== 0) {
        return coords;
      }
    }

    if (cameraState.center) {
      const centerSlug = cameraState.center;

      const candidateMatch = CANDIDATE_SYSTEMS.find(
        (s) =>
          s.id === centerSlug ||
          toUrlSlug(s.id) === centerSlug ||
          toUrlSlug(s.name) === centerSlug,
      );
      if (candidateMatch?.position) {
        const p = candidateMatch.position;
        const coords: [number, number, number] =
          p instanceof THREE.Vector3 ? [p.x, p.y, p.z] : [p[0], p[1], p[2]];
        if (centerSlug === 'sol' || coords[0] !== 0 || coords[1] !== 0 || coords[2] !== 0) {
          return coords;
        }
      }

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

      const directCorpusMatch = activeCorpus.find(
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
          const host = activeCorpus.find(
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

      const hostCorpusMatch = activeCorpus.find(
        (e) =>
          (e.i === centerSlug || toUrlSlug(e.i) === centerSlug) &&
          e.p &&
          (centerSlug === 'sol' || e.p[0] !== 0 || e.p[1] !== 0 || e.p[2] !== 0),
      );
      if (hostCorpusMatch?.p) {
        return [hostCorpusMatch.p[0], hostCorpusMatch.p[1], hostCorpusMatch.p[2]];
      }

      const childCorpusMatch = activeCorpus.find(
        (e) => e.s && (e.s === centerSlug || toUrlSlug(e.s) === centerSlug),
      );
      if (childCorpusMatch?.s) {
        const host = activeCorpus.find(
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
    activeCorpus,
    cameraState.center,
    cameraState.x,
    cameraState.y,
    cameraState.z,
    centerEntity,
    selectedEntities,
  ]);

  const handleSelectSystem = useCallback((id: string | null) => {
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
          selectedEntities={selectedEntities}
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
      primaryFloat={
        activeJourney ? (
          <DirectionsPanel journey={activeJourney} />
        ) : (
          <DetailsPanel
            details={focusedDetails}
            schematic={orbitalSchematic}
            preview={focusedPreview}
          />
        )
      }
      preview={activeJourney ? <PreviewPanel preview={focusedPreview} /> : null}
      minimap={<Minimap orientation={minimapOrientation} />}
      bodies={
        <BodiesPanel
          elements={galaxyBodies}
          hoveredEntityId={hoveredId}
          onHoverEntity={(id) => storeApi.getState().setHovered(id)}
        />
      }
    />
  );
};
