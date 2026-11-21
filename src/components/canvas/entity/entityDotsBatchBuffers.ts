import * as THREE from 'three';
import type { EntityDotRegistration } from './entityDotsBatchContext';

export const INITIAL_DOTS_BATCH_CAPACITY = 128;

export const ENTITY_DOTS_VERTEX_SHADER = /* glsl */ `
  attribute float aPixelSize;
  attribute vec3 aColor;
  attribute float aAlpha;

  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    gl_PointSize = aAlpha > 0.001 ? aPixelSize * uPixelRatio : 0.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ENTITY_DOTS_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.001) {
      discard;
    }
    float r = length(gl_PointCoord - vec2(0.5));
    if (r > 0.5) {
      discard;
    }
    float disc = smoothstep(0.5, 0.35, r);
    gl_FragColor = vec4(vColor, vAlpha * disc);
  }
`;

export interface BatchBufferState {
  geometry: THREE.BufferGeometry;
  capacity: number;
  positions: Float32Array;
  colors: Float32Array;
  pixelSizes: Float32Array;
  alphas: Float32Array;
  posAttr: THREE.BufferAttribute;
  colAttr: THREE.BufferAttribute;
  sizeAttr: THREE.BufferAttribute;
  alphaAttr: THREE.BufferAttribute;
  lastActiveCount: number;
}

export function createEntityDotsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: 1 },
    },
    vertexShader: ENTITY_DOTS_VERTEX_SHADER,
    fragmentShader: ENTITY_DOTS_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
}

function allocateBatchAttributes(
  geometry: THREE.BufferGeometry,
  capacity: number,
): Pick<
  BatchBufferState,
  'capacity' | 'positions' | 'colors' | 'pixelSizes' | 'alphas' | 'posAttr' | 'colAttr' | 'sizeAttr' | 'alphaAttr'
> {
  const positions = new Float32Array(capacity * 3);
  const colors = new Float32Array(capacity * 3);
  const pixelSizes = new Float32Array(capacity);
  const alphas = new Float32Array(capacity);

  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(pixelSizes, 1).setUsage(THREE.DynamicDrawUsage);
  const alphaAttr = new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage);

  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('aColor', colAttr);
  geometry.setAttribute('aPixelSize', sizeAttr);
  geometry.setAttribute('aAlpha', alphaAttr);

  return {
    capacity,
    positions,
    colors,
    pixelSizes,
    alphas,
    posAttr,
    colAttr,
    sizeAttr,
    alphaAttr,
  };
}

export function createBatchBufferState(initialCapacity = INITIAL_DOTS_BATCH_CAPACITY): BatchBufferState {
  const geometry = new THREE.BufferGeometry();
  const attrs = allocateBatchAttributes(geometry, initialCapacity);
  geometry.setDrawRange(0, 0);
  return {
    geometry,
    ...attrs,
    lastActiveCount: 0,
  };
}

function ensureBatchCapacity(state: BatchBufferState, required: number): boolean {
  if (required <= state.capacity) return false;
  let nextCapacity = state.capacity;
  while (nextCapacity < required) {
    nextCapacity *= 2;
  }
  const attrs = allocateBatchAttributes(state.geometry, nextCapacity);
  state.capacity = attrs.capacity;
  state.positions = attrs.positions;
  state.colors = attrs.colors;
  state.pixelSizes = attrs.pixelSizes;
  state.alphas = attrs.alphas;
  state.posAttr = attrs.posAttr;
  state.colAttr = attrs.colAttr;
  state.sizeAttr = attrs.sizeAttr;
  state.alphaAttr = attrs.alphaAttr;
  return true;
}

export function syncBatchEntries(
  state: BatchBufferState,
  entries: readonly EntityDotRegistration[],
  tokenColor: THREE.Color,
  scratchVec: THREE.Vector3,
  scratchColor: THREE.Color,
): void {
  const activeCount = entries.length;
  const resized = ensureBatchCapacity(state, activeCount);

  let posDirty = resized;
  let colDirty = resized;
  let sizeDirty = resized;
  let alphaDirty = resized;

  const { positions, colors, pixelSizes, alphas } = state;

  for (let i = 0; i < activeCount; i++) {
    const entry = entries[i];
    const i3 = i * 3;
    const grp = entry.groupRef.current;

    let px = 0;
    let py = 0;
    let pz = 0;
    if (entry.worldPosition !== undefined) {
      if (entry.worldPosition instanceof THREE.Vector3) {
        px = entry.worldPosition.x;
        py = entry.worldPosition.y;
        pz = entry.worldPosition.z;
      } else {
        px = entry.worldPosition[0];
        py = entry.worldPosition[1];
        pz = entry.worldPosition[2];
      }
    } else if (grp) {
      grp.getWorldPosition(scratchVec);
      px = scratchVec.x;
      py = scratchVec.y;
      pz = scratchVec.z;
    }

    if (positions[i3] !== px || positions[i3 + 1] !== py || positions[i3 + 2] !== pz) {
      positions[i3] = px;
      positions[i3 + 1] = py;
      positions[i3 + 2] = pz;
      posDirty = true;
    }

    let cr = tokenColor.r;
    let cg = tokenColor.g;
    let cb = tokenColor.b;
    if (entry.color !== undefined) {
      if (entry.color instanceof THREE.Color) {
        cr = entry.color.r;
        cg = entry.color.g;
        cb = entry.color.b;
      } else {
        scratchColor.set(entry.color);
        cr = scratchColor.r;
        cg = scratchColor.g;
        cb = scratchColor.b;
      }
    }

    if (colors[i3] !== cr || colors[i3 + 1] !== cg || colors[i3 + 2] !== cb) {
      colors[i3] = cr;
      colors[i3 + 1] = cg;
      colors[i3 + 2] = cb;
      colDirty = true;
    }

    const ps = entry.pixelSize;
    if (pixelSizes[i] !== ps) {
      pixelSizes[i] = ps;
      sizeDirty = true;
    }

    const hiddenByParent = grp !== null && (!grp.visible || grp.parent?.visible === false);
    const alpha = hiddenByParent ? 0 : (entry.nodeAlphaRef ? entry.nodeAlphaRef.current : 1);
    if (alphas[i] !== alpha) {
      alphas[i] = alpha;
      alphaDirty = true;
    }
  }

  if (state.lastActiveCount !== activeCount || resized) {
    state.geometry.setDrawRange(0, activeCount);
    state.lastActiveCount = activeCount;
  }
  if (posDirty) state.posAttr.needsUpdate = true;
  if (colDirty) state.colAttr.needsUpdate = true;
  if (sizeDirty) state.sizeAttr.needsUpdate = true;
  if (alphaDirty) state.alphaAttr.needsUpdate = true;
}
