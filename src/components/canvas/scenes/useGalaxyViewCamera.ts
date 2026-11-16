import { useMemo } from 'react';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
  type StandardCameraConfig,
} from '../cartography/cartographyCamera';
import { useCameraStore } from '../../../stores/useCameraStore';

const ORIGIN_COORDS: readonly [number, number, number] = [0, 0, 0];

export function resolveCenterCoords(
  coords?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number },
): [number, number, number] {
  if (!coords) return ORIGIN_COORDS as [number, number, number];
  if ('x' in coords) return [coords.x, coords.y, coords.z];
  return [coords[0], coords[1], coords[2]];
}

export function useGalaxyViewCamera(
  centerCoordinates?:
    | readonly [number, number, number]
    | [number, number, number]
    | { x: number; y: number; z: number },
  cameraDistance?: number,
): StandardCameraConfig {
  const targetCoords = useMemo(
    () => resolveCenterCoords(centerCoordinates),
    [centerCoordinates],
  );

  const resolvedCameraDistance =
    typeof cameraDistance === 'number' && Number.isFinite(cameraDistance) && cameraDistance > 0
      ? cameraDistance
      : STANDARD_CAMERA_DISTANCES.galactic;

  return useMemo(() => {
    const saved = useCameraStore.getState().savedGalaxyCamera;
    const isTargetZero = targetCoords[0] === 0 && targetCoords[1] === 0 && targetCoords[2] === 0;
    const isSavedMatch =
      saved &&
      (isTargetZero ||
        Math.hypot(
          saved.target[0] - targetCoords[0],
          saved.target[1] - targetCoords[1],
          saved.target[2] - targetCoords[2],
        ) < 0.05);

    if (saved && isSavedMatch && !cameraDistance) {
      return {
        position: saved.position,
        target: saved.target,
        up: saved.up,
        fov: 45,
      };
    }
    return getStandardInitialCamera(resolvedCameraDistance, targetCoords);
  }, [resolvedCameraDistance, targetCoords, cameraDistance]);
}
