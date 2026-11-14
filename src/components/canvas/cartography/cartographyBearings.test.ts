import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { calculateScreenEdgeBearing } from './cartographyMath';

describe('cartographyMath - calculateScreenEdgeBearing', () => {
  it('calculates screen-edge intersection for attached Core bearing (+X)', () => {
    const cam = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 1000);
    cam.position.set(0, -25, 10);
    cam.up.set(0, 0, 1);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    const res = calculateScreenEdgeBearing(cam, { width: 1920, height: 1080 }, 28, 'core');
    expect(res.visible).toBe(true);
    expect(res.isAttached).toBe(true);
    expect(res.edge).toBe('right');
    expect(res.x).toBeCloseTo(1892, 0); // 1920 - 28 margin
    expect(res.y).toBeCloseTo(540, 0);  // Center Y
    expect(res.angle).toBeCloseTo(0, 1); // Pointing right
  });

  it('calculates screen-edge intersection for attached Orbital bearing (+Y)', () => {
    const cam = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 1000);
    cam.position.set(0, -25, 10);
    cam.up.set(0, 0, 1);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    const res = calculateScreenEdgeBearing(cam, { width: 1920, height: 1080 }, 28, 'orbital');
    expect(res.visible).toBe(true);
    expect(res.isAttached).toBe(true);
    expect(res.edge).toBe('top');
    expect(res.y).toBeCloseTo(28, 0); // Top margin 28
  });

  it('detaches and pins to screen edge when camera is oriented away from bearing line', () => {
    const cam = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 1000);
    // Looking along +Y, so +X Core is off to the right
    cam.position.set(0, 0, 10);
    cam.up.set(0, 0, 1);
    cam.lookAt(0, 50, 10);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    const resCore = calculateScreenEdgeBearing(cam, { width: 1920, height: 1080 }, 28, 'core');
    expect(resCore.visible).toBe(true);
    expect(resCore.isAttached).toBe(false);
    expect(resCore.edge).toBe('right');
    expect(resCore.x).toBe(1892);

    // Looking along -Y, so +X Core is off to the left
    cam.lookAt(0, -50, 10);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    const resCoreLeft = calculateScreenEdgeBearing(cam, { width: 1920, height: 1080 }, 28, 'core');
    expect(resCoreLeft.visible).toBe(true);
    expect(resCoreLeft.isAttached).toBe(false);
    expect(resCoreLeft.edge).toBe('left');
    expect(resCoreLeft.x).toBe(28);
  });

  it('respects custom screen margins and non-zero origins', () => {
    const cam = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
    const origin = new THREE.Vector3(100, 200, 50);
    cam.position.set(100, 175, 60); // Offset (0, -25, 10) relative to origin
    cam.up.set(0, 0, 1);
    cam.lookAt(100, 200, 50);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    const res = calculateScreenEdgeBearing(
      cam,
      { width: 800, height: 600 },
      40, // 40px margin
      'core',
      origin,
    );
    expect(res.visible).toBe(true);
    expect(res.isAttached).toBe(true);
    expect(res.edge).toBe('right');
    expect(res.x).toBeCloseTo(760, 0); // 800 - 40 margin
    expect(res.y).toBeCloseTo(300, 0); // Center Y
  });

  it('anchors indicator at line terminus when bearing line ends on-screen', () => {
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    cam.position.set(0, 0, 50);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    // Extent 10 produces a ~241px line on a 1000x1000 screen, ending inside margin bounds
    const res = calculateScreenEdgeBearing(
      cam,
      { width: 1000, height: 1000 },
      28,
      'core',
      new THREE.Vector3(0, 0, 0),
      2000,
      10, // extent 10
      undefined,
      40, // minLineLength 40
    );

    expect(res.visible).toBe(true);
    expect(res.isAttached).toBe(true);
    expect(res.edge).toBe('none');
    expect(res.x).toBeGreaterThan(600);
    expect(res.x).toBeLessThan(900);
    expect(res.y).toBeCloseTo(500, 0);
    expect(res.angle).toBeCloseTo(0, 1);
  });

  it('suppresses indicator when bearing line length on-screen is below minLineLength', () => {
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    cam.position.set(0, 0, 50);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    // Extent 1 produces ~24px line on 1000x1000 screen (< 40px minLineLength)
    const res = calculateScreenEdgeBearing(
      cam,
      { width: 1000, height: 1000 },
      28,
      'core',
      new THREE.Vector3(0, 0, 0),
      2000,
      1, // extent 1
      undefined,
      40, // minLineLength 40
    );

    expect(res.visible).toBe(false);
  });
});
