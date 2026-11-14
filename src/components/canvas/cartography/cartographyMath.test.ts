import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  computeCardinalAlignment,
  computeTransitionWeights,
  computeZoomAdaptiveRings,
  createStyledLinePoints,
  populateDashedLineBuffer,
  createGalacticPlanarGridGeometry,
  populateCurvedDashedLineBuffer,
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from './cartographyMath';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';

describe('cartographyMath', () => {
  beforeEach(() => {
    useThreeTokenStore.getState().resetTokens();
  });

  describe('computeCardinalAlignment', () => {
    it('computes cardinal alignment factors correctly across perspective and cardinal views', () => {
      // 1. Fully perspective view [1, 1, 1] normalized: all alignment factors must be 0
      const perspDir = new THREE.Vector3(1, 1, 1).normalize();
      const perspAlignment = computeCardinalAlignment(perspDir);
      expect(perspAlignment.alphaX).toBe(0);
      expect(perspAlignment.alphaY).toBe(0);
      expect(perspAlignment.alphaZ).toBe(0);
      expect(perspAlignment.maxAlpha).toBe(0);

      // 2. Plan view looking along +Z: alphaZ = 1, alphaX = 0, alphaY = 0
      const planDir = new THREE.Vector3(0, 0, 1);
      const planAlignment = computeCardinalAlignment(planDir);
      expect(planAlignment.alphaZ).toBe(1);
      expect(planAlignment.alphaX).toBe(0);
      expect(planAlignment.alphaY).toBe(0);
      expect(planAlignment.maxAlpha).toBe(1);

      // 3. Plan view looking along -Z (from below): alphaZ = 1 (symmetric)
      const planNegDir = new THREE.Vector3(0, 0, -1);
      const planNegAlignment = computeCardinalAlignment(planNegDir);
      expect(planNegAlignment.alphaZ).toBe(1);

      // 4. Looking along +X: alphaX = 1
      const xDir = new THREE.Vector3(1, 0, 0);
      const xAlignment = computeCardinalAlignment(xDir);
      expect(xAlignment.alphaX).toBe(1);
      expect(xAlignment.alphaZ).toBe(0);

      // 5. Looking along +Y: alphaY = 1
      const yDir = new THREE.Vector3(0, 1, 0);
      const yAlignment = computeCardinalAlignment(yDir);
      expect(yAlignment.alphaY).toBe(1);
      expect(yAlignment.alphaZ).toBe(0);

      // 6. Tightened threshold: ~25 deg off-axis has alpha = 0 (preserved perspective view)
      const wideZDir = new THREE.Vector3(0.42, 0, 0.9).normalize();
      expect(computeCardinalAlignment(wideZDir).alphaZ).toBe(0);

      // 7. Right up close (< 20 deg, ~11 deg from Z): intermediate transition
      const nearZDir = new THREE.Vector3(0.18, 0, 0.98).normalize();
      const nearZAlignment = computeCardinalAlignment(nearZDir);
      expect(nearZAlignment.alphaZ).toBeGreaterThan(0);
      expect(nearZAlignment.alphaZ).toBeLessThan(1);
    });
  });

  describe('computeTransitionWeights', () => {
    it('computes transition weights correctly for double-segment axis transitions', () => {
      // 1. Perspective view away from axes: zero transition weights
      const perspDir = new THREE.Vector3(1, 1, 1).normalize();
      const pWeights = computeTransitionWeights(perspDir);
      expect(pWeights.wTransX).toBe(0);
      expect(pWeights.wTransY).toBe(0);
      expect(pWeights.wTransZ).toBe(0);

      // 2. Approaching X=0 plane (|camDir.x| = 0.1 < 0.35): wTransX > 0, others 0
      const transXDir = new THREE.Vector3(0.1, 0.7, 0.7).normalize();
      const tWeights = computeTransitionWeights(transXDir);
      expect(tWeights.wTransX).toBeGreaterThan(0);
      expect(tWeights.wTransX).toBeLessThanOrEqual(1);
      expect(tWeights.wTransY).toBe(0);
      expect(tWeights.wTransZ).toBe(0);

      // 3. Inside full circle threshold (maxAlpha = 1): transition weights suppressed
      const suppressedWeights = computeTransitionWeights(transXDir, 0.35, 1.0);
      expect(suppressedWeights.wTransX).toBe(0);
    });
  });

  describe('computeZoomAdaptiveRings', () => {
    it('computes logarithmic 1-2-5 zoom-adaptive rings with significant hierarchy and fade envelopes', () => {
      // 1. Edge case: zero or negative aperture returns empty array
      expect(computeZoomAdaptiveRings(0)).toEqual([]);
      expect(computeZoomAdaptiveRings(-5)).toEqual([]);

      // 2. Standard scale rAperture = 10
      const rings10 = computeZoomAdaptiveRings(10);
      expect(rings10.length).toBeGreaterThan(0);
      expect(rings10.length).toBeLessThanOrEqual(6);

      // Verify ascending order
      for (let i = 1; i < rings10.length; i++) {
        expect(rings10[i].radius).toBeGreaterThan(rings10[i - 1].radius);
      }

      // Check isMajor classification: powers of 10 must have isMajor = true, subdivisions false
      const ring1 = rings10.find((r) => Math.abs(r.radius - 1) < 1e-4);
      const ring2 = rings10.find((r) => Math.abs(r.radius - 2) < 1e-4);
      const ring5 = rings10.find((r) => Math.abs(r.radius - 5) < 1e-4);
      const ring10 = rings10.find((r) => Math.abs(r.radius - 10) < 1e-4);

      if (ring1) expect(ring1.isMajor).toBe(true);
      if (ring2) expect(ring2.isMajor).toBe(false);
      if (ring5) expect(ring5.isMajor).toBe(false);
      if (ring10) expect(ring10.isMajor).toBe(true);

      // Verify mid-aperture ring has full fade factor
      if (ring5) {
        // rho = 5/10 = 0.5, well within [0.15, 0.85] -> fade = 1.0
        expect(ring5.fade).toBeCloseTo(1.0, 3);
      }

      // 3. Zoomed-in scale (rAperture = 2.0) produces fractional metric rings
      const ringsZoomedIn = computeZoomAdaptiveRings(2.0);
      expect(ringsZoomedIn.some((r) => r.radius < 1.0)).toBe(true);

      // 4. Zoomed-out scale (rAperture = 100) produces larger metric rings
      const ringsZoomedOut = computeZoomAdaptiveRings(100);
      expect(ringsZoomedOut.some((r) => r.radius >= 10)).toBe(true);

      // 5. Max rings parameter truncation
      const capped = computeZoomAdaptiveRings(10, 3);
      expect(capped.length).toBeLessThanOrEqual(3);
    });
  });

  describe('createStyledLinePoints', () => {
    it('creates unstretched styled line points for solid, dashed, and dotted styles', () => {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(0, 0, 3);

      const solidPts = createStyledLinePoints(p1, p2, 'solid');
      expect(solidPts.length).toBe(2);

      const dashedPts = createStyledLinePoints(p1, p2, 'dashed');
      expect(dashedPts.length).toBeGreaterThan(4);
      // Segment pairs (must be even)
      expect(dashedPts.length % 2).toBe(0);

      const dottedPts = createStyledLinePoints(p1, p2, 'dotted');
      expect(dottedPts.length).toBeGreaterThan(4);
      expect(dottedPts.length % 2).toBe(0);
    });
  });

  describe('populateDashedLineBuffer', () => {
    it('populates zero-allocation dashed line buffer with accurate vertex counts', () => {
      const buffer = new Float32Array(600);
      const vCount = populateDashedLineBuffer(buffer, 10, [0, 1, 0]);
      expect(vCount).toBeGreaterThan(0);
      expect(vCount % 2).toBe(0);
      // First dash starts at 0, 0, 0
      expect(buffer[0]).toBe(0);
      expect(buffer[1]).toBe(0);
      expect(buffer[2]).toBe(0);
    });
  });

  describe('createGalacticPlanarGridGeometry', () => {
    it('creates galactic planar grid geometry with concentric arcs and radial rays', () => {
      const geom = createGalacticPlanarGridGeometry(40, 20, 250);
      expect(geom).toBeInstanceOf(THREE.BufferGeometry);
      const posAttr = geom.getAttribute('position');
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(0);
      geom.dispose();
    });

    it('omits Y=0 axis line in galactic planar grid entirely when omitCoreAxis is true, and clips strictly to domain', () => {
      // With omitCoreAxis = true (default)
      const geomOmit = createGalacticPlanarGridGeometry(100, 50, 500, 16, true);
      const posOmit = geomOmit.getAttribute('position');
      let foundYZeroSegment = false;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < posOmit.count; i += 2) {
        const y1 = posOmit.getY(i);
        const y2 = posOmit.getY(i + 1);
        const x1 = posOmit.getX(i);
        const x2 = posOmit.getX(i + 1);

        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxY = Math.max(maxY, y1, y2);

        // Look for any radial ray on the y=0 axis line (neither positive nor negative X)
        if (Math.abs(y1) < 1e-4 && Math.abs(y2) < 1e-4) {
          foundYZeroSegment = true;
        }
      }

      // No ray along Y=0 (Core axis is reserved for bearing line, not extending away from core)
      expect(foundYZeroSegment).toBe(false);
      // All vertices strictly contained in [-100, 100] x [-100, 100]
      expect(minX).toBeGreaterThanOrEqual(-100 - 1e-4);
      expect(maxX).toBeLessThanOrEqual(100 + 1e-4);
      expect(minY).toBeGreaterThanOrEqual(-100 - 1e-4);
      expect(maxY).toBeLessThanOrEqual(100 + 1e-4);
      geomOmit.dispose();

      // With omitCoreAxis = false, y=0 axis line does extend across the domain
      const geomFull = createGalacticPlanarGridGeometry(100, 50, 500, 16, false);
      const posFull = geomFull.getAttribute('position');
      let foundFullPositiveX = false;
      for (let i = 0; i < posFull.count; i += 2) {
        const y1 = posFull.getY(i);
        const y2 = posFull.getY(i + 1);
        const x1 = posFull.getX(i);
        const x2 = posFull.getX(i + 1);
        if (Math.abs(y1) < 1e-4 && Math.abs(y2) < 1e-4) {
          if (x1 > 1e-4 || x2 > 1e-4) {
            foundFullPositiveX = true;
          }
        }
      }
      expect(foundFullPositiveX).toBe(true);
      geomFull.dispose();
    });
  });

  describe('populateCurvedDashedLineBuffer', () => {
    it('populates curved dashed line buffer following circular orbit around galactic center', () => {
      const buffer = new Float32Array(600);
      const rGc = 1000;
      // 1. Prograde (+Y)
      const vCount = populateCurvedDashedLineBuffer(buffer, 10, rGc, 1);
      expect(vCount).toBeGreaterThan(0);
      expect(vCount % 2).toBe(0);
      // First dash starts at 0, 0, 0
      expect(buffer[0]).toBe(0);
      expect(buffer[1]).toBe(0);
      expect(buffer[2]).toBe(0);

      // Dash end curves towards +X (Galactic Centre) with positive Y
      expect(buffer[3]).toBeGreaterThan(0); // x2 > 0
      expect(buffer[4]).toBeGreaterThan(0); // y2 > 0

      // 2. Retrograde / Anti-orbital (-Y)
      const bufferAnti = new Float32Array(600);
      const vCountAnti = populateCurvedDashedLineBuffer(bufferAnti, 10, rGc, -1);
      expect(vCountAnti).toBeGreaterThan(0);
      // First dash starts at 0, 0, 0
      expect(bufferAnti[0]).toBe(0);
      expect(bufferAnti[1]).toBe(0);
      // End curves towards +X (Galactic Centre) with negative Y
      expect(bufferAnti[3]).toBeGreaterThan(0); // x2 > 0
      expect(bufferAnti[4]).toBeLessThan(0); // y2 < 0

      // 3. Invalid inputs return 0
      expect(populateCurvedDashedLineBuffer(buffer, 0, rGc)).toBe(0);
      expect(populateCurvedDashedLineBuffer(buffer, 10, -50)).toBe(0);
    });
  });

  describe('getStandardInitialCamera', () => {
    it('computes canonical standard initial camera setup with correct orientation and bearings', () => {
      const target: [number, number, number] = [0, 0, 0];
      const setup = getStandardInitialCamera(STANDARD_CAMERA_DISTANCES.galactic, target);

      // Camera is elevated above the Z axis (z > 0)
      expect(setup.position[2]).toBeGreaterThan(target[2]);

      // Camera is located at negative X, facing the direction of the Core Bearing (+X)
      expect(setup.position[0]).toBeLessThan(target[0]);

      // Camera is offset in -Y away from the Orbital Bearing (+Y)
      expect(setup.position[1]).toBeLessThan(target[1]);

      // Camera up-vector is Galactic North (+Z)
      expect(setup.up).toEqual([0, 0, 1]);

      // Forward gaze vector check
      const cam = new THREE.PerspectiveCamera(setup.fov, 1, 0.1, 1000);
      cam.up.set(setup.up[0], setup.up[1], setup.up[2]);
      cam.position.set(setup.position[0], setup.position[1], setup.position[2]);
      cam.lookAt(target[0], target[1], target[2]);

      const gaze = new THREE.Vector3();
      cam.getWorldDirection(gaze);

      // Forward gaze has positive X (facing Core bearing)
      expect(gaze.x).toBeGreaterThan(0.7);
      // Forward gaze has positive Y (looking slightly toward center from -Y)
      expect(gaze.y).toBeGreaterThan(0.1);
      // Forward gaze has negative Z (looking downward from above +Z)
      expect(gaze.z).toBeLessThan(-0.4);
    });

    it('supports custom target and fov in getStandardInitialCamera', () => {
      const target: [number, number, number] = [35, 45, 12];
      const setup = getStandardInitialCamera(20, target, 50);

      expect(setup.fov).toBe(50);
      expect(setup.target).toEqual(target);
      expect(setup.position[0]).toBeLessThan(target[0]);
      expect(setup.position[1]).toBeLessThan(target[1]);
      expect(setup.position[2]).toBeGreaterThan(target[2]);
      expect(setup.up).toEqual([0, 0, 1]);
    });
  });
});
