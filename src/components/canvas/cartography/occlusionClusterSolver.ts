import type { CelestialFootprint } from './occlusionTypes';
import type { ScreenSpatialGrid } from './occlusionGeometryMath';

/**
 * Computes hit area fan-out offsets for a target footprint and its overlapping cluster.
 */
export function computeHitAreaCluster(
  target: CelestialFootprint,
  grid: ScreenSpatialGrid,
  cluster: CelestialFootprint[],
  evalTime: number,
): void {
  if (!target.hasReticle) {
    target.hitAreaOffsetX = 0;
    target.hitAreaOffsetY = 0;
    target.hitAreaEvaluatedAt = evalTime;
    return;
  }

  cluster.length = 0;
  const searchRadius = target.reticleRadius * 2.5;

  grid.forEachNearby(target.screenX, target.screenY, searchRadius, (other) => {
    if (!other.visible || !other.hasReticle) return;
    const dx = target.screenX - other.screenX;
    const dy = target.screenY - other.screenY;
    const dist = Math.hypot(dx, dy);
    const threshold = Math.max(target.reticleRadius, other.reticleRadius) * 0.9;
    if (dist <= threshold) {
      cluster.push(other);
    }
  });

  if (cluster.length <= 1) {
    target.hitAreaOffsetX = 0;
    target.hitAreaOffsetY = 0;
    target.hitAreaEvaluatedAt = evalTime;
    return;
  }

  // 1. Calculate centroid
  let centroidX = 0;
  let centroidY = 0;
  for (let i = 0; i < cluster.length; i++) {
    centroidX += cluster[i].screenX;
    centroidY += cluster[i].screenY;
  }
  centroidX /= cluster.length;
  centroidY /= cluster.length;

  // 2. Sort cluster by polar angle with ID tie-breaking
  cluster.sort((a, b) => {
    const angleA = Math.atan2(a.screenY - centroidY, a.screenX - centroidX);
    const angleB = Math.atan2(b.screenY - centroidY, b.screenX - centroidX);
    const diff = angleA - angleB;
    if (Math.abs(diff) > 1e-4) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // 3. Assign fan offsets outward from centroid
  const baseAngle = Math.atan2(cluster[0].screenY - centroidY, cluster[0].screenX - centroidX);
  for (let i = 0; i < cluster.length; i++) {
    const member = cluster[i];
    const angle = baseAngle + (2 * Math.PI * i) / cluster.length;
    const fanRadius = member.reticleRadius * 0.85;
    member.hitAreaOffsetX = fanRadius * Math.cos(angle);
    member.hitAreaOffsetY = fanRadius * Math.sin(angle);
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
): string {
  const target = footprints.get(clickedId);
  if (!target || !target.visible || !target.hasReticle) return clickedId;

  cluster.length = 0;
  const searchRadius = target.reticleRadius * 2.0;

  grid.forEachNearby(target.screenX, target.screenY, searchRadius, (other) => {
    if (!other.visible || !other.hasReticle) return;
    const dx = target.screenX - other.screenX;
    const dy = target.screenY - other.screenY;
    const dist = Math.hypot(dx, dy);
    const threshold = Math.max(target.reticleRadius, other.reticleRadius) * 0.8;
    if (dist <= threshold) {
      cluster.push(other);
    }
  });

  if (cluster.length <= 1) {
    return clickedId;
  }

  cluster.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const currentIndex = cluster.findIndex((fp) => fp.id === clickedId);
  if (currentIndex === -1) return clickedId;
  const nextIndex = (currentIndex + 1) % cluster.length;
  return cluster[nextIndex].id;
}
