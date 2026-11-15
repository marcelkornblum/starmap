/**
 * Sector Selection, Ring Geometry, and Streaming Types.
 *
 * Implements pure spatial sector ring selection algorithms, distance metrics,
 * and core sector streaming types without hardcoded literal violations.
 */

import {
  formatSectorId,
  getSectorBounds,
  getSectorCoordinate,
  DEFAULT_SECTOR_SIZE_PC,
} from '../utils/sectorMath';
import type { DecodedBinarySector } from '../utils/binarySectorCodec';
import type { DeviceTierBudget, DevicePerformanceTier } from './deviceTierService';

export const DEFAULT_MAX_CATALOG_RADIUS_PC = 125;

export interface DisposableGpuResource {
  dispose(): void;
}

export type SectorLifecycleState = 'fetching' | 'decoded' | 'uploaded' | 'missing';

export interface CachedSectorEntry {
  readonly sectorId: string;
  readonly decoded: DecodedBinarySector;
  readonly byteLength: number;
  state: 'decoded' | 'uploaded';
  gpuResource: DisposableGpuResource | null;
  lastAccessedTick: number;
  distanceSq: number;
}

export interface SectorRingPlan {
  readonly centerSectorId: string;
  readonly centerOrigin: readonly [number, number, number];
  /** Active 1-ring sectors sorted nearest-first, capped to budget.maxActiveSectors */
  readonly activeSectorIds: readonly string[];
  /** Outer prefetch ring sectors sorted nearest-first, capped to remaining LRU capacity */
  readonly prefetchSectorIds: readonly string[];
}

export interface SectorStreamingTelemetry {
  readonly tier: DevicePerformanceTier;
  readonly activeSectorCount: number;
  readonly uploadedSectorCount: number;
  readonly cachedSectorCount: number;
  readonly pendingUploadCount: number;
  readonly inFlightFetchCount: number;
  readonly activePointCount: number;
  readonly allocatedGpuBytes: number;
  readonly cachedRamBytes: number;
  readonly evictedCount: number;
  readonly disposedGpuCount: number;
}

export interface SectorStreamingOptions {
  readonly budget?: DeviceTierBudget;
  readonly sectorSizePc?: number;
  readonly maxCatalogRadiusPc?: number;
  readonly fetcher?: (sectorId: string, priority: 'high' | 'low') => Promise<ArrayBuffer | null>;
  readonly gpuResourceFactory?: (decoded: DecodedBinarySector, sectorId: string) => DisposableGpuResource;
}

export interface SectorCandidate {
  readonly sectorId: string;
  readonly distSq: number;
}

/**
 * Parses sectorId into center coordinates [x, y, z] in parsecs.
 */
export function getSectorCenterFromId(sectorId: string, sectorSize: number): [number, number, number] {
  const bounds = getSectorBounds(sectorId, sectorSize);
  if (!bounds) return [0, 0, 0];
  const half = sectorSize * 0.5;
  return [bounds.min.x + half, bounds.min.y + half, bounds.min.z + half];
}

/**
 * Computes the active 1-ring and outer prefetch rings around a camera position in parsecs.
 */
export function computeSectorRings(
  positionPc: readonly [number, number, number],
  budget: DeviceTierBudget,
  options?: { sectorSizePc?: number; maxCatalogRadiusPc?: number },
): SectorRingPlan {
  const posX = Number.isFinite(positionPc?.[0]) ? (positionPc[0] as number) : 0;
  const posY = Number.isFinite(positionPc?.[1]) ? (positionPc[1] as number) : 0;
  const posZ = Number.isFinite(positionPc?.[2]) ? (positionPc[2] as number) : 0;

  const size =
    options?.sectorSizePc && Number.isFinite(options.sectorSizePc) && options.sectorSizePc > 0
      ? options.sectorSizePc
      : DEFAULT_SECTOR_SIZE_PC;
  const maxRadius =
    options?.maxCatalogRadiusPc &&
    Number.isFinite(options.maxCatalogRadiusPc) &&
    options.maxCatalogRadiusPc > 0
      ? options.maxCatalogRadiusPc
      : DEFAULT_MAX_CATALOG_RADIUS_PC;

  const cx = getSectorCoordinate(posX, size);
  const cy = getSectorCoordinate(posY, size);
  const cz = getSectorCoordinate(posZ, size);
  const centerSectorId = formatSectorId(cx, cy, cz, size);
  const centerOrigin: readonly [number, number, number] = [cx, cy, cz];

  const maxDistFromOrigin = maxRadius + size * 0.87;

  // 1-ring generation (dx, dy, dz in [-1, 0, 1])
  const candidates1Ring: SectorCandidate[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const sx = cx + dx * size;
        const sy = cy + dy * size;
        const sz = cz + dz * size;

        const scx = sx + size * 0.5;
        const scy = sy + size * 0.5;
        const scz = sz + size * 0.5;

        if (Math.hypot(scx, scy, scz) > maxDistFromOrigin) {
          continue;
        }

        const sectorId = formatSectorId(sx, sy, sz, size);
        const distSq = (posX - scx) ** 2 + (posY - scy) ** 2 + (posZ - scz) ** 2;
        candidates1Ring.push({ sectorId, distSq });
      }
    }
  }

  // Sort 1-ring candidates nearest-first, prioritizing center sector in boundary ties
  candidates1Ring.sort((a, b) => {
    if (Math.abs(a.distSq - b.distSq) > 1e-6) {
      return a.distSq - b.distSq;
    }
    if (a.sectorId === centerSectorId) return -1;
    if (b.sectorId === centerSectorId) return 1;
    return a.sectorId.localeCompare(b.sectorId);
  });

  const activeSectorCandidates = candidates1Ring.slice(0, budget.maxActiveSectors);
  const activeSectorIds = activeSectorCandidates.map((c) => c.sectorId);
  const overflow1Ring = candidates1Ring.slice(budget.maxActiveSectors);

  // Outer prefetch ring generation
  const ringRadius = Math.max(1, budget.prefetchRingRadius);
  const outerPrefetchCandidates: SectorCandidate[] = [];

  for (let dx = -ringRadius; dx <= ringRadius; dx++) {
    for (let dy = -ringRadius; dy <= ringRadius; dy++) {
      for (let dz = -ringRadius; dz <= ringRadius; dz++) {
        const chebyshev = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
        if (chebyshev <= 1) {
          continue; // Already processed in 1-ring
        }

        const sx = cx + dx * size;
        const sy = cy + dy * size;
        const sz = cz + dz * size;

        const scx = sx + size * 0.5;
        const scy = sy + size * 0.5;
        const scz = sz + size * 0.5;

        if (Math.hypot(scx, scy, scz) > maxDistFromOrigin) {
          continue;
        }

        const sectorId = formatSectorId(sx, sy, sz, size);
        const distSq = (posX - scx) ** 2 + (posY - scy) ** 2 + (posZ - scz) ** 2;
        outerPrefetchCandidates.push({ sectorId, distSq });
      }
    }
  }

  const allPrefetchCandidates = [...overflow1Ring, ...outerPrefetchCandidates];
  allPrefetchCandidates.sort((a, b) => a.distSq - b.distSq || a.sectorId.localeCompare(b.sectorId));

  const prefetchCap = Math.max(0, budget.lruCacheMaxSectors - activeSectorIds.length);
  const prefetchSectorIds = allPrefetchCandidates.slice(0, prefetchCap).map((c) => c.sectorId);

  return {
    centerSectorId,
    centerOrigin,
    activeSectorIds,
    prefetchSectorIds,
  };
}
