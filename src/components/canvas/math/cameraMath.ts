import * as THREE from 'three';

export interface OrthographicFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
  zoom: number;
}

export interface AdaptiveProjectionResult {
  fov: number;
  zoom: number;
}

/**
 * Calculates orthographic camera frustum planes to match a perspective camera's
 * visible cross-section at a specific focal distance down to the subpixel.
 *
 * @param focalDistance - Distance from camera to the focal plane
 * @param fov - Vertical field of view in degrees (baseline perspective FOV)
 * @param aspect - Viewport aspect ratio (width / height)
 * @param zoom - Optional orthographic zoom multiplier (defaults to 1.0)
 */
export function calculateOrthographicFrustum(
  focalDistance: number,
  fov: number,
  aspect: number,
  zoom = 1.0,
): OrthographicFrustum {
  const safeDistance = Math.max(focalDistance, 1e-4);
  const safeAspect = Math.max(aspect, 1e-4);
  const halfFovRad = (fov * Math.PI) / 360;
  const top = (safeDistance * Math.tan(halfFovRad)) / Math.max(zoom, 1e-4);
  const bottom = -top;
  const right = top * safeAspect;
  const left = -right;

  return {
    left,
    right,
    top,
    bottom,
    zoom: 1.0,
  };
}

/**
 * Calculates the equivalent camera distance for a perspective camera that matches
 * the scale of an orthographic camera at a given zoom level and baseline FOV.
 *
 * @param halfHeight - Orthographic frustum top bound (half-height in world units)
 * @param orthoZoom - Orthographic camera zoom factor
 * @param baseFov - Perspective baseline vertical FOV in degrees
 */
export function calculateEquivalentPerspectiveDistance(
  halfHeight: number,
  orthoZoom: number,
  baseFov: number,
): number {
  const safeZoom = Math.max(orthoZoom, 1e-4);
  const halfFovRad = (baseFov * Math.PI) / 360;
  return halfHeight / (safeZoom * Math.tan(halfFovRad));
}

/**
 * Computes the coupled FOV and zoom compensation factor for perspective camera
 * during cardinal alignment approach.
 *
 * As alpha approaches 1.0, FOV shrinks from baseFov towards minFov (e.g. 45 -> 3.6 deg),
 * while zoom compensates by tan(fov/2) / tan(baseFov/2) so that apparent scale at the
 * focal plane remains strictly invariant.
 *
 * @param baseFov - Baseline perspective FOV in degrees
 * @param alpha - Cardinal alignment factor in [0, 1]
 * @param minFov - Minimum FOV at alpha = 1 (default: 3.6 deg)
 */
export function calculateAdaptiveProjectionFov(
  baseFov: number,
  alpha: number,
  minFov = 3.6,
): AdaptiveProjectionResult {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const targetFov =
    clampedAlpha === 0
      ? baseFov
      : clampedAlpha === 1
        ? minFov
        : baseFov - (baseFov - minFov) * clampedAlpha;

  const targetFovRad = (targetFov * Math.PI) / 360;
  const baseFovRad = (baseFov * Math.PI) / 360;

  const targetZoom = Math.tan(targetFovRad) / Math.tan(baseFovRad);

  return {
    fov: targetFov,
    zoom: targetZoom,
  };
}


/**
 * Synchronises an OrthographicCamera with a PerspectiveCamera at a designated focal point,
 * matching orientation, position, and visible frustum dimensions.
 */
export function synchronizeOrthoWithPerspective(
  perspCam: THREE.PerspectiveCamera,
  orthoCam: THREE.OrthographicCamera,
  focalPoint: THREE.Vector3,
  aspect: number,
): void {
  const distance = perspCam.position.distanceTo(focalPoint);
  const frustum = calculateOrthographicFrustum(distance, perspCam.fov, aspect, perspCam.zoom);

  orthoCam.left = frustum.left;
  orthoCam.right = frustum.right;
  orthoCam.top = frustum.top;
  orthoCam.bottom = frustum.bottom;
  orthoCam.zoom = 1.0;

  orthoCam.position.copy(perspCam.position);
  orthoCam.quaternion.copy(perspCam.quaternion);
  orthoCam.up.copy(perspCam.up);
  orthoCam.near = perspCam.near;
  orthoCam.far = perspCam.far;
  orthoCam.updateProjectionMatrix();
}

/**
 * Synchronises a PerspectiveCamera with an OrthographicCamera after orthographic zoom or pan,
 * restoring the perspective camera position and distance so focal plane scale is preserved.
 */
export function synchronizePerspectiveWithOrtho(
  orthoCam: THREE.OrthographicCamera,
  perspCam: THREE.PerspectiveCamera,
  focalPoint: THREE.Vector3,
  baseFov: number,
): void {
  const currentCamDir = new THREE.Vector3()
    .copy(orthoCam.position)
    .sub(focalPoint)
    .normalize();

  const equivDistance = calculateEquivalentPerspectiveDistance(
    orthoCam.top,
    orthoCam.zoom,
    baseFov,
  );

  perspCam.position.copy(focalPoint).addScaledVector(currentCamDir, equivDistance);
  perspCam.quaternion.copy(orthoCam.quaternion);
  perspCam.up.copy(orthoCam.up);
  perspCam.fov = baseFov;
  perspCam.zoom = 1.0;
  perspCam.updateProjectionMatrix();
}

/**
 * Resolves the closest cardinal normal axis (+/- X, +/- Y, or +/- Z) for a given camera direction.
 */
export function getClosestCardinalAxis(
  camDir: THREE.Vector3,
  outVector?: THREE.Vector3,
): THREE.Vector3 {
  const result = outVector ?? new THREE.Vector3();
  const absX = Math.abs(camDir.x);
  const absY = Math.abs(camDir.y);
  const absZ = Math.abs(camDir.z);

  if (absZ >= absX && absZ >= absY) {
    result.set(0, 0, Math.sign(camDir.z) || 1);
  } else if (absY >= absX && absY >= absZ) {
    result.set(0, Math.sign(camDir.y) || 1, 0);
  } else {
    result.set(Math.sign(camDir.x) || 1, 0, 0);
  }

  return result;
}

export type CardinalDirection = 'top' | 'bottom' | 'front' | 'back' | 'right' | 'left';

/**
 * Static registry of cardinal orientations, canonical normals, and singular-free up vectors.
 */
export const CARDINAL_CONFIG: Record<
  CardinalDirection,
  { normal: [number, number, number]; up: [number, number, number] }
> = {
  top: { normal: [0, 0, 1], up: [0, 1, 0] },
  bottom: { normal: [0, 0, -1], up: [0, 1, 0] },
  front: { normal: [0, -1, 0], up: [0, 0, 1] },
  back: { normal: [0, 1, 0], up: [0, 0, 1] },
  right: { normal: [1, 0, 0], up: [0, 0, 1] },
  left: { normal: [-1, 0, 0], up: [0, 0, 1] },
};

/**
 * Returns whether a normalized camera direction vector is within a threshold angle of any cardinal axis.
 * Default threshold is 20 degrees (~0.349 rad, matching planar grid fade threshold 0.94).
 */
export function isNearCardinalAxis(
  camDir: THREE.Vector3,
  thresholdAngleRad: number = (20 * Math.PI) / 180,
): boolean {
  const closest = getClosestCardinalAxis(camDir);
  const dot = camDir.dot(closest);
  return dot >= Math.cos(thresholdAngleRad) - 1e-5;
}

/**
 * Resolves the CardinalDirection name for a given vector by finding the closest cardinal axis.
 */
export function getCardinalDirectionFromVector(vec: THREE.Vector3): CardinalDirection {
  const axis = getClosestCardinalAxis(vec);
  if (axis.z === 1) return 'top';
  if (axis.z === -1) return 'bottom';
  if (axis.y === 1) return 'back';
  if (axis.y === -1) return 'front';
  if (axis.x === 1) return 'right';
  return 'left';
}

/**
 * Returns the unit normal vector for a given cardinal direction.
 */
export function getCardinalNormal(dir: CardinalDirection): THREE.Vector3 {
  const [x, y, z] = CARDINAL_CONFIG[dir].normal;
  return new THREE.Vector3(x, y, z);
}

/**
 * Returns the canonical up vector for a given cardinal direction.
 * Top/bottom return [0, 1, 0] to eliminate gimbal lock along the Z axis.
 */
export function getCardinalUp(dir: CardinalDirection): THREE.Vector3 {
  const [x, y, z] = CARDINAL_CONFIG[dir].up;
  return new THREE.Vector3(x, y, z);
}

