import * as THREE from 'three';

export type CelestialClassification =
  | 'star'
  | 'stellar-system'
  | 'brown-dwarf'
  | 'white-dwarf'
  | 'degenerate-remnant'
  | 'neutron-star'
  | 'hazard'
  | 'black-hole'
  | 'singularity'
  | 'barycentre'
  | 'stellar-cluster'
  | 'cluster'
  | 'construct'
  | 'artificial'
  | 'terrestrial'
  | 'gas-giant'
  | 'ice-giant';

export interface PlanetCensusEntry {
  id: string;
  name: string;
  classification: 'terrestrial' | 'gas-giant' | 'ice-giant';
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

import {
  classifyPlanetPhysical,
  type PlanetPhysicalProperties,
  type PlanetCensusClassification,
} from '../math/astronomy';

export {
  classifyPlanetPhysical,
  type PlanetPhysicalProperties,
  type PlanetCensusClassification,
};

/**
 * Classifies a planetary record into an authoritative census category based on physical metrics:
 * - Terrestrial: Rp <= 1.75 R_earth or Mp <= 10 M_earth
 * - Ice Giant: 1.75 R_earth < Rp <= 6.0 R_earth or 10 M_earth < Mp <= 50 M_earth
 * - Gas Giant: Rp > 6.0 R_earth or Mp > 50 M_earth
 */
export function classifyPlanet(planet: PlanetPhysicalProperties): PlanetCensusClassification {
  return classifyPlanetPhysical(planet);
}

export interface ReticleAnnotationOptions {
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  isAnnotated?: boolean;
}

/** Authoritative default reticle size in world units (~half of legacy 0.45) */
export const DEFAULT_RETICLE_SIZE = 0.22;

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
  // Outer perimeter circle (12 segments)
  const segs = 12;
  for (let p = 0; p < segs; p++) {
    const a1 = (p / segs) * Math.PI * 2;
    const a2 = ((p + 1) / segs) * Math.PI * 2;
    points.push(
      new THREE.Vector3(cX + Math.cos(a1) * r, cY + Math.sin(a1) * r, 0),
      new THREE.Vector3(cX + Math.cos(a2) * r, cY + Math.sin(a2) * r, 0),
    );
  }

  // Inner concentric ring at 0.5r (8 segments)
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

  // Diametric cross and diagonal spokes filling the interior
  const cos45 = Math.SQRT1_2 * r;
  points.push(
    // Horizontal
    new THREE.Vector3(cX - r, cY, 0), new THREE.Vector3(cX + r, cY, 0),
    // Vertical
    new THREE.Vector3(cX, cY - r, 0), new THREE.Vector3(cX, cY + r, 0),
    // 45 deg diagonal
    new THREE.Vector3(cX - cos45, cY - cos45, 0), new THREE.Vector3(cX + cos45, cY + cos45, 0),
    // -45 deg diagonal
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
  // Single star systems (multiplicity <= 1) render 0 pips; only twin (2) or more render
  if (!multiplicity || multiplicity < 2) return;
  const count = Math.min(multiplicity, 4);
  const dOut = 0.26 * s;
  const nX = -Math.SQRT1_2;
  const nY = Math.SQRT1_2;
  const dotR = (0.035 / 0.45) * s;

  // Aligned along the top-left facet with visual symmetry to planetary pips
  const tStart = 0.22;
  const tStep = 0.22;

  for (let i = 0; i < count; i++) {
    const t = tStart + i * tStep;
    // Point on top-left edge: from (-s, 0) to (0, s)
    const edgeX = (t - 1) * s;
    const edgeY = t * s;
    const cX = edgeX + dOut * nX;
    const cY = edgeY + dOut * nY;

    appendStarDot(points, cX, cY, dotR);
  }
}

const CATEGORY_ORDER: Array<PlanetCensusEntry['classification']> = [
  'terrestrial',
  'gas-giant',
  'ice-giant',
];

/**
 * Appends planetary system census symbols along the outer edge of the Bottom-Left diamond facet.
 * Represents presence of each planetary category as a boolean (terrestrial, gas-giant, ice-giant),
 * rendered at 2x-3x size and aligned towards the left point of the reticle (-s, 0).
 */
export function appendPlanetaryPips(
  points: THREE.Vector3[],
  s: number,
  planets: PlanetCensusEntry[],
): void {
  // Boolean category presence: at most one symbol per planetary category
  const presentCategories = CATEGORY_ORDER.filter((cat) =>
    planets.some((p) => p.classification === cat),
  );

  const count = presentCategories.length;
  if (count === 0) return;

  const dOut = 0.28 * s;
  const nX = -Math.SQRT1_2;
  const nY = -Math.SQRT1_2;

  // Aligned towards the left point (-s, 0) of the reticle along the bottom-left facet
  const tStart = 0.18;
  const tStep = 0.30;

  for (let i = 0; i < count; i++) {
    const category = presentCategories[i];
    const t = tStart + i * tStep;
    // Point on bottom-left edge: from (-s, 0) to (0, -s)
    const edgeX = (t - 1) * s;
    const edgeY = -t * s;
    const cX = edgeX + dOut * nX;
    const cY = edgeY + dOut * nY;

    if (category === 'terrestrial') {
      // 2.5x size: open circle with radius 0.10s (was 0.04s)
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
    } else if (category === 'gas-giant') {
      // 2.3x size: open circle with radius 0.16s (was 0.07s) and 45-degree slash with central gap
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
      // 2.2x size: open circle with radius 0.11s (was 0.05s) and 45-degree ring ticks
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

  switch (classification) {
    case 'star':
    case 'stellar-system': {
      // Closed 45-degree diamond: 4 connected edge segments
      points.push(
        new THREE.Vector3(0, s, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(0, s, 0),
      );

      // The Four-Facet Diamond Architecture: Annotations in Selected or Focused State
      if (annotations?.isAnnotated) {
        // Top-Left Facet: Multiplicity census (star elements same size dots as central star, left-aligned; 0 for single star)
        if (annotations.multiplicity && annotations.multiplicity >= 2) {
          appendMultiplicityPips(points, s, annotations.multiplicity);
        }

        // Bottom-Left Facet: Planetary system census (boolean category presence, 2x-3x size)
        if (annotations.planets && annotations.planets.length > 0) {
          appendPlanetaryPips(points, s, annotations.planets);
        }
      }
      break;
    }
    case 'brown-dwarf': {
      // Broken Diamond: Top and bottom vertical chevrons (waist open)
      points.push(
        // Top chevron ︿
        new THREE.Vector3(-0.6 * s, 0.4 * s, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(0.6 * s, 0.4 * s, 0),
        // Bottom chevron ﹀
        new THREE.Vector3(-0.6 * s, -0.4 * s, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(0.6 * s, -0.4 * s, 0),
      );
      break;
    }
    case 'white-dwarf':
    case 'degenerate-remnant': {
      // Fractured Diamond: 4 disjoint diagonal corner brackets (mid-facets open)
      const leg = 0.35 * s;
      points.push(
        // Top corner ◥◤
        new THREE.Vector3(-leg, s - leg, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(leg, s - leg, 0),
        // Right corner
        new THREE.Vector3(s - leg, leg, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(s - leg, -leg, 0),
        // Bottom corner ◢◣
        new THREE.Vector3(leg, -s + leg, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-leg, -s + leg, 0),
        // Left corner
        new THREE.Vector3(-s + leg, -leg, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-s + leg, leg, 0),
      );
      break;
    }
    case 'neutron-star':
    case 'hazard': {
      // Relativistic Hazards: Fractured diamond with outward radiating beam spines (divergent beam geometry)
      const leg = 0.35 * s;
      points.push(
        // Fractured diamond corner brackets
        new THREE.Vector3(-leg, s - leg, 0), new THREE.Vector3(0, s, 0),
        new THREE.Vector3(0, s, 0), new THREE.Vector3(leg, s - leg, 0),
        new THREE.Vector3(s - leg, leg, 0), new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(s - leg, -leg, 0),
        new THREE.Vector3(leg, -s + leg, 0), new THREE.Vector3(0, -s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(-leg, -s + leg, 0),
        new THREE.Vector3(-s + leg, -leg, 0), new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-s + leg, leg, 0),
        // Outward radiating beam spines (divergent beam geometry)
        new THREE.Vector3(0, s, 0), new THREE.Vector3(0, 1.6 * s, 0),
        new THREE.Vector3(0, -s, 0), new THREE.Vector3(0, -1.6 * s, 0),
        new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-1.4 * s, 0, 0),
        new THREE.Vector3(s, 0, 0), new THREE.Vector3(1.4 * s, 0, 0),
      );
      break;
    }
    case 'black-hole':
    case 'singularity': {
      // Four sharp 1px inward-pointing convergent spines (► ◄ / ▼ ▲) targeting empty central coordinate
      const inner = 0.25 * s;
      const outer = 1.0 * s;
      const barbL = 0.18 * s;
      const barbW = 0.12 * s;
      points.push(
        // Left spine (pointing inward to right ►)
        new THREE.Vector3(-outer, 0, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(-inner - barbL, barbW, 0), new THREE.Vector3(-inner, 0, 0),
        new THREE.Vector3(-inner - barbL, -barbW, 0), new THREE.Vector3(-inner, 0, 0),

        // Right spine (pointing inward to left ◄)
        new THREE.Vector3(outer, 0, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(inner + barbL, barbW, 0), new THREE.Vector3(inner, 0, 0),
        new THREE.Vector3(inner + barbL, -barbW, 0), new THREE.Vector3(inner, 0, 0),

        // Top spine (pointing inward down ▼)
        new THREE.Vector3(0, outer, 0), new THREE.Vector3(0, inner, 0),
        new THREE.Vector3(barbW, inner + barbL, 0), new THREE.Vector3(0, inner, 0),
        new THREE.Vector3(-barbW, inner + barbL, 0), new THREE.Vector3(0, inner, 0),

        // Bottom spine (pointing inward up ▲)
        new THREE.Vector3(0, -outer, 0), new THREE.Vector3(0, -inner, 0),
        new THREE.Vector3(barbW, -inner - barbL, 0), new THREE.Vector3(0, -inner, 0),
        new THREE.Vector3(-barbW, -inner - barbL, 0), new THREE.Vector3(0, -inner, 0),
      );
      break;
    }
    case 'barycentre': {
      // Gravitational Barycentres: 1px Plus (+) with open centre
      const arm = 0.6 * s;
      const gap = 0.15 * s;
      points.push(
        new THREE.Vector3(-arm, 0, 0), new THREE.Vector3(-gap, 0, 0),
        new THREE.Vector3(gap, 0, 0), new THREE.Vector3(arm, 0, 0),
        new THREE.Vector3(0, -arm, 0), new THREE.Vector3(0, -gap, 0),
        new THREE.Vector3(0, gap, 0), new THREE.Vector3(0, arm, 0),
      );
      break;
    }
    case 'stellar-cluster':
    case 'cluster': {
      // Stellar Clusters / Echelons: Floating Double Top Chevron (︽) with no bottom chevron
      points.push(
        // Lower top chevron
        new THREE.Vector3(-0.6 * s, 0.25 * s, 0), new THREE.Vector3(0, 0.65 * s, 0),
        new THREE.Vector3(0, 0.65 * s, 0), new THREE.Vector3(0.6 * s, 0.25 * s, 0),
        // Upper top chevron
        new THREE.Vector3(-0.6 * s, 0.55 * s, 0), new THREE.Vector3(0, 0.95 * s, 0),
        new THREE.Vector3(0, 0.95 * s, 0), new THREE.Vector3(0.6 * s, 0.55 * s, 0),
      );
      break;
    }
    case 'construct':
    case 'artificial': {
      // Artificial Constructs & Vehicles: 90-degree orthogonal open corner box (┌ ┐ / └ ┘)
      const b = 0.75 * s;
      const leg = 0.35 * s;
      points.push(
        // Top-left ┌
        new THREE.Vector3(-b, b - leg, 0), new THREE.Vector3(-b, b, 0),
        new THREE.Vector3(-b, b, 0), new THREE.Vector3(-b + leg, b, 0),
        // Top-right ┐
        new THREE.Vector3(b - leg, b, 0), new THREE.Vector3(b, b, 0),
        new THREE.Vector3(b, b, 0), new THREE.Vector3(b, b - leg, 0),
        // Bottom-right ┘
        new THREE.Vector3(b, -b + leg, 0), new THREE.Vector3(b, -b, 0),
        new THREE.Vector3(b, -b, 0), new THREE.Vector3(b - leg, -b, 0),
        // Bottom-left └
        new THREE.Vector3(-b + leg, -b, 0), new THREE.Vector3(-b, -b, 0),
        new THREE.Vector3(-b, -b, 0), new THREE.Vector3(-b, -b + leg, 0),
      );
      break;
    }
    case 'terrestrial': {
      // Small 1px open circle (~3-4px diameter, radius ~0.4s)
      const r = 0.4 * s;
      const segs = 32;
      for (let i = 0; i < segs; i++) {
        const th1 = (i / segs) * Math.PI * 2;
        const th2 = ((i + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(th1) * r, Math.sin(th1) * r, 0),
          new THREE.Vector3(Math.cos(th2) * r, Math.sin(th2) * r, 0),
        );
      }
      break;
    }
    case 'gas-giant': {
      // Large 1px open circle (~7-8px diameter, radius ~0.8s) with a 45-degree slash through the middle and a gap around the central dot
      const r = 0.8 * s;
      const segs = 32;
      for (let i = 0; i < segs; i++) {
        const th1 = (i / segs) * Math.PI * 2;
        const th2 = ((i + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(th1) * r, Math.sin(th1) * r, 0),
          new THREE.Vector3(Math.cos(th2) * r, Math.sin(th2) * r, 0),
        );
      }
      // 45-degree slash through the middle with gap around central dot
      const gap = 0.22 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        // Lower-left segment
        new THREE.Vector3(-r * cos45, -r * sin45, 0),
        new THREE.Vector3(-gap * cos45, -gap * sin45, 0),
        // Upper-right segment
        new THREE.Vector3(gap * cos45, gap * sin45, 0),
        new THREE.Vector3(r * cos45, r * sin45, 0),
      );
      break;
    }
    case 'ice-giant': {
      // Ringed open circle: central disk + lateral ring ticks angled at 45 degrees
      const r = 0.55 * s;
      const segs = 32;
      for (let i = 0; i < segs; i++) {
        const th1 = (i / segs) * Math.PI * 2;
        const th2 = ((i + 1) / segs) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(th1) * r, Math.sin(th1) * r, 0),
          new THREE.Vector3(Math.cos(th2) * r, Math.sin(th2) * r, 0),
        );
      }
      // Ring ticks angled at 45 degrees
      const rInner = 0.6 * s;
      const rOuter = 0.95 * s;
      const cos45 = Math.SQRT1_2;
      const sin45 = Math.SQRT1_2;
      points.push(
        // Lower-left tick
        new THREE.Vector3(-rOuter * cos45, -rOuter * sin45, 0),
        new THREE.Vector3(-rInner * cos45, -rInner * sin45, 0),
        // Upper-right tick
        new THREE.Vector3(rInner * cos45, rInner * sin45, 0),
        new THREE.Vector3(rOuter * cos45, rOuter * sin45, 0),
      );
      break;
    }
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}
