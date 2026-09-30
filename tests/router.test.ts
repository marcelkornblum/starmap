import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router, routeTree, rootRoute } from '../src/router';
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

  it('validates search parameters correctly on rootRoute', () => {
    const validate = rootRoute.options.validateSearch as (search: Record<string, unknown>) => Record<string, unknown>;
    expect(validate).toBeDefined();

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
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
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
    await nav.toSystem('sol');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/system/$systemId');
    expect(callArg.params).toEqual({ systemId: 'sol' });
    expect(callArg.replace).toBe(false);
  });

  it('enforces push (replace: false) on major view transition to /planet/$planetId', async () => {
    const nav = useStarmapNav();
    await nav.toPlanet('earth');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/planet/$planetId');
    expect(callArg.params).toEqual({ planetId: 'earth' });
    expect(callArg.replace).toBe(false);
  });

  it('enforces push (replace: false) on major view transition to /reference', async () => {
    const nav = useStarmapNav();
    await nav.toReference();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArg = mockNavigate.mock.calls[0][0];
    expect(callArg.to).toBe('/reference');
    expect(callArg.replace).toBe(false);
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
