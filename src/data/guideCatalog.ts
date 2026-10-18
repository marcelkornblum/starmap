/**
 * Authoritative catalog and URL builders for the Astronomical & Telemetry Guide (`/guide/*`).
 * Separated from `searchService.ts` so reference content and guide routing have a single,
 * dedicated domain module.
 */

export const STAR_TYPES_GUIDE_PATH = '/guide/star-types' as const;
export const PLANET_TYPES_GUIDE_PATH = '/guide/planet-types' as const;
export const METRICS_GUIDE_PATH = '/guide/metrics' as const;

export const PLANET_COMPOSITION_TYPES = [
  'terrestrial',
  'ice-giant',
  'gas-giant',
] as const;

export type PlanetCompositionClass = (typeof PLANET_COMPOSITION_TYPES)[number];

export interface GuideCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly symbol?: string;
  readonly summary: string;
}

export const STAR_TYPE_GUIDE_ENTRIES: readonly GuideCatalogEntry[] = [
  {
    id: 'O',
    title: 'O-Type Main-Sequence & Giant Stars',
    summary: 'Extremely hot, luminous blue stars (> 30,000 K) with strong ionised helium absorption lines.',
  },
  {
    id: 'B',
    title: 'B-Type Stars',
    summary: 'Hot blue-white stars (10,000–30,000 K) characterized by neutral helium lines.',
  },
  {
    id: 'A',
    title: 'A-Type Stars',
    summary: 'White stars (7,500–10,000 K) with prominent hydrogen Balmer absorption lines.',
  },
  {
    id: 'F',
    title: 'F-Type Stars',
    summary: 'Yellow-white main-sequence stars (6,000–7,500 K) with strengthening ionized calcium lines.',
  },
  {
    id: 'G',
    title: 'G-Type Stars',
    summary: 'Solar-type yellow stars (5,200–6,000 K) fusing hydrogen in their cores, including Sol (G2V).',
  },
  {
    id: 'K',
    title: 'K-Type Orange Dwarfs & Giants',
    summary: 'Long-lived orange stars (3,700–5,200 K) prized as stable hosts for potentially habitable worlds.',
  },
  {
    id: 'M',
    title: 'M-Type Red Dwarfs & Giants',
    summary: 'Cool red stars (< 3,700 K) that make up the vast majority of stellar neighbours within 10 parsecs.',
  },
  {
    id: 'D',
    title: 'White Dwarfs (Degenerate Remnants)',
    summary: 'Dense electron-degenerate stellar cores left behind after low- to intermediate-mass stars shed their envelopes.',
  },
  {
    id: 'LTY',
    title: 'Brown Dwarfs (L, T, Y Spectral Classes)',
    summary: 'Substellar objects below the hydrogen-fusion mass limit (~0.075 M☉) cooling across infrared wavelengths.',
  },
];

export const PLANET_TYPE_GUIDE_ENTRIES: readonly GuideCatalogEntry[] = [
  {
    id: 'terrestrial',
    title: 'Terrestrial Worlds',
    summary: 'Rocky and metal-rich planets (< 10 M⊕, < 2 R⊕) with solid silicate crusts and iron-nickel cores.',
  },
  {
    id: 'ice-giant',
    title: 'Ice Giants & Sub-Neptunes',
    summary: 'Intermediate-mass worlds (10–50 M⊕) dominated by supercritical water, ammonia, and methane mantles beneath hydrogen-helium envelopes.',
  },
  {
    id: 'gas-giant',
    title: 'Gas Giants',
    summary: 'Massive Jovian worlds (> 50 M⊕) composed primarily of metallic and molecular hydrogen and helium.',
  },
];

export const METRIC_GUIDE_ENTRIES: readonly GuideCatalogEntry[] = [
  {
    id: 'semi-major-axis',
    title: 'Semi-Major Axis',
    symbol: 'AU',
    summary: 'Mean orbital distance from the host star or barycentre, measured in Astronomical Units (1 AU = Earth–Sun distance).',
  },
  {
    id: 'orbital-period',
    title: 'Orbital Period',
    symbol: 'd',
    summary: 'Time required for a body to complete one full orbit around its host star, measured in Earth days.',
  },
  {
    id: 'planet-mass',
    title: 'Planetary Mass',
    symbol: 'M⊕',
    summary: 'Total mass of a planet or moon expressed as a multiple of Earth masses (M⊕).',
  },
  {
    id: 'planet-radius',
    title: 'Planetary Radius',
    symbol: 'R⊕',
    summary: 'Mean equatorial radius of a planet expressed as a multiple of Earth radii (R⊕).',
  },
  {
    id: 'equilibrium-temperature',
    title: 'Equilibrium Temperature',
    symbol: 'K',
    summary: 'Theoretical blackbody surface temperature in Kelvin assuming radiative equilibrium without greenhouse heating (200–320 K indicates the conservative habitable zone).',
  },
  {
    id: 'apparent-magnitude',
    title: 'Apparent Magnitude',
    symbol: 'V',
    summary: 'Logarithmic measure of a celestial body’s brightness as seen from Earth (V ≤ 6.5 is visible to the naked eye).',
  },
  {
    id: 'absolute-magnitude',
    title: 'Absolute Magnitude',
    symbol: 'M_V',
    summary: 'Intrinsic luminosity of a star measured as the apparent magnitude it would have at a standard distance of 10 parsecs.',
  },
  {
    id: 'luminosity',
    title: 'Bolometric Luminosity',
    symbol: 'L☉',
    summary: 'Total radiant energy output of a star per unit time expressed as a multiple of Solar luminosity (L☉).',
  },
];

/**
 * Pure unit function building the URL to the stellar classification detail guide view
 * (`/guide/star-types/<starType>`, e.g. `/guide/star-types/G8V`).
 */
export const buildStarTypeGuideHref = (spectralType: string): string => {
  const trimmed = spectralType.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return STAR_TYPES_GUIDE_PATH;
  }
  return `${STAR_TYPES_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

/**
 * Pure unit function building the URL to the Planet Type Guide view for a given
 * planetary composition class (`/guide/planet-types/<planetType>`, e.g. `/guide/planet-types/terrestrial`).
 * Falls back to the Planet Types list view (`/guide/planet-types`) when the class is empty or `'Unknown'`.
 */
export const buildPlanetTypeGuideHref = (planetType?: string): string => {
  if (!planetType) {
    return PLANET_TYPES_GUIDE_PATH;
  }
  const trimmed = planetType.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return PLANET_TYPES_GUIDE_PATH;
  }
  return `${PLANET_TYPES_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

/**
 * Pure unit function building the URL to the Telemetry Metrics Guide view for a given
 * physical/orbital metric (`/guide/metrics/<metricId>`, e.g. `/guide/metrics/semi-major-axis`).
 * Falls back to the Metrics list view (`/guide/metrics`) when the metricId is empty or `'Unknown'`.
 */
export const buildMetricGuideHref = (metricId?: string): string => {
  if (!metricId) {
    return METRICS_GUIDE_PATH;
  }
  const trimmed = metricId.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return METRICS_GUIDE_PATH;
  }
  return `${METRICS_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};
