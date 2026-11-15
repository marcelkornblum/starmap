import { describe, it, expect } from 'vitest';
import {
  encodeLayerManifest,
  decodeLayerManifest,
  resolveEntityLayers,
  resolveSystemLayerEntries,
  buildSearchEntriesFromLayers,
  getOrderedLayerEntries,
  toUrlSlug,
  toCanonicalLayerSlug,
} from './datasetLayerCodec';
import { SLUG_CACHE_LIMIT } from '../config/cacheConfig';
import type { DatasetLayerManifest } from '../types/astro';

describe('Step 3: Dataset Layering System Data Layer (FS-001 & FS-002 — DEC-007)', () => {
  const sampleCanonLayer: DatasetLayerManifest = {
    layerId: 'canon-project-hail-mary',
    title: 'Project Hail Mary',
    aliases: 'astrophage grace rocky weir',
    kind: 'fictional-canon',
    description: 'Locations and world notes from Andy Weir’s Project Hail Mary.',
    version: 1,
    source: {
      summary: 'Hard science-fiction novel in which Astrophage dims local stars except Tau Ceti.',
      creator: 'Andy Weir',
      publicationYear: '2021',
      medium: 'Novel',
      canonicalReference: 'Project Hail Mary (Ballantine Books, 2021)',
      url: 'https://en.wikipedia.org/wiki/Project_Hail_Mary',
    },
    entries: {
      'gaia-2452378776434477184': {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Tau Ceti (Astrophage Destination)',
        text: 'Primary destination of the Hail Mary expedition after Tau Ceti resists Astrophage dimming.',
        workTitle: 'Project Hail Mary',
        aliases: 'Project Hail Mary Astrophage Hail Mary',
        confidence: 'confirmed',
      },
      'tau-ceti-e': {
        targetId: 'tau-ceti-e',
        targetType: 'planet',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Adrian',
        text: 'Super-Earth exoplanet with a dense CO2/methane atmosphere where Grace and Rocky harvest Taumoeba.',
        workTitle: 'Project Hail Mary',
        aliases: 'Adrian Threeworld',
        confidence: 'confirmed',
      },
      'canon-project-hail-mary:erid-homeworld': {
        targetId: 'canon-project-hail-mary:erid-homeworld',
        targetType: 'fictional-body',
        systemId: 'gaia-3195919528989223040',
        inUniverseName: 'Erid (40 Eridani A I)',
        text: 'Super-Earth with a 29-atm ammonia atmosphere orbiting 40 Eridani A; homeworld of Rocky.',
        workTitle: 'Project Hail Mary',
        aliases: 'Erid Rocky Homeworld',
        confidence: 'candidate',
      },
    },
  };

  const sampleCustomLayer: DatasetLayerManifest = {
    layerId: 'custom-user-campaign',
    title: 'My Campaign Notes',
    kind: 'custom-user',
    description: 'Personal starmap notes using the unified layer contract.',
    version: 1,
    entries: {
      'gaia-2452378776434477184': {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Outpost Ceti',
        text: 'Refuelling station established in 2194.',
        aliases: 'Outpost Ceti',
        confidence: 'unverified',
      },
    },
  };

  it('encodes and decodes DatasetLayerManifest with source block (b), flattened entries (x), host systemId (s), and confidence (c)', () => {
    const compact = encodeLayerManifest(sampleCanonLayer);
    expect(compact.i).toBe('canon-project-hail-mary');
    expect(compact.k).toBe(1); // fictional-canon
    expect(compact.b).toEqual({
      s: 'Hard science-fiction novel in which Astrophage dims local stars except Tau Ceti.',
      a: 'Andy Weir',
      y: '2021',
      m: 'Novel',
      r: 'Project Hail Mary (Ballantine Books, 2021)',
      u: 'https://en.wikipedia.org/wiki/Project_Hail_Mary',
    });

    expect(compact.e['gaia-2452378776434477184'].k).toBeUndefined();
    expect(compact.e['gaia-2452378776434477184'].s).toBeUndefined();
    expect(compact.e['gaia-2452378776434477184'].c).toBeUndefined();

    expect(compact.e['tau-ceti-e'].k).toBe(2);
    expect(compact.e['tau-ceti-e'].s).toBe('gaia-2452378776434477184');
    expect(compact.e['tau-ceti-e'].u).toBe('Adrian');
    expect(compact.e['tau-ceti-e'].x).toContain('Taumoeba');

    expect(compact.e['canon-project-hail-mary:erid-homeworld'].k).toBe(6);
    expect(compact.e['canon-project-hail-mary:erid-homeworld'].s).toBe('gaia-3195919528989223040');
    expect(compact.e['canon-project-hail-mary:erid-homeworld'].c).toBe(2);

    const decoded = decodeLayerManifest(compact);
    expect(decoded).toEqual(sampleCanonLayer);
  });

  it('encodes and decodes optional subtitle (t) and space-delimited aliases (a) at parent and entry level, omitting absent fields', () => {
    const layer: DatasetLayerManifest = {
      layerId: 'canon-three-body',
      title: 'Three-Body',
      subtitle: "Remembrance of Earth's Past",
      kind: 'fictional-canon',
      description: 'Three-Body locations.',
      version: 1,
      aliases: 'liu trisolaris',
      entries: {
        'alpha-centauri': {
          targetId: 'alpha-centauri',
          targetType: 'system',
          systemId: 'alpha-centauri',
          subtitle: 'Trisolaran Home System',
          text: 'Home of the Trisolarans.',
          aliases: 'trisolaris',
          confidence: 'confirmed',
        },
        'tau-ceti-e': {
          targetId: 'tau-ceti-e',
          targetType: 'planet',
          systemId: 'tau-ceti',
          text: 'No distinct in-universe name, subtitle or aliases.',
          confidence: 'confirmed',
        },
      },
    };

    const compact = encodeLayerManifest(layer);
    expect(compact.t).toBe("Remembrance of Earth's Past");
    expect(compact.a).toBe('liu trisolaris');
    expect(compact.e['alpha-centauri'].t).toBe('Trisolaran Home System');
    expect(compact.e['alpha-centauri'].a).toBe('trisolaris');
    expect(compact.e['alpha-centauri'].u).toBeUndefined();
    expect(compact.e['tau-ceti-e'].t).toBeUndefined();
    expect(compact.e['tau-ceti-e'].a).toBeUndefined();
    expect(compact.e['tau-ceti-e'].u).toBeUndefined();

    expect(decodeLayerManifest(compact)).toEqual(layer);
  });

  it('resolves entity layers in O(1) and rolls up all system-level entries via resolveSystemLayerEntries', () => {
    const resolved = resolveEntityLayers('gaia-2452378776434477184', [
      sampleCanonLayer,
      sampleCustomLayer,
    ]);

    expect(resolved).toHaveLength(2);
    expect(resolved[0].layerId).toBe('canon-project-hail-mary');
    expect(resolved[0].source?.creator).toBe('Andy Weir');
    expect(resolved[0].entry.inUniverseName).toBe('Tau Ceti (Astrophage Destination)');
    expect(resolved[1].layerId).toBe('custom-user-campaign');
    expect(resolved[1].entry.inUniverseName).toBe('Outpost Ceti');
    expect(resolved[1].entry.text).toBe('Refuelling station established in 2194.');
    expect(resolved[1].entry.confidence).toBe('unverified');

    const systemRollup = resolveSystemLayerEntries('gaia-2452378776434477184', [sampleCanonLayer]);
    expect(systemRollup).toHaveLength(2);
    expect(systemRollup.map((r) => r.entry.targetId)).toEqual([
      'gaia-2452378776434477184',
      'tau-ceti-e',
    ]);

    const empty = resolveEntityLayers('non-existent-id', [sampleCanonLayer]);
    expect(empty).toEqual([]);
  });

  it('generates CompactSearchEntry records (k=7 layers) linked to host systemId (s) so Galactic View highlights the parent star system', () => {
    const coordsMap = new Map<string, [number, number, number]>([
      ['gaia-2452378776434477184', [3.156, 1.54, -1.003]],
      ['gaia-3195919528989223040', [1.854, 4.539, -0.992]],
    ]);

    const entries = buildSearchEntriesFromLayers([sampleCanonLayer], coordsMap);
    expect(entries).toHaveLength(4);

    const parentEntry = entries.find((e) => e.i === 'canon-project-hail-mary');
    expect(parentEntry).toBeDefined();
    expect(parentEntry?.k).toBe(7);
    expect(parentEntry?.n).toBe('Project Hail Mary');
    expect(parentEntry?.s).toBeUndefined();
    expect(parentEntry?.w).toBe('canon-project-hail-mary');
    expect(parentEntry?.c).toBe('Fictional Canon');
    expect(parentEntry?.a).toContain('astrophage');
    expect(parentEntry?.a).toContain('weir');
    expect(parentEntry?.a).not.toContain('projecthailmary');

    const adrianEntry = entries.find((e) => e.i === 'canon-project-hail-mary:tau-ceti-e');
    expect(adrianEntry).toBeDefined();
    expect(adrianEntry?.k).toBe(7);
    expect(adrianEntry?.n).toBe('Adrian');
    expect(adrianEntry?.s).toBe('gaia-2452378776434477184');
    expect(adrianEntry?.w).toBe('canon-project-hail-mary');
    expect(adrianEntry?.p).toEqual([3.156, 1.54, -1.003]);
    expect(adrianEntry?.a).toContain('threeworld');
    expect(adrianEntry?.a).not.toContain('adrian');
    expect(adrianEntry?.a).not.toContain('projecthailmary');

    const eridBodyEntry = entries.find(
      (e) => e.i === 'canon-project-hail-mary:erid-homeworld',
    );
    expect(eridBodyEntry?.s).toBe('gaia-3195919528989223040');
    expect(eridBodyEntry?.p).toEqual([1.854, 4.539, -0.992]);
  });

  it('sorts layer entries deterministically using getOrderedLayerEntries (DEC-036b)', () => {
    const testLayer: DatasetLayerManifest = {
      layerId: 'custom-ordered-layer',
      title: 'Ordered Test Layer',
      kind: 'scientific-overlay',
      description: 'Testing order sequence',
      version: 1,
      entries: {
        'item-c': {
          targetId: 'item-c',
          targetType: 'planet',
          systemId: 'sys-1',
          text: 'Unordered item C',
        },
        'item-a': {
          targetId: 'item-a',
          targetType: 'planet',
          systemId: 'sys-1',
          order: 2,
          text: 'Ordered item A (2)',
        },
        'item-b': {
          targetId: 'item-b',
          targetType: 'planet',
          systemId: 'sys-1',
          order: 1,
          text: 'Ordered item B (1)',
        },
        'item-d': {
          targetId: 'item-d',
          targetType: 'planet',
          systemId: 'sys-1',
          text: 'Unordered item D',
        },
      },
    };

    const ordered = getOrderedLayerEntries(testLayer);
    expect(ordered.map((e) => e.targetId)).toEqual([
      'item-b',
      'item-a',
      'item-c',
      'item-d',
    ]);
  });

  it('encodes and decodes order (o) and parentBodyId (p) in compact format losslessly (DEC-036 / DEC-038)', () => {
    const orderedMoonLayer: DatasetLayerManifest = {
      layerId: 'overlay-test-moons',
      title: 'Moons Test',
      kind: 'scientific-overlay',
      description: 'Moons test description',
      version: 1,
      entries: {
        europa: {
          targetId: 'europa',
          targetType: 'moon',
          systemId: 'sol',
          parentBodyId: 'jupiter',
          order: 1,
          inUniverseName: 'Europa',
          text: 'Jovian moon with subsurface ocean',
          confidence: 'confirmed',
        },
      },
    };

    const compact = encodeLayerManifest(orderedMoonLayer);
    expect(compact.e.europa.o).toBe(1);
    expect(compact.e.europa.p).toBe('jupiter');

    const decoded = decodeLayerManifest(compact);
    expect(decoded.entries.europa.order).toBe(1);
    expect(decoded.entries.europa.parentBodyId).toBe('jupiter');
    expect(decoded).toEqual(orderedMoonLayer);
  });

  describe('toUrlSlug & SLUG_CACHE_LIMIT (DEC-GBZ-003)', () => {
    it('exports SLUG_CACHE_LIMIT of 5000', () => {
      expect(SLUG_CACHE_LIMIT).toBe(5000);
    });

    it('converts strings to URL slugs and handles edge cases', () => {
      expect(toUrlSlug('')).toBe('');
      expect(toUrlSlug('Alpha Centauri A')).toBe('alpha-centauri-a');
      expect(toUrlSlug('  Tau  Ceti  ')).toBe('tau-ceti');
      expect(toUrlSlug('HD 219134 b')).toBe('hd-219134-b');
      expect(toUrlSlug('---Leading-and-trailing---')).toBe('leading-and-trailing');
    });

    it('returns cached results on repeated calls', () => {
      const first = toUrlSlug('Proxima Centauri');
      const second = toUrlSlug('Proxima Centauri');
      expect(first).toBe('proxima-centauri');
      expect(second).toBe(first);
    });

    it('toCanonicalLayerSlug strips layer prefixes correctly', () => {
      expect(toCanonicalLayerSlug('canon-project-hail-mary')).toBe('project-hail-mary');
      expect(toCanonicalLayerSlug('overlay-jwst-targets')).toBe('jwst-targets');
      expect(toCanonicalLayerSlug('layer-habitable-worlds')).toBe('habitable-worlds');
      expect(toCanonicalLayerSlug('custom-user-layer')).toBe('custom-user-layer');
    });
  });
});
