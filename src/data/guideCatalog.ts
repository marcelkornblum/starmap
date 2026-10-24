/**
 * DEC-027 / DEC-028: Authoritative catalog, metadata, and URL builders for the
 * Astronomical & Telemetry Guide (`/guide/*`).
 * Zero hardcoded magic inside views.
 */

export const STAR_TYPES_GUIDE_PATH = '/guide/star-types' as const;
export const PLANET_TYPES_GUIDE_PATH = '/guide/planet-types' as const;
export const METRICS_GUIDE_PATH = '/guide/metrics' as const;

export const PLANET_COMPOSITION_TYPES = [
  'terrestrial',
  'super-earth',
  'ice-giant',
  'gas-giant',
] as const;

export type PlanetCompositionClass = (typeof PLANET_COMPOSITION_TYPES)[number];

export interface GuideExampleTarget {
  readonly name: string;
  readonly href: string;
  readonly note: string;
}

export interface GuideCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly symbol?: string;
  readonly summary: string;
}

export interface StarTypeGuideEntry {
  readonly id: string; // 'o' | 'b' | 'a' | 'f' | 'g' | 'k' | 'm' | 'l' | 'd'
  readonly spectralClass: string; // 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'L/T/Y' | 'D'
  readonly title: string;
  readonly summary: string;
  readonly effectiveTempRange: string;
  readonly massRangeMsun: string;
  readonly radiusRangeRsun: string;
  readonly luminosityRangeLsun: string;
  readonly habitableZoneAu: string;
  readonly chromaticity: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
  readonly canonicalRadiusRsun: number;
  readonly canonicalTempK: number;
  readonly chromaticityHex: string;
  readonly interiorLayers: readonly string[];
}

export interface PlanetTypeGuideEntry {
  readonly id: PlanetCompositionClass;
  readonly composition: PlanetCompositionClass;
  readonly title: string;
  readonly summary: string;
  readonly massRangeMearth: string;
  readonly radiusRangeRearth: string;
  readonly bulkComposition: string;
  readonly habitabilityNotes: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
  readonly canonicalRadiusRearth: number;
  readonly textureTheme: string;
  readonly interiorLayers: readonly string[];
}

export interface MetricGuideEntry {
  readonly id: string;
  readonly title: string;
  readonly unitSymbol: string;
  readonly symbol?: string;
  readonly category: 'Astrometry' | 'Stellar Telemetry' | 'Orbital & Planetary Telemetry';
  readonly summary: string;
  readonly physicalDefinition: string;
  readonly referenceBaseline: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
  readonly familiarConversion: string;
  readonly comparisonBaselineLabel: 'Sol' | 'Earth';
  readonly comparisonBaselineValue: string;
}

export const STAR_TYPE_GUIDE_ENTRIES: readonly StarTypeGuideEntry[] = [
  {
    id: 'o',
    spectralClass: 'O',
    title: 'O-Type Blue Hypergiants & Dwarfs',
    summary:
      'Extremely hot, luminous blue stars (> 30,000 K) with intense ultraviolet radiation and strong ionized helium absorption lines.',
    effectiveTempRange: '> 30,000 K',
    massRangeMsun: '> 16 M☉',
    radiusRangeRsun: '> 6.6 R☉',
    luminosityRangeLsun: '> 30,000 L☉',
    habitableZoneAu: '> 400 AU',
    chromaticity: 'Deep Blue',
    href: `${STAR_TYPES_GUIDE_PATH}/o`,
    canonicalRadiusRsun: 10.0,
    canonicalTempK: 40000,
    chromaticityHex: '#9bb0ff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: '10 Lacertae',
        href: '/galaxy/10-lacertae?select=star-type:o',
        note: 'Standard O9V main-sequence reference star.',
      },
      {
        name: 'Alnitak',
        href: '/galaxy/alnitak?select=star-type:o',
        note: 'O9.7Ib supergiant in Orion’s Belt.',
      },
    ],
  },
  {
    id: 'b',
    spectralClass: 'B',
    title: 'B-Type Blue-White Stars',
    summary:
      'Hot blue-white stars (10,000–30,000 K) characterized by neutral helium absorption lines and high stellar winds.',
    effectiveTempRange: '10,000–30,000 K',
    massRangeMsun: '2.1–16 M☉',
    radiusRangeRsun: '1.8–6.6 R☉',
    luminosityRangeLsun: '25–30,000 L☉',
    habitableZoneAu: '5–400 AU',
    chromaticity: 'Blue-White',
    href: `${STAR_TYPES_GUIDE_PATH}/b`,
    canonicalRadiusRsun: 4.5,
    canonicalTempK: 20000,
    chromaticityHex: '#aabfff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Rigel',
        href: '/galaxy/rigel?select=star-type:b',
        note: 'B8Ia blue supergiant in Orion.',
      },
      {
        name: 'Regulus',
        href: '/galaxy/regulus?select=star-type:b',
        note: 'Rapidly rotating B7V star in Leo.',
      },
    ],
  },
  {
    id: 'a',
    spectralClass: 'A',
    title: 'A-Type White Stars',
    summary:
      'Brilliant white stars (7,500–10,000 K) dominated by strong hydrogen Balmer absorption lines and extensive debris disks.',
    effectiveTempRange: '7,500–10,000 K',
    massRangeMsun: '1.4–2.1 M☉',
    radiusRangeRsun: '1.4–1.8 R☉',
    luminosityRangeLsun: '5–25 L☉',
    habitableZoneAu: '2.2–5.0 AU',
    chromaticity: 'Light Blue-White',
    href: `${STAR_TYPES_GUIDE_PATH}/a`,
    canonicalRadiusRsun: 1.8,
    canonicalTempK: 8500,
    chromaticityHex: '#cad7ff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Sirius A',
        href: '/galaxy/sirius?select=star-type:a',
        note: 'A1V primary of the Sirius binary system at 2.6 pc.',
      },
      {
        name: 'Vega',
        href: '/galaxy/vega?select=star-type:a',
        note: 'A0V standard photometric calibration baseline.',
      },
    ],
  },
  {
    id: 'f',
    spectralClass: 'F',
    title: 'F-Type Yellow-White Stars',
    summary:
      'Yellow-white stars (6,000–7,500 K) with strengthening ionized calcium lines and intermediate main-sequence stability.',
    effectiveTempRange: '6,000–7,500 K',
    massRangeMsun: '1.04–1.4 M☉',
    radiusRangeRsun: '1.15–1.4 R☉',
    luminosityRangeLsun: '1.5–5.0 L☉',
    habitableZoneAu: '1.2–2.2 AU',
    chromaticity: 'Yellow-White',
    href: `${STAR_TYPES_GUIDE_PATH}/f`,
    canonicalRadiusRsun: 1.3,
    canonicalTempK: 6750,
    chromaticityHex: '#f8f7ff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Procyon A',
        href: '/galaxy/procyon?select=star-type:f',
        note: 'F5IV-V subgiant in Canis Minor at 3.5 pc.',
      },
      {
        name: 'Gamma Virginis',
        href: '/galaxy/gamma-virginis?select=star-type:f',
        note: 'Binary F0V stellar pair.',
      },
    ],
  },
  {
    id: 'g',
    spectralClass: 'G',
    title: 'G-Type Solar-Type Stars',
    summary:
      'Solar-type yellow stars (5,200–6,000 K) fusing hydrogen stably in their cores with lifetimes of ~10 billion years.',
    effectiveTempRange: '5,200–6,000 K',
    massRangeMsun: '0.8–1.04 M☉',
    radiusRangeRsun: '0.96–1.15 R☉',
    luminosityRangeLsun: '0.6–1.5 L☉',
    habitableZoneAu: '0.95–1.4 AU',
    chromaticity: 'Yellow / Warm White',
    href: `${STAR_TYPES_GUIDE_PATH}/g`,
    canonicalRadiusRsun: 1.0,
    canonicalTempK: 5778,
    chromaticityHex: '#fff4ea',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Sol',
        href: '/galaxy/sol?select=star-type:g',
        note: 'The Solar System primary, classification G2V.',
      },
      {
        name: 'Tau Ceti',
        href: '/galaxy/tau-ceti?select=star-type:g',
        note: 'Nearby single G8.5V dwarf with an extensive debris disk and planetary system.',
      },
      {
        name: 'Alpha Centauri A',
        href: '/galaxy/alpha-centauri?focus=alpha-centauri-a&select=star-type:g',
        note: 'Primary component of the Alpha Centauri triple system, G2V.',
      },
    ],
  },
  {
    id: 'k',
    spectralClass: 'K',
    title: 'K-Type Orange Dwarfs & Giants',
    summary:
      'Long-lived orange stars (3,700–5,200 K) prized for stellar stability, mild flare environments, and extended habitable zones.',
    effectiveTempRange: '3,700–5,200 K',
    massRangeMsun: '0.45–0.8 M☉',
    radiusRangeRsun: '0.7–0.96 R☉',
    luminosityRangeLsun: '0.08–0.6 L☉',
    habitableZoneAu: '0.3–0.95 AU',
    chromaticity: 'Orange / Warm Amber',
    href: `${STAR_TYPES_GUIDE_PATH}/k`,
    canonicalRadiusRsun: 0.8,
    canonicalTempK: 4500,
    chromaticityHex: '#ffd2a1',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Alpha Centauri B',
        href: '/galaxy/alpha-centauri?focus=alpha-centauri-b&select=star-type:k',
        note: 'Secondary component of Alpha Centauri, K1V dwarf.',
      },
      {
        name: 'Epsilon Eridani',
        href: '/galaxy/epsilon-eridani?select=star-type:k',
        note: 'Young K2V dwarf with confirmed debris ring and exoplanets.',
      },
    ],
  },
  {
    id: 'm',
    spectralClass: 'M',
    title: 'M-Type Red Dwarfs & Giants',
    summary:
      'Cool red stars (< 3,700 K) that make up over 75% of all stars in the Solar neighborhood, with trillions of years of main-sequence life.',
    effectiveTempRange: '2,400–3,700 K',
    massRangeMsun: '0.08–0.45 M☉',
    radiusRangeRsun: '< 0.7 R☉',
    luminosityRangeLsun: '< 0.08 L☉',
    habitableZoneAu: '0.05–0.3 AU',
    chromaticity: 'Red / Deep Amber',
    href: `${STAR_TYPES_GUIDE_PATH}/m`,
    canonicalRadiusRsun: 0.35,
    canonicalTempK: 3200,
    chromaticityHex: '#ffcc6f',
    interiorLayers: ['Fully Convective Interior'],
    examples: [
      {
        name: 'Proxima Centauri',
        href: '/galaxy/alpha-centauri?focus=proxima-centauri&select=star-type:m',
        note: 'Nearest star to the Sun (M5.5Ve flare dwarf) hosting terrestrial worlds.',
      },
      {
        name: "Barnard's Star",
        href: '/galaxy/barnards-star?select=star-type:m',
        note: 'High proper motion M4V dwarf in Ophiuchus.',
      },
    ],
  },
  {
    id: 'l',
    spectralClass: 'L/T/Y',
    title: 'Substellar Brown Dwarfs (L, T, Y Classes)',
    summary:
      'Substellar objects below the hydrogen-fusion mass limit (~0.075 M☉), cooling slowly across deep infrared wavelengths.',
    effectiveTempRange: '500–2,400 K',
    massRangeMsun: '0.013–0.075 M☉',
    radiusRangeRsun: '0.08–0.14 R☉',
    luminosityRangeLsun: '< 0.0001 L☉',
    habitableZoneAu: '0.005–0.05 AU',
    chromaticity: 'Infrared / Deep Magenta',
    href: `${STAR_TYPES_GUIDE_PATH}/l`,
    canonicalRadiusRsun: 0.1,
    canonicalTempK: 1800,
    chromaticityHex: '#ff6b3d',
    interiorLayers: ['Fully Convective Interior'],
    examples: [
      {
        name: 'Luhman 16',
        href: '/galaxy/luhman-16?select=star-type:l',
        note: 'Nearest known brown dwarf binary system (L7.5 / T0.5) at 2.0 pc.',
      },
    ],
  },
  {
    id: 'd',
    spectralClass: 'D',
    title: 'White Dwarfs (Degenerate Remnants)',
    summary:
      'Dense electron-degenerate stellar cores left behind after low- to intermediate-mass stars shed their outer envelopes.',
    effectiveTempRange: '4,000–150,000 K',
    massRangeMsun: '0.17–1.33 M☉',
    radiusRangeRsun: '0.008–0.02 R☉',
    luminosityRangeLsun: '0.0001–100 L☉',
    habitableZoneAu: '0.005–0.03 AU',
    chromaticity: 'White / Ultra-Blue',
    href: `${STAR_TYPES_GUIDE_PATH}/d`,
    canonicalRadiusRsun: 0.012,
    canonicalTempK: 15000,
    chromaticityHex: '#e6f0ff',
    interiorLayers: ['Degenerate Carbon-Oxygen Core'],
    examples: [
      {
        name: 'Sirius B',
        href: '/galaxy/sirius?select=star-type:d',
        note: 'Nearest known white dwarf (DA2) orbiting Sirius A.',
      },
    ],
  },
];

export const PLANET_TYPE_GUIDE_ENTRIES: readonly PlanetTypeGuideEntry[] = [
  {
    id: 'terrestrial',
    composition: 'terrestrial',
    title: 'Terrestrial Worlds',
    summary:
      'Rocky and metal-rich planets (≤ 2 M⊕, ≤ 1.25 R⊕) with solid silicate crusts, differentiated mantles, and metallic iron-nickel cores.',
    massRangeMearth: '≤ 2 M⊕',
    radiusRangeRearth: '≤ 1.25 R⊕',
    bulkComposition: 'Silicate rocks, iron-nickel core, volatile-poor crust and mantle',
    habitabilityNotes:
      'Prime candidates for surface liquid water and biosignature detection within circumstellar habitable zones.',
    canonicalRadiusRearth: 1.0,
    textureTheme: 'rocky-silicate',
    interiorLayers: ['Iron-Nickel Core', 'Silicate Mantle', 'Rocky Crust'],
    href: `${PLANET_TYPES_GUIDE_PATH}/terrestrial`,
    examples: [
      {
        name: 'Earth',
        href: '/system/sol?focus=earth&select=planet-type:terrestrial',
        note: 'Standard terrestrial benchmark with active plate tectonics and surface hydrosphere.',
      },
      {
        name: 'Proxima Centauri b',
        href: '/galaxy/alpha-centauri?focus=proxima-centauri-b&select=planet-type:terrestrial',
        note: 'Terrestrial exoplanet orbiting within the conservative habitable zone of Proxima Centauri.',
      },
    ],
  },
  {
    id: 'super-earth',
    composition: 'super-earth',
    title: 'Super-Earths',
    summary:
      'Massive rocky worlds (2–10 M⊕, 1.25–2.0 R⊕) bridging terrestrial planets and volatile-rich ice giants, featuring high surface gravities and potentially deep silicate mantles.',
    massRangeMearth: '2–10 M⊕',
    radiusRangeRearth: '1.25–2.0 R⊕',
    bulkComposition: 'Silicate mantles, metallic iron-nickel cores, and dense secondary volatile or ocean layers',
    habitabilityNotes:
      'Strong surface gravity supports volatile retention; stable surface liquid water environments possible within circumstellar habitable zones.',
    canonicalRadiusRearth: 1.6,
    textureTheme: 'rocky-silicate',
    interiorLayers: ['Metallic Core', 'Silicate Mantle', 'Crust / Ocean Layer'],
    href: `${PLANET_TYPES_GUIDE_PATH}/super-earth`,
    examples: [
      {
        name: 'Tau Ceti e',
        href: '/galaxy/tau-ceti?focus=tau-ceti-e&select=planet-type:super-earth',
        note: 'Potentially rocky super-Earth orbiting near the inner edge of Tau Ceti’s habitable zone.',
      },
      {
        name: 'Tau Ceti f',
        href: '/galaxy/tau-ceti?focus=tau-ceti-f&select=planet-type:super-earth',
        note: 'Outer super-Earth candidate in the Tau Ceti system.',
      },
    ],
  },
  {
    id: 'ice-giant',
    composition: 'ice-giant',
    title: 'Ice Giants & Sub-Neptunes',
    summary:
      'Intermediate-mass worlds (10–50 M⊕) dominated by supercritical volatile mantles (water, methane, ammonia) beneath hydrogen-helium envelopes.',
    massRangeMearth: '10–50 M⊕',
    radiusRangeRearth: '2.0–6.0 R⊕',
    bulkComposition: 'Water, ammonia, and methane ices/fluids, with 10–20% hydrogen/helium envelope',
    habitabilityNotes:
      'Atmospheric water-cloud habitable zones may theoretically exist, but lack solid surfaces.',
    canonicalRadiusRearth: 4.0,
    textureTheme: 'slush-methane',
    interiorLayers: [
      'Rock-Ice Core',
      'Supercritical Water-Ammonia-Methane Mantle',
      'Hydrogen-Helium Atmosphere',
    ],
    href: `${PLANET_TYPES_GUIDE_PATH}/ice-giant`,
    examples: [
      {
        name: 'Uranus',
        href: '/system/sol?focus=uranus&select=planet-type:ice-giant',
        note: 'Seventh planet from Sol, featuring an extreme 97.8° axial tilt.',
      },
      {
        name: 'Neptune',
        href: '/system/sol?focus=neptune&select=planet-type:ice-giant',
        note: 'Outer ice giant of the Solar System with dynamic supersonic storm systems.',
      },
      {
        name: 'Tau Ceti g',
        href: '/galaxy/tau-ceti?focus=tau-ceti-g&select=planet-type:ice-giant',
        note: 'Candidate sub-Neptune / ice-giant companion in the Tau Ceti system.',
      },
    ],
  },
  {
    id: 'gas-giant',
    composition: 'gas-giant',
    title: 'Gas Giants',
    summary:
      'Massive Jovian worlds (> 50 M⊕) composed predominantly of hydrogen and helium, featuring no distinct solid surface and deep metallic hydrogen mantles.',
    massRangeMearth: '> 50 M⊕',
    radiusRangeRearth: '> 6.0 R⊕',
    bulkComposition: 'Metallic and molecular hydrogen, helium, with a dense heavy-element core',
    habitabilityNotes:
      'Inhospitable to carbon-based surface life; however, large icy or rocky moons may host subsurface oceans.',
    canonicalRadiusRearth: 11.2,
    textureTheme: 'banded-gas',
    interiorLayers: [
      'Rocky/Icy Core',
      'Liquid Metallic Hydrogen Mantle',
      'Molecular Hydrogen-Helium Envelope',
    ],
    href: `${PLANET_TYPES_GUIDE_PATH}/gas-giant`,
    examples: [
      {
        name: 'Jupiter',
        href: '/system/sol?focus=jupiter&select=planet-type:gas-giant',
        note: 'Largest planet in the Solar System, possessing a vast magnetosphere and 95 known moons.',
      },
      {
        name: 'Saturn',
        href: '/system/sol?focus=saturn&select=planet-type:gas-giant',
        note: 'Extensive ring system with diverse major icy satellites including Titan and Enceladus.',
      },
    ],
  },
];

export const METRIC_GUIDE_ENTRIES: readonly MetricGuideEntry[] = [
  {
    id: 'galactic-coordinates',
    title: 'Galactic Coordinates (J2000)',
    unitSymbol: 'pc',
    symbol: 'pc',
    category: 'Astrometry',
    summary:
      'Three-dimensional heliocentric Cartesian coordinates [X, Y, Z] measured in parsecs (pc) aligned to the J2000 galactic reference frame.',
    physicalDefinition:
      '1 parsec (pc) is the distance at which 1 Astronomical Unit subtends an angle of 1 arcsecond, approximately 3.2616 light-years (3.0857 × 10¹⁶ m).',
    referenceBaseline: 'Sol (Solar System barycentre) at [0, 0, 0] pc.',
    href: `${METRICS_GUIDE_PATH}/galactic-coordinates`,
    familiarConversion: '1 pc ≈ 3.2616 light-years (ly) ≈ 206,265 AU ≈ 30.86 trillion km',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '[0, 0, 0] pc (Galactic Origin)',
    examples: [
      {
        name: 'Sol',
        href: '/system/sol',
        note: 'The origin coordinate [0, 0, 0] pc.',
      },
      {
        name: 'Alpha Centauri',
        href: '/system/alpha-centauri',
        note: 'Nearest stellar system at [-0.47, 1.32, -0.33] pc (1.34 pc distance).',
      },
    ],
  },
  {
    id: 'stellar-magnitude',
    title: 'Stellar Magnitude (Apparent V & Absolute M_V)',
    unitSymbol: 'V / M_V',
    symbol: 'V / M_V',
    category: 'Stellar Telemetry',
    summary:
      'Logarithmic brightness scales indicating how bright a celestial body appears from Earth (apparent V) and its intrinsic luminosity at a standard 10 pc distance (absolute M_V).',
    physicalDefinition:
      'Pogson’s ratio: a difference of 5 magnitudes corresponds to an exact factor of 100 in radiant flux density (m1 - m2 = -2.5 log10(F1 / F2)).',
    referenceBaseline:
      'Vega (Alpha Lyrae) is calibrated to approximately 0.03 magnitude across standard optical photometric passbands.',
    href: `${METRICS_GUIDE_PATH}/stellar-magnitude`,
    familiarConversion: 'Δ5 mag = 100× brightness · Naked-eye visibility limit: V ≤ 6.5 mag',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '-26.74 V / +4.83 M_V',
    examples: [
      {
        name: 'Sol',
        href: '/system/sol',
        note: 'Apparent magnitude -26.74 V; absolute magnitude +4.83 M_V.',
      },
      {
        name: 'Sirius A',
        href: '/system/sirius',
        note: 'Brightest star in Earth’s night sky at apparent magnitude -1.46 V.',
      },
    ],
  },
  {
    id: 'stellar-mass',
    title: 'Stellar Mass',
    unitSymbol: 'M☉',
    symbol: 'M☉',
    category: 'Stellar Telemetry',
    summary:
      'Total gravitational mass of a star expressed as a multiple of Solar mass (M☉), governing core pressure, fusion rate, and evolutionary lifespan.',
    physicalDefinition:
      '1 Solar Mass (M☉) = 1.98847 × 10³⁰ kg (approximately 333,000 Earth masses).',
    referenceBaseline: 'Sol = 1.000 M☉.',
    href: `${METRICS_GUIDE_PATH}/stellar-mass`,
    familiarConversion: '1 M☉ ≈ 332,950 Earth masses (M⊕) ≈ 1.989 × 10³⁰ kg',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '1.000 M☉',
    examples: [
      {
        name: 'Sol',
        href: '/system/sol',
        note: 'Reference 1.000 M☉.',
      },
      {
        name: 'Tau Ceti',
        href: '/system/tau-ceti',
        note: '0.783 M☉ G-type dwarf.',
      },
    ],
  },
  {
    id: 'stellar-radius',
    title: 'Stellar Radius',
    unitSymbol: 'R☉',
    symbol: 'R☉',
    category: 'Stellar Telemetry',
    summary:
      'Photospheric radius of a star expressed as a multiple of the Solar radius (R☉).',
    physicalDefinition:
      '1 Solar Radius (R☉) = 6.957 × 10⁸ m (approx. 109 Earth radii or 0.00465 AU).',
    referenceBaseline: 'Sol = 1.000 R☉.',
    href: `${METRICS_GUIDE_PATH}/stellar-radius`,
    familiarConversion: '1 R☉ ≈ 109.2 Earth radii (R⊕) ≈ 695,700 km',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '1.000 R☉',
    examples: [
      {
        name: 'Sol',
        href: '/system/sol',
        note: 'Photospheric radius of 1.000 R☉.',
      },
      {
        name: 'Alpha Centauri A',
        href: '/system/alpha-centauri?focus=alpha-centauri-a',
        note: '1.223 R☉.',
      },
    ],
  },
  {
    id: 'stellar-luminosity',
    title: 'Bolometric Stellar Luminosity',
    unitSymbol: 'L☉',
    symbol: 'L☉',
    category: 'Stellar Telemetry',
    summary:
      'Total radiant electromagnetic power emitted by a star across all wavelengths, expressed in Solar luminosities (L☉).',
    physicalDefinition:
      '1 Solar Luminosity (L☉) = 3.828 × 10²⁶ W.',
    referenceBaseline: 'Sol = 1.000 L☉.',
    href: `${METRICS_GUIDE_PATH}/stellar-luminosity`,
    familiarConversion: '1 L☉ ≈ 3.828 × 10²⁶ W (1× Solar bolometric output)',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '1.000 L☉',
    examples: [
      {
        name: 'Sol',
        href: '/system/sol',
        note: 'Total radiant output 1.000 L☉.',
      },
      {
        name: 'Tau Ceti',
        href: '/system/tau-ceti',
        note: '0.520 L☉.',
      },
    ],
  },
  {
    id: 'effective-temperature',
    title: 'Effective Temperature (T_eff)',
    unitSymbol: 'K',
    symbol: 'K',
    category: 'Stellar Telemetry',
    summary:
      'Photospheric blackbody surface temperature in Kelvin (K) governed by the Stefan-Boltzmann radiation law.',
    physicalDefinition:
      'T_eff = (L / (4πσR²))^(1/4), where σ is the Stefan-Boltzmann constant (5.670374 × 10⁻⁸ W·m⁻²·K⁻⁴).',
    referenceBaseline: 'Sol T_eff = 5,772 K (G2V classification).',
    href: `${METRICS_GUIDE_PATH}/effective-temperature`,
    familiarConversion: '°C = K − 273.15 · Sol photosphere: 5,778 K ≈ 5,505 °C (9,940 °F)',
    comparisonBaselineLabel: 'Sol',
    comparisonBaselineValue: '5,778 K (G2V)',
    examples: [
      {
        name: 'Sol',
        href: '/system/sol',
        note: '5,772 K G2V dwarf.',
      },
      {
        name: 'Proxima Centauri',
        href: '/system/alpha-centauri?focus=proxima-centauri',
        note: '3,042 K M5.5Ve red dwarf.',
      },
    ],
  },
  {
    id: 'semi-major-axis',
    title: 'Semi-Major Axis (a)',
    unitSymbol: 'AU',
    symbol: 'AU',
    category: 'Orbital & Planetary Telemetry',
    summary:
      'Half of the longest diameter of an elliptical orbit, defining the mean orbital distance between a celestial body and its gravitational primary.',
    physicalDefinition:
      '1 Astronomical Unit (AU) = 149,597,870,700 m (exact IAU standard).',
    referenceBaseline: 'Earth–Sun mean distance is approximately 1.000 AU.',
    href: `${METRICS_GUIDE_PATH}/semi-major-axis`,
    familiarConversion:
      '1 AU ≈ 8.32 light-minutes (499 light-seconds) ≈ 149.6 million km (1× Earth–Sun distance)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.000 AU',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: '1.000 AU orbital semi-major axis.',
      },
      {
        name: 'Tau Ceti e',
        href: '/system/tau-ceti?focus=tau-ceti-e',
        note: '0.538 AU orbit.',
      },
    ],
  },
  {
    id: 'orbital-period',
    title: 'Orbital Period (P)',
    unitSymbol: 'd',
    symbol: 'd',
    category: 'Orbital & Planetary Telemetry',
    summary:
      'Time elapsed for an orbiting body to complete one full revolution around the system barycentre, measured in Earth days (d).',
    physicalDefinition:
      'Standard solar day = 86,400 SI seconds.',
    referenceBaseline: 'Earth sidereal period = 365.256 d (1.000 sidereal year).',
    href: `${METRICS_GUIDE_PATH}/orbital-period`,
    familiarConversion: '365.25 d = 1.00 Earth year (12 months)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '365.25 d',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: '365.25 d orbital period.',
      },
      {
        name: 'Proxima Centauri b',
        href: '/system/alpha-centauri?focus=proxima-centauri-b',
        note: '11.186 d orbital period.',
      },
    ],
  },
  {
    id: 'orbital-inclination',
    title: 'Orbital Inclination (i)',
    unitSymbol: '°',
    symbol: '°',
    category: 'Orbital & Planetary Telemetry',
    summary:
      'The vertical tilt of an orbit relative to the reference orbital plane or invariable plane of the system, measured in degrees (°).',
    physicalDefinition:
      'Angle between the orbit normal angular momentum vector and the reference plane normal vector (0°–180°).',
    referenceBaseline: 'Ecliptic plane of the Solar System (Earth orbit inclination = 0.00°).',
    href: `${METRICS_GUIDE_PATH}/orbital-inclination`,
    familiarConversion: '0° = Coplanar ecliptic · 90° = Polar orbit · 180° = Retrograde',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '0.00° (Ecliptic)',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: 'Reference 0.00° inclination to the Ecliptic.',
      },
      {
        name: 'Mercury',
        href: '/system/sol',
        note: '7.00° inclination to the Ecliptic.',
      },
    ],
  },
  {
    id: 'planetary-mass',
    title: 'Planetary Mass',
    unitSymbol: 'M⊕',
    symbol: 'M⊕',
    category: 'Orbital & Planetary Telemetry',
    summary:
      'Total gravitational mass of an exoplanet, planet, or satellite expressed as a multiple of Earth mass (M⊕).',
    physicalDefinition:
      '1 Earth Mass (M⊕) = 5.9722 × 10²⁴ kg.',
    referenceBaseline: 'Earth = 1.000 M⊕.',
    href: `${METRICS_GUIDE_PATH}/planetary-mass`,
    familiarConversion: '1 M⊕ ≈ 5.972 × 10²⁴ kg (≈ 81.3× Moon mass · 1/318× Jupiter mass)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.000 M⊕',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: '1.000 M⊕ terrestrial baseline.',
      },
      {
        name: 'Jupiter',
        href: '/planet/jupiter',
        note: '317.8 M⊕ (approx. 0.00095 M☉).',
      },
    ],
  },
  {
    id: 'planetary-radius',
    title: 'Planetary Radius',
    unitSymbol: 'R⊕',
    symbol: 'R⊕',
    category: 'Orbital & Planetary Telemetry',
    summary:
      'Mean volumetric or equatorial radius of a planetary body expressed as a multiple of Earth radius (R⊕).',
    physicalDefinition:
      '1 Earth Radius (R⊕) = 6,371.0 km.',
    referenceBaseline: 'Earth = 1.000 R⊕.',
    href: `${METRICS_GUIDE_PATH}/planetary-radius`,
    familiarConversion: '1 R⊕ ≈ 6,371 km mean radius (12,742 km diameter)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.000 R⊕',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: 'Mean radius of 1.000 R⊕.',
      },
      {
        name: 'Jupiter',
        href: '/planet/jupiter',
        note: '11.21 R⊕ equatorial radius.',
      },
    ],
  },
  {
    id: 'equilibrium-temperature',
    title: 'Equilibrium Temperature (T_eq)',
    unitSymbol: 'K',
    symbol: 'K',
    category: 'Orbital & Planetary Telemetry',
    summary:
      'Theoretical blackbody temperature in Kelvin (K) of a planet assuming radiative balance with incident stellar flux without atmospheric greenhouse heating.',
    physicalDefinition:
      'T_eq = T_star × sqrt(R_star / (2a)) × (1 - A)^(1/4), where A is Bond albedo.',
    referenceBaseline:
      'Earth theoretical equilibrium temperature is ~255 K (actual surface mean is 288 K due to natural greenhouse effect).',
    href: `${METRICS_GUIDE_PATH}/equilibrium-temperature`,
    familiarConversion: '°C = K − 273.15 · Water freezes at 273 K (0 °C), boils at 373 K (100 °C)',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '255 K (theoretical)',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: '255 K theoretical equilibrium temperature.',
      },
      {
        name: 'Proxima Centauri b',
        href: '/system/alpha-centauri?focus=proxima-centauri-b',
        note: '234 K equilibrium temperature.',
      },
    ],
  },
  {
    id: 'surface-gravity',
    title: 'Surface Gravity',
    unitSymbol: 'g',
    symbol: 'g',
    category: 'Orbital & Planetary Telemetry',
    summary:
      'Surface gravitational acceleration expressed in Earth standard gravity units (g = 9.81 m/s²), dictating atmospheric retention, escape velocity, and weight.',
    physicalDefinition:
      'g_p = G * M_p / R_p² (in Earth standard gravity: (M / M⊕) / (R / R⊕)²).',
    referenceBaseline: 'Earth standard surface gravity = 1.00 g (9.81 m/s²).',
    href: `${METRICS_GUIDE_PATH}/surface-gravity`,
    familiarConversion:
      '1 g = Earth standard gravity (9.81 m/s²); 1.2 g = 20% heavier body weight',
    comparisonBaselineLabel: 'Earth',
    comparisonBaselineValue: '1.00 g',
    examples: [
      {
        name: 'Earth',
        href: '/planet/earth',
        note: '1.00 g standard terrestrial baseline.',
      },
      {
        name: 'Tau Ceti e',
        href: '/system/tau-ceti?focus=tau-ceti-e',
        note: 'Estimated ~1.2 g surface gravity.',
      },
    ],
  },
];

export const METRIC_ALIASES: Readonly<Record<string, string>> = {
  'planet-mass': 'planetary-mass',
  'planet-radius': 'planetary-radius',
  'apparent-magnitude': 'stellar-magnitude',
  'absolute-magnitude': 'stellar-magnitude',
  luminosity: 'stellar-luminosity',
  'surface-gravity': 'surface-gravity',
  gravity: 'surface-gravity',
};

export const METRIC_LABEL_TO_SLUG: Readonly<Record<string, string>> = {
  'Galactic Coordinates': 'galactic-coordinates',
  'Galactic Coordinates (J2000)': 'galactic-coordinates',
  Coordinates: 'galactic-coordinates',
  Position: 'galactic-coordinates',
  'Stellar Magnitude': 'stellar-magnitude',
  'Stellar Magnitude (Apparent V & Absolute M_V)': 'stellar-magnitude',
  'Apparent Magnitude': 'stellar-magnitude',
  'Absolute Magnitude': 'stellar-magnitude',
  Magnitude: 'stellar-magnitude',
  'Stellar Mass': 'stellar-mass',
  'Mass (Star)': 'stellar-mass',
  'Stellar Radius': 'stellar-radius',
  'Radius (Star)': 'stellar-radius',
  'Bolometric Luminosity': 'stellar-luminosity',
  'Bolometric Stellar Luminosity': 'stellar-luminosity',
  'Stellar Luminosity': 'stellar-luminosity',
  Luminosity: 'stellar-luminosity',
  'Effective Temperature': 'effective-temperature',
  'Effective Temperature (T_eff)': 'effective-temperature',
  Temperature: 'effective-temperature',
  'Semi-Major Axis': 'semi-major-axis',
  'Semi-Major Axis (a)': 'semi-major-axis',
  'Semi Major Axis': 'semi-major-axis',
  'Orbital Period': 'orbital-period',
  'Orbital Period (P)': 'orbital-period',
  Period: 'orbital-period',
  'Orbital Inclination': 'orbital-inclination',
  'Orbital Inclination (i)': 'orbital-inclination',
  Inclination: 'orbital-inclination',
  'Planetary Mass': 'planetary-mass',
  'Planet Mass': 'planetary-mass',
  'Mass (Planet)': 'planetary-mass',
  'Planetary Radius': 'planetary-radius',
  'Planet Radius': 'planetary-radius',
  'Radius (Planet)': 'planetary-radius',
  'Equilibrium Temperature': 'equilibrium-temperature',
  'Equilibrium Temperature (T_eq)': 'equilibrium-temperature',
  'Surface Gravity': 'surface-gravity',
  Gravity: 'surface-gravity',
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
export const buildMetricGuideHref = (
  metricId?: string,
  focusId?: string,
): string => {
  if (!metricId) {
    return METRICS_GUIDE_PATH;
  }
  const trimmed = metricId.trim();
  if (!trimmed || trimmed === 'Unknown') {
    return METRICS_GUIDE_PATH;
  }
  const baseHref = `${METRICS_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
  const trimmedFocus = focusId?.trim();
  if (trimmedFocus) {
    return `${baseHref}?focus=${encodeURIComponent(trimmedFocus)}`;
  }
  return baseHref;
};

export const HAZARDS_GUIDE_PATH = '/guide/hazards' as const;

export interface HazardGuideEntry {
  readonly id:
    | 'flare-star'
    | 'ionising-radiation'
    | 'variable-flux'
    | 'extreme-heat'
    | 'cryogenic-cold'
    | 'high-gravity'
    | 'tidal-locking'
    | 'high-eccentricity';
  readonly title: string;
  readonly severity: 'warning' | 'critical';
  readonly domain: 'stellar' | 'planetary';
  readonly domainLabel: 'Stellar System Hazard' | 'Planetary Hazard';
  readonly thresholdCriteria: string;
  readonly summary: string;
  readonly physicalMechanism: string;
  readonly operationalImpact: string;
  readonly mitigationNotes: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
}

export const HAZARD_GUIDE_ENTRIES: readonly HazardGuideEntry[] = [
  {
    id: 'flare-star',
    title: 'Stellar flare activity',
    severity: 'warning',
    domain: 'stellar',
    domainLabel: 'Stellar System Hazard',
    thresholdCriteria: 'Chromospheric emission lines (dMe/Ve) or UV Ceti type flare variability',
    summary: 'Host star exhibits stochastic, high-amplitude magnetic reconnection flares releasing intense ultraviolet and soft X-ray bursts.',
    physicalMechanism: 'Twisting and reconnection of localized magnetic flux tubes in fully convective stellar envelopes drives explosive plasma acceleration.',
    operationalImpact: 'Rapid atmospheric erosion, catastrophic radio blackout, and lethal surface ionizing dosage for unshielded assets.',
    mitigationNotes: 'Deploy sub-surface habitations, active magnetic deflector shields, and orbital flare-warning early intercept arrays.',
    href: `${HAZARDS_GUIDE_PATH}/flare-star`,
    examples: [
      { name: 'Proxima Centauri', href: '/system/proxima-centauri', note: 'Active M5.5Ve flare star host to Proxima b.' },
      { name: 'TRAPPIST-1', href: '/system/trappist-1', note: 'Ultra-cool M-dwarf with frequent coronal mass ejections.' },
    ],
  },
  {
    id: 'ionising-radiation',
    title: 'Intense ionising radiation',
    severity: 'critical',
    domain: 'stellar',
    domainLabel: 'Stellar System Hazard',
    thresholdCriteria: 'Hot O/B/D stars, degenerate remnants (pulsars/white dwarfs), L ≥ 25 L☉, or Teff ≥ 10,000 K',
    summary: 'High bolometric output in far-UV, extreme-UV, and hard X-ray bands creating a lethal radiation belt across circumstellar space.',
    physicalMechanism: 'Extreme photospheric surface temperatures and relativistic particle winds generate severe flux densities of ionizing photons.',
    operationalImpact: 'Destroys atmospheric ozone layers, induces severe electronic single-event upsets, and limits human EVA durations.',
    mitigationNotes: 'Heavy hydrogenous polyethylene radiation shielding, subterranean infrastructure, and standoff orbital margins.',
    href: `${HAZARDS_GUIDE_PATH}/ionising-radiation`,
    examples: [
      { name: 'Sirius B', href: '/system/sirius', note: 'Hot white dwarf with extreme UV luminosity.' },
      { name: 'Vega', href: '/system/vega', note: 'Luminous A0V star with intense ultraviolet radiation flux.' },
    ],
  },
  {
    id: 'variable-flux',
    title: 'Variable stellar flux',
    severity: 'warning',
    domain: 'stellar',
    domainLabel: 'Stellar System Hazard',
    thresholdCriteria: 'Catalogued variable star status (Mira, Cepheid, BY Dra) or significant cyclical bolometric luminosity fluctuations',
    summary: 'Periodic or quasi-periodic fluctuations in stellar bolometric luminosity alter planetary insolation over months to years.',
    physicalMechanism: 'Stellar pulsations driven by the kappa-mechanism (opacity gating in partial ionization zones) or giant starspot rotation.',
    operationalImpact: 'Extreme cyclical climate destabilization, severe thermal stresses on surface structures, and fluctuating solar array output.',
    mitigationNotes: 'Thermal inertia buffering systems, modular variable-gain power converters, and planetary insulation domes.',
    href: `${HAZARDS_GUIDE_PATH}/variable-flux`,
    examples: [
      { name: 'Betelgeuse', href: '/system/betelgeuse', note: 'Semiregular pulsating red supergiant with dramatic brightness swings.' },
      { name: 'Mira (Omicron Ceti)', href: '/system/mira', note: 'Archetypal pulsating variable star with large magnitude swings.' },
    ],
  },
  {
    id: 'extreme-heat',
    title: 'Extreme thermal regime',
    severity: 'critical',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Planetary equilibrium temperature Teq > 373 K (above the boiling point of water at 1 atm)',
    summary: 'Surface equilibrium temperatures exceed the boiling point of liquid water, prohibiting stable open hydrospheres.',
    physicalMechanism: 'Proximity to the host star drives runaway greenhouse processes or direct solar irradiation exceeding volatile stability limits.',
    operationalImpact: 'Thermal degradation of standard structural alloys, rapid boil-off of volatiles, and extreme heat-rejection requirements.',
    mitigationNotes: 'Active cryogenic cooling loops, reflective sunshades, subterranean cavern installations, and heat-pump rejection networks.',
    href: `${HAZARDS_GUIDE_PATH}/extreme-heat`,
    examples: [
      { name: 'Venus', href: '/system/sol', note: 'Runaway greenhouse world with surface temperature exceeding 735 K.' },
      { name: 'Mercury', href: '/system/sol', note: 'Airless innermost planet with daytime peak temperatures of 700 K.' },
    ],
  },
  {
    id: 'cryogenic-cold',
    title: 'Cryogenic surface regime',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Planetary equilibrium temperature Teq < 180 K (freezing volatiles and water ice into rock-hard crusts)',
    summary: 'Surface temperatures drop far below freezing, causing water, methane, and ammonia to precipitate and solidify.',
    physicalMechanism: 'Distant orbits receiving low stellar insolation, resulting in radiative equilibrium dominated by deep-space background temperatures.',
    operationalImpact: 'Embrittlement of structural steels and plastics, freezing of hydraulic fluids, and severe power consumption for heating.',
    mitigationNotes: 'Nuclear radioisotope thermoelectric generators (RTGs), thermal insulation aerogels, and heated vacuum-insulated conduits.',
    href: `${HAZARDS_GUIDE_PATH}/cryogenic-cold`,
    examples: [
      { name: 'Titan', href: '/system/sol', note: 'Hydrocarbon lakes and cryogenic 94 K surface temperature.' },
      { name: 'Pluto', href: '/system/sol', note: 'Nitrogen-ice plains at a frigid 44 K equilibrium temperature.' },
    ],
  },
  {
    id: 'high-gravity',
    title: 'High surface gravity',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Surface gravitational acceleration g > 1.2 g (Earth standard 9.80665 m/s²)',
    summary: 'Surface gravitational acceleration exceeds 1.2 g, significantly increasing structural mechanical loads and escape velocity.',
    physicalMechanism: 'High planetary mass relative to radius (large rocky core or massive super-Earth mantle) yields elevated surface gravity.',
    operationalImpact: 'Excessive hydrostatic strain on biological systems, higher propulsion mass ratios for ascent, and heavier structural foundations.',
    mitigationNotes: 'Exoskeletal mobility assistance, high-thrust chemical or nuclear-thermal launch vehicles, and reinforced stress framing.',
    href: `${HAZARDS_GUIDE_PATH}/high-gravity`,
    examples: [
      { name: 'Tau Ceti e', href: '/system/gaia-2452378776434477184', note: 'Massive super-Earth candidate with surface gravity exceeding 1.4 g.' },
      { name: 'Proxima Centauri c', href: '/system/proxima-centauri', note: 'Super-Earth with surface acceleration exceeding 2.1 g.' },
    ],
  },
  {
    id: 'tidal-locking',
    title: 'Tidal locking',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Orbital period P ≤ 30 days or semi-major axis a ≤ 0.15 AU (synchronous rotation with orbital period)',
    summary: 'Rotational period is synchronised with the orbital period, creating permanent substellar daylight and antistellar nighttime hemispheres.',
    physicalMechanism: 'Gravitational tidal torques from the host star dissipate orbital energy, driving planetary spin into a 1:1 spin-orbit resonance.',
    operationalImpact: 'Extreme temperature divergence between hemispheres, supersonic terminator wind currents, and atmospheric collapse on the dark side.',
    mitigationNotes: 'Establish settlements along the temperate twilight terminator band; construct high-capacity atmospheric recirculation ducts.',
    href: `${HAZARDS_GUIDE_PATH}/tidal-locking`,
    examples: [
      { name: 'Proxima Centauri b', href: '/system/proxima-centauri', note: 'Tidally locked in an 11.2-day orbit around its host red dwarf.' },
      { name: 'TRAPPIST-1 e', href: '/system/trappist-1', note: 'Synchronously rotating Earth-sized world in the habitable zone.' },
    ],
  },
  {
    id: 'high-eccentricity',
    title: 'Eccentric orbital seasons',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Orbital eccentricity e > 0.20 (driving extreme variation in periastron vs apoastron solar flux)',
    summary: 'High orbital eccentricity produces wild cyclical swings in insolation between periastron and apoastron.',
    physicalMechanism: 'Non-circular elliptical orbit causes seasonal solar irradiance variations proportional to 1/r², driving extreme seasonal shifts.',
    operationalImpact: 'Flash climate shifts, violent cyclical seasonal storms, and freeze-thaw cycles that severely challenge long-term surface stability.',
    mitigationNotes: 'Deploy automated climate-regulation reflectors, flexible thermal radiators, and migratory seasonal base habitats.',
    href: `${HAZARDS_GUIDE_PATH}/high-eccentricity`,
    examples: [
      { name: '16 Cygni B b', href: '/system/16-cygni', note: 'Gas giant with an extreme orbital eccentricity of 0.68.' },
      { name: 'HD 80606 b', href: '/system/hd-80606', note: 'Eccentric hot Jupiter experiencing violent periastron heating.' },
    ],
  },
];

/**
 * Pure unit function building the URL to the Environmental Hazards Guide view
 * (`/guide/hazards/<hazardId>`, e.g. `/guide/hazards/high-gravity`).
 * Falls back to `/guide/hazards` when empty or unrecognized.
 */
export const buildHazardGuideHref = (hazardCode?: string): string => {
  if (!hazardCode) {
    return HAZARDS_GUIDE_PATH;
  }
  const trimmed = hazardCode.trim().toLowerCase();
  if (!trimmed || trimmed === 'unknown') {
    return HAZARDS_GUIDE_PATH;
  }
  return `${HAZARDS_GUIDE_PATH}/${encodeURIComponent(trimmed)}`;
};

/**
 * Pure unit function resolving a HazardGuideEntry from a raw slug.
 */
export const resolveHazardGuideEntry = (
  rawSlug?: string,
): HazardGuideEntry | undefined => {
  if (!rawSlug) return undefined;
  const trimmed = rawSlug.trim().toLowerCase();
  return HAZARD_GUIDE_ENTRIES.find((h) => h.id === trimmed);
};
