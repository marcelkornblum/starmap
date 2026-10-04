/**
 * Celestial Occlusion & Collision Registry
 *
 * Implements 2D screen-space collision detection, clustering, and occlusion rules
 * across the decoupled celestial visualization layers as defined in 3d-spatial-architecture.md:
 *
 * [ Layer 1: Physical System Node ]  ──► True coordinates; neither clusters nor occludes.
 * [ Layer 2: Geometric Reticle    ]  ──► True coordinates; overlays directly; priority-masked.
 * [ Layer 3: Typographic Label    ]  ──► Screen-space displacement; camera-proximity occlusion.
 *
 * Priority Occlusion Masking:
 * - Equal-priority reticles (e.g. ambient contacts) overlay directly without suppression.
 * - Significant reticles (an active focused target or selected node) establish an attentional
 *   priority mask, cleanly occluding/suppressing lesser background reticles colliding directly beneath them.
 *
 * Interactive Hit-Testing Fan-Out:
 * - While the visual geometry never displaces, the underlying interactive hit-testing areas
 *   invisibly fan out (or utilize cyclic selection) so users can effortlessly click and select
 *   overlapping systems without the graphics moving.
 *
 * Typographic Labels:
 * - Screen-space displacement along thin 1px leader stems up to a defined collision radius.
 * - Camera-proximity occlusion beyond displacement threshold (closer systems retain labels, background yields).
 * - Target immunity: active focused/selected target labels never yield to ambient systems.
 * - Authoritative rule: labels never occlude stars or reticles. If intersecting, unselected disappear;
 *   selected/focused appear behind.
 */

export interface Box2D {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LabelOcclusionResult {
  visible: boolean;
  behindCanvas: boolean;
  displacementX: number;
  displacementY: number;
  isDisplaced: boolean;
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
  camDist?: number; // Euclidean distance to camera for camera-proximity occlusion
  reticleRadius: number;
  starRadius: number;
  hasReticle: boolean;
  labelBox?: Box2D;
  visible: boolean;
  updatedAt: number;
}

/**
 * Checks if two 2D axis-aligned bounding boxes intersect.
 */
export function boxesIntersect(a: Box2D, b: Box2D): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
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
 * Checks if two L1 diamond reticles intersect in 2D screen space.
 */
export function diamondsIntersect(
  c1x: number,
  c1y: number,
  r1: number,
  c2x: number,
  c2y: number,
  r2: number,
): boolean {
  const dx = Math.abs(c1x - c2x);
  const dy = Math.abs(c1y - c2y);
  return (dx + dy) <= (r1 + r2);
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

  // Scratch memory for zero-allocation candidate displacement checks
  private scratchCandidateBox: Box2D = { left: 0, top: 0, right: 0, bottom: 0 };
  private scratchLabelResult: LabelOcclusionResult = {
    visible: true,
    behindCanvas: true,
    displacementX: 0,
    displacementY: 0,
    isDisplaced: false,
  };
  private scratchHitOffset: { x: number; y: number } = { x: 0, y: 0 };

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
   * Priority Occlusion Masking for Geometric Reticles (Spec 2.2):
   * - Equal-priority reticles (e.g. ambient contacts) overlay directly without suppression.
   * - Significant reticles (an active focused target or selected node) establish an attentional priority mask,
   *   cleanly occluding/suppressing lesser background reticles colliding directly beneath them.
   */
  public evaluateReticleOcclusion(nodeId: string): boolean {
    const target = this.footprints.get(nodeId);
    if (!target || !target.visible || !target.hasReticle) return false;

    // Significant reticles command priority; they are never suppressed
    if (target.state === 'selected' || target.state === 'focused') {
      return false;
    }

    // Check if colliding beneath any significant reticle in foreground or same depth
    for (const [id, other] of this.footprints.entries()) {
      if (id === nodeId || !other.visible || !other.hasReticle) continue;

      if (other.state === 'selected' || other.state === 'focused') {
        const dx = Math.abs(target.screenX - other.screenX);
        const dy = Math.abs(target.screenY - other.screenY);
        // Colliding within significant reticle's diamond bounds
        if ((dx + dy) <= (target.reticleRadius + other.reticleRadius) * 0.75 && (target.camDist ?? 0) >= (other.camDist ?? 0)) {
          return true; // Suppressed by significant priority mask
        }
      }
    }

    return false;
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
   * Preserved for backward compatibility with existing tests.
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
   * Comprehensive Label Occlusion, Displacement & Proximity Culling (Spec 2.3):
   * 1. Screen-space displacement: tests candidate displacements along thin 1px leader stems up to collision radius.
   * 2. Camera-proximity occlusion: beyond displacement threshold, closer systems retain labels; background yields to 0% opacity.
   * 3. Target immunity: active focused/selected target labels never yield to ambient systems.
   * 4. Authoritative rule: labels never occlude reticles.
   */
  public evaluateLabelOcclusion(
    nodeId: string,
    labelBox?: Box2D,
    outResult?: LabelOcclusionResult,
  ): LabelOcclusionResult {
    const result = outResult ?? this.scratchLabelResult;
    result.visible = true;
    result.behindCanvas = true;
    result.displacementX = 0;
    result.displacementY = 0;
    result.isDisplaced = false;

    if (!labelBox) {
      result.visible = false;
      return result;
    }

    const target = this.footprints.get(nodeId);
    if (!target || !target.visible || target.state === 'passive') {
      result.visible = false;
      return result;
    }

    // Significant nodes (focused or selected) have Target Immunity
    if (target.state === 'selected' || target.state === 'focused') {
      result.visible = true;
      result.behindCanvas = true;
      return result;
    }

    // Candidate displacements (Spec 2.3: Screen-Space Displacement along thin 1px leader stems)
    const r = target.reticleRadius;
    const candidates = [
      { dx: 0, dy: 0 },
      { dx: 0, dy: r * 1.4 },       // Downward displacement
      { dx: r * 1.25, dy: 0 },      // Outward right displacement along leader stem
      { dx: 0, dy: -r * 1.4 },      // Upward displacement
    ];

    const cBox = this.scratchCandidateBox;

    for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
      const cand = candidates[cIdx];
      cBox.left = labelBox.left + cand.dx;
      cBox.top = labelBox.top + cand.dy;
      cBox.right = labelBox.right + cand.dx;
      cBox.bottom = labelBox.bottom + cand.dy;

      let collidesWithReticle = false;
      let collidesWithHigherPriorityLabel = false;

      // 1. Authoritative Rule: labels should never occlude stars or reticles
      for (const other of this.footprints.values()) {
        if (!other.visible || !other.hasReticle) continue;
        if (diamondIntersectsAABB(other.screenX, other.screenY, other.reticleRadius, cBox)) {
          collidesWithReticle = true;
          break;
        }
      }

      if (collidesWithReticle) {
        continue;
      }

      // 2. Camera-Proximity Occlusion with other labels
      for (const [id, other] of this.footprints.entries()) {
        if (id === nodeId || !other.visible || !other.labelBox) continue;

        if (boxesIntersect(cBox, other.labelBox)) {
          // Significant nodes have target immunity: ambient node yields
          if (other.state === 'selected' || other.state === 'focused') {
            collidesWithHigherPriorityLabel = true;
            break;
          }

          // Both ambient: closer system retains its label, further system yields
          if (other.state === 'active') {
            const otherDist = other.camDist ?? 0;
            const targetDist = target.camDist ?? 0;
            if (otherDist < targetDist) {
              collidesWithHigherPriorityLabel = true;
              break;
            } else if (otherDist === targetDist && other.id.localeCompare(target.id) < 0) {
              collidesWithHigherPriorityLabel = true;
              break;
            }
          }
        }
      }

      if (!collidesWithHigherPriorityLabel) {
        // Valid non-colliding placement found
        result.visible = true;
        result.behindCanvas = true;
        result.displacementX = cand.dx;
        result.displacementY = cand.dy;
        result.isDisplaced = cand.dx !== 0 || cand.dy !== 0;
        return result;
      }
    }

    // Beyond displacement threshold: Camera-Proximity Occlusion suppresses the label
    result.visible = false;
    result.behindCanvas = true;
    result.displacementX = 0;
    result.displacementY = 0;
    result.isDisplaced = false;
    return result;
  }

  /**
   * Interactive Hit-Testing Fan-Out (Spec 2.2):
   * When systems overlap in screen space, underlying interactive hit-testing areas
   * invisibly fan out radially around the cluster centroid without moving the graphics.
   */
  public evaluateHitAreaOffset(nodeId: string, outOffset?: { x: number; y: number }): { x: number; y: number } {
    const offset = outOffset ?? this.scratchHitOffset;
    offset.x = 0;
    offset.y = 0;

    const target = this.footprints.get(nodeId);
    if (!target || !target.visible) return offset;

    const cluster: CelestialFootprint[] = [];
    for (const other of this.footprints.values()) {
      if (!other.visible) continue;
      const dx = target.screenX - other.screenX;
      const dy = target.screenY - other.screenY;
      const dist = Math.hypot(dx, dy);
      const threshold = Math.max(target.reticleRadius, other.reticleRadius) * 0.8;
      if (dist <= threshold) {
        cluster.push(other);
      }
    }

    if (cluster.length <= 1) {
      return offset;
    }

    cluster.sort((a, b) => a.id.localeCompare(b.id));
    const index = cluster.findIndex((fp) => fp.id === nodeId);
    if (index === -1) return offset;

    const angle = (2 * Math.PI * index) / cluster.length;
    const fanRadius = target.reticleRadius * 0.45;
    offset.x = fanRadius * Math.cos(angle);
    offset.y = fanRadius * Math.sin(angle);
    return offset;
  }

  /**
   * Cyclic Selection for Overlapping Nodes (Spec 2.2):
   * Clicking an already-focused node in a crowded cluster advances focus to the next overlapping node.
   */
  public getCyclicSelectionTarget(clickedId: string): string {
    const target = this.footprints.get(clickedId);
    if (!target || !target.visible) return clickedId;

    const cluster: CelestialFootprint[] = [];
    for (const other of this.footprints.values()) {
      if (!other.visible) continue;
      const dx = target.screenX - other.screenX;
      const dy = target.screenY - other.screenY;
      const dist = Math.hypot(dx, dy);
      const threshold = Math.max(target.reticleRadius, other.reticleRadius) * 0.8;
      if (dist <= threshold) {
        cluster.push(other);
      }
    }

    if (cluster.length <= 1) {
      return clickedId;
    }

    cluster.sort((a, b) => a.id.localeCompare(b.id));
    const currentIndex = cluster.findIndex((fp) => fp.id === clickedId);
    if (currentIndex === -1) return clickedId;
    const nextIndex = (currentIndex + 1) % cluster.length;
    return cluster[nextIndex].id;
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
