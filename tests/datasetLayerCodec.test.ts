import { describe, it, expect } from 'vitest';
import {
  encodeLayerManifest,
  decodeLayerManifest,
  resolveEntityLayers,
  resolveSystemLayerEntries,
  buildSearchEntriesFromLayers,
  buildLayerIndexManifest,
  getOrderedLayerEntries,
  findCanonLayerById,
  toCanonicalLayerSlug,
  buildEntityAnnotationBuckets,
  decodeEntityAnnotation,
  buildCompactLayerSearchKeys,
  applyResolvedNamesToLayer,
  applyResolvedNamesToLayers,
  collectUnresolvedLayerTargets,
} from '../src/utils/datasetLayerCodec';
import { getShardKey } from '../src/utils/compactDataCodec';
import { LAYER_MANIFESTS } from '../content/layers';
import type { DatasetLayerManifest } from '../src/types/astro';

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

    // System targetType (1), redundant systemId (s === targetId), and confirmed confidence (1) are omitted by default
    expect(compact.e['gaia-2452378776434477184'].k).toBeUndefined();
    expect(compact.e['gaia-2452378776434477184'].s).toBeUndefined();
    expect(compact.e['gaia-2452378776434477184'].c).toBeUndefined();

    // Planet targetType (2) and distinct host systemId (s) are preserved
    expect(compact.e['tau-ceti-e'].k).toBe(2);
    expect(compact.e['tau-ceti-e'].s).toBe('gaia-2452378776434477184');
    expect(compact.e['tau-ceti-e'].u).toBe('Adrian');
    expect(compact.e['tau-ceti-e'].x).toContain('Taumoeba');

    // Fictional body targetType (6) and candidate confidence (2) are preserved
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

    // System rollup returns both the star system entry AND attached planet ('tau-ceti-e')
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
    // 1 parent layer manifest entry + 3 child item entries = 4 entries
    expect(entries).toHaveLength(4);

    const parentEntry = entries.find((e) => e.i === 'canon-project-hail-mary');
    expect(parentEntry).toBeDefined();
    expect(parentEntry?.k).toBe(7);
    expect(parentEntry?.n).toBe('Project Hail Mary');
    expect(parentEntry?.s).toBeUndefined();
    expect(parentEntry?.w).toBe('canon-project-hail-mary');
    expect(parentEntry?.c).toBe('Fictional Canon');
    // Parent clean keys contain aliases but exclude title/category substrings and prose
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
    // Child clean keys contain delta search terms but exclude name and canon title
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
      'item-b', // order 1
      'item-a', // order 2
      'item-c', // unordered declaration 1
      'item-d', // unordered declaration 2
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

  it('includes the 3 seeded scientific layers with order 1..5 in LAYER_MANIFESTS (DEC-036c)', () => {
    const recent = LAYER_MANIFESTS.find(
      (l) => l.layerId === 'overlay-recent-discoveries',
    );
    expect(recent).toBeDefined();
    expect(recent?.kind).toBe('scientific-overlay');
    expect(recent?.title).toBe('Recent Discoveries');
    const recentOrdered = getOrderedLayerEntries(recent!);
    expect(recentOrdered).toHaveLength(5);
    expect(recentOrdered.map((e) => e.order)).toEqual([1, 2, 3, 4, 5]);
    expect(recentOrdered.map((e) => e.targetId)).toEqual([
      'lhs-1140-b',
      'barnard-b',
      'eps-ind-ab',
      'proxima-centauri-d',
      'teegarden-s-star-d',
    ]);

    const jwst = LAYER_MANIFESTS.find(
      (l) => l.layerId === 'overlay-jwst-targets',
    );
    expect(jwst).toBeDefined();
    expect(jwst?.kind).toBe('scientific-overlay');
    expect(jwst?.title).toBe('JWST Targets');
    const jwstOrdered = getOrderedLayerEntries(jwst!);
    expect(jwstOrdered).toHaveLength(6);
    expect(jwstOrdered.map((e) => e.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(jwstOrdered.map((e) => e.targetId)).toEqual([
      'jwst',
      'lhs-1140-b',
      'trappist-1-e',
      '55-cancri-e',
      'eps-ind-ab',
      'hr-8799-e',
    ]);

    const extreme = LAYER_MANIFESTS.find(
      (l) => l.layerId === 'overlay-extreme-worlds',
    );
    expect(extreme).toBeDefined();
    expect(extreme?.kind).toBe('scientific-overlay');
    expect(extreme?.title).toBe('Extreme Worlds');
    const extremeOrdered = getOrderedLayerEntries(extreme!);
    expect(extremeOrdered).toHaveLength(5);
    expect(extremeOrdered.map((e) => e.order)).toEqual([1, 2, 3, 4, 5]);
    expect(extremeOrdered.map((e) => e.targetId)).toEqual([
      '55-cancri-e',
      'proxima-centauri-b',
      'trappist-1-b',
      'beta-pictoris-b',
      'europa',
    ]);
    expect(extreme?.entries.europa.parentBodyId).toBe('jupiter');
  });

  it('tags parentBodyId on moon entries in existing fictional canon layers', () => {
    const expanse = LAYER_MANIFESTS.find(
      (l) => l.layerId === 'canon-the-expanse',
    );
    expect(expanse?.entries.ganymede?.parentBodyId).toBe('jupiter');
    expect(expanse?.entries.phoebe?.parentBodyId).toBe('saturn');

    const scifi = LAYER_MANIFESTS.find(
      (l) => l.layerId === 'canon-space-odyssey',
    );
    expect(scifi?.entries.europa?.parentBodyId).toBe('jupiter');
    expect(scifi?.entries.iapetus?.parentBodyId).toBe('saturn');
  });

  it('normalises layer slugs via toCanonicalLayerSlug and findCanonLayerById across canon-, overlay-, and layer- prefixes', () => {
    expect(toCanonicalLayerSlug('canon-project-hail-mary')).toBe('project-hail-mary');
    expect(toCanonicalLayerSlug('overlay-recent-discoveries')).toBe('recent-discoveries');
    expect(toCanonicalLayerSlug('overlay-interstellar-probes')).toBe('interstellar-probes');
    expect(toCanonicalLayerSlug('layer-custom-notes')).toBe('custom-notes');
    expect(toCanonicalLayerSlug('project-hail-mary')).toBe('project-hail-mary');

    expect(findCanonLayerById('recent-discoveries', LAYER_MANIFESTS)?.layerId).toBe('overlay-recent-discoveries');
    expect(findCanonLayerById('overlay-recent-discoveries', LAYER_MANIFESTS)?.layerId).toBe('overlay-recent-discoveries');
    expect(findCanonLayerById('project-hail-mary', LAYER_MANIFESTS)?.layerId).toBe('canon-project-hail-mary');
    expect(findCanonLayerById('canon-project-hail-mary', LAYER_MANIFESTS)?.layerId).toBe('canon-project-hail-mary');
    expect(findCanonLayerById('interstellar-probes', LAYER_MANIFESTS)?.layerId).toBe('overlay-interstellar-probes');
    expect(findCanonLayerById('non-existent-layer', LAYER_MANIFESTS)).toBeUndefined();
  });

  it('provides valid authored layers with bibliographic source metadata that round-trip losslessly', () => {
    expect(LAYER_MANIFESTS.length).toBeGreaterThanOrEqual(4);
    const indexManifest = buildLayerIndexManifest(LAYER_MANIFESTS);
    expect(indexManifest.c).toBe(LAYER_MANIFESTS.length);

    for (const seed of LAYER_MANIFESTS) {
      expect(seed.source?.creator).toBeTruthy();
      expect(seed.source?.summary).toBeTruthy();
      expect(seed.source?.url).toMatch(/^https?:\/\//);
      const compact = encodeLayerManifest(seed);
      const roundTripped = decodeLayerManifest(compact);
      expect(roundTripped).toEqual(seed);
    }
  });

  describe('by-entity annotation buckets', () => {
    const annotationLayer: DatasetLayerManifest = {
      layerId: 'canon-sample',
      title: 'Sample Canon',
      kind: 'fictional-canon',
      description: 'Sample',
      version: 1,
      source: { summary: 'Summary', creator: 'Jane Author', publicationYear: '1999' },
      entries: {
        'host-star': {
          targetId: 'host-star',
          targetType: 'system',
          systemId: 'host-star',
          text: 'The host.',
        },
        'host-star-b': {
          targetId: 'host-star-b',
          targetType: 'planet',
          systemId: 'host-star',
          parentBodyId: 'host-star',
          inUniverseName: 'Bee',
          subtitle: 'Second world',
          workTitle: 'Sample Book',
          order: 2,
          text: 'The planet.',
        },
      },
    };
    const overlayLayer: DatasetLayerManifest = {
      layerId: 'overlay-sample',
      title: 'Sample Overlay',
      kind: 'scientific-overlay',
      description: 'Overlay',
      version: 1,
      entries: {
        'host-star-b': {
          targetId: 'host-star-b',
          targetType: 'planet',
          systemId: 'host-star',
          text: 'Overlay note.',
        },
      },
    };

    it('buckets records under targetId and systemId using getShardKey, without duplicating when they match', () => {
      const buckets = buildEntityAnnotationBuckets([annotationLayer, overlayLayer]);
      const lookup = (id: string) => buckets[getShardKey(id)]?.[id];

      expect(lookup('host-star')?.map((r) => `${r.i}:${r.t}`)).toEqual([
        'canon-sample:host-star',
        'canon-sample:host-star-b',
        'overlay-sample:host-star-b',
      ]);
      expect(lookup('host-star-b')?.map((r) => `${r.i}:${r.t}`)).toEqual([
        'canon-sample:host-star-b',
        'overlay-sample:host-star-b',
      ]);
    });

    it('encodes compact records with defaults omitted and decodes them losslessly', () => {
      const buckets = buildEntityAnnotationBuckets([annotationLayer, overlayLayer]);
      const [hostRecord] = buckets[getShardKey('host-star')]['host-star'];
      expect(hostRecord).toEqual({
        i: 'canon-sample',
        n: 'Sample Canon',
        t: 'host-star',
        x: 'The host.',
        a: 'Jane Author',
        r: '1999',
      });

      const planetRecord = buckets[getShardKey('host-star-b')]['host-star-b'][0];
      expect(decodeEntityAnnotation(planetRecord)).toEqual({
        layerId: 'canon-sample',
        layerTitle: 'Sample Canon',
        kind: 'fictional-canon',
        targetId: 'host-star-b',
        targetType: 'planet',
        systemId: 'host-star',
        parentBodyId: 'host-star',
        inUniverseName: 'Bee',
        subtitle: 'Second world',
        workTitle: 'Sample Book',
        text: 'The planet.',
        order: 2,
        creator: 'Jane Author',
        publicationYear: '1999',
      });

      const overlayRecord = buckets[getShardKey('host-star-b')]['host-star-b'][1];
      expect(decodeEntityAnnotation(overlayRecord).kind).toBe('scientific-overlay');
    });

    it('covers every entry of every authored layer under both its target and system keys', () => {
      const buckets = buildEntityAnnotationBuckets(LAYER_MANIFESTS);
      for (const layer of LAYER_MANIFESTS) {
        for (const entry of Object.values(layer.entries)) {
          for (const key of new Set([entry.targetId, entry.systemId])) {
            const records = buckets[getShardKey(key)]?.[key] ?? [];
            expect(
              records.some((r) => r.i === layer.layerId && r.t === entry.targetId),
            ).toBe(true);
          }
        }
      }
    });

    it('round-trips resolvedName (r/d) across manifests and by-entity annotations', () => {
      const manifestWithResolved: DatasetLayerManifest = {
        layerId: 'canon-resolved-test',
        title: 'Resolved Test',
        kind: 'fictional-canon',
        description: 'Testing resolvedName serialization',
        version: 1,
        entries: {
          'gaia-2452378776434477184': {
            targetId: 'gaia-2452378776434477184',
            targetType: 'system',
            systemId: 'gaia-2452378776434477184',
            resolvedName: 'Tau Ceti',
            text: 'Immune to Astrophage.',
          },
        },
      };

      const compact = encodeLayerManifest(manifestWithResolved);
      expect(compact.e['gaia-2452378776434477184']?.r).toBe('Tau Ceti');

      const decoded = decodeLayerManifest(compact);
      expect(decoded.entries['gaia-2452378776434477184']?.resolvedName).toBe('Tau Ceti');

      const buckets = buildEntityAnnotationBuckets([manifestWithResolved]);
      const [shardRecord] = buckets[getShardKey('gaia-2452378776434477184')]['gaia-2452378776434477184'];
      expect(shardRecord.d).toBe('Tau Ceti');

      const decodedAnnotation = decodeEntityAnnotation(shardRecord);
      expect(decodedAnnotation.resolvedName).toBe('Tau Ceti');
    });
  });

  describe('Search Index Optimization & Precalculated Real Names (DL-01, DL-02, DL-03)', () => {
    it('buildCompactLayerSearchKeys strips English stopwords and tokens that duplicate name or canon title', () => {
      const terms = [
        'The quick brown fox',
        'in of on at to for and or a an from by with is are we',
        'Rocky Blip-A',
        'Petrova Astrophage',
      ];
      const excludeKeys = ['Tau Ceti', 'Hail Mary'];

      const result = buildCompactLayerSearchKeys(terms, excludeKeys);
      const keys = result.split(' ');

      // Stopwords must not appear
      for (const sw of ['the', 'in', 'of', 'on', 'at', 'to', 'for', 'and', 'or', 'a', 'an', 'from', 'by', 'with', 'is', 'are', 'we']) {
        expect(keys).not.toContain(sw);
      }

      // Valid tokens retained
      expect(keys).toContain('quick');
      expect(keys).toContain('brown');
      expect(keys).toContain('fox');
      expect(keys).toContain('rocky');
      expect(keys).toContain('blipa');
      expect(keys).toContain('petrova');
      expect(keys).toContain('astrophage');
    });

    it('buildCompactLayerSearchKeys drops tokens that are substrings of exclude keys', () => {
      const terms = ['Project Hail Mary', 'Tau Ceti Destination'];
      const excludeKeys = ['Tau Ceti', 'Hail Mary'];

      const result = buildCompactLayerSearchKeys(terms, excludeKeys);
      const keys = result.split(' ');

      // 'hail' and 'mary' are in 'hailmary', 'tau' and 'ceti' are in 'tauceti'
      expect(keys).not.toContain('hail');
      expect(keys).not.toContain('mary');
      expect(keys).not.toContain('tau');
      expect(keys).not.toContain('ceti');

      // 'project' and 'destination' are retained
      expect(keys).toContain('project');
      expect(keys).toContain('destination');
    });

    it('applyResolvedNamesToLayer populates resolvedName when inUniverseName is omitted', () => {
      const realNames = new Map<string, string>([
        ['gaia-2452378776434477184', 'Tau Ceti'],
        ['mars', 'Mars'],
      ]);

      const layerWithoutInUniverse: DatasetLayerManifest = {
        layerId: 'canon-test',
        title: 'Test Layer',
        kind: 'fictional-canon',
        description: 'Test',
        version: 1,
        entries: {
          'gaia-2452378776434477184': {
            targetId: 'gaia-2452378776434477184',
            targetType: 'system',
            systemId: 'gaia-2452378776434477184',
            // inUniverseName omitted
            text: 'Immune.',
          },
          'mars': {
            targetId: 'mars',
            targetType: 'planet',
            systemId: 'sol',
            inUniverseName: 'Ares Prime', // Distinctive inUniverseName present
            text: 'Martian base.',
          },
        },
      };

      const resolved = applyResolvedNamesToLayer(layerWithoutInUniverse, realNames);
      expect(resolved.entries['gaia-2452378776434477184']?.resolvedName).toBe('Tau Ceti');
      expect(resolved.entries['mars']?.resolvedName).toBeUndefined(); // preserved
      expect(resolved.entries['mars']?.inUniverseName).toBe('Ares Prime');

      const batchResolved = applyResolvedNamesToLayers([layerWithoutInUniverse], realNames);
      expect(batchResolved[0].entries['gaia-2452378776434477184']?.resolvedName).toBe('Tau Ceti');
    });

    it('collectUnresolvedLayerTargets flags layer entries lacking inUniverseName and real-sky match', () => {
      const realNames = new Map<string, string>([
        ['known-star', 'Known Star'],
      ]);

      const testLayer: DatasetLayerManifest = {
        layerId: 'canon-check',
        title: 'Check',
        kind: 'fictional-canon',
        description: 'Check',
        version: 1,
        entries: {
          'known-star': {
            targetId: 'known-star',
            targetType: 'system',
            systemId: 'known-star',
            text: 'Known.',
          },
          'mystery-target': {
            targetId: 'mystery-target',
            targetType: 'planet',
            systemId: 'unknown-sys',
            text: 'Mystery.',
          },
        },
      };

      const unresolved = collectUnresolvedLayerTargets([testLayer], realNames);
      expect(unresolved).toHaveLength(1);
      expect(unresolved[0]).toEqual({
        layerId: 'canon-check',
        targetId: 'mystery-target',
        systemId: 'unknown-sys',
      });
    });

    it('buildSearchEntriesFromLayers sets h=1 solely for systemId=sol or targetId=sol (DL-03)', () => {
      const realNames = new Map<string, string>([
        ['sol', 'Sol'],
        ['mars', 'Mars'],
        ['alpha-centauri', 'Alpha Centauri'],
      ]);

      const solAndCentauriLayer: DatasetLayerManifest = {
        layerId: 'canon-sol-centauri',
        title: 'Sol and Centauri',
        kind: 'fictional-canon',
        description: 'Test h flag derivation',
        version: 1,
        entries: {
          'mars': {
            targetId: 'mars',
            targetType: 'planet',
            systemId: 'sol',
            text: 'Mars in Sol',
          },
          'alpha-centauri': {
            targetId: 'alpha-centauri',
            targetType: 'system',
            systemId: 'alpha-centauri',
            text: 'Alpha Centauri',
          },
        },
      };

      const entries = buildSearchEntriesFromLayers(
        [solAndCentauriLayer],
        new Map(),
        realNames,
      );

      const marsEntry = entries.find((e) => e.i === 'canon-sol-centauri:mars');
      expect(marsEntry?.h).toBe(1);
      expect(marsEntry?.n).toBe('Mars');

      const alphaEntry = entries.find((e) => e.i === 'canon-sol-centauri:alpha-centauri');
      expect(alphaEntry?.h).toBeUndefined();
      expect(alphaEntry?.n).toBe('Alpha Centauri');
    });
  });
});

