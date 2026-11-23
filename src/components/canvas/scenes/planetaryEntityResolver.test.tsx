import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  clearDetailsRepositoryCache,
  seedDetailRecord,
} from '../../../data/detailsRepository';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import {
  resolvePlanetaryEntitiesAndTarget,
  resolveTargetCoordsFromEntities,
} from './planetaryEntityResolver';

describe('planetaryEntityResolver', () => {
  beforeEach(() => {
    clearDetailsRepositoryCache();
  });

  afterEach(() => {
    clearDetailsRepositoryCache();
  });

  it('resolves target coordinates from explicit coordinates, matched entity ID/slug/name, or origin fallback', () => {
    const entities = [
      {
        id: 'saturn',
        name: 'Saturn',
        position: [0, 0, 0] as [number, number, number],
      },
      {
        id: 'titan-moon',
        name: 'Titan Moon',
        position: new THREE.Vector3(3, 4, 5),
      },
    ];

    expect(resolveTargetCoordsFromEntities(entities, 'titan-moon', [9, 8, 7])).toEqual([9, 8, 7]);
    expect(resolveTargetCoordsFromEntities(entities, 'titan-moon', { x: 1, y: 2, z: 3 })).toEqual([
      1, 2, 3,
    ]);
    expect(resolveTargetCoordsFromEntities(entities, 'titan-moon')).toEqual([3, 4, 5]);
    expect(resolveTargetCoordsFromEntities(entities, 'Titan Moon')).toEqual([3, 4, 5]);
    expect(resolveTargetCoordsFromEntities(entities, 'unknown')).toEqual([0, 0, 0]);
  });

  it('derives resolvedClassification in order: explicit -> planet.composition -> matchedSystemPlanet.composition -> corpusReticleClassification -> terrestrial', () => {
    const explicitResult = resolvePlanetaryEntitiesAndTarget({
      planetId: 'saturn',
      classification: 'ice-giant',
      planet: {
        id: 'saturn',
        name: 'Saturn',
        letter: 'f',
        composition: 'gas-giant',
      },
      corpusReticleClassification: 'super-earth',
    });
    expect(explicitResult.resolvedClassification).toBe('ice-giant');
    expect(explicitResult.allEntities[0]?.classification).toBe('ice-giant');

    const planetRecordResult = resolvePlanetaryEntitiesAndTarget({
      planetId: 'saturn',
      planet: {
        id: 'saturn',
        name: 'Saturn',
        letter: 'f',
        composition: 'gas-giant',
      },
      corpusReticleClassification: 'terrestrial',
    });
    expect(planetRecordResult.resolvedClassification).toBe('gas-giant');
    expect(planetRecordResult.allEntities[0]?.classification).toBe('gas-giant');

    const detailRecordResult = resolvePlanetaryEntitiesAndTarget({
      planetId: 'jupiter',
      corpusReticleClassification: 'terrestrial',
      hostSystemDetail: {
        kind: 'system',
        record: {
          id: 'sol',
          name: 'Sol',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          sectorId: 'sector_0_0_0',
          stars: [],
          planets: [
            {
              id: 'jupiter',
              name: 'Jupiter',
              letter: 'e',
              composition: 'gas-giant',
            },
          ],
        },
      },
    });
    expect(detailRecordResult.resolvedClassification).toBe('gas-giant');
    expect(detailRecordResult.allEntities[0]?.classification).toBe('gas-giant');

    const corpusFallbackResult = resolvePlanetaryEntitiesAndTarget({
      planetId: 'neptune',
      corpusReticleClassification: 'ice-giant',
    });
    expect(corpusFallbackResult.resolvedClassification).toBe('ice-giant');

    const defaultFallbackResult = resolvePlanetaryEntitiesAndTarget({
      planetId: 'unknown-world',
    });
    expect(defaultFallbackResult.resolvedClassification).toBe('terrestrial');
  });

  it('resolves satellites from cached Sol system detail when hostSystemDetail is absent', () => {
    seedDetailRecord(SOL_REFERENCE_TARGET.id, {
      kind: 'system',
      record: {
        id: SOL_REFERENCE_TARGET.id,
        name: 'Sol',
        x: 0,
        y: 0,
        z: 0,
        dist: 0,
        sectorId: 'sector_0_0_0',
        stars: [],
        planets: [
          {
            id: 'uranus',
            name: 'Uranus',
            letter: 'g',
            composition: 'ice-giant',
            satellites: [
              {
                id: 'titania',
                name: 'Titania',
                parentId: 'uranus',
                composition: 'terrestrial',
                orbit: {
                  semiMajorAxis: 17.0,
                  eccentricity: 0.0011,
                  inclination: 0.34,
                  ascendingNode: 99,
                  argumentOfPeriapsis: 284,
                  meanAnomaly: 24,
                  periodDays: 8.706,
                },
              },
            ],
          },
        ],
      },
    });

    const result = resolvePlanetaryEntitiesAndTarget({
      planetId: 'uranus',
      centerId: 'titania',
    });

    expect(result.resolvedClassification).toBe('ice-giant');
    expect(result.allEntities.map((e) => e.id)).toEqual(['uranus', 'titania']);
    expect(result.targetCoords).not.toEqual([0, 0, 0]);
  });

  it('does not duplicate central planet entity when explicitSatellites already includes planetId', () => {
    const result = resolvePlanetaryEntitiesAndTarget({
      planetId: 'saturn',
      explicitSatellites: [
        {
          id: 'saturn',
          name: 'Saturn',
          classification: 'gas-giant',
          position: [0, 0, 0],
        },
        {
          id: 'enceladus',
          name: 'Enceladus',
          classification: 'terrestrial',
          position: [4, 0, 0],
        },
      ],
    });

    expect(result.allEntities).toHaveLength(2);
    expect(result.allEntities[0]?.id).toBe('saturn');
  });
});
