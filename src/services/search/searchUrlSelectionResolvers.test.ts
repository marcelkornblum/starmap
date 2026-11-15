import { describe, expect, it } from 'vitest';
import {
  resolveSelectedSystemsFromLayer,
  resolveSelectedSystemsFromTag,
  resolveSelectedSystemsFromUrlSelect,
} from './searchUrlSelectionResolvers';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { SYSTEM_TAG_BITS } from '../../utils/compactDataConstants';
import { LAYER_MANIFESTS } from '../../../content/layers';
import { LAYER_INDEX_ENTRIES } from '../../../tests/fixtures/layerFixtures';

describe('searchUrlSelectionResolvers', () => {
  const corpus: readonly CompactSearchEntry[] = [
    {
      i: 'sol',
      n: 'Sol',
      k: 1,
      m: [-26.74, 'G2V', 8, 1],
      b: [4, 0, 2, 2],
      p: [0, 0, 0],
      h: 1,
      g: SYSTEM_TAG_BITS.HomeSystem | SYSTEM_TAG_BITS.SolarNeighborhood10pc,
    },
    {
      i: 'tau-ceti',
      n: 'Tau Ceti',
      k: 1,
      m: [3.5, 'G8V', 4, 1],
      b: [2, 1, 0, 0],
      p: [-3.1, -0.4, -2.0],
      g: SYSTEM_TAG_BITS.HabitableCandidate | SYSTEM_TAG_BITS.ExoplanetHost,
    },
  ];

  it('resolves selected systems from tags', () => {
    const home = resolveSelectedSystemsFromTag('home-system', corpus);
    expect(home.map((s) => s.id)).toEqual(['sol']);

    const habitable = resolveSelectedSystemsFromTag('habitable-candidate', corpus);
    expect(habitable.map((s) => s.id)).toEqual(['tau-ceti']);

    expect(resolveSelectedSystemsFromTag('', corpus)).toEqual([]);
  });

  it('resolves selected systems from layers', () => {
    const extreme = resolveSelectedSystemsFromLayer('overlay-extreme-worlds', corpus, LAYER_MANIFESTS);
    expect(extreme.length).toBeGreaterThan(0);
    expect(extreme.some((s) => s.id === 'sol')).toBe(true);

    expect(resolveSelectedSystemsFromLayer('non-existent-layer', corpus, LAYER_MANIFESTS)).toEqual([]);
  });

  it('resolves selected systems from compound url select parameters', () => {
    const combined = resolveSelectedSystemsFromUrlSelect(
      '?select=tag:habitable-candidate,star-type:g2v',
      corpus,
      LAYER_INDEX_ENTRIES,
      LAYER_MANIFESTS,
    );
    expect(combined.map((s) => s.id)).toContain('sol');
    expect(combined.map((s) => s.id)).toContain('tau-ceti');

    expect(resolveSelectedSystemsFromUrlSelect('', corpus, LAYER_INDEX_ENTRIES, LAYER_MANIFESTS)).toEqual([]);
  });
});
