import type { SpatialEntityStore } from './SpatialEntityStore';
import { celestialOcclusionManager } from '../../../canvas/cartography/celestialOcclusionRegistry';

/** Resolves the next entity in an overlapping screen-space cluster (identity when isolated). */
export type CyclicTargetResolver = (id: string) => string;

const identity: CyclicTargetResolver = (id) => id;

/** Cyclic resolver backed by the screen-space occlusion registry. */
export const occlusionCyclicTargetResolver: CyclicTargetResolver = (id) =>
  celestialOcclusionManager.getCyclicSelectionTarget(id);

/**
 * Single-click activation (§2.2).
 * Focuses the entity (cyan reticle, cyan datum footprint, drop stalk).
 * Re-clicking an already-focused entity deselects to null, or cycles to next overlapping entity.
 */
export function activateEntity(
  store: SpatialEntityStore,
  id: string,
  resolveCyclicTarget: CyclicTargetResolver = identity,
): void {
  const { focusedId, selectedId, setFocused, setSelected } = store.getState();
  if (focusedId === id || selectedId === id) {
    const next = resolveCyclicTarget(id);
    if (next === id || next === null) {
      setFocused(null);
      setSelected(null);
    } else {
      setFocused(next);
      setSelected(next);
    }
  } else {
    setFocused(id);
    setSelected(id);
  }
}

/**
 * Focuses an entity (idempotent; sets both focus and selection).
 */
export function focusEntity(store: SpatialEntityStore, id: string): void {
  const { setSelected, setFocused } = store.getState();
  setSelected(id);
  setFocused(id);
}

/** Clears selection, focus, and hover (pointer missed / empty-space click). */
export function clearInteraction(store: SpatialEntityStore): void {
  const { setSelected, setFocused, setHovered } = store.getState();
  setSelected(null);
  setFocused(null);
  setHovered(null);
}

