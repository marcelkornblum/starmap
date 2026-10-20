import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  parseLayerQueryParam,
  pickRandomLayerOverviewHref,
  resolveLayerItemTargetHref,
  buildLayerCloseHref,
  resolveActiveLayerCard,
} from '../src/services/layerCardService';
import { LayerCard } from '../src/components/domain/LayerCard/LayerCard';
import { Search } from '../src/components/search';
import { DetailsPanel } from '../src/components/domain/DetailsPanel/DetailsPanel';
import { GalaxyView } from '../src/views/GalaxyView';
import { SystemView } from '../src/views/SystemView';
import { PlanetView } from '../src/views/PlanetView';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import { SEED_FICTIONAL_CANON_LAYERS } from '../src/utils/datasetLayerCodec';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';
import type { DatasetLayerManifest, DatasetLayerEntry } from '../src/types/astro';
import { buildFocusedEntityDetails } from '../src/services/detailsService';

const SAMPLE_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    k: 1,
    h: 1,
    n: 'Sol',
    p: [0, 0, 0],
    m: [-26.74, 'G2V', 8, 1],
  },
  {
    i: 'gaia-2452378776434477184',
    k: 1,
    n: 'Tau Ceti',
    p: [-3.1, -0.4, -2.0],
    m: [3.49, 'G8.5V', 4, 1],
  },
  {
    i: 'lhs-1140',
    k: 1,
    n: 'LHS 1140',
    p: [10.2, 5.1, -8.3],
    m: [14.15, 'M4.5V', 2, 1],
  },
  {
    i: 'lhs-1140-b',
    k: 2,
    s: 'lhs-1140',
    n: 'LHS 1140 b',
    u: 'super-earth',
    z: 1,
  },
  {
    i: 'europa',
    k: 3,
    s: 'sol',
    o: 'jupiter',
    n: 'Europa',
    h: 1,
  },
];

describe('DEC-039: Layer Card Service & Navigation', () => {
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
      const href = pickRandomLayerOverviewHref('recent-discoveries', () => 0);
      expect(href).toMatch(/^\/galaxy\?select=layer:[a-z0-9-]+&layer=[a-z0-9-]+$/);
      expect(href).not.toContain('recent-discoveries');
    });

    it('is deterministic when custom randomFn is supplied', () => {
      const href1 = pickRandomLayerOverviewHref(null, () => 0.5);
      const href2 = pickRandomLayerOverviewHref(null, () => 0.5);
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

    it('resolves system/structure targets to GalaxyView with layer and item query params', () => {
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
        '/galaxy/tau-ceti?select=layer:recent-discoveries&layer=recent-discoveries:tau-ceti',
      );
    });

    it('resolves moon targets to PlanetView with focus and parent planet route', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'europa',
        targetType: 'moon',
        systemId: 'sol',
        parentBodyId: 'jupiter',
        inUniverseName: 'Europa',
        text: 'Subsurface ocean world',
      };
      const res = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS);
      expect(res.targetView).toBe('planet');
      expect(res.href).toBe(
        '/planet/jupiter?focus=europa&select=layer:recent-discoveries&layer=recent-discoveries:europa',
      );
    });

    it('resolves planet/minor-body targets to SystemView with focus parameter', () => {
      const entry: DatasetLayerEntry = {
        targetId: 'lhs-1140-b',
        targetType: 'planet',
        systemId: 'lhs-1140',
        inUniverseName: 'LHS 1140 b',
        text: 'Temperate rocky super-Earth',
      };
      const res = resolveLayerItemTargetHref(mockLayer, entry, SAMPLE_CORPUS);
      expect(res.targetView).toBe('system');
      expect(res.href).toBe(
        '/system/lhs-1140?focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
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
      });
      expect(card).toBeNull();

      const unknownCard = resolveActiveLayerCard({
        layerParam: 'unknown-layer-1234',
        currentPathname: '/galaxy',
        currentSearch: '',
      });
      expect(unknownCard).toBeNull();
    });

    it('returns Overview card model when itemSlug is omitted', () => {
      const card = resolveActiveLayerCard({
        layerParam: 'recent-discoveries',
        currentPathname: '/galaxy',
        currentSearch: '?select=layer:recent-discoveries&layer=recent-discoveries',
        corpus: SAMPLE_CORPUS,
      });

      expect(card).not.toBeNull();
      if (!card || card.mode !== 'overview') throw new Error('Expected overview card');

      expect(card.mode).toBe('overview');
      expect(card.layerSlug).toBe('recent-discoveries');
      expect(card.title).toBe('Newly Discovered Worlds');
      expect(card.kind).toBe('scientific-overlay');
      expect(card.kindLabel).toBe('Scientific Layer');
      expect(card.itemCount).toBeGreaterThan(0);
      expect(card.startHref).toContain('layer=recent-discoveries:');
      expect(card.closeHref).toBe('/galaxy');
    });

    it('returns Item card model with step index, prev/next links, and tag links when itemSlug is present', () => {
      const layer = SEED_FICTIONAL_CANON_LAYERS.find(
        (l) => l.layerId === 'overlay-recent-discoveries',
      )!;
      const cardItem1 = resolveActiveLayerCard({
        layerParam: 'recent-discoveries:lhs-1140-b',
        currentPathname: '/system/lhs-1140',
        currentSearch:
          '?focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
        corpus: SAMPLE_CORPUS,
      });

      expect(cardItem1).not.toBeNull();
      if (!cardItem1 || cardItem1.mode !== 'item') throw new Error('Expected item card');

      expect(cardItem1.mode).toBe('item');
      expect(cardItem1.stepIndex).toBe(1);
      expect(cardItem1.totalItems).toBe(Object.keys(layer.entries).length);
      // Item 1 prevHref returns to overview
      expect(cardItem1.prevHref).toBe(
        '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
      );
      expect(cardItem1.prevLabel).toBe('Overview');
      expect(cardItem1.nextHref).toContain('layer=recent-discoveries:');
      expect(cardItem1.tags.length).toBeGreaterThan(0);
      expect(cardItem1.tags[0].href).toMatch(/^\/galaxy\?select=tag:[a-z0-9-]+$/);
    });

    it('wraps nextHref back to item 1 on final item (Item N)', () => {
      const layer = SEED_FICTIONAL_CANON_LAYERS.find(
        (l) => l.layerId === 'overlay-recent-discoveries',
      )!;
      const entries = Object.values(layer.entries);
      const lastEntry = entries[entries.length - 1];

      const cardLast = resolveActiveLayerCard({
        layerParam: `recent-discoveries:${lastEntry.targetId}`,
        currentPathname: '/system/some-star',
        currentSearch: `?layer=recent-discoveries:${lastEntry.targetId}`,
        corpus: SAMPLE_CORPUS,
      });

      expect(cardLast).not.toBeNull();
      if (!cardLast || cardLast.mode !== 'item') throw new Error('Expected item card');

      expect(cardLast.stepIndex).toBe(entries.length);
      const firstEntry = entries[0];
      expect(cardLast.nextHref).toContain(`layer=recent-discoveries:${firstEntry.targetId}`);
    });
  });
});

describe('DEC-039: <LayerCard /> Component & Exploration UI', () => {
  it('renders Overview mode correctly with testids and no backdrop scrim', () => {
    const card = resolveActiveLayerCard({
      layerParam: 'recent-discoveries',
      currentPathname: '/galaxy',
      currentSearch: '?layer=recent-discoveries',
      corpus: SAMPLE_CORPUS,
    });
    expect(card).not.toBeNull();

    const html = renderToString(createElement(LayerCard, { card: card! }));

    expect(html).toContain('data-testid="layer-card"');
    expect(html).toContain('data-card-mode="overview"');
    expect(html).toContain('data-testid="layer-card-kind"');
    expect(html).toContain('data-testid="layer-card-title"');
    expect(html).toContain('data-testid="layer-card-description"');
    expect(html).toContain('data-testid="layer-card-count"');
    expect(html).toContain('data-testid="layer-card-start"');
    expect(html).toContain('data-testid="layer-card-close"');
    // Ensure no backdrop scrim
    expect(html).not.toContain('backdrop-scrim');
    expect(html).not.toContain('data-testid="layer-card-scrim"');
  });

  it('renders Item mode correctly with step count, text, tags, navigation buttons, and close button', () => {
    const card = resolveActiveLayerCard({
      layerParam: 'recent-discoveries:lhs-1140-b',
      currentPathname: '/system/lhs-1140',
      currentSearch: '?layer=recent-discoveries:lhs-1140-b',
      corpus: SAMPLE_CORPUS,
    });
    expect(card).not.toBeNull();

    const html = renderToString(createElement(LayerCard, { card: card! }));

    expect(html).toContain('data-testid="layer-card"');
    expect(html).toContain('data-card-mode="item"');
    expect(html).toContain('data-testid="layer-card-overview-link"');
    expect(html).toContain('data-testid="layer-card-step"');
    expect(html).toContain('data-testid="layer-card-title"');
    expect(html).toContain('data-testid="layer-card-text"');
    expect(html).toContain('data-testid="layer-card-tags"');
    expect(html).toContain('data-testid="layer-card-tag-link"');
    expect(html).toContain('data-testid="layer-card-prev"');
    expect(html).toContain('data-testid="layer-card-next"');
    expect(html).toContain('data-testid="layer-card-close"');
  });

  it('renders Explore button in <Search.Panel>', () => {
    const store = createSpatialEntityStore();
    const html = renderToString(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(
          Search.Root,
          { initialCorpus: SAMPLE_CORPUS },
          createElement(Search.Panel, { scope: 'galaxy' }),
        ),
      ),
    );

    expect(html).toContain('data-testid="search-explore-button"');
    expect(html).toContain('Explore');
  });

  it('renders deep-link href to LayerCard in <DetailsPanel /> for canon annotations', () => {
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(focusedDetails).not.toBeNull();

    const html = renderToString(
      createElement(DetailsPanel, { details: focusedDetails! }),
    );

    expect(html).toContain('data-testid="details-canon-item-link"');
    expect(html).toContain('href="/galaxy/tau-ceti?select=layer:project-hail-mary&amp;layer=project-hail-mary:tau-ceti"');
  });

  it('renders <LayerCard /> on GalaxyView, SystemView, and PlanetView when ?layer= is present', () => {
    const store1 = createSpatialEntityStore();
    const galaxyHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: store1 },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '?layer=recent-discoveries',
        }),
      ),
    );
    expect(galaxyHtml).toContain('data-testid="layer-card"');

    const store2 = createSpatialEntityStore();
    const systemHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: store2 },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/lhs-1140',
          locationSearch: '?focus=lhs-1140-b&layer=recent-discoveries:lhs-1140-b',
        }),
      ),
    );
    expect(systemHtml).toContain('data-testid="layer-card"');

    const store3 = createSpatialEntityStore();
    const planetHtml = renderToString(
      createElement(
        SpatialEntityProvider,
        { store: store3 },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/jupiter',
          locationSearch: '?focus=europa&layer=extreme-worlds:europa',
        }),
      ),
    );
    expect(planetHtml).toContain('data-testid="layer-card"');
  });
});
