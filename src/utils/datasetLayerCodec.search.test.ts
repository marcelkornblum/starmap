import { describe, it, expect } from 'vitest';
import {
  applyResolvedNamesToLayer,
  applyResolvedNamesToLayers,
  buildCompactLayerSearchKeys,
  buildSearchEntriesFromLayers,
  collectUnresolvedLayerTargets,
} from '../../scripts/pipeline/datasetLayerSearchBuilder';
import type { DatasetLayerManifest } from '../types/datasetLayers';

describe('datasetLayerCodec - Search Index Optimization & Precalculated Real Names', () => {
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

    for (const sw of ['the', 'in', 'of', 'on', 'at', 'to', 'for', 'and', 'or', 'a', 'an', 'from', 'by', 'with', 'is', 'are', 'we']) {
      expect(keys).not.toContain(sw);
    }

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

    expect(keys).not.toContain('hail');
    expect(keys).not.toContain('mary');
    expect(keys).not.toContain('tau');
    expect(keys).not.toContain('ceti');

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
          text: 'Immune.',
        },
        'mars': {
          targetId: 'mars',
          targetType: 'planet',
          systemId: 'sol',
          inUniverseName: 'Ares Prime',
          text: 'Martian base.',
        },
      },
    };

    const resolved = applyResolvedNamesToLayer(layerWithoutInUniverse, realNames);
    expect(resolved.entries['gaia-2452378776434477184']?.resolvedName).toBe('Tau Ceti');
    expect(resolved.entries['mars']?.resolvedName).toBeUndefined();
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
