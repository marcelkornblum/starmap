import React, { useEffect, useState } from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  defaultStringifySearch,
  Outlet,
} from '@tanstack/react-router';
import { GalaxyView } from '../views/GalaxyView';
import { HazardDetailView } from '../views/HazardDetailView';
import { HazardsListView } from '../views/HazardsListView';
import { MetricDetailView } from '../views/MetricDetailView';
import { MetricsListView } from '../views/MetricsListView';
import { PlanetTypeDetailView } from '../views/PlanetTypeDetailView';
import { PlanetTypesListView } from '../views/PlanetTypesListView';
import { PlanetView } from '../views/PlanetView';
import { SearchView } from '../views/SearchView';
import { StarTypeDetailView } from '../views/StarTypeDetailView';
import { StarTypesListView } from '../views/StarTypesListView';
import { SystemView } from '../views/SystemView';

export interface StarmapSearchParams {
  q?: string;
  searchCategory?: string;
  focus?: string;
  select?: string;
  layer?: string;
  route?: string;
  journeyOption?: string;
  x?: number;
  y?: number;
  z?: number;
  zoom?: number;
  center?: string;
  az?: number;
  el?: number;
  dist?: number;
  [key: string]: unknown;
}

/**
 * RFC 3986 §3.4 search string serializer preserving literal `:` and `,` characters
 * for clean `?select=tag:habitable-candidate,layer:project-hail-mary,sol` URLs.
 */
export function stringifyStarmapSearch(search: Record<string, unknown>): string {
  return defaultStringifySearch(search)
    .replace(/%3A/gi, ':')
    .replace(/%2C/gi, ',');
}

// Simulated network latency helper for render-then-fetch pattern
export async function simulateAsyncFetch<T>(data: T, delayMs = 60): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return data;
}

/**
 * Pure function normalizing a raw location pathname against the application's basepath.
 * Strips subpath base prefix (e.g. '/starmap/galaxy' -> '/galaxy', '/starmap/' -> '/').
 */
export function resolveSpaLocation(
  rawPathname: string,
  rawSearch: string,
  basepath = import.meta.env?.BASE_URL ?? '/',
): { readonly pathname: string; readonly search: string } {
  const base = basepath.replace(/\/+$/, '');
  let normalizedPathname =
    base && base !== '/' && rawPathname.startsWith(base)
      ? (rawPathname.slice(base.length) || '/')
      : rawPathname;

  let normalizedSearch = rawSearch;
  const match = /^\/galaxy\/([^/?#]+)$/.exec(normalizedPathname);
  if (match?.[1]) {
    const legacySystemSlug = decodeURIComponent(match[1]);
    normalizedPathname = '/galaxy';
    const cleanSearch = rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch;
    const params = new URLSearchParams(cleanSearch);
    if (!params.has('focus')) {
      const focusParam = `focus=${encodeURIComponent(legacySystemSlug)}`;
      normalizedSearch = cleanSearch ? `?${focusParam}&${cleanSearch}` : `?${focusParam}`;
    }
  }

  return { pathname: normalizedPathname, search: normalizedSearch };
}

export function useSpaLocation(
  locationPathname?: string,
  locationSearch?: string,
  fallbackPathname = '/galaxy',
): { readonly pathname: string; readonly search: string } {
  const [, setLocationTick] = useState<number>(0);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      (locationPathname !== undefined && locationSearch !== undefined)
    ) {
      return;
    }
    const handleLocationChange = (): void => {
      setLocationTick((n) => n + 1);
    };

    const unsubRouter = router?.subscribe?.('onResolved', handleLocationChange);
    const unsubHistory = router?.history?.subscribe?.(handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('starmap:locationchange', handleLocationChange);

    return () => {
      unsubRouter?.();
      unsubHistory?.();
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('starmap:locationchange', handleLocationChange);
    };
  }, [locationPathname, locationSearch]);

  const rawPathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : fallbackPathname);
  const rawSearch =
    locationSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  return resolveSpaLocation(rawPathname, rawSearch);
}

export const RootLayout: React.FC = () => {
  const spaLocation = useSpaLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const match = /\/galaxy\/([^/?#]+)$/.exec(window.location.pathname);
    if (match?.[1]) {
      const base = window.location.pathname.slice(0, match.index);
      const { pathname, search } = resolveSpaLocation(
        window.location.pathname.slice(match.index),
        window.location.search,
      );
      const newUrl = `${base}${pathname}${search}${window.location.hash}`;
      window.history.replaceState(window.history.state, '', newUrl);
    }
  }, [spaLocation]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleDocumentClick = (event: MouseEvent): void => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }
      if (anchor.target && anchor.target !== '_self') {
        return;
      }
      if (anchor.hasAttribute('download')) {
        return;
      }

      const rawHref = anchor.getAttribute('href');
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:')
      ) {
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      if (parsedUrl.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      const nextPathAndSearch = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      const currentPathAndSearch = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPathAndSearch === currentPathAndSearch) {
        return;
      }

      const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');
      const relativeHref =
        base && base !== '/' && rawHref.startsWith(base)
          ? (rawHref.slice(base.length) || '/')
          : rawHref;

      void router
        .navigate({ href: relativeHref })
        .then(() => {
          window.dispatchEvent(new Event('starmap:locationchange'));
        })
        .catch(() => {});
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  return <Outlet />;
};

// Root route definition with global search params validation and SPA link delegation
export const rootRoute = createRootRoute({
  component: RootLayout,
  validateSearch: (search: Record<string, unknown>): StarmapSearchParams => {
    return {
      ...search,
      q: typeof search.q === 'string' && search.q.length > 0 ? search.q : undefined,
      searchCategory:
        typeof search.searchCategory === 'string' && search.searchCategory.length > 0
          ? search.searchCategory
          : undefined,
      focus: typeof search.focus === 'string' && search.focus.length > 0 ? search.focus : undefined,
      select:
        typeof search.select === 'string' && search.select.length > 0
          ? search.select
          : undefined,
      layer:
        typeof search.layer === 'string' && search.layer.trim()
          ? search.layer.trim()
          : undefined,
      route: typeof search.route === 'string' && search.route.length > 0 ? search.route : undefined,
      journeyOption:
        typeof search.journeyOption === 'string' && search.journeyOption.length > 0
          ? search.journeyOption
          : undefined,
      x: typeof search.x === 'number' ? search.x : (search.x !== undefined && search.x !== '' ? Number(search.x) : undefined),
      y: typeof search.y === 'number' ? search.y : (search.y !== undefined && search.y !== '' ? Number(search.y) : undefined),
      z: typeof search.z === 'number' ? search.z : (search.z !== undefined && search.z !== '' ? Number(search.z) : undefined),
      zoom: typeof search.zoom === 'number' ? search.zoom : (search.zoom !== undefined && search.zoom !== '' ? Number(search.zoom) : undefined),
      center: typeof search.center === 'string' ? search.center : undefined,
      az: typeof search.az === 'number' ? search.az : (search.az !== undefined && search.az !== '' ? Number(search.az) : undefined),
      el: typeof search.el === 'number' ? search.el : (search.el !== undefined && search.el !== '' ? Number(search.el) : undefined),
      dist: typeof search.dist === 'number' ? search.dist : (search.dist !== undefined && search.dist !== '' ? Number(search.dist) : undefined),
    };
  },
});

// Root index route — progressively scaffolded during Stage 1 Journeys
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: GalaxyView,
});

export const mainSearchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  component: SearchView,
});

export const mainGalaxyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/galaxy',
  component: GalaxyView,
});

export const mainGalaxySystemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/galaxy/$systemId',
  component: GalaxyView,
});

export const mainSystemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/system/$systemId',
  component: SystemView,
});

export const mainPlanetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planet/$planetId',
  component: PlanetView,
});

export const starTypesListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/star-types',
  component: StarTypesListView,
});

export const starTypeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/star-types/$starType',
  component: StarTypeDetailView,
});

export const planetTypesListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/planet-types',
  component: PlanetTypesListView,
});

export const planetTypeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/planet-types/$planetType',
  component: PlanetTypeDetailView,
});

export const metricsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/metrics',
  component: MetricsListView,
});

export const metricDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/metrics/$metricId',
  component: MetricDetailView,
});

export const hazardsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/hazards',
  component: HazardsListView,
});

export const hazardDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guide/hazards/$hazardId',
  component: HazardDetailView,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  mainSearchRoute,
  mainGalaxyRoute,
  mainGalaxySystemRoute,
  mainSystemRoute,
  mainPlanetRoute,
  starTypesListRoute,
  starTypeDetailRoute,
  planetTypesListRoute,
  planetTypeDetailRoute,
  metricsListRoute,
  metricDetailRoute,
  hazardsListRoute,
  hazardDetailRoute,
]);

export const router = createRouter({
  routeTree,
  basepath: import.meta.env?.BASE_URL ?? '/',
  defaultPreload: 'intent',
  stringifySearch: stringifyStarmapSearch,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
