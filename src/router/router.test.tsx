import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  useRouter,
} from '@tanstack/react-router';
import {
  RootLayout,
  router,
  routeTree,
  rootRoute,
  stringifyStarmapSearch,
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
  legendGuideRoute,
  resolveSpaLocation,
} from './index';
import { GalaxyView } from '../views/GalaxyView';
import { PlanetView } from '../views/PlanetView';
import { SearchView } from '../views/SearchView';
import { SystemView } from '../views/SystemView';
import { SEARCH_CATEGORIES } from '../types/search';
import { SpatialEntityProvider } from '../components/canvas/entity/SpatialEntityProvider';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useRouter: vi.fn(),
    useParams: vi.fn(() => ({})),
    useSearch: vi.fn(() => ({})),
  };
});

describe('TanStack Router Architecture', () => {
  it('registers clean-slate root routes', () => {
    const flatRoutes = router.routesByPath;

    expect(flatRoutes['/']).toBeDefined();
    expect(flatRoutes['/search']).toBeDefined();
    expect(flatRoutes['/galaxy']).toBeDefined();
    expect((flatRoutes as Record<string, unknown>)['/galaxy/$systemId']).toBeUndefined();
    expect(flatRoutes['/system/$systemId']).toBeDefined();
    expect(flatRoutes['/planet/$planetId']).toBeDefined();
    expect(flatRoutes['/guide/star-types']).toBeDefined();
    expect(flatRoutes['/guide/star-types/$starType']).toBeDefined();
    expect(flatRoutes['/guide/planet-types']).toBeDefined();
    expect(flatRoutes['/guide/planet-types/$planetType']).toBeDefined();
    expect(flatRoutes['/guide/metrics']).toBeDefined();
    expect(flatRoutes['/guide/metrics/$metricId']).toBeDefined();
    expect(flatRoutes['/guide/hazards']).toBeDefined();
    expect(flatRoutes['/guide/hazards/$hazardId']).toBeDefined();
    expect(flatRoutes['/guide/legend']).toBeDefined();
    const allRoutes = flatRoutes as Record<string, unknown>;
    expect(allRoutes['/poc']).toBeUndefined();
    expect(allRoutes['/poc/galaxy']).toBeUndefined();
    expect(allRoutes['/poc/system/$systemId']).toBeUndefined();
    expect(allRoutes['/poc/planet/$planetId']).toBeUndefined();
    expect(allRoutes['/poc/reference']).toBeUndefined();
  });

  it('contains expected route tree structure', () => {
    expect(routeTree).toBeDefined();
    expect(routeTree.children).toBeDefined();
    expect(routeTree.children?.length).toBe(14);
  });

  it('validates search parameters correctly on rootRoute across all branches and keeps : and , unencoded in stringifyStarmapSearch', () => {
    const validate = rootRoute.options.validateSearch as (search: Record<string, unknown>) => Record<string, unknown>;
    expect(validate).toBeDefined();

    // Mixed string/number inputs
    const validated = validate({
      q: 'Tau Ceti',
      searchCategory: 'stars',
      focus: 'tau-ceti-e',
      select: 'layer:project-hail-mary,sol',
      layer: 'project-hail-mary',
      route: 'sol-to-tau-ceti',
      center: 'sol',
      x: '12.5',
      y: 42,
      z: 'not-a-number',
      zoom: '3',
      customFilter: 'habitable',
      az: '45.5',
      el: -15,
      dist: '120.8',
    });

    expect(validated.q).toBe('Tau Ceti');
    expect(validated.searchCategory).toBe('stars');
    expect(validated.focus).toBe('tau-ceti-e');
    expect(validated.select).toBe('layer:project-hail-mary,sol');
    expect(validated.layer).toBe('project-hail-mary');
    expect(validated.route).toBe('sol-to-tau-ceti');
    expect(validated.center).toBe('sol');

    // Legacy positioning params stripped
    expect('x' in validated).toBe(false);
    expect('y' in validated).toBe(false);
    expect('z' in validated).toBe(false);
    expect('zoom' in validated).toBe(false);
    expect('az' in validated).toBe(false);
    expect('el' in validated).toBe(false);
    expect('dist' in validated).toBe(false);
    expect('customFilter' in validated).toBe(false);

    expect(
      stringifyStarmapSearch({
        select: 'tag:habitable-candidate,layer:project-hail-mary,sol',
        focus: 'tau-ceti',
      }),
    ).toBe('?select=tag:habitable-candidate,layer:project-hail-mary,sol&focus=tau-ceti');

    // Empty search params (falsy branch)
    const emptyValidated = validate({});
    expect(emptyValidated.q).toBeUndefined();
    expect(emptyValidated.select).toBeUndefined();
    expect(emptyValidated.layer).toBeUndefined();
    expect(emptyValidated.center).toBeUndefined();
    expect('x' in emptyValidated).toBe(false);
    expect('y' in emptyValidated).toBe(false);
    expect('z' in emptyValidated).toBe(false);
    expect('zoom' in emptyValidated).toBe(false);
    expect('az' in emptyValidated).toBe(false);
    expect('el' in emptyValidated).toBe(false);
    expect('dist' in emptyValidated).toBe(false);

    // center with coordinates string per DEC-R014a
    const coordsValidated = validate({
      center: '12.5,42.0,-10.8',
    });
    expect(coordsValidated.center).toBe('12.5,42.0,-10.8');

    // Non-string center and whitespace-only center
    const nonStringCenter = validate({
      center: 999,
    });
    expect(nonStringCenter.center).toBeUndefined();

    const emptyCenter = validate({
      center: '   ',
    });
    expect(emptyCenter.center).toBeUndefined();
  });

  it('maps route definitions to lazy-loaded view components correctly', () => {
    const REACT_LAZY_TYPE = Symbol.for('react.lazy');
    const spatialRouteComponents = [
      indexRoute.options.component,
      mainGalaxyRoute.options.component,
      mainSystemRoute.options.component,
      mainPlanetRoute.options.component,
    ];
    for (const comp of spatialRouteComponents) {
      expect(comp).toBeDefined();
      expect((comp as unknown as { $$typeof?: symbol }).$$typeof).toBe(REACT_LAZY_TYPE);
    }
    expect(indexRoute.options.component).toBe(mainGalaxyRoute.options.component);

    const documentRouteComponents = [
      mainSearchRoute.options.component,
      starTypesListRoute.options.component,
      starTypeDetailRoute.options.component,
      planetTypesListRoute.options.component,
      planetTypeDetailRoute.options.component,
      metricsListRoute.options.component,
      metricDetailRoute.options.component,
      hazardsListRoute.options.component,
      hazardDetailRoute.options.component,
      legendGuideRoute.options.component,
    ];
    for (const comp of documentRouteComponents) {
      expect(comp).toBeDefined();
      expect(typeof (comp as unknown as { preload?: unknown }).preload).toBe('function');
    }
  });

  it('keeps existing Guide navigation and ConsoleDock mounted without blank flash while target Guide chunk loads', async () => {
    let resolveDelayedRoute!: (mod: { DelayedPlanetGuide: () => ReactElement }) => void;
    const delayedImport = new Promise<{ DelayedPlanetGuide: () => ReactElement }>((resolve) => {
      resolveDelayedRoute = resolve;
    });

    const testRoot = createRootRoute({ component: RootLayout });
    const startRoute = createRoute({
      getParentRoute: () => testRoot,
      path: '/guide/star-types',
      component: lazyRouteComponent(
        () => import('../views/StarTypesListView'),
        'StarTypesListView',
      ),
    });
    const pendingTargetRoute = createRoute({
      getParentRoute: () => testRoot,
      path: '/guide/planet-types',
      component: lazyRouteComponent(() => delayedImport, 'DelayedPlanetGuide'),
    });

    const testRouter = createRouter({
      routeTree: testRoot.addChildren([startRoute, pendingTargetRoute]),
      history: createMemoryHistory({ initialEntries: ['/guide/star-types'] }),
    });

    vi.mocked(useRouter).mockImplementation(() => testRouter as never);

    try {
      await testRouter.load();
      render(<RouterProvider router={testRouter} />);

      expect(await screen.findByTestId('star-types-list-view-root')).toBeInTheDocument();
      expect(screen.getByTestId('guide-section-nav')).toBeInTheDocument();
      expect(screen.getByTestId('console-dock')).toBeInTheDocument();

      // Start navigation to delayed Guide route; do not resolve the chunk yet
      let navPromise: Promise<void> | undefined;
      act(() => {
        navPromise = testRouter.navigate({ to: '/guide/planet-types' });
      });

      // While target chunk is pending, existing Guide UI must remain mounted (no blank Suspense fallback)
      expect(screen.getByTestId('guide-section-nav')).toBeInTheDocument();
      expect(screen.getByTestId('console-dock')).toBeInTheDocument();
      expect(screen.getByTestId('star-types-list-view-root')).toBeInTheDocument();

      // Now resolve the delayed chunk and finish transition
      await act(async () => {
        resolveDelayedRoute({
          DelayedPlanetGuide: () => (
            <div data-testid="delayed-planet-guide">Loaded Planet Types</div>
          ),
        });
        await navPromise;
      });

      await waitFor(() => {
        expect(screen.getByTestId('delayed-planet-guide')).toBeInTheDocument();
      });
    } finally {
      vi.mocked(useRouter).mockReset();
    }
  });

  it('renders GalaxyView with accessible elements and search controls', () => {
    render(
      <SpatialEntityProvider>
        <GalaxyView initialCorpus={[]} />
      </SpatialEntityProvider>,
    );

    expect(screen.getByTestId('galaxy-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search query')).toBeInTheDocument();
    expect(screen.getByTestId('search-clear-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Filter')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enter' })).toBeNull();
    expect(screen.queryByTestId('search-results-panel')).toBeNull();

    for (const category of SEARCH_CATEGORIES) {
      expect(screen.getByRole('option', { name: category.heading })).toBeInTheDocument();
    }
  });

  it('renders SearchView, SystemView, and PlanetView with search panel and no results panel by default', async () => {
    const { rerender } = render(
      <SpatialEntityProvider>
        <SearchView />
      </SpatialEntityProvider>,
    );
    expect(screen.getByTestId('search-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('search-results-panel')).toBeNull();

    rerender(
      <SpatialEntityProvider>
        <SystemView initialCorpus={[]} />
      </SpatialEntityProvider>,
    );
    expect(screen.getByTestId('system-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('search-results-panel')).toBeNull();

    await act(async () => {
      rerender(
        <SpatialEntityProvider>
          <PlanetView initialCorpus={[]} />
        </SpatialEntityProvider>,
      );
    });
    expect(screen.getByTestId('planet-view-root')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('search-results-panel')).toBeNull();
  });

  it('configures router basepath and normalises location pathname in resolveSpaLocation', () => {
    expect(router.basepath).toBeDefined();

    // Direct root base
    const direct = resolveSpaLocation('/galaxy', '?zoom=2', '/');
    expect(direct).toEqual({ pathname: '/galaxy', search: '?zoom=2' });

    // Subpath base under /starmap
    const subpath = resolveSpaLocation('/starmap/galaxy', '?zoom=2', '/starmap/');
    expect(subpath).toEqual({ pathname: '/galaxy', search: '?zoom=2' });

    // Root index under /starmap
    const rootSubpath = resolveSpaLocation('/starmap/', '', '/starmap/');
    expect(rootSubpath).toEqual({ pathname: '/', search: '' });

    const bareSubpath = resolveSpaLocation('/starmap', '', '/starmap/');
    expect(bareSubpath).toEqual({ pathname: '/', search: '' });
  });
});
