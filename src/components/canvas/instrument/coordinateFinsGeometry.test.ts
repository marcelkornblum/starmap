import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  QUADRANT_STEPS,
  DEGREE_TICKS,
} from '../cartography/cartographyFinsAndTicks';
import {
  PLANES,
  MAX_FIN_RING_POOL,
  clampFinPoolSize,
  buildAllFinGeometries,
  disposeAllFinGeometries,
  createAllFinMaterials,
  disposeAllFinMaterials,
  updateCoordinateFinsFrame,
} from './coordinateFinsGeometry';

describe('coordinateFinsGeometry', () => {
  it('builds merged perimeter, tick, and pooled arc geometries for all 3 orthogonal planes', () => {
    const geoms = buildAllFinGeometries(8);

    for (const plane of PLANES) {
      const perim = geoms.perimeterGeoms[plane];
      const ticks = geoms.tickGeoms[plane];
      const arcs = geoms.arcGeoms[plane];

      expect(perim).toBeInstanceOf(THREE.BufferGeometry);
      expect(ticks).toBeInstanceOf(THREE.BufferGeometry);
      expect(arcs).toBeInstanceOf(THREE.BufferGeometry);

      expect(perim.boundingSphere).not.toBeNull();
      expect(ticks.boundingSphere).not.toBeNull();
      expect(arcs.boundingSphere).not.toBeNull();

      // Perimeter: 4 quadrant arcs + 4 baseline spokes (xy has 2 spokes/quad = 4 verts, xz/yz have 1 spoke/quad = 2 verts)
      const arcVertsPerQuad = QUADRANT_STEPS * 2;
      const baselineVertsPerQuad = plane === 'xy' ? 4 : 2;
      const expectedPerimVerts = 4 * (arcVertsPerQuad + baselineVertsPerQuad);
      expect(perim.getAttribute('position').count).toBe(expectedPerimVerts);
      const perimQuadAttr = perim.getAttribute('aQuadrant');
      expect(perimQuadAttr).toBeDefined();
      expect(perimQuadAttr.itemSize).toBe(1);
      expect(perimQuadAttr.count).toBe(expectedPerimVerts);

      const perimQuadSet = new Set(Array.from(perimQuadAttr.array as Float32Array));
      expect(perimQuadSet).toEqual(new Set([0, 1, 2, 3]));

      // Ticks: 4 quadrants * DEGREE_TICKS.length * 2 vertices
      const expectedTickVerts = 4 * DEGREE_TICKS.length * 2;
      expect(ticks.getAttribute('position').count).toBe(expectedTickVerts);
      const tickQuadAttr = ticks.getAttribute('aQuadrant');
      expect(tickQuadAttr).toBeDefined();
      expect(tickQuadAttr.itemSize).toBe(1);
      expect(new Set(Array.from(tickQuadAttr.array as Float32Array))).toEqual(new Set([0, 1, 2, 3]));

      // Arcs: 8 rings * 4 quadrants * arcVertsPerQuad
      const expectedArcVerts = 8 * 4 * arcVertsPerQuad;
      expect(arcs.getAttribute('position').count).toBe(expectedArcVerts);
      const arcQuadAttr = arcs.getAttribute('aQuadrant');
      const arcRingAttr = arcs.getAttribute('aRingIndex');
      expect(arcQuadAttr.itemSize).toBe(1);
      expect(arcRingAttr.itemSize).toBe(1);
      expect(new Set(Array.from(arcQuadAttr.array as Float32Array))).toEqual(new Set([0, 1, 2, 3]));
      expect(new Set(Array.from(arcRingAttr.array as Float32Array))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
    }

    const disposeSpies = PLANES.flatMap((plane) => [
      vi.spyOn(geoms.perimeterGeoms[plane], 'dispose'),
      vi.spyOn(geoms.tickGeoms[plane], 'dispose'),
      vi.spyOn(geoms.arcGeoms[plane], 'dispose'),
    ]);
    disposeAllFinGeometries(geoms);
    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  });

  it('clamps poolSize cleanly between 1 and MAX_FIN_RING_POOL (16)', () => {
    expect(clampFinPoolSize(0)).toBe(1);
    expect(clampFinPoolSize(-5)).toBe(1);
    expect(clampFinPoolSize(8)).toBe(8);
    expect(clampFinPoolSize(MAX_FIN_RING_POOL + 10)).toBe(MAX_FIN_RING_POOL);

    const clampedGeoms = buildAllFinGeometries(MAX_FIN_RING_POOL + 8);
    const expectedArcVerts = MAX_FIN_RING_POOL * 4 * QUADRANT_STEPS * 2;
    expect(clampedGeoms.arcGeoms.xy.getAttribute('position').count).toBe(expectedArcVerts);
    const ringIndices = new Set(Array.from(clampedGeoms.arcGeoms.xy.getAttribute('aRingIndex').array as Float32Array));
    expect(ringIndices.size).toBe(MAX_FIN_RING_POOL);
    disposeAllFinGeometries(clampedGeoms);
  });

  it('creates and disposes consolidated ShaderMaterials for all 3 planes (9 materials total)', () => {
    const mats = createAllFinMaterials();

    for (const plane of PLANES) {
      const planeMats = mats[plane];
      for (const layerMat of [planeMats.perimeter, planeMats.ticks, planeMats.arcs]) {
        expect(layerMat).toBeInstanceOf(THREE.ShaderMaterial);
        expect(layerMat.transparent).toBe(true);
        expect(layerMat.depthWrite).toBe(false);
        expect(layerMat.uniforms.uColor.value).toBeInstanceOf(THREE.Color);
        expect(layerMat.uniforms.uQuadWeights.value).toBeInstanceOf(THREE.Vector4);
      }
      expect(planeMats.perimeter.uniforms.uBaseAlpha).toBeDefined();
      expect(planeMats.perimeter.uniforms.uApertureRadius).toBeDefined();
      expect(planeMats.ticks.uniforms.uBaseAlpha).toBeDefined();
      expect(planeMats.ticks.uniforms.uApertureRadius).toBeDefined();
      expect(planeMats.arcs.uniforms.uRingRadii.value).toBeInstanceOf(Float32Array);
      expect((planeMats.arcs.uniforms.uRingRadii.value as Float32Array).length).toBe(MAX_FIN_RING_POOL);
      expect(planeMats.arcs.uniforms.uRingAlphas.value).toBeInstanceOf(Float32Array);
      expect((planeMats.arcs.uniforms.uRingAlphas.value as Float32Array).length).toBe(MAX_FIN_RING_POOL);
    }

    const disposeSpies = PLANES.flatMap((plane) => [
      vi.spyOn(mats[plane].perimeter, 'dispose'),
      vi.spyOn(mats[plane].ticks, 'dispose'),
      vi.spyOn(mats[plane].arcs, 'dispose'),
    ]);
    disposeAllFinMaterials(mats);
    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  });

  it('updates shader uniforms in-place and toggles visibility based on grazingFade and active rings', () => {
    const mats = createAllFinMaterials();
    const perimeterLines = { xy: new THREE.LineSegments(), xz: new THREE.LineSegments(), yz: new THREE.LineSegments() };
    const tickLines = { xy: new THREE.LineSegments(), xz: new THREE.LineSegments(), yz: new THREE.LineSegments() };
    const arcLines = { xy: new THREE.LineSegments(), xz: new THREE.LineSegments(), yz: new THREE.LineSegments() };

    const radiiRefBefore = mats.xy.arcs.uniforms.uRingRadii.value;
    const alphasRefBefore = mats.xy.arcs.uniforms.uRingAlphas.value;
    const qwRefBefore = mats.xy.perimeter.uniforms.uQuadWeights.value;

    updateCoordinateFinsFrame(
      perimeterLines,
      tickLines,
      arcLines,
      mats,
      15,
      {
        qwXY: [1, 0.5, 0, 0.25],
        qwXZ: [0, 0, 0, 0],
        qwYZ: [0.3, 0.7, 0, 0],
        fadeXY: 0.8,
        fadeXZ: 0,
        fadeYZ: 0.0005,
      },
      0.6,
      0.2,
      [
        { radius: 2.5, isMajor: false, fade: 0.5 },
        { radius: 10, isMajor: true, fade: 1.0 },
      ],
      2,
      8,
    );

    // Zero allocations: same uniform objects mutated in-place
    expect(mats.xy.arcs.uniforms.uRingRadii.value).toBe(radiiRefBefore);
    expect(mats.xy.arcs.uniforms.uRingAlphas.value).toBe(alphasRefBefore);
    expect(mats.xy.perimeter.uniforms.uQuadWeights.value).toBe(qwRefBefore);

    // XY plane visible
    expect(perimeterLines.xy.visible).toBe(true);
    expect(tickLines.xy.visible).toBe(true);
    expect(arcLines.xy.visible).toBe(true);

    expect(mats.xy.perimeter.uniforms.uApertureRadius.value).toBe(15);
    expect(mats.xy.perimeter.uniforms.uGrazingFade.value).toBeCloseTo(0.8);
    expect((mats.xy.perimeter.uniforms.uQuadWeights.value as THREE.Vector4).toArray()).toEqual([1, 0.5, 0, 0.25]);

    expect(mats.xy.ticks.uniforms.uApertureRadius.value).toBe(15);
    expect(mats.xy.ticks.uniforms.uGrazingFade.value).toBeCloseTo(0.8);
    expect((mats.xy.ticks.uniforms.uQuadWeights.value as THREE.Vector4).toArray()).toEqual([1, 0.5, 0, 0.25]);

    expect(mats.xy.arcs.uniforms.uGrazingFade.value).toBeCloseTo(0.8);
    expect((mats.xy.arcs.uniforms.uRingRadii.value as Float32Array)[0]).toBe(2.5);
    expect((mats.xy.arcs.uniforms.uRingAlphas.value as Float32Array)[0]).toBeCloseTo(0.2 * 0.5);
    expect((mats.xy.arcs.uniforms.uRingRadii.value as Float32Array)[1]).toBe(10);
    expect((mats.xy.arcs.uniforms.uRingAlphas.value as Float32Array)[1]).toBeCloseTo(0.6 * 1.0);
    expect((mats.xy.arcs.uniforms.uRingRadii.value as Float32Array)[2]).toBe(0);
    expect((mats.xy.arcs.uniforms.uRingAlphas.value as Float32Array)[2]).toBe(0);

    // XZ and YZ planes collapsed (fade <= 1e-3) -> 0 draw calls
    expect(perimeterLines.xz.visible).toBe(false);
    expect(tickLines.xz.visible).toBe(false);
    expect(arcLines.xz.visible).toBe(false);
    expect(perimeterLines.yz.visible).toBe(false);
    expect(tickLines.yz.visible).toBe(false);
    expect(arcLines.yz.visible).toBe(false);

    // When numActive === 0, arcs are hidden even if plane grazingFade > 1e-3
    updateCoordinateFinsFrame(
      perimeterLines,
      tickLines,
      arcLines,
      mats,
      15,
      {
        qwXY: [1, 0, 0, 0],
        qwXZ: [0, 0, 0, 0],
        qwYZ: [0, 0, 0, 0],
        fadeXY: 0.9,
        fadeXZ: 0,
        fadeYZ: 0,
      },
      0.6,
      0.2,
      [],
      0,
      8,
    );
    expect(perimeterLines.xy.visible).toBe(true);
    expect(tickLines.xy.visible).toBe(true);
    expect(arcLines.xy.visible).toBe(false);

    disposeAllFinMaterials(mats);
  });
});
