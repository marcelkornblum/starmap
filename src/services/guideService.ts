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
} from '../content/guide';
import {
  getCachedDetailRecord,
  fetchDetailRecord,
} from '../data/detailsRepository';
import {
  getCachedCorpusForFilter,
  loadSearchCorpusForFilter,
} from '../data/searchRepository';
import { toUrlSlug, findFocusedEntryInCorpus } from './searchService';
import { formatSlugFallbackTitle } from '../utils/nomenclature';
import type {
  SystemManifest,
  StellarComponent,
  ExoplanetRecord,
  CelestialSymbolType,
} from '../types/astro';
import {
  SOL_REFERENCE_TARGET,
  EARTH_REFERENCE_TARGET,
  DEFAULT_GUIDE_BENCHMARKS,
} from '../config/referenceTargets';

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

export const extractFocusIdFromSearch = (search: string): string => {
  const match = /[?&]focus=([^&#]+)/i.exec(search.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
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

export interface MetricTargetComparison {
  readonly targetId: string;
  readonly targetName: string;
  readonly targetHref: string;
  readonly targetValue: string;
  readonly targetFamiliar: string;
  readonly relativeRatioLabel: string;
  readonly isCatalogued: boolean;
  readonly numericValue?: number;
  readonly unit?: string;
  readonly reticleType?: CelestialSymbolType;
}

export interface MetricComparison {
  readonly metricId: string;
  readonly baselineName: 'Sol' | 'Earth';
  readonly baselineHref: string;
  readonly baselineValue: string;
  readonly baselineFamiliar: string;
  readonly baselineNumericValue?: number;
  readonly baselineUnit?: string;
  readonly baselineReticleType?: CelestialSymbolType;
  readonly targetId: string;
  readonly targetName: string;
  readonly targetHref: string;
  readonly targetValue: string;
  readonly targetFamiliar: string;
  readonly targetNumericValue?: number;
  readonly targetUnit?: string;
  readonly targetReticleType?: CelestialSymbolType;
  readonly relativeRatioLabel: string;
  readonly isFromFocusedContext: boolean;
  readonly isCatalogued?: boolean;
  readonly targets?: readonly MetricTargetComparison[];
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
 * Handles compound strings (e.g. G2V+K1V) by resolving the primary component.
 */
export const resolveStarTypeGuideEntry = (
  rawSlug: string,
): ResolvedStarTypeDetail | null => {
  if (!rawSlug) return null;
  const rawTrimmed = rawSlug.trim();
  if (!rawTrimmed) return null;

  const trimmed = rawTrimmed.includes('+')
    ? (rawTrimmed.split('+')[0] ?? '').trim()
    : rawTrimmed;
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const directId = lower === 'lty' ? 'l' : lower;
  const directEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === directId);
  if (directEntry) {
    return {
      requestedRaw: rawTrimmed,
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
      requestedRaw: rawTrimmed,
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
    requestedRaw: rawTrimmed,
    entry,
  };
};

/**
 * Resolves multi-value star type slug (e.g. 'G2V,K1V' or 'G2V+K1V') into an array
 * of strongly typed detail records, deduplicated by classification.
 */
export const resolveStarTypeGuideEntries = (
  rawSlug: string,
): ResolvedStarTypeDetail[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: ResolvedStarTypeDetail[] = [];
  for (const token of tokens) {
    const resolved = resolveStarTypeGuideEntry(token);
    if (resolved) {
      const key = `${resolved.entry.id}:${resolved.decodedSubtype?.subdivision ?? ''}:${resolved.decodedSubtype?.luminosityClass ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(resolved);
      }
    }
  }
  return results;
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
 * Resolves multi-value planet type slugs (e.g. 'terrestrial,super-earth')
 * into an array of authoritative guide entries.
 */
export const resolvePlanetTypeGuideEntries = (
  rawSlug: string,
): PlanetTypeGuideEntry[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: PlanetTypeGuideEntry[] = [];
  for (const token of tokens) {
    const entry = resolvePlanetTypeGuideEntry(token);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      results.push(entry);
    }
  }
  return results;
};

/**
 * Resolves multi-value environmental hazard slugs (e.g. 'high-gravity,tidal-locking')
 * into an array of authoritative guide entries.
 */
export const resolveHazardGuideEntries = (
  rawSlug: string,
): HazardGuideEntry[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: HazardGuideEntry[] = [];
  for (const token of tokens) {
    const entry = resolveHazardGuideEntry(token);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      results.push(entry);
    }
  }
  return results;
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

/**
 * Resolves multi-value telemetry metric slugs (e.g. 'stellar-mass,stellar-radius')
 * into an array of authoritative guide entries.
 */
export const resolveMetricGuideEntries = (
  rawSlug: string,
): MetricGuideEntry[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: MetricGuideEntry[] = [];
  for (const token of tokens) {
    const entry = resolveMetricGuideEntry(token);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      results.push(entry);
    }
  }
  return results;
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
    hex: 'var(--star-chromaticity-o)',
  },
  B: {
    temp0: 30000,
    temp9: 10000,
    baseRadius: 4.5,
    classEffect:
      'Class B establishes a hot luminous blue-white regime (10,000–30,000 K) characterized by neutral helium.',
    hex: 'var(--star-chromaticity-b)',
  },
  A: {
    temp0: 10000,
    temp9: 7500,
    baseRadius: 1.8,
    classEffect:
      'Class A establishes a white photospheric regime (7,500–10,000 K) dominated by prominent hydrogen Balmer lines.',
    hex: 'var(--star-chromaticity-a)',
  },
  F: {
    temp0: 7500,
    temp9: 6000,
    baseRadius: 1.3,
    classEffect:
      'Class F establishes a yellow-white regime (6,000–7,500 K) with developing ionized metal absorption spectra.',
    hex: 'var(--star-chromaticity-f)',
  },
  G: {
    temp0: 6000,
    temp9: 5200,
    baseRadius: 1.0,
    classEffect:
      'Class G establishes a solar-type yellow regime (5,200–6,000 K) with neutral iron and ionized calcium lines.',
    hex: 'var(--star-chromaticity-g)',
  },
  K: {
    temp0: 5200,
    temp9: 3700,
    baseRadius: 0.8,
    classEffect:
      'Class K establishes an orange dwarf regime (3,700–5,200 K) offering billions of years of stable irradiance.',
    hex: 'var(--star-chromaticity-k)',
  },
  M: {
    temp0: 3700,
    temp9: 2400,
    baseRadius: 0.35,
    classEffect:
      'Class M establishes a cool red dwarf regime (< 3,700 K) dominated by titanium oxide molecular bands.',
    hex: 'var(--star-chromaticity-m)',
  },
  L: {
    temp0: 2400,
    temp9: 1300,
    baseRadius: 0.1,
    classEffect:
      'Class L/T/Y establishes a substellar brown dwarf regime (< 2,400 K) cooling across infrared wavelengths.',
    hex: 'var(--star-chromaticity-l)',
  },
  D: {
    temp0: 30000,
    temp9: 8000,
    baseRadius: 0.012,
    classEffect:
      'Class D establishes an electron-degenerate white dwarf core remnant cooling via radiative leakage.',
    hex: 'var(--star-chromaticity-d)',
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

function resolveManifestForToken(token: string): SystemManifest | null {
  const norm = toUrlSlug(token);
  // 1. Check details cache
  const cached =
    getCachedDetailRecord(token) ??
    (norm !== token ? getCachedDetailRecord(norm) : undefined);
  if (cached?.kind === 'system') {
    return cached.record;
  }

  // 2. Check search corpus for parent system
  const corpus = getCachedCorpusForFilter('all') ?? [];
  const entry =
    findFocusedEntryInCorpus(token, corpus) ??
    (norm !== token ? findFocusedEntryInCorpus(norm, corpus) : undefined);
  if (entry?.s) {
    const parent = getCachedDetailRecord(entry.s);
    if (parent?.kind === 'system') {
      return parent.record;
    }
  }
  if (entry?.i) {
    const matched = getCachedDetailRecord(entry.i);
    if (matched?.kind === 'system') {
      return matched.record;
    }
  }

  return null;
}

/**
 * Asynchronously hydrates search corpus and detail shards for metric comparison targets
 * on cold load so `resolveMetricComparison` can read catalogued telemetry from cache.
 */
export async function hydrateMetricComparison(
  rawMetricSlug: string,
  focusedEntityId?: string,
): Promise<void> {
  const entries = resolveMetricGuideEntries(rawMetricSlug);
  const hasOrbital = entries.some(
    (e) => e.category === 'Orbital & Planetary Telemetry',
  );
  const tokens =
    focusedEntityId && focusedEntityId.trim()
      ? focusedEntityId
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [
          hasOrbital
            ? DEFAULT_GUIDE_BENCHMARKS.orbitalBenchmarkId
            : DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId,
        ];

  const corpus =
    getCachedCorpusForFilter('all') ??
    (await loadSearchCorpusForFilter('all').catch(() => undefined));

  const fetchPromises: Promise<unknown>[] = [];
  for (const token of tokens) {
    fetchPromises.push(fetchDetailRecord(token).catch(() => undefined));
    if (corpus) {
      const entry =
        findFocusedEntryInCorpus(token, corpus) ??
        findFocusedEntryInCorpus(toUrlSlug(token), corpus);
      if (entry?.s) {
        fetchPromises.push(fetchDetailRecord(entry.s).catch(() => undefined));
      }
      if (entry?.i && entry.i !== token) {
        fetchPromises.push(fetchDetailRecord(entry.i).catch(() => undefined));
      }
    }
  }
  await Promise.all(fetchPromises);
}

interface TargetEvaluationContext {
  readonly targetId: string;
  readonly targetName: string;
  readonly targetHref: string;
  readonly manifest: SystemManifest | null;
  readonly targetStar?: StellarComponent;
  readonly targetPlanet?: ExoplanetRecord;
}

function evaluateMetricForTarget(
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

  switch (metricId) {
    case 'galactic-coordinates': {
      if (
        manifest &&
        Number.isFinite(manifest.x) &&
        Number.isFinite(manifest.y) &&
        Number.isFinite(manifest.z)
      ) {
        const distPc = Math.hypot(manifest.x, manifest.y, manifest.z);
        const ly = distPc * 3.2616;
        targetValue = `${distPc.toFixed(2)} pc`;
        targetFamiliar = `${ly.toFixed(2)} light-years (ly)`;
        relativeRatioLabel = `${ly.toFixed(2)} light-years from Sol`;
        isCatalogued = true;
        numericValue = Number(distPc.toFixed(2));
        unit = 'pc';
      }
      break;
    }
    case 'stellar-magnitude': {
      if (targetStar && Number.isFinite(targetStar.mag)) {
        const mag = targetStar.mag;
        const absmag = targetStar.absmag;
        targetValue = Number.isFinite(absmag)
          ? `${mag.toFixed(2)} V / ${absmag.toFixed(2)} M_V`
          : `${mag.toFixed(2)} V`;
        targetFamiliar =
          mag <= 6.5
            ? 'Naked-eye visible (V ≤ 6.5)'
            : 'Telescopic observation required';
        const deltaMag = mag - (-26.74);
        relativeRatioLabel = `Δ${deltaMag.toFixed(1)} mag relative to Sol`;
        isCatalogued = true;
        numericValue = Number(mag.toFixed(2));
        unit = 'V';
      }
      break;
    }
    case 'stellar-mass': {
      if (targetStar?.massMsun && targetStar.massMsun > 0) {
        const mass = targetStar.massMsun;
        targetValue = `${mass.toFixed(2)} M☉`;
        const earthMasses = Math.round(mass * 332950);
        targetFamiliar = `≈ ${earthMasses.toLocaleString()} Earth masses (M⊕)`;
        relativeRatioLabel = `${mass.toFixed(2)}× Solar mass`;
        isCatalogued = true;
        numericValue = Number(mass.toFixed(2));
        unit = 'M☉';
      }
      break;
    }
    case 'stellar-radius': {
      if (targetStar?.radiusRsun && targetStar.radiusRsun > 0) {
        const radius = targetStar.radiusRsun;
        targetValue = `${radius.toFixed(2)} R☉`;
        const km = Math.round(radius * 695700);
        targetFamiliar = `≈ ${km.toLocaleString()} km (${(radius * 109.2).toFixed(1)} R⊕)`;
        relativeRatioLabel = `${radius.toFixed(2)}× Solar radius`;
        isCatalogued = true;
        numericValue = Number(radius.toFixed(2));
        unit = 'R☉';
      }
      break;
    }
    case 'stellar-luminosity': {
      if (targetStar?.luminosityLsun && targetStar.luminosityLsun > 0) {
        const lum = targetStar.luminosityLsun;
        targetValue = `${lum.toFixed(2)} L☉`;
        const w = (lum * 3.828).toFixed(3);
        targetFamiliar = `≈ ${w} × 10²⁶ W`;
        relativeRatioLabel = `${lum.toFixed(2)}× Solar luminosity`;
        isCatalogued = true;
        numericValue = Number(lum.toFixed(2));
        unit = 'L☉';
      }
      break;
    }
    case 'effective-temperature': {
      if (targetStar?.effectiveTempK && targetStar.effectiveTempK > 0) {
        const tempK = targetStar.effectiveTempK;
        const celsius = Math.round(tempK - 273.15);
        targetValue = `${tempK.toLocaleString()} K`;
        targetFamiliar = `≈ ${celsius.toLocaleString()} °C`;
        relativeRatioLabel = `${(tempK / 5778).toFixed(2)}× Solar temperature`;
        isCatalogued = true;
        numericValue = tempK;
        unit = 'K';
      }
      break;
    }
    case 'semi-major-axis': {
      if (targetPlanet?.orbit?.semiMajorAxis && targetPlanet.orbit.semiMajorAxis > 0) {
        const sma = targetPlanet.orbit.semiMajorAxis;
        const lightMinutes = (sma * 8.3167).toFixed(2);
        const millionKm = (sma * 149.598).toFixed(1);
        targetValue = `${sma.toFixed(3)} AU`;
        targetFamiliar = `${lightMinutes} light-minutes (${millionKm}M km)`;
        relativeRatioLabel = `${sma.toFixed(2)}× Earth orbit`;
        isCatalogued = true;
        numericValue = Number(sma.toFixed(3));
        unit = 'AU';
      }
      break;
    }
    case 'orbital-period': {
      if (targetPlanet?.orbit?.periodDays && targetPlanet.orbit.periodDays > 0) {
        const period = targetPlanet.orbit.periodDays;
        const years = (period / 365.25).toFixed(2);
        targetValue = `${period.toFixed(2)} d`;
        targetFamiliar = `${years} Earth years (${(period / 30.4375).toFixed(1)} months)`;
        relativeRatioLabel = `${years}× Earth year`;
        isCatalogued = true;
        numericValue = Number(period.toFixed(2));
        unit = 'd';
      }
      break;
    }
    case 'orbital-inclination': {
      if (targetPlanet?.orbit && Number.isFinite(targetPlanet.orbit.inclination)) {
        const inc = targetPlanet.orbit.inclination;
        targetValue = `${inc.toFixed(2)}°`;
        targetFamiliar =
          inc === 0
            ? 'Coplanar with system plane'
            : `${inc.toFixed(1)}° orbital tilt relative to plane`;
        relativeRatioLabel = `${inc.toFixed(2)}° relative tilt`;
        isCatalogued = true;
        numericValue = Number(inc.toFixed(2));
        unit = '°';
      }
      break;
    }
    case 'planetary-mass': {
      if (targetPlanet?.massMearth && targetPlanet.massMearth > 0) {
        const mass = targetPlanet.massMearth;
        targetValue = `${mass.toFixed(2)} M⊕`;
        targetFamiliar = `≈ ${(mass * 5.972).toFixed(2)} × 10²⁴ kg`;
        relativeRatioLabel = `${mass.toFixed(2)}× Earth mass`;
        isCatalogued = true;
        numericValue = Number(mass.toFixed(2));
        unit = 'M⊕';
      }
      break;
    }
    case 'planetary-radius': {
      if (targetPlanet?.radiusRearth && targetPlanet.radiusRearth > 0) {
        const radius = targetPlanet.radiusRearth;
        targetValue = `${radius.toFixed(2)} R⊕`;
        const km = Math.round(radius * 6371);
        targetFamiliar = `≈ ${km.toLocaleString()} km mean radius`;
        relativeRatioLabel = `${radius.toFixed(2)}× Earth radius`;
        isCatalogued = true;
        numericValue = Number(radius.toFixed(2));
        unit = 'R⊕';
      }
      break;
    }
    case 'equilibrium-temperature': {
      if (targetPlanet?.equilibriumTempK && targetPlanet.equilibriumTempK > 0) {
        const tEq = targetPlanet.equilibriumTempK;
        const celsius = Math.round(tEq - 273.15);
        targetValue = `${tEq} K`;
        targetFamiliar = `≈ ${celsius} °C`;
        relativeRatioLabel = `${celsius >= 0 ? `+${celsius}` : celsius} °C surface equilibrium`;
        isCatalogued = true;
        numericValue = tEq;
        unit = 'K';
      }
      break;
    }
    case 'surface-gravity': {
      let g: number | undefined;
      if (targetPlanet?.surfaceGravityG && targetPlanet.surfaceGravityG > 0) {
        g = targetPlanet.surfaceGravityG;
      } else if (
        targetPlanet?.massMearth &&
        targetPlanet.massMearth > 0 &&
        targetPlanet?.radiusRearth &&
        targetPlanet.radiusRearth > 0
      ) {
        g =
          Math.round(
            (targetPlanet.massMearth /
              (targetPlanet.radiusRearth * targetPlanet.radiusRearth)) *
              100,
          ) / 100;
      }
      if (g !== undefined) {
        targetValue = `${g.toFixed(2)} g`;
        targetFamiliar = `≈ ${(g * 9.81).toFixed(2)} m/s²`;
        relativeRatioLabel = `${g.toFixed(2)}× Earth gravity`;
        isCatalogued = true;
        numericValue = Number(g.toFixed(2));
        unit = 'g';
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

/**
 * Context-aware telemetry metric comparison helper (DEC-028 & DEC-R018 & DEC-R020).
 * Resolves a telemetry metric against a standard Solar System baseline (Sol or Earth)
 * and compares it with focused celestial bodies or default benchmark system (Tau Ceti / Tau Ceti e).
 * Zero numeric fallback literals: uncached entities cleanly return uncatalogued indicators.
 */
export const resolveMetricComparison = (
  rawMetricSlug: string,
  focusedEntityId?: string,
): MetricComparison | null => {
  const metric = resolveMetricGuideEntry(rawMetricSlug);
  if (!metric) return null;

  const isFromFocusedContext = Boolean(focusedEntityId && focusedEntityId.trim());
  const isOrbitalOrPlanetary = metric.category === 'Orbital & Planetary Telemetry';
  const isStellar = metric.category === 'Stellar Telemetry';

  const tokens =
    focusedEntityId && focusedEntityId.trim()
      ? focusedEntityId.split(',').map((t) => t.trim()).filter(Boolean)
      : [
          isOrbitalOrPlanetary
            ? DEFAULT_GUIDE_BENCHMARKS.orbitalBenchmarkId
            : DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId,
        ];

  const targetComparisons: MetricTargetComparison[] = [];

  for (const token of tokens) {
    const norm = toUrlSlug(token);
    const manifest = resolveManifestForToken(token);

    // Check if token represents a specific star or planet in manifest
    const matchedStar = manifest?.stars.find(
      (s) => toUrlSlug(s.id) === norm || toUrlSlug(s.name) === norm,
    );
    const matchedPlanet = manifest?.planets.find(
      (p) => toUrlSlug(p.id) === norm || toUrlSlug(p.name) === norm,
    );

    const isSystemLevel =
      manifest &&
      !matchedStar &&
      !matchedPlanet &&
      (norm === toUrlSlug(manifest.id) ||
        norm === toUrlSlug(manifest.name) ||
        norm === SOL_REFERENCE_TARGET.id ||
        norm === DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId ||
        manifest.stars.length > 0 ||
        manifest.planets.length > 0);

    if (isSystemLevel && manifest) {
      if (isStellar) {
        if (manifest.stars.length > 0) {
          for (const star of manifest.stars) {
            targetComparisons.push(
              evaluateMetricForTarget(metric.id, {
                targetId: star.id,
                targetName: star.name,
                targetHref:
                  manifest.stars.length > 1
                    ? `/system/${encodeURIComponent(manifest.id)}?focus=${encodeURIComponent(star.id)}`
                    : `/system/${encodeURIComponent(manifest.id)}`,
                manifest,
                targetStar: star,
              }),
            );
          }
        } else {
          targetComparisons.push({
            targetId: token,
            targetName: manifest.name,
            targetHref: `/system/${encodeURIComponent(manifest.id)}`,
            targetValue: '—',
            targetFamiliar: '—',
            relativeRatioLabel: '—',
            isCatalogued: false,
          });
        }
      } else if (isOrbitalOrPlanetary) {
        if (manifest.planets.length > 0) {
          for (const planet of manifest.planets) {
            targetComparisons.push(
              evaluateMetricForTarget(metric.id, {
                targetId: planet.id,
                targetName: planet.name,
                targetHref: `/system/${encodeURIComponent(manifest.id)}?focus=${encodeURIComponent(planet.id)}`,
                manifest,
                targetPlanet: planet,
              }),
            );
          }
        } else {
          targetComparisons.push({
            targetId: token,
            targetName: manifest.name,
            targetHref: `/system/${encodeURIComponent(manifest.id)}`,
            targetValue: '—',
            targetFamiliar: '—',
            relativeRatioLabel: '—',
            isCatalogued: false,
          });
        }
      } else {
        // Astrometry / galactic coordinates
        targetComparisons.push(
          evaluateMetricForTarget(metric.id, {
            targetId: manifest.id,
            targetName: manifest.name,
            targetHref: `/system/${encodeURIComponent(manifest.id)}`,
            manifest,
          }),
        );
      }
    } else {
      // Individual component star or planet, or uncached entity
      const star = matchedStar ?? (isStellar ? manifest?.stars[0] : undefined);
      const planet = matchedPlanet ?? (isOrbitalOrPlanetary ? manifest?.planets[0] : undefined);
      const name =
        (isOrbitalOrPlanetary ? planet?.name : (star?.name ?? manifest?.name)) ??
        formatSlugFallbackTitle(token);
      const href = isOrbitalOrPlanetary
        ? `/system/${encodeURIComponent(manifest?.id ?? token)}?focus=${encodeURIComponent(token)}`
        : `/system/${encodeURIComponent(manifest?.id ?? token)}`;

      targetComparisons.push(
        evaluateMetricForTarget(metric.id, {
          targetId: token,
          targetName: name,
          targetHref: href,
          manifest,
          targetStar: star,
          targetPlanet: planet,
        }),
      );
    }
  }

  const primaryTarget =
    targetComparisons[0] ?? {
      targetId: tokens[0] ?? DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId,
      targetName: formatSlugFallbackTitle(
        tokens[0] ?? DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkName,
      ),
      targetHref: `/system/${encodeURIComponent(tokens[0] ?? DEFAULT_GUIDE_BENCHMARKS.stellarBenchmarkId)}`,
      targetValue: '—',
      targetFamiliar: '—',
      relativeRatioLabel: '—',
      isCatalogued: false,
    };

  const baselineName = metric.comparisonBaselineLabel;
  const baselineHref =
    baselineName === SOL_REFERENCE_TARGET.name
      ? SOL_REFERENCE_TARGET.href
      : EARTH_REFERENCE_TARGET.href;

  let baselineValue = '';
  let baselineFamiliar = '';

  switch (metric.id) {
    case 'galactic-coordinates':
      baselineValue = SOL_REFERENCE_TARGET.baselines.galacticCoordinates.value;
      baselineFamiliar = SOL_REFERENCE_TARGET.baselines.galacticCoordinates.familiar;
      break;
    case 'stellar-magnitude':
      baselineValue = SOL_REFERENCE_TARGET.baselines.stellarMagnitude.value;
      baselineFamiliar = SOL_REFERENCE_TARGET.baselines.stellarMagnitude.familiar;
      break;
    case 'stellar-mass':
      baselineValue = SOL_REFERENCE_TARGET.baselines.stellarMass.value;
      baselineFamiliar = SOL_REFERENCE_TARGET.baselines.stellarMass.familiar;
      break;
    case 'stellar-radius':
      baselineValue = SOL_REFERENCE_TARGET.baselines.stellarRadius.value;
      baselineFamiliar = SOL_REFERENCE_TARGET.baselines.stellarRadius.familiar;
      break;
    case 'stellar-luminosity':
      baselineValue = SOL_REFERENCE_TARGET.baselines.stellarLuminosity.value;
      baselineFamiliar = SOL_REFERENCE_TARGET.baselines.stellarLuminosity.familiar;
      break;
    case 'effective-temperature':
      baselineValue = SOL_REFERENCE_TARGET.baselines.effectiveTemperature.value;
      baselineFamiliar = SOL_REFERENCE_TARGET.baselines.effectiveTemperature.familiar;
      break;
    case 'semi-major-axis':
      baselineValue = EARTH_REFERENCE_TARGET.baselines.semiMajorAxis.value;
      baselineFamiliar = EARTH_REFERENCE_TARGET.baselines.semiMajorAxis.familiar;
      break;
    case 'orbital-period':
      baselineValue = EARTH_REFERENCE_TARGET.baselines.orbitalPeriod.value;
      baselineFamiliar = EARTH_REFERENCE_TARGET.baselines.orbitalPeriod.familiar;
      break;
    case 'orbital-inclination':
      baselineValue = EARTH_REFERENCE_TARGET.baselines.orbitalInclination.value;
      baselineFamiliar = EARTH_REFERENCE_TARGET.baselines.orbitalInclination.familiar;
      break;
    case 'planetary-mass':
      baselineValue = EARTH_REFERENCE_TARGET.baselines.planetaryMass.value;
      baselineFamiliar = EARTH_REFERENCE_TARGET.baselines.planetaryMass.familiar;
      break;
    case 'planetary-radius':
      baselineValue = EARTH_REFERENCE_TARGET.baselines.planetaryRadius.value;
      baselineFamiliar = EARTH_REFERENCE_TARGET.baselines.planetaryRadius.familiar;
      break;
    case 'equilibrium-temperature':
      baselineValue = EARTH_REFERENCE_TARGET.baselines.equilibriumTemperature.value;
      baselineFamiliar = EARTH_REFERENCE_TARGET.baselines.equilibriumTemperature.familiar;
      break;
    case 'surface-gravity':
      baselineValue = EARTH_REFERENCE_TARGET.baselines.surfaceGravity.value;
      baselineFamiliar = EARTH_REFERENCE_TARGET.baselines.surfaceGravity.familiar;
      break;
  }

  return {
    metricId: metric.id,
    baselineName,
    baselineHref,
    baselineValue,
    baselineFamiliar,
    baselineReticleType:
      baselineName === SOL_REFERENCE_TARGET.name ? 'star' : 'terrestrial',
    targetId: primaryTarget.targetId,
    targetName: primaryTarget.targetName,
    targetHref: primaryTarget.targetHref,
    targetValue: primaryTarget.targetValue,
    targetFamiliar: primaryTarget.targetFamiliar,
    targetNumericValue: primaryTarget.numericValue,
    targetUnit: primaryTarget.unit,
    targetReticleType: primaryTarget.reticleType,
    relativeRatioLabel: primaryTarget.relativeRatioLabel,
    isFromFocusedContext,
    isCatalogued: primaryTarget.isCatalogued,
    targets: targetComparisons,
  };
};

