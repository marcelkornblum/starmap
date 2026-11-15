import type { JourneyChordLeg } from '../../types/spatial';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { SystemSummaryNode } from '../../types/astro';
import { DEFAULT_ORIGIN_TARGETS } from '../../config/referenceTargets';

export const DEFAULT_INTERSTELLAR_ORIGIN_ID =
  DEFAULT_ORIGIN_TARGETS.interstellarOriginId;
export const DEFAULT_INTRA_SYSTEM_ORIGIN_ID =
  DEFAULT_ORIGIN_TARGETS.intraSystemOriginId;

export type JourneyDomain = 'interstellar' | 'intra-system';

export interface JourneyEndpoint {
  readonly id: string;
  readonly name: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly entityKind: 'system' | 'star' | 'planet' | 'minor-body' | 'structure';
  readonly coordinatesPc: readonly [number, number, number];
  readonly semiMajorAxisAu?: number;
  readonly periodDays?: number;
  readonly position3D: readonly [number, number, number];
}

export interface StructuredQuantity {
  readonly value: number | 'infinite' | 'instantaneous';
  readonly unit: string;
  readonly secondaryValue?: number | string;
  readonly secondaryUnit?: string;
}

export type JourneySecondaryGeometry =
  | { readonly kind: 'elevation'; readonly deltaZ: StructuredQuantity }
  | { readonly kind: 'orbital-range'; readonly min: StructuredQuantity; readonly max: StructuredQuantity };

export type JourneyOptionElevationOrRange =
  | { readonly kind: 'single-leg'; readonly geometry: JourneySecondaryGeometry }
  | { readonly kind: 'multi-leg'; readonly legCount: number; readonly domain: JourneyDomain };

export interface JourneyStep {
  readonly stepIndex: number;
  readonly id: string;
  readonly domain: JourneyDomain;
  readonly from: JourneyEndpoint;
  readonly to: JourneyEndpoint;
  readonly distancePc?: number;
  readonly distanceLy?: number;
  readonly deltaZPc?: number;
  readonly deltaZLy?: number;
  readonly distanceAuMean?: number;
  readonly distanceAuMin?: number;
  readonly distanceAuMax?: number;
  readonly oneWayLightTime: StructuredQuantity;
  readonly roundTripLightTime: StructuredQuantity;
  readonly primaryDistance: StructuredQuantity;
  readonly secondaryGeometry: JourneySecondaryGeometry;
}

export interface JourneyStepOptionMetrics {
  readonly stepIndex: number;
  readonly stepId: string;
  readonly fromName: string;
  readonly toName: string;
  readonly distance: StructuredQuantity;
  readonly shipTime: StructuredQuantity;
  readonly coordinateTime: StructuredQuantity;
  readonly oneWayComms: StructuredQuantity;
}

export interface JourneyOptionStats {
  readonly originLabel: string;
  readonly destinationLabel: string;
  readonly distancePrimary: StructuredQuantity;
  readonly elevationOrRange: JourneyOptionElevationOrRange;
  readonly shipTime: StructuredQuantity;
  readonly coordinateTime: StructuredQuantity;
  readonly oneWayComms: StructuredQuantity;
  readonly roundTripComms: StructuredQuantity;
  readonly peakVelocity: StructuredQuantity;
  readonly departureVelocity?: StructuredQuantity;
  readonly arrivalVelocity?: StructuredQuantity;
  readonly lorentzFactor?: StructuredQuantity;
  readonly turnaroundPoint?: StructuredQuantity;
  readonly deltaV?: StructuredQuantity;
  readonly synodicPeriod?: StructuredQuantity;
  readonly propulsionProfile: string;
}

export interface JourneyOption {
  readonly id: string;
  readonly domain: JourneyDomain;
  readonly title: string;
  readonly methodBadge: string;
  readonly topSummaryTime: StructuredQuantity;
  readonly shortDescription: string;
  readonly selectHref: string;
  readonly stats: JourneyOptionStats;
  readonly stepMetrics: readonly JourneyStepOptionMetrics[];
}

export interface JourneyPlan {
  readonly status: 'ready' | 'coming-soon';
  readonly statusReason?: string;
  readonly domain: JourneyDomain;
  readonly stops: readonly JourneyEndpoint[];
  readonly steps: readonly JourneyStep[];
  readonly chordLegs: readonly JourneyChordLeg[];
  readonly options: readonly JourneyOption[];
  readonly selectedOption: JourneyOption | null;
  readonly title: string;
  readonly totalDistance?: StructuredQuantity;
  readonly totalCommsOneWay?: StructuredQuantity;
  readonly totalCommsRoundTrip?: StructuredQuantity;
  readonly clearOptionHref: string;
  readonly closeHref: string;
  readonly focusedStopIds: readonly string[];
}

export interface BuildJourneyPlanInput {
  readonly routeStopIds?: readonly string[];
  readonly stops?: readonly string[];
  readonly selectedOptionId?: string | null;
  readonly viewScope?: 'galaxy' | 'system' | 'planet';
  readonly domainOverride?: JourneyDomain;
  readonly currentPathname?: string;
  readonly currentSearch?: string;
  readonly corpusEntries?: readonly CompactSearchEntry[];
  readonly corpus?: readonly CompactSearchEntry[];
  readonly systemDetail?: DecodedDetailRecord | null;
  readonly summaryNode?: SystemSummaryNode | null;
  readonly systemNodes?: readonly SystemSummaryNode[];
}
