import { describe, it, expect } from 'vitest';
import {
  encodeLayerManifest,
  decodeLayerManifest,
  buildLayerIndexManifest,
  getOrderedLayerEntries,
  findCanonLayerById,
  toCanonicalLayerSlug,
} from './datasetLayerCodec';
import { LAYER_MANIFESTS } from '../../content/layers';

describe('datasetLayerCodec - LAYER_MANIFESTS & Canon Slug Resolution', () => {
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

    const jwst = LAYER_MANIFESTS.find(
      (l) => l.layerId === 'overlay-jwst-targets',
    );
    expect(jwst).toBeDefined();
    expect(jwst?.kind).toBe('scientific-overlay');
    expect(jwst?.title).toBe('JWST Targets');
    const jwstOrdered = getOrderedLayerEntries(jwst!);
    expect(jwstOrdered).toHaveLength(6);
    expect(jwstOrdered.map((e) => e.order)).toEqual([1, 2, 3, 4, 5, 6]);

    const extreme = LAYER_MANIFESTS.find(
      (l) => l.layerId === 'overlay-extreme-worlds',
    );
    expect(extreme).toBeDefined();
    expect(extreme?.kind).toBe('scientific-overlay');
    expect(extreme?.title).toBe('Extreme Worlds');
    const extremeOrdered = getOrderedLayerEntries(extreme!);
    expect(extremeOrdered).toHaveLength(5);
    expect(extremeOrdered.map((e) => e.order)).toEqual([1, 2, 3, 4, 5]);
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
});
