import type * as THREE from 'three';

export interface CardinalAlignment {
  alphaX: number;
  alphaY: number;
  alphaZ: number;
  maxAlpha: number;
}

export interface TransitionWeights {
  wTransX: number;
  wTransY: number;
  wTransZ: number;
}

export interface AllPlaneQuadrantWeights {
  qwXY: [number, number, number, number];
  qwXZ: [number, number, number, number];
  qwYZ: [number, number, number, number];
  fadeXY: number;
  fadeXZ: number;
  fadeYZ: number;
  maxAlpha: number;
}

export const QUADRANTS = [
  { qx: 1, qy: 1 },
  { qx: -1, qy: 1 },
  { qx: -1, qy: -1 },
  { qx: 1, qy: -1 },
] as const;

/**
 * Calculates angular cardinal alignment factors for a given camera direction vector.
 * Smooth transition range: [startThreshold (~20 deg), endThreshold (~10 deg)].
 */
export function computeCardinalAlignment(
  camDirection: THREE.Vector3,
  startThreshold = 0.94,
  endThreshold = 0.985,
): CardinalAlignment {
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
 * Calculates transition weights across coordinate planes when moving between octants.
 */
export function computeTransitionWeights(
  camDirection: THREE.Vector3,
  tauTrans = 0.35,
  maxAlpha = 0,
): TransitionWeights {
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

/**
 * Calculates quadrant weight for an individual quadrant arc.
 * When approaching a cardinal axis (normalAlpha -> 1.0), all four quadrants expand to 1.0,
 * transforming the quarter-fin into the full 360-degree Polar Cartographic Dial.
 */
export function computeQuadrantWeight(
  qx: number,
  qy: number,
  targetSx: number,
  targetSy: number,
  transX: number,
  transY: number,
  normalAlpha: number,
): number {
  const matchX = qx === targetSx ? 1 : transX;
  const matchY = qy === targetSy ? 1 : transY;
  const segWeight = matchX * matchY;
  return Math.max(segWeight, normalAlpha);
}

/**
 * Computes all quadrant weights and grazing fades across all three orthogonal planes (XY, XZ, YZ).
 */
export function computeAllPlaneQuadrantWeights(
  camDir: THREE.Vector3,
  startThreshold = 0.94,
  endThreshold = 0.985,
  tauTrans = 0.35,
): AllPlaneQuadrantWeights {
  const { alphaX, alphaY, alphaZ, maxAlpha } = computeCardinalAlignment(
    camDir,
    startThreshold,
    endThreshold,
  );
  const { wTransX, wTransY, wTransZ } = computeTransitionWeights(
    camDir,
    tauTrans,
    maxAlpha,
  );

  const sx = camDir.x >= 0 ? 1 : -1;
  const sy = camDir.y >= 0 ? 1 : -1;
  const sz = camDir.z >= 0 ? 1 : -1;

  const fadeXY = 1 - Math.max(alphaX, alphaY);
  const fadeXZ = 1 - Math.max(alphaX, alphaZ);
  const fadeYZ = 1 - Math.max(alphaY, alphaZ);

  const qwXY: [number, number, number, number] = [0, 0, 0, 0];
  const qwXZ: [number, number, number, number] = [0, 0, 0, 0];
  const qwYZ: [number, number, number, number] = [0, 0, 0, 0];

  for (let q = 0; q < 4; q++) {
    const quad = QUADRANTS[q];
    qwXY[q] = computeQuadrantWeight(quad.qx, quad.qy, sx, sy, wTransX, wTransY, alphaZ);
    qwXZ[q] = computeQuadrantWeight(quad.qx, quad.qy, sx, sz, wTransX, wTransZ, alphaY);
    qwYZ[q] = computeQuadrantWeight(quad.qx, quad.qy, sy, sz, wTransY, wTransZ, alphaX);
  }

  return {
    qwXY,
    qwXZ,
    qwYZ,
    fadeXY,
    fadeXZ,
    fadeYZ,
    maxAlpha,
  };
}
