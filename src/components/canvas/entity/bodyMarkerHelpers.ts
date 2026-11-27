import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { SpatialFrameState } from '../instrument/spatialFrameContext';
import { getCrossScaleSceneScale } from '../instrument/crossScaleVisualState';
import {
  DEFAULT_RETICLE_SIZE,
  resolveEffectiveHitRadiusPx,
  resolveEntityScreenInvariantScale,
  reticleSizeToScreenPx,
  screenRadiusPxToReticleWorldUnits,
} from '../engineConfig';
import { projectedPixelDiameter } from '../math/bodyCrossfade';

export const SHARED_DOT_GEOMETRY = new THREE.SphereGeometry(0.5, 16, 16);
export const SHARED_HITAREA_GEOMETRY = new THREE.CircleGeometry(1.0, 32);
export const SHARED_HITAREA_INVISIBLE_MATERIAL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export interface BillboardSyncState {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  scale: number;
  hx: number;
  hy: number;
}

export function getPointerCoord(e: ThreeEvent<PointerEvent>): { x: number; y: number } {
  const n = e.nativeEvent as (PointerEvent | MouseEvent | undefined);
  return {
    x: typeof e.clientX === 'number' ? e.clientX : (typeof n?.clientX === 'number' ? n.clientX : 0),
    y: typeof e.clientY === 'number' ? e.clientY : (typeof n?.clientY === 'number' ? n.clientY : 0),
  };
}

export function computeMarkerDotWorldScale(
  camera: THREE.Camera,
  camDist: number,
  pixelSize: number,
  viewportHeight: number,
): number {
  let worldScale = (pixelSize / Math.max(viewportHeight, 1)) * 2;
  if (camera instanceof THREE.PerspectiveCamera) {
    const vFovRad = (camera.fov * Math.PI) / 180;
    worldScale *= (Math.tan(vFovRad / 2) * camDist) / Math.max(camera.zoom, 1e-4);
  } else if (camera instanceof THREE.OrthographicCamera) {
    worldScale *= (camera.top - camera.bottom) / (2 * Math.max(camera.zoom, 1e-4));
  }
  return worldScale;
}

export function syncBodyMarkerHitareaTransform(
  camera: THREE.Camera,
  camDist: number,
  viewportHeight: number,
  worldPosition: THREE.Vector3,
  spatialFrame: SpatialFrameState | undefined,
  reticleSize: number | undefined,
  hitRadius: number | undefined,
  minWorldHitRadius: number | undefined,
  isCoarseOrTouch: boolean,
  hitOffsetX: number,
  hitOffsetY: number,
  billboard: THREE.Group,
  hitarea: THREE.Mesh,
  lastSync: BillboardSyncState,
): void {
  const invScale = resolveEntityScreenInvariantScale(camDist, camera, spatialFrame);
  const rSize = reticleSize ?? DEFAULT_RETICLE_SIZE;
  const reticleRadiusPx = reticleSizeToScreenPx(rSize, viewportHeight);
  const scaledBodyWorldRadius =
    minWorldHitRadius !== undefined && minWorldHitRadius > 0
      ? minWorldHitRadius * getCrossScaleSceneScale()
      : 0;
  const projectedBodyRadiusPx =
    scaledBodyWorldRadius > 0
      ? projectedPixelDiameter(camera, worldPosition, scaledBodyWorldRadius, viewportHeight) * 0.5
      : 0;
  const effectiveHitRadiusPx = resolveEffectiveHitRadiusPx(
    reticleRadiusPx,
    isCoarseOrTouch,
    projectedBodyRadiusPx,
  );
  const flooredHitWorldSize = screenRadiusPxToReticleWorldUnits(
    effectiveHitRadiusPx,
    viewportHeight,
  );
  const baseHitWorldSize = hitRadius ?? rSize;
  const effectiveHitWorldSize = Math.max(baseHitWorldSize, flooredHitWorldSize);
  const effectiveHitRadius =
    scaledBodyWorldRadius > 0
      ? Math.max(effectiveHitWorldSize * invScale, scaledBodyWorldRadius)
      : effectiveHitWorldSize * invScale;

  // Interactive Hit-Testing Fan-Out (Spec 2.2):
  // When systems overlap in screen space, underlying invisible hit areas fan out radially around cluster centroid
  const pxToLocal = reticleRadiusPx > 0 ? (rSize * invScale) / reticleRadiusPx : 0;
  const localHitX = hitOffsetX * pxToLocal;
  const localHitY = -hitOffsetY * pxToLocal;

  const cq = camera.quaternion;
  const quatChanged =
    Number.isNaN(lastSync.qw) ||
    Math.abs(lastSync.qx - cq.x) > 1e-6 ||
    Math.abs(lastSync.qy - cq.y) > 1e-6 ||
    Math.abs(lastSync.qz - cq.z) > 1e-6 ||
    Math.abs(lastSync.qw - cq.w) > 1e-6;
  const scaleChanged =
    Number.isNaN(lastSync.scale) ||
    Math.abs(lastSync.scale - effectiveHitRadius) > 1e-6;
  const hitChanged =
    Number.isNaN(lastSync.hx) ||
    Math.abs(lastSync.hx - localHitX) > 1e-6 ||
    Math.abs(lastSync.hy - localHitY) > 1e-6;

  if (quatChanged || scaleChanged || hitChanged) {
    billboard.quaternion.copy(cq);
    hitarea.scale.set(effectiveHitRadius, effectiveHitRadius, 1);
    hitarea.position.set(localHitX, localHitY, 0);
    billboard.updateMatrixWorld(true);

    lastSync.qx = cq.x;
    lastSync.qy = cq.y;
    lastSync.qz = cq.z;
    lastSync.qw = cq.w;
    lastSync.scale = effectiveHitRadius;
    lastSync.hx = localHitX;
    lastSync.hy = localHitY;
  }
}
