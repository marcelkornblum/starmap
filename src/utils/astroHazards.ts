import { isPlanetTidallyLocked } from './planetaryPhysics';
import {
  PLANET_HAZARD_BITS,
  SYSTEM_HAZARD_BITS,
} from './compactDataConstants';

export { PLANET_HAZARD_BITS, SYSTEM_HAZARD_BITS };

/**
 * Computes bitmask of stellar environmental hazards:
 * - FLARE_STAR (bit 1): Chromospheric flare activity
 * - IONISING_RADIATION (bit 2): Hard UV/X-ray flux
 * - VARIABLE_FLUX (bit 4): Bolometric fluctuations
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
