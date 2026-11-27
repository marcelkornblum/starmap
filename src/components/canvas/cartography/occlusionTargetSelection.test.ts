import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  isReticleSuppressedBySignificant,
  collectSignificantFootprints,
  projectFootprint,
} from './occlusionTargetSelection';
import type { CelestialFootprint } from './occlusionTypes';

describe('occlusionTargetSelection', () => {
  it('suppresses background reticles colliding under significant foreground reticles', () => {
    const significant: CelestialFootprint = {
      id: 'sig',
      state: 'selected',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const background: CelestialFootprint = {
      id: 'bg',
      state: 'active',
      screenX: 102,
      screenY: 101,
      camDist: 20,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };

    expect(isReticleSuppressedBySignificant(background, [significant])).toBe(true);
    expect(isReticleSuppressedBySignificant(significant, [significant])).toBe(false);
  });

  it('collects visible significant reticle footprints', () => {
    const footprints: CelestialFootprint[] = [
      { id: '1', state: 'active', screenX: 0, screenY: 0, reticleRadius: 10, starRadius: 2, hasReticle: true, visible: true, updatedAt: 0 },
      { id: '2', state: 'focused', screenX: 0, screenY: 0, reticleRadius: 10, starRadius: 2, hasReticle: true, visible: true, updatedAt: 0 },
    ];
    const sig = collectSignificantFootprints(footprints);
    expect(sig.length).toBe(1);
    expect(sig[0].id).toBe('2');
  });

  it('marks footprint invisible and leaves screen coords untouched when camera or projection is non-finite or viewport is collapsed', () => {
    const fp: CelestialFootprint = {
      id: 'star-nan',
      state: 'active',
      screenX: 120,
      screenY: 240,
      worldPos: [1, 2, 3],
      reticleRadius: 15,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    };

    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    camera.position.set(Number.NaN, 0, 10);
    camera.updateMatrixWorld();

    const scratchVec = new THREE.Vector3();
    const scratchCam = new THREE.Vector3();

    projectFootprint(fp, camera, { width: 1440, height: 900 }, scratchVec, scratchCam, 0.1, 500);
    expect(fp.visible).toBe(false);
    expect(fp.updatedAt).toBe(500);
    expect(Number.isFinite(fp.screenX)).toBe(true);
    expect(Number.isFinite(fp.screenY)).toBe(true);

    // Also guard collapsed viewport size (0x0)
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    fp.visible = true;
    projectFootprint(fp, camera, { width: 0, height: 900 }, scratchVec, scratchCam, 0.1, 600);
    expect(fp.visible).toBe(false);
    expect(fp.updatedAt).toBe(600);
  });
});
