import { useCallback, useEffect, useMemo } from 'react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import {
  buildJourneyPlan,
  extractUrlJourneyOptionId,
  extractUrlRouteStops,
} from '../services/journeyService';
import { resolveActiveLayerCard } from '../services/layerCardService';
import {
  buildFocusedPreviewSummary,
  buildSystemBodiesSummary,
  buildSystemMinimapOrientation,
  buildSystemOrbitalSchematic,
  buildSystemViewBreadcrumbs,
  extractUrlSceneCameraState,
} from '../services/detailsService';
import { useParams, useSearch } from '@tanstack/react-router';
import {
  resolveSelectedSystemsFromUrlSelect,
  toUrlSlug,
} from '../services/searchService';
import { useLayerIndex, useLoadedLayerManifests } from '../hooks/useLayerData';
import {
  appRouter,
  useSpaLocation,
  type StarmapSearchParams,
} from '../hooks/useSpaLocation';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import {
  useResolvedSystemDetails,
  type UseResolvedSystemDetailsProps,
} from './useResolvedSystemDetails';
import { useSystemOutOfScopeGuard } from './useSystemOutOfScopeGuard';

export type UseSystemViewModelProps = UseResolvedSystemDetailsProps;

export function useSystemViewModel(props: UseSystemViewModelProps) {
  const { locationPathname, locationSearch, systemId: propSystemId } = props;
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
    SOL_REFERENCE_TARGET.href,
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
  const targetId = toUrlSlug(rawSystemId ?? '') || SOL_REFERENCE_TARGET.id;
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

  const handleSelectEntity = useCallback(
    (id: string | null) => {
      if (id) {
        void appRouter
          .navigate?.({
            to: '/system/$systemId',
            params: { systemId: targetId },
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
            to: '/system/$systemId',
            params: { systemId: targetId },
            search: (prev: StarmapSearchParams = {}) => {
              const next = { ...prev };
              delete next.focus;
              return next;
            },
            replace: true,
          })
          ?.catch(() => {});
      }
    },
    [targetId],
  );

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const storeSelected = storeApi.getState().getEntitiesByState('selected');
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

  useSystemOutOfScopeGuard({
    urlSystemSlug,
    activeCorpus,
    urlFocusSlug,
    isFocusInThisSystem,
    center,
    targetSystemId,
    systemDetail,
  });

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
    systemBodies,
    routeStops,
    resolvedBreadcrumbs,
    handleSelectEntity,
  };
}
