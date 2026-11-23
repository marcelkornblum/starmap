import * as THREE from 'three';

export interface OrbitControlsLike {
  target: THREE.Vector3;
  update?: () => void;
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
}

export function isOrbitControlsLike(value: unknown): value is OrbitControlsLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'target' in value &&
    value.target instanceof THREE.Vector3
  );
}

export function applyCameraSavedZoom(cam: THREE.Camera, zoom: number): void {
  if ('zoom' in cam && typeof cam.zoom === 'number') cam.zoom = zoom;
  if ('updateProjectionMatrix' in cam && typeof cam.updateProjectionMatrix === 'function') {
    cam.updateProjectionMatrix();
  }
}

export function getCameraZoom(cam: THREE.Camera): number {
  return 'zoom' in cam && typeof cam.zoom === 'number' ? cam.zoom : 1;
}

export function resolveCenterCoords(
  coords?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number },
): [number, number, number] {
  if (!coords) return [0, 0, 0];
  if ('x' in coords) return [coords.x, coords.y, coords.z];
  return [coords[0], coords[1], coords[2]];
}

export function resolvePositiveFiniteDistance(distance?: number): number | undefined {
  return typeof distance === 'number' && Number.isFinite(distance) && distance > 0
    ? distance
    : undefined;
}

export function isControlsTargetWithinEpsilon(
  controls: OrbitControlsLike | undefined,
  x: number,
  y: number,
  z: number,
  epsilon = 1e-3,
): boolean {
  if (!controls?.target) return false;
  return Math.hypot(controls.target.x - x, controls.target.y - y, controls.target.z - z) < epsilon;
}
