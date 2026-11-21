import type { CelestialClassification, SpatialEntityDefinition } from '../../types/spatial';
import type { SystemManifest, SystemSummaryNode } from '../../types/astro';
import type { DecodedDetailRecord } from '../../data/detailsRepository';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../../types/astroStructures';
import type { CompactSearchEntry } from '../../utils/compactDataTypes';
import type {
  FocusedDiskDetail,
  FocusedEntityKind,
  FocusedPlanetDetail,
  FocusedStarDetail,
  PlanetCompositionClass,
} from './detailsEntityTypes';
import type { SystemElementBodyItem } from './detailsHierarchyTypes';

export interface ResolveFocusedTargetOptions {
  readonly focusedEntity?: SpatialEntityDefinition | null;
  readonly corpus?: readonly CompactSearchEntry[];
  readonly summaryNode?: SystemSummaryNode;
  readonly systemDetail?: DecodedDetailRecord;
  readonly entityDetail?: DecodedDetailRecord;
  readonly urlSystemSlug?: string | null;
  readonly urlPlanetSlug?: string | null;
  readonly urlFocusSlug?: string | null;
  readonly hasExplicitFocus?: boolean;
  readonly viewScope?: 'galaxy' | 'system' | 'planet';
}

export interface ResolvedFocusedTarget {
  readonly matchedCorpusEntry?: CompactSearchEntry;
  readonly matchedSystemEntry?: CompactSearchEntry;
  readonly sysManifest?: SystemManifest;
  readonly structureRecord?: GalacticStructureRecord;
  readonly solarBodyRecord?: SolarSystemBodyRecord;
  readonly systemId: string;
  readonly systemName: string;
  readonly stars: readonly FocusedStarDetail[];
  readonly planets: readonly FocusedPlanetDetail[];
  readonly disks: readonly FocusedDiskDetail[];
  readonly matchedPlanetDetail?: FocusedPlanetDetail;
  readonly matchedStarDetail?: FocusedStarDetail;
  readonly matchedDiskDetail?: FocusedDiskDetail;
  readonly focusedKind: FocusedEntityKind;
  readonly resolvedName: string;
  readonly spectralType?: string;
  readonly planetComposition: PlanetCompositionClass;
  readonly planetIsHabitable: boolean;
  readonly orbitingBodies: readonly SystemElementBodyItem[];
  readonly minorBodyCategoryLabel?: string;
  readonly minorBodyParentName?: string;
  readonly reticleType: CelestialClassification;
}
