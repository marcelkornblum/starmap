import { describe, expect, it } from 'vitest';
import { getOrBuildCorpusStarSystems } from './corpusStarSystems';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';

describe('corpusStarSystems', () => {
  it('indexes star systems from corpus and caches result', () => {
    const corpus: readonly CompactSearchEntry[] = [
      { i: 'sol', n: 'Sol', p: [0, 0, 0], c: 'stars' },
      { i: 'tau-ceti', n: 'Tau Ceti', p: [-3.1, -0.4, -2.0], c: 'stars' },
      { i: 'tau-ceti-e', n: 'Tau Ceti e', p: [-3.1, -0.4, -2.0], s: 'tau-ceti', k: 2 },
    ];

    const first = getOrBuildCorpusStarSystems(corpus);
    const second = getOrBuildCorpusStarSystems(corpus);
    expect(first).toBe(second);
    expect(first.systemsById.has('sol')).toBe(true);
    expect(first.systemsById.has('tau-ceti')).toBe(true);
    expect(first.stars).toHaveLength(2);
  });
});
