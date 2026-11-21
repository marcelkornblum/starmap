import { describe, expect, it } from 'vitest';
import {
  compareSearchResultItems,
  getPreparedSearchEntry,
  normaliseSearchQuery,
  scoreSearchEntry,
} from './searchScoring';
import type { SearchResultItem } from './searchTypes';
import { SAMPLE_CORPUS } from '../../../tests/fixtures/searchFixtures';

describe('searchScoring', () => {
  it('normalises search queries and expands astronomical suffixes', () => {
    const empty = normaliseSearchQuery('   ');
    expect(empty.cleanKey).toBe('');
    expect(empty.tokens).toEqual([]);

    const tau = normaliseSearchQuery('Tau Cet');
    expect(tau.expandedLower).toBe('tau ceti');
    expect(tau.cleanKey).toBe('tauceti');

    const eri40 = normaliseSearchQuery('40 Eri');
    expect(eri40.expandedLower).toBe('40 eridani');
    expect(eri40.cleanKey).toBe('40eridani');
  });

  it('scores entries with deterministic ranking weights', () => {
    const exactQuery = normaliseSearchQuery('Tau Ceti');
    expect(scoreSearchEntry(SAMPLE_CORPUS[1], exactQuery)).toBe(1000);
    expect(scoreSearchEntry(SAMPLE_CORPUS[3], exactQuery)).toBe(750);
    expect(scoreSearchEntry(SAMPLE_CORPUS[7], exactQuery)).toBe(0);

    const idQuery = normaliseSearchQuery('ngc-1976');
    expect(scoreSearchEntry(SAMPLE_CORPUS[7], idQuery)).toBeGreaterThanOrEqual(850);

    const multiTokenQuery = normaliseSearchQuery('Star Trek NiVar');
    expect(scoreSearchEntry(SAMPLE_CORPUS[11], multiTokenQuery)).toBe(450);

    expect(scoreSearchEntry({ i: 'sol', n: 'Sol' }, normaliseSearchQuery('   '))).toBe(0);
    expect(
      scoreSearchEntry({ i: 'tau-ceti', n: 'Tau Ceti' }, normaliseSearchQuery('TauCeti')),
    ).toBe(950);
  });

  it('compares search result items deterministically', () => {
    const itemA: SearchResultItem = {
      id: 'a',
      name: 'Alpha',
      category: 'stars',
      entityKind: 'star-system',
      reticleType: 'stellar-system',
      targetView: 'galaxy',
      href: '/galaxy?focus=a',
      distancePc: 5,
      score: 800,
    };
    const itemB: SearchResultItem = {
      id: 'b',
      name: 'Beta',
      category: 'stars',
      entityKind: 'star-system',
      reticleType: 'stellar-system',
      targetView: 'galaxy',
      href: '/galaxy?focus=b',
      distancePc: 10,
      score: 800,
    };
    const itemC: SearchResultItem = {
      id: 'c',
      name: 'Alpha',
      category: 'stars',
      entityKind: 'star-system',
      reticleType: 'stellar-system',
      targetView: 'galaxy',
      href: '/galaxy?focus=c',
      distancePc: 5,
      score: 900,
    };

    expect(compareSearchResultItems(itemC, itemA)).toBeLessThan(0);
    expect(compareSearchResultItems(itemA, itemB)).toBeLessThan(0);
  });

  it('prepares and caches compact search entries in a WeakMap', () => {
    const entry = {
      i: 'GAIA-123',
      n: 'Tau Ceti (Astrophage Destination)',
      a: 'astrophage grace',
      c: 'Project Hail Mary',
    };

    const prepared1 = getPreparedSearchEntry(entry);
    const prepared2 = getPreparedSearchEntry(entry);

    expect(prepared1).toBe(prepared2);
    expect(prepared1.idLower).toBe('gaia-123');
    expect(prepared1.nameLower).toBe('tau ceti (astrophage destination)');
    expect(prepared1.nameClean).toBe('taucetiastrophagedestination');
    expect(prepared1.nameSegments).toContain('tauceti');
    expect(prepared1.nameSegments).toContain('astrophagedestination');
    expect(prepared1.aliasKeys).toEqual(['astrophage', 'grace']);
    expect(prepared1.canonLower).toBe('project hail mary');
    expect(prepared1.canonClean).toBe('projecthailmary');
  });

  it('matches Gliese/GJ/Gl and Gaia DR3 queries identically after derivable alias pruning', () => {
    const glieseEntry = {
      i: 'hip-74995',
      n: 'Gliese 581',
      a: 'wolf562',
    };
    expect(scoreSearchEntry(glieseEntry, normaliseSearchQuery('Gliese 581'))).toBe(1000);
    expect(scoreSearchEntry(glieseEntry, normaliseSearchQuery('GJ 581'))).toBe(900);
    expect(scoreSearchEntry(glieseEntry, normaliseSearchQuery('Gl 581'))).toBe(900);
    expect(scoreSearchEntry(glieseEntry, normaliseSearchQuery('GJ 58'))).toBe(700);

    const aliasOnlyGlieseEntry = {
      i: 'hip-80824',
      n: 'Wolf 1061',
      a: 'gj628',
    };
    expect(scoreSearchEntry(aliasOnlyGlieseEntry, normaliseSearchQuery('Gliese 628'))).toBe(900);
    expect(scoreSearchEntry(aliasOnlyGlieseEntry, normaliseSearchQuery('GJ 628'))).toBe(900);
    expect(scoreSearchEntry(aliasOnlyGlieseEntry, normaliseSearchQuery('Gl 628'))).toBe(900);

    const gaiaEntry = {
      i: 'gaia-2452378776434477184',
      n: 'Tau Ceti',
      a: 'hd10700 hip8102',
    };
    expect(scoreSearchEntry(gaiaEntry, normaliseSearchQuery('Gaia DR3 2452378776434477184'))).toBe(900);
    expect(scoreSearchEntry(gaiaEntry, normaliseSearchQuery('Gaia DR3 245237'))).toBe(700);
  });
});
