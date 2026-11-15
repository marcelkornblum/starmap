import type { CelestialClassification } from '../../types/spatial';
import type { CircumstellarDiskRecord } from '../../types/astro';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type { DecodedEntityAnnotation } from '../../utils/datasetLayerTypes';
import type { FocusedCanonAnnotation } from './detailsCanonTypes';
import type {
  FocusedDiskDetail,
  FocusedEntityDetails,
  FocusedPlanetDetail,
  FocusedStarDetail,
} from './detailsEntityTypes';

export type SystemElementCategoryKey =
  | 'dwarf-planet'
  | 'moon'
  | 'asteroid'
  | 'comet'
  | 'spacecraft';

export interface SystemElementBodyItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly categoryKey?: SystemElementCategoryKey;
  readonly categoryLabel: string;
}

export interface SystemBodiesSummary {
  readonly scope: 'system';
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly disks?: readonly (FocusedDiskDetail | CircumstellarDiskRecord)[];
  readonly moonsAndDwarfPlanets: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface PlanetaryBodiesSummary {
  readonly scope: 'planet';
  readonly planetId: string;
  readonly planetName: string;
  readonly planetHref: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly systemHref: string;
  readonly focusedEntityId?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly planetDetail?: FocusedPlanetDetail;
  readonly moons: readonly SystemElementBodyItem[];
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly canonAnnotations: readonly FocusedCanonAnnotation[];
}

export interface GalaxyBodySystemItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly tier: 'focused' | 'selected' | 'active';
  readonly reticleType: CelestialClassification;
  readonly spectralType?: string;
  readonly starTypeGuideHref?: string;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly habitableZoneGuideHref?: string;
  readonly hazardCount: number;
  readonly hazardSummaryLabel: string;
  readonly hasCriticalHazard: boolean;
  readonly distanceFromFocusPc?: number;
  readonly distanceFromFocusLy?: number;
  readonly distanceGuideHref?: string;
}

export interface GalaxyBodiesSummary {
  readonly scope: 'galaxy';
  readonly centerId: string;
  readonly centerName: string;
  readonly centerCoordinatesPc: readonly [number, number, number];
  readonly apertureRadiusPc: number;
  readonly apertureRadiusLy: number;
  readonly focusedSystemId?: string;
  readonly focusedSystemName?: string;
  readonly selectedEntityIds?: readonly string[];
  readonly hoveredEntityId?: string | null;
  readonly systems: readonly GalaxyBodySystemItem[];
}

export type BodiesPanelSummary =
  | GalaxyBodiesSummary
  | SystemBodiesSummary
  | PlanetaryBodiesSummary;

export interface BuildSystemBodiesSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly canonRecords?: readonly DecodedEntityAnnotation[];
  readonly selectedEntityIds?: readonly string[];
  readonly focusedEntityId?: string;
}

export interface BuildPlanetaryBodiesSummaryInput {
  readonly details: FocusedEntityDetails | null;
  readonly urlPlanetSlug?: string | null;
  readonly planetEntityDetail?: DecodedDetailRecord;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly canonRecords?: readonly DecodedEntityAnnotation[];
  readonly selectedEntityIds?: readonly string[];
  readonly focusedEntityId?: string;
}

export type OrbitalSchematicRegion =
  | 'habitable-zone'
  | 'asteroid-belt'
  | 'kuiper-belt';

export type OrbitalSchematicEntityKind =
  | 'star'
  | 'planet'
  | 'belt'
  | 'dwarf-planet'
  | 'moon'
  | 'minor-body'
  | 'spacecraft';

export interface OrbitalSchematicItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly kind: OrbitalSchematicEntityKind;
  readonly orbitRank: number;
  readonly summaryLabel: string;
  readonly inHabitableZone: boolean;
  readonly region?: OrbitalSchematicRegion;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
  readonly children?: readonly OrbitalSchematicItem[];
  readonly radialSpanAu?: readonly [number, number];
  readonly composition?: string;
}

export interface OrbitalSchematicSummary {
  readonly scope: 'system' | 'planet';
  readonly systemId: string;
  readonly systemName: string;
  readonly planetId?: string;
  readonly planetName?: string;
  readonly habitableZoneAu?: readonly [number, number];
  readonly items: readonly OrbitalSchematicItem[];
}

export type SystemOrbitalSchematicInput =
  | (Partial<SystemBodiesSummary> &
      Pick<SystemBodiesSummary, 'systemId' | 'systemName' | 'stars' | 'planets'> & {
        readonly corpus?: readonly CompactSearchEntry[];
      })
  | (SystemBodiesSummary & {
      readonly corpus?: readonly CompactSearchEntry[];
    });
