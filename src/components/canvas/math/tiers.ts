export type InteractionTier = 'passive' | 'active' | 'selected' | 'focused';

export interface InteractionState {
  hoveredId?: string | null;
  selectedId?: string | null;
  focusedId?: string | null;
  apertureIds: Set<string> | ReadonlyArray<string>;
}

/**
 * Pure interaction state machine deriving tier for any given entity.
 * Priority:
 * 1. 'focused'   - if entity is focusedId
 * 2. 'selected'  - if entity is selectedId OR hoveredId (hover maps to selected tier per §2.4)
 * 3. 'active'    - if entity is within aperture radius
 * 4. 'passive'   - default background starfield
 */
export function deriveEntityTier(id: string, state: InteractionState): InteractionTier {
  if (id === state.focusedId) {
    return 'focused';
  }
  if (id === state.selectedId || id === state.hoveredId) {
    return 'selected';
  }
  const isInAperture = state.apertureIds instanceof Set
    ? state.apertureIds.has(id)
    : state.apertureIds.includes(id);

  if (isInAperture) {
    return 'active';
  }
  return 'passive';
}

/**
 * Stalks render strictly for 'selected' and 'focused' tiers (§2.4).
 */
export function isStalkVisible(tier: InteractionTier): boolean {
  return tier === 'selected' || tier === 'focused';
}

/**
 * Datum footprints exist if and only if the stalk exists (§2.4).
 */
export function isFootprintVisible(tier: InteractionTier): boolean {
  return isStalkVisible(tier);
}

/**
 * A selected or focused entity forces its orbit to render regardless of whether
 * the orbit layer is toggled off (§4.4).
 */
export function isOrbitForceRendered(tier: InteractionTier): boolean {
  return tier === 'selected' || tier === 'focused';
}
