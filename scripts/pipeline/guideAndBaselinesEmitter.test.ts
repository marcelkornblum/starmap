import { describe, expect, it } from 'vitest';
import type { SystemManifest, SystemSummaryNode } from '../../src/types/astro';
import type { SolarSystemBodyRecord } from '../../src/types/astroStructures';
import type { GuideExamplesSeedFile } from '../../src/types/guideData';
import {
  buildGuideExamplesDataset,
  buildReferenceBaselinesDataset,
} from './guideAndBaselinesEmitter';

const SOL_MANIFEST_FIXTURE: SystemManifest = {
  id: 'sol',
  name: 'Sol',
  properName: 'Sun',
  x: 0,
  y: 0,
  z: 0,
  dist: 0,
  sectorId: 'sector_+000_+000_+000',
  stars: [
    {
      id: 'sol-A',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.74,
      absmag: 4.83,
      luminosityLsun: 1.0,
      massMsun: 1.0,
      radiusRsun: 1.0,
      effectiveTempK: 5778,
      reticleType: 'stellar-system',
    },
  ],
  planets: [
    {
      id: 'earth',
      name: 'Earth (Terra)',
      letter: '',
      massMearth: 1.0,
      radiusRearth: 1.0,
      equilibriumTempK: 248.5,
      surfaceGravityG: 1.0,
      composition: 'terrestrial',
      reticleType: 'terrestrial',
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 1.00000261,
        eccentricity: 0.0167,
        inclination: 0.00005,
        ascendingNode: 0,
        argumentOfPeriapsis: 0,
        meanAnomaly: 0,
        periodDays: 365.256,
      },
    },
  ],
};

const SOLAR_BODIES_FIXTURE: SolarSystemBodyRecord[] = [
  {
    id: 'earth',
    name: 'Earth (Terra)',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 6371,
    massKg: 5.97237e24,
    composition: 'terrestrial',
    reticleType: 'terrestrial',
    orbit: SOL_MANIFEST_FIXTURE.planets[0]!.orbit,
  },
];

const TAU_CETI_MANIFEST: SystemManifest = {
  id: 'gaia-2452378776434477184',
  name: 'Tau Ceti',
  x: 3.156,
  y: 1.54,
  z: -1.003,
  dist: 3.65,
  sectorId: 'sector_+000_+000_-025',
  stars: [
    {
      id: '2452378776434477184-A',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8V',
      mag: 3.3,
      absmag: 5.49,
      reticleType: 'stellar-system',
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      letter: 'e',
      massMearth: 3.94,
      radiusRearth: 1.81,
      equilibriumTempK: 286.17,
      surfaceGravityG: 1.83,
      composition: 'super-earth',
      reticleType: 'super-earth',
      isHabitableCandidate: true,
      orbit: {
        semiMajorAxis: 0.538,
        eccentricity: 0.18,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 22.3,
        meanAnomaly: 0,
        periodDays: 162.87,
      },
    },
  ],
};

const ALL_SUMMARIES_FIXTURE: SystemSummaryNode[] = [
  {
    id: 'gaia-2452378776434477184',
    name: 'Tau Ceti',
    x: 3.156,
    y: 1.54,
    z: -1.003,
    dist: 3.65,
    mag: 3.3,
    absmag: 5.49,
    spect: 'G8V',
    starCount: 1,
    planetCount: 1,
    hasHabitableCandidate: true,
    sectorId: 'sector_+000_+000_-025',
    reticleType: 'stellar-system',
  },
];

describe('guideAndBaselinesEmitter', () => {
  it('builds structured reference-baselines.json payload strictly from pipeline datasets', () => {
    const dataset = buildReferenceBaselinesDataset({
      solManifest: SOL_MANIFEST_FIXTURE,
      solarBodies: SOLAR_BODIES_FIXTURE,
      allSummaries: ALL_SUMMARIES_FIXTURE,
      systemManifests: [SOL_MANIFEST_FIXTURE, TAU_CETI_MANIFEST],
      displayNameOverrides: new Map([['earth', 'Earth']]),
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(dataset.targets.sol.id).toBe('sol');
    expect(dataset.targets.sol.name).toBe('Sol');
    expect(dataset.targets.sol.href).toBe('/system/sol');
    expect(dataset.targets.sol.effectiveTempK).toEqual({ value: 5778, unit: 'K' });
    expect(dataset.targets.sol.visualMagnitude).toEqual({ value: -26.74, unit: 'V' });

    expect(dataset.targets.earth.id).toBe('earth');
    expect(dataset.targets.earth.name).toBe('Earth');
    expect(dataset.targets.earth.href).toBe('/planet/earth');
    expect(dataset.targets.earth.periodDays.unit).toBe('d');
    expect(dataset.targets.earth.equilibriumTempK.value).toBe(248.5);

    expect(dataset.targets.stellarBenchmark.name).toBe('Tau Ceti');
    expect(dataset.targets.orbitalBenchmark.name).toBe('Tau Ceti e');
    expect(dataset.metrics['surface-gravity']?.value).toBe('1.00 g');
    expect(dataset.metrics['stellar-magnitude']?.value).toBe('-26.74 V / +4.83 M_V');
  });

  it('resolves guide examples from dataset records and generates canonical hrefs', () => {
    const seed: GuideExamplesSeedFile = {
      starTypes: {
        g: [
          { entityId: 'sol', scope: 'system', framing: 'Solar System primary' },
          { entityId: 'gaia-2452378776434477184', scope: 'galaxy', framing: 'Nearby G-type dwarf' },
        ],
      },
      planetTypes: {
        terrestrial: [
          { entityId: 'earth', scope: 'system', systemId: 'sol', framing: 'Terrestrial benchmark' },
        ],
      },
      metricTypes: {
        'semi-major-axis': [
          { entityId: 'tau-ceti-e', scope: 'system', systemId: 'gaia-2452378776434477184', framing: 'Habitable-zone orbit' },
        ],
      },
      hazardTypes: {
        'high-gravity': [
          { entityId: 'tau-ceti-e', scope: 'system', systemId: 'gaia-2452378776434477184', framing: 'Elevated gravity' },
        ],
      },
    };

    const result = buildGuideExamplesDataset({
      seed,
      solManifest: SOL_MANIFEST_FIXTURE,
      solarBodies: SOLAR_BODIES_FIXTURE,
      allSummaries: ALL_SUMMARIES_FIXTURE,
      systemManifests: [SOL_MANIFEST_FIXTURE, TAU_CETI_MANIFEST],
      displayNameOverrides: new Map([['earth', 'Earth']]),
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.sections.starTypes.g).toHaveLength(2);
    expect(result.sections.starTypes.g[0]?.name).toBe('Sol');
    expect(result.sections.starTypes.g[0]?.href).toBe('/system/sol');
    expect(result.sections.starTypes.g[0]?.note).toContain('G2V');
    expect(result.sections.starTypes.g[1]?.href).toBe('/galaxy?focus=tau-ceti');
    expect(result.sections.planetTypes.terrestrial[0]?.name).toBe('Earth');
    expect(result.sections.planetTypes.terrestrial[0]?.href).toBe('/system/sol?focus=earth');
    expect(result.sections.metricTypes['semi-major-axis'][0]?.note).toContain('0.538 AU');
    expect(result.sections.hazardTypes['high-gravity'][0]?.note).toContain('1.83 g');
  });

  it('throws loudly when a seed entityId cannot be resolved from the dataset', () => {
    const badSeed: GuideExamplesSeedFile = {
      starTypes: {
        o: [{ entityId: 'non-existent-star', scope: 'galaxy' }],
      },
      planetTypes: {},
      metricTypes: {},
      hazardTypes: {},
    };

    expect(() =>
      buildGuideExamplesDataset({
        seed: badSeed,
        solManifest: SOL_MANIFEST_FIXTURE,
        solarBodies: SOLAR_BODIES_FIXTURE,
        allSummaries: ALL_SUMMARIES_FIXTURE,
        systemManifests: [SOL_MANIFEST_FIXTURE, TAU_CETI_MANIFEST],
        generatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(/non-existent-star/);
  });
});
