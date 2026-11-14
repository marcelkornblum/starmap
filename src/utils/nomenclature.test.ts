import { describe, it, expect } from 'vitest';
import {
  expandBayerOrFlamsteed,
  expandGreekBayer,
  expandGouldOrConstellationSuffix,
  expandGlieseVariants,
  resolveStarProperName,
  resolveStarDisplayName,
  normalizeCleanKey,
  UNICODE_GREEK_TO_LATIN_MAP,
  SUPERSCRIPT_DIGIT_MAP,
  transliterateGreekAndSuperscripts,
} from './nomenclature';

describe('Step 1: Nomenclature Expansion & Substring-Deduplicated Clean Keys', () => {
  it('expands Greek Bayer and Flamsteed designations with Latin constellation genitives', () => {
    expect(expandBayerOrFlamsteed('Tau', 'Cet')).toBe('Tau Ceti');
    expect(expandBayerOrFlamsteed('Eps', 'Eri')).toBe('Epsilon Eridani');
    expect(expandBayerOrFlamsteed('Bet', 'Pic')).toBe('Beta Pictoris');
    expect(expandBayerOrFlamsteed('Alp', 'CMa')).toBe('Alpha Canis Majoris');
    expect(expandBayerOrFlamsteed('Kap-1', 'Cet')).toBe('Kappa-1 Ceti');
    expect(expandBayerOrFlamsteed('Omi-2', 'Eri')).toBe('Omicron-2 Eridani');
    expect(expandBayerOrFlamsteed('CustomBayer', 'Cet')).toBe('CustomBayer Ceti');
    expect(expandBayerOrFlamsteed(undefined, 'Eri', 40)).toBe('40 Eridani');
    expect(expandBayerOrFlamsteed(undefined, 'Cnc', 55)).toBe('55 Cancri');
    expect(expandBayerOrFlamsteed('Tau', undefined)).toBeUndefined();
    expect(expandBayerOrFlamsteed('Tau', 'UNKNOWN')).toBe('Tau UNKNOWN');
    expect(expandBayerOrFlamsteed(undefined, 'Eri', undefined)).toBeUndefined();
  });

  it('expands trailing IAU constellation abbreviations in Gould, Bayer, and exoplanet strings', () => {
    expect(expandGouldOrConstellationSuffix('')).toBe('');
    expect(expandGouldOrConstellationSuffix('   ')).toBe('');
    expect(expandGouldOrConstellationSuffix('82 G. Eri')).toBe('82 G. Eridani');
    expect(expandGouldOrConstellationSuffix('82 G. Eri b')).toBe('82 G. Eridani b');
    expect(expandGouldOrConstellationSuffix('96 G. Psc')).toBe('96 G. Piscium');
    expect(expandGouldOrConstellationSuffix('Tau Cet')).toBe('Tau Ceti');
    expect(expandGouldOrConstellationSuffix('tau Ceti e')).toBe('Tau Ceti e');
    expect(expandGouldOrConstellationSuffix('Eps Eri')).toBe('Epsilon Eridani');
    expect(expandGouldOrConstellationSuffix('eps Eridani b')).toBe('Epsilon Eridani b');
    expect(expandGouldOrConstellationSuffix('ups And b')).toBe('Upsilon Andromedae b');
    expect(expandGouldOrConstellationSuffix('kap-1 Cet')).toBe('Kappa-1 Ceti');
    expect(expandGouldOrConstellationSuffix('Sirius')).toBe('Sirius');
  });

  it('transliterates Unicode Greek Bayer characters and superscripts deterministically', () => {
    expect(expandGreekBayer('τ')).toBe('Tau');
    expect(expandGreekBayer('α')).toBe('Alpha');
    expect(expandGreekBayer('ε')).toBe('Epsilon');
    expect(expandGreekBayer('π³')).toBe('Pi-3');
    expect(expandGreekBayer('π-3')).toBe('Pi-3');
    expect(expandGreekBayer('ο²')).toBe('Omicron-2');
    expect(expandGreekBayer('Kap-1')).toBe('Kappa-1');
    expect(expandGreekBayer('Alp1')).toBe('Alpha1');

    expect(expandGouldOrConstellationSuffix('τ Cet')).toBe('Tau Ceti');
    expect(expandGouldOrConstellationSuffix('τ Ceti')).toBe('Tau Ceti');
    expect(expandGouldOrConstellationSuffix('τ Cet e')).toBe('Tau Ceti e');
    expect(expandGouldOrConstellationSuffix('α Cen')).toBe('Alpha Centauri');
    expect(expandGouldOrConstellationSuffix('ε Eri b')).toBe('Epsilon Eridani b');
    expect(expandGouldOrConstellationSuffix('π³ Ori')).toBe('Pi-3 Orionis');

    expect(normalizeCleanKey('τ Ceti')).toBe('tauceti');
    expect(normalizeCleanKey('α Centauri')).toBe('alphacentauri');
    expect(normalizeCleanKey('τ')).toBe('tau');
    expect(normalizeCleanKey('π³ Orionis')).toBe('pi3orionis');
  });

  it('handles two-word IAU constellation genitives and space-separated numbered Bayer designations', () => {
    expect(expandGouldOrConstellationSuffix('alp Canis Majoris')).toBe('Alpha Canis Majoris');
    expect(expandGouldOrConstellationSuffix('bet Canis Minoris')).toBe('Beta Canis Minoris');
    expect(expandGouldOrConstellationSuffix('xi Ursae Majoris A')).toBe('Xi Ursae Majoris A');
    expect(expandGouldOrConstellationSuffix('del Ursae Minoris')).toBe('Delta Ursae Minoris');
    expect(expandGouldOrConstellationSuffix('ρ Coronae Borealis b')).toBe('Rho Coronae Borealis b');
    expect(expandGouldOrConstellationSuffix('alp Coronae Australis')).toBe('Alpha Coronae Australis');
    expect(expandGouldOrConstellationSuffix('alp Piscis Austrini')).toBe('Alpha Piscis Austrini');
    expect(expandGouldOrConstellationSuffix('bet Comae Berenices')).toBe('Beta Comae Berenices');
    expect(expandGouldOrConstellationSuffix('alp Canum Venaticorum')).toBe('Alpha Canum Venaticorum');
    expect(expandGouldOrConstellationSuffix('bet Leonis Minoris')).toBe('Beta Leonis Minoris');
    expect(expandGouldOrConstellationSuffix('alp Trianguli Australis')).toBe('Alpha Trianguli Australis');

    expect(expandGouldOrConstellationSuffix('omi 2 Eri')).toBe('Omicron-2 Eridani');
    expect(expandGouldOrConstellationSuffix('omi 2 Eridani')).toBe('Omicron-2 Eridani');
    expect(expandGouldOrConstellationSuffix('pi 3 Ori')).toBe('Pi-3 Orionis');
    expect(expandGouldOrConstellationSuffix('kap 1 Sculptoris')).toBe('Kappa-1 Sculptoris');
    expect(expandGouldOrConstellationSuffix('π 3 Orionis')).toBe('Pi-3 Orionis');

    expect(expandGouldOrConstellationSuffix('82 G. Eri')).toBe('82 G. Eridani');
    expect(expandGouldOrConstellationSuffix('82 G. Eridani')).toBe('82 G. Eridani');
  });

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

  it('expands Gliese / GJ / Gl designations into all three canonical variants', () => {
    expect(expandGlieseVariants(undefined)).toEqual([]);
    expect(expandGlieseVariants('   ')).toEqual([]);
    expect(expandGlieseVariants('Gl 71')).toEqual(['Gl 71', 'GJ 71', 'Gliese 71']);
    expect(expandGlieseVariants('GJ 667C')).toEqual(['GJ 667C', 'Gl 667C', 'Gliese 667C']);
    expect(expandGlieseVariants('Gliese 581')).toEqual(['Gliese 581', 'Gl 581', 'GJ 581']);
    expect(expandGlieseVariants('NN 3622')).toEqual(['NN 3622', 'Gl 3622', 'GJ 3622', 'Gliese 3622']);
    expect(expandGlieseVariants('Sirius')).toEqual([]);
  });

  it('resolves canonical star proper names and primary display titles via dedicated hooks', () => {
    expect(
      resolveStarProperName({
        hygProperName: '82 G. Eri',
        iauProperName: 'Tau Cet',
        officialProperName: 'Sirius',
      }),
    ).toBe('Tau Ceti');
    expect(
      resolveStarProperName({
        hygProperName: '82 G. Eri',
      }),
    ).toBe('82 G. Eridani');
    expect(
      resolveStarProperName({
        officialProperName: 'Rigil Kentaurus',
      }),
    ).toBe('Rigil Kentaurus');
    expect(resolveStarProperName({})).toBeUndefined();

    expect(
      resolveStarDisplayName({
        properName: 'Vega',
        bayer: 'Alp',
        con: 'Lyr',
        sourceId: '123',
      }),
    ).toBe('Vega');
    expect(
      resolveStarDisplayName({
        bayer: 'Tau',
        con: 'Cet',
        sourceId: '123',
      }),
    ).toBe('Tau Ceti');
    expect(
      resolveStarDisplayName({
        gl: 'Gl 581',
        sourceId: '123',
      }),
    ).toBe('Gl 581');
    expect(
      resolveStarDisplayName({
        hip: 8102,
        sourceId: '123',
      }),
    ).toBe('HIP 8102');
    expect(
      resolveStarDisplayName({
        hd: 10700,
        sourceId: '123',
      }),
    ).toBe('HD 10700');
    expect(
      resolveStarDisplayName({
        sourceId: '2452378776434477184',
      }),
    ).toBe('Gaia DR3 2452378776434477184');
    expect(
      resolveStarDisplayName({
        sourceId: 'gaia-2452378776434477184',
      }),
    ).toBe('Gaia DR3 2452378776434477184');
    expect(
      resolveStarDisplayName({
        fallbackId: 'gaia-999',
      }),
    ).toBe('Gaia DR3 999');
    expect(
      resolveStarDisplayName({
        fallbackId: 'sol',
      }),
    ).toBe('sol');
    expect(resolveStarDisplayName({})).toBe('Unknown System');
  });
});
