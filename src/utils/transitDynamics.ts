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
