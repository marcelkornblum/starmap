/**
 * DEC-R032 / AUD-071: Metric Types Guide Catalog
 * Curated astronomical & telemetry guide entries covering astrometry and physical metrics.
 */

import {
  EARTH_REFERENCE_TARGET,
  SOL_REFERENCE_TARGET,
} from '../../config/referenceTargets';
import { buildMetricGuideHref, type MetricGuideEntry } from './types';

export const METRIC_GUIDE_ENTRIES: readonly MetricGuideEntry[] = [
  {
    id: 'galactic-coordinates',
    title: 'Galactic Coordinates (J2000)',
    unitSymbol: 'pc',
    symbol: 'pc',
    category: 'Astrometry',
    summary: 'Three-dimensional heliocentric Cartesian coordinates [X, Y, Z] measured in parsecs (pc) aligned to the J2000 galactic reference frame.',
    physicalDefinition: '1 parsec (pc) is the distance at which 1 Astronomical Unit subtends an angle of 1 arcsecond, approximately 3.2616 light-years (3.0857 × 10¹⁶ m).',
    referenceBaseline: 'Heliocentric Solar System barycentre at [0, 0, 0] pc.',
    href: buildMetricGuideHref('galactic-coordinates'),
    familiarConversion: '1 pc ≈ 3.2616 light-years (ly) ≈ 206,265 AU ≈ 30.86 trillion km',
    comparisonBaselineId: SOL_REFERENCE_TARGET.id,
  },
  {
    id: 'stellar-magnitude',
    title: 'Stellar Magnitude (Apparent V & Absolute M_V)',
    unitSymbol: 'V / M_V',
    symbol: 'V / M_V',
    category: 'Stellar Telemetry',
    summary: 'Logarithmic brightness scales indicating how bright a celestial body appears (apparent V) and its intrinsic luminosity at a standard 10 pc distance (absolute M_V).',
    physicalDefinition: 'Pogson’s ratio: a difference of 5 magnitudes corresponds to an exact factor of 100 in radiant flux density (m1 - m2 = -2.5 log10(F1 / F2)).',
    referenceBaseline: 'Standard optical photometric passband zero-point (A0V calibration scale).',
    href: buildMetricGuideHref('stellar-magnitude'),
    familiarConversion: 'Δ5 mag = 100× brightness · Naked-eye visibility limit: V ≤ 6.5 mag',
    comparisonBaselineId: SOL_REFERENCE_TARGET.id,
  },
  {
    id: 'stellar-mass',
    title: 'Stellar Mass',
    unitSymbol: 'M☉',
    symbol: 'M☉',
    category: 'Stellar Telemetry',
    summary: 'Total gravitational mass of a star expressed as a multiple of Solar mass (M☉), governing core pressure, fusion rate, and evolutionary lifespan.',
    physicalDefinition: '1 Solar Mass (M☉) = 1.98847 × 10³⁰ kg (approximately 333,000 terrestrial masses).',
    referenceBaseline: 'Unit solar mass standard (1.000 M☉).',
    href: buildMetricGuideHref('stellar-mass'),
    familiarConversion: '1 M☉ ≈ 332,950 terrestrial masses (M⊕) ≈ 1.989 × 10³⁰ kg',
    comparisonBaselineId: SOL_REFERENCE_TARGET.id,
  },
  {
    id: 'stellar-radius',
    title: 'Stellar Radius',
    unitSymbol: 'R☉',
    symbol: 'R☉',
    category: 'Stellar Telemetry',
    summary: 'Photospheric radius of a star expressed as a multiple of the Solar radius (R☉).',
    physicalDefinition: '1 Solar Radius (R☉) = 6.957 × 10⁸ m (approx. 109 terrestrial radii or 0.00465 AU).',
    referenceBaseline: 'Unit solar radius standard (1.000 R☉).',
    href: buildMetricGuideHref('stellar-radius'),
    familiarConversion: '1 R☉ ≈ 109.2 terrestrial radii (R⊕) ≈ 695,700 km',
    comparisonBaselineId: SOL_REFERENCE_TARGET.id,
  },
  {
    id: 'stellar-luminosity',
    title: 'Bolometric Stellar Luminosity',
    unitSymbol: 'L☉',
    symbol: 'L☉',
    category: 'Stellar Telemetry',
    summary: 'Total radiant electromagnetic power emitted by a star across all wavelengths, expressed in Solar luminosities (L☉).',
    physicalDefinition: '1 Solar Luminosity (L☉) = 3.828 × 10²⁶ W.',
    referenceBaseline: 'Unit solar bolometric luminosity standard (1.000 L☉).',
    href: buildMetricGuideHref('stellar-luminosity'),
    familiarConversion: '1 L☉ ≈ 3.828 × 10²⁶ W (1× Solar bolometric output)',
    comparisonBaselineId: SOL_REFERENCE_TARGET.id,
  },
  {
    id: 'effective-temperature',
    title: 'Effective Temperature (T_eff)',
    unitSymbol: 'K',
    symbol: 'K',
    category: 'Stellar Telemetry',
    summary: 'Photospheric blackbody surface temperature in Kelvin (K) governed by the Stefan-Boltzmann radiation law.',
    physicalDefinition: 'T_eff = (L / (4πσR²))^(1/4), where σ is the Stefan-Boltzmann constant (5.670374 × 10⁻⁸ W·m⁻²·K⁻⁴).',
    referenceBaseline: 'Photospheric blackbody surface temperature scale in Kelvin (K).',
    href: buildMetricGuideHref('effective-temperature'),
    familiarConversion: '°C = K − 273.15 · Stellar photospheres span ~2,400 K (M) to > 30,000 K (O)',
    comparisonBaselineId: SOL_REFERENCE_TARGET.id,
  },
  {
    id: 'semi-major-axis',
    title: 'Semi-Major Axis (a)',
    unitSymbol: 'AU',
    symbol: 'AU',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Half of the longest diameter of an elliptical orbit, defining the mean orbital distance between a celestial body and its gravitational primary.',
    physicalDefinition: '1 Astronomical Unit (AU) = 149,597,870,700 m (exact IAU standard).',
    referenceBaseline: 'IAU Astronomical Unit orbital separation standard (1.000 AU).',
    href: buildMetricGuideHref('semi-major-axis'),
    familiarConversion: '1 AU ≈ 8.32 light-minutes (499 light-seconds) ≈ 149.6 million km',
    comparisonBaselineId: EARTH_REFERENCE_TARGET.id,
  },
  {
    id: 'orbital-period',
    title: 'Orbital Period (P)',
    unitSymbol: 'd',
    symbol: 'd',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Time elapsed for an orbiting body to complete one full revolution around the system barycentre, measured in days (d).',
    physicalDefinition: 'Standard solar day = 86,400 SI seconds; 1 Julian year = 365.25 days.',
    referenceBaseline: 'Sidereal orbital period measured in standard 86,400 s days (d).',
    href: buildMetricGuideHref('orbital-period'),
    familiarConversion: '1 Julian year = 365.25 d (12 mean months)',
    comparisonBaselineId: EARTH_REFERENCE_TARGET.id,
  },
  {
    id: 'orbital-inclination',
    title: 'Orbital Inclination (i)',
    unitSymbol: '°',
    symbol: '°',
    category: 'Orbital & Planetary Telemetry',
    summary: 'The vertical tilt of an orbit relative to the reference orbital plane or invariable plane of the system, measured in degrees (°).',
    physicalDefinition: 'Angle between the orbit normal angular momentum vector and the reference plane normal vector (0°–180°).',
    referenceBaseline: 'Ecliptic plane of the Solar System (0.00° reference inclination).',
    href: buildMetricGuideHref('orbital-inclination'),
    familiarConversion: '0° = Coplanar ecliptic · 90° = Polar orbit · 180° = Retrograde',
    comparisonBaselineId: EARTH_REFERENCE_TARGET.id,
  },
  {
    id: 'planetary-mass',
    title: 'Planetary Mass',
    unitSymbol: 'M⊕',
    symbol: 'M⊕',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Total gravitational mass of an exoplanet, planet, or satellite expressed as a multiple of terrestrial mass (M⊕).',
    physicalDefinition: '1 Terrestrial Mass (M⊕) = 5.9722 × 10²⁴ kg.',
    referenceBaseline: 'Unit terrestrial planetary mass standard (1.000 M⊕).',
    href: buildMetricGuideHref('planetary-mass'),
    familiarConversion: '1 M⊕ ≈ 5.972 × 10²⁴ kg (≈ 0.00315 Jovian masses)',
    comparisonBaselineId: EARTH_REFERENCE_TARGET.id,
  },
  {
    id: 'planetary-radius',
    title: 'Planetary Radius',
    unitSymbol: 'R⊕',
    symbol: 'R⊕',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Mean volumetric or equatorial radius of a planetary body expressed as a multiple of terrestrial radius (R⊕).',
    physicalDefinition: '1 Terrestrial Radius (R⊕) = 6,371.0 km.',
    referenceBaseline: 'Unit terrestrial planetary radius standard (1.000 R⊕).',
    href: buildMetricGuideHref('planetary-radius'),
    familiarConversion: '1 R⊕ ≈ 6,371 km mean radius (12,742 km diameter)',
    comparisonBaselineId: EARTH_REFERENCE_TARGET.id,
  },
  {
    id: 'equilibrium-temperature',
    title: 'Equilibrium Temperature (T_eq)',
    unitSymbol: 'K',
    symbol: 'K',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Theoretical blackbody temperature in Kelvin (K) of a planet assuming radiative balance with incident stellar flux without atmospheric greenhouse heating.',
    physicalDefinition: 'T_eq = T_star × sqrt(R_star / (2a)) × (1 - A)^(1/4), where A is Bond albedo.',
    referenceBaseline: 'Radiative equilibrium blackbody temperature in Kelvin (K).',
    href: buildMetricGuideHref('equilibrium-temperature'),
    familiarConversion: '°C = K − 273.15 · Water freezes at 273 K (0 °C), boils at 373 K (100 °C)',
    comparisonBaselineId: EARTH_REFERENCE_TARGET.id,
  },
  {
    id: 'surface-gravity',
    title: 'Surface Gravity',
    unitSymbol: 'g',
    symbol: 'g',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Surface gravitational acceleration expressed in standard gravity units (g = 9.81 m/s²), dictating atmospheric retention, escape velocity, and weight.',
    physicalDefinition: 'g_p = G * M_p / R_p² (in standard gravity: (M / M⊕) / (R / R⊕)²).',
    referenceBaseline: 'Standard terrestrial gravitational acceleration (1.00 g = 9.81 m/s²).',
    href: buildMetricGuideHref('surface-gravity'),
    familiarConversion: '1 g = standard gravity (9.81 m/s²); 1.2 g = 20% heavier body weight',
    comparisonBaselineId: EARTH_REFERENCE_TARGET.id,
  },
];

export const METRIC_ALIASES: Readonly<Record<string, string>> = {
  'planet-mass': 'planetary-mass', 'planet-radius': 'planetary-radius',
  'apparent-magnitude': 'stellar-magnitude', 'absolute-magnitude': 'stellar-magnitude',
  luminosity: 'stellar-luminosity', 'surface-gravity': 'surface-gravity', gravity: 'surface-gravity',
};

export const METRIC_LABEL_TO_SLUG: Readonly<Record<string, string>> = {
  'Galactic Coordinates': 'galactic-coordinates', 'Galactic Coordinates (J2000)': 'galactic-coordinates', Coordinates: 'galactic-coordinates', Position: 'galactic-coordinates',
  'Stellar Magnitude': 'stellar-magnitude', 'Stellar Magnitude (Apparent V & Absolute M_V)': 'stellar-magnitude', 'Apparent Magnitude': 'stellar-magnitude', 'Absolute Magnitude': 'stellar-magnitude', Magnitude: 'stellar-magnitude',
  'Stellar Mass': 'stellar-mass', 'Mass (Star)': 'stellar-mass', 'Stellar Radius': 'stellar-radius', 'Radius (Star)': 'stellar-radius',
  'Bolometric Luminosity': 'stellar-luminosity', 'Bolometric Stellar Luminosity': 'stellar-luminosity', 'Stellar Luminosity': 'stellar-luminosity', Luminosity: 'stellar-luminosity',
  'Effective Temperature': 'effective-temperature', 'Effective Temperature (T_eff)': 'effective-temperature', Temperature: 'effective-temperature',
  'Semi-Major Axis': 'semi-major-axis', 'Semi-Major Axis (a)': 'semi-major-axis', 'Semi Major Axis': 'semi-major-axis',
  'Orbital Period': 'orbital-period', 'Orbital Period (P)': 'orbital-period', Period: 'orbital-period',
  'Orbital Inclination': 'orbital-inclination', 'Orbital Inclination (i)': 'orbital-inclination', Inclination: 'orbital-inclination',
  'Planetary Mass': 'planetary-mass', 'Planet Mass': 'planetary-mass', 'Mass (Planet)': 'planetary-mass',
  'Planetary Radius': 'planetary-radius', 'Planet Radius': 'planetary-radius', 'Radius (Planet)': 'planetary-radius',
  'Equilibrium Temperature': 'equilibrium-temperature', 'Equilibrium Temperature (T_eq)': 'equilibrium-temperature', 'Surface Gravity': 'surface-gravity', Gravity: 'surface-gravity',
};

/**
 * Pure helper function resolving a human-readable telemetry metric label or alias
 * into its authoritative metric slug (e.g. "Semi-Major Axis" -> "semi-major-axis").
 */
export const resolveMetricSlugFromLabel = (label: string): string | null => {
  if (!label) return null;
  const trimmed = label.trim();
  if (!trimmed) return null;

  if (METRIC_LABEL_TO_SLUG[trimmed]) {
    return METRIC_LABEL_TO_SLUG[trimmed];
  }

  const lower = trimmed.toLowerCase();
  for (const [key, slug] of Object.entries(METRIC_LABEL_TO_SLUG)) {
    if (key.toLowerCase() === lower) {
      return slug;
    }
  }

  const alias = METRIC_ALIASES[lower];
  if (alias) {
    return alias;
  }

  const directMatch = METRIC_GUIDE_ENTRIES.find(
    (m) => m.id === lower || m.title.toLowerCase() === lower,
  );
  if (directMatch) {
    return directMatch.id;
  }

  return null;
};
