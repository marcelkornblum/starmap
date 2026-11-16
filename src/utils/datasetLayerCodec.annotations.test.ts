import { describe, it, expect } from 'vitest';
import {
  decodeEntityAnnotation,
  decodeLayerManifest,
} from './datasetLayerCodec';
import {
  buildEntityAnnotationBuckets,
  encodeLayerManifest,
} from '../../scripts/pipeline/datasetLayerEncoder';
import { getShardKey } from './compactDataCodec';
import { LAYER_MANIFESTS } from '../../content/layers';
import type { DatasetLayerManifest } from '../types/datasetLayers';

describe('datasetLayerCodec - By-Entity Annotation Buckets', () => {
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
