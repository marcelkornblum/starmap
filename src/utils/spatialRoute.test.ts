import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPendingSpatialRouteTarget,
  isSpatialRoutePathname,
  parseSpatialRouteTarget,
  setPendingSpatialNavigationHref,
  subscribePendingSpatialRoute,
} from './spatialRoute';

describe('isSpatialRoutePathname', () => {
  it('returns true for root and galaxy routes, ignoring trailing slashes and query strings', () => {
    expect(isSpatialRoutePathname('/')).toBe(true);
    expect(isSpatialRoutePathname('/?focus=sol')).toBe(true);
    expect(isSpatialRoutePathname('/galaxy')).toBe(true);
    expect(isSpatialRoutePathname('/galaxy/')).toBe(true);
    expect(isSpatialRoutePathname('/galaxy?center=0,0,0')).toBe(true);
    expect(isSpatialRoutePathname('/galaxy/?focus=sirius')).toBe(true);
    expect(isSpatialRoutePathname('/galaxy/sector-alpha')).toBe(true);
    expect(isSpatialRoutePathname('/galaxy/sector-alpha/')).toBe(true);
  });

  it('returns true for system and planet routes, ignoring trailing slashes and query strings', () => {
    expect(isSpatialRoutePathname('/system/sol')).toBe(true);
    expect(isSpatialRoutePathname('/system/sol/')).toBe(true);
    expect(isSpatialRoutePathname('/system/alpha-centauri?focus=proxima')).toBe(true);
    expect(isSpatialRoutePathname('/planet/earth')).toBe(true);
    expect(isSpatialRoutePathname('/planet/earth/')).toBe(true);
    expect(isSpatialRoutePathname('/planet/kepler-186f?center=0,0,0')).toBe(true);
  });

  it('returns false for non-spatial routes and malformed paths', () => {
    expect(isSpatialRoutePathname('')).toBe(false);
    expect(isSpatialRoutePathname('/guide')).toBe(false);
    expect(isSpatialRoutePathname('/guide/')).toBe(false);
    expect(isSpatialRoutePathname('/guide/star-types')).toBe(false);
    expect(isSpatialRoutePathname('/guide/metrics/luminosity?q=1')).toBe(false);
    expect(isSpatialRoutePathname('/search')).toBe(false);
    expect(isSpatialRoutePathname('/search/sol')).toBe(false);
    expect(isSpatialRoutePathname('/about')).toBe(false);
    expect(isSpatialRoutePathname('/galaxy-guide')).toBe(false);
    expect(isSpatialRoutePathname('/system')).toBe(false);
    expect(isSpatialRoutePathname('/system/')).toBe(false);
    expect(isSpatialRoutePathname('/planet')).toBe(false);
    expect(isSpatialRoutePathname('/planet/')).toBe(false);
  });
});

describe('parseSpatialRouteTarget', () => {
  it('parses root and galaxy paths to galaxy scope', () => {
    expect(parseSpatialRouteTarget('/')).toEqual({ scope: 'galaxy' });
    expect(parseSpatialRouteTarget('/galaxy')).toEqual({ scope: 'galaxy' });
    expect(parseSpatialRouteTarget('/galaxy/')).toEqual({ scope: 'galaxy' });
    expect(parseSpatialRouteTarget('/galaxy/sector-1')).toEqual({ scope: 'galaxy' });
  });

  it('parses system paths and decodes targetId slug', () => {
    expect(parseSpatialRouteTarget('/system/sys-alpha')).toEqual({
      scope: 'system',
      targetId: 'sys-alpha',
    });
    expect(parseSpatialRouteTarget('/system/sys%20alpha/')).toEqual({
      scope: 'system',
      targetId: 'sys alpha',
    });
    expect(parseSpatialRouteTarget('/system/')).toBeNull();
    expect(parseSpatialRouteTarget('/system')).toBeNull();
  });

  it('parses planet paths and decodes targetId slug', () => {
    expect(parseSpatialRouteTarget('/planet/world-one')).toEqual({
      scope: 'planet',
      targetId: 'world-one',
    });
    expect(parseSpatialRouteTarget('/planet/world%2Done')).toEqual({
      scope: 'planet',
      targetId: 'world-one',
    });
    expect(parseSpatialRouteTarget('/planet/')).toBeNull();
    expect(parseSpatialRouteTarget('/planet')).toBeNull();
  });

  it('returns null for non-spatial routes, empty paths, and malformed encodings fall back safely', () => {
    expect(parseSpatialRouteTarget('')).toBeNull();
    expect(parseSpatialRouteTarget('/guide')).toBeNull();
    expect(parseSpatialRouteTarget('/guide/star-types')).toBeNull();
    expect(parseSpatialRouteTarget('/search')).toBeNull();
    expect(parseSpatialRouteTarget('/unknown/path')).toBeNull();
    expect(parseSpatialRouteTarget('/system/%E0%A4%A')).toEqual({
      scope: 'system',
      targetId: '%E0%A4%A',
    });
  });
});

describe('pending spatial navigation intent', () => {
  beforeEach(() => {
    setPendingSpatialNavigationHref(null);
  });

  it('tracks pending target from href, notifies subscribers, and clears on null or non-spatial href', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePendingSpatialRoute(listener);

    expect(getPendingSpatialRouteTarget()).toBeNull();

    setPendingSpatialNavigationHref('/system/alpha-centauri?focus=proxima');
    expect(getPendingSpatialRouteTarget()).toEqual({
      scope: 'system',
      targetId: 'alpha-centauri',
    });
    expect(listener).toHaveBeenCalledTimes(1);

    setPendingSpatialNavigationHref('/planet/earth');
    expect(getPendingSpatialRouteTarget()).toEqual({
      scope: 'planet',
      targetId: 'earth',
    });
    expect(listener).toHaveBeenCalledTimes(2);

    // Non-spatial route clears pending spatial target
    setPendingSpatialNavigationHref('/guide');
    expect(getPendingSpatialRouteTarget()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);

    setPendingSpatialNavigationHref('/galaxy');
    expect(getPendingSpatialRouteTarget()).toEqual({ scope: 'galaxy' });
    expect(listener).toHaveBeenCalledTimes(4);

    setPendingSpatialNavigationHref(null);
    expect(getPendingSpatialRouteTarget()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(5);

    unsubscribe();
    setPendingSpatialNavigationHref('/system/sol');
    expect(listener).toHaveBeenCalledTimes(5);
  });
});
