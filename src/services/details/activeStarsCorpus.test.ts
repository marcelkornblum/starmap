import { describe, expect, it } from 'vitest';
import {
  appendExtraEntriesToCorpus,
  getMergedCorpusParts,
  mergeActiveStarsIntoCorpus,
} from './activeStarsCorpus';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { SystemSummaryNode } from '../../types/astro';

const SAMPLE_GALAXY_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    p: [0, 0, 0],
    m: [-26.74, 'G2V', 8, 1],
    h: 1,
    c: 'stars',
  },
  {
    i: 'alpha-centauri',
    n: 'Alpha Centauri',
    p: [-0.47, 1.32, -0.33],
    m: [-0.27, 'G2V', 1, 1],
    c: 'stars',
  },
];

describe('activeStarsCorpus', () => {
  it('returns same corpus if activeStars is empty', () => {
    expect(mergeActiveStarsIntoCorpus(SAMPLE_GALAXY_CORPUS, [])).toBe(SAMPLE_GALAXY_CORPUS);
    expect(getMergedCorpusParts(SAMPLE_GALAXY_CORPUS)).toBeUndefined();
  });

  it('merges active stars deduplicating by ID', () => {
    const activeStars: SystemSummaryNode[] = [
      {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        x: -0.47,
        y: 1.32,
        z: -0.33,
        dist: 1.3,
        mag: -0.27,
        absmag: 4.38,
        spect: 'G2V',
        starCount: 3,
        planetCount: 1,
        hasHabitableCandidate: false,
        sectorId: 'sector_-000_+001_-000',
      },
      {
        id: 'new-star',
        name: 'New Star',
        x: 2,
        y: 3,
        z: 4,
        dist: 5.38,
        mag: 5.0,
        absmag: 6.0,
        spect: 'K0V',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+002_+003_+004',
      },
    ];

    const merged = mergeActiveStarsIntoCorpus(SAMPLE_GALAXY_CORPUS, activeStars);
    expect(merged.length).toBe(SAMPLE_GALAXY_CORPUS.length + 1);
    expect(merged.some((e) => e.i === 'new-star')).toBe(true);

    const parts = getMergedCorpusParts(merged);
    expect(parts).toBeDefined();
    expect(parts?.base).toBe(SAMPLE_GALAXY_CORPUS);
    expect(parts?.extras).toHaveLength(1);
    expect(parts?.extras[0]?.i).toBe('new-star');
  });

  it('preserves referential stability when activeStars is recreated with identical extra IDs', () => {
    const makeStar = (id: string, name: string): SystemSummaryNode => ({
      id,
      name,
      x: 1,
      y: 2,
      z: 3,
      dist: 3.74,
      mag: 4.5,
      absmag: 5.0,
      spect: 'G2V',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sector_+001_+002_+003',
    });

    const activeList1 = [makeStar('star-x', 'Star X'), makeStar('star-y', 'Star Y')];
    const activeList2 = [makeStar('star-x', 'Star X'), makeStar('star-y', 'Star Y')];

    expect(activeList1).not.toBe(activeList2);
    const merged1 = mergeActiveStarsIntoCorpus(SAMPLE_GALAXY_CORPUS, activeList1);
    const merged2 = mergeActiveStarsIntoCorpus(SAMPLE_GALAXY_CORPUS, activeList2);

    expect(merged1).toBe(merged2);
  });

  it('provides layered array access and appendExtraEntriesToCorpus without cloning base corpus', () => {
    const extra: CompactSearchEntry = { i: 'extra-1', n: 'Extra 1', c: 'stars' };
    const layered = appendExtraEntriesToCorpus(SAMPLE_GALAXY_CORPUS, [extra]);
    expect(Array.isArray(layered)).toBe(true);
    expect(layered.length).toBe(3);
    expect(layered[0]).toBe(SAMPLE_GALAXY_CORPUS[0]);
    expect(layered[2]).toBe(extra);
    expect(Array.from(layered)).toHaveLength(3);
    expect(layered.some((e) => e.i === 'extra-1')).toBe(true);
    expect(getMergedCorpusParts(layered)).toEqual({
      base: SAMPLE_GALAXY_CORPUS,
      extras: [extra],
    });
  });
});
