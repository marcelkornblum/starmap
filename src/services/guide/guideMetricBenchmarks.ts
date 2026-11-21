/**
 * DEC-027 / Phase 3.3A-1: Guide Metric Benchmarks & Target Evaluation
 * Evaluation of stellar, orbital, and planetary telemetry against dataset-derived reference baselines.
 */

import type { CelestialSymbolType } from '../../types/astro';
import type { ReferenceBaselinesDataset } from '../../types/guideData';
import {
  EARTH_REFERENCE_TARGET,
  SOL_REFERENCE_TARGET,
} from '../../config/referenceTargets';
import { getCachedReferenceBaselines } from '../../data/referenceBaselinesRepository';
import { formatSlugFallbackTitle } from '../../utils/starNaming';
import type {
  MetricTargetComparison,
  TargetEvaluationContext,
} from './guideTypes';

// Standard SI & IAU unit conversion constants (not entity attributes)
const PARSEC_TO_LY = 3.2616;
const KELVIN_CELSIUS_OFFSET = 273.15;
const STANDARD_GRAVITY_MS2 = 9.81;
const AU_LIGHT_MINUTES = 8.3167;
const AU_MILLION_KM = 149.598;
const MSUN_TO_MEARTH = 332950;
const RSUN_KM = 695700;
const RSUN_TO_REARTH = 109.2;
const LSUN_W_E26 = 3.828;
const MEARTH_KG_E24 = 5.972;
const REARTH_KM = 6371;
const NAKED_EYE_MAG_LIMIT = 6.5;

export const getMetricBaseline = (
  metricId: string,
  baselines: ReferenceBaselinesDataset | undefined = getCachedReferenceBaselines(),
): { baselineValue: string; baselineFamiliar: string } => {
  const data = baselines?.metrics[metricId];
  return {
    baselineValue: data?.value ?? '—',
    baselineFamiliar: data?.familiar ?? '—',
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
  baselines: ReferenceBaselinesDataset | undefined = getCachedReferenceBaselines(),
): MetricTargetComparison {
  const { targetId, targetName, targetHref, manifest, targetStar, targetPlanet } = ctx;
  const solName =
    baselines?.targets.sol.name ?? formatSlugFallbackTitle(SOL_REFERENCE_TARGET.id);
  const earthName =
    baselines?.targets.earth.name ?? formatSlugFallbackTitle(EARTH_REFERENCE_TARGET.id);
  const solVisualMag = baselines?.targets.sol.visualMagnitude.value;
  const solEffectiveTempK = baselines?.targets.sol.effectiveTempK.value;
  const earthPeriodDays = baselines?.targets.earth.periodDays.value;

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
        const ly = (distPc * PARSEC_TO_LY).toFixed(2);
        setCat(`${distPc.toFixed(2)} pc`, `${ly} light-years (ly)`, `${ly} light-years from ${solName}`, distPc, 'pc');
      }
      break;
    case 'stellar-magnitude':
      if (targetStar && Number.isFinite(targetStar.mag)) {
        const mag = Number(targetStar.mag.toFixed(2));
        const abs = Number.isFinite(targetStar.absmag) ? ` / ${targetStar.absmag.toFixed(2)} M_V` : '';
        const fam = mag <= NAKED_EYE_MAG_LIMIT ? `Naked-eye visible (V ≤ ${NAKED_EYE_MAG_LIMIT})` : 'Telescopic observation required';
        const ratio =
          solVisualMag !== undefined
            ? `Δ${(mag - solVisualMag).toFixed(1)} mag relative to ${solName}`
            : '—';
        setCat(`${mag.toFixed(2)} V${abs}`, fam, ratio, mag, 'V');
      }
      break;
    case 'stellar-mass':
      if (targetStar?.massMsun && targetStar.massMsun > 0) {
        const mass = Number(targetStar.massMsun.toFixed(2));
        setCat(`${mass.toFixed(2)} M☉`, `≈ ${Math.round(mass * MSUN_TO_MEARTH).toLocaleString()} ${earthName} masses (M⊕)`, `${mass.toFixed(2)}× Solar mass`, mass, 'M☉');
      }
      break;
    case 'stellar-radius':
      if (targetStar?.radiusRsun && targetStar.radiusRsun > 0) {
        const radius = Number(targetStar.radiusRsun.toFixed(2));
        setCat(`${radius.toFixed(2)} R☉`, `≈ ${Math.round(radius * RSUN_KM).toLocaleString()} km (${(radius * RSUN_TO_REARTH).toFixed(1)} R⊕)`, `${radius.toFixed(2)}× Solar radius`, radius, 'R☉');
      }
      break;
    case 'stellar-luminosity':
      if (targetStar?.luminosityLsun && targetStar.luminosityLsun > 0) {
        const lum = Number(targetStar.luminosityLsun.toFixed(2));
        setCat(`${lum.toFixed(2)} L☉`, `≈ ${(lum * LSUN_W_E26).toFixed(3)} × 10²⁶ W`, `${lum.toFixed(2)}× Solar luminosity`, lum, 'L☉');
      }
      break;
    case 'effective-temperature':
      if (targetStar?.effectiveTempK && targetStar.effectiveTempK > 0) {
        const t = targetStar.effectiveTempK;
        const ratio =
          solEffectiveTempK !== undefined && solEffectiveTempK > 0
            ? `${(t / solEffectiveTempK).toFixed(2)}× Solar temperature`
            : '—';
        setCat(`${t.toLocaleString()} K`, `≈ ${Math.round(t - KELVIN_CELSIUS_OFFSET).toLocaleString()} °C`, ratio, t, 'K');
      }
      break;
    case 'semi-major-axis':
      if (targetPlanet?.orbit?.semiMajorAxis && targetPlanet.orbit.semiMajorAxis > 0) {
        const sma = Number(targetPlanet.orbit.semiMajorAxis.toFixed(3));
        setCat(`${sma.toFixed(3)} AU`, `${(sma * AU_LIGHT_MINUTES).toFixed(2)} light-minutes (${(sma * AU_MILLION_KM).toFixed(1)}M km)`, `${sma.toFixed(2)}× ${earthName} orbit`, sma, 'AU');
      }
      break;
    case 'orbital-period':
      if (targetPlanet?.orbit?.periodDays && targetPlanet.orbit.periodDays > 0) {
        const p = Number(targetPlanet.orbit.periodDays.toFixed(2));
        const fam =
          earthPeriodDays !== undefined && earthPeriodDays > 0
            ? `${(p / earthPeriodDays).toFixed(2)} ${earthName} years (${(p / (earthPeriodDays / 12)).toFixed(1)} months)`
            : `${p.toFixed(2)} days`;
        const ratio =
          earthPeriodDays !== undefined && earthPeriodDays > 0
            ? `${(p / earthPeriodDays).toFixed(2)}× ${earthName} year`
            : '—';
        setCat(`${p.toFixed(2)} d`, fam, ratio, p, 'd');
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
        setCat(`${mass.toFixed(2)} M⊕`, `≈ ${(mass * MEARTH_KG_E24).toFixed(2)} × 10²⁴ kg`, `${mass.toFixed(2)}× ${earthName} mass`, mass, 'M⊕');
      }
      break;
    case 'planetary-radius':
      if (targetPlanet?.radiusRearth && targetPlanet.radiusRearth > 0) {
        const r = Number(targetPlanet.radiusRearth.toFixed(2));
        setCat(`${r.toFixed(2)} R⊕`, `≈ ${Math.round(r * REARTH_KM).toLocaleString()} km mean radius`, `${r.toFixed(2)}× ${earthName} radius`, r, 'R⊕');
      }
      break;
    case 'equilibrium-temperature':
      if (targetPlanet?.equilibriumTempK && targetPlanet.equilibriumTempK > 0) {
        const t = targetPlanet.equilibriumTempK;
        const c = Math.round(t - KELVIN_CELSIUS_OFFSET);
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
        setCat(`${g.toFixed(2)} g`, `≈ ${(g * STANDARD_GRAVITY_MS2).toFixed(2)} m/s²`, `${g.toFixed(2)}× ${earthName} gravity`, g, 'g');
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
