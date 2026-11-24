import { describe, it, expect } from 'vitest';
import {
  CANONICAL_ISOMETRIC_POSE,
  buildCameraBasis,
  projectPoint3D,
  projectOrbitalPoint3D,
  buildProjectedRing,
} from './orientationProjectionMath';

function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function len(a: readonly [number, number, number]): number {
  return Math.hypot(a[0], a[1], a[2]);
}

describe('orientationProjectionMath', () => {
  it('defines CANONICAL_ISOMETRIC_POSE matching [-14, -22, 15] -> [0, 0, 0]', () => {
    expect(CANONICAL_ISOMETRIC_POSE.position).toEqual([-14, -22, 15]);
    expect(CANONICAL_ISOMETRIC_POSE.target).toEqual([0, 0, 0]);
    expect(CANONICAL_ISOMETRIC_POSE.up).toEqual([0, 0, 1]);
  });

  it('builds an orthonormal CameraBasis with accurate azimuth and elevation', () => {
    const basis = buildCameraBasis([0, -35, 20], [0, 0, 0], [0, 0, 1]);

    expect(len(basis.right)).toBeCloseTo(1, 5);
    expect(len(basis.up)).toBeCloseTo(1, 5);
    expect(len(basis.forward)).toBeCloseTo(1, 5);
    expect(dot(basis.right, basis.up)).toBeCloseTo(0, 5);
    expect(dot(basis.right, basis.forward)).toBeCloseTo(0, 5);
    expect(dot(basis.up, basis.forward)).toBeCloseTo(0, 5);

    expect(basis.right[0]).toBeCloseTo(1, 5);
    expect(basis.up[2]).toBeGreaterThan(0.8);
    expect(basis.azimuthDeg).toBeCloseTo(90, 1);
    expect(basis.elevationDeg).toBeCloseTo(29.74, 1);
  });

  it('handles top-down and bottom-up pole singularities cleanly without NaN', () => {
    const topDown = buildCameraBasis([0, 0, 50], [0, 0, 0], [0, 0, 1]);
    expect(Number.isFinite(topDown.right[0])).toBe(true);
    expect(len(topDown.right)).toBeCloseTo(1, 5);
    expect(len(topDown.up)).toBeCloseTo(1, 5);
    expect(dot(topDown.right, topDown.up)).toBeCloseTo(0, 5);
    expect(topDown.elevationDeg).toBeCloseTo(90, 1);

    const bottomUp = buildCameraBasis([0, 0, -50], [0, 0, 0], [0, 0, 1]);
    expect(len(bottomUp.right)).toBeCloseTo(1, 5);
    expect(len(bottomUp.up)).toBeCloseTo(1, 5);
    expect(dot(bottomUp.right, bottomUp.up)).toBeCloseTo(0, 5);
    expect(dot(bottomUp.right, bottomUp.forward)).toBeCloseTo(0, 5);
    expect(dot(bottomUp.up, bottomUp.forward)).toBeCloseTo(0, 5);
    expect(bottomUp.elevationDeg).toBeCloseTo(-90, 1);

    // Forward parallel to up along Y (exercises |fy| >= 0.9 fallback) and zero-up fallback
    const yParallel = buildCameraBasis([0, -50, 0], [0, 0, 0], [0, 1, 0]);
    expect(len(yParallel.right)).toBeCloseTo(1, 5);
    expect(len(yParallel.up)).toBeCloseTo(1, 5);
    expect(dot(yParallel.right, yParallel.forward)).toBeCloseTo(0, 5);

    const degenerate = buildCameraBasis([0, 0, 0], [0, 0, 0], [0, 0, 0]);
    expect(len(degenerate.forward)).toBeCloseTo(1, 5);
    expect(len(degenerate.right)).toBeCloseTo(1, 5);
    expect(len(degenerate.up)).toBeCloseTo(1, 5);
  });

  it('projects 3D points into SVG screen coordinates and signed depth', () => {
    const basis = buildCameraBasis([0, -35, 20], [0, 0, 0], [0, 0, 1]);
    const origin = projectPoint3D([0, 0, 0], basis, 100, 60, 40);
    expect(origin.x).toBeCloseTo(100, 5);
    expect(origin.y).toBeCloseTo(60, 5);
    expect(origin.depth).toBeCloseTo(0, 5);

    const north = projectPoint3D([0, 0, 1], basis, 100, 60, 40);
    expect(north.y).toBeLessThan(60);

    const near = projectPoint3D([0, -1, 0], basis, 100, 60, 40);
    const far = projectPoint3D([0, 1, 0], basis, 100, 60, 40);
    expect(near.depth).toBeLessThan(0);
    expect(far.depth).toBeGreaterThan(0);
  });

  it('builds projected ring with frontPath/backPath depth split and solid top-down fallback', () => {
    const tiltedBasis = buildCameraBasis(
      CANONICAL_ISOMETRIC_POSE.position,
      CANONICAL_ISOMETRIC_POSE.target,
      CANONICAL_ISOMETRIC_POSE.up,
    );
    const ring = buildProjectedRing({
      radius: 1,
      inclinationDeg: 0,
      ascendingNodeDeg: 0,
      basis: tiltedBasis,
      cx: 94,
      cy: 62,
      scale: 46,
    });

    expect(ring.polygonPoints.length).toBeGreaterThan(20);
    expect(ring.frontPath.startsWith('M ')).toBe(true);
    expect(ring.backPath.startsWith('M ')).toBe(true);
    expect(Number.isFinite(ring.samplePoint.x)).toBe(true);
    expect(Number.isFinite(ring.samplePoint.y)).toBe(true);

    const topDownBasis = buildCameraBasis([0, 0, 50], [0, 0, 0], [0, 0, 1]);
    const flatRing = buildProjectedRing({
      radius: 1,
      inclinationDeg: 0,
      ascendingNodeDeg: 0,
      basis: topDownBasis,
      cx: 94,
      cy: 62,
      scale: 46,
    });
    expect(flatRing.frontPath.startsWith('M ')).toBe(true);
    expect(flatRing.backPath).toBe('');
  });

  it('supports orbital eccentricity and tilted orbital sample projection', () => {
    const topDown = buildCameraBasis([0, 0, 50], [0, 0, 0], [0, 0, 1]);
    const peri = projectOrbitalPoint3D({
      radius: 1,
      eccentricity: 0.5,
      inclinationDeg: 0,
      ascendingNodeDeg: 0,
      eccentricAnomalyRad: 0,
      basis: topDown,
      cx: 100,
      cy: 100,
      scale: 50,
    });
    const apo = projectOrbitalPoint3D({
      radius: 1,
      eccentricity: 0.5,
      inclinationDeg: 0,
      ascendingNodeDeg: 0,
      eccentricAnomalyRad: Math.PI,
      basis: topDown,
      cx: 100,
      cy: 100,
      scale: 50,
    });

    // At E=0, x = a(1 - e) = 0.5 -> +25px from center; at E=pi, x = a(-1 - e) = -1.5 -> -75px
    expect(peri.x - 100).toBeCloseTo(25, 2);
    expect(apo.x - 100).toBeCloseTo(-75, 2);

    // Tilted ring (i=90 deg, node=0 deg -> local +Y maps to +Z) viewed from side [0, -50, 0]
    const sideView = buildCameraBasis([0, -50, 0], [0, 0, 0], [0, 0, 1]);
    const tiltedQuarter = projectOrbitalPoint3D({
      radius: 1,
      eccentricity: 0,
      inclinationDeg: 90,
      ascendingNodeDeg: 0,
      eccentricAnomalyRad: Math.PI / 2,
      basis: sideView,
      cx: 100,
      cy: 100,
      scale: 50,
    });
    expect(tiltedQuarter.x).toBeCloseTo(100, 2);
    expect(tiltedQuarter.y).toBeCloseTo(50, 2);

    // Rotated ascending node (90 deg -> node along +Y; at E=pi, (-1, 0) lies perpendicular to +Y -> z = +sin(i))
    const rotatedNode = projectOrbitalPoint3D({
      radius: 1,
      eccentricity: 0,
      inclinationDeg: 30,
      ascendingNodeDeg: 90,
      eccentricAnomalyRad: Math.PI,
      basis: sideView,
      cx: 100,
      cy: 100,
      scale: 50,
    });
    expect(rotatedNode.y).toBeCloseTo(100 - 50 * Math.sin((30 * Math.PI) / 180), 2);
  });
});
