/**
 * DEC-027: Guide Service
 * Strongly typed service for astronomical & telemetry reference guides (/guide/*).
 * Zero hardcoded magic inside views.
 */

import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  buildStarTypeGuideHref,
  buildPlanetTypeGuideHref,
  buildMetricGuideHref,
  buildHazardGuideHref,
  resolveHazardGuideEntry,
  METRIC_LABEL_TO_SLUG,
  resolveMetricSlugFromLabel,
  METRIC_ALIASES,
  STAR_TYPE_GUIDE_ENTRIES,
  PLANET_TYPE_GUIDE_ENTRIES,
  METRIC_GUIDE_ENTRIES,
  HAZARD_GUIDE_ENTRIES,
  type GuideExampleTarget,
  type StarTypeGuideEntry,
  type PlanetTypeGuideEntry,
  type MetricGuideEntry,
  type HazardGuideEntry,
  type GuideCatalogEntry,
  type PlanetCompositionClass,
} from '../data/guideCatalog';
import { getFocusedEntityDetails } from './detailsService';

export {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  buildStarTypeGuideHref,
  buildPlanetTypeGuideHref,
  buildMetricGuideHref,
  buildHazardGuideHref,
  resolveHazardGuideEntry,
  METRIC_LABEL_TO_SLUG,
  resolveMetricSlugFromLabel,
  METRIC_ALIASES,
  STAR_TYPE_GUIDE_ENTRIES,
  PLANET_TYPE_GUIDE_ENTRIES,
  METRIC_GUIDE_ENTRIES,
  HAZARD_GUIDE_ENTRIES,
  type GuideExampleTarget,
  type StarTypeGuideEntry,
  type PlanetTypeGuideEntry,
  type MetricGuideEntry,
  type HazardGuideEntry,
  type GuideCatalogEntry,
  type PlanetCompositionClass,
};

export interface DecodedStarSubtype {
  readonly spectralLetter: string;
  readonly subdivision?: string;
  readonly luminosityClass?: string;
  readonly luminosityLabel?: string;
}

export interface ResolvedStarTypeDetail {
  readonly requestedRaw: string;
  readonly entry: StarTypeGuideEntry;
  readonly decodedSubtype?: DecodedStarSubtype;
}

export interface MetricComparison {
  readonly metricId: string;
  readonly baselineName: 'Sol' | 'Earth';
  readonly baselineHref: string;
  readonly baselineValue: string;
  readonly baselineFamiliar: string;
  readonly targetId: string;
  readonly targetName: string;
  readonly targetHref: string;
  readonly targetValue: string;
  readonly targetFamiliar: string;
  readonly relativeRatioLabel: string;
  readonly isFromFocusedContext: boolean;
}

export interface SpectralCombinationResult {
  readonly combinedCode: string;
  readonly effectiveTempK: number;
  readonly chromaticityHex: string;
  readonly radiusRsun: number;
  readonly luminosityLsun: number;
  readonly habitableZoneAu: string;
  readonly classEffect: string;
  readonly subdivisionEffect: string;
  readonly luminosityEffect: string;
}


const SPECTRAL_LETTER_TO_ID: Record<string, string> = {
  O: 'o',
  B: 'b',
  A: 'a',
  F: 'f',
  G: 'g',
  K: 'k',
  M: 'm',
  L: 'l',
  T: 'l',
  Y: 'l',
  D: 'd',
};

export const getLuminosityLabel = (lumClass?: string): string | undefined => {
  if (!lumClass) return undefined;
  const normalized = lumClass.toUpperCase();
  if (normalized === 'I' || normalized === 'IA' || normalized === 'IB') {
    return 'Supergiant';
  }
  if (normalized === 'II') {
    return 'Bright Giant';
  }
  if (normalized === 'III') {
    return 'Giant';
  }
  if (normalized === 'IV') {
    return 'Subgiant';
  }
  if (normalized === 'V') {
    return 'Main-Sequence Dwarf';
  }
  if (normalized === 'VI' || normalized === 'SD') {
    return 'Subdwarf';
  }
  if (normalized === 'VII' || normalized === 'D') {
    return 'White Dwarf';
  }
  return undefined;
};

const YERKES_REGEX = /^([OBAFGKMLTYD])([A-Z])?(\d+(?:\.\d+)?)?\s*(Ia|Ib|VII|VI|V|IV|III|II|I)?([a-z]+)?$/i;

/**
 * Resolves a raw star type slug into a strongly typed detail record,
 * decoding Yerkes spectral letters, subdivisions, and luminosity classes.
 */
export const resolveStarTypeGuideEntry = (
  rawSlug: string,
): ResolvedStarTypeDetail | null => {
  if (!rawSlug) return null;
  const trimmed = rawSlug.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const directId = lower === 'lty' ? 'l' : lower;
  const directEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === directId);
  if (directEntry) {
    return {
      requestedRaw: trimmed,
      entry: directEntry,
    };
  }

  // Parse Yerkes spectral string (e.g. G8.5V, g2v, M5.5Ve, DA2, K1V)
  const match = YERKES_REGEX.exec(trimmed);
  if (!match) return null;

  const spectralLetter = match[1].toUpperCase();
  const entryId = SPECTRAL_LETTER_TO_ID[spectralLetter];
  if (!entryId) return null;

  const entry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === entryId);
  if (!entry) return null;

  const subdivision = match[3] || undefined;
  let luminosityClass = match[4]
    ? match[4].length === 2 && match[4].toLowerCase().startsWith('i') && (match[4].endsWith('a') || match[4].endsWith('b'))
      ? `${match[4][0].toUpperCase()}${match[4][1].toLowerCase()}`
      : match[4].toUpperCase()
    : undefined;

  // White dwarfs (D) default to luminosity class VII when not otherwise specified
  if (spectralLetter === 'D' && !luminosityClass) {
    luminosityClass = 'VII';
  }

  const luminosityLabel = getLuminosityLabel(luminosityClass);

  if (subdivision || luminosityClass) {
    return {
      requestedRaw: trimmed,
      entry,
      decodedSubtype: {
        spectralLetter,
        subdivision,
        luminosityClass,
        luminosityLabel,
      },
    };
  }

  return {
    requestedRaw: trimmed,
    entry,
  };
};

/**
 * Resolves a planetary composition slug into its authoritative guide entry.
 */
export const resolvePlanetTypeGuideEntry = (
  rawSlug: string,
): PlanetTypeGuideEntry | null => {
  if (!rawSlug) return null;
  const trimmed = rawSlug.trim().toLowerCase();
  if (!trimmed) return null;

  const entry = PLANET_TYPE_GUIDE_ENTRIES.find((e) => e.id === trimmed);
  return entry ?? null;
};


/**
 * Resolves a telemetry metric slug into its authoritative guide entry,
 * accommodating shorthand/legacy metric aliases.
 */
export const resolveMetricGuideEntry = (
  rawSlug: string,
): MetricGuideEntry | null => {
  if (!rawSlug) return null;
  const trimmed = rawSlug.trim().toLowerCase();
  if (!trimmed) return null;

  const canonicalId = METRIC_ALIASES[trimmed] ?? trimmed;
  const entry = METRIC_GUIDE_ENTRIES.find((e) => e.id === canonicalId);
  return entry ?? null;
};

interface ClassBaseData {
  readonly temp0: number;
  readonly temp9: number;
  readonly baseRadius: number;
  readonly classEffect: string;
  readonly hex: string;
}

const CLASS_BASE_DATA: Record<string, ClassBaseData> = {
  O: {
    temp0: 50000,
    temp9: 30000,
    baseRadius: 10.0,
    classEffect:
      'Class O establishes an extreme high-mass ionizing ultraviolet regime (> 30,000 K) with ionized helium lines.',
    hex: '#9bb0ff',
  },
  B: {
    temp0: 30000,
    temp9: 10000,
    baseRadius: 4.5,
    classEffect:
      'Class B establishes a hot luminous blue-white regime (10,000–30,000 K) characterized by neutral helium.',
    hex: '#aabfff',
  },
  A: {
    temp0: 10000,
    temp9: 7500,
    baseRadius: 1.8,
    classEffect:
      'Class A establishes a white photospheric regime (7,500–10,000 K) dominated by prominent hydrogen Balmer lines.',
    hex: '#cad7ff',
  },
  F: {
    temp0: 7500,
    temp9: 6000,
    baseRadius: 1.3,
    classEffect:
      'Class F establishes a yellow-white regime (6,000–7,500 K) with developing ionized metal absorption spectra.',
    hex: '#f8f7ff',
  },
  G: {
    temp0: 6000,
    temp9: 5200,
    baseRadius: 1.0,
    classEffect:
      'Class G establishes a solar-type yellow regime (5,200–6,000 K) with neutral iron and ionized calcium lines.',
    hex: '#fff4ea',
  },
  K: {
    temp0: 5200,
    temp9: 3700,
    baseRadius: 0.8,
    classEffect:
      'Class K establishes an orange dwarf regime (3,700–5,200 K) offering billions of years of stable irradiance.',
    hex: '#ffd2a1',
  },
  M: {
    temp0: 3700,
    temp9: 2400,
    baseRadius: 0.35,
    classEffect:
      'Class M establishes a cool red dwarf regime (< 3,700 K) dominated by titanium oxide molecular bands.',
    hex: '#ffcc6f',
  },
  L: {
    temp0: 2400,
    temp9: 1300,
    baseRadius: 0.1,
    classEffect:
      'Class L/T/Y establishes a substellar brown dwarf regime (< 2,400 K) cooling across infrared wavelengths.',
    hex: '#ff6b3d',
  },
  D: {
    temp0: 30000,
    temp9: 8000,
    baseRadius: 0.012,
    classEffect:
      'Class D establishes an electron-degenerate white dwarf core remnant cooling via radiative leakage.',
    hex: '#e6f0ff',
  },
};

const LUMINOSITY_MULTIPLIERS: Record<string, number> = {
  I: 50.0,
  IA: 50.0,
  IB: 40.0,
  II: 25.0,
  III: 12.0,
  IV: 2.5,
  V: 1.0,
  VI: 0.8,
  SD: 0.8,
  VII: 0.012,
  D: 0.012,
};

/**
 * Pure physics & astrophysics computation helper for the interactive
 * 3-slice Yerkes Spectral Combinator on StarTypeDetailView.
 */
export const computeSpectralCombination = (
  spectralLetter: string,
  subdivision: string,
  luminosityClass: string,
): SpectralCombinationResult => {
  const letter = (spectralLetter.trim().toUpperCase() || 'G')[0];
  const data = CLASS_BASE_DATA[letter] ?? CLASS_BASE_DATA.G;

  const rawSub = Number.parseFloat(subdivision);
  const subNum = Number.isFinite(rawSub) ? Math.max(0, Math.min(9.9, rawSub)) : 2;

  // Temperature interpolation between subdivision 0 (hot) and 9 (cool)
  const effectiveTempK = Math.round(data.temp0 - (subNum / 10) * (data.temp0 - data.temp9));

  // Radius calculation
  const lumKey = luminosityClass.trim().toUpperCase() || 'V';
  let radiusRsun: number;
  if (letter === 'D' || lumKey === 'VII' || lumKey === 'D') {
    radiusRsun = 0.012;
  } else {
    const mult = LUMINOSITY_MULTIPLIERS[lumKey] ?? 1.0;
    radiusRsun = Number((data.baseRadius * mult).toFixed(3));
  }

  // Luminosity scaling: L ∝ R^2 * (T / 5778)^4
  const tempRatio = effectiveTempK / 5778;
  const rawLum = radiusRsun * radiusRsun * Math.pow(tempRatio, 4);
  let luminosityLsun: number;
  if (rawLum >= 100) {
    luminosityLsun = Math.round(rawLum);
  } else if (rawLum >= 1) {
    luminosityLsun = Number(rawLum.toFixed(2));
  } else if (rawLum >= 0.001) {
    luminosityLsun = Number(rawLum.toFixed(4));
  } else {
    luminosityLsun = Number(rawLum.toExponential(2));
  }

  // Habitable zone bounds: 0.95 * sqrt(L) to 1.4 * sqrt(L)
  const sqrtL = Math.sqrt(Math.max(rawLum, 1e-8));
  let habitableZoneAu: string;
  if (rawLum < 0.0001) {
    habitableZoneAu = '< 0.05 AU';
  } else {
    const inner = (0.95 * sqrtL).toFixed(2);
    const outer = (1.4 * sqrtL).toFixed(2);
    habitableZoneAu = `${inner}–${outer} AU`;
  }

  const lumLabel = getLuminosityLabel(lumKey) ?? 'Dwarf';
  const combinedCode = `${letter}${subdivision}${lumKey}`;

  return {
    combinedCode,
    effectiveTempK,
    chromaticityHex: data.hex,
    radiusRsun,
    luminosityLsun,
    habitableZoneAu,
    classEffect: data.classEffect,
    subdivisionEffect: `Subdivision ${subdivision} scales effective temperature within class ${letter} (${data.temp0.toLocaleString()} K at 0 to ${data.temp9.toLocaleString()} K at 9).`,
    luminosityEffect: `Luminosity Class ${lumKey} (${lumLabel}) sets physical radius (${radiusRsun} R☉) and bolometric output (${luminosityLsun} L☉).`,
  };
};

/**
 * Context-aware telemetry metric comparison helper (DEC-028).
 * Resolves a telemetry metric against a standard Solar System baseline (Sol or Earth)
 * and compares it with a focused celestial body or default benchmark system (Tau Ceti / Tau Ceti e).
 */
export const resolveMetricComparison = (
  rawMetricSlug: string,
  focusedEntityId?: string,
): MetricComparison | null => {
  const metric = resolveMetricGuideEntry(rawMetricSlug);
  if (!metric) return null;

  const isFromFocusedContext = Boolean(focusedEntityId && focusedEntityId.trim());
  const isOrbitalOrPlanetary = metric.category === 'Orbital & Planetary Telemetry';

  let targetId = focusedEntityId?.trim();
  if (!targetId) {
    targetId = isOrbitalOrPlanetary ? 'tau-ceti-e' : 'tau-ceti';
  }

  const details = getFocusedEntityDetails(targetId);
  const targetName =
    details?.name ??
    (targetId === 'tau-ceti-e'
      ? 'Tau Ceti e'
      : targetId === 'tau-ceti'
        ? 'Tau Ceti'
        : targetId);

  const targetHref =
    details?.systemDetailsHref ??
    (isOrbitalOrPlanetary
      ? `/system/tau-ceti?focus=${encodeURIComponent(targetId)}`
      : `/system/${encodeURIComponent(targetId)}`);

  const baselineName = metric.comparisonBaselineLabel;
  const baselineHref = baselineName === 'Sol' ? '/system/sol' : '/planet/earth';

  let baselineValue = '';
  let baselineFamiliar = '';
  let targetValue = '';
  let targetFamiliar = '';
  let relativeRatioLabel = '';

  switch (metric.id) {
    case 'galactic-coordinates': {
      baselineValue = '0.00 pc';
      baselineFamiliar = '0.00 light-years (ly)';
      const coords = details?.coordinatesPc ?? [3.154, 1.539, -1.002];
      const distPc = Math.hypot(coords[0], coords[1], coords[2]);
      const ly = distPc * 3.2616;
      targetValue = `${distPc.toFixed(2)} pc`;
      targetFamiliar = `${ly.toFixed(2)} light-years (ly)`;
      relativeRatioLabel = `${ly.toFixed(2)} light-years from Sol`;
      break;
    }
    case 'stellar-magnitude': {
      baselineValue = '-26.74 V / +4.83 M_V';
      baselineFamiliar = 'Brightest celestial body from Earth';
      const star = details?.starTelemetry ?? details?.stars?.[0];
      const mag = star?.mag ?? 3.5;
      const absmag = star?.absmag ?? 5.68;
      targetValue = `${mag.toFixed(2)} V / ${absmag.toFixed(2)} M_V`;
      targetFamiliar = mag <= 6.5 ? 'Naked-eye visible (V ≤ 6.5)' : 'Telescopic observation required';
      const deltaMag = mag - (-26.74);
      relativeRatioLabel = `Δ${deltaMag.toFixed(1)} mag relative to Sol`;
      break;
    }
    case 'stellar-mass': {
      baselineValue = '1.00 M☉';
      baselineFamiliar = '332,950 M⊕ (1.989 × 10³⁰ kg)';
      const mass = details?.starTelemetry?.massMsun ?? details?.stars?.[0]?.massMsun ?? 0.783;
      targetValue = `${mass.toFixed(2)} M☉`;
      const earthMasses = Math.round(mass * 332950);
      targetFamiliar = `≈ ${earthMasses.toLocaleString()} Earth masses (M⊕)`;
      relativeRatioLabel = `${mass.toFixed(2)}× Solar mass`;
      break;
    }
    case 'stellar-radius': {
      baselineValue = '1.00 R☉';
      baselineFamiliar = '109.2 R⊕ (695,700 km)';
      const radius = details?.starTelemetry?.radiusRsun ?? details?.stars?.[0]?.radiusRsun ?? 0.793;
      targetValue = `${radius.toFixed(2)} R☉`;
      const km = Math.round(radius * 695700);
      targetFamiliar = `≈ ${km.toLocaleString()} km (${(radius * 109.2).toFixed(1)} R⊕)`;
      relativeRatioLabel = `${radius.toFixed(2)}× Solar radius`;
      break;
    }
    case 'stellar-luminosity': {
      baselineValue = '1.00 L☉';
      baselineFamiliar = '3.828 × 10²⁶ W (1.0× Solar bolometric output)';
      const lum = details?.starTelemetry?.luminosityLsun ?? details?.stars?.[0]?.luminosityLsun ?? 0.52;
      targetValue = `${lum.toFixed(2)} L☉`;
      const w = (lum * 3.828).toFixed(3);
      targetFamiliar = `≈ ${w} × 10²⁶ W`;
      relativeRatioLabel = `${lum.toFixed(2)}× Solar luminosity`;
      break;
    }
    case 'effective-temperature': {
      baselineValue = '5,778 K';
      baselineFamiliar = '5,505 °C (9,940 °F)';
      const tempK = details?.starTelemetry?.effectiveTempK ?? details?.stars?.[0]?.effectiveTempK ?? 5344;
      const celsius = Math.round(tempK - 273.15);
      targetValue = `${tempK.toLocaleString()} K`;
      targetFamiliar = `≈ ${celsius.toLocaleString()} °C`;
      relativeRatioLabel = `${(tempK / 5778).toFixed(2)}× Solar temperature`;
      break;
    }
    case 'semi-major-axis': {
      baselineValue = '1.000 AU';
      baselineFamiliar = '8.32 light-minutes (149.6M km)';
      const sma = details?.planetTelemetry?.semiMajorAxisAu ?? details?.planets?.[0]?.semiMajorAxisAu ?? 0.538;
      const lightMinutes = (sma * 8.3167).toFixed(2);
      const millionKm = (sma * 149.598).toFixed(1);
      targetValue = `${sma.toFixed(3)} AU`;
      targetFamiliar = `${lightMinutes} light-minutes (${millionKm}M km)`;
      relativeRatioLabel = `${sma.toFixed(2)}× Earth orbit`;
      break;
    }
    case 'orbital-period': {
      baselineValue = '365.25 d';
      baselineFamiliar = '1.00 Earth year (12 months)';
      const period = details?.planetTelemetry?.periodDays ?? details?.planets?.[0]?.periodDays ?? 162.87;
      const years = (period / 365.25).toFixed(2);
      targetValue = `${period.toFixed(2)} d`;
      targetFamiliar = `${years} Earth years (${(period / 30.4375).toFixed(1)} months)`;
      relativeRatioLabel = `${years}× Earth year`;
      break;
    }
    case 'orbital-inclination': {
      baselineValue = '0.00°';
      baselineFamiliar = 'Coplanar ecliptic reference';
      const inc = details?.planetTelemetry?.inclinationDeg ?? details?.planets?.[0]?.inclinationDeg ?? 0.0;
      targetValue = `${inc.toFixed(2)}°`;
      targetFamiliar = inc === 0 ? 'Coplanar with system plane' : `${inc.toFixed(1)}° orbital tilt relative to plane`;
      relativeRatioLabel = `${inc.toFixed(2)}° relative tilt`;
      break;
    }
    case 'planetary-mass': {
      baselineValue = '1.00 M⊕';
      baselineFamiliar = '5.972 × 10²⁴ kg (1.0× Earth mass)';
      const mass = details?.planetTelemetry?.massMearth ?? details?.planets?.[0]?.massMearth ?? 3.93;
      targetValue = `${mass.toFixed(2)} M⊕`;
      targetFamiliar = `≈ ${(mass * 5.972).toFixed(2)} × 10²⁴ kg`;
      relativeRatioLabel = `${mass.toFixed(2)}× Earth mass`;
      break;
    }
    case 'planetary-radius': {
      baselineValue = '1.00 R⊕';
      baselineFamiliar = '6,371 km radius (12,742 km dia)';
      const radius = details?.planetTelemetry?.radiusRearth ?? details?.planets?.[0]?.radiusRearth ?? 1.81;
      targetValue = `${radius.toFixed(2)} R⊕`;
      const km = Math.round(radius * 6371);
      targetFamiliar = `≈ ${km.toLocaleString()} km mean radius`;
      relativeRatioLabel = `${radius.toFixed(2)}× Earth radius`;
      break;
    }
    case 'equilibrium-temperature': {
      baselineValue = '255 K';
      baselineFamiliar = '−18 °C (−0.4 °F)';
      const tEq = details?.planetTelemetry?.equilibriumTempK ?? details?.planets?.[0]?.equilibriumTempK ?? 282;
      const celsius = Math.round(tEq - 273.15);
      targetValue = `${tEq} K`;
      targetFamiliar = `≈ ${celsius} °C`;
      relativeRatioLabel = `${celsius >= 0 ? `+${celsius}` : celsius} °C surface equilibrium`;
      break;
    }
    case 'surface-gravity': {
      baselineValue = '1.00 g';
      baselineFamiliar = '1.00 g (9.81 m/s²)';
      const g =
        details?.planetTelemetry?.surfaceGravityG ??
        (details?.planets?.[0]?.massMearth && details?.planets?.[0]?.radiusRearth
          ? Math.round(
              (details.planets[0].massMearth /
                (details.planets[0].radiusRearth * details.planets[0].radiusRearth)) *
                100,
            ) / 100
          : 1.2);
      targetValue = `${g.toFixed(2)} g`;
      targetFamiliar = `≈ ${(g * 9.81).toFixed(2)} m/s²`;
      relativeRatioLabel = `${g.toFixed(2)}× Earth gravity`;
      break;
    }
    default:
      return null;
  }

  return {
    metricId: metric.id,
    baselineName,
    baselineHref,
    baselineValue,
    baselineFamiliar,
    targetId,
    targetName,
    targetHref,
    targetValue,
    targetFamiliar,
    relativeRatioLabel,
    isFromFocusedContext,
  };
};

