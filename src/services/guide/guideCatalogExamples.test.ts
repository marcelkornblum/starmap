import { describe, it, expect } from 'vitest';
import {
  resolveStarTypeGuideEntry,
  resolveStarTypeGuideEntries,
  resolvePlanetTypeGuideEntry,
  resolvePlanetTypeGuideEntries,
  resolveHazardGuideEntries,
} from './guideCatalogExamples';

describe('guideCatalogExamples', () => {
  describe('resolveStarTypeGuideEntry', () => {
    it('resolves direct class id without decoded subtype', () => {
      const gEntry = resolveStarTypeGuideEntry('g');
      expect(gEntry).not.toBeNull();
      expect(gEntry?.entry.id).toBe('g');
      expect(gEntry?.decodedSubtype).toBeUndefined();
    });

    it('resolves Yerkes spectral string G8.5V with decoded subtype', () => {
      const detail = resolveStarTypeGuideEntry('G8.5V');
      expect(detail).not.toBeNull();
      expect(detail?.requestedRaw).toBe('G8.5V');
      expect(detail?.entry.id).toBe('g');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'G',
        subdivision: '8.5',
        luminosityClass: 'V',
        luminosityLabel: 'Main-Sequence Dwarf',
      });
    });

    it('resolves lowercase yerkes g2v with normalized spectral classification', () => {
      const detail = resolveStarTypeGuideEntry('g2v');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('g');
      expect(detail?.decodedSubtype?.spectralLetter).toBe('G');
      expect(detail?.decodedSubtype?.subdivision).toBe('2');
      expect(detail?.decodedSubtype?.luminosityClass).toBe('V');
    });

    it('resolves emission dwarf M5.5Ve with emission suffix stripped from luminosity', () => {
      const detail = resolveStarTypeGuideEntry('M5.5Ve');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('m');
      expect(detail?.decodedSubtype?.luminosityClass).toBe('V');
      expect(detail?.decodedSubtype?.luminosityLabel).toBe('Main-Sequence Dwarf');
    });

    it('resolves white dwarf DA2 with luminosity class VII', () => {
      const detail = resolveStarTypeGuideEntry('DA2');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('d');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'D',
        subdivision: '2',
        luminosityClass: 'VII',
        luminosityLabel: 'White Dwarf',
      });
    });

    it('resolves K1V to K-type dwarf', () => {
      const detail = resolveStarTypeGuideEntry('K1V');
      expect(detail).not.toBeNull();
      expect(detail?.entry.id).toBe('k');
      expect(detail?.decodedSubtype).toEqual({
        spectralLetter: 'K',
        subdivision: '1',
        luminosityClass: 'V',
        luminosityLabel: 'Main-Sequence Dwarf',
      });
    });

    it('resolves supergiant and subgiant luminosity classes', () => {
      const detailIa = resolveStarTypeGuideEntry('O9.5Ia');
      expect(detailIa?.decodedSubtype?.luminosityLabel).toBe('Supergiant');

      const detailIV = resolveStarTypeGuideEntry('B0.5IV');
      expect(detailIV?.decodedSubtype?.luminosityLabel).toBe('Subgiant');
    });

    it('returns null for empty or unrecognized spectral strings', () => {
      expect(resolveStarTypeGuideEntry('')).toBeNull();
      expect(resolveStarTypeGuideEntry('   ')).toBeNull();
      expect(resolveStarTypeGuideEntry('Z99X')).toBeNull();
    });

    it('handles compound spectral string G2V+K1V gracefully', () => {
      const single = resolveStarTypeGuideEntry('G2V+K1V');
      expect(single).not.toBeNull();
      expect(single?.decodedSubtype?.spectralLetter).toBe('G');
    });
  });

  describe('resolveStarTypeGuideEntries', () => {
    it('parses comma-separated star types', () => {
      const results = resolveStarTypeGuideEntries('G2V,K1V');
      expect(results.length).toBe(2);
      expect(results[0]?.decodedSubtype?.spectralLetter).toBe('G');
      expect(results[1]?.decodedSubtype?.spectralLetter).toBe('K');
    });

    it('parses plus-separated compound star types', () => {
      const results = resolveStarTypeGuideEntries('G2V+K1V');
      expect(results.length).toBe(2);
      expect(results[0]?.decodedSubtype?.spectralLetter).toBe('G');
      expect(results[1]?.decodedSubtype?.spectralLetter).toBe('K');
    });
  });

  describe('resolvePlanetTypeGuideEntry & resolvePlanetTypeGuideEntries', () => {
    it('resolves known planetary compositions', () => {
      expect(resolvePlanetTypeGuideEntry('terrestrial')?.id).toBe('terrestrial');
      expect(resolvePlanetTypeGuideEntry('super-earth')?.id).toBe('super-earth');
      expect(resolvePlanetTypeGuideEntry('ice-giant')?.id).toBe('ice-giant');
      expect(resolvePlanetTypeGuideEntry('gas-giant')?.id).toBe('gas-giant');
    });

    it('returns null for unknown planet types or empty strings', () => {
      expect(resolvePlanetTypeGuideEntry('')).toBeNull();
      expect(resolvePlanetTypeGuideEntry('carbon-world')).toBeNull();
    });

    it('parses comma- and plus-separated planet types', () => {
      const results = resolvePlanetTypeGuideEntries('terrestrial,super-earth');
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe('terrestrial');
      expect(results[1]?.id).toBe('super-earth');
    });
  });

  describe('resolveHazardGuideEntries', () => {
    it('parses multi-value hazard slugs', () => {
      const results = resolveHazardGuideEntries('high-gravity,tidal-locking');
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe('high-gravity');
      expect(results[1]?.id).toBe('tidal-locking');
    });

    it('returns empty array for empty input', () => {
      expect(resolveHazardGuideEntries('')).toEqual([]);
    });
  });
});
