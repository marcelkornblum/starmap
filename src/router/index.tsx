import {
  createRouter,
  createRoute,
  createRootRoute,
  Navigate,
  Outlet,
} from '@tanstack/react-router';
import { RootLayout } from '../components/poc/layout/RootLayout';
import { RouteSkeleton } from '../components/poc/common/RouteSkeleton';
import { GalaxyView } from '../views/poc/GalaxyView';
import { SystemView } from '../views/poc/SystemView';
import { PlanetView } from '../views/poc/PlanetView';
import { ReferenceView } from '../views/poc/ReferenceView';

export interface StarmapSearchParams {
  x?: number;
  y?: number;
  z?: number;
  zoom?: number;
  center?: string;
  [key: string]: unknown;
}

// Simulated network latency helper for render-then-fetch pattern
export async function simulateAsyncFetch<T>(data: T, delayMs = 60): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return data;
}

// Root route definition with global search params validation and unopinionated Outlet
export const rootRoute = createRootRoute({
  component: Outlet,
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

// Clean-slate root index route — views and paths will be defined from scratch during Stage 1 Journeys
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div data-testid="clean-slate-root" />,
});

// Quarantined POC layout and routes under /poc/* for reference
export const pocRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/poc',
  component: RootLayout,
});

export const pocIndexRoute = createRoute({
  getParentRoute: () => pocRoute,
  path: '/',
  component: () => <Navigate to="/poc/galaxy" />,
});

export const galaxyRoute = createRoute({
  getParentRoute: () => pocRoute,
  path: '/galaxy',
  component: GalaxyView,
  pendingComponent: () => <RouteSkeleton label="Scanning Galactic Field..." />,
  pendingMs: 0,
  loader: async () => {
    return simulateAsyncFetch({ target: 'Milky Way', nodeCount: 119614 });
  },
});

export const systemRoute = createRoute({
  getParentRoute: () => pocRoute,
  path: '/system/$systemId',
  component: SystemView,
  pendingComponent: () => <RouteSkeleton label="Resolving Star System Telemetry..." />,
  pendingMs: 0,
  loader: async ({ params }) => {
    return simulateAsyncFetch({ systemId: params.systemId, spectralType: 'G2V' });
  },
});

export const planetRoute = createRoute({
  getParentRoute: () => pocRoute,
  path: '/planet/$planetId',
  component: PlanetView,
  pendingComponent: () => <RouteSkeleton label="Acquiring Planetary Orbit Data..." />,
  pendingMs: 0,
  loader: async ({ params }) => {
    return simulateAsyncFetch({ planetId: params.planetId, classification: 'Terrestrial' });
  },
});

export const referenceRoute = createRoute({
  getParentRoute: () => pocRoute,
  path: '/reference',
  component: ReferenceView,
  pendingComponent: () => <RouteSkeleton label="Accessing Celestial Catalog..." />,
  pendingMs: 0,
  loader: async () => {
    return simulateAsyncFetch({ catalog: 'ICRS/J2000 Encyclopedia' });
  },
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  pocRoute.addChildren([
    pocIndexRoute,
    galaxyRoute,
    systemRoute,
    planetRoute,
    referenceRoute,
  ]),
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
