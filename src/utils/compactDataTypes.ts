import type { CelestialClassification } from '../types/spatial';
import type { CelestialSymbolType } from '../types/astro';
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
  k?: 'star' | 'white-dwarf' | 'brown-dwarf' | 'neutron-star' | 'black-hole' | number;
  cl?: 'star' | 'white-dwarf' | 'brown-dwarf' | 'neutron-star' | 'black-hole';
  rt?: CelestialSymbolType;
  e?: number;
  b?: [number, number, number, number];
  h?: 1;
  g?: number;
  q?: string;
  C?: 2 | 3 | 4;
  f?: number;
  H?: number;
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
  rt?: CelestialSymbolType;
}

export type CompactStarRecord = CompactStellarComponent;

export interface CompactSatelliteRecord {
  i: string;
  n: string;
  p: string;
  r?: number;
  re?: number;
  me?: number;
  c?: 'terrestrial' | 'super-earth' | 'sub-neptune' | 'gas-giant';
  rt?: CelestialSymbolType;
  o: OrbitTuple;
  d?: string;
}

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
  c?: 2 | 3 | 4;
  g?: number;
  H?: number;
  h?: 1;
  o?: OrbitTuple;
  C?: 2 | 3 | 4;
  f?: number;
  rt?: CelestialSymbolType;
  sat?: CompactSatelliteRecord[];
}

export type CompactPlanetRecord = CompactExoplanet;

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

export type CompactDiskRecord = CompactCircumstellarDisk;

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
  b?: [number, number, number, number];
  h?: 1;
  g?: number;
  o?: string;
  H?: number;
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

export type CompactStructureRecord = CompactGalacticStructure;

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
  o?: OrbitTuple;
  tags?: string[];
  C?: 2 | 3 | 4;
  f?: number;
  rt?: CelestialSymbolType;
  z?: 1;
  e?: 'belt' | 'kuiper';
  s?: string;
  u?: 'terrestrial' | 'super-earth' | 'sub-neptune' | 'gas-giant';
  core?: 1;
}

export type CompactMinorBodyRecord = CompactSolarSystemBody;

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
  b?: [number, number, number, number];
  u?: CelestialClassification | 'super-earth' | 'sub-neptune';
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
