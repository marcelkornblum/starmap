import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import type {
  SpatialEntityDefinition,
  PlanetCensusEntry,
  CelestialInteractionState,
} from '../../../types/spatial';
import {
  isSameSpatialPosition,
  mergeRegisteredEntity,
  isEntityRegistrationIdentical,
  isEntityUpdateUnchanged,
  areSetsEqual,
  findEntitiesInAperture,
  findEntitiesByState,
  resolveInitialEntitySelection,
} from './spatialEntityReducers';

describe('spatialEntityReducers', () => {
  describe('isSameSpatialPosition', () => {
    it('compares identical vector references', () => {
      const v = new THREE.Vector3(1, 2, 3);
      expect(isSameSpatialPosition(v, v)).toBe(true);
    });

    it('returns false when one or both positions are undefined', () => {
      expect(isSameSpatialPosition(undefined, [1, 2, 3])).toBe(false);
      expect(isSameSpatialPosition([1, 2, 3], undefined)).toBe(false);
    });

    it('compares Vector3 and array representations', () => {
      const v = new THREE.Vector3(1, 2, 3);
      expect(isSameSpatialPosition(v, [1, 2, 3])).toBe(true);
      expect(isSameSpatialPosition([1, 2, 3], v)).toBe(true);
      expect(isSameSpatialPosition([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isSameSpatialPosition([1, 2, 3], [1, 2, 4])).toBe(false);
    });
  });

  describe('mergeRegisteredEntity', () => {
    it('returns the new entity when no existing entity is present', () => {
      const entity: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Alpha Centauri',
        position: [10, 20, 30],
      };
      expect(mergeRegisteredEntity(undefined, entity)).toEqual(entity);
    });

    it('preserves existing non-zero position when new entity has [0,0,0] for non-sol entities', () => {
      const existing: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Alpha Centauri',
        position: [10, 20, 30],
      };
      const entity: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Alpha Centauri',
        position: [0, 0, 0],
      };
      const merged = mergeRegisteredEntity(existing, entity);
      expect(merged.position).toEqual([10, 20, 30]);
    });

    it('does NOT override zero position for SOL_REFERENCE_TARGET', () => {
      const existing: SpatialEntityDefinition = {
        id: SOL_REFERENCE_TARGET.id,
        name: 'Sun',
        position: [0.001, 0, 0],
      };
      const entity: SpatialEntityDefinition = {
        id: SOL_REFERENCE_TARGET.id,
        name: 'Sun',
        position: [0, 0, 0],
      };
      const merged = mergeRegisteredEntity(existing, entity);
      expect(merged.position).toEqual([0, 0, 0]);
    });

    it('preserves rich star attributes like multiplicity and planets', () => {
      const mockPlanets: PlanetCensusEntry[] = [
        { id: 'kepler-11-b', name: 'Kepler-11 b', classification: 'terrestrial' },
      ];
      const existing: SpatialEntityDefinition = {
        id: 'star-2',
        name: 'Kepler-11',
        position: [50, 0, 0],
        multiplicity: 1,
        planets: mockPlanets,
        classification: 'star',
      };
      const entity: SpatialEntityDefinition = {
        id: 'star-2',
        name: 'Kepler-11',
        position: [50, 0, 0],
        classification: 'stellar-system',
      };
      const merged = mergeRegisteredEntity(existing, entity);
      expect(merged.classification).toBe('star');
      expect(merged.multiplicity).toBe(1);
      expect(merged.planets).toEqual(mockPlanets);
    });
  });

  describe('isEntityRegistrationIdentical', () => {
    it('returns true when core properties and position match', () => {
      const a: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Vega',
        classification: 'star',
        spectralType: 'A0V',
        multiplicity: 1,
        planets: undefined,
        position: [1, 2, 3],
      };
      const b: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Vega',
        classification: 'star',
        spectralType: 'A0V',
        multiplicity: 1,
        planets: undefined,
        position: new THREE.Vector3(1, 2, 3),
      };
      expect(isEntityRegistrationIdentical(a, b)).toBe(true);
    });

    it('returns false when existing is undefined or properties differ', () => {
      const a: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Vega',
        position: [1, 2, 3],
      };
      expect(isEntityRegistrationIdentical(undefined, a)).toBe(false);
      expect(isEntityRegistrationIdentical(a, { ...a, name: 'Altair' })).toBe(false);
    });
  });

  describe('isEntityUpdateUnchanged', () => {
    it('returns true when partial updates contain identical values', () => {
      const existing: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Rigel',
        classification: 'star',
        position: [10, 20, 30],
      };
      expect(isEntityUpdateUnchanged(existing, { name: 'Rigel' })).toBe(true);
      expect(isEntityUpdateUnchanged(existing, { position: [10, 20, 30] })).toBe(true);
    });

    it('returns false when any property changes', () => {
      const existing: SpatialEntityDefinition = {
        id: 'star-1',
        name: 'Rigel',
        classification: 'star',
        position: [10, 20, 30],
      };
      expect(isEntityUpdateUnchanged(existing, { name: 'Betelgeuse' })).toBe(false);
      expect(isEntityUpdateUnchanged(existing, { position: [10, 20, 31] })).toBe(false);
    });
  });

  describe('areSetsEqual', () => {
    it('accurately compares set contents', () => {
      expect(areSetsEqual(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
      expect(areSetsEqual(new Set(['a']), new Set(['a', 'b']))).toBe(false);
      expect(areSetsEqual(new Set(['a', 'c']), new Set(['a', 'b']))).toBe(false);
    });
  });

  describe('findEntitiesInAperture & findEntitiesByState', () => {
    const entities: Record<string, SpatialEntityDefinition> = {
      'star-1': { id: 'star-1', name: 'Near', position: [1, 0, 0] },
      'star-2': { id: 'star-2', name: 'Far', position: [100, 0, 0] },
    };

    it('finds entities within radius', () => {
      const res = findEntitiesInAperture(entities, new THREE.Vector3(0, 0, 0), 10);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('star-1');
    });

    it('skips entities with missing or invalid positions without leaking prior coordinates', () => {
      const mixed: Record<string, SpatialEntityDefinition> = {
        'star-1': { id: 'star-1', name: 'Near', position: [1, 0, 0] },
        'star-invalid': {
          id: 'star-invalid',
          name: 'Invalid',
          position: undefined as unknown as [number, number, number],
        },
        'star-2': { id: 'star-2', name: 'Far', position: [100, 0, 0] },
      };
      const res = findEntitiesInAperture(mixed, new THREE.Vector3(0, 0, 0), 10);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('star-1');
    });

    it('finds entities by state and prioritizes focusedId', () => {
      const getState = (id: string): CelestialInteractionState =>
        id === 'star-1' ? 'focused' : 'active';
      const focused = findEntitiesByState(entities, 'focused', 'star-1', getState);
      expect(focused).toHaveLength(1);
      expect(focused[0].id).toBe('star-1');

      const active = findEntitiesByState(entities, 'active', 'star-1', getState);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('star-2');
    });
  });

  describe('resolveInitialEntitySelection', () => {
    it('resolves selection and focus fallbacks properly', () => {
      const res = resolveInitialEntitySelection({
        selectedIds: ['s1', 's2'],
        focusedId: 'f1',
      });
      expect(res.initialSelectedId).toBe('s1');
      expect(res.initialSelectedSet.has('s2')).toBe(true);
      expect(res.initialFocusedId).toBe('f1');
      expect(res.initialFocusedSet.has('f1')).toBe(true);
    });
  });
});
