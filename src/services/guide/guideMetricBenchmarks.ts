/**
 * DEC-027 / Phase 3.3A-1: Guide Metric Benchmarks & Target Evaluation
 * Evaluation of stellar, orbital, and planetary telemetry against standard reference baselines.
 */

import type { CelestialSymbolType } from '../../types/astro';
import {
  SOL_REFERENCE_TARGET,
  EARTH_REFERENCE_TARGET,
} from '../../config/referenceTargets';
import type {
  MetricTargetComparison,
  TargetEvaluationContext,
} from './guideTypes';

const BASELINE_DATA: Record<string, { value: string; familiar: string }> = {
  'galactic-coordinates': SOL_REFERENCE_TARGET.baselines.galacticCoordinates,
  'stellar-magnitude': SOL_REFERENCE_TARGET.baselines.stellarMagnitude,
  'stellar-mass': SOL_REFERENCE_TARGET.baselines.stellarMass,
  'stellar-radius': SOL_REFERENCE_TARGET.baselines.stellarRadius,
  'stellar-luminosity': SOL_REFERENCE_TARGET.baselines.stellarLuminosity,
  'effective-temperature': SOL_REFERENCE_TARGET.baselines.effectiveTemperature,
  'semi-major-axis': EARTH_REFERENCE_TARGET.baselines.semiMajorAxis,
  'orbital-period': EARTH_REFERENCE_TARGET.baselines.orbitalPeriod,
  'orbital-inclination': EARTH_REFERENCE_TARGET.baselines.orbitalInclination,
  'planetary-mass': EARTH_REFERENCE_TARGET.baselines.planetaryMass,
  'planetary-radius': EARTH_REFERENCE_TARGET.baselines.planetaryRadius,
  'equilibrium-temperature': EARTH_REFERENCE_TARGET.baselines.equilibriumTemperature,
  'surface-gravity': EARTH_REFERENCE_TARGET.baselines.surfaceGravity,
};

export const getMetricBaseline = (
  metricId: string,
): { baselineValue: string; baselineFamiliar: string } => {
  const data = BASELINE_DATA[metricId];
  return {
    baselineValue: data?.value ?? '',
    baselineFamiliar: data?.familiar ?? '',
  };
};

export const createUncataloguedComparison = (
  targetId: string,
  targetName: string,
  targetHref: string,
): MetricTargetComparison => ({
  targetId,
  targetName,
  targetHref,
  targetValue: '—',
  targetFamiliar: '—',
  relativeRatioLabel: '—',
  isCatalogued: false,
});

export function evaluateMetricForTarget(
  metricId: string,
  ctx: TargetEvaluationContext,
): MetricTargetComparison {
  const { targetId, targetName, targetHref, manifest, targetStar, targetPlanet } = ctx;
  let targetValue = '—';
  let targetFamiliar = '—';
  let relativeRatioLabel = '—';
  let isCatalogued = false;
  let numericValue: number | undefined;
  let unit: string | undefined;

  const setCat = (val: string, fam: string, ratio: string, num: number, u: string) => {
    targetValue = val;
    targetFamiliar = fam;
    relativeRatioLabel = ratio;
    isCatalogued = true;
    numericValue = num;
    unit = u;
  };

  switch (metricId) {
    case 'galactic-coordinates':
      if (manifest && Number.isFinite(manifest.x) && Number.isFinite(manifest.y) && Number.isFinite(manifest.z)) {
        const distPc = Number(Math.hypot(manifest.x, manifest.y, manifest.z).toFixed(2));
        const ly = (distPc * 3.2616).toFixed(2);
        setCat(`${distPc.toFixed(2)} pc`, `${ly} light-years (ly)`, `${ly} light-years from ${SOL_REFERENCE_TARGET.name}`, distPc, 'pc');
      }
      break;
    case 'stellar-magnitude':
      if (targetStar && Number.isFinite(targetStar.mag)) {
        const mag = Number(targetStar.mag.toFixed(2));
        const abs = Number.isFinite(targetStar.absmag) ? ` / ${targetStar.absmag.toFixed(2)} M_V` : '';
        const fam = mag <= 6.5 ? 'Naked-eye visible (V ≤ 6.5)' : 'Telescopic observation required';
        setCat(`${mag.toFixed(2)} V${abs}`, fam, `Δ${(mag - (-26.74)).toFixed(1)} mag relative to ${SOL_REFERENCE_TARGET.name}`, mag, 'V');
      }
      break;
    case 'stellar-mass':
      if (targetStar?.massMsun && targetStar.massMsun > 0) {
        const mass = Number(targetStar.massMsun.toFixed(2));
        setCat(`${mass.toFixed(2)} M☉`, `≈ ${Math.round(mass * 332950).toLocaleString()} ${EARTH_REFERENCE_TARGET.name} masses (M⊕)`, `${mass.toFixed(2)}× Solar mass`, mass, 'M☉');
      }
      break;
    case 'stellar-radius':
      if (targetStar?.radiusRsun && targetStar.radiusRsun > 0) {
        const radius = Number(targetStar.radiusRsun.toFixed(2));
        setCat(`${radius.toFixed(2)} R☉`, `≈ ${Math.round(radius * 695700).toLocaleString()} km (${(radius * 109.2).toFixed(1)} R⊕)`, `${radius.toFixed(2)}× Solar radius`, radius, 'R☉');
      }
      break;
    case 'stellar-luminosity':
      if (targetStar?.luminosityLsun && targetStar.luminosityLsun > 0) {
        const lum = Number(targetStar.luminosityLsun.toFixed(2));
        setCat(`${lum.toFixed(2)} L☉`, `≈ ${(lum * 3.828).toFixed(3)} × 10²⁶ W`, `${lum.toFixed(2)}× Solar luminosity`, lum, 'L☉');
      }
      break;
    case 'effective-temperature':
      if (targetStar?.effectiveTempK && targetStar.effectiveTempK > 0) {
        const t = targetStar.effectiveTempK;
        setCat(`${t.toLocaleString()} K`, `≈ ${Math.round(t - 273.15).toLocaleString()} °C`, `${(t / 5778).toFixed(2)}× Solar temperature`, t, 'K');
      }
      break;
    case 'semi-major-axis':
      if (targetPlanet?.orbit?.semiMajorAxis && targetPlanet.orbit.semiMajorAxis > 0) {
        const sma = Number(targetPlanet.orbit.semiMajorAxis.toFixed(3));
        setCat(`${sma.toFixed(3)} AU`, `${(sma * 8.3167).toFixed(2)} light-minutes (${(sma * 149.598).toFixed(1)}M km)`, `${sma.toFixed(2)}× ${EARTH_REFERENCE_TARGET.name} orbit`, sma, 'AU');
      }
      break;
    case 'orbital-period':
      if (targetPlanet?.orbit?.periodDays && targetPlanet.orbit.periodDays > 0) {
        const p = Number(targetPlanet.orbit.periodDays.toFixed(2));
        const y = (p / 365.25).toFixed(2);
        setCat(`${p.toFixed(2)} d`, `${y} ${EARTH_REFERENCE_TARGET.name} years (${(p / 30.4375).toFixed(1)} months)`, `${y}× ${EARTH_REFERENCE_TARGET.name} year`, p, 'd');
      }
      break;
    case 'orbital-inclination':
      if (targetPlanet?.orbit && Number.isFinite(targetPlanet.orbit.inclination)) {
        const inc = Number(targetPlanet.orbit.inclination.toFixed(2));
        const fam = inc === 0 ? 'Coplanar with system plane' : `${inc.toFixed(1)}° orbital tilt relative to plane`;
        setCat(`${inc.toFixed(2)}°`, fam, `${inc.toFixed(2)}° relative tilt`, inc, '°');
      }
      break;
    case 'planetary-mass':
      if (targetPlanet?.massMearth && targetPlanet.massMearth > 0) {
        const mass = Number(targetPlanet.massMearth.toFixed(2));
        setCat(`${mass.toFixed(2)} M⊕`, `≈ ${(mass * 5.972).toFixed(2)} × 10²⁴ kg`, `${mass.toFixed(2)}× ${EARTH_REFERENCE_TARGET.name} mass`, mass, 'M⊕');
      }
      break;
    case 'planetary-radius':
      if (targetPlanet?.radiusRearth && targetPlanet.radiusRearth > 0) {
        const r = Number(targetPlanet.radiusRearth.toFixed(2));
        setCat(`${r.toFixed(2)} R⊕`, `≈ ${Math.round(r * 6371).toLocaleString()} km mean radius`, `${r.toFixed(2)}× ${EARTH_REFERENCE_TARGET.name} radius`, r, 'R⊕');
      }
      break;
    case 'equilibrium-temperature':
      if (targetPlanet?.equilibriumTempK && targetPlanet.equilibriumTempK > 0) {
        const t = targetPlanet.equilibriumTempK;
        const c = Math.round(t - 273.15);
        setCat(`${t} K`, `≈ ${c} °C`, `${c >= 0 ? `+${c}` : c} °C surface equilibrium`, t, 'K');
      }
      break;
    case 'surface-gravity': {
      const rawG =
        targetPlanet?.surfaceGravityG && targetPlanet.surfaceGravityG > 0
          ? targetPlanet.surfaceGravityG
          : undefined;
      if (rawG !== undefined) {
        const g = Number(rawG.toFixed(2));
        setCat(`${g.toFixed(2)} g`, `≈ ${(g * 9.81).toFixed(2)} m/s²`, `${g.toFixed(2)}× ${EARTH_REFERENCE_TARGET.name} gravity`, g, 'g');
      }
      break;
    }
  }

  const reticleType: CelestialSymbolType = targetPlanet
    ? (targetPlanet.reticleType ?? 'terrestrial')
    : (targetStar?.reticleType ?? 'star');

  return {
    targetId,
    targetName,
    targetHref,
    targetValue,
    targetFamiliar,
    relativeRatioLabel,
    isCatalogued,
    numericValue,
    unit,
    reticleType,
  };
}
