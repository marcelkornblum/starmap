import { EARTH_REFERENCE_TARGET } from '../config/referenceTargets';
import type { PlanetComposition, PlanetCompositionCounts } from '../types/astro';

export interface PlanetPhysicalProperties {
  radiusRearth?: number;
  radiusRjup?: number;
  massMearth?: number;
  massMjup?: number;
  classification?: string;
}

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
 * Authoritative classification of a planet or exoplanet based on physical metrics.
 * Falls back to explicit string classification or terrestrial default if physical values are absent.
 */
export function classifyPlanetPhysical(planet: PlanetPhysicalProperties): PlanetComposition {
  if (planet.classification) {
    const norm = planet.classification.toLowerCase();
    if (norm.includes('super-earth') || norm.includes('super earth') || norm.includes('superearth')) {
      return 'super-earth';
    }
    if (norm.includes('terrestrial') || norm.includes('rocky') || norm.includes(EARTH_REFERENCE_TARGET.id)) {
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
 * optimistic habitable zone envelope.
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
    readonly composition?: PlanetComposition;
  })[],
): PlanetCompositionCounts | undefined {
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
