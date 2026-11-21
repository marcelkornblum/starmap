import { describe, it, expect } from 'vitest';
import {
  canonicalizeGlieseCleanKey,
  expandGlieseVariants,
  normalizeCleanKey,
  pruneDerivableAliases,
} from './nomenclature';
import {
  SUPERSCRIPT_DIGIT_MAP,
  UNICODE_GREEK_TO_LATIN_MAP,
  transliterateGreekAndSuperscripts,
} from './bayerTables';

describe('nomenclature (DEC-032 / nomenclature decomposition)', () => {
  it('exports UNICODE_GREEK_TO_LATIN_MAP, SUPERSCRIPT_DIGIT_MAP, and transliterateGreekAndSuperscripts helper', () => {
    expect(UNICODE_GREEK_TO_LATIN_MAP['α']).toBe('alpha');
    expect(UNICODE_GREEK_TO_LATIN_MAP['τ']).toBe('tau');
    expect(UNICODE_GREEK_TO_LATIN_MAP['ς']).toBe('sigma');
    expect(UNICODE_GREEK_TO_LATIN_MAP['Ω']).toBe('Omega');
    expect(SUPERSCRIPT_DIGIT_MAP['¹']).toBe('1');
    expect(SUPERSCRIPT_DIGIT_MAP['³']).toBe('3');
    expect(transliterateGreekAndSuperscripts('π³')).toBe('pi3');
    expect(transliterateGreekAndSuperscripts('α Cen')).toBe('alpha Cen');
  });

  it('normalizes clean keys correctly', () => {
    expect(normalizeCleanKey('τ Ceti')).toBe('tauceti');
    expect(normalizeCleanKey('α Centauri')).toBe('alphacentauri');
    expect(normalizeCleanKey('τ')).toBe('tau');
    expect(normalizeCleanKey('π³ Orionis')).toBe('pi3orionis');
  });

  it('expands Gliese / GJ / Gl designations into all three canonical variants', () => {
    expect(expandGlieseVariants(undefined)).toEqual([]);
    expect(expandGlieseVariants('   ')).toEqual([]);
    expect(expandGlieseVariants('Gl 71')).toEqual(['Gl 71', 'GJ 71', 'Gliese 71']);
    expect(expandGlieseVariants('GJ 667C')).toEqual(['GJ 667C', 'Gl 667C', 'Gliese 667C']);
    expect(expandGlieseVariants('Gliese 581')).toEqual(['Gliese 581', 'Gl 581', 'GJ 581']);
    expect(expandGlieseVariants('NN 3622')).toEqual(['NN 3622', 'Gl 3622', 'GJ 3622', 'Gliese 3622']);
    expect(expandGlieseVariants('Sirius')).toEqual([]);
  });

  it('canonicalizes Gl/GJ/Gliese/NN/Wo keys with numeric suffix to a single gj prefix', () => {
    expect(canonicalizeGlieseCleanKey('gl581')).toBe('gj581');
    expect(canonicalizeGlieseCleanKey('gj581')).toBe('gj581');
    expect(canonicalizeGlieseCleanKey('gliese581')).toBe('gj581');
    expect(canonicalizeGlieseCleanKey('gl667c')).toBe('gj667c');
    expect(canonicalizeGlieseCleanKey('nn3622')).toBe('gj3622');
    expect(canonicalizeGlieseCleanKey('gliese')).toBe('gliese');
    expect(canonicalizeGlieseCleanKey('tauceti')).toBe('tauceti');
  });

  it('prunes derivable name, id, gaiadr3, and duplicate Gliese aliases', () => {
    const gaiaId = 'gaia-2452378776434477184';
    const prunedGaia = pruneDerivableAliases(
      gaiaId,
      'Tau Ceti',
      `tauceti gaia2452378776434477184 gaiadr3${gaiaId.slice(5)} hd10700 hip8102 gl71 gj71 gliese71`,
    );
    expect(prunedGaia).toBe('hd10700 hip8102 gj71');

    const prunedGliese = pruneDerivableAliases(
      'hip-74995',
      'Gliese 581',
      'gl581 gj581 gliese581 hip74995 wolf562',
    );
    expect(prunedGliese).toBe('wolf562');
  });
});
