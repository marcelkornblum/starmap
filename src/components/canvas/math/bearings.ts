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

const scratchBearingCamLocal = new THREE.Vector3();
const scratchBearingInvQuat = new THREE.Quaternion();

/**
 * Calculates a smooth proximity fade factor (1.0 -> 0.0) for a bearing line
 * as the camera approaches or comes close to intersecting it, preventing near-plane clipping
 * and camera collisions.
 */
export function calculateBearingProximityFade(
  cameraPosition: THREE.Vector3,
  origin: THREE.Vector3,
  bearingType: 'core' | 'orbital',
  extent: number,
  centerDistance: number,
  apertureRadius: number,
  orientation?: THREE.Quaternion,
): number {
  scratchBearingCamLocal.copy(cameraPosition).sub(origin);
  if (orientation) {
    scratchBearingInvQuat.copy(orientation).invert();
    scratchBearingCamLocal.applyQuaternion(scratchBearingInvQuat);
  }

  const px = scratchBearingCamLocal.x;
  const py = scratchBearingCamLocal.y;
  const pz = scratchBearingCamLocal.z;

  let d = 0;
  if (bearingType === 'core') {
    // Core bearing line segment: (0, 0, 0) to (extent, 0, 0) along +X
    const t = Math.max(0, Math.min(extent, px));
    const dx = px - t;
    d = Math.sqrt(dx * dx + py * py + pz * pz);
  } else {
    // Orbital bearing curve: arc of circle radius centerDistance centered at (centerDistance, 0, 0) in Z=0 plane
    const effectiveR = Math.max(centerDistance, 1.0);
    const thetaRel = Math.atan2(py, effectiveR - px);
    const s = effectiveR * thetaRel;
    const sClamped = Math.max(0, Math.min(extent, s));
    const angle = sClamped / effectiveR;
    const closestX = effectiveR * (1 - Math.cos(angle));
    const closestY = effectiveR * Math.sin(angle);
    const dx = px - closestX;
    const dy = py - closestY;
    d = Math.sqrt(dx * dx + dy * dy + pz * pz);
  }

  const dEnd = Math.max(2.0, apertureRadius * 0.25);
  const dStart = Math.max(6.0, apertureRadius * 0.75);

  if (d >= dStart) return 1.0;
  if (d <= dEnd) return 0.0;
  const u = (d - dEnd) / (dStart - dEnd);
  return u * u * (3 - 2 * u);
}
