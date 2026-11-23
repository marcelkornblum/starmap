import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildPreviewReferenceMarksGeometry } from './targetReferencePlaneGeometry';

describe('targetReferencePlaneGeometry', () => {
  it('builds unit-radius BufferGeometry with major/minor material groups for spokes, ticks, and grid chords', () => {
    const geom = buildPreviewReferenceMarksGeometry();
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;

    expect(pos.count).toBe(96);
    expect(pos.itemSize).toBe(3);
    expect(geom.groups).toEqual([
      { start: 0, count: 32, materialIndex: 0 },
      { start: 32, count: 64, materialIndex: 1 },
    ]);
    expect(geom.boundingSphere).not.toBeNull();
    expect(geom.boundingSphere?.radius).toBeCloseTo(1, 5);

    expect(pos.getX(0)).toBeCloseTo(0.15, 6);
    expect(pos.getY(0)).toBeCloseTo(0, 6);
    expect(pos.getX(1)).toBeCloseTo(1.0, 6);
    expect(pos.getY(1)).toBeCloseTo(0, 6);

    const firstMajorTickIdx = 8;
    expect(pos.getX(firstMajorTickIdx)).toBeCloseTo(0.9, 6);
    expect(pos.getX(firstMajorTickIdx + 1)).toBeCloseTo(1.0, 6);

    const firstMinorTickIdx = 32;
    expect(pos.getX(firstMinorTickIdx)).toBeCloseTo(0.95, 6);
    expect(pos.getX(firstMinorTickIdx + 1)).toBeCloseTo(1.0, 6);

    const firstChordIdx = 32 + 48;
    expect(pos.getX(firstChordIdx)).toBeCloseTo(-0.6, 6);
    expect(pos.getY(firstChordIdx)).toBeCloseTo(-0.8, 6);
    expect(pos.getX(firstChordIdx + 1)).toBeCloseTo(-0.6, 6);
    expect(pos.getY(firstChordIdx + 1)).toBeCloseTo(0.8, 6);

    geom.dispose();
  });
});
