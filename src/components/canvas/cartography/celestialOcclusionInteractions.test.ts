import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  CelestialOcclusionManager,
  celestialOcclusionManager,
} from './celestialOcclusionRegistry';

describe('celestialOcclusionRegistry - Hit-Testing & Interactions', () => {
  beforeEach(() => {
    celestialOcclusionManager.clear();
  });

  it('implements Interactive Hit-Testing Fan-Out and Cyclic Selection', () => {
    const manager = new CelestialOcclusionManager();

    // Register isolated node
    manager.register({
      id: 'isolated',
      state: 'active',
      screenX: 50,
      screenY: 50,
      camDist: 10,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Isolated node has zero hitarea offset
    const isolatedOffset = manager.evaluateHitAreaOffset('isolated');
    expect(isolatedOffset.x).toBe(0);
    expect(isolatedOffset.y).toBe(0);
    expect(manager.getCyclicSelectionTarget('isolated')).toBe('isolated');

    // Register 3 overlapping nodes at (200, 200)
    manager.register({
      id: 'node-1',
      state: 'focused',
      screenX: 200,
      screenY: 200,
      camDist: 10,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });
    manager.register({
      id: 'node-2',
      state: 'active',
      screenX: 202,
      screenY: 198,
      camDist: 12,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });
    manager.register({
      id: 'node-3',
      state: 'active',
      screenX: 199,
      screenY: 201,
      camDist: 15,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Hit areas invisibly fan out radially
    const offset1 = { ...manager.evaluateHitAreaOffset('node-1') };
    const offset2 = { ...manager.evaluateHitAreaOffset('node-2') };
    const offset3 = { ...manager.evaluateHitAreaOffset('node-3') };

    const dist1 = Math.hypot(offset1.x, offset1.y);
    const dist2 = Math.hypot(offset2.x, offset2.y);
    const dist3 = Math.hypot(offset3.x, offset3.y);

    expect(dist1).toBeGreaterThan(0);
    expect(dist2).toBeGreaterThan(0);
    expect(dist3).toBeGreaterThan(0);

    // Offsets point in different directions
    expect(offset1).not.toEqual(offset2);
    expect(offset2).not.toEqual(offset3);

    // Cyclic selection advances deterministically in cluster sorted order
    const nextFrom1 = manager.getCyclicSelectionTarget('node-1');
    expect(nextFrom1).toBe('node-2');
    const nextFrom2 = manager.getCyclicSelectionTarget('node-2');
    expect(nextFrom2).toBe('node-3');
    const nextFrom3 = manager.getCyclicSelectionTarget('node-3');
    expect(nextFrom3).toBe('node-1'); // Wraps back to first node
  });

  it('ensures passive background stars do not displace reticled star hit areas (AUD-114)', () => {
    const manager = new CelestialOcclusionManager();

    // Register reticled star at (300, 300)
    manager.register({
      id: 'reticled-star',
      state: 'active',
      screenX: 300,
      screenY: 300,
      camDist: 10,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Register passive background star right beside it at (302, 301)
    manager.register({
      id: 'passive-star',
      state: 'passive',
      screenX: 302,
      screenY: 301,
      camDist: 50,
      reticleRadius: 30,
      starRadius: 2,
      hasReticle: false,
      visible: true,
      updatedAt: 1000,
    });

    // Hit area offsets must remain 0 for both stars
    const reticledOffset = manager.evaluateHitAreaOffset('reticled-star');
    expect(reticledOffset.x).toBe(0);
    expect(reticledOffset.y).toBe(0);

    const passiveOffset = manager.evaluateHitAreaOffset('passive-star');
    expect(passiveOffset.x).toBe(0);
    expect(passiveOffset.y).toBe(0);
  });

  it('ensures cyclic selection ignores passive background stars (AUD-114)', () => {
    const manager = new CelestialOcclusionManager();

    manager.register({
      id: 'star-a',
      state: 'active',
      screenX: 400,
      screenY: 400,
      camDist: 10,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    manager.register({
      id: 'star-b',
      state: 'active',
      screenX: 402,
      screenY: 401,
      camDist: 12,
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 1000,
    });

    // Passive star overlapping at same location
    manager.register({
      id: 'passive-bg',
      state: 'passive',
      screenX: 401,
      screenY: 400,
      camDist: 40,
      reticleRadius: 30,
      starRadius: 2,
      hasReticle: false,
      visible: true,
      updatedAt: 1000,
    });

    // Cyclic selection should cycle only between star-a and star-b
    expect(manager.getCyclicSelectionTarget('star-a')).toBe('star-b');
    expect(manager.getCyclicSelectionTarget('star-b')).toBe('star-a');

    // Calling cyclic selection on the passive star itself returns the passive star without cycling
    expect(manager.getCyclicSelectionTarget('passive-bg')).toBe('passive-bg');
  });

  it('preserves lastEvaluationTime on stationary evaluate calls for O(1) hitarea cache hits', () => {
    const manager = new CelestialOcclusionManager();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.updateMatrixWorld();

    manager.register({
      id: 'star-cache-test',
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

    manager.evaluate(camera, { width: 1920, height: 1080 });
    const fp = manager.getFootprint('star-cache-test')!;
    const firstEvalTime = fp.hitAreaEvaluatedAt;
    expect(firstEvalTime).toBeGreaterThan(0);

    // Call evaluate again on stationary frame
    manager.evaluate(camera, { width: 1920, height: 1080 });
    manager.evaluateHitAreaOffset('star-cache-test');
    expect(fp.hitAreaEvaluatedAt).toBe(firstEvalTime);
  });

  it('avoids rebuilding stalked snapshots or significant footprints when registering passive nodes', () => {
    const manager = new CelestialOcclusionManager();
    const initialSnapshot = manager.getStalkedFootprintsSnapshot();

    manager.register({
      id: 'passive-star-1',
      state: 'passive',
      screenX: 0,
      screenY: 0,
      worldPos: [0, 0, 0],
      reticleRadius: 30,
      starRadius: 4,
      hasReticle: false,
      hasStalk: false,
      visible: true,
      updatedAt: 0,
    });

    expect(manager.getStalkedFootprintsSnapshot()).toBe(initialSnapshot);
  });
});
