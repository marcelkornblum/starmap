import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  CartographicGrid,
  CelestialNode,
  OrbitalRing,
  computeCardinalAlignment,
  computeTransitionWeights,
  computeZoomAdaptiveRings,
  diamondIntersectsAABB,
  circleIntersectsAABB,
  boxIntersectsFootprint,
  boxesIntersect,
  diamondsIntersect,
  CelestialOcclusionManager,
  celestialOcclusionManager,
  appendMultiplicityPips,
  appendPlanetaryPips,
  createReticleGeometry,
  createGalacticPlanarGridGeometry,
  createStyledLinePoints,
  populateDashedLineBuffer,
  populateCurvedDashedLineBuffer,
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
  ScreenEdgeBearingIndicators,
  calculateScreenEdgeBearing,
} from '../src/components/canvas/cartography';
import { useThreeTokenStore } from '../src/stores/useThreeTokenStore';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) =>
      createElement('div', { 'data-testid': testId ?? 'drei-html' }, children),
  };
});

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      size: { width: 1920, height: 1080 },
    }),
  };
});



describe('3D Cartography Components', () => {
  beforeEach(() => {
    useThreeTokenStore.getState().resetTokens();
  });

  describe('CartographicGrid', () => {
    it('renders with default parameters in SSR cleanly', () => {
      const html = renderToString(
        createElement(CartographicGrid, { radius: 10, rangeRings: [2.5, 5, 10] }),
      );
      expect(html).toContain('cartographic-grid');
      expect(html).toContain('travelling-fins');
      expect(html).toContain('cardinal-bearings');
      expect(html).toContain('screen-edge-bearing-indicators');
      expect(html).toContain('bearing-indicator-core');
      expect(html).toContain('bearing-indicator-orbital');
      expect(html).toContain('arc-tier-2.5');
      expect(html).toContain('arc-tier-5');
      expect(html).toContain('arc-tier-10');
      expect(html).toContain('xy-ticks-q0');
    });

    it('respects visibility flags for fins, datum plane, and axis lines', () => {
      const htmlNoFins = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          showFins: false,
          showGalacticPlane: false,
          showAxisLines: false,
        }),
      );
      expect(htmlNoFins).toContain('cartographic-grid');
      expect(htmlNoFins).not.toContain('travelling-fins');
      expect(htmlNoFins).not.toContain('cardinal-bearings');
      expect(htmlNoFins).not.toContain('screen-edge-bearing-indicators');
      expect(htmlNoFins).not.toContain('datum-plane');
    });

    it('respects showScreenEdgeIndicators flag when axis lines are enabled', () => {
      const htmlWithScreenEdge = renderToString(
        createElement(CartographicGrid, { radius: 10, showScreenEdgeIndicators: true }),
      );
      expect(htmlWithScreenEdge).toContain('screen-edge-bearing-indicators');

      const htmlWithoutScreenEdge = renderToString(
        createElement(CartographicGrid, { radius: 10, showScreenEdgeIndicators: false }),
      );
      expect(htmlWithoutScreenEdge).not.toContain('screen-edge-bearing-indicators');
    });

    it('renders Galactic Equator datum plane by default and responds to showGalacticPlane flag', () => {
      const htmlDefault = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          rangeRings: [2, 4, 8],
        }),
      );
      expect(htmlDefault).toContain('datum-plane');
      expect(htmlDefault).toContain('datum-plane-fill');
      expect(htmlDefault).toContain('datum-plane-boundary');
      expect(htmlDefault).toContain('full-ring-2');
      expect(htmlDefault).toContain('full-ring-4');
      expect(htmlDefault).toContain('full-ring-8');
      expect(htmlDefault).toContain('bearing-core');
      expect(htmlDefault).toContain('bearing-orbital');
      expect(htmlDefault).toContain('bearing-anti-core');
      expect(htmlDefault).toContain('bearing-anti-orbital');
      expect(htmlDefault).toContain('planar-footprint');
      expect(htmlDefault).toContain('planar-galactic-grid');

      const htmlHidden = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          showGalacticPlane: false,
        }),
      );
      expect(htmlHidden).not.toContain('datum-plane');
    });

    it('renders planar ground footprint on datum plane by default and respects showPlanarFootprint flag', () => {
      const htmlDefault = renderToString(
        createElement(CartographicGrid, { radius: 10 }),
      );
      expect(htmlDefault).toContain('datum-plane');
      expect(htmlDefault).toContain('name="planar-footprint"');

      const htmlNoFootprint = renderToString(
        createElement(CartographicGrid, { radius: 10, showPlanarFootprint: false }),
      );
      expect(htmlNoFootprint).toContain('datum-plane');
      expect(htmlNoFootprint).not.toContain('name="planar-footprint"');
    });

    it('renders galactic planar grid on datum plane by default and respects showPlanarGrid flag', () => {
      const htmlDefault = renderToString(
        createElement(CartographicGrid, { radius: 10 }),
      );
      expect(htmlDefault).toContain('name="planar-galactic-grid"');

      const htmlNoGrid = renderToString(
        createElement(CartographicGrid, { radius: 10, showPlanarGrid: false }),
      );
      expect(htmlNoGrid).toContain('datum-plane');
      expect(htmlNoGrid).not.toContain('name="planar-galactic-grid"');
    });

    it('renders explicit planar footprints on datum plane when provided', () => {
      const htmlWithFootprints = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          footprints: [
            { id: 'alpha', position: [3, 2, 0], classification: 'star' },
            { id: 'beta', position: [-4, 1, 0], classification: 'gas-giant' },
          ],
        }),
      );
      expect(htmlWithFootprints).toContain('datum-plane');
      expect(htmlWithFootprints).toContain('name="explicit-planar-footprints"');
      expect(htmlWithFootprints).toContain('name="planar-footprint-alpha"');
      expect(htmlWithFootprints).toContain('name="planar-footprint-beta"');
    });

    it('renders optional full 360-degree datum circles when enabled via showFullDatumCircle', () => {
      const htmlWithFull = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          rangeRings: [5],
          showFullDatumCircle: true,
        }),
      );
      expect(htmlWithFull).toContain('datum-plane');
      expect(htmlWithFull).toContain('full-ring-5');
    });

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

    it('renders cleanly in screenConstant zoom-adaptive mode with bearing core styling', () => {
      const html = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          screenConstant: true,
          referenceDistance: 20,
        }),
      );
      expect(html).toContain('cartographic-grid');
      expect(html).toContain('cardinal-bearings');
      expect(html).toContain('bearing-core');
      expect(html).toContain('bearing-orbital');
    });

    it('renders cleanly with lockToFocusPoint and custom focusTarget', () => {
      const targetVec = new THREE.Vector3(12, -4, 8);
      const html = renderToString(
        createElement(CartographicGrid, {
          radius: 10,
          lockToFocusPoint: true,
          focusTarget: targetVec,
        }),
      );
      expect(html).toContain('cartographic-grid');
      expect(html).toContain('travelling-fins');
    });

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

    it('creates galactic planar grid geometry with concentric arcs and radial rays', () => {
      const geom = createGalacticPlanarGridGeometry(40, 20, 250);
      expect(geom).toBeInstanceOf(THREE.BufferGeometry);
      const posAttr = geom.getAttribute('position');
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(0);
      geom.dispose();
    });

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

    it('omits positive X axis line in galactic planar grid where Core bearing runs when omitCoreAxis is true', () => {
      // With omitCoreAxis = true (default)
      const geomOmit = createGalacticPlanarGridGeometry(100, 50, 500, 16, true);
      const posOmit = geomOmit.getAttribute('position');
      let foundYZeroPositiveX = false;
      for (let i = 0; i < posOmit.count; i += 2) {
        const y1 = posOmit.getY(i);
        const y2 = posOmit.getY(i + 1);
        const x1 = posOmit.getX(i);
        const x2 = posOmit.getX(i + 1);
        // Look for the radial ray on the y=0 axis line
        if (Math.abs(y1) < 1e-4 && Math.abs(y2) < 1e-4) {
          // If a segment extends into x > 0 along the y=0 axis
          if (x1 > 1e-4 || x2 > 1e-4) {
            foundYZeroPositiveX = true;
          }
        }
      }
      expect(foundYZeroPositiveX).toBe(false);
      geomOmit.dispose();

      // With omitCoreAxis = false, y=0 axis line does extend to positive X
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

    it('renders static planar grid group and respects token snapshot defaults for footprint alpha and orbital style', () => {
      const html = renderToString(createElement(CartographicGrid, { radius: 10 }));
      expect(html).toContain('name="static-planar-grid-group"');
      expect(html).toContain('name="planar-galactic-grid"');

      const tokens = useThreeTokenStore.getState().tokens;
      expect(tokens.datumFootprintAlpha).toBe(0.25);
      expect(tokens.bearingOrbitalStyle).toBe('dashed');
    });
  });



  describe('CelestialNode', () => {
    it('renders in passive state without reticle or drop stalk', () => {
      const html = renderToString(
        createElement(CelestialNode, {
          id: 'star-1',
          name: 'Sirius',
          position: [0, 0, 1.5],
          state: 'passive',
        }),
      );
      expect(html).toContain('celestial-node-star-1');
      expect(html).not.toContain('drop-stalk');
      expect(html).not.toContain('celestial-label');
    });

    it('renders in active state with reticle and label, but NO stalk (Single-Stalk Rule)', () => {
      const html = renderToString(
        createElement(CelestialNode, {
          id: 'star-2',
          name: 'Vega',
          position: [1, 2, 3],
          state: 'active',
          spectralType: 'A0V',
        }),
      );
      expect(html).toContain('celestial-node-star-2');
      expect(html).toContain('data-state="active"');
      expect(html).not.toContain('drop-stalk');
      expect(html).toContain('Vega');
      expect(html).not.toContain('A0V');
    });

    it('renders drop stalk down to datum when selected or focused (Single-Stalk Rule)', () => {
      // Positive Z: solid stalk
      const htmlSelected = renderToString(
        createElement(CelestialNode, {
          id: 'star-3',
          name: 'Sol',
          position: [0, 0, 2.0],
          state: 'selected',
        }),
      );
      expect(htmlSelected).toContain('celestial-node-star-3');
      expect(htmlSelected).toContain('drop-stalk');
      expect(htmlSelected).not.toContain('datum-footprint');
      expect(htmlSelected).not.toContain('planar-footprint');

      // Negative Z: dashed stalk
      const htmlFocusedNeg = renderToString(
        createElement(CelestialNode, {
          id: 'star-4',
          name: 'Proxima',
          position: [1, 1, -2.5],
          state: 'focused',
        }),
      );
      expect(htmlFocusedNeg).toContain('celestial-node-star-4');
      expect(htmlFocusedNeg).toContain('drop-stalk');
      expect(htmlFocusedNeg).not.toContain('datum-footprint');
      expect(htmlFocusedNeg).not.toContain('planar-footprint');
    });

    it('renders reticle geometry cleanly for all taxonomy classifications', () => {
      const classifications = [
        'star',
        'stellar-system',
        'brown-dwarf',
        'white-dwarf',
        'degenerate-remnant',
        'neutron-star',
        'hazard',
        'black-hole',
        'singularity',
        'barycentre',
        'stellar-cluster',
        'cluster',
        'construct',
        'artificial',
        'terrestrial',
        'gas-giant',
        'ice-giant',
      ] as const;

      for (const classification of classifications) {
        const html = renderToString(
          createElement(CelestialNode, {
            id: `node-${classification}`,
            name: classification,
            position: [0, 0, 1],
            classification,
            state: 'active',
          }),
        );
        expect(html).toContain(`celestial-node-node-${classification}`);
      }
    });

    it('renders camera-facing invisible hitarea mesh for pointer interactions', () => {
      const html = renderToString(
        createElement(CelestialNode, {
          id: 'hitarea-test',
          name: 'HitArea Star',
          position: [0, 0, 1],
          state: 'active',
        }),
      );
      expect(html).toContain('name="reticle-hitarea"');
    });

    it('renders Four-Facet Diamond Architecture for circumbinary systems with planets when annotated', () => {
      const html = renderToString(
        createElement(CelestialNode, {
          id: 'kepler-47',
          name: 'Kepler-47',
          position: [5, 5, 2],
          classification: 'stellar-system',
          state: 'selected',
          spectralType: 'G6V + M3V',
          multiplicity: 2,
          planets: [
            { id: 'b', name: 'Kepler-47 b', classification: 'terrestrial' },
            { id: 'd', name: 'Kepler-47 d', classification: 'ice-giant' },
            { id: 'c', name: 'Kepler-47 c', classification: 'gas-giant' },
          ],
        }),
      );

      // System container & hit area
      expect(html).toContain('celestial-node-kepler-47');
      expect(html).toContain('name="reticle-hitarea"');
      expect(html).toContain('data-state="selected"');

      // Top-Right Facet (Designation)
      expect(html).toContain('data-testid="celestial-label"');
      expect(html).toContain('Kepler-47');

      // Bottom-Right Facet (Solar spectrum type separated in annotated mode with dot separator)
      expect(html).toContain('data-testid="celestial-spectrum-facet"');
      expect(html).toContain('G6V');
      expect(html).toContain('M3V');
      expect(html).toContain('·');
      expect(html).not.toContain(' + ');

      // Drop stalk present in selected state
      expect(html).toContain('drop-stalk');
    });

    it('omits spectral tag from label in active state without separating into bottom-right facet', () => {
      const html = renderToString(
        createElement(CelestialNode, {
          id: 'kepler-active',
          name: 'Kepler-47',
          position: [5, 5, 2],
          classification: 'stellar-system',
          state: 'active',
          spectralType: 'G6V + M3V',
        }),
      );

      expect(html).toContain('data-testid="celestial-label"');
      expect(html).toContain('Kepler-47');
      expect(html).not.toContain('G6V');
      expect(html).not.toContain('data-testid="celestial-spectrum-facet"');
    });

    it('generates multiplicity pips as solid star dots aligned towards the left point', () => {
      const pointsSingle: THREE.Vector3[] = [];
      appendMultiplicityPips(pointsSingle, 1.0, 1);
      // 1 star dot generated (outer ring + inner ring + spokes = 48 points)
      expect(pointsSingle.length).toBe(48);

      const pointsBinary: THREE.Vector3[] = [];
      appendMultiplicityPips(pointsBinary, 1.0, 2);
      expect(pointsBinary.length).toBe(96); // 2 star dots

      const pointsQuat: THREE.Vector3[] = [];
      appendMultiplicityPips(pointsQuat, 1.0, 4);
      expect(pointsQuat.length).toBe(192); // 4 star dots

      // Verify dots are aligned towards the left point (all X coordinates negative, near left corner)
      for (const pt of pointsQuat) {
        expect(pt.x).toBeLessThan(0);
      }
    });

    it('generates planetary symbols as boolean category presence at 2x-3x size', () => {
      // 5 terrestrial planets, 3 gas giants, 2 ice giants -> strictly 3 symbols rendered
      const manyPlanets = [
        { id: '1', name: 'p1', classification: 'terrestrial' as const },
        { id: '2', name: 'p2', classification: 'terrestrial' as const },
        { id: '3', name: 'p3', classification: 'terrestrial' as const },
        { id: '4', name: 'p4', classification: 'gas-giant' as const },
        { id: '5', name: 'p5', classification: 'gas-giant' as const },
        { id: '6', name: 'p6', classification: 'ice-giant' as const },
      ];

      const pointsBool: THREE.Vector3[] = [];
      appendPlanetaryPips(pointsBool, 1.0, manyPlanets);

      // Terrestrial (24 segs = 48 pts) + Gas Giant (28 segs = 56 pts + 4 slash pts = 60 pts) + Ice Giant (24 segs = 48 pts + 4 tick pts = 52 pts)
      // Total points = 48 + 60 + 52 = 160 points
      expect(pointsBool.length).toBe(160);

      // Single category presence: only terrestrial
      const pointsOnlyTerr: THREE.Vector3[] = [];
      appendPlanetaryPips(pointsOnlyTerr, 1.0, [{ id: '1', name: 'Earth', classification: 'terrestrial' }]);
      expect(pointsOnlyTerr.length).toBe(48);
    });

    it('creates reticle geometry with annotations in selected/focused state', () => {
      const geom = createReticleGeometry('stellar-system', 1.0, {
        multiplicity: 2,
        planets: [{ id: '1', name: 'Earth', classification: 'terrestrial' }],
        isAnnotated: true,
      });
      // 8 diamond points + 96 multiplicity points + 48 planetary points = 152 points
      expect(geom.getAttribute('position').count).toBe(152);
    });
  });

  describe('OrbitalRing', () => {
    it('renders circular orbit with periapsis tick and prograde direction indicator by default', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 2.0,
          eccentricity: 0,
          showPeriapsisTick: true,
          showDirectionIndicator: true,
        }),
      );
      expect(html).toContain('orbital-ring');
      expect(html).toContain('name="periapsis-tick"');
      expect(html).toContain('name="prograde-indicator"');
    });

    it('renders eccentric inclined orbit without ticks when disabled', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 3.5,
          eccentricity: 0.4,
          inclination: 15,
          ascendingNode: 30,
          showPeriapsisTick: false,
          showDirectionIndicator: false,
        }),
      );
      expect(html).toContain('orbital-ring');
      expect(html).not.toContain('name="periapsis-tick"');
      expect(html).not.toContain('name="prograde-indicator"');
    });

    it('applies focused state cleanly with bearing red color', () => {
      const tokens = useThreeTokenStore.getState().tokens;
      const expectedRed = `#${tokens.bearingOrbitalColor.getHexString()}`;
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 1.0,
          isFocused: true,
        }),
      );
      expect(html).toContain('orbital-ring');
      expect(html).toContain('name="periapsis-tick"');
      expect(html).toContain('name="prograde-indicator"');
      expect(html).toContain(expectedRed);
    });

    it('supports custom color override', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 1.5,
          color: '#00ffcc',
        }),
      );
      expect(html).toContain('orbital-ring');
    });
  });

  describe('CelestialOcclusionManager & Collision Geometry', () => {
    beforeEach(() => {
      celestialOcclusionManager.clear();
    });

    it('detects diamond reticle intersection correctly with L1 distance metric', () => {
      const cx = 100;
      const cy = 100;
      const radius = 40; // diamond vertices at (60, 100), (140, 100), (100, 60), (100, 140)

      // 1. Box completely inside diamond
      expect(diamondIntersectsAABB(cx, cy, radius, { left: 95, top: 95, right: 105, bottom: 105 })).toBe(true);

      // 2. Box overlapping diamond right corner (x=140)
      expect(diamondIntersectsAABB(cx, cy, radius, { left: 135, top: 95, right: 155, bottom: 105 })).toBe(true);

      // 3. Box overlapping diamond top diagonal edge (e.g. at x=120, y=70 -> dx=20, dy=30, sum=50 > 40: outside!)
      expect(diamondIntersectsAABB(cx, cy, radius, { left: 125, top: 65, right: 140, bottom: 75 })).toBe(false);

      // 4. Box barely touching diagonal edge (dx=20, dy=20, sum=40 == radius)
      expect(diamondIntersectsAABB(cx, cy, radius, { left: 120, top: 80, right: 130, bottom: 90 })).toBe(true);

      // 5. Far away box
      expect(diamondIntersectsAABB(cx, cy, radius, { left: 200, top: 200, right: 250, bottom: 220 })).toBe(false);
    });

    it('detects star dot circle intersection correctly', () => {
      const cx = 50;
      const cy = 50;
      const radius = 5;

      // 1. Box covering circle
      expect(circleIntersectsAABB(cx, cy, radius, { left: 45, top: 45, right: 55, bottom: 55 })).toBe(true);

      // 2. Box grazing circle edge
      expect(circleIntersectsAABB(cx, cy, radius, { left: 54, top: 50, right: 60, bottom: 52 })).toBe(true);

      // 3. Box completely outside circle
      expect(circleIntersectsAABB(cx, cy, radius, { left: 56, top: 50, right: 65, bottom: 55 })).toBe(false);
    });

    it('tests footprint intersection strictly based on reticle bounds', () => {
      const footprint = {
        id: 'test-node',
        state: 'active' as const,
        screenX: 100,
        screenY: 100,
        reticleRadius: 40,
        starRadius: 5,
        hasReticle: true,
        visible: true,
        updatedAt: 1000,
      };

      // Intersecting reticle
      expect(boxIntersectsFootprint({ left: 130, top: 90, right: 150, bottom: 110 }, footprint)).toBe(true);

      // Not intersecting
      expect(boxIntersectsFootprint({ left: 160, top: 160, right: 180, bottom: 180 }, footprint)).toBe(false);

      // Occlusion is based on reticle bounds, not star bounds: if hasReticle is false, returns false
      expect(boxIntersectsFootprint({ left: 98, top: 98, right: 102, bottom: 102 }, { ...footprint, hasReticle: false })).toBe(false);

      // Hidden footprint returns false
      expect(boxIntersectsFootprint({ left: 95, top: 95, right: 105, bottom: 105 }, { ...footprint, visible: false })).toBe(false);
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

      // Label 1: Placed between nodes, overlapping Node B's diamond reticle (left edge at 190 overlaps reticle at 220-40=180)
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
      const postUnregisterResult = manager.checkIntersection('sol', collidingBox, { checkSelf: false });
      expect(postUnregisterResult.hasIntersection).toBe(false);
    });

    it('implements Layer 2 Priority Occlusion Masking for geometric reticles', () => {
      const manager = new CelestialOcclusionManager();

      // Ambient contact Sol at (100, 100), camDist 10
      manager.register({
        id: 'sol',
        state: 'active',
        screenX: 100,
        screenY: 100,
        camDist: 10,
        reticleRadius: 40,
        starRadius: 4,
        hasReticle: true,
        visible: true,
        updatedAt: 1000,
      });

      // Ambient contact Sirius at (105, 105), camDist 12
      manager.register({
        id: 'sirius',
        state: 'active',
        screenX: 105,
        screenY: 105,
        camDist: 12,
        reticleRadius: 40,
        starRadius: 4,
        hasReticle: true,
        visible: true,
        updatedAt: 1000,
      });

      // Rule: Equal-priority ambient reticles overlay directly without suppression
      expect(manager.evaluateReticleOcclusion('sol')).toBe(false);
      expect(manager.evaluateReticleOcclusion('sirius')).toBe(false);

      // Now register focused target Vega at (100, 100), camDist 10
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
      // Node B at (200, 200), reticleRadius 30.
      // Another node C reticle sits at (240, 190) which blocks primary label placement at dx=0, dy=0.
      // But downward candidate (dy = 30 * 1.4 = 42) clears the collision.
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
      // When two active labels collide, closer node retains its label, background node yields
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
        camDist: 30, // Much further back
        reticleRadius: 20,
        starRadius: 4,
        hasReticle: false,
        visible: true,
        updatedAt: 1000,
      });

      // Background node label collides with foreground node's label at all candidate positions
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
      // Camera-proximity occlusion suppresses background node label
      expect(backgroundResult.visible).toBe(false);
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

    it('verifies 2D geometric intersection primitives', () => {
      // boxesIntersect
      expect(boxesIntersect(
        { left: 0, top: 0, right: 10, bottom: 10 },
        { left: 5, top: 5, right: 15, bottom: 15 },
      )).toBe(true);
      expect(boxesIntersect(
        { left: 0, top: 0, right: 10, bottom: 10 },
        { left: 20, top: 20, right: 30, bottom: 30 },
      )).toBe(false);

      // diamondsIntersect
      expect(diamondsIntersect(100, 100, 20, 115, 105, 20)).toBe(true); // dx=15, dy=5 -> 20 <= 40
      expect(diamondsIntersect(100, 100, 20, 150, 150, 20)).toBe(false); // dx=50, dy=50 -> 100 > 40
    });
  });

  describe('ScreenEdgeBearingIndicators & Bearing Math', () => {
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

    it('renders ScreenEdgeBearingIndicators component in SSR cleanly', () => {
      const html = renderToString(
        createElement(ScreenEdgeBearingIndicators, {}),
      );
      expect(html).toContain('screen-edge-bearing-indicators');
      expect(html).toContain('bearing-indicator-core');
      expect(html).toContain('bearing-indicator-orbital');
      expect(html).toContain('CORE 000°');
      expect(html).toContain('ORB 090°');
    });

    it('respects showCore and showOrbital flags in ScreenEdgeBearingIndicators', () => {
      const htmlCoreOnly = renderToString(
        createElement(ScreenEdgeBearingIndicators, { showCore: true, showOrbital: false }),
      );
      expect(htmlCoreOnly).toContain('bearing-indicator-core');
      expect(htmlCoreOnly).not.toContain('bearing-indicator-orbital');

      const htmlOrbOnly = renderToString(
        createElement(ScreenEdgeBearingIndicators, { showCore: false, showOrbital: true }),
      );
      expect(htmlOrbOnly).not.toContain('bearing-indicator-core');
      expect(htmlOrbOnly).toContain('bearing-indicator-orbital');
    });
  });
});

