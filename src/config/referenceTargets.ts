/**
 * Centralized Structural Reference Target Identifiers.
 *
 * Contains ONLY structural entity IDs, origin coordinates `[0, 0, 0]`,
 * route hrefs derived from those IDs, and the compact solar-body wire tag.
 * Physical telemetry and display names reside strictly in build-time data shards.
 */

export interface StructuralReferenceTarget {
  readonly id: string;
  readonly systemId: string;
  readonly href: string;
  readonly coordinatesPc: readonly [number, number, number];
}

export interface GuideBenchmarkTargetIds {
  readonly stellarBenchmarkId: string;
  readonly orbitalBenchmarkId: string;
}

export interface DefaultOriginTargetIds {
  readonly interstellarOriginId: string;
  readonly intraSystemOriginId: string;
  readonly galacticOriginCoordinates: readonly [number, number, number];
}

const SOL_ID = 'sol';
export const COMPACT_SOLAR_BODY_TAG = 'sol' as const;
const EARTH_ID = 'earth';
const TAU_CETI_ID = 'tau-ceti';
const TAU_CETI_E_ID = 'tau-ceti-e';

export const SOL_REFERENCE_TARGET: StructuralReferenceTarget = {
  id: SOL_ID,
  systemId: SOL_ID,
  href: `/system/${SOL_ID}`,
  coordinatesPc: [0, 0, 0],
} as const;

export const EARTH_REFERENCE_TARGET: StructuralReferenceTarget = {
  id: EARTH_ID,
  systemId: SOL_ID,
  href: `/planet/${EARTH_ID}`,
  coordinatesPc: [0, 0, 0],
} as const;

export const DEFAULT_GUIDE_BENCHMARKS: GuideBenchmarkTargetIds = {
  stellarBenchmarkId: TAU_CETI_ID,
  orbitalBenchmarkId: TAU_CETI_E_ID,
} as const;

export const DEFAULT_ORIGIN_TARGETS: DefaultOriginTargetIds = {
  interstellarOriginId: SOL_ID,
  intraSystemOriginId: EARTH_ID,
  galacticOriginCoordinates: [0, 0, 0],
} as const;
