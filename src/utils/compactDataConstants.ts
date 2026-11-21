import type {
  CircumstellarDiskKind,
  ObservationalConfidence,
  PlanetComposition,
  PlanetHazardBit,
  SystemHazardBit,
  SystemTag,
  SystemTagBit,
} from '../types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../types/astroStructures';

export type {
  PlanetHazardBit,
  SystemHazardBit,
  SystemTag,
  SystemTagBit,
};

export const COMPACT_SCHEMA_VERSION = 1;

export const SYSTEM_HAZARD_BITS: Record<
  'FLARE_STAR' | 'IONISING_RADIATION' | 'VARIABLE_FLUX',
  SystemHazardBit
> = {
  FLARE_STAR: 1,
  IONISING_RADIATION: 2,
  VARIABLE_FLUX: 4,
} as const;

export const PLANET_HAZARD_BITS: Record<
  'EXTREME_HEAT' | 'CRYOGENIC_COLD' | 'HIGH_GRAVITY' | 'TIDAL_LOCKING' | 'HIGH_ECCENTRICITY',
  PlanetHazardBit
> = {
  EXTREME_HEAT: 1,
  CRYOGENIC_COLD: 2,
  HIGH_GRAVITY: 4,
  TIDAL_LOCKING: 8,
  HIGH_ECCENTRICITY: 16,
} as const;

export const DEFAULT_STRUCTURE_DESCRIPTIONS: Record<number, string> = {
  1: 'Galactic open star cluster cataloged in Cantat-Gaudin Gaia survey.',
  2: 'Milky Way halo globular cluster from Harris (2010) catalog.',
  3: "Galactic supernova remnant from Green's SNR Catalogue.",
  4: 'Rotation-powered pulsar from ATNF Pulsar Database.',
  9: 'Dark absorption cloud cataloged by E. E. Barnard.',
  10: 'Deep sky landmark cataloged in OpenNGC.',
};

export const CONFIDENCE_TO_CODE: Record<ObservationalConfidence, 1 | 2 | 3 | 4> = {
  confirmed: 1,
  candidate: 2,
  theoretical: 3,
  unverified: 4,
};

export const CODE_TO_CONFIDENCE: Record<number, ObservationalConfidence> = {
  1: 'confirmed',
  2: 'candidate',
  3: 'theoretical',
  4: 'unverified',
};

export const THEORETICAL_STAR_FLAGS = {
  SPECT: 1,
  RADIAL_VELOCITY: 2,
} as const;

export const THEORETICAL_PLANET_FLAGS = {
  EQUILIBRIUM_TEMP: 1,
  MASS: 2,
  RADIUS: 4,
  ESI: 8,
} as const;

export const THEORETICAL_STRUCTURE_FLAGS = {
  DIST: 1,
} as const;

export const THEORETICAL_SOLAR_FLAGS = {
  RADIUS: 1,
} as const;

export const PLANET_CENSUS_BITS: Record<PlanetComposition, number> = {
  terrestrial: 1,
  'ice-giant': 2,
  'gas-giant': 4,
  'super-earth': 8,
};

export const SYSTEM_TAG_BITS: Record<SystemTag, SystemTagBit> = {
  HomeSystem: 1,
  SolarNeighborhood10pc: 2,
  NakedEye: 4,
  ExoplanetHost: 8,
  HabitableCandidate: 16,
  VariableStar: 32,
  RECONSGroundTruth: 64,
};

export const BIT_TO_SYSTEM_TAG: [SystemTagBit, SystemTag][] = Object.entries(SYSTEM_TAG_BITS).map(
  ([tag, bit]) => [bit, tag as SystemTag],
);

export const DISCOVERY_METHOD_TO_CODE: Record<string, number> = {
  'Radial Velocity': 1,
  RV: 1,
  Transit: 2,
  Imaging: 3,
  Astrometry: 4,
  Microlensing: 5,
  Timing: 6,
};

export const CODE_TO_DISCOVERY_METHOD: Record<number, string> = {
  1: 'Radial Velocity',
  2: 'Transit',
  3: 'Imaging',
  4: 'Astrometry',
  5: 'Microlensing',
  6: 'Timing',
};

export const PLANET_COMP_TO_CODE: Record<PlanetComposition, 1 | 2 | 3 | 4> = {
  terrestrial: 1,
  'ice-giant': 2,
  'gas-giant': 3,
  'super-earth': 4,
};

export const CODE_TO_PLANET_COMP: Record<number, PlanetComposition> = {
  1: 'terrestrial',
  2: 'ice-giant',
  3: 'gas-giant',
  4: 'super-earth',
};

export const DISK_KIND_TO_CODE: Record<CircumstellarDiskKind, 1 | 2 | 3> = {
  'asteroid-belt': 1,
  'kuiper-belt': 2,
  'debris-disk': 3,
};

export const CODE_TO_DISK_KIND: Record<number, CircumstellarDiskKind> = {
  1: 'asteroid-belt',
  2: 'kuiper-belt',
  3: 'debris-disk',
};

export const STRUCTURE_TYPE_TO_CODE: Record<GalacticStructureRecord['type'], number> = {
  OpenCluster: 1,
  GlobularCluster: 2,
  SupernovaRemnant: 3,
  Pulsar: 4,
  PlanetaryNebula: 5,
  InterstellarMedium: 6,
  MovingGroup: 7,
  EmissionNebula: 8,
  DarkNebula: 9,
  DeepSkyLandmark: 10,
};

export const CODE_TO_STRUCTURE_TYPE: Record<number, GalacticStructureRecord['type']> = {
  1: 'OpenCluster',
  2: 'GlobularCluster',
  3: 'SupernovaRemnant',
  4: 'Pulsar',
  5: 'PlanetaryNebula',
  6: 'InterstellarMedium',
  7: 'MovingGroup',
  8: 'EmissionNebula',
  9: 'DarkNebula',
  10: 'DeepSkyLandmark',
};

export const SOLAR_CLASS_TO_CODE: Record<SolarSystemBodyRecord['classification'], number> = {
  Star: 1,
  Planet: 2,
  DwarfPlanet: 3,
  Moon: 4,
  AsteroidNEO: 5,
  AsteroidMainBelt: 6,
  AsteroidDistant: 7,
  Comet: 8,
};

export const CODE_TO_SOLAR_CLASS: Record<number, SolarSystemBodyRecord['classification']> = {
  1: 'Star',
  2: 'Planet',
  3: 'DwarfPlanet',
  4: 'Moon',
  5: 'AsteroidNEO',
  6: 'AsteroidMainBelt',
  7: 'AsteroidDistant',
  8: 'Comet',
};

export const ALL_36_BUCKETS = Array.from({ length: 36 }, (_, idx) => idx.toString(36));

export function resolveDefaultStructureDescription(
  type: GalacticStructureRecord['type'],
): string {
  const code = STRUCTURE_TYPE_TO_CODE[type];
  return (
    (code !== undefined ? DEFAULT_STRUCTURE_DESCRIPTIONS[code] : undefined) ??
    'Galactic deep-sky structure.'
  );
}
