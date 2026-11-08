import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STRUCTURE_DESCRIPTIONS,
  resolveDefaultStructureDescription,
  resolveStellarClassificationFromSpectrum,
  resolveStellarReticleType,
  resolvePlanetReticleType,
  resolveStructureReticleType,
  resolveMinorBodyReticleType,
  precalculateSolarSystemBodyFlags,
} from './astroPrecalculation';
import type { SolarSystemBodyRecord } from '../types/astro';

describe('astroPrecalculation', () => {
  describe('DEFAULT_STRUCTURE_DESCRIPTIONS & resolveDefaultStructureDescription', () => {
    it('provides descriptions for standard structure codes', () => {
      expect(DEFAULT_STRUCTURE_DESCRIPTIONS[1]).toContain('Cantat-Gaudin Gaia survey');
      expect(DEFAULT_STRUCTURE_DESCRIPTIONS[2]).toContain('Harris (2010)');
      expect(DEFAULT_STRUCTURE_DESCRIPTIONS[3]).toContain("Green's SNR");
      expect(DEFAULT_STRUCTURE_DESCRIPTIONS[4]).toContain('ATNF Pulsar Database');
      expect(DEFAULT_STRUCTURE_DESCRIPTIONS[9]).toContain('Barnard');
      expect(DEFAULT_STRUCTURE_DESCRIPTIONS[10]).toContain('OpenNGC');
    });

    it('resolves default description from GalacticStructureRecord type', () => {
      expect(resolveDefaultStructureDescription('OpenCluster')).toContain('Cantat-Gaudin');
      expect(resolveDefaultStructureDescription('GlobularCluster')).toContain('Harris (2010)');
      expect(resolveDefaultStructureDescription('SupernovaRemnant')).toContain("Green's SNR");
      expect(resolveDefaultStructureDescription('Pulsar')).toContain('ATNF Pulsar');
      expect(resolveDefaultStructureDescription('DarkNebula')).toContain('Barnard');
      expect(resolveDefaultStructureDescription('DeepSkyLandmark')).toContain('OpenNGC');
      expect(resolveDefaultStructureDescription('PlanetaryNebula')).toBeTruthy();
    });
  });

  describe('resolveStellarClassificationFromSpectrum', () => {
    it('classifies missing or empty spectra as star', () => {
      expect(resolveStellarClassificationFromSpectrum()).toBe('star');
      expect(resolveStellarClassificationFromSpectrum('')).toBe('star');
      expect(resolveStellarClassificationFromSpectrum('G2V')).toBe('star');
    });

    it('classifies black holes', () => {
      expect(resolveStellarClassificationFromSpectrum('Black Hole')).toBe('black-hole');
      expect(resolveStellarClassificationFromSpectrum('stellar black-hole')).toBe('black-hole');
    });

    it('classifies neutron stars and pulsars', () => {
      expect(resolveStellarClassificationFromSpectrum('PSR B1919+21')).toBe('neutron-star');
      expect(resolveStellarClassificationFromSpectrum('Neutron Star')).toBe('neutron-star');
      expect(resolveStellarClassificationFromSpectrum('pulsar')).toBe('neutron-star');
    });

    it('classifies white dwarfs', () => {
      expect(resolveStellarClassificationFromSpectrum('DA2')).toBe('white-dwarf');
      expect(resolveStellarClassificationFromSpectrum('DB')).toBe('white-dwarf');
    });

    it('classifies brown dwarfs', () => {
      expect(resolveStellarClassificationFromSpectrum('L3V')).toBe('brown-dwarf');
      expect(resolveStellarClassificationFromSpectrum('T6.5')).toBe('brown-dwarf');
      expect(resolveStellarClassificationFromSpectrum('Y0')).toBe('brown-dwarf');
    });
  });

  describe('resolveStellarReticleType', () => {
    it('maps degenerate remnants and hazards directly', () => {
      expect(resolveStellarReticleType('black-hole')).toBe('black-hole');
      expect(resolveStellarReticleType('neutron-star')).toBe('pulsar');
      expect(resolveStellarReticleType('white-dwarf')).toBe('white-dwarf');
      expect(resolveStellarReticleType('brown-dwarf')).toBe('brown-dwarf');
    });

    it('maps stars to stellar-system or multiple-system based on isMultiStar', () => {
      expect(resolveStellarReticleType('star', false)).toBe('stellar-system');
      expect(resolveStellarReticleType('star', true)).toBe('multiple-system');
    });
  });

  describe('resolvePlanetReticleType', () => {
    it('maps dwarf planets to dwarf-planet regardless of composition', () => {
      expect(resolvePlanetReticleType('terrestrial', true)).toBe('dwarf-planet');
      expect(resolvePlanetReticleType('super-earth', true)).toBe('dwarf-planet');
    });

    it('maps planetary compositions to their reticle types', () => {
      expect(resolvePlanetReticleType('gas-giant')).toBe('gas-giant');
      expect(resolvePlanetReticleType('sub-neptune')).toBe('sub-neptune');
      expect(resolvePlanetReticleType('super-earth')).toBe('super-earth');
      expect(resolvePlanetReticleType('terrestrial')).toBe('terrestrial');
      expect(resolvePlanetReticleType()).toBe('terrestrial');
    });
  });

  describe('resolveStructureReticleType', () => {
    it('maps structure types to appropriate reticles', () => {
      expect(resolveStructureReticleType('Pulsar')).toBe('pulsar');
      expect(resolveStructureReticleType('SupernovaRemnant')).toBe('supernova-remnant');
      expect(resolveStructureReticleType('PlanetaryNebula')).toBe('nebula');
      expect(resolveStructureReticleType('EmissionNebula')).toBe('nebula');
      expect(resolveStructureReticleType('DarkNebula')).toBe('nebula');
      expect(resolveStructureReticleType('OpenCluster')).toBe('stellar-cluster');
      expect(resolveStructureReticleType('GlobularCluster')).toBe('stellar-cluster');
    });
  });

  describe('resolveMinorBodyReticleType', () => {
    it('maps explicit solar body classifications', () => {
      expect(resolveMinorBodyReticleType('DwarfPlanet')).toBe('dwarf-planet');
      expect(resolveMinorBodyReticleType('Comet')).toBe('comet');
      expect(resolveMinorBodyReticleType('AsteroidNEO')).toBe('asteroid');
      expect(resolveMinorBodyReticleType('AsteroidMainBelt')).toBe('asteroid');
    });

    it('maps beltZone to kuiper-belt-object when in kuiper zone', () => {
      expect(resolveMinorBodyReticleType('AsteroidDistant', 'kuiper')).toBe('kuiper-belt-object');
    });
  });

  describe('precalculateSolarSystemBodyFlags', () => {
    it('precalculates flags for Earth', () => {
      const earth: SolarSystemBodyRecord = {
        id: 'earth',
        name: 'Earth',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 6371,
        massKg: 5.972e24,
        orbit: {
          semiMajorAxis: 1.0,
          eccentricity: 0.0167,
          inclination: 0.0,
          ascendingNode: 0.0,
          argumentOfPeriapsis: 114.2,
          meanAnomaly: 358.6,
          periodDays: 365.25,
        },
      };

      const enriched = precalculateSolarSystemBodyFlags(earth);
      expect(enriched.targetStarId).toBe('earth');
      expect(enriched.isHabitableCandidate).toBe(true);
      expect(enriched.beltZone).toBeUndefined();
      expect(enriched.isCoreSearch).toBe(true);
      expect(enriched.composition).toBe('terrestrial');
      expect(enriched.reticleType).toBe('terrestrial');
    });

    it('precalculates flags for Ceres in the Asteroid Belt', () => {
      const ceres: SolarSystemBodyRecord = {
        id: 'ceres',
        name: 'Ceres',
        classification: 'DwarfPlanet',
        parentBodyId: 'sol',
        meanRadiusKm: 469.7,
        orbit: {
          semiMajorAxis: 2.77,
          eccentricity: 0.0758,
          inclination: 10.59,
          ascendingNode: 80.3,
          argumentOfPeriapsis: 73.1,
          meanAnomaly: 95.9,
          periodDays: 1681.6,
        },
      };

      const enriched = precalculateSolarSystemBodyFlags(ceres);
      expect(enriched.beltZone).toBe('belt');
      expect(enriched.reticleType).toBe('dwarf-planet');
      expect(enriched.isHabitableCandidate).toBe(false);
      expect(enriched.isCoreSearch).toBe(true);
    });

    it('precalculates flags for Pluto in the Kuiper Belt', () => {
      const pluto: SolarSystemBodyRecord = {
        id: 'pluto',
        name: 'Pluto',
        classification: 'DwarfPlanet',
        parentBodyId: 'sol',
        meanRadiusKm: 1188.3,
        orbit: {
          semiMajorAxis: 39.48,
          eccentricity: 0.2488,
          inclination: 17.16,
          ascendingNode: 110.3,
          argumentOfPeriapsis: 113.8,
          meanAnomaly: 14.5,
          periodDays: 90560,
        },
      };

      const enriched = precalculateSolarSystemBodyFlags(pluto);
      expect(enriched.beltZone).toBe('kuiper');
      expect(enriched.reticleType).toBe('dwarf-planet');
    });

    it('identifies sol primary star targetStarId', () => {
      const sol: SolarSystemBodyRecord = {
        id: 'sol',
        name: 'Sol',
        classification: 'Star',
        meanRadiusKm: 696340,
      };

      const enriched = precalculateSolarSystemBodyFlags(sol);
      expect(enriched.targetStarId).toBe('sol-A');
      expect(enriched.reticleType).toBe('star');
    });

    it('identifies non-core search catalog bodies', () => {
      const pha: SolarSystemBodyRecord = {
        id: 'pha-99942',
        name: 'Apophis',
        classification: 'AsteroidNEO',
        meanRadiusKm: 0.17,
      };

      const enriched = precalculateSolarSystemBodyFlags(pha);
      expect(enriched.isCoreSearch).toBe(false);
    });
  });
});
