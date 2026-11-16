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
});
