import type {
  CelestialSymbolType,
  KeplerianOrbit,
  ObservationalConfidence,
  PlanetComposition,
} from './astro';

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
  axialTiltDeg?: number;
  orbit?: KeplerianOrbit;
  tags?: string[];
  confidence?: ObservationalConfidence;
  theoreticalFlags?: number;
  targetStarId?: string;
  isHabitableCandidate?: boolean;
  beltZone?: 'belt' | 'kuiper';
  isCoreSearch?: boolean;
  reticleType?: CelestialSymbolType;
  composition?: PlanetComposition;
  surfaceGravityG?: number;
  isTidallyLocked?: boolean;
  hazardMask?: number;
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
