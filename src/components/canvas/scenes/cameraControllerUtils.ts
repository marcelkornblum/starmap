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
