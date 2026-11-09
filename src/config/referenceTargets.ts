/**
 * DEC-R033 / AUD-060 / AUD-061 / AUD-072: Centralized Reference Targets & Educational Baselines.
 * Authoritative strongly-typed configuration module defining standard astronomical reference
 * targets, solar system baselines, and default guide comparison benchmarks.
 *
 * All runtime UI and services import standard baselines from this module rather than
 * declaring magic string literals or fallback coordinates.
 */

export interface EducationalBaselineQuantity {
  readonly value: string;
  readonly familiar: string;
}

export interface SolReferenceTarget {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly href: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly massMsun: number;
  readonly radiusRsun: number;
  readonly luminosityLsun: number;
  readonly effectiveTempK: number;
  readonly visualMagnitude: number;
  readonly absoluteMagnitude: number;
  readonly baselines: {
    readonly galacticCoordinates: EducationalBaselineQuantity;
    readonly stellarMagnitude: EducationalBaselineQuantity;
    readonly stellarMass: EducationalBaselineQuantity;
    readonly stellarRadius: EducationalBaselineQuantity;
    readonly stellarLuminosity: EducationalBaselineQuantity;
    readonly effectiveTemperature: EducationalBaselineQuantity;
  };
}

export interface EarthReferenceTarget {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly href: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly massMearth: number;
  readonly radiusRearth: number;
  readonly semiMajorAxisAu: number;
  readonly periodDays: number;
  readonly inclinationDeg: number;
  readonly equilibriumTempK: number;
  readonly surfaceGravityG: number;
  readonly baselines: {
    readonly semiMajorAxis: EducationalBaselineQuantity;
    readonly orbitalPeriod: EducationalBaselineQuantity;
    readonly orbitalInclination: EducationalBaselineQuantity;
    readonly planetaryMass: EducationalBaselineQuantity;
    readonly planetaryRadius: EducationalBaselineQuantity;
    readonly equilibriumTemperature: EducationalBaselineQuantity;
    readonly surfaceGravity: EducationalBaselineQuantity;
  };
}

export interface GuideBenchmarkTargets {
  readonly stellarBenchmarkId: string;
  readonly stellarBenchmarkName: string;
  readonly orbitalBenchmarkId: string;
  readonly orbitalBenchmarkName: string;
}

export interface DefaultOriginTargets {
  readonly interstellarOriginId: string;
  readonly interstellarOriginName: string;
  readonly intraSystemOriginId: string;
  readonly intraSystemOriginName: string;
  readonly galacticOriginCoordinates: readonly [number, number, number];
}

// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const SOL_ID = 'sol';
// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const SOL_NAME = 'Sol';
// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const EARTH_ID = 'earth';
// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const EARTH_NAME = 'Earth';
// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const TAU_CETI_ID = 'tau-ceti';
// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const TAU_CETI_NAME = 'Tau Ceti';
// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const TAU_CETI_E_ID = 'tau-ceti-e';
// guard-disable-next-line G-literals -- educational reference target baseline (DEC-R033)
const TAU_CETI_E_NAME = 'Tau Ceti e';

export const SOL_REFERENCE_TARGET: SolReferenceTarget = {
  id: SOL_ID,
  name: SOL_NAME,
  displayName: SOL_NAME,
  systemId: SOL_ID,
  systemName: SOL_NAME,
  href: `/system/${SOL_ID}`,
  coordinatesPc: [0, 0, 0],
  massMsun: 1.0,
  radiusRsun: 1.0,
  luminosityLsun: 1.0,
  effectiveTempK: 5778,
  visualMagnitude: -26.74,
  absoluteMagnitude: 4.83,
  baselines: {
    galacticCoordinates: {
      value: '0.00 pc',
      familiar: '0.00 light-years (ly)',
    },
    stellarMagnitude: {
      value: '-26.74 V / +4.83 M_V',
      familiar: 'Brightest celestial body from Earth', // guard-disable-line G-literals -- educational reference target baseline (DEC-R033)
    },
    stellarMass: {
      value: '1.00 M☉',
      familiar: '332,950 M⊕ (1.989 × 10³⁰ kg)',
    },
    stellarRadius: {
      value: '1.00 R☉',
      familiar: '109.2 R⊕ (695,700 km)',
    },
    stellarLuminosity: {
      value: '1.00 L☉',
      familiar: '3.828 × 10²⁶ W (1.0× Solar bolometric output)',
    },
    effectiveTemperature: {
      value: '5,778 K',
      familiar: '5,505 °C (9,940 °F)',
    },
  },
} as const;

export const EARTH_REFERENCE_TARGET: EarthReferenceTarget = {
  id: EARTH_ID,
  name: EARTH_NAME,
  displayName: EARTH_NAME,
  systemId: SOL_ID,
  systemName: SOL_NAME,
  href: `/planet/${EARTH_ID}`,
  coordinatesPc: [0, 0, 0],
  massMearth: 1.0,
  radiusRearth: 1.0,
  semiMajorAxisAu: 1.0,
  periodDays: 365.25,
  inclinationDeg: 0.0,
  equilibriumTempK: 255,
  surfaceGravityG: 1.0,
  baselines: {
    semiMajorAxis: {
      value: '1.000 AU',
      familiar: '8.32 light-minutes (149.6M km)',
    },
    orbitalPeriod: {
      value: '365.25 d',
      familiar: '1.00 Earth year (12 months)', // guard-disable-line G-literals -- educational reference target baseline (DEC-R033)
    },
    orbitalInclination: {
      value: '0.00°',
      familiar: 'Coplanar ecliptic reference',
    },
    planetaryMass: {
      value: '1.00 M⊕',
      familiar: '5.972 × 10²⁴ kg (1.0× Earth mass)', // guard-disable-line G-literals -- educational reference target baseline (DEC-R033)
    },
    planetaryRadius: {
      value: '1.00 R⊕',
      familiar: '6,371 km radius (12,742 km dia)',
    },
    equilibriumTemperature: {
      value: '255 K',
      familiar: '−18 °C (−0.4 °F)',
    },
    surfaceGravity: {
      value: '1.00 g',
      familiar: '1.00 g (9.81 m/s²)',
    },
  },
} as const;

export const DEFAULT_GUIDE_BENCHMARKS: GuideBenchmarkTargets = {
  stellarBenchmarkId: TAU_CETI_ID,
  stellarBenchmarkName: TAU_CETI_NAME,
  orbitalBenchmarkId: TAU_CETI_E_ID,
  orbitalBenchmarkName: TAU_CETI_E_NAME,
} as const;

export const DEFAULT_ORIGIN_TARGETS: DefaultOriginTargets = {
  interstellarOriginId: SOL_ID,
  interstellarOriginName: SOL_NAME,
  intraSystemOriginId: EARTH_ID,
  intraSystemOriginName: EARTH_NAME,
  galacticOriginCoordinates: [0, 0, 0],
} as const;
