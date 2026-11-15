import * as THREE from 'three';

/**
 * World-space cartographic line metrics in 3D scene units.
 */
export const LINE_STYLE_CONSTANTS = {
  dashLength: 0.18,
  dashGap: 0.12,
  dotLength: 0.04,
  dotGap: 0.12,
} as const;

/**
 * Builds segmented points for a styled line between two 3D points.
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
      buffer[floatIdx++] = dx * d;
      buffer[floatIdx++] = dy * d;
      buffer[floatIdx++] = dz * d;

      buffer[floatIdx++] = dx * dEnd;
      buffer[floatIdx++] = dy * dEnd;
      buffer[floatIdx++] = dz * dEnd;

      vertexCount += 2;
    }
  }
  return vertexCount;
}

/**
 * Fills a pre-allocated Float32Array with 3D line segment vertices for an unstretched dashed circular orbit.
 */
export function populateCurvedDashedLineBuffer(
  buffer: Float32Array,
  length: number,
  centerDistance: number,
  signY: 1 | -1 = 1,
  dashLen: number = LINE_STYLE_CONSTANTS.dashLength,
  gapLen: number = LINE_STYLE_CONSTANTS.dashGap,
): number {
  if (centerDistance <= 0 || length <= 0) return 0;
  const cycle = dashLen + gapLen;
  let floatIdx = 0;
  let vertexCount = 0;
  const maxFloats = buffer.length - 6;

  for (let s = 0; s < length && floatIdx <= maxFloats; s += cycle) {
    const sEnd = Math.min(s + dashLen, length);
    if (sEnd > s) {
      const phi1 = s / centerDistance;
      const phi2 = sEnd / centerDistance;

      const x1 = centerDistance * (1 - Math.cos(phi1));
      const y1 = (signY * centerDistance * Math.sin(phi1)) || 0;
      const x2 = centerDistance * (1 - Math.cos(phi2));
      const y2 = (signY * centerDistance * Math.sin(phi2)) || 0;

      buffer[floatIdx++] = x1;
      buffer[floatIdx++] = y1;
      buffer[floatIdx++] = 0;

      buffer[floatIdx++] = x2;
      buffer[floatIdx++] = y2;
      buffer[floatIdx++] = 0;

      vertexCount += 2;
    }
  }
  return vertexCount;
}
