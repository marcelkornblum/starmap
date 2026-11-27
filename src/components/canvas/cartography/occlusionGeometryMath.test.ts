import { describe, it, expect } from 'vitest';
import {
  diamondIntersectsAABB,
  circleIntersectsAABB,
  boxIntersectsFootprint,
  boxesIntersect,
  diamondsIntersect,
  ScreenSpatialGrid,
} from './occlusionGeometryMath';

describe('occlusionGeometryMath - Geometry Primitives & Grid', () => {
  it('detects diamond reticle intersection correctly with L1 distance metric', () => {
    const cx = 100;
    const cy = 100;
    const radius = 40;

    expect(diamondIntersectsAABB(cx, cy, radius, { left: 95, top: 95, right: 105, bottom: 105 })).toBe(true);
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 135, top: 95, right: 155, bottom: 105 })).toBe(true);
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 125, top: 65, right: 140, bottom: 75 })).toBe(false);
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 120, top: 80, right: 130, bottom: 90 })).toBe(true);
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 200, top: 200, right: 250, bottom: 220 })).toBe(false);
  });

  it('detects star dot circle intersection correctly', () => {
    const cx = 50;
    const cy = 50;
    const radius = 5;

    expect(circleIntersectsAABB(cx, cy, radius, { left: 45, top: 45, right: 55, bottom: 55 })).toBe(true);
    expect(circleIntersectsAABB(cx, cy, radius, { left: 54, top: 50, right: 60, bottom: 52 })).toBe(true);
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

    expect(boxIntersectsFootprint({ left: 110, top: 95, right: 130, bottom: 105 }, footprint)).toBe(true);
    expect(boxIntersectsFootprint({ left: 145, top: 95, right: 160, bottom: 105 }, footprint)).toBe(false);

    const nonVisibleFp = { ...footprint, visible: false };
    expect(boxIntersectsFootprint({ left: 100, top: 100, right: 110, bottom: 110 }, nonVisibleFp)).toBe(false);
  });

  it('detects box-box and diamond-diamond intersections', () => {
    expect(boxesIntersect({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(true);
    expect(boxesIntersect({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 20, top: 20, right: 30, bottom: 30 })).toBe(false);

    expect(diamondsIntersect(100, 100, 20, 120, 100, 20)).toBe(true);
    expect(diamondsIntersect(100, 100, 20, 150, 100, 20)).toBe(false);
  });

  it('inserts and queries items via ScreenSpatialGrid', () => {
    const grid = new ScreenSpatialGrid(50);
    const fp = {
      id: 'node-1',
      state: 'active' as const,
      screenX: 25,
      screenY: 25,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    grid.insert(fp);

    const found: string[] = [];
    grid.forEachNearby(20, 20, 30, (item) => {
      found.push(item.id);
    });
    expect(found).toContain('node-1');

    grid.clear();
    const empty: string[] = [];
    grid.forEachNearby(20, 20, 30, (item) => {
      empty.push(item.id);
    });
    expect(empty.length).toBe(0);
  });

  it('collects nearby items via collectNearby into caller-provided buffer without shrinking length', () => {
    const grid = new ScreenSpatialGrid(50);
    const nearA = {
      id: 'near-a',
      state: 'active' as const,
      screenX: 25,
      screenY: 25,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    const nearB = {
      ...nearA,
      id: 'near-b',
      screenX: 60,
      screenY: 40,
    };
    const farC = {
      ...nearA,
      id: 'far-c',
      screenX: 500,
      screenY: 500,
    };
    grid.insert(nearA);
    grid.insert(nearB);
    grid.insert(farC);

    const out = [farC, farC, farC, farC, farC];
    const count = grid.collectNearby(30, 30, 50, out);

    expect(count).toBe(2);
    expect(out.length).toBe(5);
    expect(out.slice(0, count).map((item) => item.id)).toEqual(['near-a', 'near-b']);

    grid.clear();
    const emptyCount = grid.collectNearby(30, 30, 50, out);
    expect(emptyCount).toBe(0);
    expect(out.length).toBe(5);
  });

  it('ignores non-finite coordinates and handles extreme 1e20 coordinates in O(1) without infinite loop', () => {
    const grid = new ScreenSpatialGrid(100);
    const validFp = {
      id: 'valid',
      state: 'active' as const,
      screenX: 50,
      screenY: 50,
      reticleRadius: 20,
      starRadius: 3,
      hasReticle: true,
      visible: true,
      updatedAt: 100,
    };
    grid.insert(validFp);
    grid.insert({ ...validFp, id: 'nan-fp', screenX: Number.NaN, screenY: 50 });
    grid.insert({ ...validFp, id: 'inf-fp', screenX: Number.POSITIVE_INFINITY, screenY: 50 });
    grid.insert({ ...validFp, id: 'huge-fp', screenX: 1e20, screenY: -1e20 });

    const found: string[] = [];
    grid.forEachNearby(Number.NaN, 50, 100, (item) => {
      found.push(item.id);
    });
    grid.forEachNearby(50, Number.POSITIVE_INFINITY, 100, (item) => {
      found.push(item.id);
    });
    grid.forEachNearby(50, 50, Number.NaN, (item) => {
      found.push(item.id);
    });
    grid.forEachNearby(50, 50, -10, (item) => {
      found.push(item.id);
    });
    expect(found).toEqual([]);

    grid.forEachNearby(1e20, -1e20, 50, (item) => {
      found.push(item.id);
    });
    expect(found).toContain('huge-fp');

    const out: typeof validFp[] = [];
    expect(grid.collectNearby(Number.NaN, 0, 50, out)).toBe(0);
    expect(grid.collectNearby(0, 0, Number.POSITIVE_INFINITY, out)).toBe(0);
    expect(grid.collectNearby(0, 0, -5, out)).toBe(0);
    expect(grid.collectNearby(0, 0, 1e20, out)).toBeGreaterThanOrEqual(1);
    expect(grid.collectNearby(1e20, -1e20, 50, out)).toBe(1);
  });
});
