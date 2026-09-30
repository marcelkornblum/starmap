/**
 * Core representation of an astronomical node (star, stellar remnant, or celestial object)
 * designed for consumption by 2D atlas views and 3D WebGL visualizations.
 */
export interface StarmapNode {
  /** Unique catalog identifier (typically HYG database id) */
  id: number;
  /** Primary display name (proper name if available, else catalog identifier) */
  name: string;
  /** Proper common name (e.g., 'Sirius', 'Sol', 'Vega'), if known */
  properName?: string;
  /** Hipparcos catalog number */
  hip?: number | null;
  /** Henry Draper catalog number */
  hd?: number | null;
  /** Harvard Revised / Bright Star catalog number */
  hr?: number | null;
  /** Gliese catalog identifier */
  gl?: string | null;
  /** Bayer designation (e.g., 'Alp', 'Bet') */
  bayer?: string | null;
  /** Flamsteed number */
  flam?: number | null;
  /** Standard 3-letter IAU constellation abbreviation (e.g., 'Ori', 'CMa') */
  con?: string | null;
  /** Right Ascension in decimal hours [0, 24) */
  ra: number;
  /** Declination in decimal degrees [-90, +90] */
  dec: number;
  /** Distance from Sol in parsecs */
  dist: number;
  /** Apparent visual magnitude (lower/negative = brighter) */
  mag: number;
  /** Absolute visual magnitude (intrinsic brightness at 10 parsecs) */
  absmag: number;
  /** Morgan-Keenan spectral classification (e.g., 'G2V', 'A1V', 'M5.5Ve') */
  spect?: string;
  /** Color index (B-V photometric index) */
  ci?: number | null;
  /** Cartesian X coordinate in parsecs (Equatorial frame, epoch J2000) */
  x: number;
  /** Cartesian Y coordinate in parsecs (Equatorial frame, epoch J2000) */
  y: number;
  /** Cartesian Z coordinate in parsecs (Equatorial frame, epoch J2000) */
  z: number;
  /** Luminosity relative to the Sun (L☉) */
  lum?: number;
  /** 3D space velocity vector relative to Sol in km/s (Equatorial J2000 frame) */
  velocity?: KinematicVector;
}

/**
 * 3D velocity vector and relative motion parameters in Equatorial J2000 frame.
 */
export interface KinematicVector {
  /** Cartesian velocity X in km/s */
  vx: number;
  /** Cartesian velocity Y in km/s */
  vy: number;
  /** Cartesian velocity Z in km/s */
  vz: number;
  /** Total scalar speed relative to Sol in km/s */
  speed: number;
  /** Proper motion in Right Ascension (mas/yr) */
  pmra?: number;
  /** Proper motion in Declination (mas/yr) */
  pmdec?: number;
  /** Line-of-sight radial velocity in km/s (negative = approaching, positive = receding) */
  radialVelocity?: number;
}

/**
 * Top-level collapsed stellar system node designed for macro neighborhood maps.
 * Omits deep planetary manifests to minimize memory and bandwidth consumption.
 */
export interface SystemSummaryNode {
  /** Canonical system identifier (e.g., 'sol', 'alpha-centauri', 'hip-32349') */
  id: string;
  /** Primary display name */
  name: string;
  /** Proper common name if cataloged */
  properName?: string;
  /** Cartesian X coordinate in parsecs (Equatorial J2000) */
  x: number;
  /** Cartesian Y coordinate in parsecs (Equatorial J2000) */
  y: number;
  /** Cartesian Z coordinate in parsecs (Equatorial J2000) */
  z: number;
  /** Distance from Sol in parsecs */
  dist: number;
  /** 3D space velocity vector relative to Sol */
  velocity?: KinematicVector;
  /** Apparent visual magnitude of the primary stellar component */
  mag: number;
  /** Absolute visual magnitude of the primary stellar component */
  absmag: number;
  /** Morgan-Keenan spectral classification of the primary component */
  spect?: string;
  /** Color index (B-V) */
  ci?: number | null;
  /** Total number of verified stellar components in system */
  starCount: number;
  /** Total number of confirmed exoplanets */
  planetCount: number;
  /** Flag indicating whether any planet resides in the habitable zone */
  hasHabitableCandidate: boolean;
  /** Spatial sector identifier, e.g. 'sector_+025_-050_+000' */
  sectorId: string;
  /** Categorization tags (e.g., 'NakedEye', 'SolarNeighborhood10pc', 'ExoplanetHost') */
  tags?: string[];
}

/**
 * Orbital elements defining a Keplerian orbit in 3D space.
 */
export interface KeplerianOrbit {
  /** Semi-major axis in Astronomical Units (AU) */
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
  /** Reference epoch in Julian Days or ISO string */
  epoch?: number | string;
}

/**
 * Extrasolar planet record in a detailed system manifest.
 */
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
  orbit?: KeplerianOrbit;
}

/**
 * Individual stellar component in a single or multi-star system.
 */
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
}

/**
 * Detailed manifest for a single stellar system (drill-down view).
 */
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
  overviewText?: string;
}

/**
 * Bounded spatial partition manifest for a single sector.
 */
export interface SectorPartitionManifest {
  sectorId: string;
  bounds: {
    min: CartesianCoordinates;
    max: CartesianCoordinates;
  };
  count: number;
  systems: SystemSummaryNode[];
}

/**
 * Header metadata for formal catalog files.
 */
export interface CatalogManifestHeader {
  catalogId: string;
  name: string;
  description: string;
  epoch: string;
  count: number;
  timestamp: string;
}

/**
 * 3D Cartesian coordinates tuple [x, y, z] in parsecs.
 */
export type CartesianTuple = [x: number, y: number, z: number];

/**
 * 3D Cartesian coordinate point.
 */
export interface CartesianCoordinates {
  x: number;
  y: number;
  z: number;
}

/**
 * Astronomical Equatorial coordinate system definition.
 */
export interface EquatorialCoordinates {
  /** Right Ascension in decimal hours [0, 24) */
  ra: number;
  /** Declination in decimal degrees [-90, +90] */
  dec: number;
  /** Distance from origin in parsecs */
  dist: number;
}

/**
 * Orbital plane parameters defining an orientation in 3D space.
 */
export interface OrbitalPlaneOrientation {
  /** Inclination angle in radians (tilt relative to reference plane) */
  inclination: number;
  /** Longitude of the ascending node in radians (orientation of tilt axis) */
  ascendingNode: number;
}

/**
 * Flat interleaved TypedArray buffer representing bulk 3D coordinates:
 * [x0, y0, z0, x1, y1, z1, ..., xN, yN, zN]
 * Length is always 3 * N.
 */
export type BulkCoordinateBuffer = Float32Array;

/**
 * Deep-sky galactic object or interstellar structure (Layer 3: clusters, remnants, pulsars, bubbles).
 */
export interface GalacticStructureRecord {
  /** Unique identifier (e.g., 'hyades', 'pleiades', 'ursa-major-stream', 'vela-snr') */
  id: string;
  /** Primary display name */
  name: string;
  /** Classification of the galactic structure */
  type:
    | 'OpenCluster'
    | 'GlobularCluster'
    | 'SupernovaRemnant'
    | 'Pulsar'
    | 'PlanetaryNebula'
    | 'InterstellarMedium'
    | 'MovingGroup';
  /** Cartesian X coordinate in parsecs (Equatorial J2000) */
  x: number;
  /** Cartesian Y coordinate in parsecs (Equatorial J2000) */
  y: number;
  /** Cartesian Z coordinate in parsecs (Equatorial J2000) */
  z: number;
  /** Distance from Sol in parsecs */
  dist: number;
  /** Approximate tidal or core radius in parsecs */
  radiusPc?: number;
  /** Estimated age in millions of years (Myr) */
  ageMyr?: number;
  /** Number of confirmed member stars */
  memberCount?: number;
  /** Cross-catalog designations (e.g., ['Melotte 25', 'Collinder 50', 'C 0424+157']) */
  designations: string[];
  /** Scientific description and context */
  description: string;
}

/**
 * Natural solar system body record with full Keplerian orbital elements (Layer 4).
 */
export interface SolarSystemBodyRecord {
  /** Unique identifier (e.g., 'sol', 'earth', 'jupiter', 'europa', '433-eros') */
  id: string;
  /** Primary display name */
  name: string;
  /** Body classification */
  classification:
    | 'Star'
    | 'Planet'
    | 'DwarfPlanet'
    | 'Moon'
    | 'AsteroidNEO'
    | 'AsteroidMainBelt'
    | 'Comet';
  /** Parent body identifier for moons or secondary companions (e.g. 'sol', 'earth', 'jupiter') */
  parentBodyId?: string;
  /** Mean physical radius in kilometers */
  meanRadiusKm: number;
  /** Mass in kilograms */
  massKg?: number;
  /** Standard gravitational parameter GM in km^3/s^2 */
  gm?: number;
  /** Geometric albedo */
  albedo?: number;
  /** Sidereal rotation period in hours */
  rotationalPeriodHours?: number;
  /** Full Keplerian orbital elements */
  orbit?: KeplerianOrbit;
  /** Categorization tags */
  tags?: string[];
}
