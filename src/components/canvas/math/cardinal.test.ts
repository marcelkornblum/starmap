import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  computeCardinalAlignment,
  computeTransitionWeights,
  computeQuadrantWeight,
  computeAllPlaneQuadrantWeights,
} from './cardinal';

describe('cardinal', () => {
  it('detects perspective orientation far from cardinal axes', () => {
    const camDir = new THREE.Vector3(1, 1, 1).normalize();
    const { alphaX, alphaY, alphaZ, maxAlpha } = computeCardinalAlignment(camDir, 0.94, 0.985);
    expect(alphaX).toBe(0);
    expect(alphaY).toBe(0);
    expect(alphaZ).toBe(0);
    expect(maxAlpha).toBe(0);
  });

  it('detects cardinal alignment when looking along cardinal normal', () => {
    const camDir = new THREE.Vector3(0, 0, 1);
    const { alphaZ, maxAlpha } = computeCardinalAlignment(camDir, 0.94, 0.985);
    expect(alphaZ).toBe(1.0);
    expect(maxAlpha).toBe(1.0);

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
    const wActive = computeQuadrantWeight(1, 1, 1, 1, 0, 0, 0);
    const wOpposite = computeQuadrantWeight(-1, -1, 1, 1, 0, 0, 0);
    expect(wActive).toBe(1);
    expect(wOpposite).toBe(0);

    const wOppositeInOrtho = computeQuadrantWeight(-1, -1, 1, 1, 0, 0, 1.0);
    expect(wOppositeInOrtho).toBe(1.0);
  });

  it('computes all plane weights and grazing fades across all 3 planes', () => {
    const camDir = new THREE.Vector3(0, 0, 1);
    const weights = computeAllPlaneQuadrantWeights(camDir, 0.94, 0.985, 0.35);
    expect(weights.qwXY.every((w) => w === 1.0)).toBe(true);
    expect(weights.fadeXY).toBe(1.0);
    expect(weights.fadeXZ).toBe(0);
    expect(weights.fadeYZ).toBe(0);
  });
});
