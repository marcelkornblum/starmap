import * as THREE from 'three';
import { QUADRANTS as BASE_QUADRANTS } from '../../../utils/spatialMath';

export const QUADRANT_STEPS = 32;
export const DEGREE_TICKS = [15, 30, 45, 60, 75];

export interface QuadrantDefinition {
  qx: number;
  qy: number;
  startAngle: number;
  endAngle: number;
}

export const QUADRANTS: readonly QuadrantDefinition[] = BASE_QUADRANTS.map((quad, i) => ({
  ...quad,
  startAngle: (i * Math.PI) / 2,
  endAngle: ((i + 1) * Math.PI) / 2,
}));

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
