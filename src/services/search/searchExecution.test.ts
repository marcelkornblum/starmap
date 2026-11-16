import { describe, expect, it } from 'vitest';
import { executeCatalogSearch } from './searchExecution';
import { SYSTEM_TAG_BITS } from '../../utils/compactDataConstants';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { SAMPLE_CORPUS } from '../../../tests/fixtures/searchFixtures';

describe('searchExecution', () => {
  it('returns empty grouped results for whitespace queries', () => {
    const results = executeCatalogSearch(SAMPLE_CORPUS, { query: '   ' });
    expect(results.totalMatches).toBe(0);
    expect(results.groups.stars.items).toEqual([]);
  });

  it('executes catalog search across categories with filtering', () => {
    const allResults = executeCatalogSearch(SAMPLE_CORPUS, {
      query: '40 Eri',
      filter: 'all',
    });
    expect(allResults.totalMatches).toBeGreaterThanOrEqual(1);

    const starsOnly = executeCatalogSearch(SAMPLE_CORPUS, {
      query: 'Tau Ceti',
      filter: 'stars',
    });
    expect(starsOnly.groups.stars.items.length).toBeGreaterThan(0);
    expect(starsOnly.groups.planets.items.length).toBe(0);
  });

  it('surfaces child entities of strongly matched star systems', () => {
    const relResults = executeCatalogSearch(
      [
        {
          i: 'tau-ceti-e',
          k: 2,
          n: 'Planet E',
          s: 'sys-tau-ceti',
          a: 'planete',
        },
      ],
      {
        query: 'Tau Ceti',
        filter: 'planets',
        systemEntries: [
          {
            i: 'sys-tau-ceti',
            n: 'Tau Ceti',
            a: 'tauceti',
          },
        ],
      },
    );
    expect(relResults.groups.planets.items.map((i) => i.id)).toContain('tau-ceti-e');
    expect(relResults.groups.planets.items[0]?.systemName).toBe('Tau Ceti');
  });

  it('surfaces matching star systems on tag queries', () => {
    const corpusWithTags: CompactSearchEntry[] = [
      {
        i: 'tau-ceti',
        k: 1,
        n: 'Tau Ceti',
        p: [-3.6, 0.6, -0.7],
        m: [3.5, 'G8.5V', 4, 1],
        g: SYSTEM_TAG_BITS.HabitableCandidate,
      },
      {
        i: 'sirius',
        k: 1,
        n: 'Sirius',
        p: [-1.6, 2.1, -0.4],
        m: [-1.46, 'A1V', 0],
        g: SYSTEM_TAG_BITS.NakedEye,
      },
    ];

    const habitableResults = executeCatalogSearch(corpusWithTags, {
      query: 'habitable',
    });
    expect(habitableResults.groups.stars.items.length).toBe(1);
    expect(habitableResults.groups.stars.items[0]?.id).toBe('tau-ceti');
    expect(habitableResults.groups.stars.items[0]?.href).toBe(
      '/galaxy?focus=tau-ceti&select=tag:habitable-candidate',
    );
  });
});
