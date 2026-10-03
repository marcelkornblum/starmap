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
