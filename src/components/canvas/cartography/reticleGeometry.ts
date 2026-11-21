import * as THREE from 'three';
import type {
  CelestialClassification,
  PlanetCensusEntry,
  ReticleAnnotationOptions,
} from '../../../types/spatial';
import { DEFAULT_RETICLE_SIZE } from '../engineConfig';
import { appendReticleBracketPoints } from './reticleBrackets';

export { DEFAULT_RETICLE_SIZE };

const MAX_RETICLE_CACHE_SIZE = 512;
const RETICLE_GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();

const CATEGORY_ORDER: ReadonlyArray<PlanetCensusEntry['classification']> = [
  'terrestrial',
  'super-earth',
  'gas-giant',
  'ice-giant',
];

function pushSegment(coords: number[], x1: number, y1: number, x2: number, y2: number): void {
  coords.push(x1, y1, 0, x2, y2, 0);
}

function appendCircle(coords: number[], cX: number, cY: number, r: number, segs: number): void {
  for (let j = 0; j < segs; j++) {
    const a1 = (j / segs) * Math.PI * 2;
    const a2 = ((j + 1) / segs) * Math.PI * 2;
    pushSegment(
      coords,
      cX + Math.cos(a1) * r,
      cY + Math.sin(a1) * r,
      cX + Math.cos(a2) * r,
      cY + Math.sin(a2) * r,
    );
  }
}

/**
 * Formats a designation or spectral classification tag for compact reticle facet display.
 * Replaces spaced plus signs ("X + Y") with a tight vertically centred unicode dot ("X·Y")
 * without surrounding whitespace, conserving precious reticle facet width.
 */
export function formatDesignationTag(tag?: string): string {
  if (!tag) return '';
  return tag.replace(/\s*\+\s*/g, '·').trim();
}

/**
 * Helper to append a solid star dot matching the central star's apparent size.
 * Central star radius is 0.035 at s = 0.45, so r = (0.035 / 0.45) * s.
 * Constructed with perimeter circles and dense internal spokes to form a solid dot on screen.
 */
function appendStarDot(coords: number[], cX: number, cY: number, r: number): void {
  appendCircle(coords, cX, cY, r, 12);
  appendCircle(coords, cX, cY, 0.5 * r, 8);

  const cos45 = Math.SQRT1_2 * r;
  pushSegment(coords, cX - r, cY, cX + r, cY);
  pushSegment(coords, cX, cY - r, cX, cY + r);
  pushSegment(coords, cX - cos45, cY - cos45, cX + cos45, cY + cos45);
  pushSegment(coords, cX - cos45, cY + cos45, cX + cos45, cY - cos45);
}

/**
 * Appends stellar multiplicity pips along the outer edge of the Top-Left diamond facet.
 * The star elements are the same size dots as the central star (radius 0.035 at s = 0.45).
 * Aligned towards the left point of the reticle (-s, 0), not spaced evenly; up to 4 stars comfortably fit.
 */
export function appendMultiplicityPips(
  coords: number[],
  s: number,
  multiplicity: number,
): void {
  if (!multiplicity || multiplicity < 2) return;
  const count = Math.min(multiplicity, 4);
  const dOut = 0.26 * s;
  const nX = -Math.SQRT1_2;
  const nY = Math.SQRT1_2;
  const dotR = (0.035 / 0.45) * s;

  const tStart = 0.22;
  const tStep = 0.22;

  for (let i = 0; i < count; i++) {
    const t = tStart + i * tStep;
    const edgeX = (t - 1) * s;
    const edgeY = t * s;
    const cX = edgeX + dOut * nX;
    const cY = edgeY + dOut * nY;

    appendStarDot(coords, cX, cY, dotR);
  }
}

function computeCategoryBitmask(planets?: PlanetCensusEntry[]): number {
  if (!planets || planets.length === 0) return 0;
  let mask = 0;
  for (let i = 0; i < planets.length; i++) {
    const cls = planets[i]?.classification;
    if (cls === 'terrestrial') mask |= 1;
    else if (cls === 'super-earth') mask |= 2;
    else if (cls === 'gas-giant') mask |= 4;
    else if (cls === 'ice-giant') mask |= 8;
    if (mask === 15) break;
  }
  return mask;
}

function appendPlanetaryPipsByMask(coords: number[], s: number, categoryBitmask: number): void {
  if (categoryBitmask === 0) return;

  let count = 0;
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if ((categoryBitmask & (1 << i)) !== 0) count++;
  }
  if (count === 0) return;

  const dOut = 0.28 * s;
  const nX = -Math.SQRT1_2;
  const nY = -Math.SQRT1_2;
  const tStart = 0.18;
  const tStep = count > 3 ? 0.22 : 0.30;

  let slotIndex = 0;
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if ((categoryBitmask & (1 << i)) === 0) continue;
    const category = CATEGORY_ORDER[i];
    const t = tStart + slotIndex * tStep;
    slotIndex++;
    const edgeX = (t - 1) * s;
    const edgeY = -t * s;
    const cX = edgeX + dOut * nX;
    const cY = edgeY + dOut * nY;

    if (category === 'terrestrial') {
      appendCircle(coords, cX, cY, 0.10 * s, 24);
    } else if (category === 'super-earth') {
      appendCircle(coords, cX, cY, 0.07 * s, 24);
      appendCircle(coords, cX, cY, 0.12 * s, 24);
    } else if (category === 'gas-giant') {
      const pR = 0.16 * s;
      appendCircle(coords, cX, cY, pR, 28);
      const gap = 0.05 * s;
      const cos45 = Math.SQRT1_2;
      pushSegment(coords, cX - pR * cos45, cY - pR * cos45, cX - gap * cos45, cY - gap * cos45);
      pushSegment(coords, cX + gap * cos45, cY + gap * cos45, cX + pR * cos45, cY + pR * cos45);
    } else if (category === 'ice-giant') {
      appendCircle(coords, cX, cY, 0.11 * s, 24);
      const rInner = 0.12 * s;
      const rOuter = 0.19 * s;
      const cos45 = Math.SQRT1_2;
      pushSegment(coords, cX - rOuter * cos45, cY - rOuter * cos45, cX - rInner * cos45, cY - rInner * cos45);
      pushSegment(coords, cX + rInner * cos45, cY + rInner * cos45, cX + rOuter * cos45, cY + rOuter * cos45);
    }
  }
}

/**
 * Appends planetary system census symbols along the outer edge of the Bottom-Left diamond facet.
 * Represents presence of each planetary category as a boolean (terrestrial, super-earth, gas-giant, ice-giant),
 * rendered at 2x-3x size and aligned towards the left point of the reticle (-s, 0).
 */
export function appendPlanetaryPips(
  coords: number[],
  s: number,
  planets: PlanetCensusEntry[],
): void {
  appendPlanetaryPipsByMask(coords, s, computeCategoryBitmask(planets));
}

/**
 * Disposes all cached reticle geometries and resets the cache (for unit test isolation).
 */
export function clearReticleGeometryCache(): void {
  for (const geom of RETICLE_GEOMETRY_CACHE.values()) {
    geom.dispose();
  }
  RETICLE_GEOMETRY_CACHE.clear();
}

/**
 * Returns the number of cached reticle BufferGeometry instances.
 */
export function getReticleGeometryCacheSize(): number {
  return RETICLE_GEOMETRY_CACHE.size;
}

/**
 * Builds or retrieves a cached 2D line geometry in the local XY plane for each reticle taxonomy type.
 * All reticle and footprint shapes are constructed as pairs of line segments for LineSegments.
 * Returned geometries are shared via cache and MUST NOT be disposed by individual callers.
 */
export function createReticleGeometry(
  classification: CelestialClassification,
  s: number,
  annotations?: ReticleAnnotationOptions,
): THREE.BufferGeometry {
  const isAnnotatedStar =
    Boolean(annotations?.isAnnotated) &&
    (classification === 'star' || classification === 'stellar-system');
  const rawMult = annotations?.multiplicity ?? 1;
  const cappedMultiplicity = isAnnotatedStar && rawMult >= 2 ? Math.min(rawMult, 4) : 1;
  const categoryBitmask = isAnnotatedStar ? computeCategoryBitmask(annotations?.planets) : 0;

  const cacheKey = `${classification}|${s}|${cappedMultiplicity}|${categoryBitmask}`;
  const cached = RETICLE_GEOMETRY_CACHE.get(cacheKey);
  if (cached) {
    RETICLE_GEOMETRY_CACHE.delete(cacheKey);
    RETICLE_GEOMETRY_CACHE.set(cacheKey, cached);
    return cached;
  }

  const coords: number[] = [];
  appendReticleBracketPoints(coords, classification, s);

  if (isAnnotatedStar) {
    if (cappedMultiplicity >= 2) {
      appendMultiplicityPips(coords, s, cappedMultiplicity);
    }
    if (categoryBitmask !== 0) {
      appendPlanetaryPipsByMask(coords, s, categoryBitmask);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(coords), 3));
  geom.computeBoundingSphere();

  if (RETICLE_GEOMETRY_CACHE.size >= MAX_RETICLE_CACHE_SIZE) {
    const oldestKey = RETICLE_GEOMETRY_CACHE.keys().next().value;
    if (oldestKey !== undefined) {
      RETICLE_GEOMETRY_CACHE.get(oldestKey)?.dispose();
      RETICLE_GEOMETRY_CACHE.delete(oldestKey);
    }
  }
  RETICLE_GEOMETRY_CACHE.set(cacheKey, geom);

  return geom;
}
