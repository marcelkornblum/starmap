import React from 'react';
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
import { RootCanvasHost } from '../components/domain/CanvasLayer';
import { ThemeTokenBridge } from '../components/canvas/ThemeTokenBridge';
import {
  useSpaLocation,
  resolveSpaLocation,
  type StarmapSearchParams,
  registerAppRouter,
} from '../hooks/useSpaLocation';

export {
  useSpaLocation,
  resolveSpaLocation,
  type StarmapSearchParams,
};

/**
 * RFC 3986 §3.4 search string serializer preserving literal `:` and `,` characters
 * for clean `?select=tag:habitable-candidate,layer:project-hail-mary,sol` URLs.
 */
export function stringifyStarmapSearch(search: Record<string, unknown>): string {
  return defaultStringifySearch(search)
    .replace(/%3A/gi, ':')
    .replace(/%2C/gi, ',');
}

export const RootLayout: React.FC = () => {
  useSpaLocation();

  return (
    <>
      <ThemeTokenBridge />
      <RootCanvasHost />
      <Outlet />
    </>
  );
};

// Root route definition with global search params validation
export const rootRoute = createRootRoute({
  component: RootLayout,
  validateSearch: (search: Record<string, unknown>): StarmapSearchParams => {
    const result: StarmapSearchParams = {};

    if (typeof search.q === 'string' && search.q.length > 0) {
      result.q = search.q;
    }
    if (typeof search.searchCategory === 'string' && search.searchCategory.length > 0) {
      result.searchCategory = search.searchCategory;
    }
    if (typeof search.focus === 'string' && search.focus.length > 0) {
      result.focus = search.focus;
    }
    if (typeof search.select === 'string' && search.select.length > 0) {
      result.select = search.select;
    }
    if (typeof search.layer === 'string' && search.layer.trim().length > 0) {
      result.layer = search.layer.trim();
    }
    if (typeof search.route === 'string' && search.route.length > 0) {
      result.route = search.route;
    }
    if (typeof search.journeyOption === 'string' && search.journeyOption.length > 0) {
      result.journeyOption = search.journeyOption;
    }
    if (typeof search.center === 'string' && search.center.trim().length > 0) {
      result.center = search.center.trim();
    }

    return result;
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

registerAppRouter(router);

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
