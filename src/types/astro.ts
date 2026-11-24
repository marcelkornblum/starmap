export const PLANET_COMPOSITIONS = [
  'terrestrial',
  'super-earth',
  'ice-giant',
  'gas-giant',
] as const;

export type PlanetComposition = (typeof PLANET_COMPOSITIONS)[number];

export type PlanetCompositionCounts = readonly [
  terrestrial: number,
  superEarth: number,
  iceGiant: number,
  gasGiant: number,
];

export type StellarClassification =
  | 'star'
  | 'white-dwarf'
  | 'brown-dwarf'
  | 'neutron-star'
  | 'black-hole';

export type SystemTag =
  | 'HomeSystem'
  | 'SolarNeighborhood10pc'
  | 'NakedEye'
  | 'ExoplanetHost'
  | 'HabitableCandidate'
  | 'VariableStar'
  | 'RECONSGroundTruth';

export type SystemTagBit = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export type SystemHazardBit = 1 | 2 | 4;

export type PlanetHazardBit = 1 | 2 | 4 | 8 | 16;

export type CelestialSymbolType =
  // Group A: 3D Reticle & Planetary Taxonomy
  | 'star'
  | 'stellar-system'
  | 'multiple-system'
  | 'brown-dwarf'
  | 'white-dwarf'
  | 'neutron-star'
  | 'pulsar'
  | 'hazard'
  | 'black-hole'
  | 'barycentre'
  | 'stellar-cluster'
  | 'construct'
  | 'spacecraft'
  | 'terrestrial'
  | 'super-earth'
  | 'gas-giant'
  | 'ice-giant'
  // Group B: Sub-Planetary, Disk, Structure, & Environmental Taxonomy
  | 'dwarf-planet'
  | 'moon'
  | 'asteroid'
  | 'comet'
  | 'belt'
  | 'asteroid-belt'
  | 'kuiper-belt'
  | 'kuiper-belt-object'
  | 'oort-cloud'
  | 'debris-disk'
  | 'nebula'
  | 'ism'
  | 'supernova-remnant'
  | 'habitable-zone';

/** Core representation of an astronomical node for 2D atlas and 3D WebGL. */
export interface StarmapNode {
  /** Unique catalog identifier (typically HYG database id) */
  id: number;
  /** Primary display name (proper name if available, else catalog identifier) */
  name: string;
  properName?: string;
  hip?: number | null;
  hd?: number | null;
  hr?: number | null;
  gl?: string | null;
  bayer?: string | null;
  flam?: number | null;
  con?: string | null;
  /** Right Ascension in decimal hours [0, 24) */
  ra: number;
  /** Declination in decimal degrees [-90, +90] */
  dec: number;
  /** Distance from Sol in parsecs */
  dist: number;
  /** Apparent visual magnitude */
  mag: number;
  /** Absolute visual magnitude */
  absmag: number;
  spect?: string;
  ci?: number | null;
  x: number;
  y: number;
  z: number;
  lum?: number;
  /** 3D space velocity vector relative to Sol in km/s (Equatorial J2000 frame) */
  velocity?: KinematicVector;
}

/** 3D velocity vector and relative motion parameters in Equatorial J2000 frame. */
export interface KinematicVector {
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  pmra?: number;
  pmdec?: number;
  radialVelocity?: number;
}

/** Canonical observational confidence tier matching `<ConfidencePip>`. */
export type ObservationalConfidence = 'confirmed' | 'candidate' | 'theoretical' | 'unverified';

/** Top-level collapsed stellar system node designed for macro neighborhood maps. */
export interface SystemSummaryNode {
  id: string;
  name: string;
  properName?: string;
  x: number;
  y: number;
  z: number;
  dist: number;
  velocity?: KinematicVector;
  mag: number;
  absmag: number;
  spect?: string;
  ci?: number | null;
  starCount: number;
  planetCount: number;
  planetCensus?: PlanetComposition[];
  planetCompositionCounts?: PlanetCompositionCounts;
  hasHabitableCandidate: boolean;
  sectorId: string;
  tags?: SystemTag[];
  confidence?: ObservationalConfidence;
  theoreticalFlags?: number;
  hazardMask?: number;
  classification?: StellarClassification;
  reticleType?: CelestialSymbolType;
  planeInclinationDeg?: number;
}

/** Orbital elements defining a Keplerian orbit in 3D space. */
export interface KeplerianOrbit {
  /** Semi-major axis in AU */
  semiMajorAxis: number;
  /** Orbital eccentricity [0 = circular, 0 < e < 1 = elliptical] */
  eccentricity: number;
  /** Orbital inclination relative to reference plane in degrees */
  inclination: number;
  /** Longitude of ascending node in degrees */
  ascendingNode: number;
  /** Argument of periapsis in degrees */
  argumentOfPeriapsis: number;
  /** Mean anomaly at reference epoch in degrees */
  meanAnomaly: number;
  /** Orbital period in Earth days */
  periodDays: number;
  epoch?: number | string;
}

/** Natural satellite (moon) record belonging to a host planet or dwarf planet (AUD-051). */
export interface SatelliteRecord {
  id: string;
  name: string;
  parentId: string;
  radiusKm?: number;
  radiusEarth?: number;
  massEarth?: number;
  composition?: PlanetComposition;
  reticleType?: CelestialSymbolType;
  orbit: KeplerianOrbit;
  description?: string;
}

/** Extrasolar planet record in a detailed system manifest. */
export interface ExoplanetRecord {
  id: string;
  name: string;
  letter: string;
  discoveryYear?: number;
  discoveryMethod?: string;
  massMjup?: number;
  massMearth?: number;
  radiusRjup?: number;
  radiusRearth?: number;
  equilibriumTempK?: number;
  esi?: number;
  surfaceGravityG?: number;
  isTidallyLocked?: boolean;
  hazardMask?: number;
  composition?: PlanetComposition;
  isHabitableCandidate?: boolean;
  axialTiltDeg?: number;
  orbit?: KeplerianOrbit;
  satellites?: SatelliteRecord[];
  reticleType?: CelestialSymbolType;
  confidence?: ObservationalConfidence;
  theoreticalFlags?: number;
}

/** Individual stellar component in a single or multi-star system. */
export interface StellarComponent {
  id: string;
  name: string;
  componentDesignation: string;
  spectralType: string;
  mag: number;
  absmag: number;
  luminosityLsun?: number;
  massMsun?: number;
  radiusRsun?: number;
  effectiveTempK?: number;
  reticleType?: CelestialSymbolType;
}

/** Detailed manifest for a single stellar system (drill-down view). */
export interface SystemManifest {
  id: string;
  name: string;
  properName?: string;
  x: number;
  y: number;
  z: number;
  dist: number;
  velocity?: KinematicVector;
  sectorId: string;
  stars: StellarComponent[];
  planets: ExoplanetRecord[];
  planetCompositionCounts?: PlanetCompositionCounts;
  hasHabitableCandidate?: boolean;
  tags?: SystemTag[];
  overviewText?: string;
  hazardMask?: number;
  disks?: CircumstellarDiskRecord[];
  planeInclinationDeg?: number;
}

/** Kind of circumstellar disk or belt (DEC-035). */
export type CircumstellarDiskKind = 'asteroid-belt' | 'kuiper-belt' | 'debris-disk';

/** Circumstellar disk or belt record in a detailed system manifest (DEC-035). */
export interface CircumstellarDiskRecord {
  id: string;
  name: string;
  kind: CircumstellarDiskKind;
  innerRadiusAu: number;
  outerRadiusAu: number;
  semiMajorAxisAu: number;
  tempK?: number;
  composition: string;
  confidence?: ObservationalConfidence;
  reticleType?: CelestialSymbolType;
}
