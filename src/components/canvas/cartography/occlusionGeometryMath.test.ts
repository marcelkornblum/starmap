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
});
