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
import type {
  GroupedSearchResults,
  SearchResultItem,
} from '../../../services/search/searchTypes';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { SearchCategoryFilter } from '../../../types/search';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';
import {
  SEARCH_FRAMING_SETTLE_MS,
  resolveSearchFramingAction,
} from '../../../utils/searchFraming';
import {
  isSpatialRoutePathname,
  parseSpatialRouteTarget,
  setPendingSpatialNavigationHref,
} from '../../../utils/spatialRoute';
import { resolveAppHref } from '../../../utils/url';
import type { SearchExecutionStatus } from './SearchContext';
import { SEARCH_MIN_QUERY_LENGTH, searchCatalog } from './searchHelpers';

const FRAMING_GROUP_KEYS = [
  'stars',
  'planets',
  'minor-bodies',
  'structures',
] as const;

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
}

function collectSpatialItems(results: GroupedSearchResults): SearchResultItem[] {
  const items: SearchResultItem[] = [];
  for (const groupKey of FRAMING_GROUP_KEYS) {
    items.push(...results.groups[groupKey].items);
  }
  return items;
}

function isAlreadyAtTarget(
  currentPathname: string,
  currentSearch: string,
  targetHref: string,
): boolean {
  const normalizedSearch =
    currentSearch.length > 0 && !currentSearch.startsWith('?')
      ? `?${currentSearch}`
      : currentSearch;
  try {
    const currentUrl = new URL(
      `${currentPathname}${normalizedSearch}`,
      'http://localhost',
    );
    const targetUrl = new URL(targetHref, 'http://localhost');
    if (currentUrl.pathname !== targetUrl.pathname) {
      return false;
    }
    return currentUrl.searchParams.get('focus') === targetUrl.searchParams.get('focus');
  } catch {
    return false;
  }
}

function buildGalaxyReturnHref(
  query: string,
  filter: SearchCategoryFilter,
): string {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();
  if (trimmedQuery.length > 0) {
    params.set('q', trimmedQuery);
  }
  if (filter !== 'all') {
    params.set('searchCategory', filter);
  }
  const qs = params.toString();
  return qs.length > 0 ? `/galaxy?${qs}` : '/galaxy';
}

/**
 * Arms an 800ms settled-typing camera framing timer on spatial routes (`FS-003`),
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

  useEffect(() => {
    clearPendingTimer();

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

      const untruncatedResults = effectiveCorpus
        ? searchCatalog(effectiveCorpus, {
            query,
            filter,
            limitPerCategory: Number.POSITIVE_INFINITY,
            systemEntries: cachedAllCorpus,
          })
        : results;

      let fullItems = collectSpatialItems(untruncatedResults);
      if (fullItems.length === 0 && results.totalMatches > 0) {
        fullItems = collectSpatialItems(results);
      }

      const safeRect = useUIStore.getState().viewportSafeRect;
      const maxDistance = computeCeilingMaxCameraDistancePc(getDeviceTierBudget());
      const viewportWidth =
        typeof window !== 'undefined' ? window.innerWidth : FALLBACK_VIEWPORT_WIDTH;
      const viewportHeight =
        typeof window !== 'undefined' ? window.innerHeight : FALLBACK_VIEWPORT_HEIGHT;

      const action = resolveSearchFramingAction(fullItems, {
        viewportWidth,
        viewportHeight,
        safeRect,
        maxDistance,
      });

      const {
        activePathname: currentPathname,
        activeSearch: currentSearch,
        router: currentRouter,
      } = locationRef.current;

      if (action.kind === 'enter-sol-system') {
        if (!isAlreadyAtTarget(currentPathname, currentSearch, action.href)) {
          const resolvedHref = resolveAppHref(action.href) ?? action.href;
          setPendingSpatialNavigationHref(resolvedHref);
          void currentRouter?.navigate?.({ href: resolvedHref });
        }
        return;
      }

      if (action.kind === 'frame-galaxy') {
        useCameraStore.getState().requestSearchFrame(action.target, action.distance);
        const currentScope = parseSpatialRouteTarget(currentPathname)?.scope;
        if (currentScope !== 'galaxy') {
          const rawGalaxyHref = buildGalaxyReturnHref(query, filter);
          const resolvedGalaxyHref = resolveAppHref(rawGalaxyHref) ?? rawGalaxyHref;
          setPendingSpatialNavigationHref(resolvedGalaxyHref);
          void currentRouter?.navigate?.({ href: resolvedGalaxyHref });
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
  };
};
