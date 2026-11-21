import type * as THREE from 'three';
import type { Box2D, CelestialFootprint, LabelOcclusionResult } from './occlusionTypes';
import { ScreenSpatialGrid, checkGridIntersection } from './occlusionGeometryMath';
import { computeHitAreaCluster, resolveCyclicSelectionTarget } from './occlusionClusterSolver';
import { evaluateLabelVisibility, solveLabelOcclusion } from './occlusionLabelSolver';
import {
  isReticleSuppressedBySignificant,
  collectSignificantFootprints,
  projectFootprint,
  areStalkedEqual,
} from './occlusionTargetSelection';

export class CelestialOcclusionManager {
  private footprints = new Map<string, CelestialFootprint>();
  private significantFootprints: CelestialFootprint[] = [];
  private grid = new ScreenSpatialGrid(100);
  private gridDirty = true;

  private stalkedListeners = new Set<() => void>();
  private stalkedSnapshot: CelestialFootprint[] = [];
  private scratchStalkedList: CelestialFootprint[] = [];

  private scratchCandidateBox: Box2D = { left: 0, top: 0, right: 0, bottom: 0 };
  private scratchCluster: CelestialFootprint[] = [];
  private scratchLabelResult: LabelOcclusionResult = {
    visible: true, behindCanvas: true, displacementX: 0, displacementY: 0, isDisplaced: false,
  };
  private scratchHitOffset = { x: 0, y: 0 };
  private scratchVec: THREE.Vector3 | null = null;
  private scratchCamSpaceVec: THREE.Vector3 | null = null;
  public lastEvaluationTime = 0;
  private hasBatchPass = false;
  private lastBatchPassTime = 0;

  private lastCamMatrixElements = new Float32Array(16);
  private lastProjMatrixElements = new Float32Array(16);
  private lastSizeWidth = -1;
  private lastSizeHeight = -1;
  private footprintsMutated = true;
  private cameraOrFootprintsChangedThisFrame = true;

  public didCameraOrFootprintsChange(): boolean { return this.cameraOrFootprintsChangedThisFrame; }
  public isBatchEvaluating(): boolean {
    return this.hasBatchPass && performance.now() - this.lastBatchPassTime < 250;
  }

  public evaluate(camera: THREE.Camera, size: { width: number; height: number }): void {
    const now = performance.now();
    this.hasBatchPass = true;
    this.lastBatchPassTime = now;
    if (this.lastEvaluationTime === 0) this.lastEvaluationTime = now;

    const camEls = camera.matrixWorldInverse.elements;
    const projEls = camera.projectionMatrix.elements;
    let camMoved = size.width !== this.lastSizeWidth || size.height !== this.lastSizeHeight;
    if (!camMoved) {
      for (let i = 0; i < 16; i++) {
        if (Math.abs(camEls[i] - this.lastCamMatrixElements[i]) > 1e-6 || Math.abs(projEls[i] - this.lastProjMatrixElements[i]) > 1e-6) {
          camMoved = true;
          break;
        }
      }
    }
    if (!camMoved && !this.footprintsMutated && !this.gridDirty) {
      this.cameraOrFootprintsChangedThisFrame = false;
      return;
    }

    this.lastEvaluationTime = now;
    this.cameraOrFootprintsChangedThisFrame = true;
    this.footprintsMutated = false;
    this.lastSizeWidth = size.width;
    this.lastSizeHeight = size.height;
    this.lastCamMatrixElements.set(camEls);
    this.lastProjMatrixElements.set(projEls);

    if (!this.scratchVec || !this.scratchCamSpaceVec) {
      this.scratchVec = camera.position.clone();
      this.scratchCamSpaceVec = camera.position.clone();
    }
    const zNear = ('near' in camera && typeof camera.near === 'number') ? camera.near : 0.1;
    for (const fp of this.footprints.values()) {
      projectFootprint(fp, camera, size, this.scratchVec, this.scratchCamSpaceVec, zNear, this.lastEvaluationTime);
    }
    this.gridDirty = true;
    this.ensureGrid();
    this.significantFootprints = collectSignificantFootprints(this.footprints.values());
  }

  private ensureGrid(): void {
    if (!this.gridDirty) return;
    this.grid.clear();
    for (const fp of this.footprints.values()) {
      if (fp.visible) this.grid.insert(fp);
    }
    this.gridDirty = false;
  }

  private stalkedNotifyScheduled = false;

  private notifyStalked(): void {
    if (this.stalkedNotifyScheduled) return;
    this.stalkedNotifyScheduled = true;
    setTimeout(() => {
      this.stalkedNotifyScheduled = false;
      for (const listener of this.stalkedListeners) listener();
    }, 0);
  }

  private updateStalkedSnapshot(): void {
    const list = this.scratchStalkedList;
    list.length = 0;
    for (const fp of this.footprints.values()) {
      if (fp.hasStalk && fp.worldPos) list.push(fp);
    }
    if (areStalkedEqual(this.stalkedSnapshot, list)) return;
    this.stalkedSnapshot = list.map((fp) => ({
      ...fp,
      worldPos: fp.worldPos ? [fp.worldPos[0], fp.worldPos[1], fp.worldPos[2]] : undefined,
    }));
    this.notifyStalked();
  }

  public subscribeStalked = (listener: () => void): () => void => {
    this.stalkedListeners.add(listener);
    return () => { this.stalkedListeners.delete(listener); };
  };

  public getStalkedFootprintsSnapshot = (): CelestialFootprint[] => this.stalkedSnapshot;

  public register(footprint: CelestialFootprint): void {
    const prev = this.footprints.get(footprint.id);
    this.footprints.set(footprint.id, footprint);
    this.gridDirty = true;
    this.footprintsMutated = true;
    if (prev?.state === 'selected' || prev?.state === 'focused' || footprint.state === 'selected' || footprint.state === 'focused') {
      this.significantFootprints = collectSignificantFootprints(this.footprints.values());
    }
    if (Boolean(prev?.hasStalk) || Boolean(footprint.hasStalk)) this.updateStalkedSnapshot();
  }

  public unregister(id: string): void {
    const existing = this.footprints.get(id);
    this.footprints.delete(id);
    this.gridDirty = true;
    this.footprintsMutated = true;
    if (existing) {
      if (existing.state === 'selected' || existing.state === 'focused') {
        this.significantFootprints = collectSignificantFootprints(this.footprints.values());
      }
      if (existing.hasStalk) this.updateStalkedSnapshot();
    }
  }

  public clear(): void {
    this.footprints.clear();
    this.significantFootprints = [];
    this.grid.clear();
    this.gridDirty = false;
    this.footprintsMutated = true;
    this.cameraOrFootprintsChangedThisFrame = true;
    this.hasBatchPass = false;
    this.lastBatchPassTime = 0;
    this.lastEvaluationTime = 0;
    this.lastSizeWidth = -1;
    this.lastSizeHeight = -1;
    this.updateStalkedSnapshot();
  }

  public evaluateReticleOcclusion(nodeId: string): boolean {
    const target = this.footprints.get(nodeId);
    if (!target) return false;
    return isReticleSuppressedBySignificant(target, this.significantFootprints);
  }

  public checkIntersection(
    sourceId: string,
    labelBox: Box2D,
    options?: { checkSelf?: boolean },
  ): { hasIntersection: boolean; collidingNodeId?: string } {
    this.ensureGrid();
    return checkGridIntersection(this.grid, sourceId, labelBox, options?.checkSelf ?? true);
  }

  public evaluateLabelVisibility(
    state: 'passive' | 'active' | 'selected' | 'focused',
    hasIntersection: boolean,
  ): { visible: boolean; behindCanvas: boolean } {
    return evaluateLabelVisibility(state, hasIntersection);
  }

  public evaluateLabelOcclusion(
    nodeId: string,
    labelBox?: Box2D,
    outResult?: LabelOcclusionResult,
  ): LabelOcclusionResult {
    const target = this.footprints.get(nodeId);
    const result = outResult ?? this.scratchLabelResult;
    if (!target) {
      result.visible = true;
      return result;
    }
    this.ensureGrid();
    return solveLabelOcclusion(target, labelBox, this.grid, this.scratchCandidateBox, result);
  }

  public evaluateHitAreaOffset(nodeId: string, outOffset?: { x: number; y: number }): { x: number; y: number } {
    const offset = outOffset ?? this.scratchHitOffset;
    offset.x = 0;
    offset.y = 0;
    const target = this.footprints.get(nodeId);
    if (!target || !target.visible) return offset;

    const evalTime = this.lastEvaluationTime > 0 ? this.lastEvaluationTime : performance.now();
    if (target.hitAreaEvaluatedAt !== evalTime) {
      this.ensureGrid();
      computeHitAreaCluster(target, this.grid, this.scratchCluster, evalTime);
    }

    offset.x = target.hitAreaOffsetX ?? 0;
    offset.y = target.hitAreaOffsetY ?? 0;
    return offset;
  }

  public getCyclicSelectionTarget(clickedId: string): string {
    this.ensureGrid();
    return resolveCyclicSelectionTarget(clickedId, this.footprints, this.grid, this.scratchCluster);
  }

  public get size(): number { return this.footprints.size; }

  public getFootprint(id: string): CelestialFootprint | undefined {
    const fp = this.footprints.get(id);
    if (fp && fp.hitAreaEvaluatedAt === undefined && this.lastEvaluationTime > 0) this.evaluateHitAreaOffset(id);
    return fp;
  }

  public getAllFootprints(): CelestialFootprint[] { return Array.from(this.footprints.values()); }

  public getStalkedFootprints(): CelestialFootprint[] {
    const stalked: CelestialFootprint[] = [];
    for (const fp of this.footprints.values()) {
      if (fp.hasStalk && fp.worldPos) stalked.push(fp);
    }
    return stalked;
  }

  public evaluateNodeOcclusion(
    nodeId: string,
    labelBox?: Box2D,
    outState?: { isReticleSuppressed: boolean; hitOffset: { x: number; y: number }; labelEval: LabelOcclusionResult },
  ): { isReticleSuppressed: boolean; hitOffset: { x: number; y: number }; labelEval: LabelOcclusionResult } {
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
