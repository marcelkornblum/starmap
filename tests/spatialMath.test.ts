import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  computeZoomAdaptiveRings,
  populateZoomAdaptiveRings,
  type ScaledRingInfo,
} from '../src/components/poc/canvas/math/rings';
import {
  computeCardinalAlignment,
  computeTransitionWeights,
  computeQuadrantWeight,
  computeAllPlaneQuadrantWeights,
} from '../src/components/poc/canvas/math/cardinal';
import {
  computeApertureRadius,
  isInsideAperture,
  computePerimeterFade,
} from '../src/components/poc/canvas/math/aperture';
import {
  resolveBearingVector,
  generateCurvedOrbitPoints,
  calculateBearingProximityFade,
} from '../src/components/poc/canvas/math/bearings';
import {
  deriveEntityTier,
  isStalkVisible,
  isFootprintVisible,
  isOrbitForceRendered,
  type InteractionState,
  type InteractionTier,
} from '../src/components/poc/canvas/math/tiers';
import { classifyPlanetPhysical } from '../src/components/poc/canvas/math/astronomy';

describe('Spatial Math: rings.ts', () => {
  it('computes logarithmic 1-2-5 progression rings for a given aperture radius', () => {
    const rings = computeZoomAdaptiveRings(10, 6);
    expect(rings.length).toBeGreaterThan(0);
    // Radii must be sorted in ascending order
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i].radius).toBeGreaterThan(rings[i - 1].radius);
    }
    // Powers of 10 must be marked as major
    for (const r of rings) {
      if (Math.abs(Math.log10(r.radius) - Math.round(Math.log10(r.radius))) < 1e-4) {
        expect(r.isMajor).toBe(true);
      }
    }
  });

  it('populates pre-allocated pool with zero allocations', () => {
    const pool: ScaledRingInfo[] = Array.from({ length: 6 }, () => ({
      radius: 0,
      isMajor: false,
      fade: 0,
    }));
    const count = populateZoomAdaptiveRings(25, pool, 6);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);
    expect(pool[0].radius).toBeGreaterThan(0);
    expect(pool[0].fade).toBeGreaterThan(0);
  });

  it('returns 0 rings for non-positive aperture radius', () => {
    const pool: ScaledRingInfo[] = [];
    expect(populateZoomAdaptiveRings(0, pool)).toBe(0);
    expect(populateZoomAdaptiveRings(-10, pool)).toBe(0);
    expect(computeZoomAdaptiveRings(0)).toEqual([]);
  });
});

describe('Spatial Math: cardinal.ts (Polar Dial & Grazing Fading)', () => {
  it('detects perspective orientation far from cardinal axes', () => {
    // 45 degrees pitch and yaw
    const camDir = new THREE.Vector3(1, 1, 1).normalize();
    const { alphaX, alphaY, alphaZ, maxAlpha } = computeCardinalAlignment(camDir, 0.94, 0.985);
    expect(alphaX).toBe(0);
    expect(alphaY).toBe(0);
    expect(alphaZ).toBe(0);
    expect(maxAlpha).toBe(0);
  });

  it('detects cardinal alignment when looking along cardinal normal', () => {
    // Looking straight down onto XY plane (along Z axis)
    const camDir = new THREE.Vector3(0, 0, 1);
    const { alphaZ, maxAlpha } = computeCardinalAlignment(camDir, 0.94, 0.985);
    expect(alphaZ).toBe(1.0);
    expect(maxAlpha).toBe(1.0);

    // Intermediate orientation in transition corridor
    const intermediateDir = new THREE.Vector3(0, Math.sqrt(1 - 0.96 * 0.96), 0.96);
    const mid = computeCardinalAlignment(intermediateDir, 0.94, 0.985);
    expect(mid.alphaZ).toBeGreaterThan(0);
    expect(mid.alphaZ).toBeLessThan(1.0);

    const trans = computeTransitionWeights(new THREE.Vector3(0.1, 0.5, 0.5), 0.35, 0);
    expect(trans.wTransX).toBeGreaterThan(0);
    expect(trans.wTransY).toBe(0);
    expect(trans.wTransZ).toBe(0);
  });

  it('calculates quadrant weights expanding to full 360 dial on cardinal approach', () => {
    // Perspective view: only active quadrant has weight 1.0, others 0
    const wActive = computeQuadrantWeight(1, 1, 1, 1, 0, 0, 0);
    const wOpposite = computeQuadrantWeight(-1, -1, 1, 1, 0, 0, 0);
    expect(wActive).toBe(1);
    expect(wOpposite).toBe(0);

    // Cardinal view (normalAlpha = 1.0): ALL 4 quadrants have weight 1.0 (forming full 360 dial)
    const wOppositeInOrtho = computeQuadrantWeight(-1, -1, 1, 1, 0, 0, 1.0);
    expect(wOppositeInOrtho).toBe(1.0);
  });

  it('computes all plane weights and grazing fades across all 3 planes', () => {
    // Looking straight down along +Z: XY plane is face-on, XZ and YZ are edge-on
    const camDir = new THREE.Vector3(0, 0, 1);
    const weights = computeAllPlaneQuadrantWeights(camDir, 0.94, 0.985, 0.35);

    // XY plane should have all 4 quadrants fully illuminated (360 polar dial)
    expect(weights.qwXY.every((w) => w === 1.0)).toBe(true);
    expect(weights.fadeXY).toBe(1.0);

    // XZ and YZ planes are viewed edge-on, so their grazing fade must be 0
    expect(weights.fadeXZ).toBe(0);
    expect(weights.fadeYZ).toBe(0);
  });
});

describe('Spatial Math: aperture.ts', () => {
  it('calculates aperture radius with screenConstant scaling and distance clamp', () => {
    const baseRadius = 10;
    const refDistance = 35;

    // At reference distance, aperture matches baseRadius
    const rAtRef = computeApertureRadius(35, baseRadius, refDistance, true);
    expect(rAtRef).toBeCloseTo(10, 2);

    // At 2x distance, aperture doubles to maintain screen constant footprint
    const rAt2x = computeApertureRadius(70, baseRadius, refDistance, true);
    expect(rAt2x).toBeCloseTo(20, 2);

    // When screenConstant is false, aperture is static
    const rStatic = computeApertureRadius(70, baseRadius, refDistance, false);
    expect(rStatic).toBe(10);

    // Clamps to minRadius when close to origin
    const rClamped = computeApertureRadius(1.0, baseRadius, refDistance, true, 3.5);
    expect(rClamped).toBeCloseTo(10 * (3.5 / 35), 2);

    // Default referenceDistance fallback when <= 0
    const rFallback = computeApertureRadius(34.9, 10, 0, true);
    expect(rFallback).toBeCloseTo(10, 1);
  });

  it('tests aperture containment and perimeter feathering', () => {
    const origin = [0, 0, 0] as [number, number, number];
    const rAperture = 10;

    // Center point is inside with 100% opacity
    expect(isInsideAperture([0, 0, 0], origin, rAperture)).toBe(true);
    expect(computePerimeterFade(0, rAperture, 0.8)).toBe(1.0);

    // Inside boundary (r = 5)
    expect(isInsideAperture([3, 4, 0], origin, rAperture)).toBe(true);
    expect(computePerimeterFade(5, rAperture, 0.8)).toBe(1.0);

    // Feathered transition zone (r between 8 and 10)
    const fadeMid = computePerimeterFade(9, rAperture, 0.8);
    expect(fadeMid).toBeGreaterThan(0);
    expect(fadeMid).toBeLessThan(1.0);

    // Exactly on boundary or beyond
    expect(computePerimeterFade(10, rAperture, 0.8)).toBe(0);
    expect(computePerimeterFade(12, rAperture, 0.8)).toBe(0);
    expect(computePerimeterFade(5, 0, 0.8)).toBe(0);
    expect(isInsideAperture([10.1, 0, 0], origin, rAperture)).toBe(false);
  });
});

describe('Spatial Math: bearings.ts', () => {
  it('resolves straight bearing vectors to desired distance', () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dir = new THREE.Vector3(1, 0, 0);
    const extent = 1200;

    const endpoint = resolveBearingVector(origin, dir, extent);
    expect(endpoint.x).toBeCloseTo(1200, 2);
    expect(endpoint.y).toBe(0);
    expect(endpoint.z).toBe(0);
  });

  it('generates curved orbit points around a center of curvature', () => {
    const startPoint = new THREE.Vector3(0, 0, 0);
    const center = new THREE.Vector3(0, -2000, 0); // Galactic center along -Y
    const arcLength = 200;
    const steps = 16;

    const points = generateCurvedOrbitPoints(startPoint, center, arcLength, steps);
    expect(points.length).toBe(steps + 1);
    expect(points[0].x).toBeCloseTo(startPoint.x, 3);
    expect(points[0].y).toBeCloseTo(startPoint.y, 3);

    // Handles degenerate radius or steps
    expect(generateCurvedOrbitPoints(center, center, 100, 10)).toHaveLength(1);
    expect(generateCurvedOrbitPoints(startPoint, center, 100, 0)).toHaveLength(1);

    // Each subsequent point is curved toward center
    const radius = 2000;
    for (const pt of points) {
      const distToCenter = pt.distanceTo(center);
      expect(distToCenter).toBeCloseTo(radius, 1);
    }
  });

  it('calculates bearing proximity fade smoothly when camera approaches bearing vector', () => {
    const origin = new THREE.Vector3(0, 0, 0);
    // Camera far from bearing line -> fade is 1.0 (fully visible)
    const camFar = new THREE.Vector3(0, 50, 50);
    const fadeFar = calculateBearingProximityFade(camFar, origin, 'core', 1200, 2000, 20);
    expect(fadeFar).toBe(1.0);

    // Camera extremely close to bearing line -> fade is 0.0 (fully transparent)
    const camNear = new THREE.Vector3(100, 1.0, 0.5);
    const fadeNear = calculateBearingProximityFade(camNear, origin, 'core', 1200, 2000, 20);
    expect(fadeNear).toBe(0.0);

    // Camera in transition zone -> 0 < fade < 1
    const camMid = new THREE.Vector3(100, 10, 0);
    const fadeMid = calculateBearingProximityFade(camMid, origin, 'core', 1200, 2000, 20);
    expect(fadeMid).toBeGreaterThan(0.0);
    expect(fadeMid).toBeLessThan(1.0);
  });
});

describe('Spatial Math: tiers.ts (State Machine & Stalk/Orbit Rules)', () => {
  const apertureSet = new Set(['star-1', 'star-2', 'planet-1']);

  it('derives focused tier with highest priority', () => {
    const state: InteractionState = {
      hoveredId: 'star-1',
      selectedId: 'star-1',
      focusedId: 'star-1',
      apertureIds: apertureSet,
    };
    expect(deriveEntityTier('star-1', state)).toBe('focused');
  });

  it('derives selected tier for selected or hovered entity', () => {
    const stateHover: InteractionState = {
      hoveredId: 'star-2',
      selectedId: null,
      focusedId: null,
      apertureIds: apertureSet,
    };
    // Hover maps to selected tier per §2.4
    expect(deriveEntityTier('star-2', stateHover)).toBe('selected');

    const stateSelect: InteractionState = {
      hoveredId: null,
      selectedId: 'star-2',
      focusedId: null,
      apertureIds: apertureSet,
    };
    expect(deriveEntityTier('star-2', stateSelect)).toBe('selected');
  });

  it('derives active tier for in-aperture entities (supporting Set and Array)', () => {
    const state: InteractionState = {
      hoveredId: null,
      selectedId: null,
      focusedId: null,
      apertureIds: apertureSet,
    };
    expect(deriveEntityTier('planet-1', state)).toBe('active');

    // Array support
    const stateArray: InteractionState = {
      hoveredId: null,
      selectedId: null,
      focusedId: null,
      apertureIds: ['planet-1', 'planet-2'],
    };
    expect(deriveEntityTier('planet-1', stateArray)).toBe('active');
  });

  it('derives passive tier for outside-aperture entities', () => {
    const state: InteractionState = {
      hoveredId: null,
      selectedId: null,
      focusedId: null,
      apertureIds: apertureSet,
    };
    expect(deriveEntityTier('distant-star', state)).toBe('passive');
  });

  it('enforces stalk and footprint visibility strictly for selected and focused tiers', () => {
    const tiers: InteractionTier[] = ['passive', 'active', 'selected', 'focused'];

    expect(tiers.map(isStalkVisible)).toEqual([false, false, true, true]);
    expect(tiers.map(isFootprintVisible)).toEqual([false, false, true, true]);
  });

  it('enforces orbit force-render rule strictly for selected and focused tiers', () => {
    const tiers: InteractionTier[] = ['passive', 'active', 'selected', 'focused'];
    expect(tiers.map(isOrbitForceRendered)).toEqual([false, false, true, true]);
  });
});

describe('Spatial Math: astronomy.ts', () => {
  it('classifies planets based on radius thresholds (R_earth)', () => {
    expect(classifyPlanetPhysical({ radiusRearth: 1.0 })).toBe('terrestrial');
    expect(classifyPlanetPhysical({ radiusRearth: 1.75 })).toBe('terrestrial');
    expect(classifyPlanetPhysical({ radiusRearth: 1.76 })).toBe('ice-giant');
    expect(classifyPlanetPhysical({ radiusRearth: 4.0 })).toBe('ice-giant');
    expect(classifyPlanetPhysical({ radiusRearth: 6.0 })).toBe('ice-giant');
    expect(classifyPlanetPhysical({ radiusRearth: 6.1 })).toBe('gas-giant');
    expect(classifyPlanetPhysical({ radiusRearth: 11.2 })).toBe('gas-giant');
  });

  it('converts Jupiter radius to Earth radius for classification', () => {
    // 0.1 Rjup = ~1.12 Rearth -> terrestrial
    expect(classifyPlanetPhysical({ radiusRjup: 0.1 })).toBe('terrestrial');
    // 0.3 Rjup = ~3.36 Rearth -> ice-giant
    expect(classifyPlanetPhysical({ radiusRjup: 0.3 })).toBe('ice-giant');
    // 1.0 Rjup = ~11.21 Rearth -> gas-giant
    expect(classifyPlanetPhysical({ radiusRjup: 1.0 })).toBe('gas-giant');
  });

  it('classifies planets based on mass thresholds when radius is missing', () => {
    expect(classifyPlanetPhysical({ massMearth: 1.0 })).toBe('terrestrial');
    expect(classifyPlanetPhysical({ massMearth: 10.0 })).toBe('terrestrial');
    expect(classifyPlanetPhysical({ massMearth: 10.1 })).toBe('ice-giant');
    expect(classifyPlanetPhysical({ massMearth: 30.0 })).toBe('ice-giant');
    expect(classifyPlanetPhysical({ massMearth: 50.0 })).toBe('ice-giant');
    expect(classifyPlanetPhysical({ massMearth: 50.1 })).toBe('gas-giant');
  });

  it('converts Jupiter mass to Earth mass for classification', () => {
    // 0.02 Mjup = ~6.36 Mearth -> terrestrial
    expect(classifyPlanetPhysical({ massMjup: 0.02 })).toBe('terrestrial');
    // 0.1 Mjup = ~31.78 Mearth -> ice-giant
    expect(classifyPlanetPhysical({ massMjup: 0.1 })).toBe('ice-giant');
    // 1.0 Mjup = ~317.83 Mearth -> gas-giant
    expect(classifyPlanetPhysical({ massMjup: 1.0 })).toBe('gas-giant');
  });

  it('honors explicit classification string if present', () => {
    expect(classifyPlanetPhysical({ classification: 'Terrestrial Planet' })).toBe('terrestrial');
    expect(classifyPlanetPhysical({ classification: 'Rocky Super-Earth' })).toBe('terrestrial');
    expect(classifyPlanetPhysical({ classification: 'Sub-Neptune / Ice Giant' })).toBe('ice-giant');
    expect(classifyPlanetPhysical({ classification: 'Gas Giant Jovian' })).toBe('gas-giant');
  });

  it('falls back to terrestrial when physical parameters are missing or unknown', () => {
    expect(classifyPlanetPhysical({})).toBe('terrestrial');
    expect(classifyPlanetPhysical({ classification: 'Unknown' })).toBe('terrestrial');
  });
});
