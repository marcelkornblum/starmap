export interface PlanetPhysicalProperties {
  radiusRearth?: number;
  radiusRjup?: number;
  massMearth?: number;
  massMjup?: number;
  classification?: string;
}

export type PlanetCensusClassification = 'terrestrial' | 'gas-giant' | 'ice-giant';

/** Conversion constants between Jupiter and Earth units */
export const RJUP_TO_REARTH = 11.209;
export const MJUP_TO_MEARTH = 317.83;

/** Physical classification thresholds */
export const TERRESTRIAL_MAX_RADIUS_REARTH = 1.75;
export const TERRESTRIAL_MAX_MASS_MEARTH = 10.0;
export const ICE_GIANT_MAX_RADIUS_REARTH = 6.0;
export const ICE_GIANT_MAX_MASS_MEARTH = 50.0;

/**
 * Authoritative classification of a planet or exoplanet based on physical metrics:
 * - Terrestrial: Rp <= 1.75 R_earth or Mp <= 10 M_earth
 * - Ice Giant: 1.75 R_earth < Rp <= 6.0 R_earth or 10 M_earth < Mp <= 50 M_earth
 * - Gas Giant: Rp > 6.0 R_earth or Mp > 50 M_earth
 *
 * Falls back to explicit string classification or terrestrial default if physical values are absent.
 */
export function classifyPlanetPhysical(planet: PlanetPhysicalProperties): PlanetCensusClassification {
  if (planet.classification) {
    const norm = planet.classification.toLowerCase();
    if (norm.includes('terrestrial') || norm.includes('rocky') || norm.includes('earth')) return 'terrestrial';
    if (norm.includes('ice') || norm.includes('neptun')) return 'ice-giant';
    if (norm.includes('gas') || norm.includes('jovian') || norm.includes('giant')) return 'gas-giant';
  }

  const rEarth = planet.radiusRearth ?? (planet.radiusRjup !== undefined ? planet.radiusRjup * RJUP_TO_REARTH : undefined);
  const mEarth = planet.massMearth ?? (planet.massMjup !== undefined ? planet.massMjup * MJUP_TO_MEARTH : undefined);

  if (rEarth !== undefined) {
    if (rEarth <= TERRESTRIAL_MAX_RADIUS_REARTH) return 'terrestrial';
    if (rEarth <= ICE_GIANT_MAX_RADIUS_REARTH) return 'ice-giant';
    return 'gas-giant';
  }

  if (mEarth !== undefined) {
    if (mEarth <= TERRESTRIAL_MAX_MASS_MEARTH) return 'terrestrial';
    if (mEarth <= ICE_GIANT_MAX_MASS_MEARTH) return 'ice-giant';
    return 'gas-giant';
  }

  return 'terrestrial';
}
