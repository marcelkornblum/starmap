import { describe, expect, it } from 'vitest';
import {
  extractUrlLayerId,
  extractUrlSelectSlugs,
  extractUrlTagFocus,
  parseUrlSelectTokens,
} from './searchUrlSelection';
import { LAYER_INDEX_ENTRIES } from '../../../tests/fixtures/layerFixtures';

describe('searchUrlSelection', () => {
  it('parses structured select tokens from query string', () => {
    expect(parseUrlSelectTokens('?select=tag:habitable-candidate', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'tag', tag: 'habitable-candidate' },
    ]);
    expect(parseUrlSelectTokens('?select=layer:project-hail-mary', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'layer', layerId: 'canon-project-hail-mary' },
    ]);
    expect(parseUrlSelectTokens('?select=star-type:g', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'star-type', starType: 'g' },
    ]);
    expect(parseUrlSelectTokens('?select=planet-type:super-earth', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'planet-type', planetType: 'super-earth' },
    ]);
    expect(parseUrlSelectTokens('?select=sol', LAYER_INDEX_ENTRIES)).toEqual([
      { kind: 'entity', slug: 'sol' },
    ]);
  });

  it('extracts focused tags and layers', () => {
    expect(extractUrlTagFocus('?select=tag:habitable-candidate,sol')).toBe('habitable-candidate');
    expect(extractUrlTagFocus('?select=sol')).toBeNull();

    expect(extractUrlLayerId('?select=layer:project-hail-mary', LAYER_INDEX_ENTRIES)).toBe(
      'canon-project-hail-mary',
    );
    expect(extractUrlLayerId('?layer=recent-discoveries', LAYER_INDEX_ENTRIES)).toBe(
      'overlay-recent-discoveries',
    );
    expect(extractUrlLayerId('?select=sol', LAYER_INDEX_ENTRIES)).toBeNull();
  });

  it('extracts structured select slugs across all kinds', () => {
    const parsed = extractUrlSelectSlugs(
      '?select=tag:habitable-candidate,layer:recent-discoveries,star-type:g,planet-type:super-earth,sol',
      LAYER_INDEX_ENTRIES,
    );
    expect(parsed.tags).toEqual(['habitable-candidate']);
    expect(parsed.layerSlugs).toEqual(['overlay-recent-discoveries']);
    expect(parsed.starTypes).toEqual(['g']);
    expect(parsed.planetTypes).toEqual(['super-earth']);
    expect(parsed.entitySlugs).toEqual(['sol']);
  });
});
