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
import { GalaxyView } from '../src/views/GalaxyView';
import { SystemView } from '../src/views/SystemView';
import { PlanetView } from '../src/views/PlanetView';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import { LAYER_MANIFESTS } from '../content/layers';
import {
  LAYER_INDEX_ENTRIES,
  annotationRecordsFor,
  resetLayerRuntime,
  seedLayerRuntime,
} from './layerFixtures';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';
import type { DatasetLayerManifest, DatasetLayerEntry } from '../src/types/astro';
import { buildFocusedEntityDetails } from '../src/services/detailsService';
import {
  resolveSelectedSystemsFromUrlSelect,
  resolveSelectedSystemsFromLayer,
} from '../src/services/searchService';
import { useCameraStore } from '../src/stores/useCameraStore';

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

    it('resolves system targets in-place to SystemView when currentPathname matches the target system slug (DEC-041)', () => {
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

    it('resolves planet/minor-body targets staying on current view scale (galaxy by default, system when on system view)', () => {
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
      // Item 1 prevHref returns to overview
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
});

describe('DEC-039: <LayerCard /> Component & Exploration UI', () => {
  it('renders Overview mode correctly with testids and no backdrop scrim', () => {
    const card = resolveActiveLayerCard({
      layerParam: 'recent-discoveries',
      currentPathname: '/galaxy',
      currentSearch: '?layer=recent-discoveries',
      corpus: SAMPLE_CORPUS,
      layers: LAYER_MANIFESTS,
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

  it('renders Item mode correctly with step count, text, navigation buttons, and close button', () => {
    const card = resolveActiveLayerCard({
      layerParam: 'recent-discoveries:lhs-1140-b',
      currentPathname: '/system/lhs-1140',
      currentSearch: '?layer=recent-discoveries:lhs-1140-b',
      corpus: SAMPLE_CORPUS,
      layers: LAYER_MANIFESTS,
    });
    expect(card).not.toBeNull();

    const html = renderToString(createElement(LayerCard, { card: card! }));

    expect(html).toContain('data-testid="layer-card"');
    expect(html).toContain('data-card-mode="item"');
    expect(html).toContain('data-testid="layer-card-overview-link"');
    expect(html).toContain('data-testid="layer-card-step"');
    expect(html).toContain('data-testid="layer-card-title"');
    expect(html).toContain('data-testid="layer-card-text"');
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

  it('resolves in-place deep-link href on canon annotations in buildFocusedEntityDetails (DEC-041)', () => {
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      canonRecords: annotationRecordsFor([
        'gaia-2452378776434477184',
      ]),
    });
    expect(focusedDetails).not.toBeNull();

    const annotation = focusedDetails!.canonAnnotations.find(
      (a) => a.layerId === 'canon-project-hail-mary',
    );
    expect(annotation).toBeDefined();
    expect(annotation!.href).toBe(
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
    );
    expect(annotation!.layerTitle).toBe('Hail Mary');
    expect(annotation!.resolvedName).toBe('Tau Ceti');
  });

  it('resolves in-place deep-link href preserving currentPathname and search when on system view (DEC-041)', () => {
    const focusedDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        position: [-3.1, -0.4, -2.0],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
      currentPathname: '/system/tau-ceti?stale=true#hash',
      currentSearch: '?mode=orbit',
      canonRecords: annotationRecordsFor([
        'gaia-2452378776434477184',
      ]),
    });
    expect(focusedDetails).not.toBeNull();

    const annotation = focusedDetails!.canonAnnotations.find(
      (a) => a.layerId === 'canon-project-hail-mary',
    );
    expect(annotation).toBeDefined();
    expect(annotation!.href).toBe(
      '/system/tau-ceti?mode=orbit&select=layer:project-hail-mary&layer=project-hail-mary:tau-ceti',
    );
  });

  it('renders <LayerCard /> on GalaxyView, SystemView, and PlanetView when ?layer= is present', async () => {
    await seedLayerRuntime({
      manifestIds: ['overlay-recent-discoveries', 'overlay-extreme-worlds'],
    });
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
    resetLayerRuntime();
  });
});

describe('Layer Selection and Camera Recentering (DEC-041 / DEC-042)', () => {
  it('selects all member systems in a layer when ?layer= is present without ?select=', () => {
    const selected = resolveSelectedSystemsFromUrlSelect(
      '?layer=recent-discoveries:lhs-1140-b',
      SAMPLE_CORPUS,
      LAYER_INDEX_ENTRIES,
      LAYER_MANIFESTS,
    );
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.some((s) => s.id === 'lhs-1140')).toBe(true);
  });

  it('increments recenterTick and resets properly in useCameraStore', () => {
    useCameraStore.getState().resetCameraState();
    expect(useCameraStore.getState().recenterTick).toBe(0);

    useCameraStore.getState().triggerRecenter();
    expect(useCameraStore.getState().recenterTick).toBe(1);

    useCameraStore.getState().triggerRecenter();
    expect(useCameraStore.getState().recenterTick).toBe(2);

    useCameraStore.getState().reset();
    expect(useCameraStore.getState().recenterTick).toBe(0);
  });
});

describe('Scientific Overlay Constellation Layers Resolution', () => {
  it('resolves constellation layers (Orion, Ursa Major, Centaurus) via resolveSelectedSystemsFromLayer and resolveActiveLayerCard', () => {
    // 1. resolveSelectedSystemsFromLayer
    const orionSystems = resolveSelectedSystemsFromLayer(
      'overlay-constellation-orion',
      SAMPLE_CORPUS,
      LAYER_MANIFESTS,
    );
    expect(orionSystems.length).toBeGreaterThanOrEqual(9);
    expect(orionSystems.some((s) => s.id === 'hip-27989')).toBe(true);

    const umaSystems = resolveSelectedSystemsFromLayer(
      'overlay-constellation-ursa-major',
      SAMPLE_CORPUS,
      LAYER_MANIFESTS,
    );
    expect(umaSystems.length).toBeGreaterThanOrEqual(10);
    expect(umaSystems.some((s) => s.id === 'hip-54061')).toBe(true);

    const cenSystems = resolveSelectedSystemsFromLayer(
      'overlay-constellation-centaurus',
      SAMPLE_CORPUS,
      LAYER_MANIFESTS,
    );
    expect(cenSystems.length).toBeGreaterThanOrEqual(5);
    expect(cenSystems.some((s) => s.id === 'hip-71683')).toBe(true);

    // 2. resolveActiveLayerCard
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

    const umaCard = resolveActiveLayerCard({
      layerParam: 'overlay-constellation-ursa-major',
      currentPathname: '/galaxy',
      currentSearch: '?layer=overlay-constellation-ursa-major',
      layers: LAYER_MANIFESTS,
    });
    expect(umaCard).not.toBeNull();
    expect(umaCard?.mode).toBe('overview');
    if (umaCard?.mode === 'overview') {
      expect(umaCard.layerId).toBe('overlay-constellation-ursa-major');
      expect(umaCard.title).toContain('Ursa Major');
    }

    const cenCard = resolveActiveLayerCard({
      layerParam: 'overlay-constellation-centaurus',
      currentPathname: '/galaxy',
      currentSearch: '?layer=overlay-constellation-centaurus',
      layers: LAYER_MANIFESTS,
    });
    expect(cenCard).not.toBeNull();
    expect(cenCard?.mode).toBe('overview');
    if (cenCard?.mode === 'overview') {
      expect(cenCard.layerId).toBe('overlay-constellation-centaurus');
      expect(cenCard.title).toContain('Centaurus');
    }
  });
});

