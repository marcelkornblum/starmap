import { useCallback, useEffect, useRef } from 'react';
import {
  getCachedCorpusForFilter,
  mergeSearchShards,
} from '../../../data/searchRepository';
import type { AppRouterAdapter } from '../../../hooks/useSpaLocation';
import {
  computeCeilingMaxCameraDistancePc,
  getDeviceTierBudget,
} from '../../../services/deviceTierService';
import type { GroupedSearchResults } from '../../../services/search/searchTypes';
import { resolveSearchFramingAction } from '../../../services/search/searchFramingPolicy';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { SearchCategoryFilter } from '../../../types/search';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import {
  MIN_SEARCH_FRAMING_DISTANCE_PC,
  SEARCH_FRAMING_SETTLE_MS,
} from '../../../utils/searchFraming';
import {
  isSpatialRoutePathname,
  parseSpatialRouteTarget,
} from '../../../utils/spatialRoute';
import { resolveAppHref } from '../../../utils/url';
import type { SearchExecutionStatus } from './SearchContext';
import {
  appendSearchParamsToHref,
  buildPreSearchReturnHref,
  collectSpatialItems,
  isAlreadyAtTarget,
  isWithinFramedBounds,
  navigateWithPendingClear,
  parseEnterScaleHref,
  type FramedBounds,
} from './searchFramingHelpers';
import { SEARCH_MIN_QUERY_LENGTH, searchCatalog } from './searchHelpers';

const FALLBACK_VIEWPORT_WIDTH = 1440;
const FALLBACK_VIEWPORT_HEIGHT = 900;

export interface UseSearchFramingOptions {
  readonly enabled: boolean;
  readonly activePathname: string;
  readonly activeSearch: string;
  readonly query: string;
  readonly filter: SearchCategoryFilter;
  readonly status: SearchExecutionStatus;
  readonly results: GroupedSearchResults;
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly router?: AppRouterAdapter;
}

export interface UseSearchFramingReturn {
  readonly markUserSearchActivity: () => void;
  readonly cancelSearchFraming: () => void;
  readonly discardPreSearchPose: () => void;
}

/**
 * Arms a 600ms settled-typing camera framing timer on spatial routes (`FS-003`),
 * resolving the untruncated search match bounding sphere or single Solar System entry.
 */
export const useSearchFraming = ({
  enabled,
  activePathname,
  activeSearch,
  query,
  filter,
  status,
  results,
  initialCorpus,
  router,
}: UseSearchFramingOptions): UseSearchFramingReturn => {
  const hasUserTypedRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRef = useRef({ activePathname, activeSearch, router });
  const lastFramedBoundsRef = useRef<FramedBounds | null>(null);

  useEffect(() => {
    locationRef.current = { activePathname, activeSearch, router };
  }, [activePathname, activeSearch, router]);

  const clearPendingTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const markUserSearchActivity = useCallback((): void => {
    hasUserTypedRef.current = true;
  }, []);

  const cancelSearchFraming = useCallback((): void => {
    hasUserTypedRef.current = false;
    clearPendingTimer();
  }, [clearPendingTimer]);

  const discardPreSearchPose = useCallback((): void => {
    useCameraStore.getState().clearPreSearchOrigin();
    lastFramedBoundsRef.current = null;
  }, []);

  useEffect(() => {
    clearPendingTimer();

    if (
      enabled &&
      isSpatialRoutePathname(activePathname) &&
      query.trim().length === 0
    ) {
      lastFramedBoundsRef.current = null;
      const camStore = useCameraStore.getState();
      const origin = camStore.preSearchOrigin;
      if (origin !== null) {
        camStore.clearPreSearchOrigin();
        camStore.requestSearchFrame(origin.target, origin.distance);
        if (origin.pathname !== activePathname) {
          const returnHref = buildPreSearchReturnHref(
            origin.pathname,
            origin.search,
          );
          const resolvedReturnHref = resolveAppHref(returnHref) ?? returnHref;
          navigateWithPendingClear(locationRef.current.router, resolvedReturnHref);
        }
      }
      return;
    }

    if (
      !enabled ||
      !isSpatialRoutePathname(activePathname) ||
      !hasUserTypedRef.current ||
      query.trim().length < SEARCH_MIN_QUERY_LENGTH ||
      status !== 'ready'
    ) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      hasUserTypedRef.current = false;

      let framedItems = collectSpatialItems(results);
      if (framedItems.length === 0 && results.totalMatches > 0) {
        const cachedAllCorpus = getCachedCorpusForFilter('all');
        const cachedFilterCorpus = getCachedCorpusForFilter(filter);
        const cachedStars =
          filter === 'all' ? getCachedCorpusForFilter('stars') : undefined;
        const baseCorpus =
          initialCorpus ??
          cachedFilterCorpus ??
          cachedAllCorpus ??
          getCachedCorpusForFilter('startup');
        const effectiveCorpus =
          baseCorpus && cachedStars && !initialCorpus
            ? mergeSearchShards([baseCorpus, cachedStars])
            : baseCorpus;
        if (effectiveCorpus) {
          const fallbackResults = searchCatalog(effectiveCorpus, {
            query,
            filter,
            systemEntries: cachedAllCorpus,
          });
          framedItems = collectSpatialItems(fallbackResults);
        }
      }

      const safeRect = useUIStore.getState().viewportSafeRect;
      const maxDistance = computeCeilingMaxCameraDistancePc(getDeviceTierBudget());
      const viewportWidth =
        typeof window !== 'undefined' ? window.innerWidth : FALLBACK_VIEWPORT_WIDTH;
      const viewportHeight =
        typeof window !== 'undefined' ? window.innerHeight : FALLBACK_VIEWPORT_HEIGHT;

      const {
        activePathname: currentPathname,
        activeSearch: currentSearch,
        router: currentRouter,
      } = locationRef.current;
      const currentScope = parseSpatialRouteTarget(currentPathname)?.scope;

      const action = resolveSearchFramingAction(framedItems, {
        viewportWidth,
        viewportHeight,
        safeRect,
        maxDistance,
        currentScope,
      });

      const snapshotPreSearchPose = (): void => {
        const cam = useCameraStore.getState();
        if (cam.preSearchOrigin === null) {
          cam.setPreSearchOrigin({
            pathname: currentPathname,
            search: currentSearch,
            target: [cam.target[0], cam.target[1], cam.target[2]],
            distance: Math.max(cam.focalDistance, MIN_SEARCH_FRAMING_DISTANCE_PC),
          });
        }
      };

      if (action.kind === 'enter-scale') {
        lastFramedBoundsRef.current = null;
        if (!isAlreadyAtTarget(currentPathname, currentSearch, action.href)) {
          snapshotPreSearchPose();
          const targetHref = appendSearchParamsToHref(action.href, query, filter);
          const resolvedHref = resolveAppHref(targetHref) ?? targetHref;
          const parsedTarget = parseEnterScaleHref(resolvedHref);
          if (parsedTarget.pathname !== currentPathname) {
            useCameraStore.getState().markSearchFocusForViewTransition();
          } else if (parsedTarget.focusSlug) {
            useCameraStore.getState().focusFromSearch(parsedTarget.focusSlug);
          }
          navigateWithPendingClear(currentRouter, resolvedHref);
        }
        return;
      }

      if (action.kind === 'frame-galaxy') {
        snapshotPreSearchPose();
        const shouldFrame =
          currentScope !== 'galaxy' ||
          !isWithinFramedBounds(lastFramedBoundsRef.current, action.target, action.distance);

        if (shouldFrame) {
          lastFramedBoundsRef.current = {
            target: [action.target[0], action.target[1], action.target[2]],
            distance: action.distance,
          };
          useCameraStore.getState().requestSearchFrame(action.target, action.distance);
        }

        if (currentScope !== 'galaxy') {
          const rawGalaxyHref = appendSearchParamsToHref('/galaxy', query, filter);
          const resolvedGalaxyHref = resolveAppHref(rawGalaxyHref) ?? rawGalaxyHref;
          useCameraStore.getState().markSearchFocusForViewTransition();
          navigateWithPendingClear(currentRouter, resolvedGalaxyHref);
        }
      }
    }, SEARCH_FRAMING_SETTLE_MS);

    return () => {
      clearPendingTimer();
    };
  }, [
    enabled,
    activePathname,
    query,
    filter,
    status,
    results,
    initialCorpus,
    clearPendingTimer,
  ]);

  useEffect(() => clearPendingTimer, [clearPendingTimer]);

  return {
    markUserSearchActivity,
    cancelSearchFraming,
    discardPreSearchPose,
  };
};
