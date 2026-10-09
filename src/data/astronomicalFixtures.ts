import type {
  CelestialClassification,
  PlanetCensusEntry,
} from '../components/poc/canvas/cartography/reticleGeometry';

/**
 * Astronomical candidate systems fixture for Galactic Atlas and System inspection scenes.
 * Relocated from rendering components to decouple spatial fixtures from scene graphs.
 */
export interface CandidateSystem {
  id: string;
  name: string;
  classification: CelestialClassification;
  spectralType: string;
  position: [number, number, number];
  distPc: number;
  multiplicity: number;
  planetsCount: number;
  planetsList?: PlanetCensusEntry[];
  description: string;
  massMsun?: number;
  radiusRsun?: number;
  effectiveTempK?: number;
  luminosityLsun?: number;
}

export const CANDIDATE_SYSTEMS: CandidateSystem[] = [
  {
    id: 'sol',
    name: 'Sol',
    classification: 'star',
    spectralType: 'G2V',
    position: [0.0, 0.0, 0.0],
    distPc: 0.0,
    multiplicity: 1,
    planetsCount: 8,
    massMsun: 1.0,
    radiusRsun: 1.0,
    effectiveTempK: 5778,
    luminosityLsun: 1.0,
    planetsList: [
      { id: 'mercury', name: 'Mercury', classification: 'terrestrial' },
      { id: 'venus', name: 'Venus', classification: 'terrestrial' },
      { id: 'earth', name: 'Earth', classification: 'terrestrial' },
      { id: 'mars', name: 'Mars', classification: 'terrestrial' },
      { id: 'jupiter', name: 'Jupiter', classification: 'gas-giant' },
      { id: 'saturn', name: 'Saturn', classification: 'gas-giant' },
      { id: 'uranus', name: 'Uranus', classification: 'ice-giant' },
      { id: 'neptune', name: 'Neptune', classification: 'ice-giant' },
    ],
    description: 'Primary solar system hosting terrestrial and giant worlds with in-situ human civilisation.',
  },
  {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    classification: 'star',
    spectralType: 'G2V + K1V',
    position: [-1.34, 0.45, -0.62],
    distPc: 1.34,
    multiplicity: 3,
    planetsCount: 3,
    massMsun: 1.1,
    radiusRsun: 1.22,
    effectiveTempK: 5790,
    luminosityLsun: 1.52,
    planetsList: [
      { id: 'prox-b', name: 'Proxima b', classification: 'terrestrial' },
      { id: 'prox-c', name: 'Proxima c', classification: 'gas-giant' },
      { id: 'prox-d', name: 'Proxima d', classification: 'terrestrial' },
    ],
    description: 'Nearest triple star system comprised of Rigil Kentaurus, Toliman, and red dwarf Proxima.',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    classification: 'star',
    spectralType: 'A1V + DA2',
    position: [-1.61, -2.13, -0.55],
    distPc: 2.64,
    multiplicity: 2,
    planetsCount: 0,
    massMsun: 2.06,
    radiusRsun: 1.71,
    effectiveTempK: 9940,
    luminosityLsun: 25.4,
    description: 'Brightest star in Earth night sky; binary system with an A-type main-sequence star and white dwarf Pup.',
  },
  {
    id: 'tau-ceti',
    name: 'Tau Ceti',
    classification: 'star',
    spectralType: 'G8.5V',
    position: [3.15, 1.54, -1.00],
    distPc: 3.65,
    multiplicity: 1,
    planetsCount: 4,
    massMsun: 0.783,
    radiusRsun: 0.793,
    effectiveTempK: 5344,
    luminosityLsun: 0.52,
    planetsList: [
      { id: 'tau-g', name: 'Tau Ceti g', classification: 'terrestrial' },
      { id: 'tau-h', name: 'Tau Ceti h', classification: 'terrestrial' },
      { id: 'tau-e', name: 'Tau Ceti e', classification: 'terrestrial' },
      { id: 'tau-f', name: 'Tau Ceti f', classification: 'terrestrial' },
    ],
    description: 'Nearby solar analog with prominent circumstellar dust disk and candidate habitable super-Earths.',
  },
  {
    id: 'vega',
    name: 'Vega',
    classification: 'star',
    spectralType: 'A0V',
    position: [2.52, 7.21, 2.15],
    distPc: 7.68,
    multiplicity: 1,
    planetsCount: 0,
    massMsun: 2.135,
    radiusRsun: 2.362,
    effectiveTempK: 9602,
    luminosityLsun: 40.12,
    description: 'Rapidly rotating pole-on A-type star with warm circumferential debris disk.',
  },
  {
    id: 'kepler-47',
    name: 'Kepler-47',
    classification: 'star',
    spectralType: 'G6V + M3V',
    position: [4.82, -3.20, 2.50],
    distPc: 6.28,
    multiplicity: 2,
    planetsCount: 3,
    massMsun: 1.04,
    radiusRsun: 0.96,
    effectiveTempK: 5636,
    luminosityLsun: 0.84,
    planetsList: [
      { id: 'kep-b', name: 'Kepler-47 b', classification: 'terrestrial' },
      { id: 'kep-d', name: 'Kepler-47 d', classification: 'ice-giant' },
      { id: 'kep-c', name: 'Kepler-47 c', classification: 'gas-giant' },
    ],
    description: 'First known circumbinary multi-planet system containing three exoplanets orbiting a close stellar pair.',
  },
  {
    id: 'luhman-16',
    name: 'Luhman 16',
    classification: 'brown-dwarf',
    spectralType: 'L7.5 + T0.5',
    position: [-1.25, -1.82, 1.20],
    distPc: 2.02,
    multiplicity: 2,
    planetsCount: 0,
    massMsun: 0.032,
    radiusRsun: 0.1,
    effectiveTempK: 1350,
    luminosityLsun: 0.00004,
    description: 'Closest known sub-stellar brown dwarf binary system in the southern constellation Vela.',
  },
  {
    id: 'cygnus-x-1',
    name: 'Cygnus X-1',
    classification: 'black-hole',
    spectralType: 'HMXB',
    position: [-5.50, 6.00, 3.20],
    distPc: 8.74,
    multiplicity: 1,
    planetsCount: 0,
    description: 'High-mass X-ray binary stellar-mass black hole accreting matter from blue supergiant companion HDE 226868.',
  },
  {
    id: 'pleiades',
    name: 'Pleiades Core',
    classification: 'stellar-cluster',
    spectralType: 'M45',
    position: [6.00, 5.00, -4.00],
    distPc: 8.77,
    multiplicity: 7,
    planetsCount: 0,
    description: 'Open star cluster containing luminous hot B-type stars enveloped in reflection nebulosity.',
  },
];

export interface SolPlanetConfig {
  id: string;
  name: string;
  classification: CelestialClassification;
  a: number; // AU
  e: number;
  inc: number; // deg
  node: number; // deg
  peri: number; // deg
  period: number; // days
  meanAnomaly: number; // deg
}

export const SOL_PLANETS: SolPlanetConfig[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    classification: 'terrestrial',
    a: 0.3871,
    e: 0.2056,
    inc: 7.005,
    node: 48.331,
    peri: 29.124,
    period: 87.97,
    meanAnomaly: 174.8,
  },
  {
    id: 'venus',
    name: 'Venus',
    classification: 'terrestrial',
    a: 0.7233,
    e: 0.0067,
    inc: 3.394,
    node: 76.68,
    peri: 54.884,
    period: 224.7,
    meanAnomaly: 50.1,
  },
  {
    id: 'earth',
    name: 'Earth',
    classification: 'terrestrial',
    a: 1.000,
    e: 0.0167,
    inc: 0.0,
    node: -11.26,
    peri: 114.207,
    period: 365.26,
    meanAnomaly: 358.6,
  },
  {
    id: 'mars',
    name: 'Mars',
    classification: 'terrestrial',
    a: 1.5237,
    e: 0.0934,
    inc: 1.85,
    node: 49.557,
    peri: 286.5,
    period: 686.98,
    meanAnomaly: 19.4,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    classification: 'gas-giant',
    a: 5.2044,
    e: 0.0484,
    inc: 1.303,
    node: 100.46,
    peri: 273.87,
    period: 4332.59,
    meanAnomaly: 20.0,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    classification: 'gas-giant',
    a: 9.5826,
    e: 0.0542,
    inc: 2.485,
    node: 113.67,
    peri: 339.39,
    period: 10759.22,
    meanAnomaly: 317.0,
  },
];

export const LUNAR_ORBIT = {
  a: 60.336, // Earth radii units: semi-major axis in Earth radii (384,400 km / 6,371 km)
  e: 0.0549,
  inc: 5.14,
  node: 125.08,
  peri: 318.15,
  meanAnomaly: 135.0,
};
