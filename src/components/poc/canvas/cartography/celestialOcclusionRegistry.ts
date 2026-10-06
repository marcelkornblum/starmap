import * as THREE from 'three';
import { DEFAULT_RETICLE_SIZE } from './reticleGeometry';
import { reticleSizeToScreenPx } from '../engineConfig';

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
  name?: string;
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
  hitAreaOffsetX?: number;
  hitAreaOffsetY?: number;
  hitAreaEvaluatedAt?: number;
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

/**
 * 2D Screen-space spatial partition grid.
 * Groups registered footprints into fixed pixel cells to convert O(N^2) pairwise
 * intersection and distance checks into O(1) local neighborhood lookups.
 */
class ScreenSpatialGrid {
  private cellSize: number;
  private cells = new Map<number, CelestialFootprint[]>();
  private arrayPool: CelestialFootprint[][] = [];

  constructor(cellSize = 100) {
    this.cellSize = cellSize;
  }

  private hash(cx: number, cy: number): number {
    return (cx & 0xffff) | ((cy & 0xffff) << 16);
  }

  public clear(): void {
    for (const arr of this.cells.values()) {
      arr.length = 0;
      this.arrayPool.push(arr);
    }
    this.cells.clear();
  }

  public insert(fp: CelestialFootprint): void {
    const cx = Math.floor(fp.screenX / this.cellSize);
    const cy = Math.floor(fp.screenY / this.cellSize);
    const key = this.hash(cx, cy);
    let arr = this.cells.get(key);
    if (!arr) {
      arr = this.arrayPool.pop() ?? [];
      this.cells.set(key, arr);
    }
    arr.push(fp);
  }

  public forEachNearby(
    x: number,
    y: number,
    radius: number,
    cb: (item: CelestialFootprint) => boolean | void,
  ): void {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.hash(cx, cy);
        const arr = this.cells.get(key);
        if (arr) {
          for (let i = 0; i < arr.length; i++) {
            if (cb(arr[i]) === false) return;
          }
        }
      }
    }
  }
}

const CANDIDATE_MULTIPLIERS = [
  { x: 0, y: 0 },
  { x: 0, y: 1.4 },               // Downward displacement
  { x: 1.25, y: 0 },              // Outward right displacement along leader stem
  { x: 0, y: -1.4 },              // Upward displacement
  { x: -1.25, y: 0 },             // Leftward displacement
  { x: 1.1 * 0.7071, y: 1.1 * 0.7071 },   // Down-right
  { x: -1.1 * 0.7071, y: 1.1 * 0.7071 },  // Down-left
  { x: 1.1 * 0.7071, y: -1.1 * 0.7071 },  // Up-right
  { x: -1.1 * 0.7071, y: -1.1 * 0.7071 }, // Up-left
] as const;

export class CelestialOcclusionManager {
  private footprints = new Map<string, CelestialFootprint>();
  private significantFootprints: CelestialFootprint[] = [];
  private grid = new ScreenSpatialGrid(100);
  private gridDirty = true;

  // Stalked footprints subscription
  private stalkedListeners = new Set<() => void>();
  private stalkedSnapshot: CelestialFootprint[] = [];

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
  private scratchVec = new THREE.Vector3();
  private scratchCamSpaceVec = new THREE.Vector3();
  public lastEvaluationTime = 0;

  /**
   * Returns true if a centralized batch pass (e.g. OcclusionPass) is actively evaluating projections.
   */
  public isBatchEvaluating(): boolean {
    return performance.now() - this.lastEvaluationTime < 250;
  }

  /**
   * Batch evaluate dynamic screen projections for all registered footprints.
   */
  public evaluate(camera: THREE.Camera, size: { width: number; height: number }): void {
    this.lastEvaluationTime = performance.now();
    const zNear = ('near' in camera && typeof camera.near === 'number') ? camera.near : 0.1;
    for (const fp of this.footprints.values()) {
      if (!fp.worldPos) continue;
      this.scratchVec.set(fp.worldPos[0], fp.worldPos[1], fp.worldPos[2]);
      const camDist = camera.position.distanceTo(this.scratchVec);
      const isBehind = this.scratchCamSpaceVec.copy(this.scratchVec).applyMatrix4(camera.matrixWorldInverse).z > -zNear;
      const ndc = this.scratchVec.project(camera); // Note: .project() mutates scratchVec in-place
      fp.screenX = (ndc.x * 0.5 + 0.5) * size.width;
      fp.screenY = (-ndc.y * 0.5 + 0.5) * size.height;
      fp.camDist = camDist;
      fp.visible = !isBehind;
      fp.updatedAt = this.lastEvaluationTime;

      // Dynamic screen-space footprint calculations
      const reticleWorldSize = fp.reticleSize ?? DEFAULT_RETICLE_SIZE;
      const reticleRadiusPx = reticleSizeToScreenPx(reticleWorldSize, size.height);
      fp.reticleRadius = reticleRadiusPx;
      fp.starRadius = Math.max(3, reticleSizeToScreenPx(0.035, size.height));

      // Compute screen-pixel label bounding box
      const nameLength = fp.name ? fp.name.length : 8;
      const estimatedW = nameLength * 8 + 14;
      const estimatedH = 20;
      const anchorX = fp.screenX + 1.15 * reticleRadiusPx;
      const anchorY = fp.screenY - 0.75 * reticleRadiusPx;

      if (!fp.labelBox) {
        fp.labelBox = {
          left: anchorX,
          top: anchorY - estimatedH / 2,
          right: anchorX + estimatedW,
          bottom: anchorY + estimatedH / 2,
        };
      } else {
        fp.labelBox.left = anchorX;
        fp.labelBox.top = anchorY - estimatedH / 2;
        fp.labelBox.right = anchorX + estimatedW;
        fp.labelBox.bottom = anchorY + estimatedH / 2;
      }

      fp.updatedAt = performance.now();
    }
    this.gridDirty = true;
    this.ensureGrid();
    this.updateSignificantFootprints();
    this.updateHitAreaOffsets();
  }

  private ensureGrid(): void {
    if (!this.gridDirty) return;
    this.grid.clear();
    for (const fp of this.footprints.values()) {
      if (fp.visible) {
        this.grid.insert(fp);
      }
    }
    this.gridDirty = false;
  }

  private updateSignificantFootprints(): void {
    this.significantFootprints = [];
    for (const fp of this.footprints.values()) {
      if (fp.visible && fp.hasReticle && (fp.state === 'selected' || fp.state === 'focused')) {
        this.significantFootprints.push(fp);
      }
    }
  }

  private stalkedNotifyScheduled = false;

  private areStalkedListsEqual(a: CelestialFootprint[], b: CelestialFootprint[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].id !== b[i].id ||
        a[i].state !== b[i].state ||
        a[i].classification !== b[i].classification ||
        a[i].reticleSize !== b[i].reticleSize ||
        a[i].worldPos?.[0] !== b[i].worldPos?.[0] ||
        a[i].worldPos?.[1] !== b[i].worldPos?.[1] ||
        a[i].worldPos?.[2] !== b[i].worldPos?.[2]
      ) {
        return false;
      }
    }
    return true;
  }

  private notifyStalked(): void {
    if (this.stalkedNotifyScheduled) return;
    this.stalkedNotifyScheduled = true;
    setTimeout(() => {
      this.stalkedNotifyScheduled = false;
      for (const listener of this.stalkedListeners) {
        listener();
      }
    }, 0);
  }

  private updateStalkedSnapshot(): void {
    const list: CelestialFootprint[] = [];
    for (const fp of this.footprints.values()) {
      if (fp.hasStalk && fp.worldPos) {
        list.push({ ...fp });
      }
    }
    if (this.areStalkedListsEqual(this.stalkedSnapshot, list)) {
      return;
    }
    this.stalkedSnapshot = list;
    this.notifyStalked();
  }

  public subscribeStalked = (listener: () => void): () => void => {
    this.stalkedListeners.add(listener);
    return () => {
      this.stalkedListeners.delete(listener);
    };
  };

  public getStalkedFootprintsSnapshot = (): CelestialFootprint[] => {
    return this.stalkedSnapshot;
  };

  /**
   * Register or update a celestial node's screen-space footprint.
   */
  public register(footprint: CelestialFootprint): void {
    const existing = this.footprints.get(footprint.id);
    const stalkChanged =
      !existing ||
      existing.hasStalk !== footprint.hasStalk ||
      existing.state !== footprint.state;
    const significanceChanged =
      !existing ||
      existing.state !== footprint.state ||
      existing.visible !== footprint.visible;

    this.footprints.set(footprint.id, footprint);
    this.gridDirty = true;

    if (significanceChanged) {
      this.updateSignificantFootprints();
    }
    if (stalkChanged) {
      this.updateStalkedSnapshot();
    }
  }

  /**
   * Unregister a celestial node when unmounted or hidden.
   */
  public unregister(id: string): void {
    const existing = this.footprints.get(id);
    this.footprints.delete(id);
    this.gridDirty = true;
    if (existing) {
      if (existing.state === 'selected' || existing.state === 'focused') {
        this.updateSignificantFootprints();
      }
      if (existing.hasStalk) {
        this.updateStalkedSnapshot();
      }
    }
  }

  /**
   * Clear all registered footprints (useful for test resets).
   */
  public clear(): void {
    this.footprints.clear();
    this.significantFootprints = [];
    this.grid.clear();
    this.gridDirty = false;
    this.updateStalkedSnapshot();
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

    if (this.significantFootprints.length === 0) {
      return false;
    }

    // Check if colliding beneath any significant reticle in foreground or same depth
    for (let i = 0; i < this.significantFootprints.length; i++) {
      const other = this.significantFootprints[i];
      if (other.id === nodeId || !other.visible || !other.hasReticle) continue;

      const dx = Math.abs(target.screenX - other.screenX);
      const dy = Math.abs(target.screenY - other.screenY);
      // Colliding within significant reticle's diamond bounds
      if (
        (dx + dy) <= (target.reticleRadius + other.reticleRadius) * 0.75 &&
        (target.camDist ?? 0) >= (other.camDist ?? 0)
      ) {
        return true; // Suppressed by significant priority mask
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
    this.ensureGrid();
    const checkSelf = options?.checkSelf ?? true;
    const centerX = (labelBox.left + labelBox.right) * 0.5;
    const centerY = (labelBox.top + labelBox.bottom) * 0.5;
    const radius = Math.max(labelBox.right - labelBox.left, labelBox.bottom - labelBox.top) * 0.5 + 80;

    let result: { hasIntersection: boolean; collidingNodeId?: string } = { hasIntersection: false };

    this.grid.forEachNearby(centerX, centerY, radius, (footprint) => {
      if (!checkSelf && footprint.id === sourceId) return;

      if (boxIntersectsFootprint(labelBox, footprint)) {
        result = { hasIntersection: true, collidingNodeId: footprint.id };
        return false;
      }
    });

    return result;
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

    const box = labelBox ?? target.labelBox;
    if (!box) {
      result.visible = true;
      return result;
    }

    this.ensureGrid();

    // Candidate displacements (Spec 2.3: Screen-Space Displacement along 8 radial leader stems)
    const r = target.reticleRadius;
    const cBox = this.scratchCandidateBox;

    for (let cIdx = 0; cIdx < CANDIDATE_MULTIPLIERS.length; cIdx++) {
      const mult = CANDIDATE_MULTIPLIERS[cIdx];
      const dx = mult.x * r;
      const dy = mult.y * r;

      cBox.left = box.left + dx;
      cBox.top = box.top + dy;
      cBox.right = box.right + dx;
      cBox.bottom = box.bottom + dy;

      const cCenterX = (cBox.left + cBox.right) * 0.5;
      const cCenterY = (cBox.top + cBox.bottom) * 0.5;
      const searchRadius = Math.max(cBox.right - cBox.left, cBox.bottom - cBox.top) * 0.5 + 80;

      let collidesWithReticle = false;
      let collidesWithHigherPriorityLabel = false;

      this.grid.forEachNearby(cCenterX, cCenterY, searchRadius, (other) => {
        if (!other.visible || other.id === nodeId) return;

        // 1. Authoritative Rule: labels should never occlude stars or reticles
        if (other.hasReticle && diamondIntersectsAABB(other.screenX, other.screenY, other.reticleRadius, cBox)) {
          collidesWithReticle = true;
          return false;
        }

        // 2. Camera-Proximity Occlusion with other labels
        if (other.id !== nodeId && other.labelBox && boxesIntersect(cBox, other.labelBox)) {
          if (other.state === 'selected' || other.state === 'focused') {
            collidesWithHigherPriorityLabel = true;
            return false;
          }

          if (other.state === 'active') {
            const otherDist = other.camDist ?? 0;
            const targetDist = target.camDist ?? 0;
            if (otherDist < targetDist) {
              collidesWithHigherPriorityLabel = true;
              return false;
            } else if (otherDist === targetDist && other.id.localeCompare(target.id) < 0) {
              collidesWithHigherPriorityLabel = true;
              return false;
            }
          }
        }
      });

      if (collidesWithReticle || collidesWithHigherPriorityLabel) {
        continue;
      }

      // Valid non-colliding placement found
      result.visible = true;
      result.behindCanvas = true;
      result.displacementX = dx;
      result.displacementY = dy;
      result.isDisplaced = dx !== 0 || dy !== 0;
      return result;
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
   * Pre-calculate and cache hit area fan-out offsets for all visible footprints during the evaluate pass.
   */
  private updateHitAreaOffsets(): void {
    const evalTime = this.lastEvaluationTime > 0 ? this.lastEvaluationTime : performance.now();
    for (const fp of this.footprints.values()) {
      if (!fp.visible) {
        fp.hitAreaOffsetX = 0;
        fp.hitAreaOffsetY = 0;
        fp.hitAreaEvaluatedAt = evalTime;
        continue;
      }
      if (fp.hitAreaEvaluatedAt === evalTime) {
        continue;
      }
      this.computeHitAreaOffsetFor(fp, evalTime);
    }
  }

  /**
   * Computes hit area fan-out offsets for a target footprint and its overlapping cluster.
   */
  private computeHitAreaOffsetFor(
    target: CelestialFootprint,
    evalTime = this.lastEvaluationTime > 0 ? this.lastEvaluationTime : performance.now(),
  ): void {
    this.ensureGrid();
    const cluster: CelestialFootprint[] = [];
    const searchRadius = target.reticleRadius * 2.5;

    this.grid.forEachNearby(target.screenX, target.screenY, searchRadius, (other) => {
      if (!other.visible) return;
      const dx = target.screenX - other.screenX;
      const dy = target.screenY - other.screenY;
      const dist = Math.hypot(dx, dy);
      const threshold = Math.max(target.reticleRadius, other.reticleRadius) * 0.9;
      if (dist <= threshold) {
        cluster.push(other);
      }
    });

    if (cluster.length <= 1) {
      target.hitAreaOffsetX = 0;
      target.hitAreaOffsetY = 0;
      target.hitAreaEvaluatedAt = evalTime;
      return;
    }

    // 1. Calculate the centroid of the collision space
    let centroidX = 0;
    let centroidY = 0;
    for (let i = 0; i < cluster.length; i++) {
      centroidX += cluster[i].screenX;
      centroidY += cluster[i].screenY;
    }
    centroidX /= cluster.length;
    centroidY /= cluster.length;

    // 2. Sort the cluster by polar angle from the collision centroid with ID tie-breaking
    cluster.sort((a, b) => {
      const angleA = Math.atan2(a.screenY - centroidY, a.screenX - centroidX);
      const angleB = Math.atan2(b.screenY - centroidY, b.screenX - centroidX);
      const diff = angleA - angleB;
      if (Math.abs(diff) > 1e-4) return diff;
      return a.id.localeCompare(b.id);
    });

    // 3. Determine base angle pointing outward from collision space and assign to all cluster members
    const baseAngle = Math.atan2(cluster[0].screenY - centroidY, cluster[0].screenX - centroidX);
    for (let i = 0; i < cluster.length; i++) {
      const member = cluster[i];
      const angle = baseAngle + (2 * Math.PI * i) / cluster.length;
      const fanRadius = member.reticleRadius * 0.85;
      member.hitAreaOffsetX = fanRadius * Math.cos(angle);
      member.hitAreaOffsetY = fanRadius * Math.sin(angle);
      member.hitAreaEvaluatedAt = evalTime;
    }
  }

  /**
   * Interactive Hit-Testing Collision Avoidance (Spec 2.2):
   * When systems overlap in screen space, underlying interactive hit-testing areas
   * move outward from the collision space (repelling away from colliding neighbors)
   * so users can effortlessly click and select overlapping nodes without the graphics moving.
   *
   * Offsets are pre-calculated in the centralized evaluate pass, cached per-frame,
   * and returned in O(1) time without per-frame per-marker spatial searches.
   */
  public evaluateHitAreaOffset(nodeId: string, outOffset?: { x: number; y: number }): { x: number; y: number } {
    const offset = outOffset ?? this.scratchHitOffset;
    offset.x = 0;
    offset.y = 0;

    const target = this.footprints.get(nodeId);
    if (!target || !target.visible) return offset;

    const evalTime = this.lastEvaluationTime > 0 ? this.lastEvaluationTime : performance.now();
    if (target.hitAreaEvaluatedAt !== evalTime) {
      this.computeHitAreaOffsetFor(target, evalTime);
    }

    offset.x = target.hitAreaOffsetX ?? 0;
    offset.y = target.hitAreaOffsetY ?? 0;
    return offset;
  }

  /**
   * Cyclic Selection for Overlapping Nodes (Spec 2.2):
   * Clicking an already-focused node in a crowded cluster advances focus to the next overlapping node.
   */
  public getCyclicSelectionTarget(clickedId: string): string {
    const target = this.footprints.get(clickedId);
    if (!target || !target.visible) return clickedId;

    this.ensureGrid();
    const cluster: CelestialFootprint[] = [];
    const searchRadius = target.reticleRadius * 2.0;

    this.grid.forEachNearby(target.screenX, target.screenY, searchRadius, (other) => {
      if (!other.visible) return;
      const dx = target.screenX - other.screenX;
      const dy = target.screenY - other.screenY;
      const dist = Math.hypot(dx, dy);
      const threshold = Math.max(target.reticleRadius, other.reticleRadius) * 0.8;
      if (dist <= threshold) {
        cluster.push(other);
      }
    });

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
   * Returns footprint for a given node id if registered.
   */
  public getFootprint(id: string): CelestialFootprint | undefined {
    return this.footprints.get(id);
  }

  /**
   * Returns an array of all registered footprints.
   */
  public getAllFootprints(): CelestialFootprint[] {
    return Array.from(this.footprints.values());
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

  /**
   * Evaluates all occlusion, hit area fan-out, and label displacement passes
   * for a node in a single centralized call with zero object allocations.
   */
  public evaluateNodeOcclusion(
    nodeId: string,
    labelBox?: Box2D,
    outState?: {
      isReticleSuppressed: boolean;
      hitOffset: { x: number; y: number };
      labelEval: LabelOcclusionResult;
    },
  ): {
    isReticleSuppressed: boolean;
    hitOffset: { x: number; y: number };
    labelEval: LabelOcclusionResult;
  } {
    const isReticleSuppressed = this.evaluateReticleOcclusion(nodeId);
    const hitOffset = this.evaluateHitAreaOffset(nodeId, outState?.hitOffset);
    const labelEval = this.evaluateLabelOcclusion(nodeId, labelBox, outState?.labelEval);
    if (outState) {
      outState.isReticleSuppressed = isReticleSuppressed;
      return outState;
    }
    return { isReticleSuppressed, hitOffset, labelEval };
  }
}

export const celestialOcclusionManager = new CelestialOcclusionManager();
