import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  useEntityAnnotations,
  useLoadedLayerManifests,
} from '../src/hooks/useLayerData';
import type { DatasetLayerManifest } from '../src/types/astro';
import type { DecodedEntityAnnotation } from '../src/utils/datasetLayerCodec';
import { resetLayerRuntime, seedLayerRuntime } from './layerFixtures';

const renderManifests = (search: string): readonly DatasetLayerManifest[] => {
  let captured: readonly DatasetLayerManifest[] = [];
  const Probe = () => {
    captured = useLoadedLayerManifests(search);
    return null;
  };
  renderToString(createElement(Probe));
  return captured;
};

const renderAnnotations = (
  ids: readonly string[],
): readonly DecodedEntityAnnotation[] => {
  let captured: readonly DecodedEntityAnnotation[] = [];
  const Probe = () => {
    captured = useEntityAnnotations(ids);
    return null;
  };
  renderToString(createElement(Probe));
  return captured;
};

describe('useLayerData hooks', () => {
  afterEach(() => {
    resetLayerRuntime();
  });

  it('useLoadedLayerManifests returns nothing until the index and manifests are loaded', () => {
    expect(renderManifests('?layer=recent-discoveries')).toEqual([]);
  });

  it('useLoadedLayerManifests returns the cached manifests for layers referenced by ?layer= and ?select=layer:', async () => {
    await seedLayerRuntime({
      manifestIds: ['overlay-recent-discoveries', 'canon-halo'],
    });

    expect(
      renderManifests('?layer=recent-discoveries:lhs-1140-b').map(
        (m) => m.layerId,
      ),
    ).toEqual(['overlay-recent-discoveries']);
    expect(
      renderManifests('?select=layer:halo,layer:recent-discoveries').map(
        (m) => m.layerId,
      ),
    ).toEqual(['canon-halo', 'overlay-recent-discoveries']);
    expect(renderManifests('?select=layer:dune')).toEqual([]);
    expect(renderManifests('')).toEqual([]);
  });

  it('useEntityAnnotations returns decoded records from cached by-entity buckets', async () => {
    expect(renderAnnotations(['tau-ceti-e'])).toEqual([]);

    await seedLayerRuntime({ entityIds: ['tau-ceti-e'] });

    const records = renderAnnotations(['tau-ceti-e']);
    expect(
      records.some(
        (r) =>
          r.layerId === 'canon-project-hail-mary' && r.targetId === 'tau-ceti-e',
      ),
    ).toBe(true);
    expect(renderAnnotations([''])).toEqual([]);
  });
});
