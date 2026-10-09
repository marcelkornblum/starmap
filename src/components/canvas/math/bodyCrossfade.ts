import * as THREE from 'three';

/** Projected disc diameter (px) below which the physical body is fully replaced by its node. */
export const DEFAULT_BODY_MIN_PIXEL_SIZE = 24;
/** Width (px) of the body ↔ node cross-fade band above `DEFAULT_BODY_MIN_PIXEL_SIZE`. */
export const DEFAULT_BODY_FADE_RANGE = 16;
/** Opacity below which a cross-faded layer is hidden outright. */
export const CROSSFADE_VISIBILITY_EPSILON = 0.005;

/**
 * Projected on-screen diameter (px) of a sphere of `worldRadius` centred at `worldPos`.
 * Distance is always measured from the body's world position.
 */
export function projectedPixelDiameter(
  camera: THREE.Camera,
  worldPos: THREE.Vector3,
  worldRadius: number,
  viewportHeight: number,
): number {
  if (camera instanceof THREE.OrthographicCamera) {
    const frustumHeight = (camera.top - camera.bottom) / camera.zoom;
    return ((2 * worldRadius) / Math.max(0.001, frustumHeight)) * viewportHeight;
  }
  if (camera instanceof THREE.PerspectiveCamera) {
    const distance = Math.max(camera.position.distanceTo(worldPos), 1e-4);
    const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;
    return ((2 * worldRadius) / Math.max(0.001, visibleHeight)) * viewportHeight;
  }
  return 0;
}

/**
 * Physical body opacity: 0 when the disc is at or below `minPixelSize`, 1 once it exceeds
 * `minPixelSize + fadeRange`, linear in between.
 */
export function bodyVisibility(diameterPx: number, minPixelSize: number, fadeRange: number): number {
  return THREE.MathUtils.clamp((diameterPx - minPixelSize) / Math.max(fadeRange, 1e-6), 0, 1);
}

/**
 * Invariant node (marker + reticle) opacity: the exact complement of `bodyVisibility`, so the
 * physical body and its cartographic node hand over seamlessly.
 */
export function nodeVisibility(diameterPx: number, minPixelSize: number, fadeRange: number): number {
  return 1 - bodyVisibility(diameterPx, minPixelSize, fadeRange);
}
