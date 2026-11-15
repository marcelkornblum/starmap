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

  return { left, right, top, bottom, zoom: 1.0 };
}

/**
 * Calculates the equivalent camera distance for a perspective camera that matches
 * the scale of an orthographic camera at a given zoom level and baseline FOV.
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

  return { fov: targetFov, zoom: targetZoom };
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
 * Normalized critically damped easing function over t in [0, 1].
 * Provides rapid initial acceleration and asymptotic deceleration with zero overshoot.
 */
export function criticallyDamped(t: number, lambda = 6.0): number {
  if (t <= 0 || !Number.isFinite(t)) return 0;
  if (t >= 1) return 1;
  const safeLambda = Math.max(1e-3, lambda);
  const num = 1 - (1 + safeLambda * t) * Math.exp(-safeLambda * t);
  const den = 1 - (1 + safeLambda) * Math.exp(-safeLambda);
  return Math.max(0, Math.min(1, num / den));
}

/**
 * Calculates logarithmic zoom step distance clamped within reference frame min/max bounds.
 * Scaling is geometric (log-linear) for consistent perceived velocity across parsec to km scales.
 */
export function calculateLogarithmicZoomStep(
  currentDistance: number,
  delta: number,
  minDistance: number,
  maxDistance: number,
  stepFactor: number = 1.15,
): number {
  const safeCurrent = Number.isFinite(currentDistance) ? Math.max(1e-4, currentDistance) : 10;
  const safeMin = Number.isFinite(minDistance) ? Math.max(1e-4, minDistance) : 1;
  const safeMax = Number.isFinite(maxDistance) ? Math.max(safeMin, maxDistance) : 1000;
  const safeFactor = Number.isFinite(stepFactor) ? Math.max(1.01, stepFactor) : 1.15;
  const safeDelta = Number.isFinite(delta) ? delta : 0;

  const newDistance = safeCurrent * Math.pow(safeFactor, -safeDelta);
  return Math.max(safeMin, Math.min(safeMax, newDistance));
}

/**
 * Logarithmically interpolates distance between startDistance and endDistance over progress t [0, 1].
 */
export function interpolateLogarithmicDistance(
  startDistance: number,
  endDistance: number,
  t: number,
): number {
  const safeStart = Number.isFinite(startDistance) ? Math.max(1e-4, startDistance) : 1;
  const safeEnd = Number.isFinite(endDistance) ? Math.max(1e-4, endDistance) : 1;
  const clampedT = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;

  return safeStart * Math.pow(safeEnd / safeStart, clampedT);
}
