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
import {
  fetchSummaryNodeByHash,
  getCachedSummaryNodeByHashInSector,
  isSummarySectorCached,
  preloadSummarySectors,
} from '../data/detailsRepository';
import {
  computeBoxMinDistSq,
  scanSectorWithinSphere,
  partitionAndSortHits,
  evictStaleMetadata,
  resolveHitsSummaries,
  collectUnhydratedSectorIds,
  executeStarHydration,
} from './instrumentHydrationHelpers';

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
  readonly activeSummaries: readonly SystemSummaryNode[];
  readonly leadBufferSummaries: readonly SystemSummaryNode[];
  readonly evictedMetadataCount: number;
  readonly hasActiveSummariesChanged: boolean;
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
  const sanitizedAperture = Number.isFinite(apertureRadiusPc) ? Math.max(0, apertureRadiusPc) : 0;
  const sanitizedLeadBuffer = Number.isFinite(leadBufferPc) ? Math.max(0, leadBufferPc) : 0;
  const queryRadiusPc = sanitizedAperture + sanitizedLeadBuffer;
  const queryRadiusSq = queryRadiusPc * queryRadiusPc;
  const innerRadiusSq = sanitizedAperture * sanitizedAperture;

  const seenHashes = new Map<number, SpatialStarHit>();

  for (const sector of sectors) {
    const header = sector.decoded.header;
    const boxDistSq = computeBoxMinDistSq(
      fx, fy, fz,
      header.origin[0], header.origin[1], header.origin[2],
      header.sectorSize,
    );
    if (boxDistSq > queryRadiusSq) continue;

    scanSectorWithinSphere(sector, fx, fy, fz, queryRadiusSq, innerRadiusSq, seenHashes);
  }

  const { activeStars, leadBufferStars, allPerimeterHashes } = partitionAndSortHits(seenHashes);

  return {
    focusPointPc: [fx, fy, fz],
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
  private readonly hasCustomHydrateByHash: boolean;
  private readonly hydrateByHash: (
    idHash: number,
    sectorId?: string,
  ) => Promise<SystemSummaryNode | undefined>;

  private readonly hydratedMap = new Map<number, SystemSummaryNode>();
  private readonly inFlightMap = new Map<number, Promise<SystemSummaryNode | undefined>>();
  private readonly unresolvableHashes = new Set<number>();
  private currentPerimeterHashes: ReadonlySet<number> = new Set();
  private prevActiveSummaries: readonly SystemSummaryNode[] | null = null;
  private evictedMetadataCount = 0;
  private isDisposed = false;

  constructor(options?: InstrumentHydrationOptions) {
    this.defaultLeadBufferPc = options?.leadBufferPc ?? DEFAULT_INSTRUMENT_LEAD_BUFFER_PC;
    this.hasCustomHydrateByHash = Boolean(options?.hydrateByHash);
    this.hydrateByHash =
      options?.hydrateByHash ??
      ((idHash, sectorId) => fetchSummaryNodeByHash(idHash, fetch, undefined, sectorId));
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
        activeSummaries: [],
        leadBufferSummaries: [],
        evictedMetadataCount: this.evictedMetadataCount,
        hasActiveSummariesChanged: false,
      };
    }

    const query = querySectorsWithinInstrumentSphere(
      sectors,
      focusPointPc,
      apertureRadiusPc,
      leadBufferPc,
    );

    this.currentPerimeterHashes = query.allPerimeterHashes;

    this.evictedMetadataCount += evictStaleMetadata(
      this.hydratedMap,
      this.unresolvableHashes,
      query.allPerimeterHashes,
    );

    const hydrationPromises: Promise<SystemSummaryNode | undefined>[] = [];
    const starsToHydrate = [...query.activeStars, ...query.leadBufferStars];

    if (!this.hasCustomHydrateByHash) {
      const uniqueSectorIds = collectUnhydratedSectorIds(
        starsToHydrate,
        this.hydratedMap,
        this.unresolvableHashes,
      );
      if (uniqueSectorIds.length > 0) {
        await preloadSummarySectors(uniqueSectorIds);
        if (this.isDisposed) {
          return {
            activeSummaries: [],
            leadBufferSummaries: [],
            evictedMetadataCount: this.evictedMetadataCount,
            hasActiveSummariesChanged: false,
          };
        }
      }
    }

    for (const hit of starsToHydrate) {
      const idHash = hit.idHash;
      if (this.hydratedMap.has(idHash) || this.unresolvableHashes.has(idHash)) continue;

      if (!this.hasCustomHydrateByHash && hit.sectorId) {
        const cachedNode = getCachedSummaryNodeByHashInSector(hit.sectorId, idHash);
        if (cachedNode) {
          if (this.currentPerimeterHashes.has(idHash)) {
            this.hydratedMap.set(idHash, cachedNode);
          }
          continue;
        }
        if (isSummarySectorCached(hit.sectorId)) {
          if (this.currentPerimeterHashes.has(idHash)) {
            this.unresolvableHashes.add(idHash);
          }
          continue;
        }
      }

      const existingPending = this.inFlightMap.get(idHash);
      if (existingPending) {
        hydrationPromises.push(existingPending);
        continue;
      }

      const pending = executeStarHydration(
        idHash,
        (hash) => this.hydrateByHash(hash, hit.sectorId),
        () => this.isDisposed,
        (hash) => this.currentPerimeterHashes.has(hash),
        this.hydratedMap,
        this.unresolvableHashes,
      ).finally(() => {
        this.inFlightMap.delete(idHash);
      });

      this.inFlightMap.set(idHash, pending);
      hydrationPromises.push(pending);
    }

    await Promise.allSettled(hydrationPromises);

    const nextActiveSummaries = resolveHitsSummaries(query.activeStars, this.hydratedMap);
    const prevActive = this.prevActiveSummaries;
    const hasActiveSummariesChanged =
      prevActive === null ||
      prevActive.length !== nextActiveSummaries.length ||
      nextActiveSummaries.some((s, idx) => s.id !== prevActive[idx]?.id);

    const activeSummaries = hasActiveSummariesChanged
      ? (this.prevActiveSummaries = nextActiveSummaries)
      : prevActive;

    const leadBufferSummaries = resolveHitsSummaries(query.leadBufferStars, this.hydratedMap);

    return {
      activeSummaries,
      leadBufferSummaries,
      evictedMetadataCount: this.evictedMetadataCount,
      hasActiveSummariesChanged,
    };
  }

  getHydratedSummary(idHash: number): SystemSummaryNode | undefined {
    if (!Number.isFinite(idHash)) return undefined;
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
    this.prevActiveSummaries = null;
  }
}
