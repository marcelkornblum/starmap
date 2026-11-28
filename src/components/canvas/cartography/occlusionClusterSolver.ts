import type { CelestialFootprint } from './occlusionTypes';
import type { ScreenSpatialGrid } from './occlusionGeometryMath';
import { getCoarsePointerSnapshot, resolveEffectiveHitRadiusPx } from '../engineConfig';

const _scratchNearby: CelestialFootprint[] = [];
const _scratchSatellites: CelestialFootprint[] = [];
const _scratchAngles: number[] = [];

function compareFootprintsById(a: CelestialFootprint, b: CelestialFootprint): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Sorts `items` and pre-computed polar `angles` in place with deterministic ID tie-breaking,
 * avoiding inline comparator closures and repeated `Math.atan2` calls on the frame hot path.
 */
function sortByPolarAngleAndId(
  items: CelestialFootprint[],
  angles: number[],
  refX: number,
  refY: number,
): void {
  const count = items.length;
  angles.length = count;
  for (let i = 0; i < count; i++) {
    const member = items[i];
    angles[i] = Math.atan2(member.screenY - refY, member.screenX - refX);
  }

  for (let i = 1; i < count; i++) {
    const keyItem = items[i];
    const keyAngle = angles[i];
    let j = i - 1;
    while (j >= 0) {
      const diff = angles[j] - keyAngle;
      const shouldShift =
        Math.abs(diff) > 1e-4 ? diff > 0 : items[j].id > keyItem.id;
      if (!shouldShift) break;
      items[j + 1] = items[j];
      angles[j + 1] = angles[j];
      j--;
    }
    items[j + 1] = keyItem;
    angles[j + 1] = keyAngle;
  }
}

function getHierarchyRank(classification?: string): number {
  if (classification === 'star' || classification === 'system') return 2;
  if (classification === 'planet' || classification === 'dwarf-planet') return 1;
  return 0;
}

function findSingleDominantAnchor(cluster: readonly CelestialFootprint[]): CelestialFootprint | null {
  let maxRank = -1;
  let minRank = Infinity;
  let maxCount = 0;
  let candidate: CelestialFootprint | null = null;
  for (let i = 0; i < cluster.length; i++) {
    const member = cluster[i];
    const rank = getHierarchyRank(member.classification);
    if (rank > maxRank) {
      maxRank = rank;
      maxCount = 1;
      candidate = member;
    } else if (rank === maxRank) {
      maxCount += 1;
    }
    if (rank < minRank) {
      minRank = rank;
    }
  }
  return maxRank > minRank && maxCount === 1 ? candidate : null;
}

/**
 * Computes hit area fan-out offsets for a target footprint and its overlapping cluster.
 */
export function computeHitAreaCluster(
  target: CelestialFootprint,
  grid: ScreenSpatialGrid,
  cluster: CelestialFootprint[],
  evalTime: number,
  isCoarseOrTouch = getCoarsePointerSnapshot(),
): void {
  if (!target.hasReticle) {
    target.hitAreaOffsetX = 0;
    target.hitAreaOffsetY = 0;
    target.hitAreaEvaluatedAt = evalTime;
    return;
  }

  cluster.length = 0;
  const targetHitRadius = resolveEffectiveHitRadiusPx(target.reticleRadius, isCoarseOrTouch);
  const searchRadius = targetHitRadius * 2.5;
  const nearbyCount = grid.collectNearby(target.screenX, target.screenY, searchRadius, _scratchNearby);

  for (let i = 0; i < nearbyCount; i++) {
    const other = _scratchNearby[i];
    if (!other.visible || !other.hasReticle) continue;
    const dx = target.screenX - other.screenX;
    const dy = target.screenY - other.screenY;
    const dist = Math.hypot(dx, dy);
    const otherHitRadius = resolveEffectiveHitRadiusPx(other.reticleRadius, isCoarseOrTouch);
    const threshold = (targetHitRadius + otherHitRadius) * 0.9;
    if (dist <= threshold) {
      cluster.push(other);
    }
  }

  if (cluster.length <= 1) {
    target.hitAreaOffsetX = 0;
    target.hitAreaOffsetY = 0;
    target.hitAreaEvaluatedAt = evalTime;
    return;
  }

  const dominantAnchor = findSingleDominantAnchor(cluster);
  if (dominantAnchor) {
    dominantAnchor.hitAreaOffsetX = 0;
    dominantAnchor.hitAreaOffsetY = 0;
    dominantAnchor.hitAreaEvaluatedAt = evalTime;

    const anchorX = dominantAnchor.screenX;
    const anchorY = dominantAnchor.screenY;
    const anchorHitRadius = resolveEffectiveHitRadiusPx(dominantAnchor.reticleRadius, isCoarseOrTouch);
    _scratchSatellites.length = 0;
    for (let i = 0; i < cluster.length; i++) {
      const member = cluster[i];
      if (member !== dominantAnchor) {
        _scratchSatellites.push(member);
      }
    }

    sortByPolarAngleAndId(_scratchSatellites, _scratchAngles, anchorX, anchorY);

    const baseAngle = _scratchSatellites.length > 0 ? _scratchAngles[0] : 0;
    for (let i = 0; i < _scratchSatellites.length; i++) {
      const sat = _scratchSatellites[i];
      const angle = baseAngle + (2 * Math.PI * i) / _scratchSatellites.length;
      const satHitRadius = resolveEffectiveHitRadiusPx(sat.reticleRadius, isCoarseOrTouch);
      const ringRadius = Math.max(satHitRadius * 1.2, anchorHitRadius * 0.6 + satHitRadius * 0.65);
      sat.hitAreaOffsetX = anchorX + ringRadius * Math.cos(angle) - sat.screenX;
      sat.hitAreaOffsetY = anchorY + ringRadius * Math.sin(angle) - sat.screenY;
      sat.hitAreaEvaluatedAt = evalTime;
    }
    return;
  }

  // 1. Calculate centroid for peer clusters
  let centroidX = 0;
  let centroidY = 0;
  for (let i = 0; i < cluster.length; i++) {
    centroidX += cluster[i].screenX;
    centroidY += cluster[i].screenY;
  }
  centroidX /= cluster.length;
  centroidY /= cluster.length;

  // 2. Sort cluster by pre-computed polar angle with ID tie-breaking
  sortByPolarAngleAndId(cluster, _scratchAngles, centroidX, centroidY);

  // 3. Assign fan offsets outward from centroid so hit circles separate cleanly without abandoning each star's dot
  const sinHalfStep = Math.sin(Math.PI / cluster.length);
  const baseAngle = _scratchAngles[0];
  for (let i = 0; i < cluster.length; i++) {
    const member = cluster[i];
    const angle = baseAngle + (2 * Math.PI * i) / cluster.length;
    const memberHitRadius = resolveEffectiveHitRadiusPx(member.reticleRadius, isCoarseOrTouch);
    const minRingRadius = sinHalfStep > 1e-4 ? memberHitRadius / sinHalfStep : memberHitRadius;
    const existingDist = Math.hypot(member.screenX - centroidX, member.screenY - centroidY);
    const ringRadius = Math.max(minRingRadius, existingDist);
    member.hitAreaOffsetX = centroidX + ringRadius * Math.cos(angle) - member.screenX;
    member.hitAreaOffsetY = centroidY + ringRadius * Math.sin(angle) - member.screenY;
    member.hitAreaEvaluatedAt = evalTime;
  }
}

/**
 * Cyclic Selection for Overlapping Nodes:
 * Clicking an already-focused node in a crowded cluster advances focus to next node.
 */
export function resolveCyclicSelectionTarget(
  clickedId: string,
  footprints: Map<string, CelestialFootprint>,
  grid: ScreenSpatialGrid,
  cluster: CelestialFootprint[],
  isCoarseOrTouch = getCoarsePointerSnapshot(),
): string {
  const target = footprints.get(clickedId);
  if (!target || !target.visible || !target.hasReticle) return clickedId;

  cluster.length = 0;
  const targetHitRadius = resolveEffectiveHitRadiusPx(target.reticleRadius, isCoarseOrTouch);
  const searchRadius = targetHitRadius * 2.5;
  const nearbyCount = grid.collectNearby(target.screenX, target.screenY, searchRadius, _scratchNearby);

  for (let i = 0; i < nearbyCount; i++) {
    const other = _scratchNearby[i];
    if (!other.visible || !other.hasReticle) continue;
    const dx = target.screenX - other.screenX;
    const dy = target.screenY - other.screenY;
    const dist = Math.hypot(dx, dy);
    const otherHitRadius = resolveEffectiveHitRadiusPx(other.reticleRadius, isCoarseOrTouch);
    const threshold = (targetHitRadius + otherHitRadius) * 0.85;
    if (dist <= threshold) {
      cluster.push(other);
    }
  }

  if (cluster.length <= 1) {
    return clickedId;
  }

  cluster.sort(compareFootprintsById);
  let currentIndex = -1;
  for (let i = 0; i < cluster.length; i++) {
    if (cluster[i].id === clickedId) {
      currentIndex = i;
      break;
    }
  }
  if (currentIndex === -1) return clickedId;
  const nextIndex = (currentIndex + 1) % cluster.length;
  return cluster[nextIndex].id;
}
