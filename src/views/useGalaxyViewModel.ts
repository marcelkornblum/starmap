import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSpatialEntityStore, useSpatialEntityStoreApi } from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../types/spatial';
import { scheduleSearchBackgroundWarmup } from '../data/searchBackgroundWarmup';
import { getCachedCorpusForFilter, subscribeSearchRepository } from '../data/searchRepository';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
import { extractUrlSceneCameraState } from '../services/details/detailsCamera';
import { mergeActiveStarsIntoCorpus } from '../services/details/activeStarsCorpus';
import { useSearch } from '@tanstack/react-router';
import { resolveFocusedEntityFromCorpus } from '../services/search/searchSelection';
import { prefetchEntitySelection } from '../services/details/prefetchEntitySelection';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import { parseCenterCoordinatesString } from '../utils/url';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { BoundedLruCache } from '../utils/lruCache';
import { useLayerIndex, useLoadedLayerManifests } from '../hooks/useLayerData';
import { useOptionalRouter, useSpaLocation, type StarmapSearchParams } from '../hooks/useSpaLocation';
import { useActiveStarsStore } from '../stores/useActiveStarsStore';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import { resolveGalaxyCenterCoordinates } from './galaxyCenterResolution';
import { useGalaxyAperture } from './useGalaxyAperture';
import { useGalaxyFocusAndSelection } from './useGalaxyFocusAndSelection';
import { useGalaxyPanels } from './useGalaxyPanels';
import { useGalaxyStoreSync } from './useGalaxyStoreSync';
import { useColdLoadFocusActive } from './useColdLoadCenterId';

export interface UseGalaxyViewModelParams {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];
const EMPTY_SELECTED_ENTITIES: readonly SpatialEntityDefinition[] = [];
const COORD_TUPLE_CACHE = new BoundedLruCache<string, readonly [number, number, number]>(256);

function internCoords(
  coords: readonly [number, number, number] | undefined,
): readonly [number, number, number] | undefined {
  if (!coords) return undefined;
  const key = `${coords[0]},${coords[1]},${coords[2]}`;
  const existing = COORD_TUPLE_CACHE.get(key);
  if (existing) return existing;
  COORD_TUPLE_CACHE.set(key, coords);
  return coords;
}

export function useGalaxyViewModel({
  initialCorpus,
  locationPathname,
  locationSearch,
}: UseGalaxyViewModelParams) {
  const router = useOptionalRouter();
  const storeApi = useSpatialEntityStoreApi();
  const storeFocusedEntity = useSpatialEntityStore((state) =>
    state.focusedId
      ? (state.entities[state.focusedId] ?? null)
      : state.focusedIds?.size
        ? (state.entities[state.focusedIds.values().next().value ?? ''] ?? null)
        : null,
  );
  const storeSelected = useSpatialEntityStore(
    useShallow((state) => {
      const ids = state.selectedIds?.size ? state.selectedIds : state.selectedId ? [state.selectedId] : null;
      if (!ids) return EMPTY_SELECTED_ENTITIES;
      const list: SpatialEntityDefinition[] = [];
      for (const id of ids) {
        const ent = state.entities[id];
        if (ent) list.push(ent);
      }
      return list.length > 0 ? list : EMPTY_SELECTED_ENTITIES;
    }),
  );

  const { corpus: startupCorpus } = useSearchCorpus('startup', initialCorpus);
  const cachedAllCorpus = useSyncExternalStore(
    subscribeSearchRepository,
    () => getCachedCorpusForFilter('all'),
    () => getCachedCorpusForFilter('all'),
  );
  const activeCorpus =
    (initialCorpus ? startupCorpus : (cachedAllCorpus ?? startupCorpus)) ??
    EMPTY_CORPUS;
  const isHydrated = useActiveStarsStore((state) => state.isHydrated);

  useEffect(() => {
    if (!initialCorpus && startupCorpus && isHydrated) {
      scheduleSearchBackgroundWarmup();
    }
  }, [initialCorpus, startupCorpus, isHydrated]);

  const { pathname, search } = useSpaLocation(locationPathname, locationSearch, '/galaxy');

  const routeSearch = useSearch({ strict: false }) as StarmapSearchParams | undefined;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const isExplicitLocation = locationPathname !== undefined || locationSearch !== undefined;
  const param = (key: keyof StarmapSearchParams) =>
    (isExplicitLocation ? searchParams.get(key) : (routeSearch?.[key] ?? searchParams.get(key))) ?? undefined;
  const [focus, select, layer, route, center] = (['focus', 'select', 'layer', 'route', 'center'] as const).map(param);

  const urlFocusSlug = focus ? toUrlSlug(focus) || null : null;
  const hasExplicitFocus = Boolean(focus && urlFocusSlug && urlFocusSlug.length > 0);
  const pendingCenterSlug = useCameraStore((state) => state.pendingCenterSlug);
  const inFlightFocusSlug = useCameraStore((state) => state.inFlightFocusSlug);
  const canvasFocusedSlugs = useCameraStore((state) => state.canvasFocusedSlugs);

  const optimisticFocusSlug =
    inFlightFocusSlug !== undefined
      ? inFlightFocusSlug
      : (pendingCenterSlug ?? urlFocusSlug);
  const effectiveHasExplicitFocus = Boolean(hasExplicitFocus || optimisticFocusSlug);
  const effectiveSearch = useMemo(() => {
    if (isExplicitLocation || !optimisticFocusSlug || optimisticFocusSlug === urlFocusSlug) {
      return search;
    }
    if (
      !search ||
      (!search.includes('&') && (search.startsWith('?focus=') || search.startsWith('focus=')))
    ) {
      return `?focus=${encodeURIComponent(optimisticFocusSlug)}`;
    }
    const p = new URLSearchParams(search);
    p.set('focus', optimisticFocusSlug);
    return `?${p.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',')}`;
  }, [isExplicitLocation, optimisticFocusSlug, urlFocusSlug, search]);

  const activeStars = useActiveStarsStore((state) => state.summaries);
  const apertureCorpus = useMemo(
    () => mergeActiveStarsIntoCorpus(activeCorpus, activeStars),
    [activeCorpus, activeStars],
  );

  const layerIndex = useLayerIndex();
  const loadedLayersSearch = useMemo(() => {
    if (isExplicitLocation) return search;
    const params = new URLSearchParams(search);
    if (layer && !params.has('layer')) params.set('layer', layer);
    if (select && !params.has('select')) params.set('select', select);
    const qs = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
    return qs ? `?${qs}` : '';
  }, [isExplicitLocation, search, layer, select]);
  const loadedLayers = useLoadedLayerManifests(loadedLayersSearch);

  const selectValues = searchParams.getAll('select');
  const effectiveSelectValues = selectValues.length > 0 ? selectValues : select ? [select] : [];
  const selectQuery = effectiveSelectValues.length > 0
    ? `?${effectiveSelectValues.map((v) => `select=${encodeURIComponent(v)}`).join('&')}`.replace(/%3A/gi, ':').replace(/%2C/gi, ',')
    : '';

  const {
    focusedEntity, urlSelectedEntities, selectedEntities, canvasEntities, targetSystemId,
  } = useGalaxyFocusAndSelection({
    urlFocusSlug: optimisticFocusSlug, storeFocusedEntity, apertureCorpus, activeCorpus, storeSelected, layerIndex, loadedLayers, selectQuery,
  });

  const hasExplicitSelection = Boolean(select !== undefined || searchParams.has('select'));

  const cameraState = useMemo(() => extractUrlSceneCameraState(search), [search]);
  const hasExplicitCenterParam = Boolean(center ?? cameraState.center);
  const isColdLoadFocus = useColdLoadFocusActive(hasExplicitCenterParam, optimisticFocusSlug);

  const centerEntity = useMemo(() => {
    if (!cameraState.center || parseCenterCoordinatesString(cameraState.center)) return null;
    return storeApi.getState().entities[cameraState.center] ?? (apertureCorpus.length > 0 ? resolveFocusedEntityFromCorpus(cameraState.center, apertureCorpus) : null);
  }, [cameraState.center, storeApi, apertureCorpus]);

  const { liveApertureRadius, instrumentAperture } = useGalaxyAperture({
    cameraState, apertureCorpus, focusedEntity, centerEntity, urlFocusSlug: optimisticFocusSlug,
  });

  useGalaxyStoreSync({
    storeApi, urlFocusSlug: optimisticFocusSlug, actualUrlFocusSlug: urlFocusSlug,
    hasExplicitFocus: effectiveHasExplicitFocus, focusedEntity, urlSelectedEntities,
    hasExplicitSelection, apertureIds: instrumentAperture.apertureIds,
    liveApertureRadius, pathname, search, isExplicitLocation,
  });

  const {
    focusedDetails, focusedPreview, galaxyBodies, minimapOrientation,
    activeJourney, orbitalSchematic, activeLayerCard, routeStops,
  } = useGalaxyPanels({
    focusedEntity, apertureCorpus, targetSystemId, urlFocusSlug: optimisticFocusSlug, hasExplicitFocus: effectiveHasExplicitFocus,
    pathname, search: effectiveSearch, activeCorpus, loadedLayers, layerParam: layer ?? searchParams.get('layer'),
    cameraState, centerEntity, selectedEntities, instrumentAperture, route,
  });

  const resolvedCenterCoordinates = useMemo(() => {
    const next = resolveGalaxyCenterCoordinates({
      cameraState, urlFocusSlug: optimisticFocusSlug, isColdLoadFocus, canvasFocusedSlugs, pendingCenterSlug,
      center, focusedEntity, centerEntity, selectedEntities, apertureCorpus,
    });
    return internCoords(next);
  }, [
    apertureCorpus, cameraState, canvasFocusedSlugs, center, centerEntity,
    focusedEntity, isColdLoadFocus, optimisticFocusSlug, pendingCenterSlug, selectedEntities,
  ]);

  const handleHoverEntity = useCallback(
    (id: string | null) => { storeApi.getState().setHovered(id); },
    [storeApi],
  );

  const handleFocusChange = useCallback(
    (id: string | null): void => {
      const slug = id ? toUrlSlug(id) : null;
      const cam = useCameraStore.getState();
      if (id && slug) {
        prefetchEntitySelection(id, id);
        cam.recordCanvasFocus([slug, id]);
        cam.setPendingCenterSlug(null);
        cam.setInFlightFocusSlug(slug);
        if (useUIStore.getState().detailsDetent === 'collapsed') {
          useUIStore.getState().setDetailsDetent('peek');
        }
      } else {
        cam.clearCanvasFocus();
        cam.setPendingCenterSlug(null);
        cam.setInFlightFocusSlug(null);
      }
      if (router && typeof router.navigate === 'function') {
        const currentPathname = router.state?.location?.pathname;
        const navPromise = router.navigate({
          to: currentPathname === '/' ? '/' : '/galaxy',
          search: (prev: StarmapSearchParams = {}) => {
            const next = { ...prev };
            if (id) next.focus = id;
            else delete next.focus;
            return next;
          },
          replace: true,
        });
        if (navPromise && typeof navPromise.then === 'function') {
          void navPromise.catch(() => {}).finally(() => {
            if (useCameraStore.getState().inFlightFocusSlug === slug) {
              useCameraStore.getState().setInFlightFocusSlug(undefined);
            }
          });
        } else {
          cam.setInFlightFocusSlug(undefined);
        }
      } else {
        cam.setInFlightFocusSlug(undefined);
      }
    },
    [router],
  );

  const rawCenter = center ?? cameraState.center;
  const centerId = rawCenter && !parseCenterCoordinatesString(rawCenter)
    ? toUrlSlug(rawCenter)
    : undefined;

  return {
    pathname, search, canvasEntities, cameraState, centerId, resolvedCenterCoordinates,
    activeJourney, activeLayerCard, focusedDetails, orbitalSchematic, focusedPreview,
    minimapOrientation, galaxyBodies, routeStops, handleHoverEntity,
    handleFocusChange, handleSelectSystem: handleFocusChange,
  };
}
