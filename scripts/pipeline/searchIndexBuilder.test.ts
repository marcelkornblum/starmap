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
      ],
      referencedLayerIds: new Set(['tau-ceti']),
    });

    expect(indices.startup.v).toBe(1);
    expect(indices.startup.c).toBeGreaterThan(0);
    expect(indices.startup.d.every((e) => e.a === undefined)).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'earth')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'moon' && e.o === 'earth')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'crab-nebula')).toBe(true);
    expect(indices.startup.d.some((e) => e.i === 'voyager-1')).toBe(true);
    // Bulk minor bodies (without o / not construct / not layer-referenced) are excluded from startup
    expect(indices.startup.d.some((e) => e.i === 'vesta')).toBe(false);
    expect(indices.startup.d.some((e) => e.i === 'pha-99942')).toBe(false);

    expect(indices.core.c).toBeGreaterThan(0);
    expect(indices.stars.c).toBe(1);
    expect(indices.planets.c).toBe(4); // tau-ceti-e, tau-ceti-f, earth, moon
    expect(indices.structures.c).toBe(1);
    expect(indices.minorBodies.c).toBe(3); // vesta, pha-99942, voyager-1

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
});
