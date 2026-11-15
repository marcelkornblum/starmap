export interface StandardCameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
}

export type StandardCameraSetup = StandardCameraConfig;

export const STANDARD_CAMERA_DISTANCES = {
  galactic: 28,
  system: 22,
  planetary: 120,
  component: 12,
} as const;

/**
 * Computes canonical camera position and orientation:
 * - Elevated ~32 deg above invariant plane.
 * - Facing Core bearing (+X).
 * - Yaw offset ~14 deg away from +X towards -Y.
 * - Up-vector is Galactic North (+Z).
 */
export function getStandardInitialCamera(
  distance: number,
  target: [number, number, number] = [0, 0, 0],
  fov = 45,
): StandardCameraSetup {
  const DEG_TO_RAD = Math.PI / 180;
  const theta = 32 * DEG_TO_RAD;
  const phi = 14 * DEG_TO_RAD;

  const zOffset = distance * Math.sin(theta);
  const rXy = distance * Math.cos(theta);
  const xOffset = rXy * Math.cos(phi);
  const yOffset = rXy * Math.sin(phi);

  return {
    position: [
      target[0] - xOffset,
      target[1] - yOffset,
      target[2] + zOffset,
    ],
    target: [target[0], target[1], target[2]],
    up: [0, 0, 1],
    fov,
  };
}
