import type { CelestialClassification } from '../types/spatial';
import type {
  CelestialSymbolType,
  PlanetComposition,
  PlanetCompositionCounts,
  StellarClassification,
} from '../types/astro';
import type { COMPACT_SOLAR_BODY_TAG } from '../config/referenceTargets';

export type OrbitTuple = [
  semiMajorAxis: number,
  eccentricity: number,
  inclination: number,
  ascendingNode: number,
  argumentOfPeriapsis: number,
  meanAnomaly: number,
  periodDays: number,
];

export interface CompactSummaryNode {
  i?: string;
  n?: string;
  P?: string;
  p: [number, number, number];
  v?: [number, number, number];
  m: number;
  M: number;
  s?: string;
  c?: number;
  u?: number;
  k?: StellarClassification | number;
  cl?: StellarClassification;
  rt?: CelestialSymbolType;
  e?: number;
  b?: PlanetCompositionCounts;
  h?: 1;
  g?: number;
  q?: string;
  C?: 2 | 3 | 4;
  f?: number;
  H?: number;
  pi?: number;
}

export interface CompactSectorPartition {
  v?: number;
  i: string;
  b: [number, number, number, number, number, number];
  c: number;
  d: Record<string, CompactSummaryNode>;
}

export interface CompactStellarComponent {
  i: string;
  n: string;
  d?: string;
  s: string;
  m: number;
  M: number;
  l?: number;
  u?: number;
  r?: number;
  T?: number;
  rt: CelestialSymbolType;
}

export interface CompactSatelliteRecord {
  i: string;
  n: string;
  p: string;
  r?: number;
  re?: number;
  me?: number;
  c?: PlanetComposition;
  rt?: CelestialSymbolType;
  o: OrbitTuple;
  d?: string;
}

export type CompactPlanetaryRing = [
  id: string,
  name: string,
  innerRadiusAu: number,
  outerRadiusAu: number,
];

export interface CompactExoplanet {
  i: string;
  n: string;
  l: string;
  y?: number;
  d?: number | string;
  e?: number;
  j?: number;
  r?: number;
  R?: number;
  T?: number;
  s?: number;
  c: 1 | 2 | 3 | 4;
  g?: number;
  tl?: 1;
  H?: number;
  h?: 1;
  at?: number;
  rg?: CompactPlanetaryRing[];
  o?: OrbitTuple;
  C?: 2 | 3 | 4;
  f?: number;
  rt?: CelestialSymbolType;
  sat?: CompactSatelliteRecord[];
}

export interface CompactCircumstellarDisk {
  i: string;
  n: string;
  k: 1 | 2 | 3;
  a: [innerRadiusAu: number, outerRadiusAu: number, semiMajorAxisAu: number];
  T?: number;
  c: string;
  C?: 2 | 3 | 4;
  rt?: CelestialSymbolType;
}

export interface CompactSystemManifest {
  t?: 'sys';
  i?: string;
  n: string;
  P?: string;
  p: [number, number, number];
  v?: [number, number, number];
  q?: string;
  S: CompactStellarComponent[];
  E: CompactExoplanet[];
  D?: CompactCircumstellarDisk[];
  b?: PlanetCompositionCounts;
  h?: 1;
  g?: number;
  o?: string;
  H?: number;
  pi?: number;
}

export interface CompactGalacticStructure {
  t?: 'str';
  i?: string;
  n: string;
  k: number;
  p: [number, number, number];
  r?: number;
  a?: number;
  c?: number;
  g?: string[];
  d?: string;
  C?: 2 | 3 | 4;
  f?: number;
  rt?: CelestialSymbolType;
}

export interface CompactSolarSystemBody {
  t?: typeof COMPACT_SOLAR_BODY_TAG;
  i?: string;
  n: string;
  k: number;
  b?: string;
  r: number;
  m?: number;
  g?: number;
  a?: number;
  R?: number;
  at?: number;
  rg?: CompactPlanetaryRing[];
  o?: OrbitTuple;
  tags?: string[];
  C?: 2 | 3 | 4;
  f?: number;
  rt?: CelestialSymbolType;
  z?: 1;
  e?: 'belt' | 'kuiper';
  s?: string;
  u?: PlanetComposition;
  sg?: number;
  H?: number;
  tl?: 1;
  core?: 1;
}

export type CompactDetailRecord =
  | (CompactSystemManifest & { t: 'sys' })
  | (CompactGalacticStructure & { t: 'str' })
  | (CompactSolarSystemBody & { t: typeof COMPACT_SOLAR_BODY_TAG });

export interface ShardedBucketEnvelope<T> {
  v?: number;
  i: string;
  c: number;
  d: Record<string, T>;
}

export interface DetailsRoutingIndex {
  v: number;
  k: string[];
  s: Record<string, number>;
  d: Record<string, number>;
}

export type SearchSummaryTuple = [
  mag: number,
  spect: string,
  planetCount: number,
  hasHabitable?: 1,
];

export interface CompactSearchEntry {
  i: string;
  k?: number;
  n: string;
  s?: string;
  p?: [number, number, number];
  m?: SearchSummaryTuple;
  g?: number;
  b?: PlanetCompositionCounts;
  u?: CelestialClassification;
  H?: number;
  z?: 1;
  r?: number;
  e?: 'belt' | 'kuiper';
  o?: string;
  A?: number;
  P?: number;
  h?: 1;
  a?: string;
  w?: string;
  c?: string;
}

export interface SearchIndexEnvelope {
  v?: number;
  i: string;
  n: string;
  c: number;
  t: string;
  d: CompactSearchEntry[];
}

export interface DecodedSearchEntry {
  id: string;
  kind?: number;
  name: string;
  position?: [number, number, number];
  magnitude?: number;
  spectralType?: string;
  planetCount?: number;
  hasHabitableCandidate?: boolean;
  designations?: string[];
  parentSystemName?: string;
  systemId?: string;
  parentBodyId?: string;
  tagsBitmask?: number;
  isHomeSystem?: boolean;
  isHabitableZonePlanet?: boolean;
  subCategory?: string;
  reticleType?: CelestialSymbolType;
  semiMajorAxisAu?: number;
}
