import * as THREE from 'three';
import type {
  CelestialClassification,
  PlanetCensusEntry,
  ReticleAnnotationOptions,
} from '../../../types/spatial';
import { appendReticleBracketPoints } from './reticleBrackets';

/** Authoritative default reticle size in world units (~half of legacy 0.45) */
export const DEFAULT_RETICLE_SIZE = 0.22;

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
function appendStarDot(
  points: THREE.Vector3[],
  cX: number,
  cY: number,
  r: number,
): void {
  const segs = 12;
  for (let p = 0; p < segs; p++) {
    const a1 = (p / segs) * Math.PI * 2;
    const a2 = ((p + 1) / segs) * Math.PI * 2;
    points.push(
      new THREE.Vector3(cX + Math.cos(a1) * r, cY + Math.sin(a1) * r, 0),
      new THREE.Vector3(cX + Math.cos(a2) * r, cY + Math.sin(a2) * r, 0),
    );
  }

  const innerSegs = 8;
  const rInner = 0.5 * r;
  for (let p = 0; p < innerSegs; p++) {
    const a1 = (p / innerSegs) * Math.PI * 2;
    const a2 = ((p + 1) / innerSegs) * Math.PI * 2;
    points.push(
      new THREE.Vector3(cX + Math.cos(a1) * rInner, cY + Math.sin(a1) * rInner, 0),
      new THREE.Vector3(cX + Math.cos(a2) * rInner, cY + Math.sin(a2) * rInner, 0),
    );
  }

  const cos45 = Math.SQRT1_2 * r;
  points.push(
    new THREE.Vector3(cX - r, cY, 0), new THREE.Vector3(cX + r, cY, 0),
    new THREE.Vector3(cX, cY - r, 0), new THREE.Vector3(cX, cY + r, 0),
    new THREE.Vector3(cX - cos45, cY - cos45, 0), new THREE.Vector3(cX + cos45, cY + cos45, 0),
    new THREE.Vector3(cX - cos45, cY + cos45, 0), new THREE.Vector3(cX + cos45, cY - cos45, 0),
  );
}

/**
 * Appends stellar multiplicity pips along the outer edge of the Top-Left diamond facet.
 * The star elements are the same size dots as the central star (radius 0.035 at s = 0.45).
 * Aligned towards the left point of the reticle (-s, 0), not spaced evenly; up to 4 stars comfortably fit.
 */
export function appendMultiplicityPips(
  points: THREE.Vector3[],
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

    appendStarDot(points, cX, cY, dotR);
  }
}

const CATEGORY_ORDER: Array<PlanetCensusEntry['classification']> = [
  'terrestrial',
  'super-earth',
  'gas-giant',
  'ice-giant',
];

/**
 * Appends planetary system census symbols along the outer edge of the Bottom-Left diamond facet.
 * Represents presence of each planetary category as a boolean (terrestrial, super-earth, gas-giant, ice-giant),
 * rendered at 2x-3x size and aligned towards the left point of the reticle (-s, 0).
 */
export function appendPlanetaryPips(
  points: THREE.Vector3[],
  s: number,
  planets: PlanetCensusEntry[],
): void {
  const presentCategories = CATEGORY_ORDER.filter((cat) =>
    planets.some((p) => p.classification === cat),
  );

  const count = presentCategories.length;
  if (count === 0) return;

  const dOut = 0.28 * s;
  const nX = -Math.SQRT1_2;
  const nY = -Math.SQRT1_2;

  const tStart = 0.18;
  const tStep = count > 3 ? 0.22 : 0.30;

  for (let i = 0; i < count; i++) {
    const category = presentCategories[i];
    const t = tStart + i * tStep;
    const edgeX = (t - 1) * s;
    const edgeY = -t * s;
    const cX = edgeX + dOut * nX;
    const cY = edgeY + dOut * nY;

    if (category === 'terrestrial') {
      const pR = 0.10 * s;
      const segs = 24;
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pR, cY + Math.sin(a1) * pR, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pR, cY + Math.sin(a2) * pR, 0),
        );
      }
    } else if (category === 'super-earth') {
      const pRInner = 0.07 * s;
      const pROuter = 0.12 * s;
      const segs = 24;
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pRInner, cY + Math.sin(a1) * pRInner, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pRInner, cY + Math.sin(a2) * pRInner, 0),
        );
      }
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pROuter, cY + Math.sin(a1) * pROuter, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pROuter, cY + Math.sin(a2) * pROuter, 0),
        );
      }
    } else if (category === 'gas-giant') {
      const pR = 0.16 * s;
      const segs = 28;
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pR, cY + Math.sin(a1) * pR, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pR, cY + Math.sin(a2) * pR, 0),
        );
      }
      const gap = 0.05 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        new THREE.Vector3(cX - pR * cos45, cY - pR * sin45, 0),
        new THREE.Vector3(cX - gap * cos45, cY - gap * sin45, 0),
        new THREE.Vector3(cX + gap * cos45, cY + gap * sin45, 0),
        new THREE.Vector3(cX + pR * cos45, cY + pR * sin45, 0),
      );
    } else if (category === 'ice-giant') {
      const pR = 0.11 * s;
      const segs = 24;
      for (let j = 0; j < segs; j++) {
        const a1 = (j / segs) * Math.PI * 2;
        const a2 = ((j + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(cX + Math.cos(a1) * pR, cY + Math.sin(a1) * pR, 0),
          new THREE.Vector3(cX + Math.cos(a2) * pR, cY + Math.sin(a2) * pR, 0),
        );
      }
      const rInner = 0.12 * s;
      const rOuter = 0.19 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        new THREE.Vector3(cX - rOuter * cos45, cY - rOuter * sin45, 0),
        new THREE.Vector3(cX - rInner * cos45, cY - rInner * sin45, 0),
        new THREE.Vector3(cX + rInner * cos45, cY + rInner * sin45, 0),
        new THREE.Vector3(cX + rOuter * cos45, cY + rOuter * sin45, 0),
      );
    }
  }
}

/**
 * Builds 2D line geometry in the local XY plane for each reticle taxonomy type.
 * All reticle and footprint shapes are constructed as pairs of line segments for LineSegments.
 */
export function createReticleGeometry(
  classification: CelestialClassification,
  s: number,
  annotations?: ReticleAnnotationOptions,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];

  appendReticleBracketPoints(points, classification, s);

  if ((classification === 'star' || classification === 'stellar-system') && annotations?.isAnnotated) {
    if (annotations.multiplicity && annotations.multiplicity >= 2) {
      appendMultiplicityPips(points, s, annotations.multiplicity);
    }
    if (annotations.planets && annotations.planets.length > 0) {
      appendPlanetaryPips(points, s, annotations.planets);
    }
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}
