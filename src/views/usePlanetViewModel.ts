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
import { buildOrbitalSchematic } from '../services/details/orbitalSchematicBuilder';
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
import { useScaleCenterResolution } from './useColdLoadCenterId';

export function usePlanetViewModel(props: UseResolvedPlanetDetailsProps) {
  const { locationPathname, locationSearch, planetId: propPlanetId } = props;
  const {
    focusedDetails,
    systemContextDetails,
    planetEntityDetail,
    systemDetail,
    focusedDetail,
    solPrimaryReady,
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
  const { effectiveCenterId, resolvedCenterCoordinates } = useScaleCenterResolution({
    center,
    cameraState,
    urlFocusSlug,
  });

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
    () =>
      buildOrbitalSchematic({
        focusedDetails,
        systemDetail,
        focusedDetail: focusedDetail ?? planetEntityDetail,
        corpus: activeCorpus,
        selectedEntityIds,
        detailCacheKey: solPrimaryReady ? 1 : 0,
      }),
    [
      focusedDetails,
      systemDetail,
      focusedDetail,
      planetEntityDetail,
      activeCorpus,
      selectedEntityIds,
      solPrimaryReady,
    ],
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
            focusedDetails?.planeInclinationDeg,
          )
        : null,
    [
      planetaryBodies,
      focusedEntity,
      selectedEntities,
      cameraState,
      focusedDetails?.planeInclinationDeg,
    ],
  );

  const breadcrumbs = useMemo(
    () =>
      buildPlanetViewBreadcrumbs(
        focusedDetails,
        planetaryBodies,
        urlPlanetSlug,
      ),
    [focusedDetails, planetaryBodies, urlPlanetSlug],
  );

  const lastGalaxySearch = useCameraStore((s) => s.lastGalaxySearch);
  const resolvedBreadcrumbs = useMemo(() => {
    if (!lastGalaxySearch) return breadcrumbs;
    const query = lastGalaxySearch.startsWith('?') ? lastGalaxySearch : `?${lastGalaxySearch}`;
    return breadcrumbs.map((item) =>
      item.label === 'Galaxy' ? { ...item, href: `/galaxy${query}` } : item,
    );
  }, [breadcrumbs, lastGalaxySearch]);

  const { routeStops, activeJourney } = useMemo(() => {
    if (!route && !search.includes('route=')) {
      return { routeStops: null, activeJourney: null };
    }
    const routeSearchQuery = route ? `?route=${encodeURIComponent(route)}` : search;
    const stops = extractUrlRouteStops(routeSearchQuery, 'planet');
    const routeOptionId = extractUrlJourneyOptionId(routeSearchQuery);
    const journey = stops
      ? buildJourneyPlan({
          stops,
          selectedOptionId: routeOptionId,
          corpus: activeCorpus,
          viewScope: 'planet',
          currentPathname: pathname,
          currentSearch: search,
        })
      : null;
    return { routeStops: stops, activeJourney: journey };
  }, [route, search, activeCorpus, pathname]);

  const layerParam = layer ?? searchParams.get('layer');
  const layerManifestQuery = layerParam ? `?layer=${encodeURIComponent(layerParam)}` : '';
  const loadedLayers = useLoadedLayerManifests(layerManifestQuery);
  const layerCardSearch = layerParam ? search : '';
  const activeLayerCard = useMemo(
    () =>
      layerParam
        ? resolveActiveLayerCard({
            layerParam,
            currentPathname: pathname,
            currentSearch: layerCardSearch,
            corpus: activeCorpus,
            layers: loadedLayers,
          })
        : null,
    [layerParam, pathname, layerCardSearch, activeCorpus, loadedLayers],
  );

  const handleSelectEntity = useCallback(
    (id: string | null) => {
      const cam = useCameraStore.getState();
      if (id) {
        const slug = toUrlSlug(id);
        cam.recordCanvasFocus(slug ? [slug, id] : [id]);
        cam.setPendingCenterSlug(null);
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
      } else {
        cam.clearCanvasFocus();
        cam.setPendingCenterSlug(null);
        if (router && typeof router.navigate === 'function') {
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
