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
  CelestialOcclusionManager,
  celestialOcclusionManager,
  appendMultiplicityPips,
  appendPlanetaryPips,
  createReticleGeometry,
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
      expect(html).toContain('arc-tier-2.5');
      expect(html).toContain('arc-tier-5');
      expect(html).toContain('arc-tier-10');
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
      expect(htmlNoFins).not.toContain('datum-plane');
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
      expect(htmlDefault).toContain('planar-footprint');

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
      expect(html).toContain('A0V');
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

      // Bottom-Right Facet (Solar spectrum type separated in annotated mode)
      expect(html).toContain('data-testid="celestial-spectrum-facet"');
      expect(html).toContain('G6V + M3V');

      // Drop stalk present in selected state
      expect(html).toContain('drop-stalk');
    });

    it('renders inline spectral tag in active state without separating into bottom-right facet', () => {
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
      expect(html).toContain('G6V + M3V');
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
    it('renders circular orbit with periapsis tick', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 2.0,
          eccentricity: 0,
          showPeriapsisTick: true,
        }),
      );
      expect(html).toContain('orbital-ring');
    });

    it('renders eccentric inclined orbit without periapsis tick when disabled', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 3.5,
          eccentricity: 0.4,
          inclination: 15,
          ascendingNode: 30,
          showPeriapsisTick: false,
        }),
      );
      expect(html).toContain('orbital-ring');
    });

    it('applies focused state cleanly', () => {
      const html = renderToString(
        createElement(OrbitalRing, {
          semiMajorAxis: 1.0,
          isFocused: true,
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
  });
});

