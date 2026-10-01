import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  router,
  routeTree,
  rootRoute,
  indexRoute,
  galaxyRoute,
  systemRoute,
  planetRoute,
  referenceRoute,
} from '../src/router';
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
  it('registers all 4 core base routes and index redirect', () => {
    const flatRoutes = router.routesByPath;

    expect(flatRoutes['/']).toBeDefined();
    expect(flatRoutes['/galaxy']).toBeDefined();
    expect(flatRoutes['/system/$systemId']).toBeDefined();
    expect(flatRoutes['/planet/$planetId']).toBeDefined();
    expect(flatRoutes['/reference']).toBeDefined();
  });

  it('contains expected route tree structure', () => {
    expect(routeTree).toBeDefined();
    expect(routeTree.children).toBeDefined();
    expect(routeTree.children?.length).toBeGreaterThanOrEqual(4);
  });

  it('validates search parameters correctly on rootRoute across all branches', () => {
    const validate = rootRoute.options.validateSearch as (search: Record<string, unknown>) => Record<string, unknown>;
    expect(validate).toBeDefined();

    // Mixed string/number inputs
    const validated = validate({
      x: '12.5',
      y: 42,
      z: 'not-a-number',
      zoom: '3',
      center: 'sol',
      customFilter: 'habitable',
    });

    expect(validated.x).toBe(12.5);
    expect(validated.y).toBe(42);
    expect(Number.isNaN(validated.z)).toBe(true);
    expect(validated.zoom).toBe(3);
    expect(validated.center).toBe('sol');
    expect(validated.customFilter).toBe('habitable');

    // Empty search params (falsy branch)
    const emptyValidated = validate({});
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

  it('renders index redirect component returning Navigate to /galaxy', () => {
    const Component = indexRoute.options.component as unknown as () => { props: { to: string } };
    expect(Component).toBeDefined();
    const vnode = Component();
    expect(vnode.props.to).toBe('/galaxy');
  });

  it('renders pending skeleton components for all core routes', () => {
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

  it('enforces push (replace: false) on major view transition to /reference', async () => {
    const nav = useStarmapNav();
    await nav.toReference({ center: 'icrs' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/reference');
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
});
