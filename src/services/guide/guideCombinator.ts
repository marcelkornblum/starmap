/**
 * DEC-027 / Phase 3.3A-1: Guide Spectral Combinator
 * Pure physics & astrophysics computation helper for the interactive
 * 3-slice Yerkes Spectral Combinator.
 */

import type { SpectralCombinationResult } from './guideTypes';

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

interface ClassBaseData {
  readonly temp0: number;
  readonly temp9: number;
  readonly baseRadius: number;
  readonly classEffect: string;
  readonly chromaticityToken: string;
}

const G_CLASS_BASE_DATA: ClassBaseData = {
  temp0: 6000,
  temp9: 5200,
  baseRadius: 1.0,
  classEffect:
    'Class G establishes a solar-type yellow regime (5,200–6,000 K) with neutral iron and ionized calcium lines.',
  chromaticityToken: 'var(--star-chromaticity-g)',
};

const CLASS_BASE_DATA: Record<string, ClassBaseData> = {
  O: {
    temp0: 50000,
    temp9: 30000,
    baseRadius: 10.0,
    classEffect:
      'Class O establishes an extreme high-mass ionizing ultraviolet regime (> 30,000 K) with ionized helium lines.',
    chromaticityToken: 'var(--star-chromaticity-o)',
  },
  B: {
    temp0: 30000,
    temp9: 10000,
    baseRadius: 4.5,
    classEffect:
      'Class B establishes a hot luminous blue-white regime (10,000–30,000 K) characterized by neutral helium.',
    chromaticityToken: 'var(--star-chromaticity-b)',
  },
  A: {
    temp0: 10000,
    temp9: 7500,
    baseRadius: 1.8,
    classEffect:
      'Class A establishes a white photospheric regime (7,500–10,000 K) dominated by prominent hydrogen Balmer lines.',
    chromaticityToken: 'var(--star-chromaticity-a)',
  },
  F: {
    temp0: 7500,
    temp9: 6000,
    baseRadius: 1.3,
    classEffect:
      'Class F establishes a yellow-white regime (6,000–7,500 K) with developing ionized metal absorption spectra.',
    chromaticityToken: 'var(--star-chromaticity-f)',
  },
  G: G_CLASS_BASE_DATA,
  K: {
    temp0: 5200,
    temp9: 3700,
    baseRadius: 0.8,
    classEffect:
      'Class K establishes an orange dwarf regime (3,700–5,200 K) offering billions of years of stable irradiance.',
    chromaticityToken: 'var(--star-chromaticity-k)',
  },
  M: {
    temp0: 3700,
    temp9: 2400,
    baseRadius: 0.35,
    classEffect:
      'Class M establishes a cool red dwarf regime (< 3,700 K) dominated by titanium oxide molecular bands.',
    chromaticityToken: 'var(--star-chromaticity-m)',
  },
  L: {
    temp0: 2400,
    temp9: 1300,
    baseRadius: 0.1,
    classEffect:
      'Class L/T/Y establishes a substellar brown dwarf regime (< 2,400 K) cooling across infrared wavelengths.',
    chromaticityToken: 'var(--star-chromaticity-l)',
  },
  D: {
    temp0: 30000,
    temp9: 8000,
    baseRadius: 0.012,
    classEffect:
      'Class D establishes an electron-degenerate white dwarf core remnant cooling via radiative leakage.',
    chromaticityToken: 'var(--star-chromaticity-d)',
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

const DEFAULT_LUMINOSITY_MULTIPLIER = 1.0;

/**
 * Pure physics & astrophysics computation helper for the interactive
 * 3-slice Yerkes Spectral Combinator on StarTypeDetailView.
 */
export const computeSpectralCombination = (
  spectralLetter: string,
  subdivision: string,
  luminosityClass: string,
): SpectralCombinationResult => {
  const letter = (spectralLetter.trim().toUpperCase() || 'G').charAt(0);
  const data = CLASS_BASE_DATA[letter] ?? G_CLASS_BASE_DATA;

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
    const mult = LUMINOSITY_MULTIPLIERS[lumKey] ?? DEFAULT_LUMINOSITY_MULTIPLIER;
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
    chromaticityToken: data.chromaticityToken,
    radiusRsun,
    luminosityLsun,
    habitableZoneAu,
    classEffect: data.classEffect,
    subdivisionEffect: `Subdivision ${subdivision} scales effective temperature within class ${letter} (${data.temp0.toLocaleString()} K at 0 to ${data.temp9.toLocaleString()} K at 9).`,
    luminosityEffect: `Luminosity Class ${lumKey} (${lumLabel}) sets physical radius (${radiusRsun} R☉) and bolometric output (${luminosityLsun} L☉).`,
  };
};

export const combineStarSpectralAndLuminosity = computeSpectralCombination;
