import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useParams, useSearch } from '@tanstack/react-router';
import { useSpatialEntityStore, useSpatialEntityStoreApi } from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../types/spatial';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import { buildJourneyPlan } from '../services/journey/journeyBuilder';
import { extractUrlJourneyOptionId, extractUrlRouteStops } from '../services/journey/journeyProfilesAndUrls';
import { resolveActiveLayerCard } from '../services/layerCardService';
import { buildFocusedPreviewSummary } from '../services/details/detailsPreview';
import { buildSystemBodiesSummary } from '../services/details/systemBodiesSummary';
import { buildSystemMinimapOrientation } from '../services/details/systemMinimap';
import { buildSystemOrbitalSchematic } from '../services/details/systemOrbitalSchematic';
import { buildSystemViewBreadcrumbs } from '../services/details/detailsBreadcrumbs';
import { extractUrlSceneCameraState } from '../services/details/detailsCamera';
import { resolveSelectedSystemsFromUrlSelect } from '../services/search/searchUrlSelectionResolvers';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { useLayerIndex, useLoadedLayerManifests } from '../hooks/useLayerData';
import { useOptionalRouter, useSpaLocation, type StarmapSearchParams } from '../hooks/useSpaLocation';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import { useResolvedSystemDetails, type UseResolvedSystemDetailsProps } from './useResolvedSystemDetails';
import { useSystemOutOfScopeGuard } from './useSystemOutOfScopeGuard';

const EMPTY_SELECTED_ENTITIES: readonly SpatialEntityDefinition[] = [];

export function useSystemViewModel(props: UseResolvedSystemDetailsProps) {
  const { locationPathname, locationSearch, systemId: propSystemId } = props;
  const router = useOptionalRouter();
  const storeApi = useSpatialEntityStoreApi();
  const storeSelected = useSpatialEntityStore(
    useShallow((state) => {
      const hasSet = state.selectedIds && state.selectedIds.size > 0;
      if (!hasSet && !state.selectedId) return EMPTY_SELECTED_ENTITIES;
      const list: SpatialEntityDefinition[] = [];
      if (hasSet) {
        for (const id of state.selectedIds) {
          const ent = state.entities[id];
          if (ent) list.push(ent);
        }
      } else if (state.selectedId) {
        const ent = state.entities[state.selectedId];
        if (ent) list.push(ent);
      }
      return list.length > 0 ? list : EMPTY_SELECTED_ENTITIES;
    }),
  );

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

  const rawSystemId = routeParams?.systemId ?? propSystemId;
  const targetId = toUrlSlug(rawSystemId ?? '') || SOL_REFERENCE_TARGET.id;
  const urlFocusSlug = focus ? toUrlSlug(focus) || null : null;
  const cameraState = useMemo(() => extractUrlSceneCameraState(search), [search]);
  const effectiveCenterId = useMemo(
    () => (center ? toUrlSlug(center) : cameraState.center),
    [center, cameraState.center],
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

  const breadcrumbs = useMemo(
    () => buildSystemViewBreadcrumbs(systemContextDetails, urlSystemSlug),
    [systemContextDetails, urlSystemSlug],
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
      if (!router || typeof router.navigate !== 'function') {
        return;
      }
      if (id) {
        void Promise.resolve(
          router.navigate({
            to: '/system/$systemId',
            params: { systemId: targetId },
            search: (prev: StarmapSearchParams = {}) => ({
              ...prev,
              focus: id,
            }),
            replace: true,
          }),
        ).catch(() => {});
      } else {
        void Promise.resolve(
          router.navigate({
            to: '/system/$systemId',
            params: { systemId: targetId },
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

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(search);

  const selectQuery = select ? `?select=${encodeURIComponent(select)}` : search;
  const selectedEntities = useMemo(
    () =>
      storeSelected.length > 0
        ? storeSelected
        : resolveSelectedSystemsFromUrlSelect(
            selectQuery,
            activeCorpus,
            layerIndex,
            loadedLayers,
          ),
    [storeSelected, selectQuery, activeCorpus, layerIndex, loadedLayers],
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

  const systemBodies = useMemo(
    () =>
      buildSystemBodiesSummary({
        details: systemContextDetails,
        corpus: activeCorpus,
        canonRecords,
        selectedEntityIds,
        focusedEntityId,
      }),
    [
      systemContextDetails,
      activeCorpus,
      canonRecords,
      selectedEntityIds,
      focusedEntityId,
    ],
  );

  const orbitalSchematic = useMemo(
    () => buildSystemOrbitalSchematic(systemBodies, activeCorpus),
    [systemBodies, activeCorpus],
  );

  const focusedPreview = useMemo(
    () => buildFocusedPreviewSummary(focusedDetails, focusedDetail),
    [focusedDetails, focusedDetail],
  );

  const minimapOrientation = useMemo(
    () =>
      systemBodies
        ? buildSystemMinimapOrientation(
            systemBodies,
            orbitalSchematic,
            systemContextDetails ?? focusedDetails,
            focusedEntity,
            selectedEntities,
            cameraState,
          )
        : null,
    [
      systemBodies,
      orbitalSchematic,
      systemContextDetails,
      focusedDetails,
      focusedEntity,
      selectedEntities,
      cameraState,
    ],
  );

  const { routeStops, activeJourney } = useMemo(() => {
    if (!route && !search.includes('route=')) {
      return { routeStops: null, activeJourney: null };
    }
    const routeSearchQuery = route ? `?route=${encodeURIComponent(route)}` : search;
    const stops = extractUrlRouteStops(routeSearchQuery, 'system');
    const optionId = extractUrlJourneyOptionId(routeSearchQuery);
    const journey = stops
      ? buildJourneyPlan({
          stops,
          selectedOptionId: optionId,
          corpus: activeCorpus,
          viewScope: 'system',
          currentPathname: pathname,
          currentSearch: search,
        })
      : null;
    return { routeStops: stops, activeJourney: journey };
  }, [route, search, activeCorpus, pathname]);

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
