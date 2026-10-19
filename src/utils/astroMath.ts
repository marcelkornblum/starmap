import type {
  CartesianTuple,
  CartesianCoordinates,
  KinematicVector,
} from '../types/astro';

/** Multiplier to convert Right Ascension decimal hours [0, 24) to radians: (2 * PI) / 24 */
export const HOURS_TO_RADIANS = Math.PI / 12;

/** Multiplier to convert degrees to radians: PI / 180 */
export const DEG_TO_RADIANS = Math.PI / 180;

/** Multiplier to convert radians to degrees: 180 / PI */
export const RADIANS_TO_DEG = 180 / Math.PI;

/** Obliquity of the Earth's ecliptic plane in degrees (epoch J2000) */
export const EARTH_OBLIQUITY_DEG = 23.4392911;

/** Obliquity of the Earth's ecliptic plane in radians (epoch J2000) */
export const EARTH_OBLIQUITY_RAD = EARTH_OBLIQUITY_DEG * DEG_TO_RADIANS;

/**
 * Options for orbital plane rotation transformations.
 */
export interface PlaneRotationOptions {
  /** If true, angles are treated as degrees instead of radians. Default: false */
  degrees?: boolean;
}

/**
 * Converts celestial Equatorial coordinates (Right Ascension, Declination, Distance)
 * to 3D Cartesian coordinates [x, y, z] in parsecs (Equatorial frame, epoch J2000).
 *
 * @param ra Right Ascension in decimal hours [0, 24)
 * @param dec Declination in decimal degrees [-90, +90]
 * @param dist Distance from origin in parsecs
 * @returns New Cartesian tuple [x, y, z]
 */
export function equatorialToCartesian(
  ra: number,
  dec: number,
  dist: number,
): CartesianTuple;

/**
 * Converts celestial Equatorial coordinates (Right Ascension, Declination, Distance)
 * directly into an existing output buffer or array (zero-allocation).
 *
 * @param ra Right Ascension in decimal hours [0, 24)
 * @param dec Declination in decimal degrees [-90, +90]
 * @param dist Distance from origin in parsecs
 * @param target Output buffer or array to mutate directly
 * @param offset Optional offset index into target (default 0)
 * @returns The mutated target array
 */
export function equatorialToCartesian<
  T extends Float32Array | Float64Array | number[],
>(
  ra: number,
  dec: number,
  dist: number,
  target: T,
  offset?: number,
): T;

export function equatorialToCartesian(
  ra: number,
  dec: number,
  dist: number,
  target?: Float32Array | Float64Array | number[],
  offset = 0,
): CartesianTuple | Float32Array | Float64Array | number[] {
  if (target && (!Number.isInteger(offset) || offset < 0 || offset + 3 > target.length)) {
    throw new RangeError(
      `Target buffer offset out of bounds: offset=${offset}, length=${target.length}`,
    );
  }

  if (dist === 0) {
    if (!target) {
      return [0, 0, 0];
    }
    target[offset] = 0;
    target[offset + 1] = 0;
    target[offset + 2] = 0;
    return target;
  }

  const raRad = ra * HOURS_TO_RADIANS;
  const decRad = dec * DEG_TO_RADIANS;

  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);
  const cosRa = Math.cos(raRad);
  const sinRa = Math.sin(raRad);

  const x = dist * cosDec * cosRa;
  const y = dist * cosDec * sinRa;
  const z = dist * sinDec;

  if (!target) {
    return [x, y, z];
  }

  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;

  return target;
}

/**
 * Reorients 3D Cartesian coordinates in a Float32Array buffer to an arbitrary orbital plane
 * defined by inclination and longitude of the ascending node.
 * Mutates the buffer in-place with zero heap allocations during vertex processing.
 *
 * Mathematical foundation:
 *   Rotation around the line of nodes unit vector u = [cos(Omega), sin(Omega), 0]
 *   by inclination angle i using Rodrigues' rotation matrix.
 *
 * @param buffer Interleaved Float32Array [x0, y0, z0, x1, y1, z1, ..., xN, yN, zN]
 * @param inclination Tilt angle relative to reference plane (radians, or degrees if options.degrees = true)
 * @param ascendingNode Longitude of ascending node defining tilt axis (radians, or degrees if options.degrees = true)
 * @param options Optional configuration flags (e.g. degrees)
 * @returns The mutated Float32Array buffer (same reference)
 */
export function rotateToOrbitalPlane(
  buffer: Float32Array,
  inclination: number,
  ascendingNode = 0,
  options?: PlaneRotationOptions,
): Float32Array {
  if (!Number.isFinite(inclination) || inclination === 0) {
    return buffer;
  }

  const safeAscendingNode = Number.isFinite(ascendingNode) ? ascendingNode : 0;
  const isDegrees = options?.degrees === true;
  const incRad = isDegrees ? inclination * DEG_TO_RADIANS : inclination;
  const nodeRad = isDegrees ? safeAscendingNode * DEG_TO_RADIANS : safeAscendingNode;

  const cosInc = Math.cos(incRad);
  const sinInc = Math.sin(incRad);
  const k = 1 - cosInc;

  const ux = Math.cos(nodeRad);
  const uy = Math.sin(nodeRad);

  // 3x3 rotation matrix coefficients computed once prior to iteration
  const m00 = cosInc + k * ux * ux;
  const m01 = k * ux * uy;
  const m02 = -sinInc * uy;

  const m10 = k * ux * uy;
  const m11 = cosInc + k * uy * uy;
  const m12 = sinInc * ux;

  const m20 = sinInc * uy;
  const m21 = -sinInc * ux;
  const m22 = cosInc;

  const length = buffer.length - (buffer.length % 3);

  for (let i = 0; i < length; i += 3) {
    const x = buffer[i];
    const y = buffer[i + 1];
    const z = buffer[i + 2];

    buffer[i] = m00 * x + m01 * y + m02 * z;
    buffer[i + 1] = m10 * x + m11 * y + m12 * z;
    buffer[i + 2] = m20 * x + m21 * y + m22 * z;
  }

  return buffer;
}

/**
 * Conversion factor from parsecs per Julian year (pc/yr) to kilometers per second (km/s).
 * 1 pc = 3.085677581491367e13 km
 * 1 Julian year = 31557600 s (365.25 days)
 * 1 pc/yr = 977,792.22168 km/s
 */
export const PARSECS_PER_YEAR_TO_KMS = 977792.22168;

/**
 * Parses and converts Cartesian velocity components from parsecs per year into a formal
 * KinematicVector in kilometers per second (km/s).
 *
 * @param vxPcPerYear Velocity component X in pc/yr (Equatorial J2000)
 * @param vyPcPerYear Velocity component Y in pc/yr (Equatorial J2000)
 * @param vzPcPerYear Velocity component Z in pc/yr (Equatorial J2000)
 * @param pmra Optional proper motion in Right Ascension (mas/yr)
 * @param pmdec Optional proper motion in Declination (mas/yr)
 * @param radialVelocity Optional line-of-sight radial velocity (km/s)
 * @returns KinematicVector in km/s or undefined if Cartesian velocity components are unavailable
 */
export function parseKinematicVector(
  vxPcPerYear?: number | null,
  vyPcPerYear?: number | null,
  vzPcPerYear?: number | null,
  pmra?: number | null,
  pmdec?: number | null,
  radialVelocity?: number | null,
): KinematicVector | undefined {
  if (
    vxPcPerYear === undefined ||
    vxPcPerYear === null ||
    vyPcPerYear === undefined ||
    vyPcPerYear === null ||
    vzPcPerYear === undefined ||
    vzPcPerYear === null ||
    Number.isNaN(vxPcPerYear) ||
    Number.isNaN(vyPcPerYear) ||
    Number.isNaN(vzPcPerYear)
  ) {
    return undefined;
  }

  const vx = vxPcPerYear * PARSECS_PER_YEAR_TO_KMS;
  const vy = vyPcPerYear * PARSECS_PER_YEAR_TO_KMS;
  const vz = vzPcPerYear * PARSECS_PER_YEAR_TO_KMS;
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  return {
    vx,
    vy,
    vz,
    speed,
    pmra: pmra != null && !Number.isNaN(pmra) ? pmra : undefined,
    pmdec: pmdec != null && !Number.isNaN(pmdec) ? pmdec : undefined,
    radialVelocity:
      radialVelocity != null && !Number.isNaN(radialVelocity) ? radialVelocity : undefined,
  };
}

/** Default 3D spatial partition sector cube side length in parsecs */
export const DEFAULT_SECTOR_SIZE_PC = 25;

/**
 * Calculates the lower-bound axis alignment coordinate for a given 1D position.
 *
 * @param val Position along a Cartesian axis in parsecs
 * @param size Sector dimension in parsecs (default: 25)
 * @returns Aligned sector base coordinate
 */
export function getSectorCoordinate(
  val: number,
  size = DEFAULT_SECTOR_SIZE_PC,
): number {
  if (!Number.isFinite(val)) {
    throw new TypeError(`Coordinate value must be a finite number: ${val}`);
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(`Sector size must be a positive finite number: ${size}`);
  }

  const coord = Math.floor(val / size) * size;
  return Object.is(coord, -0) ? 0 : coord;
}

/**
 * Formats a formal 3D spatial sector identifier based on coordinates in parsecs.
 * Uses uniform signed 3-digit zero-padded coordinates: e.g. "sector_+000_-050_+025".
 *
 * @param x Cartesian X in parsecs
 * @param y Cartesian Y in parsecs
 * @param z Cartesian Z in parsecs
 * @param size Sector dimension in parsecs (default: 25)
 * @returns Standardized sector identifier string
 */
export function formatSectorId(
  x: number,
  y: number,
  z: number,
  size = DEFAULT_SECTOR_SIZE_PC,
): string {
  const sx = getSectorCoordinate(x, size);
  const sy = getSectorCoordinate(y, size);
  const sz = getSectorCoordinate(z, size);

  const formatCoord = (n: number) => {
    const sign = n >= 0 ? '+' : '-';
    const abs = Math.abs(n);
    return `${sign}${String(abs).padStart(3, '0')}`;
  };

  return `sector_${formatCoord(sx)}_${formatCoord(sy)}_${formatCoord(sz)}`;
}

/**
 * Resolves the 3D bounding box coordinates [min, max] for a given sector identifier.
 *
 * @param sectorId Standard sector identifier string (e.g. "sector_+000_-050_+025")
 * @param size Sector dimension in parsecs (default: 25)
 * @returns Bounding box with min and max CartesianCoordinates, or null if malformed
 */
export function getSectorBounds(
  sectorId: string,
  size = DEFAULT_SECTOR_SIZE_PC,
): { min: CartesianCoordinates; max: CartesianCoordinates } | null {
  if (!Number.isFinite(size) || size <= 0) {
    return null;
  }

  const match = /^sector_([+-]\d+)_([+-]\d+)_([+-]\d+)$/.exec(sectorId);
  if (!match) return null;

  const minX = parseInt(match[1], 10);
  const minY = parseInt(match[2], 10);
  const minZ = parseInt(match[3], 10);

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: minX + size, y: minY + size, z: minZ + size },
  };
}

export interface PlanetPhysicalProperties {
  radiusRearth?: number;
  radiusRjup?: number;
  massMearth?: number;
  massMjup?: number;
  classification?: string;
}

export type PlanetCensusClassification = 'terrestrial' | 'super-earth' | 'ice-giant' | 'gas-giant';

/** Conversion constants between Jupiter and Earth units */
export const RJUP_TO_REARTH = 11.209;
export const MJUP_TO_MEARTH = 317.83;

/** Physical classification thresholds */
export const TERRESTRIAL_MAX_RADIUS_REARTH = 1.25;
export const TERRESTRIAL_MAX_MASS_MEARTH = 2.0;
export const SUPER_EARTH_MAX_RADIUS_REARTH = 2.0;
export const SUPER_EARTH_MAX_MASS_MEARTH = 10.0;
export const ICE_GIANT_MAX_RADIUS_REARTH = 6.0;
export const ICE_GIANT_MAX_MASS_MEARTH = 50.0;

/**
 * Authoritative classification of a planet or exoplanet based on physical metrics:
 * - Terrestrial: Rp <= 1.25 R_earth and Mp <= 2.0 M_earth
 * - Super-Earth: 1.25 R_earth < Rp <= 2.0 R_earth or 2.0 M_earth < Mp <= 10.0 M_earth
 * - Ice Giant: 2.0 R_earth < Rp <= 6.0 R_earth or 10.0 M_earth < Mp <= 50.0 M_earth
 * - Gas Giant: Rp > 6.0 R_earth or Mp > 50.0 M_earth
 *
 * Falls back to explicit string classification or terrestrial default if physical values are absent.
 */
export function classifyPlanetPhysical(planet: PlanetPhysicalProperties): PlanetCensusClassification {
  if (planet.classification) {
    const norm = planet.classification.toLowerCase();
    if (norm.includes('super-earth') || norm.includes('super earth') || norm.includes('superearth')) {
      return 'super-earth';
    }
    if (norm.includes('terrestrial') || norm.includes('rocky') || norm.includes('earth')) {
      return 'terrestrial';
    }
    if (norm.includes('ice') || norm.includes('neptun')) {
      return 'ice-giant';
    }
    if (norm.includes('gas') || norm.includes('jovian') || norm.includes('giant')) {
      return 'gas-giant';
    }
  }

  const rEarth = planet.radiusRearth ?? (planet.radiusRjup !== undefined ? planet.radiusRjup * RJUP_TO_REARTH : undefined);
  const mEarth = planet.massMearth ?? (planet.massMjup !== undefined ? planet.massMjup * MJUP_TO_MEARTH : undefined);

  if (rEarth !== undefined) {
    if (rEarth > ICE_GIANT_MAX_RADIUS_REARTH) return 'gas-giant';
    if (rEarth > SUPER_EARTH_MAX_RADIUS_REARTH) return 'ice-giant';
    if (
      rEarth > TERRESTRIAL_MAX_RADIUS_REARTH ||
      (mEarth !== undefined && mEarth > TERRESTRIAL_MAX_MASS_MEARTH && mEarth <= SUPER_EARTH_MAX_MASS_MEARTH)
    ) {
      return 'super-earth';
    }
    return 'terrestrial';
  }

  if (mEarth !== undefined) {
    if (mEarth > ICE_GIANT_MAX_MASS_MEARTH) return 'gas-giant';
    if (mEarth > SUPER_EARTH_MAX_MASS_MEARTH) return 'ice-giant';
    if (mEarth > TERRESTRIAL_MAX_MASS_MEARTH) return 'super-earth';
    return 'terrestrial';
  }

  return 'terrestrial';
}

export interface PlanetHabitabilityInput {
  readonly equilibriumTempK?: number;
  readonly esi?: number;
  readonly semiMajorAxis?: number;
  readonly tags?: readonly string[];
  readonly isHabitableCandidate?: boolean;
}

/**
 * Authoritative predicate evaluating whether a planet or exoplanet falls within the
 * optimistic habitable zone envelope ($180\text{ K} \le T_\text{eq} \le 320\text{ K}$,
 * $\text{ESI} \ge 0.7$, stellar insolation bounds, or curated `'HabitableWorld'` tag).
 */
export function isPlanetHabitableCandidate(
  planet: PlanetHabitabilityInput,
  starLum?: number,
): boolean {
  if (planet.isHabitableCandidate !== undefined) {
    return planet.isHabitableCandidate;
  }
  if (planet.tags && planet.tags.length > 0) {
    return planet.tags.includes('HabitableWorld');
  }
  if (
    planet.equilibriumTempK !== undefined &&
    planet.equilibriumTempK >= 180 &&
    planet.equilibriumTempK <= 320
  ) {
    return true;
  }
  if (planet.esi !== undefined && planet.esi >= 0.7) {
    return true;
  }
  if (
    starLum !== undefined &&
    starLum > 0 &&
    planet.semiMajorAxis !== undefined &&
    planet.semiMajorAxis > 0
  ) {
    const hzInner = 0.75 * Math.sqrt(starLum);
    const hzOuter = 1.77 * Math.sqrt(starLum);
    if (planet.semiMajorAxis >= hzInner && planet.semiMajorAxis <= hzOuter) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the precalculated tuple `[terrestrialCount, superEarthCount, iceGiantCount, gasGiantCount]`
 * for a list of planets in a star system.
 */
export function computePlanetCompositionCounts(
  planets: readonly (PlanetPhysicalProperties & {
    readonly composition?: PlanetCensusClassification;
  })[],
): [terrestrial: number, superEarth: number, iceGiant: number, gasGiant: number] | undefined {
  if (planets.length === 0) {
    return undefined;
  }
  let terrestrial = 0;
  let superEarth = 0;
  let iceGiant = 0;
  let gasGiant = 0;
  for (const p of planets) {
    const comp = p.composition ?? classifyPlanetPhysical(p);
    if (comp === 'gas-giant') {
      gasGiant++;
    } else if (comp === 'ice-giant') {
      iceGiant++;
    } else if (comp === 'super-earth') {
      superEarth++;
    } else {
      terrestrial++;
    }
  }
  return [terrestrial, superEarth, iceGiant, gasGiant];
}

/**
 * Computes surface gravity in Earth standard gravity units (g = 9.81 m/s^2).
 * Formula: g = M / R^2. When radius is unavailable, mass-radius power law is used.
 */
export function computePlanetSurfaceGravityG(planet: {
  readonly massMearth?: number;
  readonly radiusRearth?: number;
}): number | undefined {
  if (
    planet.massMearth !== undefined &&
    planet.massMearth > 0 &&
    planet.radiusRearth !== undefined &&
    planet.radiusRearth > 0
  ) {
    return Math.round((planet.massMearth / (planet.radiusRearth * planet.radiusRearth)) * 100) / 100;
  }
  if (planet.massMearth !== undefined && planet.massMearth > 0 && planet.radiusRearth === undefined) {
    const estR = planet.massMearth <= 10 ? Math.pow(planet.massMearth, 0.28) : Math.pow(planet.massMearth, 0.59);
    return Math.round((planet.massMearth / (estR * estR)) * 100) / 100;
  }
  return undefined;
}

/**
 * Predicate determining whether an exoplanet is tidally locked (synchronous rotation).
 * Considers orbital period <= 30 days or semi-major axis <= 0.15 AU.
 */
export function isPlanetTidallyLocked(planet: {
  readonly periodDays?: number;
  readonly semiMajorAxisAu?: number;
}): boolean {
  return Boolean(
    (planet.periodDays !== undefined && planet.periodDays > 0 && planet.periodDays <= 30) ||
      (planet.semiMajorAxisAu !== undefined && planet.semiMajorAxisAu > 0 && planet.semiMajorAxisAu <= 0.15),
  );
}

export const SYSTEM_HAZARD_BITS = {
  FLARE_STAR: 1,
  IONISING_RADIATION: 2,
  VARIABLE_FLUX: 4,
} as const;

/**
 * Computes bitmask of stellar environmental hazards:
 * - FLARE_STAR (bit 1): Chromospheric flare activity (emission lines, UV/flare variable)
 * - IONISING_RADIATION (bit 2): Hard UV/X-ray flux (hot O/B/D/white dwarf/pulsar, L >= 25 Lsun, Teff >= 10,000 K)
 * - VARIABLE_FLUX (bit 4): Bolometric fluctuations (not already a flare star)
 */
export function computeSystemHazardMask(input: {
  readonly spect?: string;
  readonly lum?: number;
  readonly effectiveTempK?: number;
  readonly varType?: string;
  readonly tags?: readonly string[];
}): number {
  let mask = 0;

  const isFlareStar = Boolean(
    (input.spect && (/[KM]\d*(?:\.\d+)?V?e\b/i.test(input.spect) || /\bdMe\b/i.test(input.spect))) ||
      (input.varType && /\b(?:UV|flare)\b/i.test(input.varType)),
  );
  if (isFlareStar) {
    mask |= SYSTEM_HAZARD_BITS.FLARE_STAR;
  }

  const spectUpper = (input.spect ?? '').trim().toUpperCase();
  const isDwarfPrefix = (input.spect ?? '').trim().startsWith('d');
  const isIonising = Boolean(
    (spectUpper &&
      !isDwarfPrefix &&
      (spectUpper.startsWith('O') ||
        spectUpper.startsWith('B') ||
        spectUpper.startsWith('D') ||
        spectUpper.startsWith('PSR') ||
        spectUpper.startsWith('Q') ||
        spectUpper.startsWith('WN') ||
        spectUpper.startsWith('WC'))) ||
      (input.lum !== undefined && input.lum >= 25) ||
      (input.effectiveTempK !== undefined && input.effectiveTempK >= 10000),
  );
  if (isIonising) {
    mask |= SYSTEM_HAZARD_BITS.IONISING_RADIATION;
  }

  const isVariable =
    !isFlareStar &&
    Boolean(input.tags?.includes('VariableStar') || (input.varType !== undefined && input.varType !== 'V*'));
  if (isVariable) {
    mask |= SYSTEM_HAZARD_BITS.VARIABLE_FLUX;
  }

  return mask;
}

export const PLANET_HAZARD_BITS = {
  EXTREME_HEAT: 1,
  CRYOGENIC_COLD: 2,
  HIGH_GRAVITY: 4,
  TIDAL_LOCKING: 8,
  HIGH_ECCENTRICITY: 16,
} as const;

/**
 * Computes bitmask of planetary environmental hazards:
 * - EXTREME_HEAT (bit 1): Teq > 373 K
 * - CRYOGENIC_COLD (bit 2): Teq > 0 && Teq < 180 K
 * - HIGH_GRAVITY (bit 4): g >= 1.2
 * - TIDAL_LOCKING (bit 8): synchronous rotation
 * - HIGH_ECCENTRICITY (bit 16): e >= 0.20
 */
export function computePlanetHazardMask(input: {
  readonly equilibriumTempK?: number;
  readonly surfaceGravityG?: number;
  readonly periodDays?: number;
  readonly semiMajorAxisAu?: number;
  readonly eccentricity?: number;
}): number {
  let mask = 0;

  if (input.equilibriumTempK !== undefined && input.equilibriumTempK > 373) {
    mask |= PLANET_HAZARD_BITS.EXTREME_HEAT;
  }
  if (input.equilibriumTempK !== undefined && input.equilibriumTempK > 0 && input.equilibriumTempK < 180) {
    mask |= PLANET_HAZARD_BITS.CRYOGENIC_COLD;
  }
  if (input.surfaceGravityG !== undefined && input.surfaceGravityG >= 1.2) {
    mask |= PLANET_HAZARD_BITS.HIGH_GRAVITY;
  }
  if (isPlanetTidallyLocked({ periodDays: input.periodDays, semiMajorAxisAu: input.semiMajorAxisAu })) {
    mask |= PLANET_HAZARD_BITS.TIDAL_LOCKING;
  }
  if (input.eccentricity !== undefined && input.eccentricity >= 0.2) {
    mask |= PLANET_HAZARD_BITS.HIGH_ECCENTRICITY;
  }

  return mask;
}

export const PARSEC_TO_LY = 3.261563777;
export const AU_TO_KM = 149597870.7;
export const AU_TO_LIGHT_MINUTES = 8.316746397;
export const STANDARD_G_MPS2 = 9.80665;
export const LY_PER_YEAR2_PER_G = 1.03227554;

/**
 * Computes 3D Euclidean distance and coordinate deltas between two points.
 */
export function computeEuclideanDistance3D(
  p1: readonly [number, number, number],
  p2: readonly [number, number, number],
): {
  readonly distance: number;
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
} {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return { distance, dx, dy, dz };
}

/**
 * Computes relativistic interstellar transit metrics with midpoint flip-and-burn.
 */
export function computeInterstellarRelativisticTransit(
  distanceLy: number,
  properAccelerationG: number,
): {
  readonly shipProperTimeYears: number;
  readonly coordinateTimeYears: number;
  readonly peakBetaC: number;
  readonly peakLorentzGamma: number;
  readonly turnaroundDistanceLy: number;
} {
  if (distanceLy <= 0 || properAccelerationG <= 0) {
    return {
      shipProperTimeYears: 0,
      coordinateTimeYears: 0,
      peakBetaC: 0,
      peakLorentzGamma: 1,
      turnaroundDistanceLy: 0,
    };
  }
  const alpha = properAccelerationG * LY_PER_YEAR2_PER_G;
  const peakLorentzGamma = (alpha * distanceLy) / 2 + 1;
  const shipProperTimeYears = (2 / alpha) * Math.acosh(peakLorentzGamma);
  const coordinateTimeYears = (2 / alpha) * Math.sqrt(peakLorentzGamma * peakLorentzGamma - 1);
  const peakBetaC = Math.sqrt(Math.max(0, 1 - 1 / (peakLorentzGamma * peakLorentzGamma)));
  const turnaroundDistanceLy = distanceLy / 2;
  return {
    shipProperTimeYears,
    coordinateTimeYears,
    peakBetaC,
    peakLorentzGamma,
    turnaroundDistanceLy,
  };
}

/**
 * Computes interstellar transit metrics at constant fraction of light speed (beta = v/c).
 */
export function computeInterstellarConstantBetaTransit(
  distanceLy: number,
  betaC: number,
): {
  readonly shipProperTimeYears: number;
  readonly coordinateTimeYears: number;
  readonly cruiseBetaC: number;
  readonly lorentzGamma: number;
} {
  if (distanceLy <= 0) {
    return {
      shipProperTimeYears: 0,
      coordinateTimeYears: 0,
      cruiseBetaC: 0,
      lorentzGamma: 1,
    };
  }
  const cruiseBetaC = Math.min(0.999999, Math.max(1e-6, betaC));
  const lorentzGamma = 1 / Math.sqrt(1 - cruiseBetaC * cruiseBetaC);
  const coordinateTimeYears = distanceLy / cruiseBetaC;
  const shipProperTimeYears = coordinateTimeYears / lorentzGamma;
  return {
    shipProperTimeYears,
    coordinateTimeYears,
    cruiseBetaC,
    lorentzGamma,
  };
}

/**
 * Computes intra-system brachistochrone continuous burn transit time and delta-v.
 */
export function computeIntraSystemBrachistochroneTransit(
  distanceAu: number,
  accelerationG: number,
): {
  readonly transitDays: number;
  readonly transitHours: number;
  readonly peakVelocityKms: number;
  readonly deltaVKms: number;
  readonly turnaroundDistanceAu: number;
} {
  const distanceMeters = Math.max(0, distanceAu) * AU_TO_KM * 1000;
  const accelMps2 = Math.max(1e-6, accelerationG) * STANDARD_G_MPS2;
  const timeSeconds = 2 * Math.sqrt(distanceMeters / accelMps2);
  const transitHours = timeSeconds / 3600;
  const transitDays = timeSeconds / 86400;
  const peakVelocityKms = Math.sqrt(accelMps2 * distanceMeters) / 1000;
  const deltaVKms = 2 * peakVelocityKms;
  const turnaroundDistanceAu = distanceAu / 2;
  return {
    transitDays,
    transitHours,
    peakVelocityKms,
    deltaVKms,
    turnaroundDistanceAu,
  };
}

/**
 * Computes Hohmann transfer orbit parameters and required delta-V budget.
 */
export function computeHohmannTransferOrbit(
  r1Au: number,
  r2Au: number,
  centralStarMassMsun = 1.0,
): {
  readonly transitDays: number;
  readonly transitMonths: number;
  readonly semiMajorAxisTransferAu: number;
  readonly deltaVDepartureKms: number;
  readonly deltaVArrivalKms: number;
  readonly totalDeltaVKms: number;
  readonly synodicPeriodDays?: number;
} {
  const r1 = Math.max(1e-4, r1Au);
  const r2 = Math.max(1e-4, r2Au);
  const mStar = Math.max(1e-3, centralStarMassMsun);
  const semiMajorAxisTransferAu = (r1 + r2) / 2;
  const transitYears = 0.5 * Math.sqrt(Math.pow(semiMajorAxisTransferAu, 3) / mStar);
  const transitDays = transitYears * 365.25;
  const transitMonths = transitDays / 30.4375;

  const v1 = 29.7847 * Math.sqrt(mStar / r1);
  const v2 = 29.7847 * Math.sqrt(mStar / r2);
  const vTrans1 = 29.7847 * Math.sqrt(mStar * (2 / r1 - 1 / semiMajorAxisTransferAu));
  const vTrans2 = 29.7847 * Math.sqrt(mStar * (2 / r2 - 1 / semiMajorAxisTransferAu));

  const deltaVDepartureKms = Math.abs(vTrans1 - v1);
  const deltaVArrivalKms = Math.abs(v2 - vTrans2);
  const totalDeltaVKms = deltaVDepartureKms + deltaVArrivalKms;

  const p1Days = Math.sqrt(Math.pow(r1, 3) / mStar) * 365.25;
  const p2Days = Math.sqrt(Math.pow(r2, 3) / mStar) * 365.25;
  const synodicPeriodDays =
    Math.abs(p1Days - p2Days) > 1e-2
      ? (p1Days * p2Days) / Math.abs(p1Days - p2Days)
      : undefined;

  return {
    transitDays,
    transitMonths,
    semiMajorAxisTransferAu,
    deltaVDepartureKms,
    deltaVArrivalKms,
    totalDeltaVKms,
    synodicPeriodDays,
  };
}

