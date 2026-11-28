import type * as THREE from 'three';
import { DEFAULT_RETICLE_SIZE, reticleSizeToScreenPx } from '../engineConfig';
import type { CelestialFootprint } from './occlusionTypes';

/**
 * Priority Occlusion Masking for Geometric Reticles:
 * - Equal-priority reticles (e.g. ambient contacts) overlay directly without suppression.
 * - Significant reticles (active focused/selected) establish an attentional priority mask,
 *   suppressing lesser background reticles colliding directly beneath them.
 */
export function isReticleSuppressedBySignificant(
  target: CelestialFootprint,
  significantFootprints: CelestialFootprint[],
): boolean {
  if (!target.visible || !target.hasReticle) return false;
  if (target.state === 'selected' || target.state === 'focused') return false;
  if (significantFootprints.length === 0) return false;

  for (let i = 0; i < significantFootprints.length; i++) {
    const other = significantFootprints[i];
    if (other.id === target.id || !other.visible || !other.hasReticle) continue;
    const dx = Math.abs(target.screenX - other.screenX);
    const dy = Math.abs(target.screenY - other.screenY);
    if (
      (dx + dy) <= (target.reticleRadius + other.reticleRadius) * 0.75 &&
      (target.camDist ?? 0) >= (other.camDist ?? 0)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Collects active, visible reticle footprints in selected or focused states.
 */
export function collectSignificantFootprints(
  footprints: Iterable<CelestialFootprint>,
): CelestialFootprint[] {
  const result: CelestialFootprint[] = [];
  for (const fp of footprints) {
    if (fp.visible && fp.hasReticle && (fp.state === 'selected' || fp.state === 'focused')) {
      result.push(fp);
    }
  }
  return result;
}

/**
 * Evaluates dynamic screen projections and pixel footprints for a single node.
 */
export function projectFootprint(
  fp: CelestialFootprint,
  camera: THREE.Camera,
  size: { width: number; height: number },
  scratchVec: THREE.Vector3,
  scratchCamSpaceVec: THREE.Vector3,
  zNear: number,
  evalTime: number,
): void {
  if (!fp.worldPos) return;
  scratchVec.set(fp.worldPos[0], fp.worldPos[1], fp.worldPos[2]);
  const camZ = scratchCamSpaceVec.copy(scratchVec).applyMatrix4(camera.matrixWorldInverse).z;
  const ndc = scratchVec.project(camera);
  const screenX = (ndc.x * 0.5 + 0.5) * size.width;
  const screenY = (-ndc.y * 0.5 + 0.5) * size.height;
  if (
    !Number.isFinite(camZ) ||
    !Number.isFinite(ndc.x) ||
    !Number.isFinite(ndc.y) ||
    !Number.isFinite(screenX) ||
    !Number.isFinite(screenY) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    fp.visible = false;
    fp.updatedAt = evalTime;
    return;
  }
  const isBehind = camZ > -zNear;
  fp.screenX = screenX;
  fp.screenY = screenY;
  fp.camDist = camera.position.distanceTo(scratchVec);
  fp.visible = !isBehind;
  fp.updatedAt = evalTime;

  const rPx = reticleSizeToScreenPx(fp.reticleSize ?? DEFAULT_RETICLE_SIZE, size.height);
  fp.reticleRadius = rPx;
  fp.starRadius = Math.max(3, reticleSizeToScreenPx(0.035, size.height));

  const w = (fp.name ? fp.name.length : 8) * 8 + 14;
  const ax = fp.screenX + 1.15 * rPx;
  const ay = fp.screenY - 0.75 * rPx;
  if (!fp.labelBox) fp.labelBox = { left: ax, top: ay - 10, right: ax + w, bottom: ay + 10 };
  else { fp.labelBox.left = ax; fp.labelBox.top = ay - 10; fp.labelBox.right = ax + w; fp.labelBox.bottom = ay + 10; }
}

export function areStalkedEqual(a: CelestialFootprint[], b: CelestialFootprint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((it, i) => (
    it.id === b[i].id && it.state === b[i].state && it.classification === b[i].classification &&
    it.reticleSize === b[i].reticleSize && it.worldPos?.[0] === b[i].worldPos?.[0] &&
    it.worldPos?.[1] === b[i].worldPos?.[1] && it.worldPos?.[2] === b[i].worldPos?.[2]
  ));
}
