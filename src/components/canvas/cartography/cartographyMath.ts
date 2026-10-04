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
  dashLen = LINE_STYLE_CONSTANTS.dashLength,
  gapLen = LINE_STYLE_CONSTANTS.dashGap,
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
 * Creates BufferGeometry for a nearly-squared off galactic coordinate grid on the datum plane (Z=0).
 * Composed of:
 * 1. Gentle concentric circular arcs centered at the distant Galactic Centre (+X Core direction).
 * 2. Radial rays originating from the distant Galactic Centre and expanding outward.
 * Spaced by `gridGap` across `extent` in the local XY plane.
 */
export function createGalacticPlanarGridGeometry(
  extent = 60,
  gridGap = 2.0,
  rGc = 250,
  arcSegments = 32,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const safeExtent = Math.max(1, extent);
  const safeGap = Math.max(0.1, gridGap);
  const safeRgc = Math.max(safeExtent * 2, rGc);
  const safeSegments = Math.max(2, arcSegments);

  // Concentric circular arcs centered at Galactic Centre (+safeRgc, 0, 0)
  const nArcs = Math.ceil(safeExtent / safeGap);
  for (let i = -nArcs; i <= nArcs; i++) {
    const x0 = i * safeGap;
    const rArc = safeRgc - x0;
    if (rArc <= safeExtent) continue;

    for (let s = 0; s < safeSegments; s++) {
      const y1 = -safeExtent + (s / safeSegments) * (2 * safeExtent);
      const y2 = -safeExtent + ((s + 1) / safeSegments) * (2 * safeExtent);

      const x1 = safeRgc - Math.sqrt(Math.max(0, rArc * rArc - y1 * y1));
      const x2 = safeRgc - Math.sqrt(Math.max(0, rArc * rArc - y2 * y2));

      points.push(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0));
    }
  }

  // Radial rays from Galactic Centre (+safeRgc, 0, 0)
  const nRays = Math.ceil(safeExtent / safeGap);
  for (let j = -nRays; j <= nRays; j++) {
    const y0 = j * safeGap;
    const x1 = -safeExtent;
    const y1 = y0 * (1 - x1 / safeRgc);
    const x2 = safeExtent;
    const y2 = y0 * (1 - x2 / safeRgc);

    points.push(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0));
  }

  const geom = new THREE.BufferGeometry().setFromPoints(points);
  geom.computeBoundingSphere();
  return geom;
}
