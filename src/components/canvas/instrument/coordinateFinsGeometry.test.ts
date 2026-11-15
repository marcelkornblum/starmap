import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  PLANES,
  buildAllFinGeometries,
  disposeAllFinGeometries,
  updateCoordinateFinsFrame,
} from './coordinateFinsGeometry';

describe('coordinateFinsGeometry', () => {
  it('builds quadrant, tick, and baseline geometries for all 3 orthogonal planes', () => {
    const geoms = buildAllFinGeometries();
    for (const plane of PLANES) {
      expect(geoms.quadrantGeoms[plane]).toHaveLength(4);
      expect(geoms.tickGeoms[plane]).toHaveLength(4);
      expect(geoms.baselineGeoms[plane]).toHaveLength(4);

      geoms.quadrantGeoms[plane].forEach((g) => {
        expect(g).toBeInstanceOf(THREE.BufferGeometry);
        expect(g.boundingSphere).not.toBeNull();
      });
      geoms.tickGeoms[plane].forEach((g) => {
        expect(g).toBeInstanceOf(THREE.BufferGeometry);
        expect(g.boundingSphere).not.toBeNull();
      });
      geoms.baselineGeoms[plane].forEach((g) => {
        expect(g).toBeInstanceOf(THREE.BufferGeometry);
        expect(g.boundingSphere).not.toBeNull();
      });
    }

    const disposeSpies = [
      ...geoms.quadrantGeoms.xy.map((g) => vi.spyOn(g, 'dispose')),
      ...geoms.tickGeoms.xy.map((g) => vi.spyOn(g, 'dispose')),
      ...geoms.baselineGeoms.xy.map((g) => vi.spyOn(g, 'dispose')),
    ];
    disposeAllFinGeometries(geoms);
    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalled());
  });

  it('updates lines and material scales and opacities per frame based on aperture and weights', () => {
    const dummyLine = new THREE.LineSegments();
    const dummyMat = new THREE.LineBasicMaterial();

    const perimeterLines = { xy: [dummyLine, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] };
    const perimeterMats = { xy: [dummyMat, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] };
    const baselineLines = { xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] };
    const baselineMats = { xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] };
    const tickLines = { xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] };
    const tickMats = { xy: [null, null, null, null], xz: [null, null, null, null], yz: [null, null, null, null] };
    const quadLines = { xy: [[dummyLine, null, null, null]], xz: [[]], yz: [[]] };
    const quadMats = { xy: [[dummyMat, null, null, null]], xz: [[]], yz: [[]] };

    updateCoordinateFinsFrame(
      perimeterLines,
      perimeterMats,
      baselineLines,
      baselineMats,
      tickLines,
      tickMats,
      quadLines,
      quadMats,
      15,
      { qwXY: [1, 0, 0, 0], qwXZ: [0, 0, 0, 0], qwYZ: [0, 0, 0, 0], fadeXY: 0.8, fadeXZ: 0, fadeYZ: 0 },
      0.5,
      0.3,
      0.6,
      0.2,
      [{ radius: 10, isMajor: true, fade: 1 }],
      1,
      1,
    );

    expect(dummyLine.scale.x).toBe(10);
    expect(dummyLine.visible).toBe(true);
    expect(dummyMat.opacity).toBeCloseTo(0.6 * 1.0 * 0.8 * 1.0);
  });
});
