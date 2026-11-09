/**
 * DEC-R032 / AUD-071: Metric Types Guide Catalog
 * Curated astronomical & telemetry guide entries covering astrometry and physical metrics.
 */

import { METRICS_GUIDE_PATH, type MetricGuideEntry } from './types';

export const METRIC_GUIDE_ENTRIES: readonly MetricGuideEntry[] = [
  {
    id: 'galactic-coordinates',
    title: 'Galactic Coordinates (J2000)',
    unitSymbol: 'pc',
    symbol: 'pc',
    category: 'Astrometry',
    summary: 'Three-dimensional heliocentric Cartesian coordinates [X, Y, Z] measured in parsecs (pc) aligned to the J2000 galactic reference frame.',
    physicalDefinition: '1 parsec (pc) is the distance at which 1 Astronomical Unit subtends an angle of 1 arcsecond, approximately 3.2616 light-years (3.0857 × 10¹⁶ m).',
    referenceBaseline: 'Sol (Solar System barycentre) at [0, 0, 0] pc.',
    href: `${METRICS_GUIDE_PATH}/galactic-coordinates`,
    familiarConversion: '1 pc ≈ 3.2616 light-years (ly) ≈ 206,265 AU ≈ 30.86 trillion km',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '[0, 0, 0] pc (Galactic Origin)',
    examples: [
      { name: 'Sol', href: '/system/sol', note: 'The origin coordinate [0, 0, 0] pc.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Alpha Centauri', href: '/system/alpha-centauri', note: 'Nearest stellar system at [-0.47, 1.32, -0.33] pc (1.34 pc distance).' },
    ],
  },
  {
    id: 'stellar-magnitude',
    title: 'Stellar Magnitude (Apparent V & Absolute M_V)',
    unitSymbol: 'V / M_V',
    symbol: 'V / M_V',
    category: 'Stellar Telemetry',
    summary: 'Logarithmic brightness scales indicating how bright a celestial body appears from Earth (apparent V) and its intrinsic luminosity at a standard 10 pc distance (absolute M_V).',
    physicalDefinition: 'Pogson’s ratio: a difference of 5 magnitudes corresponds to an exact factor of 100 in radiant flux density (m1 - m2 = -2.5 log10(F1 / F2)).',
    referenceBaseline: 'Vega (Alpha Lyrae) is calibrated to approximately 0.03 magnitude across standard optical photometric passbands.',
    href: `${METRICS_GUIDE_PATH}/stellar-magnitude`,
    familiarConversion: 'Δ5 mag = 100× brightness · Naked-eye visibility limit: V ≤ 6.5 mag',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '-26.74 V / +4.83 M_V',
    examples: [
      { name: 'Sol', href: '/system/sol', note: 'Apparent magnitude -26.74 V; absolute magnitude +4.83 M_V.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Sirius A', href: '/system/sirius', note: 'Brightest star in Earth’s night sky at apparent magnitude -1.46 V.' },
    ],
  },
  {
    id: 'stellar-mass',
    title: 'Stellar Mass',
    unitSymbol: 'M☉',
    symbol: 'M☉',
    category: 'Stellar Telemetry',
    summary: 'Total gravitational mass of a star expressed as a multiple of Solar mass (M☉), governing core pressure, fusion rate, and evolutionary lifespan.',
    physicalDefinition: '1 Solar Mass (M☉) = 1.98847 × 10³⁰ kg (approximately 333,000 Earth masses).',
    referenceBaseline: 'Sol = 1.000 M☉.',
    href: `${METRICS_GUIDE_PATH}/stellar-mass`,
    familiarConversion: '1 M☉ ≈ 332,950 Earth masses (M⊕) ≈ 1.989 × 10³⁰ kg',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '1.000 M☉',
    examples: [
      { name: 'Sol', href: '/system/sol', note: 'Reference 1.000 M☉.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Tau Ceti', href: '/system/tau-ceti', note: '0.783 M☉ G-type dwarf.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
    ],
  },
  {
    id: 'stellar-radius',
    title: 'Stellar Radius',
    unitSymbol: 'R☉',
    symbol: 'R☉',
    category: 'Stellar Telemetry',
    summary: 'Photospheric radius of a star expressed as a multiple of the Solar radius (R☉).',
    physicalDefinition: '1 Solar Radius (R☉) = 6.957 × 10⁸ m (approx. 109 Earth radii or 0.00465 AU).',
    referenceBaseline: 'Sol = 1.000 R☉.',
    href: `${METRICS_GUIDE_PATH}/stellar-radius`,
    familiarConversion: '1 R☉ ≈ 109.2 Earth radii (R⊕) ≈ 695,700 km',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '1.000 R☉',
    examples: [
      { name: 'Sol', href: '/system/sol', note: 'Photospheric radius of 1.000 R☉.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Alpha Centauri A', href: '/system/alpha-centauri?focus=alpha-centauri-a', note: '1.223 R☉.' },
    ],
  },
  {
    id: 'stellar-luminosity',
    title: 'Bolometric Stellar Luminosity',
    unitSymbol: 'L☉',
    symbol: 'L☉',
    category: 'Stellar Telemetry',
    summary: 'Total radiant electromagnetic power emitted by a star across all wavelengths, expressed in Solar luminosities (L☉).',
    physicalDefinition: '1 Solar Luminosity (L☉) = 3.828 × 10²⁶ W.',
    referenceBaseline: 'Sol = 1.000 L☉.',
    href: `${METRICS_GUIDE_PATH}/stellar-luminosity`,
    familiarConversion: '1 L☉ ≈ 3.828 × 10²⁶ W (1× Solar bolometric output)',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '1.000 L☉',
    examples: [
      { name: 'Sol', href: '/system/sol', note: 'Total radiant output 1.000 L☉.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Tau Ceti', href: '/system/tau-ceti', note: '0.520 L☉.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
    ],
  },
  {
    id: 'effective-temperature',
    title: 'Effective Temperature (T_eff)',
    unitSymbol: 'K',
    symbol: 'K',
    category: 'Stellar Telemetry',
    summary: 'Photospheric blackbody surface temperature in Kelvin (K) governed by the Stefan-Boltzmann radiation law.',
    physicalDefinition: 'T_eff = (L / (4πσR²))^(1/4), where σ is the Stefan-Boltzmann constant (5.670374 × 10⁻⁸ W·m⁻²·K⁻⁴).',
    referenceBaseline: 'Sol T_eff = 5,772 K (G2V classification).',
    href: `${METRICS_GUIDE_PATH}/effective-temperature`,
    familiarConversion: '°C = K − 273.15 · Sol photosphere: 5,778 K ≈ 5,505 °C (9,940 °F)',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '5,778 K (G2V)',
    examples: [
      { name: 'Sol', href: '/system/sol', note: '5,772 K G2V dwarf.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Proxima Centauri', href: '/system/alpha-centauri?focus=proxima-centauri', note: '3,042 K M5.5Ve red dwarf.' },
    ],
  },
  {
    id: 'semi-major-axis',
    title: 'Semi-Major Axis (a)',
    unitSymbol: 'AU',
    symbol: 'AU',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Half of the longest diameter of an elliptical orbit, defining the mean orbital distance between a celestial body and its gravitational primary.',
    physicalDefinition: '1 Astronomical Unit (AU) = 149,597,870,700 m (exact IAU standard).',
    referenceBaseline: 'Earth–Sun mean distance is approximately 1.000 AU.',
    href: `${METRICS_GUIDE_PATH}/semi-major-axis`,
    familiarConversion: '1 AU ≈ 8.32 light-minutes (499 light-seconds) ≈ 149.6 million km (1× Earth–Sun distance)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.000 AU',
    examples: [
      { name: 'Earth', href: '/planet/earth', note: '1.000 AU orbital semi-major axis.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Tau Ceti e', href: '/system/tau-ceti?focus=tau-ceti-e', note: '0.538 AU orbit.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
    ],
  },
  {
    id: 'orbital-period',
    title: 'Orbital Period (P)',
    unitSymbol: 'd',
    symbol: 'd',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Time elapsed for an orbiting body to complete one full revolution around the system barycentre, measured in Earth days (d).',
    physicalDefinition: 'Standard solar day = 86,400 SI seconds.',
    referenceBaseline: 'Earth sidereal period = 365.256 d (1.000 sidereal year).',
    href: `${METRICS_GUIDE_PATH}/orbital-period`,
    familiarConversion: '365.25 d = 1.00 Earth year (12 months)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '365.25 d',
    examples: [
      { name: 'Earth', href: '/planet/earth', note: '365.25 d orbital period.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Proxima Centauri b', href: '/system/alpha-centauri?focus=proxima-centauri-b', note: '11.186 d orbital period.' },
    ],
  },
  {
    id: 'orbital-inclination',
    title: 'Orbital Inclination (i)',
    unitSymbol: '°',
    symbol: '°',
    category: 'Orbital & Planetary Telemetry',
    summary: 'The vertical tilt of an orbit relative to the reference orbital plane or invariable plane of the system, measured in degrees (°).',
    physicalDefinition: 'Angle between the orbit normal angular momentum vector and the reference plane normal vector (0°–180°).',
    referenceBaseline: 'Ecliptic plane of the Solar System (Earth orbit inclination = 0.00°).',
    href: `${METRICS_GUIDE_PATH}/orbital-inclination`,
    familiarConversion: '0° = Coplanar ecliptic · 90° = Polar orbit · 180° = Retrograde',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '0.00° (Ecliptic)',
    examples: [
      { name: 'Earth', href: '/planet/earth', note: 'Reference 0.00° inclination to the Ecliptic.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Mercury', href: '/system/sol', note: '7.00° inclination to the Ecliptic.' },
    ],
  },
  {
    id: 'planetary-mass',
    title: 'Planetary Mass',
    unitSymbol: 'M⊕',
    symbol: 'M⊕',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Total gravitational mass of an exoplanet, planet, or satellite expressed as a multiple of Earth mass (M⊕).',
    physicalDefinition: '1 Earth Mass (M⊕) = 5.9722 × 10²⁴ kg.',
    referenceBaseline: 'Earth = 1.000 M⊕.',
    href: `${METRICS_GUIDE_PATH}/planetary-mass`,
    familiarConversion: '1 M⊕ ≈ 5.972 × 10²⁴ kg (≈ 81.3× Moon mass · 1/318× Jupiter mass)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.000 M⊕',
    examples: [
      { name: 'Earth', href: '/planet/earth', note: '1.000 M⊕ terrestrial baseline.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Jupiter', href: '/planet/jupiter', note: '317.8 M⊕ (approx. 0.00095 M☉).' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
    ],
  },
  {
    id: 'planetary-radius',
    title: 'Planetary Radius',
    unitSymbol: 'R⊕',
    symbol: 'R⊕',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Mean volumetric or equatorial radius of a planetary body expressed as a multiple of Earth radius (R⊕).',
    physicalDefinition: '1 Earth Radius (R⊕) = 6,371.0 km.',
    referenceBaseline: 'Earth = 1.000 R⊕.',
    href: `${METRICS_GUIDE_PATH}/planetary-radius`,
    familiarConversion: '1 R⊕ ≈ 6,371 km mean radius (12,742 km diameter)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.000 R⊕',
    examples: [
      { name: 'Earth', href: '/planet/earth', note: 'Mean radius of 1.000 R⊕.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Jupiter', href: '/planet/jupiter', note: '11.21 R⊕ equatorial radius.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
    ],
  },
  {
    id: 'equilibrium-temperature',
    title: 'Equilibrium Temperature (T_eq)',
    unitSymbol: 'K',
    symbol: 'K',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Theoretical blackbody temperature in Kelvin (K) of a planet assuming radiative balance with incident stellar flux without atmospheric greenhouse heating.',
    physicalDefinition: 'T_eq = T_star × sqrt(R_star / (2a)) × (1 - A)^(1/4), where A is Bond albedo.',
    referenceBaseline: 'Earth theoretical equilibrium temperature is ~255 K (actual surface mean is 288 K due to natural greenhouse effect).',
    href: `${METRICS_GUIDE_PATH}/equilibrium-temperature`,
    familiarConversion: '°C = K − 273.15 · Water freezes at 273 K (0 °C), boils at 373 K (100 °C)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '255 K (theoretical)',
    examples: [
      { name: 'Earth', href: '/planet/earth', note: '255 K theoretical equilibrium temperature.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Proxima Centauri b', href: '/system/alpha-centauri?focus=proxima-centauri-b', note: '234 K equilibrium temperature.' },
    ],
  },
  {
    id: 'surface-gravity',
    title: 'Surface Gravity',
    unitSymbol: 'g',
    symbol: 'g',
    category: 'Orbital & Planetary Telemetry',
    summary: 'Surface gravitational acceleration expressed in Earth standard gravity units (g = 9.81 m/s²), dictating atmospheric retention, escape velocity, and weight.',
    physicalDefinition: 'g_p = G * M_p / R_p² (in Earth standard gravity: (M / M⊕) / (R / R⊕)²).',
    referenceBaseline: 'Earth standard surface gravity = 1.00 g (9.81 m/s²).',
    href: `${METRICS_GUIDE_PATH}/surface-gravity`,
    familiarConversion: '1 g = Earth standard gravity (9.81 m/s²); 1.2 g = 20% heavier body weight',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.00 g',
    examples: [
      { name: 'Earth', href: '/planet/earth', note: '1.00 g standard terrestrial baseline.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
      { name: 'Tau Ceti e', href: '/system/tau-ceti?focus=tau-ceti-e', note: 'Estimated ~1.2 g surface gravity.' }, // guard-disable-line G-literals -- educational reference target (DEC-R032)
    ],
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
