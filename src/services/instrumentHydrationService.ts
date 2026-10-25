/**
 * Instrument Proximity Query and Metadata Hydration Service.
 *
 * Implements the Frontier Phase 4 Scope 2 Instrument Hydration Bridge:
 * - Broad-phase AABB-to-sphere rejection in O(1)
 * - Narrow-phase spatial star hits partitioned into active aperture and +2pc lead buffer
 * - 32-bit FNV-1a hash-based O(1) metadata hydration with transient perimeter eviction
 */

import type { SystemSummaryNode } from '../types/astro';
import type { DecodedBinarySector } from '../utils/binarySectorCodec';
import { fetchSummaryNodeByHash } from '../data/detailsRepository';

export const DEFAULT_INSTRUMENT_LEAD_BUFFER_PC = 2.0;

export interface SectorQueryInput {
  readonly sectorId?: string;
  readonly decoded: DecodedBinarySector;
}

export interface SpatialStarHit {
  readonly idHash: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly distancePc: number;
  readonly inInnerAperture: boolean;
  readonly sectorId?: string;
}

export interface InstrumentProximityQueryResult {
  readonly focusPointPc: readonly [number, number, number];
  readonly apertureRadiusPc: number;
  readonly leadBufferPc: number;
  readonly queryRadiusPc: number;
  readonly activeStars: readonly SpatialStarHit[];
  readonly leadBufferStars: readonly SpatialStarHit[];
  readonly allPerimeterHashes: ReadonlySet<number>;
}

export interface HydratedInstrumentState {
  readonly hydratedByHash: ReadonlyMap<number, SystemSummaryNode>;
  readonly activeSummaries: readonly SystemSummaryNode[];
  readonly leadBufferSummaries: readonly SystemSummaryNode[];
  readonly evictedMetadataCount: number;
}

export interface InstrumentHydrationOptions {
  readonly leadBufferPc?: number;
  readonly hydrateByHash?: (idHash: number) => Promise<SystemSummaryNode | undefined>;
}

/**
 * Pure spatial proximity query scanning decoded sectors within an instrument focus sphere.
 * Partitions hits into inner aperture (<= apertureRadiusPc) and outer lead buffer (<= aperture + leadBuffer).
 */
export function querySectorsWithinInstrumentSphere(
  sectors: readonly SectorQueryInput[],
  focusPointPc: readonly [number, number, number],
  apertureRadiusPc: number,
  leadBufferPc = DEFAULT_INSTRUMENT_LEAD_BUFFER_PC,
): InstrumentProximityQueryResult {
  const fx = Number.isFinite(focusPointPc?.[0]) ? (focusPointPc[0] as number) : 0;
  const fy = Number.isFinite(focusPointPc?.[1]) ? (focusPointPc[1] as number) : 0;
  const fz = Number.isFinite(focusPointPc?.[2]) ? (focusPointPc[2] as number) : 0;
  const sanitizedFocus: readonly [number, number, number] = [fx, fy, fz];

  const sanitizedAperture = Number.isFinite(apertureRadiusPc) ? Math.max(0, apertureRadiusPc) : 0;
  const sanitizedLeadBuffer = Number.isFinite(leadBufferPc) ? Math.max(0, leadBufferPc) : 0;
  const queryRadiusPc = sanitizedAperture + sanitizedLeadBuffer;
  const queryRadiusSq = queryRadiusPc * queryRadiusPc;
  const innerRadiusSq = sanitizedAperture * sanitizedAperture;

  const seenHashes = new Map<number, SpatialStarHit>();

  for (let s = 0; s < sectors.length; s++) {
    const sector = sectors[s]!;
    const header = sector.decoded.header;
    const size = header.sectorSize;
    const minX = header.origin[0];
    const minY = header.origin[1];
    const minZ = header.origin[2];
    const maxX = minX + size;
    const maxY = minY + size;
    const maxZ = minZ + size;

    // Broad-phase AABB-to-sphere minimum squared distance check
    let boxDistSq = 0;
    if (fx < minX) {
      const d = minX - fx;
      boxDistSq += d * d;
    } else if (fx > maxX) {
      const d = fx - maxX;
      boxDistSq += d * d;
    }

    if (fy < minY) {
      const d = minY - fy;
      boxDistSq += d * d;
    } else if (fy > maxY) {
      const d = fy - maxY;
      boxDistSq += d * d;
    }

    if (fz < minZ) {
      const d = minZ - fz;
      boxDistSq += d * d;
    } else if (fz > maxZ) {
      const d = fz - maxZ;
      boxDistSq += d * d;
    }

    if (boxDistSq > queryRadiusSq) {
      continue;
    }

    // Narrow-phase scan
    const positions = sector.decoded.positions;
    const ids = sector.decoded.ids;
    const count = header.count;

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

  const activeStars: SpatialStarHit[] = [];
  const leadBufferStars: SpatialStarHit[] = [];
  const allPerimeterHashes = new Set<number>();

  for (const hit of seenHashes.values()) {
    allPerimeterHashes.add(hit.idHash);
    if (hit.inInnerAperture) {
      activeStars.push(hit);
    } else {
      leadBufferStars.push(hit);
    }
  }

  activeStars.sort((a, b) => a.distancePc - b.distancePc || a.idHash - b.idHash);
  leadBufferStars.sort((a, b) => a.distancePc - b.distancePc || a.idHash - b.idHash);

  return {
    focusPointPc: sanitizedFocus,
    apertureRadiusPc: sanitizedAperture,
    leadBufferPc: sanitizedLeadBuffer,
    queryRadiusPc,
    activeStars,
    leadBufferStars,
    allPerimeterHashes,
  };
}

/**
 * Stateful instrument hydration bridge managing on-demand metadata hydration and transient eviction.
 */
export class InstrumentHydrationBridge {
  private readonly defaultLeadBufferPc: number;
  private readonly hydrateByHash: (idHash: number) => Promise<SystemSummaryNode | undefined>;

  private readonly hydratedMap = new Map<number, SystemSummaryNode>();
  private readonly inFlightMap = new Map<number, Promise<SystemSummaryNode | undefined>>();
  private readonly unresolvableHashes = new Set<number>();
  private currentPerimeterHashes: ReadonlySet<number> = new Set();
  private evictedMetadataCount = 0;
  private isDisposed = false;

  constructor(options?: InstrumentHydrationOptions) {
    this.defaultLeadBufferPc = options?.leadBufferPc ?? DEFAULT_INSTRUMENT_LEAD_BUFFER_PC;
    this.hydrateByHash = options?.hydrateByHash ?? ((idHash) => fetchSummaryNodeByHash(idHash));
  }

  /**
   * Updates instrument perimeter, evicting metadata outside perimeter and hydrating stars in aperture and lead buffer.
   */
  async updateInstrumentPerimeter(
    sectors: readonly SectorQueryInput[],
    focusPointPc: readonly [number, number, number],
    apertureRadiusPc: number,
    leadBufferPc = this.defaultLeadBufferPc,
  ): Promise<HydratedInstrumentState> {
    if (this.isDisposed) {
      return {
        hydratedByHash: new Map(),
        activeSummaries: [],
        leadBufferSummaries: [],
        evictedMetadataCount: this.evictedMetadataCount,
      };
    }

    const query = querySectorsWithinInstrumentSphere(
      sectors,
      focusPointPc,
      apertureRadiusPc,
      leadBufferPc,
    );

    this.currentPerimeterHashes = query.allPerimeterHashes;

    // Transient metadata eviction
    for (const idHash of Array.from(this.hydratedMap.keys())) {
      if (!query.allPerimeterHashes.has(idHash)) {
        this.hydratedMap.delete(idHash);
        this.evictedMetadataCount++;
      }
    }

    for (const idHash of Array.from(this.unresolvableHashes)) {
      if (!query.allPerimeterHashes.has(idHash)) {
        this.unresolvableHashes.delete(idHash);
      }
    }

    // On-demand hydration
    const hydrationPromises: Promise<SystemSummaryNode | undefined>[] = [];
    const starsToHydrate = [...query.activeStars, ...query.leadBufferStars];

    for (const hit of starsToHydrate) {
      const idHash = hit.idHash;
      if (this.hydratedMap.has(idHash) || this.unresolvableHashes.has(idHash)) {
        continue;
      }

      const existingPending = this.inFlightMap.get(idHash);
      if (existingPending) {
        hydrationPromises.push(existingPending);
        continue;
      }

      const pending = (async () => {
        try {
          const summary = await this.hydrateByHash(idHash);
          if (this.isDisposed) {
            return undefined;
          }
          if (summary) {
            // Guard: ensure star is still within current perimeter when hydration settles
            if (this.currentPerimeterHashes.has(idHash)) {
              this.hydratedMap.set(idHash, summary);
            }
            return summary;
          } else {
            if (this.currentPerimeterHashes.has(idHash)) {
              this.unresolvableHashes.add(idHash);
            }
            return undefined;
          }
        } catch {
          if (!this.isDisposed && this.currentPerimeterHashes.has(idHash)) {
            this.unresolvableHashes.add(idHash);
          }
          return undefined;
        } finally {
          this.inFlightMap.delete(idHash);
        }
      })();

      this.inFlightMap.set(idHash, pending);
      hydrationPromises.push(pending);
    }

    await Promise.allSettled(hydrationPromises);

    const activeSummaries: SystemSummaryNode[] = [];
    for (const hit of query.activeStars) {
      const summary = this.hydratedMap.get(hit.idHash);
      if (summary) {
        activeSummaries.push(summary);
      }
    }

    const leadBufferSummaries: SystemSummaryNode[] = [];
    for (const hit of query.leadBufferStars) {
      const summary = this.hydratedMap.get(hit.idHash);
      if (summary) {
        leadBufferSummaries.push(summary);
      }
    }

    return {
      hydratedByHash: new Map(this.hydratedMap),
      activeSummaries,
      leadBufferSummaries,
      evictedMetadataCount: this.evictedMetadataCount,
    };
  }

  getHydratedSummary(idHash: number): SystemSummaryNode | undefined {
    if (!Number.isFinite(idHash)) {
      return undefined;
    }
    return this.hydratedMap.get(idHash >>> 0);
  }

  getEvictedMetadataCount(): number {
    return this.evictedMetadataCount;
  }

  dispose(): void {
    this.isDisposed = true;
    this.hydratedMap.clear();
    this.inFlightMap.clear();
    this.unresolvableHashes.clear();
    this.currentPerimeterHashes = new Set();
  }
}
