import { describe, it, expect } from 'vitest';
import {
  findCanonLayerById,
  splitAliases,
  toAnnotationLookupKey,
  toCanonicalLayerSlug,
  toUrlSlug,
} from './datasetLayerSlugs';
import { SLUG_CACHE_LIMIT } from '../config/cacheConfig';

describe('datasetLayerSlugs', () => {
  it('toUrlSlug normalizes strings and respects bounded LRU cache limit', () => {
    expect(toUrlSlug('The Expanse')).toBe('the-expanse');
    expect(toUrlSlug('  Alpha Centauri A! ')).toBe('alpha-centauri-a');
    expect(toUrlSlug('')).toBe('');

    // Pre-populate up to SLUG_CACHE_LIMIT to verify bounded eviction
    for (let i = 0; i < SLUG_CACHE_LIMIT + 5; i++) {
      toUrlSlug(`Test Slug ${i}`);
    }
    expect(toUrlSlug('The Expanse')).toBe('the-expanse');
  });

  it('splitAliases handles whitespace and empty input', () => {
    expect(splitAliases(undefined)).toEqual([]);
    expect(splitAliases('')).toEqual([]);
    expect(splitAliases('  tau-ceti   sol  hail-mary  ')).toEqual(['tau-ceti', 'sol', 'hail-mary']);
  });

  it('toCanonicalLayerSlug strips canon-, overlay-, and layer- prefixes', () => {
    expect(toCanonicalLayerSlug('canon-project-hail-mary')).toBe('project-hail-mary');
    expect(toCanonicalLayerSlug('overlay-recent-discoveries')).toBe('recent-discoveries');
    expect(toCanonicalLayerSlug('layer-custom-stars')).toBe('custom-stars');
    expect(toCanonicalLayerSlug('custom-world')).toBe('custom-world');
  });

  it('toAnnotationLookupKey strips prefix before colon', () => {
    expect(toAnnotationLookupKey('canon-sample:alpha-cen')).toBe('alpha-cen');
    expect(toAnnotationLookupKey('sol')).toBe('sol');
  });

  it('findCanonLayerById finds layer by ID, slug, or canonical slug', () => {
    const layers = [
      { layerId: 'canon-halo', title: 'Halo' },
      { layerId: 'overlay-jwst-targets', title: 'JWST Targets' },
    ];

    expect(findCanonLayerById('canon-halo', layers)?.title).toBe('Halo');
    expect(findCanonLayerById('halo', layers)?.title).toBe('Halo');
    expect(findCanonLayerById('canon:halo', layers)?.title).toBe('Halo');
    expect(findCanonLayerById('jwst-targets', layers)?.title).toBe('JWST Targets');
    expect(findCanonLayerById('missing', layers)).toBeUndefined();
    expect(findCanonLayerById('', layers)).toBeUndefined();
  });
});
