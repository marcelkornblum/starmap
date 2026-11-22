import { describe, it, expect } from 'vitest';
import { ScreenSpatialGrid } from './occlusionGeometryMath';
import { evaluateLabelVisibility, solveLabelOcclusion } from './occlusionLabelSolver';
import type { CelestialFootprint, LabelOcclusionResult } from './occlusionTypes';

describe('occlusionLabelSolver', () => {
  it('evaluates label visibility rules based on state and intersection', () => {
    expect(evaluateLabelVisibility('active', true).visible).toBe(false);
    expect(evaluateLabelVisibility('passive', true).visible).toBe(false);
    expect(evaluateLabelVisibility('selected', true).visible).toBe(true);
    expect(evaluateLabelVisibility('focused', true).visible).toBe(true);
    expect(evaluateLabelVisibility('active', false).visible).toBe(true);
  });

  it('guarantees target immunity for focused or selected nodes', () => {
    const grid = new ScreenSpatialGrid(50);
    const target: CelestialFootprint = {
      id: 'target',
      state: 'focused',
      screenX: 100,
      screenY: 100,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const cBox = { left: 0, top: 0, right: 0, bottom: 0 };
    const res: LabelOcclusionResult = { visible: false, behindCanvas: false, displacementX: 0, displacementY: 0, isDisplaced: false };

    solveLabelOcclusion(target, undefined, grid, cBox, res);
    expect(res.visible).toBe(true);
  });

  it('displaces the lower-priority or lexicographically-later overlapping selected label onto a radial slot', () => {
    const grid = new ScreenSpatialGrid(50);
    const selectedA: CelestialFootprint = {
      id: 'alpha',
      state: 'selected',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: false,
      labelBox: { left: 120, top: 85, right: 200, bottom: 105 },
      visible: true,
      updatedAt: 100,
    };
    const selectedB: CelestialFootprint = {
      id: 'beta',
      state: 'selected',
      screenX: 100,
      screenY: 100,
      camDist: 10,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: false,
      labelBox: { left: 120, top: 85, right: 200, bottom: 105 },
      visible: true,
      updatedAt: 100,
    };
    grid.insert(selectedA);
    grid.insert(selectedB);

    const cBox = { left: 0, top: 0, right: 0, bottom: 0 };
    const resA: LabelOcclusionResult = { visible: false, behindCanvas: false, displacementX: 0, displacementY: 0, isDisplaced: false };
    const resB: LabelOcclusionResult = { visible: false, behindCanvas: false, displacementX: 0, displacementY: 0, isDisplaced: false };

    solveLabelOcclusion(selectedA, selectedA.labelBox, grid, cBox, resA);
    solveLabelOcclusion(selectedB, selectedB.labelBox, grid, cBox, resB);

    expect(resA.visible).toBe(true);
    expect(resA.isDisplaced).toBe(false);
    expect(resA.displacementX).toBe(0);
    expect(resA.displacementY).toBe(0);

    expect(resB.visible).toBe(true);
    expect(resB.isDisplaced).toBe(true);
    expect(resB.displacementX !== 0 || resB.displacementY !== 0).toBe(true);
  });

  it('preserves target immunity with visible=true when every candidate slot around a selected or focused node is blocked', () => {
    const grid = new ScreenSpatialGrid(100);
    const blocker: CelestialFootprint = {
      id: 'blocker',
      state: 'focused',
      screenX: 100,
      screenY: 100,
      camDist: 5,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: false,
      labelBox: { left: 0, top: 0, right: 500, bottom: 500 },
      visible: true,
      updatedAt: 100,
    };
    const target: CelestialFootprint = {
      id: 'target',
      state: 'selected',
      screenX: 100,
      screenY: 100,
      camDist: 20,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: false,
      labelBox: { left: 120, top: 85, right: 180, bottom: 105 },
      visible: true,
      updatedAt: 100,
    };
    grid.insert(blocker);
    grid.insert(target);

    const cBox = { left: 0, top: 0, right: 0, bottom: 0 };
    const res: LabelOcclusionResult = { visible: false, behindCanvas: false, displacementX: 0, displacementY: 0, isDisplaced: false };

    solveLabelOcclusion(target, target.labelBox, grid, cBox, res);
    expect(res.visible).toBe(true);
    expect(res.isDisplaced).toBe(false);
  });
});
