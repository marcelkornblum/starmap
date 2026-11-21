import * as THREE from 'three';
import {
  QUADRANTS,
  createQuadrantArcGeometry,
  createQuadrantTickGeometry,
} from '../cartography/cartographyFinsAndTicks';
import type { ScaledRingInfo } from '../math';
import {
  PLANES,
  DEFAULT_FIN_RING_POOL,
  MAX_FIN_RING_POOL,
  clampFinPoolSize,
  createAllFinMaterials,
  disposeAllFinMaterials,
  type FinPlane,
  type PlaneFinMaterials,
  type FinMaterials,
} from './coordinateFinsShaders';

export {
  PLANES,
  DEFAULT_FIN_RING_POOL,
  MAX_FIN_RING_POOL,
  clampFinPoolSize,
  createAllFinMaterials,
  disposeAllFinMaterials,
  type FinPlane,
  type PlaneFinMaterials,
  type FinMaterials,
};

export const DEFAULT_FIXED_RINGS: readonly number[] = [2.5, 5, 10];

export interface FinGeometries {
  perimeterGeoms: Record<FinPlane, THREE.BufferGeometry>;
  tickGeoms: Record<FinPlane, THREE.BufferGeometry>;
  arcGeoms: Record<FinPlane, THREE.BufferGeometry>;
}

function extractUnitQuadrantArcArrays(plane: FinPlane): Float32Array[] {
  return QUADRANTS.map((quad) => {
    const geom = createQuadrantArcGeometry(1.0, plane, quad.startAngle, quad.endAngle);
    const pos = geom.getAttribute('position');
    const copy = new Float32Array(pos.array as Float32Array);
    geom.dispose();
    return copy;
  });
}

function buildPlanePerimeterGeom(
  plane: FinPlane,
  quadArcPositions: readonly Float32Array[],
): THREE.BufferGeometry {
  let arcVerts = 0;
  for (let q = 0; q < QUADRANTS.length; q++) {
    arcVerts += quadArcPositions[q].length / 3;
  }

  const baselineVertsPerQuad = plane === 'xy' ? 4 : 2;
  const totalVerts = arcVerts + QUADRANTS.length * baselineVertsPerQuad;

  const positions = new Float32Array(totalVerts * 3);
  const quadrants = new Float32Array(totalVerts);

  let posOffset = 0;
  let vertOffset = 0;

  for (let q = 0; q < QUADRANTS.length; q++) {
    const arcArr = quadArcPositions[q];
    positions.set(arcArr, posOffset);
    posOffset += arcArr.length;

    const qVerts = arcArr.length / 3;
    quadrants.fill(q, vertOffset, vertOffset + qVerts);
    vertOffset += qVerts;
  }

  for (let q = 0; q < QUADRANTS.length; q++) {
    const quad = QUADRANTS[q];
    if (plane === 'xz') {
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = quad.qx;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
    } else if (plane === 'yz') {
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = quad.qy;
      positions[posOffset++] = 0;
    } else {
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = quad.qx;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = 0;
      positions[posOffset++] = quad.qy;
      positions[posOffset++] = 0;
    }
    quadrants.fill(q, vertOffset, vertOffset + baselineVertsPerQuad);
    vertOffset += baselineVertsPerQuad;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aQuadrant', new THREE.Float32BufferAttribute(quadrants, 1));
  geom.computeBoundingSphere();
  return geom;
}

function buildPlaneTickGeom(plane: FinPlane): THREE.BufferGeometry {
  const quadTickPositions = QUADRANTS.map((quad) => {
    const geom = createQuadrantTickGeometry(1.0, plane, quad.startAngle, 0.035);
    const pos = geom.getAttribute('position');
    const copy = new Float32Array(pos.array as Float32Array);
    geom.dispose();
    return copy;
  });

  let totalVerts = 0;
  for (let q = 0; q < QUADRANTS.length; q++) {
    totalVerts += quadTickPositions[q].length / 3;
  }

  const positions = new Float32Array(totalVerts * 3);
  const quadrants = new Float32Array(totalVerts);

  let posOffset = 0;
  let vertOffset = 0;
  for (let q = 0; q < QUADRANTS.length; q++) {
    const tickArr = quadTickPositions[q];
    positions.set(tickArr, posOffset);
    posOffset += tickArr.length;

    const qVerts = tickArr.length / 3;
    quadrants.fill(q, vertOffset, vertOffset + qVerts);
    vertOffset += qVerts;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aQuadrant', new THREE.Float32BufferAttribute(quadrants, 1));
  geom.computeBoundingSphere();
  return geom;
}

function buildPlaneArcGeom(
  quadArcPositions: readonly Float32Array[],
  clampedPoolSize: number,
): THREE.BufferGeometry {
  let ringVerts = 0;
  for (let q = 0; q < QUADRANTS.length; q++) {
    ringVerts += quadArcPositions[q].length / 3;
  }

  const totalVerts = clampedPoolSize * ringVerts;
  const positions = new Float32Array(totalVerts * 3);
  const quadrants = new Float32Array(totalVerts);
  const ringIndices = new Float32Array(totalVerts);

  let posOffset = 0;
  let vertOffset = 0;

  for (let rIdx = 0; rIdx < clampedPoolSize; rIdx++) {
    for (let q = 0; q < QUADRANTS.length; q++) {
      const arcArr = quadArcPositions[q];
      positions.set(arcArr, posOffset);
      posOffset += arcArr.length;

      const qVerts = arcArr.length / 3;
      quadrants.fill(q, vertOffset, vertOffset + qVerts);
      ringIndices.fill(rIdx, vertOffset, vertOffset + qVerts);
      vertOffset += qVerts;
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aQuadrant', new THREE.Float32BufferAttribute(quadrants, 1));
  geom.setAttribute('aRingIndex', new THREE.Float32BufferAttribute(ringIndices, 1));
  geom.computeBoundingSphere();
  return geom;
}

export function buildAllFinGeometries(poolSize = DEFAULT_FIN_RING_POOL): FinGeometries {
  const clampedPool = clampFinPoolSize(poolSize);
  const xyArcs = extractUnitQuadrantArcArrays('xy');
  const xzArcs = extractUnitQuadrantArcArrays('xz');
  const yzArcs = extractUnitQuadrantArcArrays('yz');

  return {
    perimeterGeoms: {
      xy: buildPlanePerimeterGeom('xy', xyArcs),
      xz: buildPlanePerimeterGeom('xz', xzArcs),
      yz: buildPlanePerimeterGeom('yz', yzArcs),
    },
    tickGeoms: {
      xy: buildPlaneTickGeom('xy'),
      xz: buildPlaneTickGeom('xz'),
      yz: buildPlaneTickGeom('yz'),
    },
    arcGeoms: {
      xy: buildPlaneArcGeom(xyArcs, clampedPool),
      xz: buildPlaneArcGeom(xzArcs, clampedPool),
      yz: buildPlaneArcGeom(yzArcs, clampedPool),
    },
  };
}

export function disposeAllFinGeometries(geoms: FinGeometries): void {
  for (let i = 0; i < PLANES.length; i++) {
    const plane = PLANES[i];
    geoms.perimeterGeoms[plane]?.dispose();
    geoms.tickGeoms[plane]?.dispose();
    geoms.arcGeoms[plane]?.dispose();
  }
}

export function updateCoordinateFinsFrame(
  perimeterLines: Record<FinPlane, THREE.LineSegments | null>,
  tickLines: Record<FinPlane, THREE.LineSegments | null>,
  arcLines: Record<FinPlane, THREE.LineSegments | null>,
  materials: FinMaterials,
  apertureRadius: number,
  planeWeights: {
    qwXY: readonly number[];
    qwXZ: readonly number[];
    qwYZ: readonly number[];
    fadeXY: number;
    fadeXZ: number;
    fadeYZ: number;
  },
  ringMajorAlpha: number,
  ringMinorAlpha: number,
  activeRings: readonly ScaledRingInfo[],
  numActive: number,
  poolSize: number,
): void {
  const safeAperture = Number.isFinite(apertureRadius) ? Math.max(0, apertureRadius) : 0;
  const clampedPool = clampFinPoolSize(poolSize);
  const clampedActive = Math.max(0, Math.min(numActive, clampedPool, activeRings.length));

  for (let pIdx = 0; pIdx < PLANES.length; pIdx++) {
    const plane = PLANES[pIdx];
    const planeWeight = plane === 'xy' ? planeWeights.qwXY : plane === 'xz' ? planeWeights.qwXZ : planeWeights.qwYZ;
    const rawFade = plane === 'xy' ? planeWeights.fadeXY : plane === 'xz' ? planeWeights.fadeXZ : planeWeights.fadeYZ;
    const grazingFade = Number.isFinite(rawFade) ? Math.max(0, rawFade) : 0;
    const isPlaneVis = grazingFade > 1e-3;

    const qw0 = Number.isFinite(planeWeight[0]) ? planeWeight[0] : 0;
    const qw1 = Number.isFinite(planeWeight[1]) ? planeWeight[1] : 0;
    const qw2 = Number.isFinite(planeWeight[2]) ? planeWeight[2] : 0;
    const qw3 = Number.isFinite(planeWeight[3]) ? planeWeight[3] : 0;

    const planeMats = materials[plane];
    const pLine = perimeterLines[plane];
    if (pLine) {
      pLine.visible = isPlaneVis;
    }
    const pUniforms = planeMats.perimeter.uniforms;
    pUniforms.uGrazingFade.value = grazingFade;
    pUniforms.uApertureRadius.value = safeAperture;
    (pUniforms.uQuadWeights.value as THREE.Vector4).set(qw0, qw1, qw2, qw3);

    const tLine = tickLines[plane];
    if (tLine) {
      tLine.visible = isPlaneVis;
    }
    const tUniforms = planeMats.ticks.uniforms;
    tUniforms.uGrazingFade.value = grazingFade;
    tUniforms.uApertureRadius.value = safeAperture;
    (tUniforms.uQuadWeights.value as THREE.Vector4).set(qw0, qw1, qw2, qw3);

    const aLine = arcLines[plane];
    if (aLine) {
      aLine.visible = isPlaneVis && clampedActive > 0;
    }
    const aUniforms = planeMats.arcs.uniforms;
    aUniforms.uGrazingFade.value = grazingFade;
    (aUniforms.uQuadWeights.value as THREE.Vector4).set(qw0, qw1, qw2, qw3);

    const radiiArr = aUniforms.uRingRadii.value as Float32Array;
    const alphasArr = aUniforms.uRingAlphas.value as Float32Array;
    for (let rIdx = 0; rIdx < MAX_FIN_RING_POOL; rIdx++) {
      if (rIdx < clampedActive) {
        const ring = activeRings[rIdx];
        const safeRadius = Number.isFinite(ring.radius) ? Math.max(0, ring.radius) : 0;
        const safeRingFade = Number.isFinite(ring.fade) ? Math.max(0, ring.fade) : 0;
        const baseAlpha = ring.isMajor ? ringMajorAlpha : ringMinorAlpha;
        radiiArr[rIdx] = safeRadius;
        alphasArr[rIdx] = baseAlpha * safeRingFade;
      } else {
        radiiArr[rIdx] = 0;
        alphasArr[rIdx] = 0;
      }
    }
  }
}
