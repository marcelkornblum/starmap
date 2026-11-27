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

  it('fans out adjacent stars with 44px touch hit circles on portrait and landscape phone viewports', () => {
    const grid = new ScreenSpatialGrid(100);
    // On 844x390 landscape, DEFAULT_RETICLE_SIZE (0.22) projects to ~6.29px visual radius (~12.6px diameter).
    // Two stars 30px apart do not overlap visually, but their 44px-diameter (22px-radius) touch hit circles do.
    const fp1: CelestialFootprint = {
      id: 'star-left',
      state: 'active',
      screenX: 100,
      screenY: 100,
      reticleRadius: 6.29,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const fp2: CelestialFootprint = {
      id: 'star-right',
      state: 'active',
      screenX: 130,
      screenY: 100,
      reticleRadius: 6.29,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    grid.insert(fp1);
    grid.insert(fp2);

    const cluster: CelestialFootprint[] = [];
    computeHitAreaCluster(fp1, grid, cluster, 200, true);

    expect(cluster).toHaveLength(2);
    expect(fp1.hitAreaOffsetX).not.toBe(0);
    expect(fp2.hitAreaOffsetX).not.toBe(0);

    const effectiveX1 = fp1.screenX + (fp1.hitAreaOffsetX ?? 0);
    const effectiveY1 = fp1.screenY + (fp1.hitAreaOffsetY ?? 0);
    const effectiveX2 = fp2.screenX + (fp2.hitAreaOffsetX ?? 0);
    const effectiveY2 = fp2.screenY + (fp2.hitAreaOffsetY ?? 0);
    const fannedCenterDistance = Math.hypot(effectiveX2 - effectiveX1, effectiveY2 - effectiveY1);

    // Fanned 44px hit circles (22px radius each) must be separated by at least 44px
    expect(fannedCenterDistance).toBeGreaterThanOrEqual(44);
  });

  it('fans out nearly-coincident stars on touch so 44px hit circles do not overlap', () => {
    const grid = new ScreenSpatialGrid(100);
    // On 390x844 portrait, DEFAULT_RETICLE_SIZE projects to ~13.6px visual radius
    const fp1: CelestialFootprint = {
      id: 'moon-1',
      state: 'active',
      screenX: 195,
      screenY: 422,
      reticleRadius: 13.6,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const fp2: CelestialFootprint = {
      id: 'moon-2',
      state: 'active',
      screenX: 195,
      screenY: 422,
      reticleRadius: 13.6,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    grid.insert(fp1);
    grid.insert(fp2);

    const cluster: CelestialFootprint[] = [];
    computeHitAreaCluster(fp1, grid, cluster, 200, true);

    const effectiveX1 = fp1.screenX + (fp1.hitAreaOffsetX ?? 0);
    const effectiveY1 = fp1.screenY + (fp1.hitAreaOffsetY ?? 0);
    const effectiveX2 = fp2.screenX + (fp2.hitAreaOffsetX ?? 0);
    const effectiveY2 = fp2.screenY + (fp2.hitAreaOffsetY ?? 0);
    const fannedCenterDistance = Math.hypot(effectiveX2 - effectiveX1, effectiveY2 - effectiveY1);

    expect(fannedCenterDistance).toBeGreaterThanOrEqual(44);
  });

  it('keeps a single primary star anchored at its exact dot while fanning close-in planets around it', () => {
    const grid = new ScreenSpatialGrid(100);
    const hostStar: CelestialFootprint = {
      id: 'tau-ceti',
      classification: 'star',
      state: 'active',
      screenX: 500,
      screenY: 360,
      reticleRadius: 9,
      starRadius: 4,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const innerPlanetB: CelestialFootprint = {
      id: 'tau-ceti-b',
      classification: 'planet',
      state: 'active',
      screenX: 504,
      screenY: 360,
      reticleRadius: 7,
      starRadius: 2,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const innerPlanetG: CelestialFootprint = {
      id: 'tau-ceti-g',
      classification: 'planet',
      state: 'active',
      screenX: 496,
      screenY: 362,
      reticleRadius: 7,
      starRadius: 2,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    grid.insert(hostStar);
    grid.insert(innerPlanetB);
    grid.insert(innerPlanetG);

    const cluster: CelestialFootprint[] = [];
    computeHitAreaCluster(hostStar, grid, cluster, 200, false);

    expect(hostStar.hitAreaOffsetX).toBe(0);
    expect(hostStar.hitAreaOffsetY).toBe(0);

    const bDistFromStar = Math.hypot(
      innerPlanetB.screenX + (innerPlanetB.hitAreaOffsetX ?? 0) - hostStar.screenX,
      innerPlanetB.screenY + (innerPlanetB.hitAreaOffsetY ?? 0) - hostStar.screenY,
    );
    expect(bDistFromStar).toBeGreaterThan(14);
  });
});
