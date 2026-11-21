import { describe, it, expect } from 'vitest';
import {
  buildEntityAnnotationBuckets,
  buildLayerIndexManifest,
  encodeEntityAnnotation,
  encodeLayerManifest,
  encodeSourceMeta,
} from './datasetLayerEncoder';
import {
  applyResolvedNamesToLayer,
  applyResolvedNamesToLayers,
  buildCompactLayerSearchKeys,
  buildSearchEntriesFromLayers,
  collectUnresolvedLayerTargets,
} from './datasetLayerSearchBuilder';
import type { DatasetLayerManifest } from '../../src/types/datasetLayers';

describe('datasetLayerEncoder & datasetLayerSearchBuilder', () => {
  const sampleLayer: DatasetLayerManifest = {
    layerId: 'canon-sample',
    title: 'Sample Canon',
    aliases: 'sample canon test',
    kind: 'fictional-canon',
    description: 'Sample description',
    version: 1,
    source: {
      summary: 'Sample book source',
      creator: 'Author Name',
      publicationYear: '2024',
    },
    entries: {
      'sample-target': {
        targetId: 'sample-target',
        targetType: 'system',
        systemId: 'sample-target',
        text: 'Target description text',
        order: 1,
      },
    },
  };

  it('encodes source meta and layer manifest into compact representation', () => {
    const sourceMeta = encodeSourceMeta(sampleLayer.source);
    expect(sourceMeta?.s).toBe('Sample book source');
    expect(sourceMeta?.a).toBe('Author Name');
    expect(sourceMeta?.y).toBe('2024');

    const compact = encodeLayerManifest(sampleLayer);
    expect(compact.i).toBe('canon-sample');
    expect(compact.n).toBe('Sample Canon');
    expect(compact.k).toBe(1);
    expect(compact.e['sample-target']).toBeDefined();
    expect(compact.e['sample-target'].x).toBe('Target description text');
    expect(compact.e['sample-target'].o).toBe(1);

    const annotation = encodeEntityAnnotation(sampleLayer, sampleLayer.entries['sample-target']);
    expect(annotation.i).toBe('canon-sample');
    expect(annotation.t).toBe('sample-target');
    expect(annotation.x).toBe('Target description text');
  });

  it('builds entity annotation buckets indexed by targetId and systemId', () => {
    const buckets = buildEntityAnnotationBuckets([sampleLayer]);
    expect(Object.keys(buckets).length).toBeGreaterThan(0);
  });

  it('builds layer index manifest registry envelope with schema version v', () => {
    const indexManifest = buildLayerIndexManifest([sampleLayer]);
    expect(indexManifest.v).toBe(1);
    expect(indexManifest.c).toBe(1);
    expect(indexManifest.d[0].layerId).toBe('canon-sample');
    expect(indexManifest.d[0].path).toBe('/data/overlays/layers/canon-sample.json');
  });

  it('buildCompactLayerSearchKeys filters stopwords and duplicates', () => {
    const terms = ['The quick brown fox', 'Rocky Blip-A'];
    const exclude = ['Tau Ceti'];
    const keys = buildCompactLayerSearchKeys(terms, exclude);
    expect(keys).not.toContain('the');
    expect(keys).toContain('quick');
  });

  it('applies real names and detects unresolved targets', () => {
    const realNames = new Map([['sample-target', 'Alpha Centauri']]);
    const updated = applyResolvedNamesToLayer(sampleLayer, realNames);
    expect(updated.entries['sample-target'].resolvedName).toBe('Alpha Centauri');

    const layersUpdated = applyResolvedNamesToLayers([sampleLayer], realNames);
    expect(layersUpdated[0].entries['sample-target'].resolvedName).toBe('Alpha Centauri');

    const emptyNames = new Map<string, string>();
    const unresolved = collectUnresolvedLayerTargets([sampleLayer], emptyNames);
    expect(unresolved.length).toBe(1);
    expect(unresolved[0].targetId).toBe('sample-target');
  });

  it('builds search entries from layers', () => {
    const coords = new Map<string, [number, number, number]>([['sample-target', [1, 2, 3]]]);
    const searchEntries = buildSearchEntriesFromLayers([sampleLayer], coords);
    expect(searchEntries.length).toBe(2); // parent entry + child entry
    expect(searchEntries[0].k).toBe(7);
    expect(searchEntries[1].k).toBe(7);
    expect(searchEntries[1].p).toEqual([1, 2, 3]);
  });
});
