import { describe, it, expect } from 'vitest';
import { ScreenSpatialGrid } from './occlusionGeometryMath';
import { computeHitAreaCluster, resolveCyclicSelectionTarget } from './occlusionClusterSolver';
import type { CelestialFootprint } from './occlusionTypes';

describe('occlusionClusterSolver', () => {
  it('computes outward fan offsets for overlapping cluster', () => {
    const grid = new ScreenSpatialGrid(50);
    const fp1: CelestialFootprint = {
      id: 'a',
      state: 'active',
      screenX: 100,
      screenY: 100,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const fp2: CelestialFootprint = {
      id: 'b',
      state: 'active',
      screenX: 102,
      screenY: 100,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    grid.insert(fp1);
    grid.insert(fp2);

    const cluster: CelestialFootprint[] = [];
    computeHitAreaCluster(fp1, grid, cluster, 200);

    expect(fp1.hitAreaOffsetX).not.toBe(0);
    expect(fp2.hitAreaOffsetX).not.toBe(0);
  });

  it('cycles through overlapping nodes in sorted order', () => {
    const grid = new ScreenSpatialGrid(50);
    const footprints = new Map<string, CelestialFootprint>();
    const fp1: CelestialFootprint = {
      id: 'alpha',
      state: 'active',
      screenX: 100,
      screenY: 100,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const fp2: CelestialFootprint = {
      id: 'beta',
      state: 'active',
      screenX: 101,
      screenY: 100,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    footprints.set(fp1.id, fp1);
    footprints.set(fp2.id, fp2);
    grid.insert(fp1);
    grid.insert(fp2);

    const cluster: CelestialFootprint[] = [];
    const next1 = resolveCyclicSelectionTarget('alpha', footprints, grid, cluster);
    expect(next1).toBe('beta');

    const next2 = resolveCyclicSelectionTarget('beta', footprints, grid, cluster);
    expect(next2).toBe('alpha');
  });
});
