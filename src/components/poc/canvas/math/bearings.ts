import * as THREE from 'three';

/**
 * Resolves the destination point of a straight bearing vector extending from an origin.
 */
export function resolveBearingVector(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  extent: number,
): THREE.Vector3 {
  const norm = direction.clone().normalize();
  return origin.clone().addScaledVector(norm, extent);
}

/**
 * Generates an array of 3D points following a circular curved arc around a distant center of mass
 * (e.g. Galactic Orbit bearing curved around the Galactic Centre).
 */
export function generateCurvedOrbitPoints(
  startPoint: THREE.Vector3,
  center: THREE.Vector3,
  arcLength: number,
  steps = 32,
): THREE.Vector3[] {
  const radius = startPoint.distanceTo(center);
  if (radius <= 0 || steps <= 0) return [startPoint.clone()];

  // Vector from center to start point
  const vRadius = new THREE.Vector3().subVectors(startPoint, center);
  const initialAngle = Math.atan2(vRadius.y, vRadius.x);
  const angularSpan = arcLength / radius;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const angle = initialAngle + frac * angularSpan;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    const z = THREE.MathUtils.lerp(startPoint.z, center.z, frac * 0.05); // subtle pitch damping
    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}
