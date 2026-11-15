import type { CelestialClassification } from '../../types/spatial';
import type { SystemManifest } from '../../types/astro';
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
