import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  router,
  routeTree,
  rootRoute,
  stringifyStarmapSearch,
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
} from '../src/router';
import { GalaxyView } from '../src/views/GalaxyView';
import { MetricDetailView } from '../src/views/MetricDetailView';
import { MetricsListView } from '../src/views/MetricsListView';
import { PlanetTypeDetailView } from '../src/views/PlanetTypeDetailView';
import { PlanetTypesListView } from '../src/views/PlanetTypesListView';
import { PlanetView } from '../src/views/PlanetView';
import { SearchView } from '../src/views/SearchView';
import { StarTypeDetailView } from '../src/views/StarTypeDetailView';
import { StarTypesListView } from '../src/views/StarTypesListView';
import { SystemView } from '../src/views/SystemView';
import { SEARCH_CATEGORIES } from '../src/services/searchService';
import { useStarmapNav, useNavigationActions } from '../src/router/navigation';

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
  it('registers clean-slate root routes', () => {
    const flatRoutes = router.routesByPath;

    expect(flatRoutes['/']).toBeDefined();
    expect(flatRoutes['/search']).toBeDefined();
    expect(flatRoutes['/galaxy']).toBeDefined();
    expect(flatRoutes['/galaxy/$systemId']).toBeDefined();
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
      select: 'tag:habitable-candidate,layer:project-hail-mary,sol',
      layer: 'project-hail-mary',
      x: '12.5',
      y: 42,
      z: 'not-a-number',
      zoom: '3',
      center: 'sol',
      customFilter: 'habitable',
      az: '45.5',
      el: -15,
      dist: '120.8',
    });

    expect(validated.q).toBe('Tau Ceti');
    expect(validated.searchCategory).toBe('stars');
    expect(validated.focus).toBe('tau-ceti-e');
    expect(validated.select).toBe(
      'tag:habitable-candidate,layer:project-hail-mary,sol',
    );
    expect(validated.layer).toBe('project-hail-mary');
    expect(validated.x).toBe(12.5);
    expect(validated.y).toBe(42);
    expect(Number.isNaN(validated.z)).toBe(true);
    expect(validated.zoom).toBe(3);
    expect(validated.center).toBe('sol');
    expect(validated.customFilter).toBe('habitable');
    expect(validated.az).toBe(45.5);
    expect(validated.el).toBe(-15);
    expect(validated.dist).toBe(120.8);

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
    expect(emptyValidated.x).toBeUndefined();
    expect(emptyValidated.y).toBeUndefined();
    expect(emptyValidated.z).toBeUndefined();
    expect(emptyValidated.zoom).toBeUndefined();
    expect(emptyValidated.center).toBeUndefined();
    expect(emptyValidated.az).toBeUndefined();
    expect(emptyValidated.el).toBeUndefined();
    expect(emptyValidated.dist).toBeUndefined();

    // Pure numeric inputs, 0 values, and non-string center
    const numericValidated = validate({
      x: 100,
      y: 200,
      z: 300,
      zoom: 5,
      center: 999, // non-string -> undefined
      az: 0,
      el: '0',
      dist: 0,
    });
    expect(numericValidated.x).toBe(100);
    expect(numericValidated.y).toBe(200);
    expect(numericValidated.z).toBe(300);
    expect(numericValidated.zoom).toBe(5);
    expect(numericValidated.center).toBeUndefined();
    expect(numericValidated.az).toBe(0);
    expect(numericValidated.el).toBe(0);
    expect(numericValidated.dist).toBe(0);
  });

  it('maps /, /galaxy, and /galaxy/$systemId to GalaxyView, /search to SearchView, /system/$systemId to SystemView, and /planet/$planetId to PlanetView', () => {
    expect(indexRoute.options.component).toBe(GalaxyView);
    expect(mainGalaxyRoute.options.component).toBe(GalaxyView);
    expect(mainGalaxySystemRoute.options.component).toBe(GalaxyView);
    expect(mainSearchRoute.options.component).toBe(SearchView);
    expect(mainSystemRoute.options.component).toBe(SystemView);
    expect(mainPlanetRoute.options.component).toBe(PlanetView);
    expect(starTypesListRoute.options.component).toBe(StarTypesListView);
    expect(starTypeDetailRoute.options.component).toBe(StarTypeDetailView);
    expect(planetTypesListRoute.options.component).toBe(PlanetTypesListView);
    expect(planetTypeDetailRoute.options.component).toBe(PlanetTypeDetailView);
    expect(metricsListRoute.options.component).toBe(MetricsListView);
    expect(metricDetailRoute.options.component).toBe(MetricDetailView);
    const html = renderToString(createElement(GalaxyView));

    expect(html).toContain('data-testid="galaxy-view-root"');
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

    const planetViewHtml = renderToString(createElement(PlanetView));
    expect(planetViewHtml).toContain('data-testid="planet-view-root"');
    expect(planetViewHtml).toContain('data-testid="search-panel"');
    expect(planetViewHtml).not.toContain('data-testid="search-results-panel"');
  });
});

describe('useStarmapNav Navigation Enforcer', () => {
  const mockNavigate = vi.fn();
  const mockRouter = {
    state: {
      location: {
        pathname: '/galaxy',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
  });

  it('enforces push (replace: false) on major view transition to /galaxy', async () => {
    const nav = useStarmapNav();
    await nav.toGalaxy({ zoom: 2 });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/galaxy');
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ x: 10 })).toEqual({ x: 10, zoom: 2 });
  });

  it('enforces push (replace: false) on major view transition to /system/$systemId', async () => {
    const nav = useStarmapNav();
    await nav.toSystem('sol', { zoom: 5 });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/system/$systemId');
    expect(callArg.params).toEqual({ systemId: 'sol' });
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ center: 'sol' })).toEqual({ center: 'sol', zoom: 5 });
  });

  it('enforces push (replace: false) on major view transition to /planet/$planetId', async () => {
    const nav = useStarmapNav();
    await nav.toPlanet('earth', { zoom: 8 });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/planet/$planetId');
    expect(callArg.params).toEqual({ planetId: 'earth' });
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ center: 'earth' })).toEqual({ center: 'earth', zoom: 8 });
  });

  it('enforces push (replace: false) on major view transition to /guide/star-types', async () => {
    const nav = useStarmapNav();
    await nav.toReference({ center: 'icrs' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/guide/star-types');
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
    expect(nav.currentPath).toBe('/galaxy');
  });

  it('supports useNavigationActions alias with goTo methods', async () => {
    const actions = useNavigationActions();
    await actions.goToGalaxy();
    expect(mockNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/galaxy', replace: false })
    );

    await actions.goToSystem('sol');
    expect(mockNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/system/$systemId', params: { systemId: 'sol' }, replace: false })
    );

    await actions.goToPlanet('mars');
    expect(mockNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/planet/$planetId', params: { planetId: 'mars' }, replace: false })
    );

    await actions.goToReference();
    expect(mockNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/guide/star-types', replace: false })
    );
  });
});
