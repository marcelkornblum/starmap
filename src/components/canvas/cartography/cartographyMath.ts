import * as THREE from 'three';

export type ScreenEdgeBearingType = 'core' | 'orbital';
export type ScreenEdgeSide = 'top' | 'right' | 'bottom' | 'left' | 'none';

export interface ScreenEdgeBearingResult {
  x: number;
  y: number;
  edge: ScreenEdgeSide;
  angle: number;
  isAttached: boolean;
  visible: boolean;
}

const scratchPA = new THREE.Vector3();
const scratchPB = new THREE.Vector3();
const scratchLocalPoint = new THREE.Vector3();
const scratchWorldPoint = new THREE.Vector3();
const scratchHeadingDir = new THREE.Vector3();
const scratchVCam = new THREE.Vector3();
const scratchOriginCam = new THREE.Vector3();
const scratchEndCam = new THREE.Vector3();
const SCRATCH_P = new Float64Array(4);
const SCRATCH_Q = new Float64Array(4);

function sampleBearingPoint(
  s: number,
  bearingType: ScreenEdgeBearingType,
  centerDistance: number,
  origin: THREE.Vector3,
  orientation: THREE.Quaternion | undefined,
  outVec: THREE.Vector3,
): void {
  if (bearingType === 'core') {
    scratchLocalPoint.set(s, 0, 0);
  } else {
    const phi = s / centerDistance;
    scratchLocalPoint.set(
      centerDistance * (1 - Math.cos(phi)),
      centerDistance * Math.sin(phi),
      0,
    );
  }
  if (orientation) {
    outVec.copy(scratchLocalPoint).applyQuaternion(orientation).add(origin);
  } else {
    outVec.copy(scratchLocalPoint).add(origin);
  }
}

/**
 * Calculates screen-space position, edge placement, and orientation angle for
 * cardinal bearing indicators (Galactic Core and Galactic Orbital).
 */
export function calculateScreenEdgeBearing(
  camera: THREE.Camera,
  screenSize: { width: number; height: number },
  margin = 28,
  bearingType: ScreenEdgeBearingType = 'core',
  origin = new THREE.Vector3(0, 0, 0),
  centerDistance = 2000,
  extent = 2000,
  out?: ScreenEdgeBearingResult,
  minLineLength = 40,
  orientation?: THREE.Quaternion,
): ScreenEdgeBearingResult {
  const result = out ?? {
    x: 0,
    y: 0,
    edge: 'right' as ScreenEdgeSide,
    angle: 0,
    isAttached: false,
    visible: false,
  };

  const width = Math.max(1, screenSize.width);
  const height = Math.max(1, screenSize.height);
  const safeMargin = Math.min(margin, Math.min(width, height) * 0.45);
  const xMin = safeMargin;
  const xMax = width - safeMargin;
  const yMin = safeMargin;
  const yMax = height - safeMargin;
  const cx = width * 0.5;
  const cy = height * 0.5;

  const numSteps = 40;
  const stepSize = extent / numSteps;

  const viewMatrix = camera.matrixWorldInverse;
  const projMatrix = camera.projectionMatrix;
  const zNear = ('near' in camera && typeof camera.near === 'number') ? camera.near : 0.1;

  for (let i = 0; i < numSteps; i++) {
    const s0 = i * stepSize;
    const s1 = (i + 1) * stepSize;

    sampleBearingPoint(s0, bearingType, centerDistance, origin, orientation, scratchWorldPoint);
    scratchPA.copy(scratchWorldPoint).applyMatrix4(viewMatrix);

    sampleBearingPoint(s1, bearingType, centerDistance, origin, orientation, scratchWorldPoint);
    scratchPB.copy(scratchWorldPoint).applyMatrix4(viewMatrix);

    const aBehind = scratchPA.z > -zNear;
    const bBehind = scratchPB.z > -zNear;

    if (aBehind && bBehind) continue;

    if (aBehind && !bBehind) {
      const t = (-zNear - scratchPA.z) / (scratchPB.z - scratchPA.z);
      scratchPA.lerp(scratchPB, t);
    } else if (!aBehind && bBehind) {
      const t = (-zNear - scratchPA.z) / (scratchPB.z - scratchPA.z);
      scratchPB.copy(scratchPA).lerp(scratchPB, t);
    }

    scratchPA.applyMatrix4(projMatrix);
    scratchPB.applyMatrix4(projMatrix);

    const sAx = (scratchPA.x + 1) * 0.5 * width;
    const sAy = (1 - scratchPA.y) * 0.5 * height;
    const sBx = (scratchPB.x + 1) * 0.5 * width;
    const sBy = (1 - scratchPB.y) * 0.5 * height;

    const dx = sBx - sAx;
    const dy = sBy - sAy;
    SCRATCH_P[0] = -dx;
    SCRATCH_P[1] = dx;
    SCRATCH_P[2] = -dy;
    SCRATCH_P[3] = dy;
    SCRATCH_Q[0] = sAx - xMin;
    SCRATCH_Q[1] = xMax - sAx;
    SCRATCH_Q[2] = sAy - yMin;
    SCRATCH_Q[3] = yMax - sAy;
    let u1 = 0;
    let u2 = 1;
    let exitEdge: ScreenEdgeSide | null = null;
    let possible = true;

    for (let k = 0; k < 4; k++) {
      const pk = SCRATCH_P[k];
      const qk = SCRATCH_Q[k];
      if (pk === 0) {
        if (qk < 0) { possible = false; break; }
      } else {
        const t = qk / pk;
        if (pk < 0) {
          if (t > u2) { possible = false; break; }
          if (t > u1) u1 = t;
        } else {
          if (t < u1) { possible = false; break; }
          if (t < u2) {
            u2 = t;
            exitEdge = k === 1 ? 'right' : (k === 0 ? 'left' : (k === 3 ? 'bottom' : 'top'));
          }
        }
      }
    }

    if (possible && u2 <= 1 && u2 >= 0 && exitEdge !== null) {
      result.x = Math.min(xMax, Math.max(xMin, sAx + u2 * dx));
      result.y = Math.min(yMax, Math.max(yMin, sAy + u2 * dy));
      result.edge = exitEdge;
      result.angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      result.isAttached = true;
      result.visible = true;
      return result;
    }
  }

  sampleBearingPoint(extent, bearingType, centerDistance, origin, orientation, scratchWorldPoint);
  scratchEndCam.copy(scratchWorldPoint).applyMatrix4(viewMatrix);
  const endInFront = scratchEndCam.z <= -zNear;

  if (endInFront) {
    scratchEndCam.applyMatrix4(projMatrix);
    const endScreenX = (scratchEndCam.x + 1) * 0.5 * width;
    const endScreenY = (1 - scratchEndCam.y) * 0.5 * height;
    const endInside = endScreenX >= xMin && endScreenX <= xMax && endScreenY >= yMin && endScreenY <= yMax;

    if (endInside) {
      scratchOriginCam.copy(origin).applyMatrix4(viewMatrix);
      if (scratchOriginCam.z <= -zNear) {
        scratchOriginCam.applyMatrix4(projMatrix);
        const originScreenX = (scratchOriginCam.x + 1) * 0.5 * width;
        const originScreenY = (1 - scratchOriginCam.y) * 0.5 * height;
        if (Math.hypot(endScreenX - originScreenX, endScreenY - originScreenY) < minLineLength) {
          result.visible = false;
          return result;
        }
      }

      const deltaS = Math.min(extent * 0.05, Math.max(1, extent / numSteps));
      sampleBearingPoint(extent - deltaS, bearingType, centerDistance, origin, orientation, scratchWorldPoint);
      scratchPA.copy(scratchWorldPoint).applyMatrix4(viewMatrix);
      if (scratchPA.z <= -zNear) {
        scratchPA.applyMatrix4(projMatrix);
        const prevScreenX = (scratchPA.x + 1) * 0.5 * width;
        const prevScreenY = (1 - scratchPA.y) * 0.5 * height;
        result.angle = (Math.atan2(endScreenY - prevScreenY, endScreenX - prevScreenX) * 180) / Math.PI;
      } else {
        if (bearingType === 'core') scratchHeadingDir.set(1, 0, 0);
        else {
          const phi = extent / centerDistance;
          scratchHeadingDir.set(Math.sin(phi), Math.cos(phi), 0);
        }
        if (orientation) scratchHeadingDir.applyQuaternion(orientation);
        scratchVCam.copy(scratchHeadingDir).transformDirection(viewMatrix);
        result.angle = (Math.atan2(-scratchVCam.y, scratchVCam.x) * 180) / Math.PI;
      }

      result.x = endScreenX;
      result.y = endScreenY;
      result.edge = 'none';
      result.isAttached = true;
      result.visible = true;
      return result;
    }
  }

  if (bearingType === 'core') scratchHeadingDir.set(1, 0, 0);
  else scratchHeadingDir.set(0, 1, 0);
  if (orientation) scratchHeadingDir.applyQuaternion(orientation);

  scratchVCam.copy(scratchHeadingDir).transformDirection(viewMatrix);
  let sx = scratchVCam.x;
  let sy = -scratchVCam.y;
  const len = Math.hypot(sx, sy);
  if (len < 1e-6) { sx = 1; sy = 0; }
  else { sx /= len; sy /= len; }

  const tx = sx > 0 ? (xMax - cx) / sx : (sx < 0 ? (xMin - cx) / sx : Infinity);
  const ty = sy > 0 ? (yMax - cy) / sy : (sy < 0 ? (yMin - cy) / sy : Infinity);
  const t = Math.min(tx, ty);

  result.x = Math.min(xMax, Math.max(xMin, cx + t * sx));
  result.y = Math.min(yMax, Math.max(yMin, cy + t * sy));
  result.edge = tx < ty ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'bottom' : 'top');
  result.angle = (Math.atan2(sy, sx) * 180) / Math.PI;
  result.isAttached = false;
  result.visible = true;
  return result;
}
