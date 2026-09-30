import {
  createRouter,
  createRoute,
  createRootRoute,
  Navigate,
} from '@tanstack/react-router';
import { RootLayout } from '../components/layout/RootLayout';
import { GalaxyView } from '../views/GalaxyView';
import { SystemView } from '../views/SystemView';
import { PlanetView } from '../views/PlanetView';
import { ReferenceView } from '../views/ReferenceView';

export interface StarmapSearchParams {
  x?: number;
  y?: number;
  z?: number;
  zoom?: number;
  center?: string;
  [key: string]: unknown;
}

// Root route definition with global search params validation
export const rootRoute = createRootRoute({
  component: RootLayout,
  validateSearch: (search: Record<string, unknown>): StarmapSearchParams => {
    return {
      ...search,
      x: typeof search.x === 'number' ? search.x : (search.x ? Number(search.x) : undefined),
      y: typeof search.y === 'number' ? search.y : (search.y ? Number(search.y) : undefined),
      z: typeof search.z === 'number' ? search.z : (search.z ? Number(search.z) : undefined),
      zoom: typeof search.zoom === 'number' ? search.zoom : (search.zoom ? Number(search.zoom) : undefined),
      center: typeof search.center === 'string' ? search.center : undefined,
    };
  },
});

// Index redirects to /galaxy
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/galaxy" />,
});

// Base 4 routes
export const galaxyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/galaxy',
  component: GalaxyView,
});

export const systemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/system/$systemId',
  component: SystemView,
});

export const planetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planet/$planetId',
  component: PlanetView,
});

export const referenceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reference',
  component: ReferenceView,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  galaxyRoute,
  systemRoute,
  planetRoute,
  referenceRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
