import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
} from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../components/canvas/entity/SpatialEntityStore';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
import {
  extractUrlSceneCameraState,
  mergeActiveStarsIntoCorpus,
} from '../services/detailsService';
import { useSearch } from '@tanstack/react-router';
import { resolveFocusedEntityFromCorpus, toUrlSlug } from '../services/searchService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import { useLayerIndex, useLoadedLayerManifests } from '../hooks/useLayerData';
import {
  appRouter,
  useSpaLocation,
  type StarmapSearchParams,
} from '../hooks/useSpaLocation';
import { useActiveStarsStore } from '../stores/useActiveStarsStore';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';
import { resolveGalaxyCenterCoordinates } from './galaxyCenterResolution';
import { useGalaxyAperture } from './useGalaxyAperture';
import { useGalaxyFocusAndSelection } from './useGalaxyFocusAndSelection';
import { useGalaxyPanels } from './useGalaxyPanels';
import { useGalaxyStoreSync } from './useGalaxyStoreSync';

export interface UseGalaxyViewModelParams {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const EMPTY_CORPUS: readonly CompactSearchEntry[] = [];
const EMPTY_SELECTED_ENTITIES: readonly SpatialEntityDefinition[] = [];

export function useGalaxyViewModel({
  initialCorpus,
  locationPathname,
  locationSearch,
}: UseGalaxyViewModelParams) {
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
  const hasExplicitFocus = Boolean(focus && urlFocusSlug && urlFocusSlug.length > 0);
  const pendingCenterSlug = useCameraStore((state) => state.pendingCenterSlug);
  const canvasFocusedSlugs = useCameraStore((state) => state.canvasFocusedSlugs);

  const activeStars = useActiveStarsStore((state) => state.summaries);
  const apertureCorpus = useMemo(
    () => mergeActiveStarsIntoCorpus(activeCorpus, activeStars),
    [activeCorpus, activeStars],
  );

  const layerIndex = useLayerIndex();
  const loadedLayers = useLoadedLayerManifests(layer ? `?layer=${encodeURIComponent(layer)}` : search);
  const selectQuery = select ? `?select=${encodeURIComponent(select)}` : search;

  const {
    focusedEntity,
    urlSelectedEntities,
    selectedEntities,
    canvasEntities,
    targetSystemId,
  } = useGalaxyFocusAndSelection({
    urlFocusSlug,
    storeFocusedEntity,
    apertureCorpus,
    activeCorpus,
    storeSelected,
    layerIndex,
    loadedLayers,
    selectQuery,
  });

  const hasExplicitSelection = Boolean(search.includes('select=') || search.includes('layer='));

  const cameraState = useMemo(() => extractUrlSceneCameraState(search), [search]);
  const centerEntity = useMemo(() => {
    if (!cameraState.center) return null;
    const inStore = storeApi.getState().entities[cameraState.center];
    if (inStore) return inStore;
    return apertureCorpus.length > 0
      ? resolveFocusedEntityFromCorpus(cameraState.center, apertureCorpus)
      : null;
  }, [cameraState.center, storeApi, apertureCorpus]);

  const { liveApertureRadius, instrumentAperture } = useGalaxyAperture({
    cameraState,
    apertureCorpus,
    focusedEntity,
    centerEntity,
    urlFocusSlug,
  });

  useGalaxyStoreSync({
    storeApi,
    urlFocusSlug,
    hasExplicitFocus,
    focusedEntity,
    urlSelectedEntities,
    hasExplicitSelection,
    apertureIds: instrumentAperture.apertureIds,
    liveApertureRadius,
    pathname,
    search,
    isExplicitLocation,
  });

  const {
    focusedDetails,
    focusedPreview,
    galaxyBodies,
    minimapOrientation,
    activeJourney,
    orbitalSchematic,
    activeLayerCard,
    routeStops,
  } = useGalaxyPanels({
    focusedEntity,
    apertureCorpus,
    targetSystemId,
    urlFocusSlug,
    hasExplicitFocus,
    pathname,
    search,
    activeCorpus,
    loadedLayers,
    layerParam: layer ?? searchParams.get('layer'),
    cameraState,
    centerEntity,
    selectedEntities,
    instrumentAperture,
    route,
    journeyOption,
  });

  const resolvedCenterCoordinates = useMemo(
    () =>
      resolveGalaxyCenterCoordinates({
        cameraState,
        urlFocusSlug,
        canvasFocusedSlugs,
        pendingCenterSlug,
        center,
        focusedEntity,
        centerEntity,
        selectedEntities,
        apertureCorpus,
      }),
    [
      apertureCorpus,
      cameraState,
      canvasFocusedSlugs,
      center,
      centerEntity,
      focusedEntity,
      pendingCenterSlug,
      selectedEntities,
      urlFocusSlug,
    ],
  );

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

  const centerId = center ? toUrlSlug(center) : cameraState.center;

  return {
    pathname,
    search,
    canvasEntities,
    cameraState,
    centerId,
    resolvedCenterCoordinates,
    activeJourney,
    activeLayerCard,
    focusedDetails,
    orbitalSchematic,
    focusedPreview,
    minimapOrientation,
    galaxyBodies,
    routeStops,
    handleHoverEntity,
    handleFocusChange,
    handleSelectSystem: handleFocusChange,
  };
}
