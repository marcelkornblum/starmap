import * as THREE from 'three';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from '../../../types/spatial';

export function isSameSpatialPosition(
  a: SpatialEntityDefinition['position'] | undefined,
  b: SpatialEntityDefinition['position'] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ax = a instanceof THREE.Vector3 ? a.x : Array.isArray(a) ? a[0] : undefined;
  const ay = a instanceof THREE.Vector3 ? a.y : Array.isArray(a) ? a[1] : undefined;
  const az = a instanceof THREE.Vector3 ? a.z : Array.isArray(a) ? a[2] : undefined;
  const bx = b instanceof THREE.Vector3 ? b.x : Array.isArray(b) ? b[0] : undefined;
  const by = b instanceof THREE.Vector3 ? b.y : Array.isArray(b) ? b[1] : undefined;
  const bz = b instanceof THREE.Vector3 ? b.z : Array.isArray(b) ? b[2] : undefined;
  return ax === bx && ay === by && az === bz;
}

export function isEntityRegistrationIdentical(
  existing: SpatialEntityDefinition | undefined,
  entity: SpatialEntityDefinition,
): boolean {
  if (!existing) return false;
  return (
    existing.name === entity.name &&
    existing.classification === entity.classification &&
    existing.spectralType === entity.spectralType &&
    existing.multiplicity === entity.multiplicity &&
    existing.planets === entity.planets &&
    isSameSpatialPosition(existing.position, entity.position)
  );
}

export function mergeRegisteredEntity(
  existing: SpatialEntityDefinition | undefined,
  entity: SpatialEntityDefinition,
): SpatialEntityDefinition {
  if (!existing) return entity;

  const ep = existing.position;
  const existingNonZero =
    entity.id !== SOL_REFERENCE_TARGET.id &&
    (Array.isArray(ep)
      ? ep[0] !== 0 || ep[1] !== 0 || ep[2] !== 0
      : ep instanceof THREE.Vector3
        ? ep.x !== 0 || ep.y !== 0 || ep.z !== 0
        : false);

  const np = entity.position;
  const newZero = Array.isArray(np)
    ? np[0] === 0 && np[1] === 0 && np[2] === 0
    : np instanceof THREE.Vector3
      ? np.x === 0 && np.y === 0 && np.z === 0
      : true;

  const preserveRichStarAttrs =
    existing.multiplicity !== undefined ||
    existing.planets !== undefined ||
    (entity.classification === 'stellar-system' &&
      existing.classification !== undefined &&
      existing.classification !== 'stellar-system');

  if ((existingNonZero && newZero) || preserveRichStarAttrs) {
    return {
      ...entity,
      position: existingNonZero && newZero ? existing.position : entity.position,
      classification:
        entity.classification === 'stellar-system' && existing.classification
          ? existing.classification
          : entity.classification,
      spectralType: entity.spectralType ?? existing.spectralType,
      multiplicity: entity.multiplicity ?? existing.multiplicity,
      planets: entity.planets ?? existing.planets,
    };
  }

  return entity;
}

export function isEntityUpdateUnchanged(
  existing: SpatialEntityDefinition,
  updates: Partial<SpatialEntityDefinition>,
): boolean {
  return (
    (updates.name === undefined || updates.name === existing.name) &&
    (updates.classification === undefined || updates.classification === existing.classification) &&
    (updates.spectralType === undefined || updates.spectralType === existing.spectralType) &&
    (updates.multiplicity === undefined || updates.multiplicity === existing.multiplicity) &&
    (updates.planets === undefined || updates.planets === existing.planets) &&
    (updates.parentBodyId === undefined || updates.parentBodyId === existing.parentBodyId) &&
    (updates.position === undefined || isSameSpatialPosition(existing.position, updates.position)) &&
    (updates.velocity === undefined || isSameSpatialPosition(existing.velocity, updates.velocity)) &&
    (updates.orbit === undefined || updates.orbit === existing.orbit) &&
    (updates.bodyRadius === undefined || updates.bodyRadius === existing.bodyRadius)
  );
}

export function areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function findEntitiesInAperture(
  entities: Record<string, SpatialEntityDefinition>,
  center: THREE.Vector3,
  radius: number,
): SpatialEntityDefinition[] {
  const radiusSq = radius * radius;
  const matches: SpatialEntityDefinition[] = [];
  const scratchVec = new THREE.Vector3();

  for (const id in entities) {
    const entity = entities[id];
    const p = entity.position;
    if (p instanceof THREE.Vector3) {
      scratchVec.copy(p);
    } else if (Array.isArray(p)) {
      scratchVec.set(p[0], p[1], p[2]);
    }
    if (scratchVec.distanceToSquared(center) <= radiusSq) {
      matches.push(entity);
    }
  }

  return matches;
}

export function findEntitiesByState(
  entities: Record<string, SpatialEntityDefinition>,
  targetState: CelestialInteractionState,
  focusedId: string | null,
  getState: (id: string) => CelestialInteractionState,
): SpatialEntityDefinition[] {
  const matches: SpatialEntityDefinition[] = [];
  if (targetState === 'focused' && focusedId && entities[focusedId]) {
    matches.push(entities[focusedId]);
  }
  for (const id in entities) {
    if (targetState === 'focused' && id === focusedId) {
      continue;
    }
    if (getState(id) === targetState) {
      matches.push(entities[id]);
    }
  }
  return matches;
}

export function resolveInitialEntitySelection(initial?: {
  selectedId?: string | null;
  selectedIds?: Iterable<string>;
  focusedId?: string | null;
  focusedIds?: Iterable<string>;
}): {
  initialSelectedId: string | null;
  initialSelectedSet: Set<string>;
  initialFocusedId: string | null;
  initialFocusedSet: Set<string>;
} {
  const initialSelectedSet = new Set<string>(
    initial?.selectedIds ?? (initial?.selectedId ? [initial.selectedId] : []),
  );
  const initialSelectedId =
    initial?.selectedId !== undefined
      ? initial.selectedId
      : (initialSelectedSet.values().next().value ?? null);

  const initialFocusedSet = new Set<string>(
    initial?.focusedIds ?? (initial?.focusedId ? [initial.focusedId] : []),
  );
  const initialFocusedId =
    initial?.focusedId !== undefined
      ? initial.focusedId
      : (initialFocusedSet.values().next().value ?? null);

  return {
    initialSelectedId,
    initialSelectedSet,
    initialFocusedId,
    initialFocusedSet,
  };
}
