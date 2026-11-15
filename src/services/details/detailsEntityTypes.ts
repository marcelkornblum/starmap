import type { CelestialClassification, SpatialEntityDefinition } from '../../types/spatial';
import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { PlanetCompositionClass } from '../../content/guide';
import type {
  CircumstellarDiskKind,
  ObservationalConfidence,
  SystemSummaryNode,
} from '../../types/astro';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { DecodedEntityAnnotation } from '../../utils/datasetLayerTypes';
import type { SystemElementBodyItem } from './detailsHierarchyTypes';
import type {
  FocusedCanonAnnotation,
  CanonAnnotationOrderOptions,
} from './detailsCanonTypes';
import type {
  FocusedDiskTelemetry,
  FocusedMinorBodyTelemetry,
  FocusedPlanetTelemetry,
  FocusedStarTelemetry,
  FocusedStructureTelemetry,
} from './detailsTelemetryTypes';

export type { PlanetCompositionClass };

export type HazardSeverity = 'warning' | 'critical';

export interface EntityHazardItem {
  readonly code: string;
  readonly label: string;
  readonly severity: HazardSeverity;
  readonly description: string;
}

export type FocusedEntityKind =
  | 'system'
  | 'star'
  | 'planet'
  | 'belt'
  | 'minor-body'
  | 'structure';

export interface FocusedDiskDetail {
  readonly id: string;
  readonly name: string;
  readonly kind: CircumstellarDiskKind;
  readonly kindLabel: string;
  readonly href: string;
  readonly innerRadiusAu: number;
  readonly outerRadiusAu: number;
  readonly semiMajorAxisAu: number;
  readonly tempK?: number;
  readonly composition: string;
  readonly confidence?: ObservationalConfidence;
  readonly guideHref: string;
}

export interface PlanetCompositionCount {
  readonly composition: PlanetCompositionClass;
  readonly count?: number;
}

export type SystemSummarySegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'spectral-badge'; readonly spectralType: string }
  | { readonly kind: 'planet-type-badge'; readonly composition: PlanetCompositionClass }
  | { readonly kind: 'habitable-badge'; readonly label: string };

export interface FocusedStarDetail {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
  readonly componentDesignation: string;
  readonly spectralType: string;
  readonly mag: number;
  readonly absmag: number;
  readonly massMsun?: number;
  readonly radiusRsun?: number;
  readonly luminosityLsun?: number;
  readonly effectiveTempK?: number;
}

export interface FocusedPlanetDetail {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
  readonly letter?: string;
  readonly composition: PlanetCompositionClass;
  readonly semiMajorAxisAu?: number;
  readonly isTheoreticalOrbit?: boolean;
  readonly periodDays?: number;
  readonly eccentricity?: number;
  readonly inclinationDeg?: number;
  readonly massMearth?: number;
  readonly radiusRearth?: number;
  readonly equilibriumTempK?: number;
  readonly esi?: number;
  readonly surfaceGravityG?: number;
  readonly isTidallyLocked?: boolean;
  readonly discoveryYear?: number;
  readonly discoveryMethod?: string;
  readonly isHabitableCandidate: boolean;
  readonly hazardCount?: number;
  readonly hazards?: readonly EntityHazardItem[];
}

export interface FocusedEntityDetailsBase {
  readonly id: string;
  readonly systemId: string;
  readonly name: string;
  readonly systemName: string;
  readonly spectralType?: string;
  readonly reticleType: CelestialClassification;
  readonly starCount: number;
  readonly planetCount: number;
  readonly planetCompositionBreakdown: readonly PlanetCompositionCount[];
  readonly planetCompositionSummary: string;
  readonly hasHabitableCandidate: boolean;
  readonly hazardCount: number;
  readonly hazards: readonly EntityHazardItem[];
  readonly hazardSummaryLabel: string;
  readonly systemSummary: string;
  readonly systemSummarySegments: readonly SystemSummarySegment[];
  readonly coordinatesPc: readonly [number, number, number];
  readonly sectorId: string;
  readonly sectorName?: string;
  readonly tags: readonly string[];
  readonly systemDetailsHref?: string;
  readonly directionsHref: string;
  readonly centerHref?: string;
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly disks?: readonly FocusedDiskDetail[];
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface FocusedSystemEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'system';
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedStarEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'star';
  readonly starTelemetry: FocusedStarTelemetry;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedPlanetEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'planet';
  readonly planetTelemetry: FocusedPlanetTelemetry;
  readonly orbitingBodies: readonly SystemElementBodyItem[];
  readonly starTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedBeltEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'belt';
  readonly diskTelemetry: FocusedDiskTelemetry;
  readonly orbitingBodies: readonly SystemElementBodyItem[];
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedMinorBodyEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'minor-body';
  readonly minorBodyTelemetry: FocusedMinorBodyTelemetry;
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly structureTelemetry?: undefined;
}

export interface FocusedStructureEntityDetails extends FocusedEntityDetailsBase {
  readonly focusedKind: 'structure';
  readonly structureTelemetry: FocusedStructureTelemetry;
  readonly starTelemetry?: undefined;
  readonly planetTelemetry?: undefined;
  readonly diskTelemetry?: undefined;
  readonly minorBodyTelemetry?: undefined;
}

export type FocusedEntityDetails =
  | FocusedSystemEntityDetails
  | FocusedStarEntityDetails
  | FocusedPlanetEntityDetails
  | FocusedBeltEntityDetails
  | FocusedMinorBodyEntityDetails
  | FocusedStructureEntityDetails;

export interface BuildFocusedEntityDetailsInput {
  readonly focusedEntity: SpatialEntityDefinition | null | undefined;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly summaryNode?: SystemSummaryNode;
  readonly systemDetail?: DecodedDetailRecord;
  readonly entityDetail?: DecodedDetailRecord;
  readonly canonRecords?: readonly DecodedEntityAnnotation[];
  readonly canonOrderOptions?: CanonAnnotationOrderOptions;
  readonly urlSystemSlug?: string | null;
  readonly urlPlanetSlug?: string | null;
  readonly urlFocusSlug?: string | null;
  readonly hasExplicitFocus?: boolean;
  readonly viewScope?: 'galaxy' | 'system' | 'planet';
  readonly currentPathname?: string;
  readonly currentSearch?: string;
}
