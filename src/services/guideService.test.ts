import { describe, it, expect } from 'vitest';
import {
  STAR_TYPE_GUIDE_ENTRIES,
  PLANET_TYPE_GUIDE_ENTRIES,
  HAZARD_GUIDE_ENTRIES,
  resolveStarTypeGuideEntry,
  resolveStarTypeGuideEntries,
  resolvePlanetTypeGuideEntry,
  resolvePlanetTypeGuideEntries,
  resolveHazardGuideEntry,
  resolveHazardGuideEntries,
  extractFocusIdFromSearch,
  getLuminosityLabel,
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
} from './guideService';

describe('guideService', () => {
  describe('extractFocusIdFromSearch & getLuminosityLabel', () => {
    it('extracts focus id correctly from query string', () => {
      expect(extractFocusIdFromSearch('?focus=sol')).toBe('sol');
      expect(extractFocusIdFromSearch('?a=1&focus=tau-ceti&b=2')).toBe('tau-ceti');
      expect(extractFocusIdFromSearch('?focus=proxima%20centauri')).toBe('proxima centauri');
      expect(extractFocusIdFromSearch('')).toBe('');
      expect(extractFocusIdFromSearch('?other=value')).toBe('');
    });

    it('maps luminosity class to human-readable label', () => {
      expect(getLuminosityLabel('Ia')).toBe('Supergiant');
      expect(getLuminosityLabel('Ib')).toBe('Supergiant');
      expect(getLuminosityLabel('II')).toBe('Bright Giant');
      expect(getLuminosityLabel('III')).toBe('Giant');
      expect(getLuminosityLabel('IV')).toBe('Subgiant');
      expect(getLuminosityLabel('V')).toBe('Main-Sequence Dwarf');
      expect(getLuminosityLabel('VI')).toBe('Subdwarf');
      expect(getLuminosityLabel('VII')).toBe('White Dwarf');
      expect(getLuminosityLabel('D')).toBe('White Dwarf');
      expect(getLuminosityLabel('UNKNOWN')).toBeUndefined();
      expect(getLuminosityLabel(undefined)).toBeUndefined();
    });
  });

  describe('STAR_TYPE_GUIDE_ENTRIES catalog', () => {
    it('contains all 9 authoritative star classifications (O, B, A, F, G, K, M, L, D)', () => {
      const ids = STAR_TYPE_GUIDE_ENTRIES.map((e) => e.id);
      expect(ids).toEqual(['o', 'b', 'a', 'f', 'g', 'k', 'm', 'l', 'd']);

      for (const entry of STAR_TYPE_GUIDE_ENTRIES) {
        expect(entry.spectralClass).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.summary).toBeTruthy();
        expect(entry.effectiveTempRange).toBeTruthy();
        expect(entry.massRangeMsun).toBeTruthy();
        expect(entry.radiusRangeRsun).toBeTruthy();
        expect(entry.luminosityRangeLsun).toBeTruthy();
        expect(entry.habitableZoneAu).toBeTruthy();
        expect(entry.chromaticity).toBeTruthy();
        expect(entry.href).toBe(`${STAR_TYPES_GUIDE_PATH}/${entry.id}`);
        expect(entry.canonicalRadiusRsun).toBeGreaterThan(0);
        expect(entry.canonicalTempK).toBeGreaterThan(0);
        expect(entry.chromaticityHex).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(entry.examples.length).toBeGreaterThan(0);
        expect(entry.interiorLayers.length).toBeGreaterThan(0);
      }
    });

    it('contains specific required benchmark examples for key stellar classes', () => {
      const gEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'g');
      expect(gEntry?.examples.some((ex) => ex.name === 'Sol' && ex.href === '/system/sol')).toBe(true);
      expect(gEntry?.examples.some((ex) => ex.name === 'Tau Ceti' && ex.href === '/galaxy?focus=tau-ceti')).toBe(true);
      expect(gEntry?.examples.some((ex) => ex.name.includes('Alpha Centauri A'))).toBe(true);

      const kEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'k');
      expect(kEntry?.examples.some((ex) => ex.name.includes('Alpha Centauri B'))).toBe(true);
      expect(kEntry?.examples.some((ex) => ex.name === 'Epsilon Eridani')).toBe(true);

      const mEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'm');
      expect(mEntry?.examples.some((ex) => ex.name.includes('Proxima Centauri'))).toBe(true);
      expect(mEntry?.examples.some((ex) => ex.name === "Barnard's Star")).toBe(true);

      const lEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'l');
      expect(lEntry?.examples.some((ex) => ex.name === 'Luhman 16')).toBe(true);

      const dEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === 'd');
      expect(dEntry?.examples.some((ex) => ex.name === 'Sirius B')).toBe(true);
    });
  });

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
  });

  describe('PLANET_TYPE_GUIDE_ENTRIES & resolvePlanetTypeGuideEntry', () => {
    it('contains all 4 planetary classifications (DEC-032)', () => {
      const ids = PLANET_TYPE_GUIDE_ENTRIES.map((e) => e.id);
      expect(ids).toEqual(['terrestrial', 'super-earth', 'ice-giant', 'gas-giant']);

      for (const entry of PLANET_TYPE_GUIDE_ENTRIES) {
        expect(entry.composition).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.summary).toBeTruthy();
        expect(entry.massRangeMearth).toBeTruthy();
        expect(entry.radiusRangeRearth).toBeTruthy();
        expect(entry.bulkComposition).toBeTruthy();
        expect(entry.habitabilityNotes).toBeTruthy();
        expect(entry.canonicalRadiusRearth).toBeGreaterThan(0);
        expect(entry.textureTheme).toBeTruthy();
        expect(entry.href).toBe(`${PLANET_TYPES_GUIDE_PATH}/${entry.id}`);
        expect(entry.examples.length).toBeGreaterThan(0);
        expect(entry.interiorLayers.length).toBeGreaterThan(0);
      }
    });

    it('defines authoritative interior cross-section layers for planets', () => {
      const terrestrial = resolvePlanetTypeGuideEntry('terrestrial');
      expect(terrestrial?.interiorLayers).toEqual(['Iron-Nickel Core', 'Silicate Mantle', 'Rocky Crust']);

      const superEarth = resolvePlanetTypeGuideEntry('super-earth');
      expect(superEarth?.interiorLayers).toEqual(['Metallic Core', 'Silicate Mantle', 'Crust / Ocean Layer']);

      const iceGiant = resolvePlanetTypeGuideEntry('ice-giant');
      expect(iceGiant?.interiorLayers).toEqual([
        'Rock-Ice Core',
        'Supercritical Water-Ammonia-Methane Mantle',
        'Hydrogen-Helium Atmosphere',
      ]);

      const gasGiant = resolvePlanetTypeGuideEntry('gas-giant');
      expect(gasGiant?.interiorLayers).toEqual([
        'Rocky/Icy Core',
        'Liquid Metallic Hydrogen Mantle',
        'Molecular Hydrogen-Helium Envelope',
      ]);
    });

    it('contains expected planetary benchmark examples', () => {
      const terrestrial = resolvePlanetTypeGuideEntry('terrestrial');
      expect(terrestrial?.examples.some((ex) => ex.name === 'Earth' && ex.href === '/system/sol?focus=earth')).toBe(true);
      expect(terrestrial?.examples.some((ex) => ex.name.includes('Proxima Centauri b'))).toBe(true);

      const superEarth = resolvePlanetTypeGuideEntry('super-earth');
      expect(superEarth?.examples.some((ex) => ex.name.includes('Tau Ceti e'))).toBe(true);
      expect(superEarth?.examples.some((ex) => ex.name.includes('Tau Ceti f'))).toBe(true);

      const iceGiant = resolvePlanetTypeGuideEntry('ice-giant');
      expect(iceGiant?.examples.some((ex) => ex.name === 'Uranus')).toBe(true);
      expect(iceGiant?.examples.some((ex) => ex.name === 'Neptune')).toBe(true);

      const gasGiant = resolvePlanetTypeGuideEntry('gas-giant');
      expect(gasGiant?.examples.some((ex) => ex.name === 'Jupiter')).toBe(true);
      expect(gasGiant?.examples.some((ex) => ex.name === 'Saturn')).toBe(true);
    });

    it('returns null for unknown planet types', () => {
      expect(resolvePlanetTypeGuideEntry('')).toBeNull();
      expect(resolvePlanetTypeGuideEntry('carbon-world')).toBeNull();
    });
  });

  describe('HAZARD_GUIDE_ENTRIES & resolveHazardGuideEntry', () => {
    const expectedHazardIds = [
      'flare-star',
      'ionising-radiation',
      'variable-flux',
      'extreme-heat',
      'cryogenic-cold',
      'high-gravity',
      'tidal-locking',
      'high-eccentricity',
    ];

    it('contains all 8 authoritative environmental hazards (DEC-032)', () => {
      const ids = HAZARD_GUIDE_ENTRIES.map((h) => h.id);
      expect(ids).toEqual(expectedHazardIds);

      for (const entry of HAZARD_GUIDE_ENTRIES) {
        expect(entry.id).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.domain).toMatch(/^(stellar|planetary)$/);
        expect(entry.domainLabel).toMatch(/^(Stellar System Hazard|Planetary Hazard)$/);
        expect(entry.severity).toMatch(/^(warning|critical)$/);
        expect(entry.summary).toBeTruthy();
        expect(entry.thresholdCriteria).toBeTruthy();
        expect(entry.physicalMechanism).toBeTruthy();
        expect(entry.operationalImpact).toBeTruthy();
        expect(entry.mitigationNotes).toBeTruthy();
        expect(entry.href).toBe(`${HAZARDS_GUIDE_PATH}/${entry.id}`);
        expect(entry.examples.length).toBeGreaterThan(0);
      }
    });

    it('resolves hazard guide entries by id and returns undefined for unknown id', () => {
      const flare = resolveHazardGuideEntry('flare-star');
      expect(flare).toBeDefined();
      expect(flare?.id).toBe('flare-star');
      expect(flare?.domain).toBe('stellar');
      expect(flare?.severity).toBe('warning');

      const tidal = resolveHazardGuideEntry('tidal-locking');
      expect(tidal).toBeDefined();
      expect(tidal?.id).toBe('tidal-locking');
      expect(tidal?.domain).toBe('planetary');

      expect(resolveHazardGuideEntry('unknown-hazard')).toBeUndefined();
      expect(resolveHazardGuideEntry('')).toBeUndefined();
    });

    it('contains specific benchmark examples for hazards', () => {
      const flare = resolveHazardGuideEntry('flare-star');
      expect(flare?.examples.some((ex) => ex.name.includes('Proxima Centauri'))).toBe(true);

      const highGrav = resolveHazardGuideEntry('high-gravity');
      expect(highGrav?.examples.some((ex) => ex.name.includes('Tau Ceti e'))).toBe(true);

      const tidal = resolveHazardGuideEntry('tidal-locking');
      expect(tidal?.examples.some((ex) => ex.name.includes('Proxima Centauri b'))).toBe(true);
    });
  });

  describe('plural resolvers (AUD-092 / DEC-R014k)', () => {
    it('resolveStarTypeGuideEntries parses comma-separated star types', () => {
      const results = resolveStarTypeGuideEntries('G2V,K1V');
      expect(results.length).toBe(2);
      expect(results[0]?.decodedSubtype?.spectralLetter).toBe('G');
      expect(results[1]?.decodedSubtype?.spectralLetter).toBe('K');
    });

    it('resolveStarTypeGuideEntries parses plus-separated compound star types', () => {
      const results = resolveStarTypeGuideEntries('G2V+K1V');
      expect(results.length).toBe(2);
      expect(results[0]?.decodedSubtype?.spectralLetter).toBe('G');
      expect(results[1]?.decodedSubtype?.spectralLetter).toBe('K');
    });

    it('resolveStarTypeGuideEntry handles compound spectral string G2V+K1V gracefully', () => {
      const single = resolveStarTypeGuideEntry('G2V+K1V');
      expect(single).not.toBeNull();
      expect(single?.decodedSubtype?.spectralLetter).toBe('G');
    });

    it('resolvePlanetTypeGuideEntries parses comma- and plus-separated planet types', () => {
      const results = resolvePlanetTypeGuideEntries('terrestrial,super-earth');
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe('terrestrial');
      expect(results[1]?.id).toBe('super-earth');
    });

    it('resolveHazardGuideEntries parses multi-value hazard slugs', () => {
      const results = resolveHazardGuideEntries('high-gravity,tidal-locking');
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe('high-gravity');
      expect(results[1]?.id).toBe('tidal-locking');
    });
  });
});
