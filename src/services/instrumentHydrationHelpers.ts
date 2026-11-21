/**
 * Spatial proximity query math and metadata eviction helpers for instrument hydration.
 *
 * Extracted from instrumentHydrationService to maintain modular separation
 * and keep core service file under size limits.
 */

import type { SystemSummaryNode } from '../types/astro';
import type { SectorQueryInput, SpatialStarHit } from './instrumentHydrationService';

/**
 * Calculates squared minimum distance from point (fx, fy, fz) to cubic AABB.
 */
export function computeBoxMinDistSq(
  fx: number,
  fy: number,
  fz: number,
  minX: number,
  minY: number,
  minZ: number,
  size: number,
): number {
  const maxX = minX + size;
  const maxY = minY + size;
  const maxZ = minZ + size;
  let boxDistSq = 0;
  if (fx < minX) boxDistSq += (minX - fx) ** 2;
  else if (fx > maxX) boxDistSq += (fx - maxX) ** 2;
  if (fy < minY) boxDistSq += (minY - fy) ** 2;
  else if (fy > maxY) boxDistSq += (fy - maxY) ** 2;
  if (fz < minZ) boxDistSq += (minZ - fz) ** 2;
  else if (fz > maxZ) boxDistSq += (fz - maxZ) ** 2;
  return boxDistSq;
}

/**
 * Scans star positions in a sector and updates seenHashes if within queryRadiusSq.
 */
export function scanSectorWithinSphere(
  sector: SectorQueryInput,
  fx: number,
  fy: number,
  fz: number,
  queryRadiusSq: number,
  innerRadiusSq: number,
  seenHashes: Map<number, SpatialStarHit>,
): void {
  const positions = sector.decoded.positions;
  const ids = sector.decoded.ids;
  const count = sector.decoded.header.count;

  for (let i = 0; i < count; i++) {
    const px = positions[i * 3 + 0]!;
    const py = positions[i * 3 + 1]!;
    const pz = positions[i * 3 + 2]!;

    const dx = px - fx;
    const dy = py - fy;
    const dz = pz - fz;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= queryRadiusSq) {
      const idHash = ids[i]! >>> 0;
      const existing = seenHashes.get(idHash);
      if (!existing || distSq < existing.distancePc * existing.distancePc) {
        const distancePc = Math.sqrt(distSq);
        const inInnerAperture = distSq <= innerRadiusSq;
        seenHashes.set(idHash, {
          idHash,
          x: px,
          y: py,
          z: pz,
          distancePc,
          inInnerAperture,
          sectorId: sector.sectorId,
        });
      }
    }
  }
}

/**
 * Partitions star hits into active and lead buffer lists, sorted by distance.
 */
export function partitionAndSortHits(seenHashes: Map<number, SpatialStarHit>): {
  activeStars: SpatialStarHit[];
  leadBufferStars: SpatialStarHit[];
  allPerimeterHashes: Set<number>;
} {
  const activeStars: SpatialStarHit[] = [];
  const leadBufferStars: SpatialStarHit[] = [];
  const allPerimeterHashes = new Set<number>();

  for (const hit of seenHashes.values()) {
    allPerimeterHashes.add(hit.idHash);
    if (hit.inInnerAperture) activeStars.push(hit);
    else leadBufferStars.push(hit);
  }

  const sortFn = (a: SpatialStarHit, b: SpatialStarHit) =>
    a.distancePc - b.distancePc || a.idHash - b.idHash;
  activeStars.sort(sortFn);
  leadBufferStars.sort(sortFn);

  return { activeStars, leadBufferStars, allPerimeterHashes };
}

/**
 * Evicts hydrated entries and unresolvable tracking for stars outside active perimeter.
 * Returns count of evicted hydrated summaries.
 */
export function evictStaleMetadata(
  hydratedMap: Map<number, SystemSummaryNode>,
  unresolvableHashes: Set<number>,
  perimeterHashes: ReadonlySet<number>,
): number {
  let evictedCount = 0;
  for (const idHash of Array.from(hydratedMap.keys())) {
    if (!perimeterHashes.has(idHash)) {
      hydratedMap.delete(idHash);
      evictedCount++;
    }
  }
  for (const idHash of Array.from(unresolvableHashes)) {
    if (!perimeterHashes.has(idHash)) unresolvableHashes.delete(idHash);
  }
  return evictedCount;
}

/**
 * Collects available hydrated summaries for a list of hits.
 */
export function resolveHitsSummaries(
  hits: readonly SpatialStarHit[],
  hydratedMap: ReadonlyMap<number, SystemSummaryNode>,
): SystemSummaryNode[] {
  const summaries: SystemSummaryNode[] = [];
  for (const hit of hits) {
    const summary = hydratedMap.get(hit.idHash);
    if (summary) summaries.push(summary);
  }
  return summaries;
}

/**
 * Collects unique unhydrated sector IDs from spatial star hits for batch preloading.
 */
export function collectUnhydratedSectorIds(
  hits: readonly SpatialStarHit[],
  hydratedMap: ReadonlyMap<number, SystemSummaryNode>,
  unresolvableHashes: ReadonlySet<number>,
): string[] {
  const uniqueSectorIds: string[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (hydratedMap.has(hit.idHash) || unresolvableHashes.has(hit.idHash)) {
      continue;
    }
    if (hit.sectorId && !seen.has(hit.sectorId)) {
      seen.add(hit.sectorId);
      uniqueSectorIds.push(hit.sectorId);
    }
  }
  return uniqueSectorIds;
}

/**
 * Executes async hydration for a single star hash with perimeter guard check.
 */
export async function executeStarHydration(
  idHash: number,
  hydrateByHash: (idHash: number) => Promise<SystemSummaryNode | undefined>,
  isDisposed: () => boolean,
  isWithinPerimeter: (idHash: number) => boolean,
  hydratedMap: Map<number, SystemSummaryNode>,
  unresolvableHashes: Set<number>,
): Promise<SystemSummaryNode | undefined> {
  try {
    const summary = await hydrateByHash(idHash);
    if (isDisposed()) return undefined;
    if (summary) {
      if (isWithinPerimeter(idHash)) hydratedMap.set(idHash, summary);
      return summary;
    }
    if (isWithinPerimeter(idHash)) unresolvableHashes.add(idHash);
    return undefined;
  } catch {
    if (!isDisposed() && isWithinPerimeter(idHash)) unresolvableHashes.add(idHash);
    return undefined;
  }
}
