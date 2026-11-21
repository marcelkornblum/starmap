import * as THREE from 'three';

export const PLANES = ['xy', 'xz', 'yz'] as const;
export type FinPlane = (typeof PLANES)[number];

export const DEFAULT_FIN_RING_POOL = 8;
export const MAX_FIN_RING_POOL = 16;

export function clampFinPoolSize(poolSize: number): number {
  if (!Number.isFinite(poolSize)) return DEFAULT_FIN_RING_POOL;
  return Math.max(1, Math.min(MAX_FIN_RING_POOL, Math.floor(poolSize)));
}

export const FIN_LAYER_VERTEX_SHADER = `
attribute float aQuadrant;

uniform float uBaseAlpha;
uniform float uGrazingFade;
uniform float uApertureRadius;
uniform vec4 uQuadWeights;

varying float vAlpha;

void main() {
  float qw = (aQuadrant < 0.5) ? uQuadWeights.x
           : (aQuadrant < 1.5) ? uQuadWeights.y
           : (aQuadrant < 2.5) ? uQuadWeights.z
           : uQuadWeights.w;

  vec3 scaledPos = vec3(0.0);
  if (qw <= 0.001 || uGrazingFade <= 0.001) {
    vAlpha = 0.0;
  } else {
    vAlpha = uBaseAlpha * uGrazingFade * qw;
    scaledPos = position * uApertureRadius;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPos, 1.0);
}
`;

export const FIN_LAYER_FRAGMENT_SHADER = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  if (vAlpha <= 0.001) discard;
  gl_FragColor = vec4(uColor, vAlpha);
}
`;

export const FIN_ARCS_VERTEX_SHADER = `
attribute float aQuadrant;
attribute float aRingIndex;

uniform float uGrazingFade;
uniform vec4 uQuadWeights;
uniform float uRingRadii[16];
uniform float uRingAlphas[16];

varying float vAlpha;
varying float vRadius;

void main() {
  float qw = (aQuadrant < 0.5) ? uQuadWeights.x
           : (aQuadrant < 1.5) ? uQuadWeights.y
           : (aQuadrant < 2.5) ? uQuadWeights.z
           : uQuadWeights.w;

  float r = 0.0;
  float rAlpha = 0.0;
  for (int i = 0; i < 16; i++) {
    if (abs(aRingIndex - float(i)) < 0.25) {
      r = uRingRadii[i];
      rAlpha = uRingAlphas[i];
    }
  }

  vRadius = r;
  vec3 scaledPos = vec3(0.0);
  if (qw <= 0.001 || uGrazingFade <= 0.001 || r <= 0.0 || rAlpha <= 0.001) {
    vAlpha = 0.0;
  } else {
    vAlpha = rAlpha * uGrazingFade * qw;
    scaledPos = position * r;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPos, 1.0);
}
`;

export const FIN_ARCS_FRAGMENT_SHADER = `
uniform vec3 uColor;
varying float vAlpha;
varying float vRadius;

void main() {
  if (vAlpha <= 0.001 || vRadius <= 0.0) discard;
  gl_FragColor = vec4(uColor, vAlpha);
}
`;

export interface PlaneFinMaterials {
  perimeter: THREE.ShaderMaterial;
  ticks: THREE.ShaderMaterial;
  arcs: THREE.ShaderMaterial;
}

export type FinMaterials = Record<FinPlane, PlaneFinMaterials>;

export function createFinLayerMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: FIN_LAYER_VERTEX_SHADER,
    fragmentShader: FIN_LAYER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0xffffff) },
      uBaseAlpha: { value: 1.0 },
      uGrazingFade: { value: 1.0 },
      uApertureRadius: { value: 1.0 },
      uQuadWeights: { value: new THREE.Vector4(1, 0, 0, 0) },
    },
  });
}

export function createFinArcsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: FIN_ARCS_VERTEX_SHADER,
    fragmentShader: FIN_ARCS_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0xffffff) },
      uGrazingFade: { value: 1.0 },
      uQuadWeights: { value: new THREE.Vector4(1, 0, 0, 0) },
      uRingRadii: { value: new Float32Array(MAX_FIN_RING_POOL) },
      uRingAlphas: { value: new Float32Array(MAX_FIN_RING_POOL) },
    },
  });
}

export function createAllFinMaterials(): FinMaterials {
  return {
    xy: {
      perimeter: createFinLayerMaterial(),
      ticks: createFinLayerMaterial(),
      arcs: createFinArcsMaterial(),
    },
    xz: {
      perimeter: createFinLayerMaterial(),
      ticks: createFinLayerMaterial(),
      arcs: createFinArcsMaterial(),
    },
    yz: {
      perimeter: createFinLayerMaterial(),
      ticks: createFinLayerMaterial(),
      arcs: createFinArcsMaterial(),
    },
  };
}

export function disposeAllFinMaterials(materials: FinMaterials): void {
  for (let i = 0; i < PLANES.length; i++) {
    const planeMats = materials[PLANES[i]];
    planeMats.perimeter.dispose();
    planeMats.ticks.dispose();
    planeMats.arcs.dispose();
  }
}
