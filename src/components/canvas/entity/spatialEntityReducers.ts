import type * as THREE from 'three';
import { SOL_REFERENCE_TARGET } from '../../../config/referenceTargets';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import type {
  SpatialEntityDefinition,
  CelestialInteractionState,
} from '../../../types/spatial';

function isVector3Like(value: unknown): value is THREE.Vector3 {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { x?: unknown }).x === 'number' &&
    typeof (value as { y?: unknown }).y === 'number' &&
    typeof (value as { z?: unknown }).z === 'number'
  );
}

export function isSameSpatialPosition(
  a: SpatialEntityDefinition['position'] | undefined,
  b: SpatialEntityDefinition['position'] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ax = isVector3Like(a) ? a.x : Array.isArray(a) ? a[0] : undefined;
  const ay = isVector3Like(a) ? a.y : Array.isArray(a) ? a[1] : undefined;
  const az = isVector3Like(a) ? a.z : Array.isArray(a) ? a[2] : undefined;
  const bx = isVector3Like(b) ? b.x : Array.isArray(b) ? b[0] : undefined;
  const by = isVector3Like(b) ? b.y : Array.isArray(b) ? b[1] : undefined;
  const bz = isVector3Like(b) ? b.z : Array.isArray(b) ? b[2] : undefined;
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
      : isVector3Like(ep)
        ? ep.x !== 0 || ep.y !== 0 || ep.z !== 0
        : false);

  const np = entity.position;
  const newZero = Array.isArray(np)
    ? np[0] === 0 && np[1] === 0 && np[2] === 0
    : isVector3Like(np)
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
  let px = 0;
  let py = 0;
  let pz = 0;

  for (const id in entities) {
    const entity = entities[id];
    const p = entity.position;
    if (isVector3Like(p)) {
      px = p.x;
      py = p.y;
      pz = p.z;
    } else if (Array.isArray(p)) {
      px = p[0];
      py = p[1];
      pz = p[2];
    } else {
      continue;
    }
    const dx = px - center.x;
    const dy = py - center.y;
    const dz = pz - center.z;
    if (dx * dx + dy * dy + dz * dz <= radiusSq) {
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

export function indexEntitySlugs(
  currentIndex: Record<string, string>,
  entity: SpatialEntityDefinition,
  existing?: SpatialEntityDefinition,
): Record<string, string> {
  const idSlug = toUrlSlug(entity.id);
  const nameSlug = entity.name ? toUrlSlug(entity.name) : undefined;
  const oldNameSlug = existing?.name ? toUrlSlug(existing.name) : undefined;

  let next: Record<string, string> | null = null;

  if (oldNameSlug && oldNameSlug !== nameSlug && currentIndex[oldNameSlug] === entity.id) {
    next = { ...currentIndex };
    delete next[oldNameSlug];
  }

  const base = next ?? currentIndex;
  const needsIdSlug = Boolean(idSlug && base[idSlug] !== entity.id);

  const currentOwnerOfNameSlug = nameSlug ? base[nameSlug] : undefined;
  const nameSlugClaimedById = currentOwnerOfNameSlug
    ? toUrlSlug(currentOwnerOfNameSlug) === nameSlug
    : false;
  const canSetOrKeepNameSlug = Boolean(
    nameSlug &&
      (!currentOwnerOfNameSlug ||
        currentOwnerOfNameSlug === entity.id ||
        !nameSlugClaimedById),
  );
  const needsNameSlug = Boolean(canSetOrKeepNameSlug && nameSlug && base[nameSlug] !== entity.id);

  if (needsIdSlug || needsNameSlug) {
    if (!next) next = { ...currentIndex };
    if (needsIdSlug && idSlug) {
      next[idSlug] = entity.id;
    }
    if (needsNameSlug && nameSlug) {
      next[nameSlug] = entity.id;
    }
  }

  return next ?? currentIndex;
}

export function removeEntityFromSlugIndex(
  currentIndex: Record<string, string>,
  id: string,
  existing?: SpatialEntityDefinition,
): Record<string, string> {
  const idSlug = toUrlSlug(id);
  const nameSlug = existing?.name ? toUrlSlug(existing.name) : undefined;
  let next: Record<string, string> | null = null;

  if (idSlug && currentIndex[idSlug] === id) {
    next = { ...currentIndex };
    delete next[idSlug];
  }
  if (nameSlug && (next ?? currentIndex)[nameSlug] === id) {
    if (!next) next = { ...currentIndex };
    delete next[nameSlug];
  }
  const target = next ?? currentIndex;
  for (const slug in target) {
    if (target[slug] === id) {
      if (!next) next = { ...currentIndex };
      delete next[slug];
    }
  }

  return next ?? currentIndex;
}

export function resolveEntityIdFromState(
  entities: Record<string, SpatialEntityDefinition>,
  entityIdBySlug: Record<string, string>,
  idOrSlug: string,
): string | null {
  if (!idOrSlug) return null;
  if (entities[idOrSlug]) {
    return idOrSlug;
  }
  const slug = toUrlSlug(idOrSlug);
  if (slug) {
    const targetId = entityIdBySlug[slug];
    if (targetId && entities[targetId]) {
      return targetId;
    }
  }
  return null;
}
