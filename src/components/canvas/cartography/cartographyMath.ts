import * as THREE from 'three';

export const QUADRANT_STEPS = 32;
export const DEGREE_TICKS = [15, 30, 45, 60, 75]; // Perimeter degree markings

export interface QuadrantDefinition {
  qx: number;
  qy: number;
  startAngle: number;
  endAngle: number;
}

export const QUADRANTS: readonly QuadrantDefinition[] = [
  { qx: 1, qy: 1, startAngle: 0, endAngle: Math.PI / 2 },
  { qx: -1, qy: 1, startAngle: Math.PI / 2, endAngle: Math.PI },
  { qx: -1, qy: -1, startAngle: Math.PI, endAngle: (3 * Math.PI) / 2 },
  { qx: 1, qy: -1, startAngle: (3 * Math.PI) / 2, endAngle: 2 * Math.PI },
] as const;

/**
 * Creates BufferGeometry for a 90-degree quadrant arc on a given plane.
 */
export function createQuadrantArcGeometry(
  radius: number,
  plane: 'xy' | 'xz' | 'yz',
  startAngle: number,
  endAngle: number,
  steps = QUADRANT_STEPS,
): THREE.BufferGeometry {
  const buffer = new Float32Array(steps * 2 * 3);
  let floatIdx = 0;
  for (let i = 0; i < steps; i++) {
    const t1 = startAngle + (i / steps) * (endAngle - startAngle);
    const t2 = startAngle + ((i + 1) / steps) * (endAngle - startAngle);
    const u1 = radius * Math.cos(t1);
    const v1 = radius * Math.sin(t1);
    const u2 = radius * Math.cos(t2);
    const v2 = radius * Math.sin(t2);

    if (plane === 'xy') {
      buffer[floatIdx++] = u1;
      buffer[floatIdx++] = v1;
      buffer[floatIdx++] = 0;
      buffer[floatIdx++] = u2;
      buffer[floatIdx++] = v2;
      buffer[floatIdx++] = 0;
    } else if (plane === 'xz') {
      buffer[floatIdx++] = u1;
      buffer[floatIdx++] = 0;
      buffer[floatIdx++] = v1;
      buffer[floatIdx++] = u2;
      buffer[floatIdx++] = 0;
      buffer[floatIdx++] = v2;
    } else {
      buffer[floatIdx++] = 0;
      buffer[floatIdx++] = u1;
      buffer[floatIdx++] = v1;
      buffer[floatIdx++] = 0;
      buffer[floatIdx++] = u2;
      buffer[floatIdx++] = v2;
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Creates BufferGeometry for perimeter tick marks on a 90-degree quadrant arc.
 */
export function createQuadrantTickGeometry(
  radius: number,
  plane: 'xy' | 'xz' | 'yz',
  startAngle: number,
  tickLength = 0.25,
): THREE.BufferGeometry {
  const buffer = new Float32Array(DEGREE_TICKS.length * 6);
  let idx = 0;
  for (const deg of DEGREE_TICKS) {
    const theta = startAngle + (deg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const rOuter = radius;
    const rInner = radius - tickLength;

    if (plane === 'xy') {
      buffer[idx++] = rInner * cosT;
      buffer[idx++] = rInner * sinT;
      buffer[idx++] = 0;
      buffer[idx++] = rOuter * cosT;
      buffer[idx++] = rOuter * sinT;
      buffer[idx++] = 0;
    } else if (plane === 'xz') {
      buffer[idx++] = rInner * cosT;
      buffer[idx++] = 0;
      buffer[idx++] = rInner * sinT;
      buffer[idx++] = rOuter * cosT;
      buffer[idx++] = 0;
      buffer[idx++] = rOuter * sinT;
    } else {
      buffer[idx++] = 0;
      buffer[idx++] = rInner * cosT;
      buffer[idx++] = rInner * sinT;
      buffer[idx++] = 0;
      buffer[idx++] = rOuter * cosT;
      buffer[idx++] = rOuter * sinT;
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Calculates the angular cardinal alignment factors for a given camera direction vector.
 * Smooth transition range: [thresholdStart = 0.94 (~20 deg), thresholdEnd = 0.985 (~10 deg)].
 * - Standard perspective view (> 20 deg from axis) has alpha = 0 (3 full fins visible).
 * - Cardinal axis transition (< 20 deg) smoothly expands concentric circles and fades edge-on fins.
 * - Cardinal view (< 10 deg) has dot >= 0.985 -> alpha = 1.0 (complete orthographic lock).
 */
export function computeCardinalAlignment(
  camDirection: THREE.Vector3,
  startThreshold = 0.94,
  endThreshold = 0.985,
): { alphaX: number; alphaY: number; alphaZ: number; maxAlpha: number } {
  const dotX = Math.abs(camDirection.x);
  const dotY = Math.abs(camDirection.y);
  const dotZ = Math.abs(camDirection.z);

  const calcSmoothAlpha = (dot: number): number => {
    if (dot <= startThreshold) return 0;
    if (dot >= endThreshold) return 1;
    const t = (dot - startThreshold) / (endThreshold - startThreshold);
    return t * t * (3 - 2 * t);
  };

  const alphaX = calcSmoothAlpha(dotX);
  const alphaY = calcSmoothAlpha(dotY);
  const alphaZ = calcSmoothAlpha(dotZ);
  const maxAlpha = Math.max(alphaX, alphaY, alphaZ);

  return { alphaX, alphaY, alphaZ, maxAlpha };
}

/**
 * Calculates transition weights across coordinate planes when moving between octants outside the circle threshold.
 * When approaching an axis plane (|camDir.c| < tauTrans), the incoming segment renders alongside the current segment,
 * joining to form a continuous double segment (180 deg span) across the boundary with zero snapping.
 */
export function computeTransitionWeights(
  camDirection: THREE.Vector3,
  tauTrans = 0.35,
  maxAlpha = 0,
): { wTransX: number; wTransY: number; wTransZ: number } {
  const calcTransWeight = (c: number): number => {
    const d = Math.abs(c);
    if (d >= tauTrans) return 0;
    const t = 1 - d / tauTrans;
    return t * t * (3 - 2 * t) * (1 - maxAlpha);
  };

  return {
    wTransX: calcTransWeight(camDirection.x),
    wTransY: calcTransWeight(camDirection.y),
    wTransZ: calcTransWeight(camDirection.z),
  };
}

export interface ScaledRingInfo {
  radius: number;
  isMajor: boolean;
  fade: number;
}

const SCRATCH_CANDIDATES: ScaledRingInfo[] = Array.from({ length: 12 }, () => ({
  radius: 0,
  isMajor: false,
  fade: 0,
}));

/**
 * Populates pre-allocated target pool with logarithmic 1-2-5 progression concentric range rings with zero allocations.
 * Returns the count of active rings.
 */
export function populateZoomAdaptiveRings(
  rAperture: number,
  target: ScaledRingInfo[],
  maxRings = 6,
): number {
  if (rAperture <= 0) return 0;
  const p = Math.floor(Math.log10(rAperture));
  const candidateDecades = [p - 1, p, p + 1];
  const steps = [1, 2, 5];

  let candidateCount = 0;

  for (let d = 0; d < 3; d++) {
    const unit = Math.pow(10, candidateDecades[d]);
    for (let s = 0; s < 3; s++) {
      const r = steps[s] * unit;
      const rho = r / rAperture;

      // Only candidate rings within visible fractional range [0.05, 0.98]
      if (rho >= 0.05 && rho <= 0.98) {
        // Significant line = exact power of 10 (step === 1)
        const isMajor = steps[s] === 1;

        // Smooth fade at outer perimeter (rho in [0.82, 0.98], fully dissolved before boundary 1.0)
        const fadeOuter = Math.min(1, Math.max(0, (0.98 - rho) / 0.16));
        // Smooth fade near focal center (rho in [0.05, 0.15])
        const fadeInner = Math.min(1, Math.max(0, (rho - 0.05) / 0.10));
        const fade = fadeOuter * fadeInner;

        if (fade > 0.001) {
          const slot = SCRATCH_CANDIDATES[candidateCount++];
          slot.radius = r;
          slot.isMajor = isMajor;
          slot.fade = fade;
        }
      }
    }
  }

  // In-place insertion sort by radius (zero GC allocations)
  for (let i = 1; i < candidateCount; i++) {
    const itemR = SCRATCH_CANDIDATES[i].radius;
    const itemM = SCRATCH_CANDIDATES[i].isMajor;
    const itemF = SCRATCH_CANDIDATES[i].fade;
    let j = i - 1;
    while (j >= 0 && SCRATCH_CANDIDATES[j].radius > itemR) {
      SCRATCH_CANDIDATES[j + 1].radius = SCRATCH_CANDIDATES[j].radius;
      SCRATCH_CANDIDATES[j + 1].isMajor = SCRATCH_CANDIDATES[j].isMajor;
      SCRATCH_CANDIDATES[j + 1].fade = SCRATCH_CANDIDATES[j].fade;
      j--;
    }
    SCRATCH_CANDIDATES[j + 1].radius = itemR;
    SCRATCH_CANDIDATES[j + 1].isMajor = itemM;
    SCRATCH_CANDIDATES[j + 1].fade = itemF;
  }

  const count = Math.min(candidateCount, maxRings);
  for (let i = 0; i < count; i++) {
    const src = SCRATCH_CANDIDATES[i];
    const dst = target[i];
    dst.radius = src.radius;
    dst.isMajor = src.isMajor;
    dst.fade = src.fade;
  }

  return count;
}

/**
 * Computes logarithmic 1-2-5 progression concentric range rings dynamically adapted to active aperture radius (rAperture).
 * As camera zooms in and out:
 * - Zooming out: rings smoothly contract toward focal center, larger metric rings fade in at outer boundary.
 * - Zooming in: rings smoothly expand toward boundary, dissolving at the perimeter, finer metric subdivisions emerge.
 * - Two-tier visual hierarchy: Significant lines (powers of 10) vs Insignificant lines (2, 5 subdivisions).
 */
export function computeZoomAdaptiveRings(rAperture: number, maxRings = 6): ScaledRingInfo[] {
  const tempPool: ScaledRingInfo[] = Array.from({ length: maxRings }, () => ({
    radius: 0,
    isMajor: false,
    fade: 0,
  }));
  const count = populateZoomAdaptiveRings(rAperture, tempPool, maxRings);
  const result: ScaledRingInfo[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      radius: tempPool[i].radius,
      isMajor: tempPool[i].isMajor,
      fade: tempPool[i].fade,
    });
  }
  return result;
}

export const LINE_STYLE_CONSTANTS = {
  // Dashed pattern matching HTML/CSS border-style: dashed (clean, balanced ~1.5:1 ratio)
  dashLength: 0.18,
  dashGap: 0.12,
  // Dotted pattern matching HTML/CSS border-style: dotted (small points with distinct gaps, 1:3 ratio)
  dotLength: 0.04,
  dotGap: 0.12,
} as const;

/**
 * Builds segmented points for a styled line (dashed or dotted) between two 3D points.
 * Ensures dashes or dots NEVER stretch or distort regardless of line length:
 * each dash or dot retains identical metric length, matching HTML line styles.
 */
export function createStyledLinePoints(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  style: 'solid' | 'dashed' | 'dotted' = 'dashed',
  customDashLen?: number,
  customGapLen?: number,
): THREE.Vector3[] {
  if (style === 'solid') {
    return [p1.clone(), p2.clone()];
  }
  const dist = p1.distanceTo(p2);
  if (dist <= 1e-5) return [];

  const isDotted = style === 'dotted';
  const dashLen = customDashLen ?? (isDotted ? LINE_STYLE_CONSTANTS.dotLength : LINE_STYLE_CONSTANTS.dashLength);
  const gapLen = customGapLen ?? (isDotted ? LINE_STYLE_CONSTANTS.dotGap : LINE_STYLE_CONSTANTS.dashGap);
  const cycle = dashLen + gapLen;
  const dir = new THREE.Vector3().subVectors(p2, p1).divideScalar(dist);

  const points: THREE.Vector3[] = [];
  for (let d = 0; d < dist; d += cycle) {
    const segEnd = Math.min(d + dashLen, dist);
    if (segEnd > d) {
      points.push(
        p1.clone().addScaledVector(dir, d),
        p1.clone().addScaledVector(dir, segEnd),
      );
    }
  }
  return points;
}

/**
 * Fills a pre-allocated Float32Array with 3D line segment vertices for an unstretched dashed line.
 * Points are generated along direction vector from 0 to length.
 * Returns the number of vertices written (each vertex has 3 floats).
 */
export function populateDashedLineBuffer(
  buffer: Float32Array,
  length: number,
  direction: [number, number, number],
  dashLen: number = LINE_STYLE_CONSTANTS.dashLength,
  gapLen: number = LINE_STYLE_CONSTANTS.dashGap,
): number {
  const cycle = dashLen + gapLen;
  const [dx, dy, dz] = direction;
  let floatIdx = 0;
  let vertexCount = 0;
  const maxFloats = buffer.length - 6;

  for (let d = 0; d < length && floatIdx <= maxFloats; d += cycle) {
    const dEnd = Math.min(d + dashLen, length);
    if (dEnd > d) {
      // Vertex 1 (start of dash)
      buffer[floatIdx++] = dx * d;
      buffer[floatIdx++] = dy * d;
      buffer[floatIdx++] = dz * d;

      // Vertex 2 (end of dash)
      buffer[floatIdx++] = dx * dEnd;
      buffer[floatIdx++] = dy * dEnd;
      buffer[floatIdx++] = dz * dEnd;

      vertexCount += 2;
    }
  }

  return vertexCount;
}

/**
 * Fills a pre-allocated Float32Array with 3D line segment vertices for an unstretched dashed
 * circular orbit curve around the Galactic Centre.
 *
 * Galactic Centre is located at (+rGc, 0, 0) relative to the orbit tangent at (0, 0, 0).
 * Parametric circle of radius rGc:
 *   x(s) = rGc * (1 - cos(s / rGc))
 *   y(s) = signY * rGc * sin(s / rGc)
 *   z(s) = 0
 *
 * Where:
 * - s is arc length along the circular orbit from 0 to length
 * - signY is +1 for prograde orbital (+Y) or -1 for retrograde / anti-orbital (-Y)
 * - Each dash has exact unstretched metric length dashLen, separated by gapLen.
 * Returns the number of vertices written (each vertex has 3 floats).
 */
export function populateCurvedDashedLineBuffer(
  buffer: Float32Array,
  length: number,
  rGc: number,
  signY: 1 | -1 = 1,
  dashLen: number = LINE_STYLE_CONSTANTS.dashLength,
  gapLen: number = LINE_STYLE_CONSTANTS.dashGap,
): number {
  if (rGc <= 0 || length <= 0) return 0;
  const cycle = dashLen + gapLen;
  let floatIdx = 0;
  let vertexCount = 0;
  const maxFloats = buffer.length - 6;

  for (let s = 0; s < length && floatIdx <= maxFloats; s += cycle) {
    const sEnd = Math.min(s + dashLen, length);
    if (sEnd > s) {
      const phi1 = s / rGc;
      const phi2 = sEnd / rGc;

      const x1 = rGc * (1 - Math.cos(phi1));
      const y1 = (signY * rGc * Math.sin(phi1)) || 0;

      const x2 = rGc * (1 - Math.cos(phi2));
      const y2 = (signY * rGc * Math.sin(phi2)) || 0;

      // Vertex 1
      buffer[floatIdx++] = x1;
      buffer[floatIdx++] = y1;
      buffer[floatIdx++] = 0;

      // Vertex 2
      buffer[floatIdx++] = x2;
      buffer[floatIdx++] = y2;
      buffer[floatIdx++] = 0;

      vertexCount += 2;
    }
  }

  return vertexCount;
}

/**
 * Creates BufferGeometry for a nearly-squared off galactic coordinate grid on the datum plane (Z=0).
 * Composed of:
 * 1. Gentle concentric circular arcs centered at the distant Galactic Centre (+X Core direction).
 * 2. Radial rays originating from the distant Galactic Centre and expanding outward.
 * Spaced by `gridGap` across `extent` in the local XY plane.
 * When `omitCoreAxis` is true, the radial ray at j=0 omits x >= 0 so the central point bearing (+X Core)
 * does not compete with an underlying axis line.
 */
export function createGalacticPlanarGridGeometry(
  extent = 1200,
  gridGap = 100,
  rGc = 2000,
  arcSegments = 64,
  omitCoreAxis = true,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const safeExtent = Math.max(1, extent);
  const safeGap = Math.max(0.1, gridGap);
  const safeRgc = Math.max(safeExtent * 1.5, rGc);
  const safeSegments = Math.max(4, arcSegments);

  // Concentric circular arcs centered at Galactic Centre (+safeRgc, 0, 0)
  const nArcs = Math.ceil(safeExtent / safeGap);
  for (let i = -nArcs; i <= nArcs; i++) {
    const x0 = i * safeGap;
    const rArc = safeRgc - x0;
    if (rArc <= safeExtent * 0.1) continue;

    // Angle span covering -safeExtent to +safeExtent in Y:
    // y = rArc * sin(theta) => thetaMax = asin(min(0.95, safeExtent / rArc))
    const thetaMax = Math.asin(Math.min(0.95, safeExtent / rArc));
    for (let s = 0; s < safeSegments; s++) {
      const t1 = -thetaMax + (s / safeSegments) * (2 * thetaMax);
      const t2 = -thetaMax + ((s + 1) / safeSegments) * (2 * thetaMax);

      const x1 = safeRgc - rArc * Math.cos(t1);
      const y1 = rArc * Math.sin(t1);
      const x2 = safeRgc - rArc * Math.cos(t2);
      const y2 = rArc * Math.sin(t2);

      points.push(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0));
    }
  }

  // Radial rays from Galactic Centre (+safeRgc, 0, 0)
  const nRays = Math.ceil(safeExtent / safeGap);
  for (let j = -nRays; j <= nRays; j++) {
    const y0 = j * safeGap;

    if (j === 0 && omitCoreAxis) {
      // The central point bearing (Core bearing along +X) must not compete with an axis line.
      // Make the axis invisible where it touches the bearing (x >= 0).
      const x1 = -safeExtent;
      const y1 = 0;
      const x2 = 0;
      const y2 = 0;
      points.push(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0));
    } else {
      const x1 = -safeExtent;
      const y1 = y0 * (1 - x1 / safeRgc);
      const x2 = safeExtent;
      const y2 = y0 * (1 - x2 / safeRgc);

      points.push(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0));
    }
  }

  const geom = new THREE.BufferGeometry().setFromPoints(points);
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Canonical Camera Initialisation Specification:
 * - Camera begins elevated above the invariant Z=0 plane (positive Z).
 * - Facing the direction of the Core Bearing (+X direction).
 * - Slightly offset from the Core Bearing line (Y=0) in the direction AWAY from the Orbital Bearing (+Y),
 *   which places the camera at negative Y (-Y).
 * - Camera up-vector is Galactic North (+Z, [0, 0, 1]).
 *
 * Mathematically, for a scene centred at target T = [Tx, Ty, Tz] and distance R:
 * - Elevation angle theta ~ 32 deg above the Z=0 plane:
 *     z = Tz + R * sin(theta)
 *     R_xy = R * cos(theta)
 * - Yaw offset phi ~ 14 deg away from +X towards -Y (away from +Y Orbital Bearing):
 *     x = Tx - R_xy * cos(phi)
 *     y = Ty - R_xy * sin(phi)
 * - Resulting eye position: [Tx - dx, Ty - dy, Tz + dz], facing towards +X, offset in -Y, elevated in +Z.
 */
export interface StandardCameraSetup {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
}

export const STANDARD_CAMERA_DISTANCES = {
  galactic: 28,
  system: 22,
  planetary: 90,
  component: 12,
} as const;

export function getStandardInitialCamera(
  distance: number,
  target: [number, number, number] = [0, 0, 0],
  fov = 45,
): StandardCameraSetup {
  const DEG_TO_RAD = Math.PI / 180;
  const theta = 32 * DEG_TO_RAD; // ~32 deg elevation above invariant plane
  const phi = 14 * DEG_TO_RAD;   // ~14 deg yaw offset from core bearing away from orbital bearing (-Y)

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

export type ScreenEdgeBearingType = 'core' | 'orbital';
export type ScreenEdgeSide = 'top' | 'right' | 'bottom' | 'left';

export interface ScreenEdgeBearingResult {
  x: number;
  y: number;
  edge: ScreenEdgeSide;
  angle: number;
  isAttached: boolean;
  visible: boolean;
}

// Hoisted scratch variables for zero-allocation calculateScreenEdgeBearing
const scratchPA = new THREE.Vector3();
const scratchPB = new THREE.Vector3();
const scratchWorldPoint = new THREE.Vector3();
const scratchHeadingDir = new THREE.Vector3();
const scratchVCam = new THREE.Vector3();

/**
 * Calculates screen-space position, edge placement, and orientation angle for
 * cardinal bearing indicators (Galactic Core and Galactic Orbital).
 *
 * Implements Section 1.4 of docs/3d-spatial-architecture.md:
 * - When a 3D bearing line intersects the visible screen frustum, the indicator
 *   terminates at the viewport boundary (attached state, isAttached: true).
 * - When the bearing line exits the field of view or is directed away/behind the camera,
 *   the indicator detaches from the line and stays pinned to the nearest screen edge
 *   (detached state, isAttached: false) oriented toward the off-screen heading.
 */
export function calculateScreenEdgeBearing(
  camera: THREE.Camera,
  screenSize: { width: number; height: number },
  margin = 28,
  bearingType: ScreenEdgeBearingType = 'core',
  origin = new THREE.Vector3(0, 0, 0),
  rGc = 2000,
  extent = 2000,
  out?: ScreenEdgeBearingResult,
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

  // Evaluate segments along the bearing line to find forward screen-edge exit
  for (let i = 0; i < numSteps; i++) {
    const s0 = i * stepSize;
    const s1 = (i + 1) * stepSize;

    // Point 0 in camera coordinates
    if (bearingType === 'core') {
      scratchWorldPoint.set(origin.x + s0, origin.y, origin.z);
    } else {
      const phi = s0 / rGc;
      scratchWorldPoint.set(
        origin.x + rGc * (1 - Math.cos(phi)),
        origin.y + rGc * Math.sin(phi),
        origin.z,
      );
    }
    scratchPA.copy(scratchWorldPoint).applyMatrix4(viewMatrix);

    // Point 1 in camera coordinates
    if (bearingType === 'core') {
      scratchWorldPoint.set(origin.x + s1, origin.y, origin.z);
    } else {
      const phi = s1 / rGc;
      scratchWorldPoint.set(
        origin.x + rGc * (1 - Math.cos(phi)),
        origin.y + rGc * Math.sin(phi),
        origin.z,
      );
    }
    scratchPB.copy(scratchWorldPoint).applyMatrix4(viewMatrix);

    // Camera looks along -Z. Points in front of near clipping plane have z <= -zNear
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

    // Direct NDC projection
    scratchPA.applyMatrix4(projMatrix);
    scratchPB.applyMatrix4(projMatrix);

    const sAx = (scratchPA.x + 1) * 0.5 * width;
    const sAy = (1 - scratchPA.y) * 0.5 * height;
    const sBx = (scratchPB.x + 1) * 0.5 * width;
    const sBy = (1 - scratchPB.y) * 0.5 * height;

    // Check if segment crosses screen margin bounding box (Liang-Barsky 2D clipping)
    const dx = sBx - sAx;
    const dy = sBy - sAy;
    const p = [-dx, dx, -dy, dy];
    const q = [sAx - xMin, xMax - sAx, sAy - yMin, yMax - sAy];
    let u1 = 0;
    let u2 = 1;
    let exitEdge: ScreenEdgeSide | null = null;
    let possible = true;

    for (let k = 0; k < 4; k++) {
      if (p[k] === 0) {
        if (q[k] < 0) {
          possible = false;
          break;
        }
      } else {
        const t = q[k] / p[k];
        if (p[k] < 0) {
          if (t > u2) {
            possible = false;
            break;
          }
          if (t > u1) u1 = t;
        } else {
          if (t < u1) {
            possible = false;
            break;
          }
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

  // Fallback to detached pinned edge: bearing heading direction relative to camera view
  if (bearingType === 'core') {
    scratchHeadingDir.set(1, 0, 0);
  } else {
    scratchHeadingDir.set(0, 1, 0);
  }

  scratchVCam.copy(scratchHeadingDir).transformDirection(viewMatrix);
  let sx = scratchVCam.x;
  let sy = -scratchVCam.y;
  const len = Math.hypot(sx, sy);
  if (len < 1e-6) {
    sx = 1;
    sy = 0;
  } else {
    sx /= len;
    sy /= len;
  }

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


