import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  resolveBearingVector,
  generateCurvedOrbitPoints,
  calculateBearingProximityFade,
} from './bearings';

describe('bearings', () => {
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
    const center = new THREE.Vector3(0, -2000, 0);
    const arcLength = 200;
    const steps = 16;

    const points = generateCurvedOrbitPoints(startPoint, center, arcLength, steps);
    expect(points.length).toBe(steps + 1);
    expect(points[0].x).toBeCloseTo(startPoint.x, 3);
    expect(points[0].y).toBeCloseTo(startPoint.y, 3);

    expect(generateCurvedOrbitPoints(center, center, 100, 10)).toHaveLength(1);
    expect(generateCurvedOrbitPoints(startPoint, center, 100, 0)).toHaveLength(1);

    const radius = 2000;
    for (const pt of points) {
      const distToCenter = pt.distanceTo(center);
      expect(distToCenter).toBeCloseTo(radius, 1);
    }
  });

  it('calculates bearing proximity fade smoothly when camera approaches bearing vector', () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const camFar = new THREE.Vector3(0, 50, 50);
    const fadeFar = calculateBearingProximityFade(camFar, origin, 'core', 1200, 2000, 20);
    expect(fadeFar).toBe(1.0);

    const camNear = new THREE.Vector3(100, 1.0, 0.5);
    const fadeNear = calculateBearingProximityFade(camNear, origin, 'core', 1200, 2000, 20);
    expect(fadeNear).toBe(0.0);

    const camMid = new THREE.Vector3(100, 10, 0);
    const fadeMid = calculateBearingProximityFade(camMid, origin, 'core', 1200, 2000, 20);
    expect(fadeMid).toBeGreaterThan(0.0);
    expect(fadeMid).toBeLessThan(1.0);
  });
});
