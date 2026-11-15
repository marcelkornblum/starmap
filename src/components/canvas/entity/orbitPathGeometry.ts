import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { rotateToOrbitalPlane, DEG_TO_RADIANS } from '../../../utils/astroCoordinates';

export interface OrbitGeometryOptions {
  semiMajorAxis: number;
  eccentricity?: number;
  inclination?: number;
  ascendingNode?: number;
  argumentOfPeriapsis?: number;
  segments?: number;
  showPeriapsisTick?: boolean;
  showDirectionIndicator?: boolean;
}

export interface OrbitGeometryResult {
  orbitGeometry: LineGeometry;
  tickGeometry: THREE.BufferGeometry | null;
  directionGeometry: THREE.BufferGeometry | null;
  arrowPosition: [number, number, number];
  arrowTangent: [number, number, number];
}

export function buildOrbitPathLineGeometry(
  a: number,
  e: number,
  omegaRad: number,
  sampleCount: number,
  inclination: number,
  ascendingNode: number,
): LineGeometry {
  const loopBuffer = new Float32Array((sampleCount + 1) * 3);
  const b = a * Math.sqrt(1 - e * e);
  const focalOffset = a * e;

  for (let i = 0; i <= sampleCount; i++) {
    const theta = (i / sampleCount) * Math.PI * 2;
    const xOrb = a * Math.cos(theta) - focalOffset;
    const yOrb = b * Math.sin(theta);
    const xRot = xOrb * Math.cos(omegaRad) - yOrb * Math.sin(omegaRad);
    const yRot = xOrb * Math.sin(omegaRad) + yOrb * Math.cos(omegaRad);
    loopBuffer[i * 3] = xRot;
    loopBuffer[i * 3 + 1] = yRot;
    loopBuffer[i * 3 + 2] = 0;
  }

  rotateToOrbitalPlane(loopBuffer, inclination, ascendingNode, { degrees: true });
  const geom = new LineGeometry();
  geom.setPositions(loopBuffer);
  return geom;
}

export function buildPeriapsisTickGeometry(
  a: number,
  e: number,
  omegaRad: number,
  inclination: number,
  ascendingNode: number,
): THREE.BufferGeometry {
  const pDist = a * (1 - e);
  const tickLength = Math.max(0.04, a * 0.035);
  const perpAngle = omegaRad + Math.PI / 2;
  const pX = pDist * Math.cos(omegaRad);
  const pY = pDist * Math.sin(omegaRad);
  const dx = tickLength * Math.cos(perpAngle);
  const dy = tickLength * Math.sin(perpAngle);

  const tickBuffer = new Float32Array([
    pX - dx, pY - dy, 0,
    pX + dx, pY + dy, 0,
  ]);

  rotateToOrbitalPlane(tickBuffer, inclination, ascendingNode, { degrees: true });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(tickBuffer, 3));
  geom.computeBoundingSphere();
  return geom;
}

export function buildDirectionChevronGeometry(
  a: number,
  e: number,
  omegaRad: number,
  inclination: number,
  ascendingNode: number,
): {
  geometry: THREE.BufferGeometry;
  arrowPosition: [number, number, number];
  arrowTangent: [number, number, number];
} {
  const theta = Math.PI / 2;
  const b = a * Math.sqrt(1 - e * e);
  const focalOffset = a * e;
  const xOrb = a * Math.cos(theta) - focalOffset;
  const yOrb = b * Math.sin(theta);
  const xRot = xOrb * Math.cos(omegaRad) - yOrb * Math.sin(omegaRad);
  const yRot = xOrb * Math.sin(omegaRad) + yOrb * Math.cos(omegaRad);

  const arrowPosBuf = new Float32Array([xRot, yRot, 0]);
  rotateToOrbitalPlane(arrowPosBuf, inclination, ascendingNode, { degrees: true });
  const arrowPosition: [number, number, number] = [arrowPosBuf[0], arrowPosBuf[1], arrowPosBuf[2]];

  const tangent = new THREE.Vector3(-a * Math.sin(theta), b * Math.cos(theta), 0).normalize();
  const rotTangentX = tangent.x * Math.cos(omegaRad) - tangent.y * Math.sin(omegaRad);
  const rotTangentY = tangent.x * Math.sin(omegaRad) + tangent.y * Math.cos(omegaRad);
  const tanBuf = new Float32Array([rotTangentX, rotTangentY, 0]);
  rotateToOrbitalPlane(tanBuf, inclination, ascendingNode, { degrees: true });
  const arrowTangent: [number, number, number] = [tanBuf[0], tanBuf[1], tanBuf[2]];

  const tipDist = 0.08;
  const wingDist = 0.05;
  const notchDist = 0.015;
  const wingWidth = 0.11;

  const dirBuffer = new Float32Array([
    tipDist, 0, 0,
    -wingDist, wingWidth, 0,
    -notchDist, 0, 0,
    tipDist, 0, 0,
    -notchDist, 0, 0,
    -wingDist, -wingWidth, 0,
  ]);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(dirBuffer, 3));
  geom.computeVertexNormals();
  geom.computeBoundingSphere();

  return { geometry: geom, arrowPosition, arrowTangent };
}

export function buildOrbitGeometries(options: OrbitGeometryOptions): OrbitGeometryResult {
  const {
    semiMajorAxis,
    eccentricity = 0,
    inclination = 0,
    ascendingNode = 0,
    argumentOfPeriapsis = 0,
    segments = 256,
    showPeriapsisTick = true,
    showDirectionIndicator = true,
  } = options;

  const a = Number.isFinite(semiMajorAxis) && semiMajorAxis > 0 ? semiMajorAxis : 0.001;
  const e = Number.isFinite(eccentricity) ? Math.max(0, Math.min(0.99, eccentricity)) : 0;
  const omegaRad = argumentOfPeriapsis * DEG_TO_RADIANS;
  const sampleCount = Math.max(256, segments);

  const orbitLineGeom = buildOrbitPathLineGeometry(a, e, omegaRad, sampleCount, inclination, ascendingNode);

  const tickGeom = showPeriapsisTick
    ? buildPeriapsisTickGeometry(a, e, omegaRad, inclination, ascendingNode)
    : null;

  let dirGeom: THREE.BufferGeometry | null = null;
  let arrowPosition: [number, number, number] = [0, 0, 0];
  let arrowTangent: [number, number, number] = [1, 0, 0];

  if (showDirectionIndicator) {
    const dir = buildDirectionChevronGeometry(a, e, omegaRad, inclination, ascendingNode);
    dirGeom = dir.geometry;
    arrowPosition = dir.arrowPosition;
    arrowTangent = dir.arrowTangent;
  }

  return {
    orbitGeometry: orbitLineGeom,
    tickGeometry: tickGeom,
    directionGeometry: dirGeom,
    arrowPosition,
    arrowTangent,
  };
}
