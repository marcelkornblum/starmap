import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  router,
  routeTree,
  rootRoute,
  indexRoute,
  mainSearchRoute,
  mainGalaxyRoute,
  mainGalaxySystemRoute,
  mainSystemRoute,
  starTypesListRoute,
  starTypeDetailRoute,
  planetTypesListRoute,
  planetTypeDetailRoute,
  pocIndexRoute,
  galaxyRoute,
  systemRoute,
  planetRoute,
  referenceRoute,
} from '../src/router';
import { MainView } from '../src/views/MainView';
import { PlanetTypeDetailView } from '../src/views/PlanetTypeDetailView';
import { PlanetTypesListView } from '../src/views/PlanetTypesListView';
import { SearchView } from '../src/views/SearchView';
import { StarTypeDetailView } from '../src/views/StarTypeDetailView';
import { StarTypesListView } from '../src/views/StarTypesListView';
import { SystemView } from '../src/views/SystemView';
import { SEARCH_CATEGORIES } from '../src/services/searchService';
import { useStarmapNav } from '../src/router/navigation';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useRouter: vi.fn(),
  };
});

import { useNavigate, useRouter } from '@tanstack/react-router';

describe('TanStack Router Architecture', () => {
  it('registers clean-slate root routes and quarantined /poc/* reference routes', () => {
    const flatRoutes = router.routesByPath;

    expect(flatRoutes['/']).toBeDefined();
    expect(flatRoutes['/search']).toBeDefined();
    expect(flatRoutes['/galaxy']).toBeDefined();
    expect(flatRoutes['/galaxy/$systemId']).toBeDefined();
    expect(flatRoutes['/system/$systemId']).toBeDefined();
    expect(flatRoutes['/guide/star-types']).toBeDefined();
    expect(flatRoutes['/guide/star-types/$starType']).toBeDefined();
    expect(flatRoutes['/guide/planet-types']).toBeDefined();
    expect(flatRoutes['/guide/planet-types/$planetType']).toBeDefined();
    expect(flatRoutes['/poc']).toBeDefined();
    expect(router.routesById['/poc/']).toBeDefined();
    expect(flatRoutes['/poc/galaxy']).toBeDefined();
    expect(flatRoutes['/poc/system/$systemId']).toBeDefined();
    expect(flatRoutes['/poc/planet/$planetId']).toBeDefined();
    expect(flatRoutes['/poc/reference']).toBeDefined();
  });

  it('contains expected route tree structure', () => {
    expect(routeTree).toBeDefined();
    expect(routeTree.children).toBeDefined();
    expect(routeTree.children?.length).toBe(10);
  });

  it('validates search parameters correctly on rootRoute across all branches', () => {
    const validate = rootRoute.options.validateSearch as (search: Record<string, unknown>) => Record<string, unknown>;
    expect(validate).toBeDefined();

    // Mixed string/number inputs
    const validated = validate({
      q: 'Tau Ceti',
      searchCategory: 'stars',
      focus: 'tau-ceti-e',
      canon: 'canon-project-hail-mary',
      x: '12.5',
      y: 42,
      z: 'not-a-number',
      zoom: '3',
      center: 'sol',
      customFilter: 'habitable',
    });

    expect(validated.q).toBe('Tau Ceti');
    expect(validated.searchCategory).toBe('stars');
    expect(validated.focus).toBe('tau-ceti-e');
    expect(validated.canon).toBe('canon-project-hail-mary');
    expect(validated.x).toBe(12.5);
    expect(validated.y).toBe(42);
    expect(Number.isNaN(validated.z)).toBe(true);
    expect(validated.zoom).toBe(3);
    expect(validated.center).toBe('sol');
    expect(validated.customFilter).toBe('habitable');

    // Empty search params (falsy branch)
    const emptyValidated = validate({});
    expect(emptyValidated.q).toBeUndefined();
    expect(emptyValidated.canon).toBeUndefined();
    expect(emptyValidated.x).toBeUndefined();
    expect(emptyValidated.y).toBeUndefined();
    expect(emptyValidated.z).toBeUndefined();
    expect(emptyValidated.zoom).toBeUndefined();
    expect(emptyValidated.center).toBeUndefined();

    // Pure numeric inputs and non-string center
    const numericValidated = validate({
      x: 100,
      y: 200,
      z: 300,
      zoom: 5,
      center: 999, // non-string -> undefined
    });
    expect(numericValidated.x).toBe(100);
    expect(numericValidated.y).toBe(200);
    expect(numericValidated.z).toBe(300);
    expect(numericValidated.zoom).toBe(5);
    expect(numericValidated.center).toBeUndefined();
  });

  it('maps /, /galaxy, and /galaxy/$systemId to MainView, /search to SearchView, and /system/$systemId to SystemView', () => {
    expect(indexRoute.options.component).toBe(MainView);
    expect(mainGalaxyRoute.options.component).toBe(MainView);
    expect(mainGalaxySystemRoute.options.component).toBe(MainView);
    expect(mainSearchRoute.options.component).toBe(SearchView);
    expect(mainSystemRoute.options.component).toBe(SystemView);
    expect(starTypesListRoute.options.component).toBe(StarTypesListView);
    expect(starTypeDetailRoute.options.component).toBe(StarTypeDetailView);
    expect(planetTypesListRoute.options.component).toBe(PlanetTypesListView);
    expect(planetTypeDetailRoute.options.component).toBe(PlanetTypeDetailView);
    const html = renderToString(createElement(MainView));

    expect(html).toContain('data-testid="clean-slate-root"');
    expect(html).toContain('data-testid="search-panel"');
    expect(html).toContain('>Search</h2>');
    expect(html).toContain('id="starmap-search-input"');
    expect(html).toContain('data-testid="search-clear-button"');
    expect(html).toContain('>Clear search</button>');
    expect(html).toContain('id="starmap-search-filter"');
    expect(html).not.toContain('>Enter</button>');
    // Search Results panel is hidden when there is no search query
    expect(html).not.toContain('data-testid="search-results-panel"');

    for (const category of SEARCH_CATEGORIES) {
      expect(html).toContain(`<option value="${category.key}">${category.heading.replace(/&/g, '&amp;')}</option>`);
    }

    const searchViewHtml = renderToString(createElement(SearchView));
    expect(searchViewHtml).toContain('data-testid="search-view-root"');
    expect(searchViewHtml).toContain('data-testid="search-panel"');
    expect(searchViewHtml).not.toContain('data-testid="search-results-panel"');

    const systemViewHtml = renderToString(createElement(SystemView));
    expect(systemViewHtml).toContain('data-testid="system-view-root"');
    expect(systemViewHtml).toContain('data-testid="search-panel"');
    expect(systemViewHtml).not.toContain('data-testid="search-results-panel"');

    const PocIndexComponent = pocIndexRoute.options.component as unknown as () => { props: { to: string } };
    expect(PocIndexComponent).toBeDefined();
    const vnode = PocIndexComponent();
    expect(vnode.props.to).toBe('/poc/galaxy');
  });

  it('renders pending skeleton components for all quarantined POC routes', () => {
    const PendingGalaxy = galaxyRoute.options.pendingComponent as unknown as () => { props: { label: string } };
    expect(PendingGalaxy().props.label).toContain('Galactic');

    const PendingSystem = systemRoute.options.pendingComponent as unknown as () => { props: { label: string } };
    expect(PendingSystem().props.label).toContain('System');

    const PendingPlanet = planetRoute.options.pendingComponent as unknown as () => { props: { label: string } };
    expect(PendingPlanet().props.label).toContain('Planetary');

    const PendingRef = referenceRoute.options.pendingComponent as unknown as () => { props: { label: string } };
    expect(PendingRef().props.label).toContain('Catalog');
  });
});

describe('useStarmapNav Navigation Enforcer', () => {
  const mockNavigate = vi.fn();
  const mockRouter = {
    state: {
      location: {
        pathname: '/poc/galaxy',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
  });

  it('enforces push (replace: false) on major view transition to /poc/galaxy', async () => {
    const nav = useStarmapNav();
    await nav.toGalaxy({ zoom: 2 });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/poc/galaxy');
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ x: 10 })).toEqual({ x: 10, zoom: 2 });
  });

  it('enforces push (replace: false) on major view transition to /poc/system/$systemId', async () => {
    const nav = useStarmapNav();
    await nav.toSystem('sol', { zoom: 5 });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/poc/system/$systemId');
    expect(callArg.params).toEqual({ systemId: 'sol' });
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ center: 'sol' })).toEqual({ center: 'sol', zoom: 5 });
  });

  it('enforces push (replace: false) on major view transition to /poc/planet/$planetId', async () => {
    const nav = useStarmapNav();
    await nav.toPlanet('earth', { zoom: 8 });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/poc/planet/$planetId');
    expect(callArg.params).toEqual({ planetId: 'earth' });
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ center: 'earth' })).toEqual({ center: 'earth', zoom: 8 });
  });

  it('enforces push (replace: false) on major view transition to /poc/reference', async () => {
    const nav = useStarmapNav();
    await nav.toReference({ center: 'icrs' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/poc/reference');
    expect(callArg.replace).toBe(false);
    expect(callArg.search({})).toEqual({ center: 'icrs' });
  });

  it('enforces replace (replace: true) on intra-view parameter updates', async () => {
    const nav = useStarmapNav();
    await nav.updateParams({ x: 100, y: 200 });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('.');
    expect(callArg.replace).toBe(true);
    expect(callArg.search({ z: 50 })).toEqual({ z: 50, x: 100, y: 200 });
  });

  it('exposes currentPath from router state', () => {
    const nav = useStarmapNav();
    expect(nav.currentPath).toBe('/poc/galaxy');
  });
});
