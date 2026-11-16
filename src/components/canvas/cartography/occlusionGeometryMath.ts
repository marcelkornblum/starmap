import type { Box2D, CelestialFootprint } from './occlusionTypes';

/**
 * Checks if two 2D axis-aligned bounding boxes intersect.
 */
export function boxesIntersect(a: Box2D, b: Box2D): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

/**
 * Checks if a 2D axis-aligned bounding box intersects an L1 diamond reticle (|x - cx| + |y - cy| <= radius).
 */
export function diamondIntersectsAABB(
  cx: number,
  cy: number,
  radius: number,
  box: Box2D,
): boolean {
  if (radius <= 0) return false;
  const dx = Math.max(0, box.left - cx, cx - box.right);
  const dy = Math.max(0, box.top - cy, cy - box.bottom);
  return (dx + dy) <= radius;
}

/**
 * Checks if a 2D axis-aligned bounding box intersects a circular region (e.g. star dot).
 */
export function circleIntersectsAABB(
  cx: number,
  cy: number,
  radius: number,
  box: Box2D,
): boolean {
  if (radius <= 0) return false;
  const closestX = Math.max(box.left, Math.min(cx, box.right));
  const closestY = Math.max(box.top, Math.min(cy, box.bottom));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (radius * radius);
}

/**
 * Checks if two L1 diamond reticles intersect in 2D screen space.
 */
export function diamondsIntersect(
  c1x: number,
  c1y: number,
  r1: number,
  c2x: number,
  c2y: number,
  r2: number,
): boolean {
  const dx = Math.abs(c1x - c2x);
  const dy = Math.abs(c1y - c2y);
  return (dx + dy) <= (r1 + r2);
}

/**
 * Checks if a label box intersects a target celestial footprint reticle.
 */
export function boxIntersectsFootprint(box: Box2D, footprint: CelestialFootprint): boolean {
  if (!footprint.visible) return false;
  if (footprint.hasReticle && diamondIntersectsAABB(footprint.screenX, footprint.screenY, footprint.reticleRadius, box)) {
    return true;
  }
  return false;
}

/**
 * Checks if a label box intersects any footprint in the spatial grid.
 */
export function checkGridIntersection(
  grid: ScreenSpatialGrid,
  sourceId: string,
  labelBox: Box2D,
  checkSelf = true,
): { hasIntersection: boolean; collidingNodeId?: string } {
  const centerX = (labelBox.left + labelBox.right) * 0.5;
  const centerY = (labelBox.top + labelBox.bottom) * 0.5;
  const radius = Math.max(labelBox.right - labelBox.left, labelBox.bottom - labelBox.top) * 0.5 + 80;

  let result: { hasIntersection: boolean; collidingNodeId?: string } = { hasIntersection: false };
  grid.forEachNearby(centerX, centerY, radius, (footprint) => {
    if (!checkSelf && footprint.id === sourceId) return;
    if (boxIntersectsFootprint(labelBox, footprint)) {
      result = { hasIntersection: true, collidingNodeId: footprint.id };
      return false;
    }
  });
  return result;
}

/**
 * 2D Screen-space spatial partition grid.
 * Groups registered footprints into fixed pixel cells to convert O(N^2) pairwise
 * intersection and distance checks into O(1) local neighborhood lookups.
 */
export class ScreenSpatialGrid {
  private cellSize: number;
  private cells = new Map<number, CelestialFootprint[]>();
  private activeCells: CelestialFootprint[][] = [];

  constructor(cellSize = 100) {
    this.cellSize = cellSize;
  }

  private hash(cx: number, cy: number): number {
    return (cx & 0xffff) | ((cy & 0xffff) << 16);
  }

  public clear(): void {
    if (this.cells.size > 4096) {
      this.cells.clear();
      this.activeCells.length = 0;
      return;
    }
    for (let i = 0; i < this.activeCells.length; i++) {
      this.activeCells[i].length = 0;
    }
    this.activeCells.length = 0;
  }

  public insert(fp: CelestialFootprint): void {
    const cx = Math.floor(fp.screenX / this.cellSize);
    const cy = Math.floor(fp.screenY / this.cellSize);
    const key = this.hash(cx, cy);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    if (cell.length === 0) {
      this.activeCells.push(cell);
    }
    cell.push(fp);
  }

  public forEachNearby(
    x: number,
    y: number,
    radius: number,
    cb: (item: CelestialFootprint) => boolean | void,
  ): void {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.hash(cx, cy);
        const arr = this.cells.get(key);
        if (arr && arr.length > 0) {
          for (let i = 0; i < arr.length; i++) {
            if (cb(arr[i]) === false) return;
          }
        }
      }
    }
  }
}
