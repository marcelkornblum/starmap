import { describe, it, expect } from 'vitest';
import {
  buildSearchIndexEnvelope,
  buildSearchIndices,
} from './searchIndexBuilder';
import type {
  KeplerianOrbit,
  SystemManifest,
  SystemSummaryNode,
} from '../../src/types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../../src/types/astroStructures';

describe('searchIndexBuilder', () => {
  const dummyOrbit = (semiMajorAxis: number): KeplerianOrbit => ({
    semiMajorAxis,
    eccentricity: 0.01,
    inclination: 0.0,
    ascendingNode: 0.0,
    argumentOfPeriapsis: 0.0,
    meanAnomaly: 0.0,
    periodDays: 365.25 * semiMajorAxis,
  });

  it('buildSearchIndexEnvelope creates a valid versioned envelope', () => {
    const envelope = buildSearchIndexEnvelope('test-idx', 'Test Index', [], '2026-01-01T00:00:00.000Z');
    expect(envelope.v).toBe(1);
    expect(envelope.i).toBe('test-idx');
    expect(envelope.n).toBe('Test Index');
    expect(envelope.c).toBe(0);
    expect(envelope.d).toEqual([]);
  });

  it('buildSearchIndices constructs 7 category and composite envelopes with ranking and zones', () => {
    const systems: SystemSummaryNode[] = [
      {
        id: 'sol',
        name: 'Sol',
        properName: 'Sun',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        mag: -26.74,
        absmag: 4.83,
        spect: 'G2V',
        starCount: 1,
        planetCount: 8,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_+000',
      },
      {
        id: 'sirius',
        name: 'Sirius',
        properName: 'Sirius',
        x: -1.61,
        y: 2.08,
        z: -0.25,
        dist: 2.64,
        mag: -1.46,
        absmag: 1.42,
        spect: 'A1V',
        starCount: 2,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_-001_+001_-001',
      },
      {
        id: 'tau-ceti',
        name: 'Tau Ceti',
        properName: 'Tau Ceti',
        x: 3.156,
        y: 1.54,
        z: -1.003,
        dist: 3.652,
        mag: 3.5,
        absmag: 5.69,
        spect: 'G8V',
        starCount: 1,
        planetCount: 2,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_-025',
      },
    ];

    const manifests: SystemManifest[] = [
      {
        id: 'tau-ceti',
        name: 'Tau Ceti',
        properName: 'Tau Ceti',
        x: 3.156,
        y: 1.54,
        z: -1.003,
        dist: 3.652,
        sectorId: 'sector_+000_+000_-025',
        stars: [],
        planets: [
          {
            id: 'tau-ceti-e',
            name: 'Tau Ceti e',
            letter: 'e',
            orbit: dummyOrbit(0.538),
            isHabitableCandidate: true,
          },
          {
            id: 'tau-ceti-f',
            name: 'Tau Ceti f',
            letter: 'f',
            orbit: dummyOrbit(1.334),
          },
        ],
      },
    ];

    const structures: GalacticStructureRecord[] = [
      {
        id: 'crab-nebula',
        name: 'Crab Nebula',
        type: 'SupernovaRemnant',
        x: -1900,
        y: 400,
        z: -300,
        dist: 2000,
        designations: ['M1', 'NGC 1952'],
        description: 'Supernova remnant',
      },
      {
        id: 'orion-nebula',
        name: 'Orion Nebula',
        type: 'EmissionNebula',
        x: -350,
        y: -150,
        z: -120,
        dist: 412,
        designations: ['M42', 'NGC 1976'],
        description: 'Diffuse nebula',
      },
    ];

    const solarBodies: SolarSystemBodyRecord[] = [
      {
        id: 'earth',
        name: 'Earth',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 6371,
        massKg: 5.972e24,
        orbit: dummyOrbit(1.0),
        isHabitableCandidate: true,
      },
      {
        id: 'moon',
        name: 'Moon',
        classification: 'Moon',
        parentBodyId: 'earth',
        meanRadiusKm: 1737.4,
        orbit: dummyOrbit(0.00257),
      },
      {
        id: 'vesta',
        name: 'Vesta',
        classification: 'AsteroidMainBelt',
        parentBodyId: 'sol',
        meanRadiusKm: 262,
        orbit: dummyOrbit(2.36),
      },
    ];

    const indices = buildSearchIndices({
      systems,
      manifests,
      structures,
      solarBodies: [
        ...solarBodies,
        {
          id: 'pha-99942',
          name: '99942 Apophis',
          classification: 'AsteroidNEO',
          parentBodyId: 'sol',
          meanRadiusKm: 0.185,
          orbit: dummyOrbit(1.922),
          isCoreSearch: false,
        },
        {
          id: 'voyager-1',
          name: 'Voyager 1',
          classification: 'AsteroidDistant',
          parentBodyId: 'sol',
          meanRadiusKm: 0.001,
          tags: ['Spacecraft'],
          isCoreSearch: true,
        },
        {
          id: 'halley',
          name: "Halley's Comet",
          classification: 'Comet',
          parentBodyId: 'sol',
          meanRadiusKm: 5.5,
          orbit: dummyOrbit(17.834),
          isCoreSearch: false,
        },
      ],
      layerEntries: [
        {
          i: 'canon-sol-prime',
          k: 7,
          n: 'Sol Prime',
          a: 'sol-prime',
        },
      ],
      referencedLayerIds: new Set(['tau-ceti', 'tau-ceti-e', 'orion-nebula', 'halley']),
    });

    expect(indices.startup.v).toBe(1);
    expect(indices.startup.c).toBeGreaterThan(0);
    expect(indices.startup.d.every((e) => e.a === undefined)).toBe(true);
    // Sol system star & primary bodies + constructs + layers + layer-referenced items
    expect(indices.startup.d.some((e) => e.i === 'sol')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'earth')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'moon' && e.o === 'earth')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'voyager-1')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'canon-sol-prime')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'tau-ceti')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'tau-ceti-e')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'orion-nebula')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'halley')).toBe(true);
    // Unreferenced stars, exoplanets, structures, and bulk minor bodies are excluded from startup
    expect(indices.startup.d.some((e) => e.i === 'sirius')).toBe(false);
    expect(indices.startup.d.some((e) => e.i === 'tau-ceti-f')).toBe(false);
    expect(indices.startup.d.some((e) => e.i === 'crab-nebula')).toBe(false);
    expect(indices.startup.d.some((e) => e.i === 'vesta')).toBe(false);
    expect(indices.startup.d.some((e) => e.i === 'pha-99942')).toBe(false);

    expect(indices.core.c).toBeGreaterThan(0);
    expect(indices.stars.c).toBe(3); // sol, sirius, tau-ceti
    expect(indices.planets.c).toBe(4); // tau-ceti-e, tau-ceti-f, earth, moon
    expect(indices.structures.c).toBe(2); // crab-nebula, orion-nebula
    expect(indices.minorBodies.c).toBe(4); // vesta, pha-99942, voyager-1, halley

    const earth = indices.planets.d.find((e) => e.i === 'earth');
    expect(earth?.z).toBe(1);
    expect(earth?.r).toBe(1);

    const moon = indices.planets.d.find((e) => e.i === 'moon');
    expect(moon?.o).toBe('earth');

    const vesta = indices.minorBodies.d.find((e) => e.i === 'vesta');
    expect(vesta?.e).toBe('belt');

    const crab = indices.structures.d.find((e) => e.i === 'crab-nebula');
    expect(crab?.u).toBe('hazard');
  });

  it('matches referencedLayerIds against entry.i, toUrlSlug(entry.i), toUrlSlug(entry.n), and raw alias tokens before stripping', () => {
    const systems: SystemSummaryNode[] = [
      {
        id: 'gaia-2452378776434477184',
        name: 'Tau Ceti',
        properName: 'Tau Ceti',
        x: 3.156,
        y: 1.54,
        z: -1.003,
        dist: 3.652,
        mag: 3.5,
        absmag: 5.69,
        spect: 'G8V',
        starCount: 1,
        planetCount: 2,
        hasHabitableCandidate: true,
        sectorId: 'sector_+000_+000_-025',
      },
      {
        id: 'gaia-999999999999999999',
        name: 'Vega',
        properName: 'Vega',
        x: 2.3,
        y: -5.5,
        z: 4.8,
        dist: 7.68,
        mag: 0.03,
        absmag: 0.58,
        spect: 'A0Va',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+000_-025_+000',
      },
      {
        id: 'HYG_1234',
        name: 'Alias Matched Star',
        x: 10,
        y: 10,
        z: 10,
        dist: 17.32,
        mag: 5.5,
        absmag: 4.3,
        spect: 'G2V',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+000_+000_+000',
      },
    ];

    const starAliasesById = new Map<string, string[]>([
      ['gaia-2452378776434477184', ['Tau Ceti', 'HIP 8102', 'HD 10700']],
      ['gaia-999999999999999999', ['Vega', 'Alpha Lyrae', 'HIP 91262']],
      ['HYG_1234', ['custom-canon-alias', 'Another Alias']],
    ]);

    const indices = buildSearchIndices({
      systems,
      manifests: [],
      structures: [],
      solarBodies: [],
      starAliasesById,
      referencedLayerIds: new Set(['tau-ceti', 'alphalyrae', 'hyg-1234']),
    });

    // Matched via toUrlSlug(entry.n) === 'tau-ceti'
    expect(indices.startup.d.some((e) => e.i === 'gaia-2452378776434477184')).toBe(true);
    // Matched via raw alias token 'alphalyrae' before stripSearchAliases
    expect(indices.startup.d.some((e) => e.i === 'gaia-999999999999999999')).toBe(true);
    // Matched via toUrlSlug(entry.i) === 'hyg-1234'
    expect(indices.startup.d.some((e) => e.i === 'HYG_1234')).toBe(true);
    // Startup entries still strip raw aliases
    expect(indices.startup.d.every((e) => e.a === undefined)).toBe(true);
  });
});
