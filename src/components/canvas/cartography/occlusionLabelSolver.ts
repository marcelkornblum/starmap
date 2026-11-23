import {
  type Box2D,
  type LabelOcclusionResult,
  type CelestialFootprint,
  CANDIDATE_MULTIPLIERS,
} from './occlusionTypes';
import {
  boxesIntersect,
  diamondIntersectsAABB,
  type ScreenSpatialGrid,
} from './occlusionGeometryMath';

/**
 * Evaluate label visibility based on interaction state and intersection status.
 */
export function evaluateLabelVisibility(
  state: 'passive' | 'active' | 'selected' | 'focused',
  hasIntersection: boolean,
): { visible: boolean; behindCanvas: boolean } {
  const isSelectedOrFocused = state === 'selected' || state === 'focused';

  if (hasIntersection) {
    if (isSelectedOrFocused) {
      return { visible: true, behindCanvas: true };
    }
    return { visible: false, behindCanvas: true };
  }

  return { visible: true, behindCanvas: true };
}

function statePriority(state: CelestialFootprint['state']): number {
  switch (state) {
    case 'focused':
      return 3;
    case 'selected':
      return 2;
    case 'active':
      return 1;
    default:
      return 0;
  }
}

const _scratchNearby: CelestialFootprint[] = [];

/**
 * Comprehensive Label Occlusion, Displacement & Proximity Culling:
 * 1. Screen-space displacement along radial leader stems.
 * 2. Camera-proximity occlusion beyond displacement threshold.
 * 3. Target immunity for focused/selected labels.
 * 4. Labels never occlude reticles.
 */
export function solveLabelOcclusion(
  target: CelestialFootprint,
  labelBox: Box2D | undefined,
  grid: ScreenSpatialGrid,
  cBox: Box2D,
  result: LabelOcclusionResult,
): LabelOcclusionResult {
  result.visible = true;
  result.behindCanvas = true;
  result.displacementX = 0;
  result.displacementY = 0;
  result.isDisplaced = false;

  if (!target.visible || target.state === 'passive') {
    result.visible = false;
    return result;
  }

  const box = labelBox ?? target.labelBox;
  if (!box) {
    result.visible = true;
    return result;
  }

  const r = target.reticleRadius;
  const targetPrio = statePriority(target.state);

  for (let cIdx = 0; cIdx < CANDIDATE_MULTIPLIERS.length; cIdx++) {
    const mult = CANDIDATE_MULTIPLIERS[cIdx];
    const dx = mult.x * r;
    const dy = mult.y * r;

    cBox.left = box.left + dx;
    cBox.top = box.top + dy;
    cBox.right = box.right + dx;
    cBox.bottom = box.bottom + dy;

    const cCenterX = (cBox.left + cBox.right) * 0.5;
    const cCenterY = (cBox.top + cBox.bottom) * 0.5;
    const searchRadius = Math.max(cBox.right - cBox.left, cBox.bottom - cBox.top) * 0.5 + 80;

    let collidesWithReticle = false;
    let collidesWithHigherPriorityLabel = false;

    const nearbyCount = grid.collectNearby(cCenterX, cCenterY, searchRadius, _scratchNearby);
    for (let nIdx = 0; nIdx < nearbyCount; nIdx++) {
      const other = _scratchNearby[nIdx];
      if (!other.visible || other.id === target.id) continue;

      if (other.hasReticle && diamondIntersectsAABB(other.screenX, other.screenY, other.reticleRadius, cBox)) {
        collidesWithReticle = true;
        break;
      }

      if (other.id !== target.id && other.labelBox && boxesIntersect(cBox, other.labelBox)) {
        const otherPrio = statePriority(other.state);
        if (otherPrio === 0) continue;

        if (otherPrio > targetPrio) {
          collidesWithHigherPriorityLabel = true;
          break;
        }

        if (otherPrio === targetPrio) {
          const otherDist = other.camDist ?? 0;
          const targetDist = target.camDist ?? 0;
          if (otherDist < targetDist) {
            collidesWithHigherPriorityLabel = true;
            break;
          } else if (otherDist === targetDist && (other.id < target.id ? -1 : other.id > target.id ? 1 : 0) < 0) {
            collidesWithHigherPriorityLabel = true;
            break;
          }
        }
      }
    }

    if (collidesWithReticle || collidesWithHigherPriorityLabel) {
      continue;
    }

    _scratchNearby.length = 0;
    result.visible = true;
    result.behindCanvas = true;
    result.displacementX = dx;
    result.displacementY = dy;
    result.isDisplaced = dx !== 0 || dy !== 0;
    return result;
  }

  _scratchNearby.length = 0;
  result.visible = target.state === 'selected' || target.state === 'focused';
  result.behindCanvas = true;
  result.displacementX = 0;
  result.displacementY = 0;
  result.isDisplaced = false;
  return result;
}
