import { describe, expect, it } from 'vitest';
import { mergeActiveStarsIntoCorpus } from './activeStarsCorpus';
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
  });
});
