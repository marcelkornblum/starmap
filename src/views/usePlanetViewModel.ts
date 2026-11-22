import { useCallback, useEffect, useMemo } from 'react';
import { useSpatialEntityStoreApi } from '../components/canvas/entity/SpatialEntityContext';
import { EARTH_REFERENCE_TARGET } from '../config/referenceTargets';
import { buildJourneyPlan } from '../services/journey/journeyBuilder';
import {
  extractUrlJourneyOptionId,
  extractUrlRouteStops,
} from '../services/journey/journeyProfilesAndUrls';
import { resolveActiveLayerCard } from '../services/layerCardService';
import { buildFocusedPreviewSummary } from '../services/details/detailsPreview';
import { buildPlanetaryBodiesSummary } from '../services/details/planetaryBodiesSummary';
import { buildPlanetMinimapOrientation } from '../services/details/planetMinimap';
import { buildPlanetaryOrbitalSchematic } from '../services/details/planetaryOrbitalSchematic';
import { buildPlanetViewBreadcrumbs } from '../services/details/detailsBreadcrumbs';
import { extractUrlSceneCameraState } from '../services/details/detailsCamera';
import { useParams, useSearch } from '@tanstack/react-router';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { useLoadedLayerManifests } from '../hooks/useLayerData';
import {
  useOptionalRouter,
  useSpaLocation,
  type StarmapSearchParams,
} from '../hooks/useSpaLocation';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import {
  useResolvedPlanetDetails,
  type UseResolvedPlanetDetailsProps,
} from './useResolvedPlanetDetails';
import { useColdLoadCenter } from './useColdLoadCenterId';

export function usePlanetViewModel(props: UseResolvedPlanetDetailsProps) {
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

  const router = useOptionalRouter();
  const storeApi = useSpatialEntityStoreApi();
  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    EARTH_REFERENCE_TARGET.href,
  );

  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;

  const isExplicitLocation = locationPathname !== undefined || locationSearch !== undefined;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const param = (key: keyof StarmapSearchParams) =>
    (isExplicitLocation ? searchParams.get(key) : (routeSearch?.[key] ?? searchParams.get(key))) ?? undefined;
  const [focus, layer, route, center] = (['focus', 'layer', 'route', 'center'] as const).map(param);

  const rawPlanetId = isExplicitLocation
    ? propPlanetId
    : (routeParams?.planetId ?? propPlanetId);
  const targetId = toUrlSlug(rawPlanetId ?? '') || urlPlanetSlug || EARTH_REFERENCE_TARGET.id;
  const urlFocusSlug = focus ? toUrlSlug(focus) || null : null;
  const cameraState = useMemo(() => extractUrlSceneCameraState(search), [search]);
  const { effectiveCenterId, resolvedCenterCoordinates } = useColdLoadCenter(
    center,
    cameraState,
    urlFocusSlug,
  );

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

  const routeSearchQuery = route ? `?route=${encodeURIComponent(route)}` : search;
  const routeStops = extractUrlRouteStops(routeSearchQuery, 'planet');
  const routeOptionId = extractUrlJourneyOptionId(routeSearchQuery);
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

  const handleSelectEntity = useCallback(
    (id: string | null) => {
      if (id) {
        if (useUIStore.getState().detailsDetent === 'collapsed') {
          useUIStore.getState().setDetailsDetent('peek');
        }
        if (router && typeof router.navigate === 'function') {
          void Promise.resolve(
            router.navigate({
              to: '/planet/$planetId',
              params: { planetId: targetId },
              search: (prev: StarmapSearchParams = {}) => ({
                ...prev,
                focus: id,
              }),
              replace: true,
            }),
          ).catch(() => {});
        }
      } else if (router && typeof router.navigate === 'function') {
        void Promise.resolve(
          router.navigate({
            to: '/planet/$planetId',
            params: { planetId: targetId },
            search: (prev: StarmapSearchParams = {}) => {
              const next = { ...prev };
              delete next.focus;
              return next;
            },
            replace: true,
          }),
        ).catch(() => {});
      }
    },
    [router, targetId],
  );

  return {
    pathname,
    search,
    targetId,
    effectiveCenterId,
    resolvedCenterCoordinates,
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
    handleSelectEntity,
  };
}
