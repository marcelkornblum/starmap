import * as THREE from 'three';
import {
  QUADRANTS,
  createQuadrantArcGeometry,
  createQuadrantTickGeometry,
} from '../cartography/cartographyFinsAndTicks';
import type { ScaledRingInfo } from '../math';

export const PLANES = ['xy', 'xz', 'yz'] as const;
export type FinPlane = (typeof PLANES)[number];

export const DEFAULT_FIXED_RINGS: readonly number[] = [2.5, 5, 10];

export interface FinGeometries {
  quadrantGeoms: Record<FinPlane, THREE.BufferGeometry[]>;
  tickGeoms: Record<FinPlane, THREE.BufferGeometry[]>;
  baselineGeoms: Record<FinPlane, THREE.BufferGeometry[]>;
}

export function buildPlaneQuadrantGeoms(plane: FinPlane): THREE.BufferGeometry[] {
  return QUADRANTS.map((quad) => {
    const geom = createQuadrantArcGeometry(1.0, plane, quad.startAngle, quad.endAngle);
    geom.computeBoundingSphere();
    return geom;
  });
}

export function buildPlaneTickGeoms(plane: FinPlane): THREE.BufferGeometry[] {
  return QUADRANTS.map((quad) => {
    const geom = createQuadrantTickGeometry(1.0, plane, quad.startAngle, 0.035);
    geom.computeBoundingSphere();
    return geom;
  });
}

export function buildPlaneBaselineGeoms(plane: FinPlane): THREE.BufferGeometry[] {
  return QUADRANTS.map((quad) => {
    let points: THREE.Vector3[] = [];
    if (plane === 'xz') {
      points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(quad.qx, 0, 0)];
    } else if (plane === 'yz') {
      points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, quad.qy, 0)];
    } else {
      points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(quad.qx, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, quad.qy, 0),
      ];
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    geom.computeBoundingSphere();
    return geom;
  });
}

export function buildAllFinGeometries(): FinGeometries {
  return {
    quadrantGeoms: {
      xy: buildPlaneQuadrantGeoms('xy'),
      xz: buildPlaneQuadrantGeoms('xz'),
      yz: buildPlaneQuadrantGeoms('yz'),
    },
    tickGeoms: {
      xy: buildPlaneTickGeoms('xy'),
      xz: buildPlaneTickGeoms('xz'),
      yz: buildPlaneTickGeoms('yz'),
    },
    baselineGeoms: {
      xy: buildPlaneBaselineGeoms('xy'),
      xz: buildPlaneBaselineGeoms('xz'),
      yz: buildPlaneBaselineGeoms('yz'),
    },
  };
}

export function disposeAllFinGeometries(geoms: FinGeometries): void {
  PLANES.forEach((p) => {
    geoms.quadrantGeoms[p]?.forEach((g) => g.dispose());
    geoms.tickGeoms[p]?.forEach((g) => g.dispose());
    geoms.baselineGeoms[p]?.forEach((g) => g.dispose());
  });
}

export function updateCoordinateFinsFrame(
  perimeterLines: Record<string, (THREE.LineSegments | null)[]>,
  perimeterMats: Record<string, (THREE.LineBasicMaterial | null)[]>,
  baselineLines: Record<string, (THREE.LineSegments | null)[]>,
  baselineMats: Record<string, (THREE.LineBasicMaterial | null)[]>,
  tickLines: Record<string, (THREE.LineSegments | null)[]>,
  tickMats: Record<string, (THREE.LineBasicMaterial | null)[]>,
  quadLines: Record<string, (THREE.LineSegments | null)[][]>,
  quadMats: Record<string, (THREE.LineBasicMaterial | null)[][]>,
  apertureRadius: number,
  planeWeights: {
    qwXY: readonly number[];
    qwXZ: readonly number[];
    qwYZ: readonly number[];
    fadeXY: number;
    fadeXZ: number;
    fadeYZ: number;
  },
  finPerimeterAlpha: number,
  tickAlpha: number,
  ringMajorAlpha: number,
  ringMinorAlpha: number,
  activeRings: readonly ScaledRingInfo[],
  numActive: number,
  poolSize: number,
): void {
  for (let pIdx = 0; pIdx < PLANES.length; pIdx++) {
    const plane = PLANES[pIdx];
    const planeWeight = plane === 'xy' ? planeWeights.qwXY : plane === 'xz' ? planeWeights.qwXZ : planeWeights.qwYZ;
    const grazingFade = plane === 'xy' ? planeWeights.fadeXY : plane === 'xz' ? planeWeights.fadeXZ : planeWeights.fadeYZ;

    for (let q = 0; q < 4; q++) {
      const pLine = perimeterLines[plane]?.[q];
      const pMat = perimeterMats[plane]?.[q];
      const tLine = tickLines[plane]?.[q];
      const tMat = tickMats[plane]?.[q];
      const bLine = baselineLines[plane]?.[q];
      const bMat = baselineMats[plane]?.[q];

      const qw = planeWeight[q];
      const isVis = grazingFade > 1e-3 && qw > 1e-3;

      if (pLine && pMat) {
        pLine.scale.set(apertureRadius, apertureRadius, apertureRadius);
        pLine.visible = isVis;
        if (isVis) pMat.opacity = finPerimeterAlpha * grazingFade * qw;
      }

      if (tLine && tMat) {
        tLine.scale.set(apertureRadius, apertureRadius, apertureRadius);
        tLine.visible = isVis;
        if (isVis) tMat.opacity = tickAlpha * grazingFade * qw;
      }

      if (bLine && bMat) {
        bLine.scale.set(apertureRadius, apertureRadius, apertureRadius);
        bLine.visible = isVis;
        if (isVis) bMat.opacity = finPerimeterAlpha * grazingFade * qw;
      }
    }

    for (let rIdx = 0; rIdx < poolSize; rIdx++) {
      const ring = rIdx < numActive ? activeRings[rIdx] : null;

      for (let q = 0; q < 4; q++) {
        const qLine = quadLines[plane]?.[rIdx]?.[q];
        const qMat = quadMats[plane]?.[rIdx]?.[q];
        if (!qLine || !qMat) continue;

        if (ring) {
          qLine.scale.set(ring.radius, ring.radius, ring.radius);
          if (ring.fade > 1e-3 && grazingFade > 1e-3) {
            const qw = planeWeight[q];
            const isVis = qw > 1e-3;
            qLine.visible = isVis;
            if (isVis) {
              const baseAlpha = ring.isMajor ? ringMajorAlpha : ringMinorAlpha;
              qMat.opacity = baseAlpha * ring.fade * grazingFade * qw;
            }
          } else {
            qLine.visible = false;
          }
        } else {
          qLine.visible = false;
        }
      }
    }
  }
}
