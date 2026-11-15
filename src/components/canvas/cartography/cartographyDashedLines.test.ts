import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  LINE_STYLE_CONSTANTS,
  createStyledLinePoints,
  populateDashedLineBuffer,
  populateCurvedDashedLineBuffer,
} from './cartographyDashedLines';

describe('cartographyDashedLines', () => {
  it('creates points for styled line with solid, dashed, and dotted patterns', () => {
    const p1 = new THREE.Vector3(0, 0, 0);
    const p2 = new THREE.Vector3(10, 0, 0);

    const solid = createStyledLinePoints(p1, p2, 'solid');
    expect(solid.length).toBe(2);

    const dashed = createStyledLinePoints(p1, p2, 'dashed');
    expect(dashed.length).toBeGreaterThan(2);

    const dotted = createStyledLinePoints(p1, p2, 'dotted');
    expect(dotted.length).toBeGreaterThan(dashed.length);
  });

  it('populates dashed line buffer along direction vector', () => {
    const buffer = new Float32Array(300);
    const count = populateDashedLineBuffer(buffer, 5, [1, 0, 0]);
    expect(count).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0);
    expect(buffer[3]).toBeCloseTo(LINE_STYLE_CONSTANTS.dashLength, 5);
  });

  it('populates curved dashed line buffer for circular orbit', () => {
    const buffer = new Float32Array(300);
    const count = populateCurvedDashedLineBuffer(buffer, 10, 100, 1);
    expect(count).toBeGreaterThan(0);
  });
});
