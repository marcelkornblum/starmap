import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  CelestialOcclusionManager,
  celestialOcclusionManager,
} from './celestialOcclusionRegistry';

describe('celestialOcclusionRegistry - Occlusion Rules & Displacement', () => {
  beforeEach(() => {
    celestialOcclusionManager.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('evaluates label visibility according to authoritative occlusion rules', () => {
    const manager = new CelestialOcclusionManager();

    // Rule 1: When intersection occurs, unselected nodes disappear
    const activeOccluded = manager.evaluateLabelVisibility('active', true);
    expect(activeOccluded.visible).toBe(false);
    expect(activeOccluded.behindCanvas).toBe(true);

    const passiveOccluded = manager.evaluateLabelVisibility('passive', true);
    expect(passiveOccluded.visible).toBe(false);

    // Rule 2: When intersection occurs, selected or focused nodes remain visible behind canvas
    const selectedOccluded = manager.evaluateLabelVisibility('selected', true);
    expect(selectedOccluded.visible).toBe(true);
    expect(selectedOccluded.behindCanvas).toBe(true);

    const focusedOccluded = manager.evaluateLabelVisibility('focused', true);
    expect(focusedOccluded.visible).toBe(true);
    expect(focusedOccluded.behindCanvas).toBe(true);

    // Rule 3: When no intersection occurs, all active states remain visible
    const activeClean = manager.evaluateLabelVisibility('active', false);
    expect(activeClean.visible).toBe(true);

    const selectedClean = manager.evaluateLabelVisibility('selected', false);
    expect(selectedClean.visible).toBe(true);
  });

  it('manages multi-node collision detection and registration lifecycle', () => {
    const manager = new CelestialOcclusionManager();

    // Register Node A (Sol) at (100, 100)
    manager.register({
      id: 'sol',
      state: 'active',
      screenX: 100,
      screenY: 100,
      reticleRadius: 40,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Register Node B (Alpha Centauri) at (220, 100)
    manager.register({
      id: 'alpha-centauri',
      state: 'active',
      screenX: 220,
      screenY: 100,
      reticleRadius: 40,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    expect(manager.size).toBe(2);

    // Label 1: Placed between nodes, overlapping Node B's diamond reticle
    const collidingBox = { left: 190, top: 90, right: 240, bottom: 110 };
    const collisionResult = manager.checkIntersection('sol', collidingBox);
    expect(collisionResult.hasIntersection).toBe(true);
    expect(collisionResult.collidingNodeId).toBe('alpha-centauri');

    // Label 2: Placed far above, no overlap with any node
    const safeBox = { left: 140, top: 10, right: 180, bottom: 30 };
    const safeResult = manager.checkIntersection('sol', safeBox);
    expect(safeResult.hasIntersection).toBe(false);

    // Unregister Node B: collision should now be cleared
    manager.unregister('alpha-centauri');
    expect(manager.size).toBe(1);
    expect(manager.checkIntersection('sol', collidingBox).hasIntersection).toBe(false);
  });

  it('enforces reticle occlusion and Target Immunity hierarchy', () => {
    const manager = new CelestialOcclusionManager();

    // Register Node A (Vega) focused at (100, 100), camDist 10
    manager.register({
      id: 'vega',
      state: 'focused',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 40,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Register Node B (Sirius) active (background ambient) at (101, 101), camDist 12 (> 10)
    manager.register({
      id: 'sirius',
      state: 'active',
      screenX: 101,
      screenY: 101,
      camDist: 12,
      reticleRadius: 40,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Background ambient reticle Sirius (camDist 12 >= 10) colliding beneath focused Vega is suppressed
    expect(manager.evaluateReticleOcclusion('sirius')).toBe(true);

    // Significant reticle Vega is never suppressed
    expect(manager.evaluateReticleOcclusion('vega')).toBe(false);

    // Register foreground ambient contact Altair at (102, 102), camDist 5 (< 10)
    manager.register({
      id: 'altair',
      state: 'active',
      screenX: 102,
      screenY: 102,
      camDist: 5,
      reticleRadius: 40,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Foreground ambient contact in front of background focused target is NOT suppressed
    expect(manager.evaluateReticleOcclusion('altair')).toBe(false);
  });

  it('implements Layer 3 Dynamic Displacement along leader stems and Camera-Proximity Occlusion', () => {
    const manager = new CelestialOcclusionManager();

    // Register Node A (Vega) focused at (100, 100)
    manager.register({
      id: 'vega',
      state: 'focused',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 40,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Significant node has Target Immunity: always visible even if intersecting
    const targetImmuneResult = manager.evaluateLabelOcclusion('vega', {
      left: 90,
      top: 90,
      right: 140,
      bottom: 110,
    });
    expect(targetImmuneResult.visible).toBe(true);
    expect(targetImmuneResult.behindCanvas).toBe(true);

    // Passive nodes have no visible labels
    manager.register({
      id: 'passive-star',
      state: 'passive',
      screenX: 300,
      screenY: 300,
      camDist: 10,
      reticleRadius: 40,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });
    expect(manager.evaluateLabelOcclusion('passive-star', {
      left: 310,
      top: 290,
      right: 360,
      bottom: 310,
    }).visible).toBe(false);

    // Test screen-space displacement along leader stem:
    manager.register({
      id: 'node-b',
      state: 'active',
      screenX: 200,
      screenY: 200,
      camDist: 15,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });
    manager.register({
      id: 'node-c',
      state: 'active',
      screenX: 240,
      screenY: 190,
      camDist: 20,
      reticleRadius: 20,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Primary box at (230, 180, 270, 200) intersects Node C's reticle diamond (cx=240, cy=190, r=20)
    const displaceResult = manager.evaluateLabelOcclusion('node-b', {
      left: 230,
      top: 180,
      right: 270,
      bottom: 200,
    });
    expect(displaceResult.visible).toBe(true);
    expect(displaceResult.isDisplaced).toBe(true);
    expect(displaceResult.displacementY).toBeGreaterThan(0);

    // Camera-Proximity Occlusion:
    manager.clear();
    manager.register({
      id: 'foreground-node',
      state: 'active',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 20,
      starRadius: 4,
      hasReticle: false,
      labelBox: { left: 120, top: 90, right: 170, bottom: 110 },
      visible: true,
      updatedAt: 1000,
    });
    manager.register({
      id: 'background-node',
      state: 'active',
      screenX: 100,
      screenY: 100,
      camDist: 30,
      reticleRadius: 20,
      starRadius: 4,
      hasReticle: false,
      visible: true,
      updatedAt: 1000,
    });

    // Surrounding with blocking obstacles so candidates fail
    manager.register({
      id: 'blocker-down',
      state: 'active',
      screenX: 145,
      screenY: 135,
      camDist: 5,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });
    manager.register({
      id: 'blocker-right',
      state: 'active',
      screenX: 175,
      screenY: 100,
      camDist: 5,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });
    manager.register({
      id: 'blocker-up',
      state: 'active',
      screenX: 145,
      screenY: 65,
      camDist: 5,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    const backgroundResult = manager.evaluateLabelOcclusion('background-node', {
      left: 120,
      top: 90,
      right: 170,
      bottom: 110,
    });
    expect(backgroundResult.visible).toBe(false);
  });

  it('ensures stalked snapshots avoid redundant rebuilds and notifications on unchanged frames (AUD-103)', async () => {
    const manager = new CelestialOcclusionManager();
    const listener = vi.fn();
    const unsubscribe = manager.subscribeStalked(listener);

    // Register entity with stalk
    manager.register({
      id: 'stalked-star',
      state: 'selected',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      hasStalk: true,
      worldPos: [10, 20, 30],
      visible: true,
      updatedAt: 1000,
    });

    // Flush macro-task for initial notification
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(listener).toHaveBeenCalledTimes(1);

    const snapshot1 = manager.getStalkedFootprintsSnapshot();
    expect(snapshot1).toHaveLength(1);
    expect(snapshot1[0].id).toBe('stalked-star');

    // Re-register with identical stalk properties
    manager.register({
      id: 'stalked-star',
      state: 'selected',
      screenX: 101,
      screenY: 101,
      camDist: 10,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      hasStalk: true,
      worldPos: [10, 20, 30],
      visible: true,
      updatedAt: 1016,
    });

    // Wait for any notification that might have been scheduled
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(listener).toHaveBeenCalledTimes(1); // Listener NOT called again

    const snapshot2 = manager.getStalkedFootprintsSnapshot();
    expect(snapshot2).toBe(snapshot1); // Exact same array reference preserved

    unsubscribe();
  });

  it('keeps isBatchEvaluating() true and didCameraOrFootprintsChange() false across >250ms idle evaluate() frames (P-09)', () => {
    let now = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const manager = new CelestialOcclusionManager();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.updateMatrixWorld();
    const size = { width: 1440, height: 900 };

    expect(manager.isBatchEvaluating()).toBe(false);

    manager.register({
      id: 'sol',
      state: 'active',
      screenX: 0,
      screenY: 0,
      worldPos: [0, 0, 0],
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    });

    // Initial evaluation
    manager.evaluate(camera, size);
    const firstEvalTime = manager.lastEvaluationTime;
    expect(manager.isBatchEvaluating()).toBe(true);
    expect(manager.didCameraOrFootprintsChange()).toBe(true);

    // Advance >250ms while evaluate() keeps running on idle frames
    now += 300;
    manager.evaluate(camera, size);
    expect(manager.isBatchEvaluating()).toBe(true);
    expect(manager.didCameraOrFootprintsChange()).toBe(false);
    expect(manager.lastEvaluationTime).toBe(firstEvalTime);

    // Moving camera immediately flips didCameraOrFootprintsChange() to true
    camera.position.set(2, 0, 10);
    camera.updateMatrixWorld();
    manager.evaluate(camera, size);
    expect(manager.didCameraOrFootprintsChange()).toBe(true);

    // Idle frame resets didCameraOrFootprintsChange() to false while keeping batch active
    now += 300;
    manager.evaluate(camera, size);
    expect(manager.isBatchEvaluating()).toBe(true);
    expect(manager.didCameraOrFootprintsChange()).toBe(false);

    // Mutating a footprint immediately flips didCameraOrFootprintsChange() to true on next evaluate()
    manager.register({
      id: 'alpha-centauri',
      state: 'selected',
      screenX: 0,
      screenY: 0,
      worldPos: [5, 0, 0],
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    });
    manager.evaluate(camera, size);
    expect(manager.didCameraOrFootprintsChange()).toBe(true);

    // Stopping evaluate() for >250ms expires batch evaluation so fallback projection can resume
    now += 300;
    expect(manager.isBatchEvaluating()).toBe(false);
  });
});
