import type { ObservationalConfidence, CircumstellarDiskKind } from '../../types/astro';
import type { PlanetCompositionClass } from '../../content/guide';
import type { EntityHazardItem } from './detailsEntityTypes';

export interface FocusedStarTelemetry {
  readonly componentDesignation: string;
  readonly spectralType: string;
  readonly mag: number;
  readonly absmag: number;
  readonly massMsun?: number;
  readonly radiusRsun?: number;
  readonly luminosityLsun?: number;
  readonly effectiveTempK?: number;
}

export interface FocusedPlanetTelemetry {
  readonly composition: PlanetCompositionClass;
  readonly isHabitableCandidate: boolean;
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
  readonly isTidallyLocked: boolean;
  readonly discoveryYear?: number;
  readonly discoveryMethod?: string;
  readonly hazardCount: number;
  readonly hazards: readonly EntityHazardItem[];
}

export type MinorBodyClassification =
  | 'dwarf-planet'
  | 'moon'
  | 'asteroid'
  | 'comet'
  | 'construct';

export interface FocusedMinorBodyTelemetry {
  readonly classification: MinorBodyClassification;
  readonly categoryLabel: string;
  readonly parentBodyName?: string;
}

export type StructureSymbolType =
  | 'stellar-cluster'
  | 'nebula'
  | 'ism'
  | 'supernova-remnant'
  | 'neutron-star';

export interface FocusedStructureTelemetry {
  readonly structureType: string;
  readonly symbolType: StructureSymbolType;
  readonly radiusPc?: number;
  readonly dimensionsPc?: readonly [number, number, number];
}

export interface FocusedDiskTelemetry {
  readonly classification: CircumstellarDiskKind;
  readonly classificationLabel: string;
  readonly innerRadiusAu: number;
  readonly outerRadiusAu: number;
  readonly semiMajorAxisAu: number;
  readonly tempK?: number;
  readonly composition: string;
  readonly confidence?: ObservationalConfidence;
}
