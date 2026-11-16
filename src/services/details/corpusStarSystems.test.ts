import { describe, expect, it } from 'vitest';
import { getOrBuildCorpusStarSystems } from './corpusStarSystems';
import { mergeActiveStarsIntoCorpus } from './activeStarsCorpus';
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
    expect(first.cellSizePc).toBe(10);
    expect(first.grid).toBeDefined();
    expect(first.grid.get('0,0,0')).toHaveLength(1);
    expect(first.grid.get('-1,-1,-1')).toHaveLength(1);
  });

  it('incrementally indexes merged active stars into spatial grid', () => {
    const corpus: readonly CompactSearchEntry[] = [
      { i: 'sol', n: 'Sol', p: [0, 0, 0], c: 'stars' },
    ];
    const merged = mergeActiveStarsIntoCorpus(corpus, [
      {
        id: 'vega',
        name: 'Vega',
        x: 0,
        y: 7.7,
        z: 0,
        dist: 7.7,
        mag: 0.03,
        absmag: 0.58,
        spect: 'A0V',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_0_0_0',
      },
    ]);

    const result = getOrBuildCorpusStarSystems(merged);
    expect(result.systemsById.has('vega')).toBe(true);
    expect(result.stars).toHaveLength(2);
    expect(result.grid.get('0,0,0')).toHaveLength(2);
  });
});
