import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import {
  computeMarkerDotWorldScale,
  getPointerCoord,
  syncBodyMarkerHitareaTransform,
  type BillboardSyncState,
} from './bodyMarkerHelpers';

describe('bodyMarkerHelpers', () => {
  it('extracts pointer coordinates from ThreeEvent or nativeEvent', () => {
    expect(getPointerCoord({ clientX: 12, clientY: 34 } as ThreeEvent<PointerEvent>)).toEqual({
      x: 12,
      y: 34,
    });
    expect(
      getPointerCoord({ nativeEvent: { clientX: 56, clientY: 78 } } as ThreeEvent<PointerEvent>),
    ).toEqual({ x: 56, y: 78 });
    expect(getPointerCoord({} as ThreeEvent<PointerEvent>)).toEqual({ x: 0, y: 0 });
  });

  it('computes screen-invariant dot world scale for perspective and orthographic cameras', () => {
    const persp = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    const scalePersp = computeMarkerDotWorldScale(persp, 10, 5, 900);
    expect(scalePersp).toBeGreaterThan(0);

    const ortho = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 1000);
    const scaleOrtho = computeMarkerDotWorldScale(ortho, 10, 5, 900);
    expect(scaleOrtho).toBeGreaterThan(0);
  });

  it('synchronises billboard orientation, hitarea scale, and fan-out offset when changed', () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.updateMatrixWorld();

    const billboard = new THREE.Group();
    const hitarea = new THREE.Mesh();
    const lastSync: BillboardSyncState = {
      qx: Number.NaN,
      qy: Number.NaN,
      qz: Number.NaN,
      qw: Number.NaN,
      scale: Number.NaN,
      hx: Number.NaN,
      hy: Number.NaN,
    };

    syncBodyMarkerHitareaTransform(
      camera,
      10,
      800,
      new THREE.Vector3(0, 0, 0),
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      12,
      -6,
      billboard,
      hitarea,
      lastSync,
    );

    expect(lastSync.qw).toBe(camera.quaternion.w);
    expect(hitarea.scale.x).toBeGreaterThan(0);
    expect(hitarea.position.x).toBeGreaterThan(0);
    expect(hitarea.position.y).toBeGreaterThan(0);
  });
});
