// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import {
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
  resolveSpaLocation,
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
import { useStarmapNav } from '../src/router/navigation';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';

const renderHtml = (el: ReactElement): string => {
  const { container } = render(createElement(SpatialEntityProvider, null, el));
  const html = container.innerHTML;
  cleanup();
  return html;
};

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

import { useNavigate, useRouter } from '@tanstack/react-router';

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
    expect(routeTree.children?.length).toBe(13);
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
      journeyOption: 'standard',
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
    expect(validated.select).toBe(
      'layer:project-hail-mary,sol',
    );
    expect(validated.layer).toBe('project-hail-mary');
    expect(validated.route).toBe('sol-to-tau-ceti');
    expect(validated.journeyOption).toBe('standard');
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

  it('maps /, and /galaxy to GalaxyView, /search to SearchView, /system/$systemId to SystemView, and /planet/$planetId to PlanetView', () => {
    expect(indexRoute.options.component).toBe(GalaxyView);
    expect(mainGalaxyRoute.options.component).toBe(GalaxyView);
    expect(mainSearchRoute.options.component).toBe(SearchView);
    expect(mainSystemRoute.options.component).toBe(SystemView);
    expect(mainPlanetRoute.options.component).toBe(PlanetView);
    expect(starTypesListRoute.options.component).toBe(StarTypesListView);
    expect(starTypeDetailRoute.options.component).toBe(StarTypeDetailView);
    expect(planetTypesListRoute.options.component).toBe(PlanetTypesListView);
    expect(planetTypeDetailRoute.options.component).toBe(PlanetTypeDetailView);
    expect(metricsListRoute.options.component).toBe(MetricsListView);
    expect(metricDetailRoute.options.component).toBe(MetricDetailView);
    const html = renderHtml(createElement(GalaxyView));

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

    const searchViewHtml = renderHtml(createElement(SearchView));
    expect(searchViewHtml).toContain('data-testid="search-view-root"');
    expect(searchViewHtml).toContain('data-testid="search-panel"');
    expect(searchViewHtml).not.toContain('data-testid="search-results-panel"');

    const systemViewHtml = renderHtml(createElement(SystemView));
    expect(systemViewHtml).toContain('data-testid="system-view-root"');
    expect(systemViewHtml).toContain('data-testid="search-panel"');
    expect(systemViewHtml).not.toContain('data-testid="search-results-panel"');

    const planetViewHtml = renderHtml(createElement(PlanetView));
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
    await nav.toGalaxy({ center: 'sol' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/galaxy');
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ focus: 'sol' })).toEqual({ focus: 'sol', center: 'sol' });
  });

  it('enforces push (replace: false) on major view transition to /system/$systemId', async () => {
    const nav = useStarmapNav();
    await nav.toSystem('sol', { focus: 'earth' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/system/$systemId');
    expect(callArg.params).toEqual({ systemId: 'sol' });
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ center: 'sol' })).toEqual({ center: 'sol', focus: 'earth' });
  });

  it('enforces push (replace: false) on major view transition to /planet/$planetId', async () => {
    const nav = useStarmapNav();
    await nav.toPlanet('earth', { focus: 'moon' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/planet/$planetId');
    expect(callArg.params).toEqual({ planetId: 'earth' });
    expect(callArg.replace).toBe(false);
    expect(callArg.search({ center: 'earth' })).toEqual({ center: 'earth', focus: 'moon' });
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
    await nav.updateParams({ center: '10,20,30', focus: 'sol' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('.');
    expect(callArg.replace).toBe(true);
    expect(callArg.search({ select: 'sol' })).toEqual({ select: 'sol', center: '10,20,30', focus: 'sol' });
  });

  it('exposes currentPath from router state', () => {
    const nav = useStarmapNav();
    expect(nav.currentPath).toBe('/galaxy');
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
