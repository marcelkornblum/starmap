/**
 * Celestial Occlusion & Collision Registry
 *
 * Implements 2D screen-space collision detection between celestial labels and stars/reticles.
 *
 * Authoritative Rule:
 * "Labels should never occlude stars or reticles. If they intersect, the label should disappear
 * unless it is for a selected or focused element, in which case it should appear behind the
 * reticle and star, overlapping."
 */

export interface Box2D {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CelestialFootprint {
  id: string;
  state: 'passive' | 'active' | 'selected' | 'focused';
  worldPos?: [number, number, number];
  classification?: string;
  reticleSize?: number;
  hasStalk?: boolean;
  multiplicity?: number;
  planets?: Array<{ id: string; name: string; classification: 'terrestrial' | 'gas-giant' | 'ice-giant' }>;
  screenX: number;
  screenY: number;
  reticleRadius: number;
  starRadius: number;
  hasReticle: boolean;
  labelBox?: Box2D;
  visible: boolean;
  updatedAt: number;
}

/**
 * Checks if a 2D axis-aligned bounding box intersects an L1 diamond reticle (|x - cx| + |y - cy| <= radius).
 */
export function diamondIntersectsAABB(
  cx: number,
  cy: number,
  radius: number,
  box: Box2D,
): boolean {
  if (radius <= 0) return false;
  const dx = Math.max(0, box.left - cx, cx - box.right);
  const dy = Math.max(0, box.top - cy, cy - box.bottom);
  return (dx + dy) <= radius;
}

/**
 * Checks if a 2D axis-aligned bounding box intersects a circular region (e.g. star dot).
 */
export function circleIntersectsAABB(
  cx: number,
  cy: number,
  radius: number,
  box: Box2D,
): boolean {
  if (radius <= 0) return false;
  const closestX = Math.max(box.left, Math.min(cx, box.right));
  const closestY = Math.max(box.top, Math.min(cy, box.bottom));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (radius * radius);
}

/**
 * Checks if a label box intersects a target celestial footprint.
 * Occlusion rules are strictly based on the reticle bounds (not the star bounds).
 */
export function boxIntersectsFootprint(box: Box2D, footprint: CelestialFootprint): boolean {
  if (!footprint.visible) return false;

  // Authoritative occlusion: based strictly on reticle diamond bounds
  if (footprint.hasReticle && diamondIntersectsAABB(footprint.screenX, footprint.screenY, footprint.reticleRadius, box)) {
    return true;
  }

  return false;
}

export class CelestialOcclusionManager {
  private footprints = new Map<string, CelestialFootprint>();

  /**
   * Register or update a celestial node's screen-space footprint.
   */
  public register(footprint: CelestialFootprint): void {
    this.footprints.set(footprint.id, footprint);
  }

  /**
   * Unregister a celestial node when unmounted or hidden.
   */
  public unregister(id: string): void {
    this.footprints.delete(id);
  }

  /**
   * Clear all registered footprints (useful for test resets).
   */
  public clear(): void {
    this.footprints.clear();
  }

  /**
   * Check if a given label box intersects with ANY active star or reticle in the registry.
   * If includeSelf is true, checks against the source node itself as well.
   */
  public checkIntersection(
    sourceId: string,
    labelBox: Box2D,
    options?: { checkSelf?: boolean },
  ): { hasIntersection: boolean; collidingNodeId?: string } {
    const checkSelf = options?.checkSelf ?? true;

    for (const [id, footprint] of this.footprints.entries()) {
      if (!checkSelf && id === sourceId) {
        continue;
      }

      if (boxIntersectsFootprint(labelBox, footprint)) {
        return { hasIntersection: true, collidingNodeId: id };
      }
    }

    return { hasIntersection: false };
  }

  /**
   * Evaluate label visibility based on interaction state and intersection status.
   * - If an intersection is detected:
   *   - Selected or focused nodes remain visible (rendered behind reticle and star).
   *   - Unselected/ambient nodes disappear.
   * - If no intersection: visible.
   */
  public evaluateLabelVisibility(
    state: 'passive' | 'active' | 'selected' | 'focused',
    hasIntersection: boolean,
  ): { visible: boolean; behindCanvas: boolean } {
    const isSelectedOrFocused = state === 'selected' || state === 'focused';

    if (hasIntersection) {
      if (isSelectedOrFocused) {
        // Selected or focused: appears behind reticle and star, overlapping
        return { visible: true, behindCanvas: true };
      }
      // Unselected/ambient: disappears
      return { visible: false, behindCanvas: true };
    }

    return { visible: true, behindCanvas: true };
  }

  /**
   * Diagnostic helper: get count of registered footprints.
   */
  public get size(): number {
    return this.footprints.size;
  }

  /**
   * Returns all registered footprints that have an active drop stalk.
   */
  public getStalkedFootprints(): CelestialFootprint[] {
    const stalked: CelestialFootprint[] = [];
    for (const fp of this.footprints.values()) {
      if (fp.hasStalk && fp.worldPos) {
        stalked.push(fp);
      }
    }
    return stalked;
  }
}

export const celestialOcclusionManager = new CelestialOcclusionManager();
