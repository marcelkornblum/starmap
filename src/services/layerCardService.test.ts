import { describe, expect, it } from 'vitest';
import {
  pickRandomLayerOverviewHref,
  resolveActiveLayerCard,
} from './layerCardService';
import { resolveSelectedSystemsFromLayer } from './search/searchUrlSelectionResolvers';
import { LAYER_MANIFESTS } from '../../content/layers';
import { LAYER_INDEX_ENTRIES } from '../../tests/fixtures/layerFixtures';
import { SAMPLE_CORPUS } from '../../tests/fixtures/searchFixtures';

describe('layerCardService (DEC-039)', () => {
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
      expect(card.closeHref).toBe('/galaxy?select=layer:recent-discoveries');
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
      const firstEntry = entries[0];
      expect(lastEntry).toBeDefined();
      expect(firstEntry).toBeDefined();
      if (!lastEntry || !firstEntry) return;

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
