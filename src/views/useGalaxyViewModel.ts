import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSpatialEntityStore, useSpatialEntityStoreApi } from '../components/canvas/entity/SpatialEntityContext';
import type { SpatialEntityDefinition } from '../types/spatial';
import { useSearchCorpus } from '../hooks/useSearchCorpus';
import { extractUrlSceneCameraState } from '../services/details/detailsCamera';
import { mergeActiveStarsIntoCorpus } from '../services/details/activeStarsCorpus';
import { useSearch } from '@tanstack/react-router';
import { resolveFocusedEntityFromCorpus } from '../services/search/searchSelection';
import { toUrlSlug } from '../utils/datasetLayerSlugs';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { useLayerIndex, useLoadedLayerManifests } from '../hooks/useLayerData';
import { appRouter, useSpaLocation, type StarmapSearchParams } from '../hooks/useSpaLocation';
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
  const storeFocusedEntity = useSpatialEntityStore((state) =>
    (state.focusedId && state.entities[state.focusedId]) ? state.entities[state.focusedId] : (state.getEntitiesByState('focused')[0] ?? null),
  );
  const storeSelected = useSpatialEntityStore(
    useShallow((state) => (!state.selectedIds || state.selectedIds.size === 0 ? EMPTY_SELECTED_ENTITIES : state.getEntitiesByState('selected'))),
  );

  const { corpus } = useSearchCorpus('all', initialCorpus);
  const activeCorpus = corpus ?? EMPTY_CORPUS;

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
  const canvasFocusedSlugs = useCameraStore((state) => state.canvasFocusedSlugs);

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
    urlFocusSlug, storeFocusedEntity, apertureCorpus, activeCorpus, storeSelected, layerIndex, loadedLayers, selectQuery,
  });

  const hasExplicitSelection = Boolean(select !== undefined || searchParams.has('select'));

  const cameraState = useMemo(() => extractUrlSceneCameraState(search), [search]);
  const centerEntity = useMemo(() => {
    if (!cameraState.center) return null;
    return storeApi.getState().entities[cameraState.center] ?? (apertureCorpus.length > 0 ? resolveFocusedEntityFromCorpus(cameraState.center, apertureCorpus) : null);
  }, [cameraState.center, storeApi, apertureCorpus]);

  const { liveApertureRadius, instrumentAperture } = useGalaxyAperture({
    cameraState, apertureCorpus, focusedEntity, centerEntity, urlFocusSlug,
  });

  useGalaxyStoreSync({
    storeApi, urlFocusSlug, hasExplicitFocus, focusedEntity, urlSelectedEntities,
    hasExplicitSelection, apertureIds: instrumentAperture.apertureIds,
    liveApertureRadius, pathname, search, isExplicitLocation,
  });

  const {
    focusedDetails, focusedPreview, galaxyBodies, minimapOrientation,
    activeJourney, orbitalSchematic, activeLayerCard, routeStops,
  } = useGalaxyPanels({
    focusedEntity, apertureCorpus, targetSystemId, urlFocusSlug, hasExplicitFocus,
    pathname, search, activeCorpus, loadedLayers, layerParam: layer ?? searchParams.get('layer'),
    cameraState, centerEntity, selectedEntities, instrumentAperture, route,
  });

  const resolvedCenterCoordinates = useMemo(
    () => resolveGalaxyCenterCoordinates({
      cameraState, urlFocusSlug, canvasFocusedSlugs, pendingCenterSlug,
      center, focusedEntity, centerEntity, selectedEntities, apertureCorpus,
    }),
    [apertureCorpus, cameraState, canvasFocusedSlugs, center, centerEntity, focusedEntity, pendingCenterSlug, selectedEntities, urlFocusSlug],
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
      const cam = useCameraStore.getState();
      if (!cam.canvasFocusedSlugs.has(slug)) {
        cam.recordCanvasFocus(slug);
        cam.recordCanvasFocus(id);
      }
      if (useUIStore.getState().detailsDetent === 'collapsed') {
        useUIStore.getState().setDetailsDetent('peek');
      }
    }
    useCameraStore.getState().setPendingCenterSlug(null);
    void appRouter
      .navigate?.({
        to: '/galaxy',
        search: (prev: StarmapSearchParams = {}) => {
          const next = { ...prev };
          if (id) next.focus = id;
          else delete next.focus;
          return next;
        },
        replace: true,
      })
      ?.catch(() => {});
  }, []);

  const centerId = center ? toUrlSlug(center) : cameraState.center;

  return {
    pathname, search, canvasEntities, cameraState, centerId, resolvedCenterCoordinates,
    activeJourney, activeLayerCard, focusedDetails, orbitalSchematic, focusedPreview,
    minimapOrientation, galaxyBodies, routeStops, handleHoverEntity,
    handleFocusChange, handleSelectSystem: handleFocusChange,
  };
}
