import { describe, expect, it } from 'vitest';
import { SYSTEM_TAG_BITS } from '../../utils/compactDataConstants';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import { doesSystemEntryMatchTag } from './searchTagTriggers';

describe('searchTagTriggers', () => {
  it('matches system entries using precalculated bitmask entry.g', () => {
    const entry: CompactSearchEntry = {
      i: 'tau-ceti',
      k: 1,
      n: 'Tau Ceti',
      g: SYSTEM_TAG_BITS.HabitableCandidate | SYSTEM_TAG_BITS.ExoplanetHost,
    };
    expect(doesSystemEntryMatchTag(entry, 'habitable-candidate')).toBe(true);
    expect(doesSystemEntryMatchTag(entry, 'exoplanet-host')).toBe(true);
    expect(doesSystemEntryMatchTag(entry, 'naked-eye')).toBe(false);
  });

  it('falls back to telemetry matching when entry.g is undefined', () => {
    const sol: CompactSearchEntry = {
      i: 'sol',
      k: 1,
      n: 'Sol',
      h: 1,
      m: [-26.74, 'G2V', 8, 1],
    };
    expect(doesSystemEntryMatchTag(sol, 'home-system')).toBe(true);
    expect(doesSystemEntryMatchTag(sol, 'solar-neighborhood-10pc')).toBe(true);
    expect(doesSystemEntryMatchTag(sol, 'naked-eye')).toBe(true);
    expect(doesSystemEntryMatchTag(sol, 'exoplanet-host')).toBe(true);
    expect(doesSystemEntryMatchTag(sol, 'habitable-candidate')).toBe(true);

    const faintStar: CompactSearchEntry = {
      i: 'faint-star',
      k: 1,
      n: 'Faint Star',
      p: [20, 20, 20],
      m: [12.0, 'M4V', 0],
    };
    expect(doesSystemEntryMatchTag(faintStar, 'naked-eye')).toBe(false);
    expect(doesSystemEntryMatchTag(faintStar, 'solar-neighborhood-10pc')).toBe(false);

    const variableStar: CompactSearchEntry = {
      i: 'var-star',
      k: 1,
      n: 'Variable Star',
      a: 'var variable',
    };
    expect(doesSystemEntryMatchTag(variableStar, 'variable-star')).toBe(true);

    const nonStar: CompactSearchEntry = {
      i: 'earth',
      k: 2,
      n: 'Earth',
    };
    expect(doesSystemEntryMatchTag(nonStar, 'habitable-candidate')).toBe(false);
  });
});
