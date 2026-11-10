import { useEffect, useMemo } from 'react';
import { useSpatialEntityStoreApi } from '../components/canvas/entity/SpatialEntityContext';
import { EARTH_REFERENCE_TARGET } from '../config/referenceTargets';
import {
  buildJourneyPlan,
  extractUrlJourneyOptionId,
  extractUrlRouteStops,
} from '../services/journeyService';
import { resolveActiveLayerCard } from '../services/layerCardService';
import {
  buildFocusedPreviewSummary,
  buildPlanetaryBodiesSummary,
  buildPlanetMinimapOrientation,
  buildPlanetaryOrbitalSchematic,
  buildPlanetViewBreadcrumbs,
  extractUrlSceneCameraState,
} from '../services/detailsService';
import { useParams, useSearch } from '@tanstack/react-router';
import { toUrlSlug } from '../services/searchService';
import { useLoadedLayerManifests } from '../hooks/useLayerData';
import {
  useSpaLocation,
  type StarmapSearchParams,
} from '../hooks/useSpaLocation';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import {
  useResolvedPlanetDetails,
  type UseResolvedPlanetDetailsProps,
} from './useResolvedPlanetDetails';

export type UsePlanetViewModelProps = UseResolvedPlanetDetailsProps;

export function usePlanetViewModel(props: UsePlanetViewModelProps) {
  const { locationPathname, locationSearch, planetId: propPlanetId } = props;
  const {
    focusedDetails,
    systemContextDetails,
    planetEntityDetail,
    focusedDetail,
    canonRecords,
    selectedEntityIds,
    selectedEntities,
    activeCorpus,
    urlPlanetSlug,
    focusedEntity,
  } = useResolvedPlanetDetails(props, true);

  const storeApi = useSpatialEntityStoreApi();
  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    EARTH_REFERENCE_TARGET.href,
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
  const targetId = toUrlSlug(rawPlanetId ?? '') || EARTH_REFERENCE_TARGET.id;
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

  const planetaryBodies = useMemo(
    () =>
      buildPlanetaryBodiesSummary({
        details: systemContextDetails,
        urlPlanetSlug,
        planetEntityDetail,
        corpus: activeCorpus,
        canonRecords,
        selectedEntityIds,
        focusedEntityId: focusedEntity?.id,
      }),
    [
      systemContextDetails,
      urlPlanetSlug,
      planetEntityDetail,
      activeCorpus,
      canonRecords,
      selectedEntityIds,
      focusedEntity,
    ],
  );

  const orbitalSchematic = useMemo(
    () => buildPlanetaryOrbitalSchematic(planetaryBodies, activeCorpus),
    [planetaryBodies, activeCorpus],
  );

  const focusedPreview = useMemo(
    () => buildFocusedPreviewSummary(focusedDetails, focusedDetail),
    [focusedDetails, focusedDetail],
  );

  const minimapOrientation = useMemo(
    () =>
      planetaryBodies
        ? buildPlanetMinimapOrientation(
            planetaryBodies,
            focusedEntity,
            selectedEntities,
            cameraState,
          )
        : null,
    [planetaryBodies, focusedEntity, selectedEntities, cameraState],
  );

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

  return {
    pathname,
    search,
    targetId,
    effectiveCenterId,
    cameraState,
    activeJourney,
    activeLayerCard,
    focusedDetails,
    orbitalSchematic,
    focusedPreview,
    minimapOrientation,
    planetaryBodies,
    routeStops,
    resolvedBreadcrumbs,
  };
}
