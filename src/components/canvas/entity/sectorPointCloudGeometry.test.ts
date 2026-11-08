import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createDefaultSectorGeometry,
  createSceneSectorPointsFactory,
} from './sectorPointCloudGeometry';
import { encodeBinarySector, decodeBinarySector } from '../../../utils/binarySectorCodec';
import type { SectorPartitionManifest } from '../../../types/astro';

function createMockSectorBuffer(
  sectorId: string,
  origin: [number, number, number] = [0, 0, 0],
  starCount = 10,
): ArrayBuffer {
  const manifest: SectorPartitionManifest = {
    sectorId,
    bounds: {
      min: { x: origin[0], y: origin[1], z: origin[2] },
      max: { x: origin[0] + 25, y: origin[1] + 25, z: origin[2] + 25 },
    },
    count: starCount,
    systems: Array.from({ length: starCount }, (_, i) => ({
      id: `${sectorId}-sys-${i}`,
      name: `Star ${i}`,
      x: origin[0] + i,
      y: origin[1] + i,
      z: origin[2] + i,
      dist: Math.hypot(origin[0] + i, origin[1] + i, origin[2] + i),
      mag: 5,
      absmag: 4.8,
      spect: 'G2V',
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId,
    })),
  };
  const encoded = encodeBinarySector(manifest);
  return encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength,
  ) as ArrayBuffer;
}

describe('sectorPointCloudGeometry', () => {
  describe('createDefaultSectorGeometry', () => {
    it('creates THREE.BufferGeometry with position, starId, and precomputed boundingSphere', () => {
      const buffer = createMockSectorBuffer('sector_+000_+000_+000', [0, 0, 0], 5);
      const decoded = decodeBinarySector(buffer);

      const geometry = createDefaultSectorGeometry(decoded);
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);

      const posAttr = geometry.getAttribute('position');
      expect(posAttr).toBeDefined();
      expect(posAttr.itemSize).toBe(3);
      expect(posAttr.count).toBe(5);

      const idAttr = geometry.getAttribute('starId');
      expect(idAttr).toBeDefined();
      expect(idAttr.itemSize).toBe(1);
      expect(idAttr.count).toBe(5);

      expect(geometry.boundingSphere).toBeDefined();
      expect(geometry.boundingSphere?.center).toEqual(new THREE.Vector3(12.5, 12.5, 12.5));
      expect(geometry.boundingSphere?.radius).toBeCloseTo(12.5 * Math.sqrt(3), 4);

      geometry.dispose();
    });
  });

  describe('createSceneSectorPointsFactory', () => {
    it('creates THREE.Points attached to group and detaches on dispose', () => {
      const group = new THREE.Group();
      const material = new THREE.PointsMaterial({ size: 2 });
      const factory = createSceneSectorPointsFactory(() => ({ group, material }));

      const buffer = createMockSectorBuffer('sector_+000_+000_+000', [0, 0, 0], 5);
      const decoded = decodeBinarySector(buffer);

      const resource = factory(decoded, 'sector_+000_+000_+000');
      expect(group.children.length).toBe(1);
      const points = group.children[0] as THREE.Points;
      expect(points.name).toBe('sector-points-sector_+000_+000_+000');
      expect(points.frustumCulled).toBe(true);

      resource.dispose();
      expect(group.children.length).toBe(0);
      material.dispose();
    });
  });
});
