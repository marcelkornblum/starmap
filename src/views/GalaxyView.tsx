import React, { useEffect, useMemo, useState } from 'react';
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
} from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

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

  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/galaxy');
  const search =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const urlSystemSlug = extractUrlSystemSlug(pathname);
  const urlFocusSlug = extractUrlFocusSlug(pathname, search);
  const hasExplicitFocus = hasExplicitFocusParam(search);

  const cachedAllCorpus = getCachedCorpusForFilter('all');
  const activeCorpus = initialCorpus ?? cachedAllCorpus ?? [];

  const urlFocusEntity = urlFocusSlug
    ? resolveFocusedEntityFromCorpus(urlFocusSlug, activeCorpus)
    : null;
  const focusedEntity = urlFocusSlug
    ? (urlFocusEntity ?? storeApi.getState().getEntitiesByState('focused')[0] ?? null)
    : (hasExplicitFocus ? (storeApi.getState().getEntitiesByState('focused')[0] ?? null) : null);
  const storeSelected = storeApi.getState().getEntitiesByState('selected');
  const selectedEntities =
    storeSelected.length > 0
      ? storeSelected
      : resolveSelectedSystemsFromUrlSelect(search, activeCorpus);
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

  useEffect(() => {
    if (!focusedEntity || initialCorpus || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    void Promise.all([
      fetchSummaryNode(targetSystemId).catch(() => undefined),
      fetchDetailRecord(targetSystemId).catch(() => undefined),
      focusedEntity.id !== targetSystemId
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
  }, [focusedEntity, initialCorpus, targetSystemId]);

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

  const searchParams = new URLSearchParams(search);
  const layerParam = searchParams.get('layer');
  const activeLayerCard = resolveActiveLayerCard({
    layerParam,
    currentPathname: pathname,
    currentSearch: search,
    corpus: activeCorpus,
  });

  return (
    <SpatialShell
      testId="galaxy-view-root"
      canvas={
        <CanvasLayer
          scope="galaxy"
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
      breadcrumbs={<Breadcrumbs items={[{ label: 'Galaxy' }]} />}
      controls={<ControlBar scope="galaxy" />}
      search={
        <Search.Root
          limitPerCategory={3}
          initialCorpus={initialCorpus}
          locationPathname={locationPathname}
          locationSearch={locationSearch}
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
          <DetailsPanel details={focusedDetails} />
        )
      }
      preview={<PreviewPanel preview={focusedPreview} />}
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
