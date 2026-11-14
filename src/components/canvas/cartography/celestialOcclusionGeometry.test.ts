import { describe, it, expect } from 'vitest';
import {
  diamondIntersectsAABB,
  circleIntersectsAABB,
  boxIntersectsFootprint,
  boxesIntersect,
  diamondsIntersect,
} from './celestialOcclusionRegistry';

describe('celestialOcclusionRegistry - Geometry Primitives', () => {
  it('detects diamond reticle intersection correctly with L1 distance metric', () => {
    const cx = 100;
    const cy = 100;
    const radius = 40; // diamond vertices at (60, 100), (140, 100), (100, 60), (100, 140)

    // 1. Box completely inside diamond
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 95, top: 95, right: 105, bottom: 105 })).toBe(true);

    // 2. Box overlapping diamond right corner (x=140)
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 135, top: 95, right: 155, bottom: 105 })).toBe(true);

    // 3. Box overlapping diamond top diagonal edge (e.g. at x=120, y=70 -> dx=20, dy=30, sum=50 > 40: outside!)
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 125, top: 65, right: 140, bottom: 75 })).toBe(false);

    // 4. Box barely touching diagonal edge (dx=20, dy=20, sum=40 == radius)
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 120, top: 80, right: 130, bottom: 90 })).toBe(true);

    // 5. Far away box
    expect(diamondIntersectsAABB(cx, cy, radius, { left: 200, top: 200, right: 250, bottom: 220 })).toBe(false);
  });

  it('detects star dot circle intersection correctly', () => {
    const cx = 50;
    const cy = 50;
    const radius = 5;

    // 1. Box covering circle
    expect(circleIntersectsAABB(cx, cy, radius, { left: 45, top: 45, right: 55, bottom: 55 })).toBe(true);

    // 2. Box grazing circle edge
    expect(circleIntersectsAABB(cx, cy, radius, { left: 54, top: 50, right: 60, bottom: 52 })).toBe(true);

    // 3. Box completely outside circle
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

    // Intersecting reticle
    expect(boxIntersectsFootprint({ left: 130, top: 90, right: 150, bottom: 110 }, footprint)).toBe(true);

    // Not intersecting
    expect(boxIntersectsFootprint({ left: 160, top: 160, right: 180, bottom: 180 }, footprint)).toBe(false);

    // Occlusion is based on reticle bounds, not star bounds: if hasReticle is false, returns false
    expect(boxIntersectsFootprint({ left: 98, top: 98, right: 102, bottom: 102 }, { ...footprint, hasReticle: false })).toBe(false);

    // Hidden footprint returns false
    expect(boxIntersectsFootprint({ left: 95, top: 95, right: 105, bottom: 105 }, { ...footprint, visible: false })).toBe(false);
  });

  it('verifies 2D geometric intersection primitives', () => {
    // boxesIntersect
    expect(boxesIntersect(
      { left: 0, top: 0, right: 10, bottom: 10 },
      { left: 5, top: 5, right: 15, bottom: 15 },
    )).toBe(true);
    expect(boxesIntersect(
      { left: 0, top: 0, right: 10, bottom: 10 },
      { left: 20, top: 20, right: 30, bottom: 30 },
    )).toBe(false);

    // diamondsIntersect
    expect(diamondsIntersect(100, 100, 20, 115, 105, 20)).toBe(true);
    expect(diamondsIntersect(100, 100, 20, 150, 150, 20)).toBe(false);
  });
});
