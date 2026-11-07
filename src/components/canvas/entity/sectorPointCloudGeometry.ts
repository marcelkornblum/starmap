import * as THREE from 'three';
import type { DecodedBinarySector } from '../../../utils/binarySectorCodec';
import type { DisposableGpuResource } from '../../../services/sectorStreamingService';

/**
 * Creates default Three.js BufferGeometry with precomputed bounding sphere.
 */
export function createDefaultSectorGeometry(decoded: DecodedBinarySector): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(decoded.positions, 3));
  geometry.setAttribute('starId', new THREE.BufferAttribute(decoded.ids, 1));

  const size = decoded.header.sectorSize;
  const halfSize = size * 0.5;
  const cx = decoded.header.origin[0] + halfSize;
  const cy = decoded.header.origin[1] + halfSize;
  const cz = decoded.header.origin[2] + halfSize;
  const radius = halfSize * Math.sqrt(3);

  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), radius);
  return geometry;
}

/**
 * Factory creating Three.js Points added to a parent Group with deterministic disposal.
 */
export function createSceneSectorPointsFactory(
  getTarget: () => { group: THREE.Group | null; material: THREE.Material | null },
): (decoded: DecodedBinarySector, sectorId: string) => DisposableGpuResource {
  return (decoded: DecodedBinarySector, sectorId: string) => {
    const geometry = createDefaultSectorGeometry(decoded);
    const { group, material } = getTarget();
    let points: THREE.Points | null = null;
    if (group && material) {
      points = new THREE.Points(geometry, material);
      points.name = `sector-points-${sectorId}`;
      points.frustumCulled = true;
      group.add(points);
    }
    return {
      dispose: () => {
        if (points && points.parent) {
          points.parent.remove(points);
        }
        geometry.dispose();
      },
    };
  };
}
