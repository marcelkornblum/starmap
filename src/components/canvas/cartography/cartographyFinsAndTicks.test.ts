import { describe, it, expect } from 'vitest';
import {
  QUADRANTS,
  DEGREE_TICKS,
  createQuadrantArcGeometry,
  createQuadrantTickGeometry,
} from './cartographyFinsAndTicks';

describe('cartographyFinsAndTicks', () => {
  it('defines 4 quadrants with correct angles', () => {
    expect(QUADRANTS.length).toBe(4);
    expect(QUADRANTS[0].startAngle).toBe(0);
    expect(QUADRANTS[0].endAngle).toBeCloseTo(Math.PI / 2);
  });

  it('creates quadrant arc geometry on xy, xz, and yz planes', () => {
    const geomXy = createQuadrantArcGeometry(10, 'xy', 0, Math.PI / 2, 8);
    expect(geomXy.getAttribute('position').count).toBe(16);
    geomXy.dispose();

    const geomXz = createQuadrantArcGeometry(10, 'xz', 0, Math.PI / 2, 8);
    expect(geomXz.getAttribute('position').count).toBe(16);
    geomXz.dispose();

    const geomYz = createQuadrantArcGeometry(10, 'yz', 0, Math.PI / 2, 8);
    expect(geomYz.getAttribute('position').count).toBe(16);
    geomYz.dispose();
  });

  it('creates quadrant tick geometry with correct vertex counts for perimeter degree ticks', () => {
    const geom = createQuadrantTickGeometry(10, 'xy', 0, 0.5);
    expect(geom.getAttribute('position').count).toBe(DEGREE_TICKS.length * 2);
    geom.dispose();
  });
});
