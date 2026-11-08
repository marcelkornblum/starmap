import type { CelestialClassification } from './spatial';

export type { CelestialClassification };

export type CelestialSymbolType =
  | 'star' | 'stellar-system' | 'multiple-system' | 'brown-dwarf' | 'white-dwarf'
  | 'neutron-star' | 'pulsar' | 'hazard' | 'black-hole' | 'barycentre'
  | 'stellar-cluster' | 'construct' | 'spacecraft' | 'terrestrial'
  | 'super-earth' | 'sub-neptune' | 'gas-giant' | 'ice-giant' | 'dwarf-planet'
  | 'moon' | 'asteroid' | 'comet' | 'belt' | 'asteroid-belt' | 'kuiper-belt'
  | 'kuiper-belt-object' | 'oort-cloud' | 'debris-disk' | 'nebula' | 'ism'
  | 'supernova-remnant' | 'habitable-zone';

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
  /** Apparent visual magnitude (lower/negative = brighter) */
  mag: number;
  /** Absolute visual magnitude (intrinsic brightness at 10 parsecs) */
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

/**
 * 3D velocity vector and relative motion parameters in Equatorial J2000 frame.
 */
export interface KinematicVector {
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  pmra?: number;
  pmdec?: number;
  radialVelocity?: number;
}

/**
 * Canonical observational confidence tier matching `<ConfidencePip>` and `--confidence-*` tokens.
 */
export type ObservationalConfidence = 'confirmed' | 'candidate' | 'theoretical' | 'unverified';

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
  /** Categorized planetary census breakdown for tactical reticle facets */
  planetCensus?: ('terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant')[];
  /** Precalculated counts of planets by composition class [terrestrial, superEarth, iceGiant, gasGiant] */
  planetCompositionCounts?: [terrestrial: number, superEarth: number, iceGiant: number, gasGiant: number];
  /** Flag indicating whether any planet resides in the habitable zone */
  hasHabitableCandidate: boolean;
  /** Spatial sector identifier, e.g. 'sector_+025_-050_+000' */
  sectorId: string;
  /** Categorization tags (e.g., 'NakedEye', 'SolarNeighborhood10pc', 'ExoplanetHost') */
  tags?: string[];
  /** Observational confidence tier ('confirmed' default) */
  confidence?: ObservationalConfidence;
  /** Bitmask indicating which fields are mathematically modelled ('theoretical': 1=spect, 2=rv) */
  theoreticalFlags?: number;
  /** Precalculated stellar environmental hazard bitmask (FLARE_STAR: 1, IONISING_RADIATION: 2, VARIABLE_FLUX: 4) */
  hazardMask?: number;
  /** Precalculated stellar/compact object classification */
  classification?: 'star' | 'white-dwarf' | 'brown-dwarf' | 'neutron-star' | 'black-hole';
  reticleType?: CelestialSymbolType;
}

/** Orbital elements defining a Keplerian orbit in 3D space. */
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
 * Natural satellite (moon) record belonging to a host planet or dwarf planet (AUD-051).
 */
export interface SatelliteRecord {
  id: string;
  name: string;
  parentId: string;
  radiusKm?: number;
  radiusEarth?: number;
  massEarth?: number;
  composition?: 'terrestrial' | 'super-earth' | 'sub-neptune' | 'gas-giant';
  reticleType?: CelestialSymbolType;
  orbit: KeplerianOrbit;
  description?: string;
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
  surfaceGravityG?: number;
  hazardMask?: number;
  composition?: 'terrestrial' | 'super-earth' | 'ice-giant' | 'gas-giant';
  isHabitableCandidate?: boolean;
  orbit?: KeplerianOrbit;
  satellites?: SatelliteRecord[];
  reticleType?: CelestialSymbolType;
  confidence?: ObservationalConfidence;
  theoreticalFlags?: number;
}

export type PlanetRecord = ExoplanetRecord;

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
  reticleType?: CelestialSymbolType;
}

export type StarRecord = StellarComponent;

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
  planetCompositionCounts?: [terrestrial: number, superEarth: number, iceGiant: number, gasGiant: number];
  hasHabitableCandidate?: boolean;
  tags?: string[];
  overviewText?: string;
  hazardMask?: number;
  disks?: CircumstellarDiskRecord[];
}

export type StarSystemManifest = SystemManifest;

/**
 * Kind of circumstellar disk or belt (DEC-035).
 */
export type CircumstellarDiskKind = 'asteroid-belt' | 'kuiper-belt' | 'debris-disk';

/**
 * Circumstellar disk or belt record in a detailed system manifest (DEC-035).
 */
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
    | 'MovingGroup'
    | 'EmissionNebula'
    | 'DarkNebula'
    | 'DeepSkyLandmark';
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
  confidence?: ObservationalConfidence;
  theoreticalFlags?: number;
  reticleType?: CelestialSymbolType;
}

/**
 * Natural solar system body record with full Keplerian orbital elements (Layer 4).
 */
export interface SolarSystemBodyRecord {
  id: string;
  name: string;
  classification:
    | 'Star'
    | 'Planet'
    | 'DwarfPlanet'
    | 'Moon'
    | 'AsteroidNEO'
    | 'AsteroidMainBelt'
    | 'AsteroidDistant'
    | 'Comet';
  parentBodyId?: string;
  meanRadiusKm: number;
  massKg?: number;
  gm?: number;
  albedo?: number;
  rotationalPeriodHours?: number;
  orbit?: KeplerianOrbit;
  tags?: string[];
  confidence?: ObservationalConfidence;
  theoreticalFlags?: number;
  targetStarId?: string;
  isHabitableCandidate?: boolean;
  beltZone?: 'belt' | 'kuiper';
  isCoreSearch?: boolean;
  reticleType?: CelestialSymbolType;
  composition?: 'terrestrial' | 'super-earth' | 'sub-neptune' | 'gas-giant';
}

/**
 * Detailed planetary body record with physical, atmospheric, and observational telemetry
 * for planetary inspection and micro views.
 */
export interface DetailedPlanetRecord {
  id: string;
  name: string;
  systemId: string;
  systemName: string;
  classification: string;
  letter?: string;
  discoveryYear?: number | null;
  discoveryMethod?: string;
  meanRadiusKm?: number | null;
  massKg?: number | null;
  massMearth?: number | null;
  radiusRearth?: number | null;
  surfaceGravityG?: number | null;
  surfaceGravityMs2?: number | null;
  escapeVelocityKmS?: number | null;
  rotationalPeriodHours?: number | null;
  axialTiltDeg?: number | null;
  albedo?: number | null;
  surfacePressureBar?: number | null;
  meanTemperatureK?: number | null;
  equilibriumTempK?: number | null;
  esi?: number | null;
  atmosphere?: string | null;
  magneticFieldGauss?: number | null;
  hazardStatus?: 'nominal' | 'caution' | 'critical';
  confidenceLevel?: 'direct-imaging' | 'in-situ' | 'transit-spectroscopy' | 'rv-constrained' | 'unconstrained' | 'high' | 'moderate' | 'low';
  confidenceMethod?: string;
  uncertainties?: Record<string, number>;
  orbit?: KeplerianOrbit;
  moons?: Array<{
    id: string;
    name: string;
    meanRadiusKm: number;
    massKg?: number;
    orbitalPeriodDays?: number;
  }>;
  description?: string;
}

/**
 * Category of a dataset layer (`FS-001` Fictional Canon Layers & `FS-002` Custom User Layers).
 */
export type DatasetLayerKind = 'fictional-canon' | 'custom-user' | 'scientific-overlay';

/**
 * Target entity kind annotated by a dataset layer entry.
 */
export type DatasetLayerTargetType =
  | 'system'
  | 'planet'
  | 'moon'
  | 'structure'
  | 'minor-body'
  | 'fictional-body';

/**
 * Bibliographic & source metadata block for a dataset layer.
 */
export interface DatasetLayerSourceMeta {
  /** Summary of the source work and how real-sky astronomy/cartography is used in its canon */
  summary: string;
  /** Primary author(s), creator(s), or studio (e.g. "Andy Weir", "Cixin Liu", "Gene Roddenberry") */
  creator: string;
  /** Original publication or release year/span (e.g. "2021", "2006–2010", "1966–present") */
  publicationYear?: string;
  /** Medium or format (e.g. "Novel", "Novel Trilogy", "TV & Film Franchise", "Video Game Franchise") */
  medium?: string;
  /** Specific canonical reference book, atlas, or source used for star coordinates */
  canonicalReference?: string;
  /** Authoritative reference link (Wikipedia or official canon encyclopedia URL) */
  url?: string;
}

/**
 * Flattened annotation record for a specific celestial entity inside a dataset layer.
 * Every entry attaches to a real host star system (`systemId`) so Galactic View highlighting
 * and System View drill-down work uniformly for systems, real exoplanets, and fictional bodies.
 */
export interface DatasetLayerEntry {
  targetId: string;
  targetType: DatasetLayerTargetType;
  /** Real host star system ID in the Starmap catalog */
  systemId: string;
  /** Optional sequence order for stepped waypoints and curated tours (DEC-036b) */
  order?: number;
  /** Optional parent celestial body ID for moons and orbiting structures (DEC-038) */
  parentBodyId?: string;
  /**
   * Optional distinctive in-universe name. Omit whenever identical to the real-sky
   * star/body name; the UI and search resolve the real name from `targetId` / `systemId`.
   * Zero brackets.
   */
  inUniverseName?: string;
  /**
   * Precalculated real-sky display name resolved at build time from catalogue data
   * when `inUniverseName` is omitted (DL-02).
   */
  resolvedName?: string;
  /** Optional short role/context label (e.g. `Astrophage Destination`). Zero brackets. */
  subtitle?: string;
  text: string;
  workTitle?: string;
  /**
   * Space-delimited delta-only search tokens. Must never repeat words already present in
   * `inUniverseName`, `subtitle`, or the parent `title`, nor the real-sky host name.
   */
  aliases?: string;
  confidence?: ObservationalConfidence;
}

/**
 * Unified Dataset Layer Manifest supporting both static fictional canons (`FS-001`)
 * and user-authored custom note layers (`FS-002`).
 */
export interface DatasetLayerManifest {
  layerId: string;
  /** Shortest unambiguous canonical name (zero brackets, no "Universe"/"Canon" suffix) */
  title: string;
  /** Strictly optional secondary title; omit by default */
  subtitle?: string;
  kind: DatasetLayerKind;
  description: string;
  version: number;
  /**
   * Space-delimited non-redundant search tokens, including researched book-author
   * surnames (DL-01 / DL-06).
   */
  aliases?: string;
  source?: DatasetLayerSourceMeta;
  entries: Record<string, DatasetLayerEntry>;
}

/**
 * Summary entry in `public/data/overlays/layers/index.json`.
 */
export interface DatasetLayerIndexEntry {
  layerId: string;
  title: string;
  kind: DatasetLayerKind;
  description: string;
  source?: DatasetLayerSourceMeta;
  entryCount: number;
  path: string;
}
