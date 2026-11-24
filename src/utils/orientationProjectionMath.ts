import { DEG_TO_RADIANS, RADIANS_TO_DEG } from './astroCoordinates';

export type Vec3Tuple = readonly [number, number, number];

export interface CameraBasis {
  readonly right: Vec3Tuple;
  readonly up: Vec3Tuple;
  readonly forward: Vec3Tuple;
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
}

export interface ProjectedPoint {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

export interface ProjectedRingResult {
  readonly polygonPoints: string;
  readonly frontPath: string;
  readonly backPath: string;
  readonly samplePoint: { readonly x: number; readonly y: number };
}

export const CANONICAL_ISOMETRIC_POSE = {
  position: [-14, -22, 15] as const,
  target: [0, 0, 0] as const,
  up: [0, 0, 1] as const,
};

const EPSILON = 1e-6;
const DEPTH_FRONT_EPSILON = 1e-5;
const DEFAULT_RING_SEGMENTS = 64;

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z);
  if (!Number.isFinite(len) || len < EPSILON) return [0, 0, 0];
  return [x / len, y / len, z / len];
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function rotatePointAroundNode(
  x0: number,
  y0: number,
  cosInc: number,
  sinInc: number,
  ux: number,
  uy: number,
): [number, number, number] {
  const uDotV = ux * x0 + uy * y0;
  const crossZ = ux * y0 - uy * x0;
  const k = 1 - cosInc;
  return [x0 * cosInc + ux * uDotV * k, y0 * cosInc + uy * uDotV * k, crossZ * sinInc];
}

/** Builds an orthonormal camera basis (`right`, `up`, `forward`, `azimuthDeg`, `elevationDeg`). */
export function buildCameraBasis(
  position: Vec3Tuple,
  target: Vec3Tuple,
  up: Vec3Tuple,
): CameraBasis {
  let [fx, fy, fz] = normalize3(target[0] - position[0], target[1] - position[1], target[2] - position[2]);
  if (fx === 0 && fy === 0 && fz === 0) [fx, fy, fz] = normalize3(14, 22, -15);

  let [ux, uy, uz] = normalize3(up[0], up[1], up[2]);
  if (ux === 0 && uy === 0 && uz === 0) {
    ux = 0;
    uy = 0;
    uz = 1;
  }

  let [rx, ry, rz] = normalize3(fy * uz - fz * uy, fz * ux - fx * uz, fx * uy - fy * ux);
  if (rx === 0 && ry === 0 && rz === 0) {
    const refX = Math.abs(fy) < 0.9 ? 0 : 1;
    const refY = Math.abs(fy) < 0.9 ? 1 : 0;
    [rx, ry, rz] = normalize3(-fz * refY, fz * refX, fx * refY - fy * refX);
  }

  const [cux, cuy, cuz] = normalize3(ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx);
  const vLen = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
  const elevationDeg =
    vLen > EPSILON ? Math.asin(Math.max(-1, Math.min(1, (position[2] - target[2]) / vLen))) * RADIANS_TO_DEG : 0;
  const rawAzimuthRad = Math.hypot(fx, fy) > 1e-4 ? Math.atan2(fy, fx) : Math.atan2(cuy, cux);

  return {
    right: [rx, ry, rz],
    up: [cux, cuy, cuz],
    forward: [fx, fy, fz],
    azimuthDeg: ((rawAzimuthRad * RADIANS_TO_DEG) % 360 + 360) % 360,
    elevationDeg,
  };
}

/** Orthographically projects a 3D world point onto 2D SVG coordinates and signed `forward` depth. */
export function projectPoint3D(
  point: Vec3Tuple,
  basis: CameraBasis,
  cx: number,
  cy: number,
  scale: number,
): ProjectedPoint {
  const [px, py, pz] = point;
  return {
    x: cx + (px * basis.right[0] + py * basis.right[1] + pz * basis.right[2]) * scale,
    y: cy - (px * basis.up[0] + py * basis.up[1] + pz * basis.up[2]) * scale,
    depth: px * basis.forward[0] + py * basis.forward[1] + pz * basis.forward[2],
  };
}

/** Projects a point at `eccentricAnomalyRad` on a tilted, optionally eccentric orbital ring. */
export function projectOrbitalPoint3D(options: {
  readonly radius: number;
  readonly inclinationDeg: number;
  readonly ascendingNodeDeg: number;
  readonly eccentricity?: number;
  readonly eccentricAnomalyRad: number;
  readonly basis: CameraBasis;
  readonly cx: number;
  readonly cy: number;
  readonly scale: number;
}): ProjectedPoint {
  const e = Math.min(0.95, Math.max(0, options.eccentricity ?? 0));
  const semiMinorFactor = Math.sqrt(Math.max(0, 1 - e * e));
  const xLocal = options.radius * (Math.cos(options.eccentricAnomalyRad) - e);
  const yLocal = options.radius * semiMinorFactor * Math.sin(options.eccentricAnomalyRad);
  const incRad = options.inclinationDeg * DEG_TO_RADIANS;
  const nodeRad = options.ascendingNodeDeg * DEG_TO_RADIANS;
  const [wx, wy, wz] = rotatePointAroundNode(
    xLocal,
    yLocal,
    Math.cos(incRad),
    Math.sin(incRad),
    Math.cos(nodeRad),
    Math.sin(nodeRad),
  );
  return projectPoint3D([wx, wy, wz], options.basis, options.cx, options.cy, options.scale);
}

class PathSegmentBuilder {
  private parts: string[] = [];
  private lastX = Number.NaN;
  private lastY = Number.NaN;

  appendSegment(x0: number, y0: number, x1: number, y1: number): void {
    const isContiguous = Math.abs(this.lastX - x0) < 1e-3 && Math.abs(this.lastY - y0) < 1e-3;
    this.parts.push(isContiguous ? `L ${fmt(x1)} ${fmt(y1)}` : `M ${fmt(x0)} ${fmt(y0)} L ${fmt(x1)} ${fmt(y1)}`);
    this.lastX = x1;
    this.lastY = y1;
  }

  toString(): string {
    return this.parts.join(' ');
  }
}

/** Builds SVG polygon points and front/back split SVG paths for a 3D ring or orbit. */
export function buildProjectedRing(options: {
  readonly radius: number;
  readonly inclinationDeg: number;
  readonly ascendingNodeDeg: number;
  readonly eccentricity?: number;
  readonly basis: CameraBasis;
  readonly cx: number;
  readonly cy: number;
  readonly scale: number;
  readonly segments?: number;
}): ProjectedRingResult {
  const segments = Math.max(12, Math.floor(options.segments ?? DEFAULT_RING_SEGMENTS));
  const e = Math.min(0.95, Math.max(0, options.eccentricity ?? 0));
  const semiMinorFactor = Math.sqrt(Math.max(0, 1 - e * e));
  const incRad = options.inclinationDeg * DEG_TO_RADIANS;
  const nodeRad = options.ascendingNodeDeg * DEG_TO_RADIANS;
  const cosInc = Math.cos(incRad);
  const sinInc = Math.sin(incRad);
  const ux = Math.cos(nodeRad);
  const uy = Math.sin(nodeRad);

  const polygonParts: string[] = [];
  const projected: ProjectedPoint[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const xLocal = options.radius * (Math.cos(angle) - e);
    const yLocal = options.radius * semiMinorFactor * Math.sin(angle);
    const [wx, wy, wz] = rotatePointAroundNode(xLocal, yLocal, cosInc, sinInc, ux, uy);
    const proj = projectPoint3D([wx, wy, wz], options.basis, options.cx, options.cy, options.scale);
    projected.push(proj);
    if (i < segments) {
      polygonParts.push(`${fmt(proj.x)},${fmt(proj.y)}`);
    }
  }

  const frontBuilder = new PathSegmentBuilder();
  const backBuilder = new PathSegmentBuilder();

  for (let i = 0; i < segments; i++) {
    const p0 = projected[i];
    const p1 = projected[i + 1];
    if (!p0 || !p1) continue;

    const isFront0 = p0.depth <= DEPTH_FRONT_EPSILON;
    const isFront1 = p1.depth <= DEPTH_FRONT_EPSILON;

    if (isFront0 === isFront1) {
      (isFront0 ? frontBuilder : backBuilder).appendSegment(p0.x, p0.y, p1.x, p1.y);
    } else {
      const denom = p1.depth - p0.depth;
      const t = Math.abs(denom) > EPSILON ? Math.max(0, Math.min(1, (DEPTH_FRONT_EPSILON - p0.depth) / denom)) : 0.5;
      const mx = p0.x + t * (p1.x - p0.x);
      const my = p0.y + t * (p1.y - p0.y);
      (isFront0 ? frontBuilder : backBuilder).appendSegment(p0.x, p0.y, mx, my);
      (isFront1 ? frontBuilder : backBuilder).appendSegment(mx, my, p1.x, p1.y);
    }
  }

  const first = projected[0] ?? { x: options.cx, y: options.cy, depth: 0 };
  return {
    polygonPoints: polygonParts.join(' '),
    frontPath: frontBuilder.toString(),
    backPath: backBuilder.toString(),
    samplePoint: { x: first.x, y: first.y },
  };
}
