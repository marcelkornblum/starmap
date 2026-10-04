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
  const buffer = new Float32Array((steps + 1) * 3);
  for (let i = 0; i <= steps; i++) {
    const theta = startAngle + (i / steps) * (endAngle - startAngle);
    const u = radius * Math.cos(theta);
    const v = radius * Math.sin(theta);
    const idx = i * 3;

    if (plane === 'xy') {
      buffer[idx] = u;
      buffer[idx + 1] = v;
      buffer[idx + 2] = 0;
    } else if (plane === 'xz') {
      buffer[idx] = u;
      buffer[idx + 1] = 0;
      buffer[idx + 2] = v;
    } else {
      buffer[idx] = 0;
      buffer[idx + 1] = u;
      buffer[idx + 2] = v;
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
