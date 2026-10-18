import { describe, it, expect } from 'vitest';
import {
  encodeLayerManifest,
  decodeLayerManifest,
  resolveEntityLayers,
  resolveSystemLayerEntries,
  buildSearchEntriesFromLayers,
  buildLayerIndexManifest,
  SEED_FICTIONAL_CANON_LAYERS,
} from '../src/utils/datasetLayerCodec';
import type { DatasetLayerManifest } from '../src/types/astro';

describe('Step 3: Dataset Layering System Data Layer (FS-001 & FS-002 — DEC-007)', () => {
  const sampleCanonLayer: DatasetLayerManifest = {
    layerId: 'canon-project-hail-mary',
    title: 'Project Hail Mary',
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
        aliases: ['Project Hail Mary', 'Astrophage', 'Hail Mary'],
        tags: ['Astrophage', 'Hail Mary'],
        confidence: 'confirmed',
      },
      'tau-ceti-e': {
        targetId: 'tau-ceti-e',
        targetType: 'planet',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Adrian',
        text: 'Super-Earth exoplanet with a dense CO2/methane atmosphere where Grace and Rocky harvest Taumoeba.',
        workTitle: 'Project Hail Mary',
        aliases: ['Adrian', 'Threeworld'],
        tags: ['Taumoeba', 'Adrian'],
        confidence: 'confirmed',
      },
      'canon-project-hail-mary:erid-homeworld': {
        targetId: 'canon-project-hail-mary:erid-homeworld',
        targetType: 'fictional-body',
        systemId: 'gaia-3195919528989223040',
        inUniverseName: 'Erid (40 Eridani A I)',
        text: 'Super-Earth with a 29-atm ammonia atmosphere orbiting 40 Eridani A; homeworld of Rocky.',
        workTitle: 'Project Hail Mary',
        aliases: ['Erid', 'Rocky Homeworld'],
        tags: ['Erid', 'Rocky'],
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
        aliases: ['Outpost Ceti'],
        tags: ['Logistics'],
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

  it('generates CompactSearchEntry records (k=7 fiction) linked to host systemId (s) so Galactic View highlights the parent star system', () => {
    const coordsMap = new Map<string, [number, number, number]>([
      ['gaia-2452378776434477184', [3.156, 1.54, -1.003]],
      ['gaia-3195919528989223040', [1.854, 4.539, -0.992]],
    ]);

    const entries = buildSearchEntriesFromLayers([sampleCanonLayer], coordsMap);
    expect(entries).toHaveLength(3);

    const adrianEntry = entries.find((e) => e.i === 'canon-project-hail-mary:tau-ceti-e');
    expect(adrianEntry).toBeDefined();
    expect(adrianEntry?.k).toBe(7);
    expect(adrianEntry?.n).toBe('Adrian');
    expect(adrianEntry?.s).toBe('gaia-2452378776434477184');
    expect(adrianEntry?.w).toBe('canon-project-hail-mary');
    expect(adrianEntry?.p).toEqual([3.156, 1.54, -1.003]);
    expect(adrianEntry?.a).toContain('adrian');
    expect(adrianEntry?.a).toContain('projecthailmary');

    const eridBodyEntry = entries.find(
      (e) => e.i === 'canon-project-hail-mary:erid-homeworld',
    );
    expect(eridBodyEntry?.s).toBe('gaia-3195919528989223040');
    expect(eridBodyEntry?.p).toEqual([1.854, 4.539, -0.992]);
  });

  it('provides valid seed fictional canon layers with bibliographic source metadata that round-trip losslessly', () => {
    expect(SEED_FICTIONAL_CANON_LAYERS.length).toBeGreaterThanOrEqual(4);
    const indexManifest = buildLayerIndexManifest(SEED_FICTIONAL_CANON_LAYERS);
    expect(indexManifest.c).toBe(SEED_FICTIONAL_CANON_LAYERS.length);

    for (const seed of SEED_FICTIONAL_CANON_LAYERS) {
      expect(seed.source?.creator).toBeTruthy();
      expect(seed.source?.summary).toBeTruthy();
      expect(seed.source?.url).toMatch(/^https?:\/\//);
      const compact = encodeLayerManifest(seed);
      const roundTripped = decodeLayerManifest(compact);
      expect(roundTripped).toEqual(seed);
    }
  });
});

