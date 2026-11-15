import { describe, expect, it } from 'vitest';
import {
  buildEntityOrbitTargetHref,
  buildGalaxySystemNavigationHref,
  buildSystemViewBreadcrumbs,
  buildPlanetViewBreadcrumbs,
  buildPlanetDetailsHref,
  extractUrlSceneCameraState,
} from './navigationAndCamera';
import { DEFAULT_ORIGIN_TARGETS } from '../../config/referenceTargets';

describe('navigationAndCamera', () => {
  describe('buildGalaxySystemNavigationHref', () => {
    it('sets focus parameter while preserving active search parameters and literal : and ,', () => {
      const search =
        '?focus=sol&q=alpha&searchCategory=stars&select=layer:project-hail-mary,tag:habitable-candidate&center=tau-ceti&x=1&y=2&z=3&az=45&el=30&dist=35&zoom=1.5&route=sol,tau-ceti&journeyOption=torchship-1g';
      const href = buildGalaxySystemNavigationHref('alpha-centauri', search);
      expect(href).toContain('/galaxy?');
      expect(href).toContain('focus=alpha-centauri');
      expect(href).toContain('q=alpha');
      expect(href).toContain('searchCategory=stars');
      expect(href).toContain('select=layer:project-hail-mary,tag:habitable-candidate');
      expect(href).toContain('center=tau-ceti');
      expect(href).toContain('x=1');
      expect(href).toContain('y=2');
      expect(href).toContain('z=3');
      expect(href).toContain('dist=35');
      expect(href).toContain('zoom=1.5');
      expect(href).toContain('route=sol,tau-ceti');
      expect(href).toContain('journeyOption=torchship-1g');
    });

    it('returns clean galaxy href when no search params are present', () => {
      expect(buildGalaxySystemNavigationHref('tau-ceti')).toBe('/galaxy?focus=tau-ceti');
      expect(buildGalaxySystemNavigationHref('tau-ceti', '')).toBe('/galaxy?focus=tau-ceti');
      expect(buildGalaxySystemNavigationHref('tau-ceti', '?focus=sol')).toBe('/galaxy?focus=tau-ceti');
    });
  });

  describe('buildEntityOrbitTargetHref', () => {
    it('routes layer manifests to galaxy overview card URL', () => {
      const res = buildEntityOrbitTargetHref({
        id: 'overlay-recent-discoveries',
        name: 'Newly Discovered Worlds',
        entityKind: 'layer',
      });
      expect(res).toEqual({
        targetView: 'galaxy',
        href: '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
      });
    });

    it('routes systems and galactic structures to galaxy view', () => {
      const sysRes = buildEntityOrbitTargetHref({
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        entityKind: 'star-system',
      });
      expect(sysRes).toEqual({
        targetView: 'galaxy',
        href: '/galaxy?focus=tau-ceti',
      });

      const structRes = buildEntityOrbitTargetHref({
        id: 'm13-hercules',
        name: 'Great Hercules Cluster',
        entityKind: 'galactic-structure',
      });
      expect(structRes).toEqual({
        targetView: 'galaxy',
        href: '/galaxy?focus=great-hercules-cluster',
      });
    });

    it('routes stars, planets, dwarf-planets, belts, and minor bodies to system view with ?focus=<itemSlug>', () => {
      const planetRes = buildEntityOrbitTargetHref({
        id: 'lhs-1140-b',
        name: 'LHS 1140 b',
        entityKind: 'planet',
        systemId: 'lhs-1140',
        systemName: 'LHS 1140',
      });
      expect(planetRes).toEqual({
        targetView: 'system',
        href: '/system/lhs-1140?focus=lhs-1140-b',
      });

      const beltRes = buildEntityOrbitTargetHref({
        id: 'main-asteroid-belt',
        name: 'Main Asteroid Belt',
        entityKind: 'belt',
        systemId: 'sol',
        systemName: 'Sol',
        isSolarSystem: true,
      });
      expect(beltRes).toEqual({
        targetView: 'system',
        href: '/system/sol?focus=main-asteroid-belt',
      });
    });

    it('routes planetary moons to planetary view with /planet/<parentPlanetSlug>?focus=<moonSlug>', () => {
      const moonRes = buildEntityOrbitTargetHref({
        id: 'europa',
        name: 'Europa',
        entityKind: 'moon',
        systemId: 'sol',
        parentBodyId: 'jupiter',
      });
      expect(moonRes).toEqual({
        targetView: 'planet',
        href: '/planet/jupiter?focus=europa',
      });
    });
  });

  describe('buildSystemViewBreadcrumbs & buildPlanetViewBreadcrumbs', () => {
    it('constructs breadcrumbs for system view', () => {
      const breadcrumbs = buildSystemViewBreadcrumbs(null, 'tau-ceti');
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0].label).toBe('Galaxy');
      expect(breadcrumbs[0].href).toBe('/galaxy');
      expect(breadcrumbs[1].label).toBe('Tau Ceti');
    });

    it('constructs breadcrumbs for planet view', () => {
      const breadcrumbs = buildPlanetViewBreadcrumbs(null, null, 'earth');
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].label).toBe('Galaxy');
      expect(breadcrumbs[1].label).toBe('System');
      expect(breadcrumbs[2].label).toBe('Earth');
    });

    it('buildPlanetDetailsHref falls back to DEFAULT_ORIGIN_TARGETS.intraSystemOriginId when empty', () => {
      expect(buildPlanetDetailsHref('')).toBe(`/planet/${DEFAULT_ORIGIN_TARGETS.intraSystemOriginId}`);
    });
  });

  describe('extractUrlSceneCameraState', () => {
    it('extracts camera state numbers from URL search string', () => {
      const state = extractUrlSceneCameraState('?x=1.5&y=-2.0&z=3.25&az=45&el=-10&dist=12.5&zoom=2');
      expect(state).toEqual({
        x: 1.5,
        y: -2.0,
        z: 3.25,
        az: 45,
        el: -10,
        dist: 12.5,
        zoom: 2,
      });
    });
  });
});
