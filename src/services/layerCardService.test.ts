import { describe, expect, it } from 'vitest';
import {
  buildLayerCloseHref,
  parseLayerQueryParam,
  pickRandomLayerOverviewHref,
  resolveActiveLayerCard,
  resolveLayerItemTargetHref,
} from './layerCardService';
import { resolveSelectedSystemsFromLayer } from './searchService';
import { LAYER_MANIFESTS } from '../../content/layers';
import { LAYER_INDEX_ENTRIES } from '../../tests/fixtures/layerFixtures';
import { SAMPLE_CORPUS } from '../../tests/fixtures/searchFixtures';
import type { DatasetLayerEntry, DatasetLayerManifest } from '../types/astro';

describe('layerCardService (DEC-039)', () => {
  describe('parseLayerQueryParam', () => {
    it('returns null for empty or nullish parameters', () => {
      expect(parseLayerQueryParam(undefined)).toBeNull();
      expect(parseLayerQueryParam(null)).toBeNull();
      expect(parseLayerQueryParam('')).toBeNull();
      expect(parseLayerQueryParam('   ')).toBeNull();
    });

    it('parses layerSlug without itemSlug', () => {
      expect(parseLayerQueryParam('recent-discoveries')).toEqual({
        layerSlug: 'recent-discoveries',
      });
      expect(parseLayerQueryParam('overlay-recent-discoveries')).toEqual({
        layerSlug: 'recent-discoveries',
      });
      expect(parseLayerQueryParam('layer:project-hail-mary')).toEqual({
        layerSlug: 'project-hail-mary',
      });
    });

    it('parses both layerSlug and itemSlug separated by colon', () => {
      expect(parseLayerQueryParam('recent-discoveries:lhs-1140-b')).toEqual({
        layerSlug: 'recent-discoveries',
        itemSlug: 'lhs-1140-b',
      });
      expect(parseLayerQueryParam('overlay-jwst-targets:trappist-1-e')).toEqual({
        layerSlug: 'jwst-targets',
        itemSlug: 'trappist-1-e',
      });
      expect(parseLayerQueryParam('layer:project-hail-mary:tau-ceti')).toEqual({
        layerSlug: 'project-hail-mary',
        itemSlug: 'tau-ceti',
      });
    });
  });

  describe('pickRandomLayerOverviewHref', () => {
    it('picks a random layer overview href excluding the currently active layer', () => {
      const href = pickRandomLayerOverviewHref('recent-discoveries', () => 0, LAYER_INDEX_ENTRIES);
      expect(href).toMatch(/^\/galaxy\?select=layer:[a-z0-9-]+&layer=[a-z0-9-]+$/);
      expect(href).not.toContain('recent-discoveries');
    });

    it('is deterministic when custom randomFn is supplied', () => {
      const href1 = pickRandomLayerOverviewHref(null, () => 0.5, LAYER_INDEX_ENTRIES);
      const href2 = pickRandomLayerOverviewHref(null, () => 0.5, LAYER_INDEX_ENTRIES);
      expect(href1).toBe(href2);
    });
  });

  describe('resolveLayerItemTargetHref', () => {
    const mockLayer: DatasetLayerManifest = {
      layerId: 'overlay-recent-discoveries',
      title: 'Recent Exoplanet Discoveries',
      kind: 'scientific-overlay',
      description: 'Recent discoveries',
      version: 1,
      entries: {},
    };

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

    it('resolves moon targets staying on current view scale (galaxy by default, planet when on planet view)', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'europa',
        targetType: 'moon',
        systemId: 'sol',
        parentBodyId: 'jupiter',
        inUniverseName: 'Europa',
        text: 'Subsurface ocean world',
      };
      const resGalaxy = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS);
      expect(resGalaxy.targetView).toBe('galaxy');
      expect(resGalaxy.href).toBe(
        '/galaxy?center=sol&focus=europa&select=layer:recent-discoveries&layer=recent-discoveries:europa',
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

    it('resolves planet/minor-body targets staying on current view scale', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'lhs-1140-b',
        targetType: 'planet',
        systemId: 'lhs-1140',
        inUniverseName: 'LHS 1140 b',
        text: 'Temperate rocky super-Earth',
      };
      const resGalaxy = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS);
      expect(resGalaxy.targetView).toBe('galaxy');
      expect(resGalaxy.href).toBe(
        '/galaxy?center=lhs-1140&focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
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
  });

  describe('buildLayerCloseHref', () => {
    it('removes layer query param and strips active layer from select while preserving pathname and other params', () => {
      const currentPath = '/system/lhs-1140';
      const currentSearch =
        '?focus=lhs-1140-b&select=tag:habitable-candidate,layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b&center=sol';
      const closeHref = buildLayerCloseHref(currentPath, currentSearch);
      expect(closeHref).not.toContain('layer=');
      expect(closeHref).not.toContain('layer:recent-discoveries');
      expect(closeHref).toContain('focus=lhs-1140-b');
      expect(closeHref).toContain('select=tag:habitable-candidate');
      expect(closeHref).toContain('center=sol');
      expect(closeHref.startsWith('/system/lhs-1140')).toBe(true);
    });

    it('completely removes select if active layer was the sole selection token', () => {
      const currentPath = '/galaxy';
      const currentSearch = '?select=layer:recent-discoveries&layer=recent-discoveries';
      const closeHref = buildLayerCloseHref(currentPath, currentSearch);
      expect(closeHref).toBe('/galaxy');
    });
  });

  describe('resolveActiveLayerCard', () => {
    it('returns null when layer parameter is missing or unknown', () => {
      const card = resolveActiveLayerCard({
        layerParam: null,
        currentPathname: '/galaxy',
        currentSearch: '',
        layers: LAYER_MANIFESTS,
      });
      expect(card).toBeNull();

      const unknownCard = resolveActiveLayerCard({
        layerParam: 'unknown-layer-1234',
        currentPathname: '/galaxy',
        currentSearch: '',
        layers: LAYER_MANIFESTS,
      });
      expect(unknownCard).toBeNull();
    });

    it('returns Overview card model when itemSlug is omitted', () => {
      const card = resolveActiveLayerCard({
        layerParam: 'recent-discoveries',
        currentPathname: '/galaxy',
        currentSearch: '?select=layer:recent-discoveries&layer=recent-discoveries',
        corpus: SAMPLE_CORPUS,
        layers: LAYER_MANIFESTS,
      });

      expect(card).not.toBeNull();
      if (!card || card.mode !== 'overview') throw new Error('Expected overview card');

      expect(card.mode).toBe('overview');
      expect(card.layerSlug).toBe('recent-discoveries');
      expect(card.title).toBe('Recent Discoveries');
      expect(card.kind).toBe('scientific-overlay');
      expect(card.kindLabel).toBe('Scientific Layer');
      expect(card.itemCount).toBeGreaterThan(0);
      expect(card.startHref).toContain('layer=recent-discoveries:');
      expect(card.closeHref).toBe('/galaxy');
    });

    it('returns Item card model with step index, prev/next links, and tag links when itemSlug is present', () => {
      const layer = LAYER_MANIFESTS.find(
        (l) => l.layerId === 'overlay-recent-discoveries',
      )!;
      const cardItem1 = resolveActiveLayerCard({
        layerParam: 'recent-discoveries:lhs-1140-b',
        currentPathname: '/system/lhs-1140',
        currentSearch:
          '?focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
        corpus: SAMPLE_CORPUS,
        layers: LAYER_MANIFESTS,
      });

      expect(cardItem1).not.toBeNull();
      if (!cardItem1 || cardItem1.mode !== 'item') throw new Error('Expected item card');

      expect(cardItem1.mode).toBe('item');
      expect(cardItem1.stepIndex).toBe(1);
      expect(cardItem1.totalItems).toBe(Object.keys(layer.entries).length);
      expect(cardItem1.prevHref).toBe(
        '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
      );
      expect(cardItem1.prevLabel).toBe('Overview');
      expect(cardItem1.nextHref).toContain('layer=recent-discoveries:');
    });

    it('wraps nextHref back to item 1 on final item (Item N)', () => {
      const layer = LAYER_MANIFESTS.find(
        (l) => l.layerId === 'overlay-recent-discoveries',
      )!;
      const entries = Object.values(layer.entries);
      const lastEntry = entries[entries.length - 1];

      const cardLast = resolveActiveLayerCard({
        layerParam: `recent-discoveries:${lastEntry.targetId}`,
        currentPathname: '/system/some-star',
        currentSearch: `?layer=recent-discoveries:${lastEntry.targetId}`,
        corpus: SAMPLE_CORPUS,
        layers: LAYER_MANIFESTS,
      });

      expect(cardLast).not.toBeNull();
      if (!cardLast || cardLast.mode !== 'item') throw new Error('Expected item card');

      expect(cardLast.stepIndex).toBe(entries.length);
      const firstEntry = entries[0];
      expect(cardLast.nextHref).toContain(`layer=recent-discoveries:${firstEntry.targetId}`);
    });
  });

  describe('Scientific Overlay Constellation Layers Resolution', () => {
    it('resolves constellation layers (Orion, Ursa Major, Centaurus) via resolveSelectedSystemsFromLayer and resolveActiveLayerCard', () => {
      const orionSystems = resolveSelectedSystemsFromLayer(
        'overlay-constellation-orion',
        SAMPLE_CORPUS,
        LAYER_MANIFESTS,
      );
      expect(orionSystems.length).toBeGreaterThanOrEqual(9);
      expect(orionSystems.some((s) => s.id === 'hip-27989')).toBe(true);

      const orionCard = resolveActiveLayerCard({
        layerParam: 'overlay-constellation-orion',
        currentPathname: '/galaxy',
        currentSearch: '?layer=overlay-constellation-orion',
        layers: LAYER_MANIFESTS,
      });
      expect(orionCard).not.toBeNull();
      expect(orionCard?.mode).toBe('overview');
      if (orionCard?.mode === 'overview') {
        expect(orionCard.layerId).toBe('overlay-constellation-orion');
        expect(orionCard.title).toBe('Orion (The Hunter)');
      }
    });
  });
});
