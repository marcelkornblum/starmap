import * as THREE from 'three';

const CARDINAL_SPOKE_COUNT = 4;
const CARDINAL_SPOKE_INNER_RADIUS = 0.15;
const OUTER_UNIT_RADIUS = 1.0;

const MAJOR_TICK_COUNT = 12;
const MAJOR_TICK_INNER_RADIUS = 0.9;

const MINOR_TICK_COUNT = 24;
const MINOR_TICK_INNER_RADIUS = 0.95;

const GRID_CHORD_OFFSETS: readonly number[] = [-0.6, -0.3, 0.3, 0.6];
const FULL_CIRCLE_RAD = Math.PI * 2;

const MAJOR_VERTEX_COUNT = (CARDINAL_SPOKE_COUNT + MAJOR_TICK_COUNT) * 2;
const MINOR_VERTEX_COUNT = (MINOR_TICK_COUNT + GRID_CHORD_OFFSETS.length * 2) * 2;
const TOTAL_VERTEX_COUNT = MAJOR_VERTEX_COUNT + MINOR_VERTEX_COUNT;

function writeSegment(
  buffer: Float32Array,
  floatIndex: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  buffer[floatIndex] = x1;
  buffer[floatIndex + 1] = y1;
  buffer[floatIndex + 2] = 0;
  buffer[floatIndex + 3] = x2;
  buffer[floatIndex + 4] = y2;
  buffer[floatIndex + 5] = 0;
  return floatIndex + 6;
}

/**
 * Builds a single pre-allocated unit-radius `BufferGeometry` containing cartographic
 * reference marks partitioned into major (group 0) and minor (group 1) material groups:
 * - Major: 4 cardinal crosshair spokes (`r = 0.15 -> 1.0`) and 12 major ticks every 30° (`r = 0.90 -> 1.0`).
 * - Minor: 24 minor ticks every 15° (`r = 0.95 -> 1.0`) and orthogonal unit-circle grid chords.
 */
export function buildPreviewReferenceMarksGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(TOTAL_VERTEX_COUNT * 3);
  let idx = 0;

  for (let i = 0; i < CARDINAL_SPOKE_COUNT; i++) {
    const theta = (i / CARDINAL_SPOKE_COUNT) * FULL_CIRCLE_RAD;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    idx = writeSegment(
      positions,
      idx,
      CARDINAL_SPOKE_INNER_RADIUS * cosT,
      CARDINAL_SPOKE_INNER_RADIUS * sinT,
      OUTER_UNIT_RADIUS * cosT,
      OUTER_UNIT_RADIUS * sinT,
    );
  }

  for (let i = 0; i < MAJOR_TICK_COUNT; i++) {
    const theta = (i / MAJOR_TICK_COUNT) * FULL_CIRCLE_RAD;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    idx = writeSegment(
      positions,
      idx,
      MAJOR_TICK_INNER_RADIUS * cosT,
      MAJOR_TICK_INNER_RADIUS * sinT,
      OUTER_UNIT_RADIUS * cosT,
      OUTER_UNIT_RADIUS * sinT,
    );
  }

  for (let i = 0; i < MINOR_TICK_COUNT; i++) {
    const theta = (i / MINOR_TICK_COUNT) * FULL_CIRCLE_RAD;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    idx = writeSegment(
      positions,
      idx,
      MINOR_TICK_INNER_RADIUS * cosT,
      MINOR_TICK_INNER_RADIUS * sinT,
      OUTER_UNIT_RADIUS * cosT,
      OUTER_UNIT_RADIUS * sinT,
    );
  }

  for (let i = 0; i < GRID_CHORD_OFFSETS.length; i++) {
    const v = GRID_CHORD_OFFSETS[i];
    const extent = Math.sqrt(Math.max(0, 1 - v * v));
    idx = writeSegment(positions, idx, v, -extent, v, extent);
    idx = writeSegment(positions, idx, -extent, v, extent, v);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.addGroup(0, MAJOR_VERTEX_COUNT, 0);
  geom.addGroup(MAJOR_VERTEX_COUNT, MINOR_VERTEX_COUNT, 1);
  geom.computeBoundingSphere();
  return geom;
}
