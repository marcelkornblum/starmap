/**
 * Canvas-wide engine configuration shared by every R3F canvas (app and Storybook).
 */

/**
 * drei's `<OrbitControls>` calls `controls.update()` inside `useFrame` at this priority.
 * Fixed by drei; mirrored here so our ordering can be expressed relative to it.
 */
export const ORBIT_CONTROLS_PRIORITY = -1;

/**
 * Deterministic per-frame ordering (lower runs first; must stay < 0, since positive
 * priorities disable R3F's automatic rendering):
 *
 * 1. `cameraTransition` writes camera position and controls target.
 * 2. drei OrbitControls applies damping (`ORBIT_CONTROLS_PRIORITY`).
 * 3. `spatialFrame` reads the settled camera and target and computes shared frame maths.
 * 4. `cameraRig` reads cardinal alignment and adjusts FOV/zoom.
 * 5. Default (0): instruments and entities consume the frame and project.
 */
export const FRAME_PRIORITY = {
  cameraTransition: -2,
  spatialFrame: -0.5,
  cameraRig: -0.25,
} as const;

/**
 * OrbitControls damping factor, applied with exactly one `controls.update()` per frame.
 * Calibrated to the pre-remediation feel, where scenes updated controls three times per
 * frame at 0.05 (1 − 0.95³ ≈ 0.14).
 */
export const CONTROLS_DAMPING_FACTOR = 0.14;

/**
 * Baseline reference field of view in degrees (§4.1: narrow FOV 25–45°).
 * Standard reference FOV for screen-invariant projection maths.
 */
export const REFERENCE_FOV_DEG = 45;

/**
 * Invariant instrument footprint radius in scene units at the reference camera distance.
 * Consumed across reticle, stalk, label, and instrument scaling. Backed by `--chrome-instrument-footprint`.
 */
export const REFERENCE_INSTRUMENT_FOOTPRINT = 16.47;

/**
 * Screen height reference scale divisor (16.47 * tan(22.5°) * 2 ≈ 13.644).
 * Converts world-space reticle dimensions into screen pixels relative to viewport height.
 */
export const SCREEN_HEIGHT_REFERENCE_SCALE = 13.644;

/**
 * Calculates the screen-invariant scaling factor for camera distance and FOV.
 * Resolves perspective FOV distortion against baseline reference parameters.
 */
export function calculateScreenInvariantScale(
  camDist: number,
  camera: unknown,
  referenceFootprint = REFERENCE_INSTRUMENT_FOOTPRINT,
  referenceFovDeg = REFERENCE_FOV_DEG,
): number {
  const fov =
    camera && typeof camera === 'object' && 'fov' in camera && typeof (camera as { fov: unknown }).fov === 'number'
      ? (camera as { fov: number }).fov
      : undefined;
  const fovFactor =
    camera &&
    typeof camera === 'object' &&
    'isPerspectiveCamera' in camera &&
    (camera as { isPerspectiveCamera: boolean }).isPerspectiveCamera &&
    fov !== undefined
      ? Math.tan(((fov * Math.PI) / 360)) / Math.tan((referenceFovDeg * Math.PI) / 360)
      : 1.0;
  return (camDist / referenceFootprint) * fovFactor;
}

/**
 * Converts world reticle radius to screen pixels given viewport height.
 */
export function reticleSizeToScreenPx(
  reticleSize: number,
  screenHeight: number,
  referenceScale = SCREEN_HEIGHT_REFERENCE_SCALE,
): number {
  return (reticleSize / referenceScale) * screenHeight;
}
