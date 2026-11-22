import { describe, it, expect } from 'vitest';
import { isSpatialRoutePathname } from './spatialRoute';

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
