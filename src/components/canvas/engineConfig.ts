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
  entityAperture: -0.1,
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

/** Authoritative default reticle size in world units (~half of legacy 0.45) */
export const DEFAULT_RETICLE_SIZE = 0.22;

/** Minimum screen-space hit diameter and radius (px) for coarse/touch pointers. */
export const MIN_HIT_DIAMETER_TOUCH_PX = 44;
export const MIN_HIT_RADIUS_TOUCH_PX = MIN_HIT_DIAMETER_TOUCH_PX / 2;

/** Minimum screen-space hit diameter and radius (px) for fine/mouse pointers. */
export const MIN_HIT_DIAMETER_MOUSE_PX = 28;
export const MIN_HIT_RADIUS_MOUSE_PX = MIN_HIT_DIAMETER_MOUSE_PX / 2;

/** Maximum pointer movement (px) considered a tap/click rather than a camera drag. */
export const POINTER_TAP_SLOP_TOUCH_PX = 14;
export const POINTER_TAP_SLOP_MOUSE_PX = 8;

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
  if (camera && typeof camera === 'object') {
    if ('isOrthographicCamera' in camera && (camera as { isOrthographicCamera: boolean }).isOrthographicCamera) {
      const ortho = camera as unknown as { top: number; bottom: number; zoom?: number };
      const zoom = typeof ortho.zoom === 'number' ? Math.max(ortho.zoom, 1e-4) : 1.0;
      const visibleHeight = (ortho.top - ortho.bottom) / zoom;
      const refVisibleHeight = 2 * referenceFootprint * Math.tan((referenceFovDeg * Math.PI) / 360);
      return visibleHeight / refVisibleHeight;
    }
    if ('isPerspectiveCamera' in camera && (camera as { isPerspectiveCamera: boolean }).isPerspectiveCamera) {
      const persp = camera as unknown as { fov?: number; zoom?: number };
      const fov = typeof persp.fov === 'number' ? persp.fov : referenceFovDeg;
      const zoom = typeof persp.zoom === 'number' ? Math.max(persp.zoom, 1e-4) : 1.0;
      const fovFactor = (Math.tan((fov * Math.PI) / 360) / Math.tan((referenceFovDeg * Math.PI) / 360)) / zoom;
      return (camDist / referenceFootprint) * fovFactor;
    }
  }
  return camDist / referenceFootprint;
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

/**
 * Resolves the effective screen-space hit radius (px), enforcing the touch/mouse floor
 * while expanding to cover larger visual reticles or projected planetary discs.
 */
export function resolveEffectiveHitRadiusPx(
  visualReticleRadiusPx: number,
  isCoarseOrTouch: boolean,
  projectedBodyRadiusPx = 0,
): number {
  const floorPx = isCoarseOrTouch ? MIN_HIT_RADIUS_TOUCH_PX : MIN_HIT_RADIUS_MOUSE_PX;
  return Math.max(visualReticleRadiusPx, floorPx, projectedBodyRadiusPx);
}

/**
 * Converts a screen-space hit radius (px) into world-space reticle units at reference distance.
 * Inverse of `reticleSizeToScreenPx`.
 */
export function screenRadiusPxToReticleWorldUnits(
  radiusPx: number,
  viewportHeightPx: number,
  referenceScale = SCREEN_HEIGHT_REFERENCE_SCALE,
): number {
  if (viewportHeightPx <= 0 || !Number.isFinite(viewportHeightPx)) {
    return 0;
  }
  return (radiusPx / viewportHeightPx) * referenceScale;
}

/**
 * Detects whether the active environment primarily uses a coarse/touch pointer.
 * Call outside `useFrame` hot loops.
 */
export function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(any-pointer: coarse)').matches
  );
}

let coarsePointerInitialized = false;
let coarsePointerValue = false;
const coarsePointerListeners = new Set<() => void>();
let coarsePrimaryMql: MediaQueryList | null = null;
let coarseAnyMql: MediaQueryList | null = null;
let coarseMqlListener: (() => void) | null = null;

function notifyCoarsePointerListeners(): void {
  for (const listener of coarsePointerListeners) {
    listener();
  }
}

function ensureCoarsePointerInitialized(): void {
  if (coarsePointerInitialized) return;
  coarsePointerInitialized = true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    coarsePointerValue = false;
    return;
  }
  coarsePrimaryMql = window.matchMedia('(pointer: coarse)');
  coarseAnyMql = window.matchMedia('(any-pointer: coarse)');
  coarsePointerValue = Boolean(coarsePrimaryMql?.matches || coarseAnyMql?.matches);
  coarseMqlListener = () => {
    const next = Boolean(coarsePrimaryMql?.matches || coarseAnyMql?.matches);
    if (next && !coarsePointerValue) {
      coarsePointerValue = true;
      notifyCoarsePointerListeners();
    }
  };
  coarsePrimaryMql?.addEventListener?.('change', coarseMqlListener);
  coarseAnyMql?.addEventListener?.('change', coarseMqlListener);
}

/**
 * Returns the cached module-level coarse/touch pointer snapshot (safe inside `useFrame`).
 */
export function getCoarsePointerSnapshot(): boolean {
  ensureCoarsePointerInitialized();
  return coarsePointerValue;
}

/**
 * Promotes the cached coarse-pointer snapshot to `true` upon observing a touch pointer event.
 */
export function promoteCoarseTouch(): void {
  ensureCoarsePointerInitialized();
  if (!coarsePointerValue) {
    coarsePointerValue = true;
    notifyCoarsePointerListeners();
  }
}

/**
 * Subscribes to module-level coarse-pointer promotion/media-query changes.
 */
export function subscribeCoarsePointer(cb: () => void): () => void {
  ensureCoarsePointerInitialized();
  coarsePointerListeners.add(cb);
  return () => {
    coarsePointerListeners.delete(cb);
  };
}

/**
 * Resets the singleton coarse-pointer cache and detaches media-query listeners (for unit tests).
 */
export function resetCoarsePointerForTesting(): void {
  if (coarseMqlListener) {
    coarsePrimaryMql?.removeEventListener?.('change', coarseMqlListener);
    coarseAnyMql?.removeEventListener?.('change', coarseMqlListener);
  }
  coarsePrimaryMql = null;
  coarseAnyMql = null;
  coarseMqlListener = null;
  coarsePointerInitialized = false;
  coarsePointerValue = false;
  coarsePointerListeners.clear();
}

/**
 * Shared no-op Three.js raycast callback for visual-only meshes, lines, and point clouds
 * so root viewport `onPointerMissed` traversal skips expensive vertex/segment intersection math.
 */
export const NOOP_RAYCAST = (): void => {};

export interface EntityScaleFrameState {
  screenScale: number;
  referenceFootprint: number;
  fovFactor: number;
}

/**
 * Resolves the screen-invariant scaling factor for an entity at distance `camDist`.
 * When a `frameState` (`SpatialFrameState`) is present:
 * - Orthographic camera: returns `frameState.screenScale` (distance-independent).
 * - Perspective camera: returns `(Math.max(camDist, 1e-4) / frameState.referenceFootprint) * frameState.fovFactor`.
 * When `frameState` is not present, falls back to `calculateScreenInvariantScale(camDist, camera)`.
 */
export function resolveEntityScreenInvariantScale(
  camDist: number,
  camera: unknown,
  frameState?: EntityScaleFrameState | null,
): number {
  if (frameState) {
    const isOrtho = Boolean(
      camera &&
        typeof camera === 'object' &&
        'isOrthographicCamera' in camera &&
        (camera as { isOrthographicCamera?: boolean }).isOrthographicCamera,
    );
    if (isOrtho) {
      return frameState.screenScale;
    }
    return (Math.max(camDist, 1e-4) / frameState.referenceFootprint) * frameState.fovFactor;
  }
  return calculateScreenInvariantScale(camDist, camera);
}

