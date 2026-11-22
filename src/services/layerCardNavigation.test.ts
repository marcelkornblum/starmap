import { describe, expect, it } from 'vitest';
import {
  buildLayerCloseHref,
  resolveLayerItemTargetHref,
} from './layerCardNavigation';
import { SAMPLE_CORPUS } from '../../tests/fixtures/searchFixtures';
import type { DatasetLayerEntry, DatasetLayerManifest } from '../types/datasetLayers';

describe('layerCardNavigation', () => {
  const mockLayer: DatasetLayerManifest = {
    layerId: 'overlay-recent-discoveries',
    title: 'Recent Exoplanet Discoveries',
    kind: 'scientific-overlay',
    description: 'Recent discoveries',
    version: 1,
    entries: {},
  };

  describe('resolveLayerItemTargetHref', () => {
    it('resolves system/structure targets to GalaxyView with layer and item query params when not on that system view', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Tau Ceti',
        text: 'Host star system',
      };
      const res = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS);
      expect(res.targetView).toBe('galaxy');
      expect(res.href).toBe(
        '/galaxy?center=tau-ceti&focus=gaia-2452378776434477184&select=layer:recent-discoveries&layer=recent-discoveries:gaia-2452378776434477184',
      );
    });

    it('resolves system targets in-place to SystemView when currentPathname matches the target system slug', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Tau Ceti',
        text: 'Host star system',
      };
      const res = resolveLayerItemTargetHref(
        mockLayer,
        entry,
        SAMPLE_CORPUS,
        '/system/tau-ceti',
      );
      expect(res.targetView).toBe('system');
      expect(res.href).toBe(
        '/system/tau-ceti?center=gaia-2452378776434477184&focus=gaia-2452378776434477184&select=layer:recent-discoveries&layer=recent-discoveries:gaia-2452378776434477184',
      );
    });

    it('routes moon targets to /planet/<parentPlanetSlug> regardless of current view scale', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'europa',
        targetType: 'moon',
        systemId: 'sol',
        parentBodyId: 'jupiter',
        inUniverseName: 'Europa',
        text: 'Subsurface ocean world',
      };
      const resGalaxy = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS, '/galaxy');
      expect(resGalaxy.targetView).toBe('planet');
      expect(resGalaxy.href).toBe(
        '/planet/jupiter?center=europa&focus=europa&select=layer:recent-discoveries&layer=recent-discoveries:europa',
      );

      const resPlanet = resolveLayerItemTargetHref(
        mockLayer,
        entry,
        SAMPLE_CORPUS,
        '/planet/jupiter',
      );
      expect(resPlanet.targetView).toBe('planet');
      expect(resPlanet.href).toBe(
        '/planet/jupiter?center=europa&focus=europa&select=layer:recent-discoveries&layer=recent-discoveries:europa',
      );
    });

    it('routes planet targets to /system/<sysSlug> even when stepping from /galaxy or /planet/earth', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'lhs-1140-b',
        targetType: 'planet',
        systemId: 'lhs-1140',
        inUniverseName: 'LHS 1140 b',
        text: 'Temperate rocky super-Earth',
      };
      const resGalaxy = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS, '/galaxy');
      expect(resGalaxy.targetView).toBe('system');
      expect(resGalaxy.href).toBe(
        '/system/lhs-1140?center=lhs-1140-b&focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
      );

      const resPlanet = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS, '/planet/earth');
      expect(resPlanet.targetView).toBe('system');
      expect(resPlanet.href).toBe(
        '/system/lhs-1140?center=lhs-1140-b&focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
      );

      const resSystem = resolveLayerItemTargetHref(
        mockLayer,
        entry,
        SAMPLE_CORPUS,
        '/system/lhs-1140',
      );
      expect(resSystem.targetView).toBe('system');
      expect(resSystem.href).toBe(
        '/system/lhs-1140?center=lhs-1140-b&focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
      );
    });

    it('routes star system targets to /galaxy when stepping from /planet/earth instead of pinning to /planet/earth', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Tau Ceti',
        text: 'Host star system',
      };
      const res = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS, '/planet/earth');
      expect(res.targetView).toBe('galaxy');
      expect(res.href).toBe(
        '/galaxy?center=tau-ceti&focus=gaia-2452378776434477184&select=layer:recent-discoveries&layer=recent-discoveries:gaia-2452378776434477184',
      );
    });

    it('routes entries with parentBodyId distinct from systemId to /planet/<parentPlanetSlug>', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'gateway-station',
        targetType: 'structure',
        systemId: 'sol',
        parentBodyId: 'earth',
        inUniverseName: 'Gateway Station',
        text: 'Orbital station',
      };
      const res = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS, '/galaxy');
      expect(res.targetView).toBe('planet');
      expect(res.href).toBe(
        '/planet/earth?center=gateway-station&focus=gateway-station&select=layer:recent-discoveries&layer=recent-discoveries:gateway-station',
      );
    });
  });

  describe('buildLayerCloseHref', () => {
    it('removes only layer query param while preserving select, pathname, and other params (DEC-R014f)', () => {
      const currentPath = '/system/lhs-1140';
      const currentSearch =
        '?focus=lhs-1140-b&select=tag:habitable-candidate,layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b&center=sol';
      const closeHref = buildLayerCloseHref(currentPath, currentSearch);
      expect(closeHref).not.toContain('layer=');
      expect(closeHref).toContain('layer:recent-discoveries');
      expect(closeHref).toContain('focus=lhs-1140-b');
      expect(closeHref).toContain('select=tag:habitable-candidate');
      expect(closeHref).toContain('center=sol');
      expect(closeHref.startsWith('/system/lhs-1140')).toBe(true);
    });

    it('preserves select when closing layer card (DEC-R014f)', () => {
      const currentPath = '/galaxy';
      const currentSearch = '?select=layer:recent-discoveries&layer=recent-discoveries';
      const closeHref = buildLayerCloseHref(currentPath, currentSearch);
      expect(closeHref).toBe('/galaxy?select=layer:recent-discoveries');
    });
  });
});
