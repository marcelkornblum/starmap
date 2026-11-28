import * as THREE from 'three';
import { createCircleGeometry } from '../math/rings';
import { createCircularPlanarGridGeometry } from '../cartography/cartographyPolarGrid';
import { populateCurvedDashedLineBuffer } from '../cartography/cartographyDashedLines';
import type { CelestialClassification, PlanetCensusEntry } from '../../../types/spatial';

export const DATUM_FILL_VERTEX_SHADER = `
varying vec2 vPosition;
void main() {
  vPosition = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const DATUM_FILL_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uInnerRadius;
uniform float uExponent;
varying vec2 vPosition;
void main() {
  float r = length(vPosition);
  if (r > 1.0) discard;
  float t = clamp((r - uInnerRadius) / (1.0 - uInnerRadius), 0.0, 1.0);
  float smoothT = smoothstep(0.0, 1.0, t);
  float curve = pow(smoothT, uExponent);
  float rimGlow = smoothstep(0.70, 0.98, r);
  float alpha = uAlpha * (curve * 0.65 + rimGlow * 0.35);
  float edgeFeather = 1.0 - smoothstep(0.985, 1.0, r);
  alpha *= (0.8 + 0.2 * edgeFeather);
  vec3 rimTint = clamp(uColor * 1.35 + vec3(0.02, 0.10, 0.07), 0.0, 1.0);
  vec3 edgeColor = mix(uColor, rimTint, rimGlow * 0.65);
  gl_FragColor = vec4(edgeColor, alpha);
}
`;

export interface PlanarFootprintData {
  id: string | number;
  position: [number, number, number] | { x: number; y: number; z?: number };
  classification?: CelestialClassification;
  size?: number;
  color?: string | THREE.Color;
  opacity?: number;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
}

export interface PlanarGridProps {
  enabled?: boolean;
  showFill?: boolean;
  showPlanarGrid?: boolean;
  planarGridGap?: number;
  rings?: number[];
  majorRingIndex?: number;
  showPlanarFootprint?: boolean;
  footprintClassification?: CelestialClassification;
  footprintSize?: number;
  footprints?: PlanarFootprintData[];
  centerDistance?: number;
}

export interface PlanarFootprintComponentProps {
  footprint?: PlanarFootprintData;
  id?: string | number;
  position?: [number, number, number] | { x: number; y: number; z?: number };
  classification?: CelestialClassification;
  size?: number;
  color?: string | THREE.Color;
  opacity?: number;
  multiplicity?: number;
  planets?: PlanetCensusEntry[];
  defaultSize?: number;
  defaultColor?: string | THREE.Color;
  defaultAlpha?: number;
}

let activeFadePlanar = 1.0;
export function assignExplicitFootprintFade(fade: number): void {
  activeFadePlanar = fade;
}

export function updateExplicitFootprintChild(child: THREE.Object3D): void {
  if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicMaterial) {
    if (child.userData.baseOpacity === undefined) {
      child.userData.baseOpacity = child.material.opacity;
    }
    child.material.opacity = (child.userData.baseOpacity as number) * activeFadePlanar;
  }
}

export function buildPlanarBaseGeometries(): {
  boundaryGeom: THREE.BufferGeometry;
  fillCircleGeom: THREE.BufferGeometry;
  bearingCoreGeom: THREE.BufferGeometry;
  diskOrbitalBuffer: Float32Array;
  diskOrbitalGeom: THREE.BufferGeometry;
} {
  const boundaryGeom = createCircleGeometry(1.0, 128);
  const fillCircleGeom = new THREE.CircleGeometry(1.0, 128);
  fillCircleGeom.computeBoundingSphere();
  const bearingCoreGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]);
  bearingCoreGeom.computeBoundingSphere();

  const diskOrbitalBuffer = new Float32Array(30000);
  const diskOrbitalGeom = new THREE.BufferGeometry();
  diskOrbitalGeom.setAttribute('position', new THREE.BufferAttribute(diskOrbitalBuffer, 3));

  return { boundaryGeom, fillCircleGeom, bearingCoreGeom, diskOrbitalBuffer, diskOrbitalGeom };
}

export function buildPlanarGridGeometry(
  radius: number,
  gap: number,
  centerDistance: number,
): THREE.BufferGeometry {
  return createCircularPlanarGridGeometry(radius, gap, centerDistance);
}

export function updateOrbitalDashedLine(
  buffer: Float32Array,
  geom: THREE.BufferGeometry,
  radius: number,
  centerDistance: number,
  scale: number,
): void {
  const vCount = populateCurvedDashedLineBuffer(buffer, radius, centerDistance, 1, 0.18 * scale, 0.12 * scale);
  (geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  geom.setDrawRange(0, vCount);
}
