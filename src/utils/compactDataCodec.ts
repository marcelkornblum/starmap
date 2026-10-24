import type { CelestialClassification } from '../components/canvas/cartography/reticleGeometry';
import type {
  ObservationalConfidence,
  SystemSummaryNode,
  SystemManifest,
  StellarComponent,
  ExoplanetRecord,
  KeplerianOrbit,
  GalacticStructureRecord,
  SolarSystemBodyRecord,
  SectorPartitionManifest,
  CircumstellarDiskKind,
  CircumstellarDiskRecord,
} from '../types/astro';
import {
  classifyPlanetPhysical,
  computePlanetCompositionCounts,
  computePlanetHazardMask,
  computePlanetSurfaceGravityG,
  formatSectorId,
  isPlanetHabitableCandidate,
} from './astroMath';
import {
  buildCleanKeys,
  expandGlieseVariants,
  resolveStarDisplayName,
} from './nomenclature';

export const CONFIDENCE_TO_CODE: Record<ObservationalConfidence, 1 | 2 | 3 | 4> = {
  confirmed: 1,
  candidate: 2,
  theoretical: 3,
  unverified: 4,
};

export const CODE_TO_CONFIDENCE: Record<number, ObservationalConfidence> = {
  1: 'confirmed',
  2: 'candidate',
  3: 'theoretical',
  4: 'unverified',
};

export const THEORETICAL_STAR_FLAGS = {
  SPECT: 1,
  RADIAL_VELOCITY: 2,
} as const;

export const THEORETICAL_PLANET_FLAGS = {
  EQUILIBRIUM_TEMP: 1,
  MASS: 2,
  RADIUS: 4,
  ESI: 8,
} as const;

export const THEORETICAL_STRUCTURE_FLAGS = {
  DIST: 1,
} as const;

export const THEORETICAL_SOLAR_FLAGS = {
  RADIUS: 1,
} as const;

/**
 * Computes a deterministic 1-character Base36 bucket key ('0'-'9', 'a'-'z')
 * using 32-bit FNV-1a hashing modulo 36.
 * Guarantees uniform distribution across all 36 buckets even when IDs share prefixes
 * such as "gaia-", "hip-", "hd-", "ngc-", or "pha-".
 */
export function getShardKey(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 36).toString(36);
}

export type OrbitTuple = [
  semiMajorAxis: number,
  eccentricity: number,
  inclination: number,
  ascendingNode: number,
  argumentOfPeriapsis: number,
  meanAnomaly: number,
  periodDays: number,
];

export function encodeOrbitTuple(orbit?: KeplerianOrbit): OrbitTuple | undefined {
  if (!orbit) return undefined;
  return [
    orbit.semiMajorAxis,
    orbit.eccentricity,
    orbit.inclination,
    orbit.ascendingNode,
    orbit.argumentOfPeriapsis,
    orbit.meanAnomaly,
    orbit.periodDays,
  ];
}

export function decodeOrbitTuple(tuple?: OrbitTuple): KeplerianOrbit | undefined {
  if (!tuple || tuple.length < 7) return undefined;
  return {
    semiMajorAxis: tuple[0],
    eccentricity: tuple[1],
    inclination: tuple[2],
    ascendingNode: tuple[3],
    argumentOfPeriapsis: tuple[4],
    meanAnomaly: tuple[5],
    periodDays: tuple[6],
  };
}

const PLANET_CENSUS_BITS: Record<
  'terrestrial' | 'super-earth' | 'ice-giant' | 'gas-giant',
  number
> = {
  terrestrial: 1,
  'ice-giant': 2,
  'gas-giant': 4,
  'super-earth': 8,
};

function encodePlanetCensusMask(
  census?: ('terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant')[],
): number | undefined {
  if (!census || census.length === 0) return undefined;
  let mask = 0;
  for (const cat of census) {
    mask |= PLANET_CENSUS_BITS[cat] || 0;
  }
  return mask > 0 ? mask : undefined;
}

function decodePlanetCensusMask(
  mask?: number,
): ('terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant')[] | undefined {
  if (!mask) return undefined;
  const result: ('terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant')[] = [];
  if (mask & 1) result.push('terrestrial');
  if (mask & 8) result.push('super-earth');
  if (mask & 4) result.push('gas-giant');
  if (mask & 2) result.push('ice-giant');
  return result.length > 0 ? result : undefined;
}

export const SYSTEM_TAG_BITS: Record<string, number> = {
  HomeSystem: 1,
  SolarNeighborhood10pc: 2,
  NakedEye: 4,
  ExoplanetHost: 8,
  HabitableCandidate: 16,
  VariableStar: 32,
  RECONSGroundTruth: 64,
};

const BIT_TO_SYSTEM_TAG: [number, string][] = Object.entries(SYSTEM_TAG_BITS).map(([tag, bit]) => [
  bit,
  tag,
]);

export function encodeTagsMask(tags?: readonly string[]): number | undefined {
  if (!tags || tags.length === 0) return undefined;
  let mask = 0;
  for (const tag of tags) {
    mask |= SYSTEM_TAG_BITS[tag] || 0;
  }
  return mask > 0 ? mask : undefined;
}

export function decodeTagsMask(mask?: number): string[] | undefined {
  if (!mask) return undefined;
  const tags: string[] = [];
  for (const [bit, tag] of BIT_TO_SYSTEM_TAG) {
    if (mask & bit) tags.push(tag);
  }
  return tags.length > 0 ? tags : undefined;
}

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
  k?: number;
  e?: number;
  b?: [number, number, number, number] | [number, number, number];
  h?: 1;
  g?: number;
  q?: string;
  C?: 2 | 3 | 4;
  f?: number;
  H?: number;
}

export function encodeSummaryNode(
  node: SystemSummaryNode,
  options?: { omitId?: boolean; omitSectorId?: boolean },
): CompactSummaryNode {
  const rawGaiaSuffix = node.id.startsWith('gaia-') ? node.id.slice(5) : undefined;
  const isDefaultGaiaName =
    rawGaiaSuffix !== undefined && node.name === `Gaia DR3 ${rawGaiaSuffix}`;

  const compact: CompactSummaryNode = {
    p: [node.x, node.y, node.z],
    m: node.mag,
    M: node.absmag,
  };

  if (!options?.omitId) {
    compact.i = node.id;
  }
  if (!isDefaultGaiaName && node.name) {
    compact.n = node.name;
  }
  if (node.properName && node.properName !== node.name) {
    compact.P = node.properName;
  }
  if (
    node.velocity &&
    (node.velocity.vx !== 0 || node.velocity.vy !== 0 || node.velocity.vz !== 0)
  ) {
    compact.v = [node.velocity.vx, node.velocity.vy, node.velocity.vz];
  }
  if (node.spect && node.spect !== 'Unknown') {
    compact.s = node.spect;
  }
  if (node.ci !== null && node.ci !== undefined) {
    compact.c = node.ci;
  }
  if (node.starCount > 1) {
    compact.u = node.starCount;
  }
  if (node.planetCount > 0) {
    compact.k = node.planetCount;
  }
  const censusMask = encodePlanetCensusMask(node.planetCensus);
  if (censusMask !== undefined) {
    compact.e = censusMask;
  }
  if (
    node.planetCompositionCounts &&
    ((node.planetCompositionCounts[0] ?? 0) > 0 ||
      (node.planetCompositionCounts[1] ?? 0) > 0 ||
      (node.planetCompositionCounts[2] ?? 0) > 0 ||
      (node.planetCompositionCounts[3] !== undefined && node.planetCompositionCounts[3] > 0))
  ) {
    compact.b = node.planetCompositionCounts;
  }
  if (node.hasHabitableCandidate) {
    compact.h = 1;
  }
  const tagsMask = encodeTagsMask(node.tags);
  if (tagsMask !== undefined) {
    compact.g = tagsMask;
  }
  if (!options?.omitSectorId && node.sectorId) {
    compact.q = node.sectorId;
  }
  if (node.confidence && node.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[node.confidence];
    if (code !== 1) {
      compact.C = code;
    }
  }
  if (node.theoreticalFlags && node.theoreticalFlags > 0) {
    compact.f = node.theoreticalFlags;
  }
  if (node.hazardMask && node.hazardMask > 0) {
    compact.H = node.hazardMask;
  }

  return compact;
}

export function decodeSummaryNode(
  compact: CompactSummaryNode,
  fallbackId?: string,
  fallbackSectorId?: string,
): SystemSummaryNode {
  const id = String(compact.i ?? fallbackId ?? '');
  const [x, y, z] = compact.p;
  const dist = Math.round(Math.sqrt(x * x + y * y + z * z) * 1000) / 1000;

  const name = compact.n || resolveStarDisplayName({ fallbackId: id });

  const sectorId = compact.q ?? fallbackSectorId ?? formatSectorId(x, y, z);

  const result: SystemSummaryNode = {
    id,
    name,
    x,
    y,
    z,
    dist,
    mag: compact.m,
    absmag: compact.M,
    spect: compact.s ?? 'Unknown',
    starCount: compact.u ?? 1,
    planetCount: compact.k ?? 0,
    hasHabitableCandidate: compact.h === 1,
    sectorId,
    confidence: compact.C ? (CODE_TO_CONFIDENCE[compact.C] ?? 'confirmed') : 'confirmed',
  };

  if (compact.P) {
    result.properName = compact.P;
  } else if (compact.n && !id.startsWith('gaia-')) {
    result.properName = compact.n;
  }

  if (compact.c !== undefined) {
    result.ci = compact.c;
  }

  if (compact.v) {
    const [vx, vy, vz] = compact.v;
    const speed = Math.round(Math.sqrt(vx * vx + vy * vy + vz * vz) * 100) / 100;
    result.velocity = { vx, vy, vz, speed };
  }

  const planetCensus = decodePlanetCensusMask(compact.e);
  if (planetCensus) {
    result.planetCensus = planetCensus;
  }

  if (compact.b) {
    if (compact.b.length === 4) {
      result.planetCompositionCounts = [compact.b[0], compact.b[1], compact.b[2], compact.b[3]];
    } else {
      result.planetCompositionCounts = [compact.b[0], compact.b[1], compact.b[2]];
    }
  }

  const tags = decodeTagsMask(compact.g);
  if (tags) {
    result.tags = tags;
  }

  if (compact.f && compact.f > 0) {
    result.theoreticalFlags = compact.f;
  }

  if (compact.H && compact.H > 0) {
    result.hazardMask = compact.H;
  }

  return result;
}

export interface CompactSectorPartition {
  i: string;
  b: [number, number, number, number, number, number];
  c: number;
  d: Record<string, CompactSummaryNode>;
}

export function encodeSectorPartition(manifest: SectorPartitionManifest): CompactSectorPartition {
  const dict: Record<string, CompactSummaryNode> = {};
  for (const sys of manifest.systems) {
    dict[sys.id] = encodeSummaryNode(sys, { omitId: true, omitSectorId: true });
  }
  return {
    i: manifest.sectorId,
    b: [
      manifest.bounds.min.x,
      manifest.bounds.min.y,
      manifest.bounds.min.z,
      manifest.bounds.max.x,
      manifest.bounds.max.y,
      manifest.bounds.max.z,
    ],
    c: manifest.count,
    d: dict,
  };
}

export function decodeSectorPartition(
  raw: CompactSectorPartition | SectorPartitionManifest,
): SectorPartitionManifest {
  if ('systems' in raw && Array.isArray(raw.systems)) {
    return raw;
  }
  const compact = raw as CompactSectorPartition;
  const systems: SystemSummaryNode[] = [];
  for (const [id, node] of Object.entries(compact.d)) {
    systems.push(decodeSummaryNode(node, id, compact.i));
  }
  return {
    sectorId: compact.i,
    bounds: {
      min: { x: compact.b[0], y: compact.b[1], z: compact.b[2] },
      max: { x: compact.b[3], y: compact.b[4], z: compact.b[5] },
    },
    count: compact.c,
    systems,
  };
}

const DISCOVERY_METHOD_TO_CODE: Record<string, number> = {
  'Radial Velocity': 1,
  RV: 1,
  Transit: 2,
  Imaging: 3,
  Astrometry: 4,
  Microlensing: 5,
  Timing: 6,
};

const CODE_TO_DISCOVERY_METHOD: Record<number, string> = {
  1: 'Radial Velocity',
  2: 'Transit',
  3: 'Imaging',
  4: 'Astrometry',
  5: 'Microlensing',
  6: 'Timing',
};

const PLANET_COMP_TO_CODE: Record<'terrestrial' | 'ice-giant' | 'gas-giant' | 'super-earth', 1 | 2 | 3 | 4> = {
  terrestrial: 1,
  'ice-giant': 2,
  'gas-giant': 3,
  'super-earth': 4,
};

const CODE_TO_PLANET_COMP: Record<number, 'terrestrial' | 'ice-giant' | 'gas-giant' | 'super-earth'> = {
  1: 'terrestrial',
  2: 'ice-giant',
  3: 'gas-giant',
  4: 'super-earth',
};

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
}

export const DISK_KIND_TO_CODE: Record<CircumstellarDiskKind, 1 | 2 | 3> = {
  'asteroid-belt': 1,
  'kuiper-belt': 2,
  'debris-disk': 3,
};

export const CODE_TO_DISK_KIND: Record<number, CircumstellarDiskKind> = {
  1: 'asteroid-belt',
  2: 'kuiper-belt',
  3: 'debris-disk',
};

export interface CompactCircumstellarDisk {
  i: string;
  n: string;
  k: 1 | 2 | 3;
  a: [innerRadiusAu: number, outerRadiusAu: number, semiMajorAxisAu: number];
  T?: number;
  c: string;
  C?: 2 | 3 | 4;
}

export function encodeCircumstellarDisk(disk: CircumstellarDiskRecord): CompactCircumstellarDisk {
  const compact: CompactCircumstellarDisk = {
    i: disk.id,
    n: disk.name,
    k: DISK_KIND_TO_CODE[disk.kind] ?? 3,
    a: [disk.innerRadiusAu, disk.outerRadiusAu, disk.semiMajorAxisAu],
    c: disk.composition,
  };
  if (disk.tempK !== undefined) {
    compact.T = disk.tempK;
  }
  if (disk.confidence && disk.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[disk.confidence];
    if (code !== 1) {
      compact.C = code as 2 | 3 | 4;
    }
  }
  return compact;
}

export function decodeCircumstellarDisk(compact: CompactCircumstellarDisk): CircumstellarDiskRecord {
  const [innerRadiusAu, outerRadiusAu, semiMajorAxisAu] = compact.a;
  const result: CircumstellarDiskRecord = {
    id: compact.i,
    name: compact.n,
    kind: CODE_TO_DISK_KIND[compact.k] ?? 'debris-disk',
    innerRadiusAu,
    outerRadiusAu,
    semiMajorAxisAu,
    composition: compact.c,
    confidence: compact.C ? (CODE_TO_CONFIDENCE[compact.C] ?? 'confirmed') : 'confirmed',
  };
  if (compact.T !== undefined) {
    result.tempK = compact.T;
  }
  return result;
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
  b?: [number, number, number, number] | [number, number, number];
  h?: 1;
  g?: number;
  o?: string;
  H?: number;
}

export function encodeExoplanet(planet: ExoplanetRecord): CompactExoplanet {
  const compact: CompactExoplanet = {
    i: planet.id,
    n: planet.name,
    l: planet.letter,
  };
  if (planet.discoveryYear !== undefined) compact.y = planet.discoveryYear;
  if (planet.discoveryMethod) {
    compact.d = DISCOVERY_METHOD_TO_CODE[planet.discoveryMethod] ?? planet.discoveryMethod;
  }
  if (planet.massMearth !== undefined) {
    compact.e = planet.massMearth;
  } else if (planet.massMjup !== undefined) {
    compact.j = planet.massMjup;
  }
  if (planet.radiusRearth !== undefined) {
    compact.r = planet.radiusRearth;
  } else if (planet.radiusRjup !== undefined) {
    compact.R = planet.radiusRjup;
  }
  if (planet.equilibriumTempK !== undefined) compact.T = planet.equilibriumTempK;
  if (planet.esi !== undefined) compact.s = Math.round(planet.esi * 1000) / 1000;
  const surfaceGravityG =
    planet.surfaceGravityG ?? computePlanetSurfaceGravityG(planet);
  if (surfaceGravityG !== undefined) compact.g = surfaceGravityG;

  const hazardMask =
    planet.hazardMask ??
    computePlanetHazardMask({
      equilibriumTempK: planet.equilibriumTempK,
      surfaceGravityG,
      periodDays: planet.orbit?.periodDays,
      semiMajorAxisAu: planet.orbit?.semiMajorAxis,
      eccentricity: planet.orbit?.eccentricity,
    });
  if (hazardMask > 0) compact.H = hazardMask;

  const comp = planet.composition ?? classifyPlanetPhysical(planet);
  const compCode = PLANET_COMP_TO_CODE[comp];
  if (compCode !== 1) {
    compact.c = compCode as 2 | 3 | 4;
  }

  const isHz =
    planet.isHabitableCandidate ??
    isPlanetHabitableCandidate({
      equilibriumTempK: planet.equilibriumTempK,
      esi: planet.esi,
      semiMajorAxis: planet.orbit?.semiMajorAxis,
    });
  if (isHz) {
    compact.h = 1;
  }

  const orbitTuple = encodeOrbitTuple(planet.orbit);
  if (orbitTuple) compact.o = orbitTuple;
  if (planet.confidence && planet.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[planet.confidence];
    if (code !== 1) compact.C = code;
  }
  if (planet.theoreticalFlags && planet.theoreticalFlags > 0) {
    compact.f = planet.theoreticalFlags;
  }
  return compact;
}

export function decodeExoplanet(compact: CompactExoplanet): ExoplanetRecord {
  const massMearth =
    compact.e ?? (compact.j !== undefined ? Math.round(compact.j * 317.828 * 100) / 100 : undefined);
  const massMjup =
    compact.j ?? (compact.e !== undefined ? Math.round((compact.e / 317.828) * 10000) / 10000 : undefined);
  const radiusRearth =
    compact.r ?? (compact.R !== undefined ? Math.round(compact.R * 11.209 * 100) / 100 : undefined);
  const radiusRjup =
    compact.R ?? (compact.r !== undefined ? Math.round((compact.r / 11.209) * 10000) / 10000 : undefined);

  const discoveryMethod =
    typeof compact.d === 'number' ? CODE_TO_DISCOVERY_METHOD[compact.d] : compact.d;

  const orbit = decodeOrbitTuple(compact.o);
  const composition =
    (compact.c ? CODE_TO_PLANET_COMP[compact.c] : undefined) ??
    classifyPlanetPhysical({ massMearth, massMjup, radiusRearth, radiusRjup });
  const isHabitableCandidate =
    compact.h === 1 ||
    isPlanetHabitableCandidate({
      equilibriumTempK: compact.T,
      esi: compact.s,
      semiMajorAxis: orbit?.semiMajorAxis,
    });

  const surfaceGravityG =
    compact.g ??
    computePlanetSurfaceGravityG({ massMearth, radiusRearth });

  const hazardMask =
    compact.H ??
    computePlanetHazardMask({
      equilibriumTempK: compact.T,
      surfaceGravityG,
      periodDays: orbit?.periodDays,
      semiMajorAxisAu: orbit?.semiMajorAxis,
      eccentricity: orbit?.eccentricity,
    });

  const result: ExoplanetRecord = {
    id: compact.i,
    name: compact.n,
    letter: compact.l,
    discoveryYear: compact.y,
    discoveryMethod,
    massMearth,
    massMjup,
    radiusRearth,
    radiusRjup,
    equilibriumTempK: compact.T,
    esi: compact.s,
    ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}),
    ...(hazardMask > 0 ? { hazardMask } : {}),
    composition,
    isHabitableCandidate,
    orbit,
    confidence: compact.C ? (CODE_TO_CONFIDENCE[compact.C] ?? 'confirmed') : 'confirmed',
  };
  if (compact.f && compact.f > 0) {
    result.theoreticalFlags = compact.f;
  }
  return result;
}

export function encodeSystemManifest(
  sys: SystemManifest,
  options?: { omitId?: boolean; omitSectorId?: boolean },
): CompactSystemManifest {
  const compact: CompactSystemManifest = {
    n: sys.name,
    p: [sys.x, sys.y, sys.z],
    S: sys.stars.map((s) => {
      const comp: CompactStellarComponent = {
        i: s.id,
        n: s.name,
        s: s.spectralType,
        m: s.mag,
        M: s.absmag,
      };
      if (s.componentDesignation && s.componentDesignation !== 'A') {
        comp.d = s.componentDesignation;
      }
      if (s.luminosityLsun !== undefined) comp.l = s.luminosityLsun;
      if (s.massMsun !== undefined) comp.u = s.massMsun;
      if (s.radiusRsun !== undefined) comp.r = s.radiusRsun;
      if (s.effectiveTempK !== undefined) comp.T = s.effectiveTempK;
      return comp;
    }),
    E: sys.planets.map(encodeExoplanet),
  };

  if (!options?.omitId) compact.i = sys.id;
  if (sys.properName && sys.properName !== sys.name) compact.P = sys.properName;
  if (
    sys.velocity &&
    (sys.velocity.vx !== 0 || sys.velocity.vy !== 0 || sys.velocity.vz !== 0)
  ) {
    compact.v = [sys.velocity.vx, sys.velocity.vy, sys.velocity.vz];
  }
  if (!options?.omitSectorId && sys.sectorId) compact.q = sys.sectorId;
  const counts = sys.planetCompositionCounts ?? computePlanetCompositionCounts(sys.planets);
  if (
    counts &&
    ((counts[0] ?? 0) > 0 ||
      (counts[1] ?? 0) > 0 ||
      (counts[2] ?? 0) > 0 ||
      (counts[3] !== undefined && counts[3] > 0))
  ) {
    compact.b = counts;
  }
  const hasHz =
    sys.hasHabitableCandidate ??
    sys.planets.some(
      (p) =>
        p.isHabitableCandidate ??
        isPlanetHabitableCandidate(
          {
            equilibriumTempK: p.equilibriumTempK,
            esi: p.esi,
            semiMajorAxis: p.orbit?.semiMajorAxis,
          },
          sys.stars[0]?.luminosityLsun,
        ),
    );
  if (hasHz) {
    compact.h = 1;
  }
  const tagsMask = encodeTagsMask(sys.tags);
  if (tagsMask !== undefined) {
    compact.g = tagsMask;
  }
  if (sys.overviewText) compact.o = sys.overviewText;
  if (sys.hazardMask && sys.hazardMask > 0) {
    compact.H = sys.hazardMask;
  }
  if (sys.disks && sys.disks.length > 0) {
    compact.D = sys.disks.map(encodeCircumstellarDisk);
  }

  return compact;
}

export function decodeSystemManifest(
  compact: CompactSystemManifest,
  fallbackId?: string,
  fallbackSectorId?: string,
): SystemManifest {
  const id = compact.i ?? fallbackId ?? '';
  const [x, y, z] = compact.p;
  const dist = Math.round(Math.sqrt(x * x + y * y + z * z) * 1000) / 1000;
  const sectorId = compact.q ?? fallbackSectorId ?? formatSectorId(x, y, z);

  const stars: StellarComponent[] = compact.S.map((s) => ({
    id: s.i,
    name: s.n,
    componentDesignation: s.d ?? 'A',
    spectralType: s.s,
    mag: s.m,
    absmag: s.M,
    luminosityLsun: s.l,
    massMsun: s.u,
    radiusRsun: s.r,
    effectiveTempK: s.T,
  }));

  const planets: ExoplanetRecord[] = compact.E.map(decodeExoplanet);
  const planetCompositionCounts =
    compact.b ?? computePlanetCompositionCounts(planets);
  const hasHabitableCandidate =
    compact.h === 1 || planets.some((p) => Boolean(p.isHabitableCandidate));
  const tags = decodeTagsMask(compact.g);
  const disks = compact.D ? compact.D.map(decodeCircumstellarDisk) : undefined;

  const result: SystemManifest = {
    id,
    name: compact.n,
    properName: compact.P,
    x,
    y,
    z,
    dist,
    sectorId,
    stars,
    planets,
    ...(disks && disks.length > 0 ? { disks } : {}),
    ...(planetCompositionCounts ? { planetCompositionCounts } : {}),
    hasHabitableCandidate,
    ...(tags ? { tags } : {}),
    overviewText: compact.o,
    ...(compact.H && compact.H > 0 ? { hazardMask: compact.H } : {}),
  };

  if (compact.v) {
    const [vx, vy, vz] = compact.v;
    const speed = Math.round(Math.sqrt(vx * vx + vy * vy + vz * vz) * 100) / 100;
    result.velocity = { vx, vy, vz, speed };
  }

  return result;
}

const STRUCTURE_TYPE_TO_CODE: Record<GalacticStructureRecord['type'], number> = {
  OpenCluster: 1,
  GlobularCluster: 2,
  SupernovaRemnant: 3,
  Pulsar: 4,
  PlanetaryNebula: 5,
  InterstellarMedium: 6,
  MovingGroup: 7,
  EmissionNebula: 8,
  DarkNebula: 9,
  DeepSkyLandmark: 10,
};

const CODE_TO_STRUCTURE_TYPE: Record<number, GalacticStructureRecord['type']> = {
  1: 'OpenCluster',
  2: 'GlobularCluster',
  3: 'SupernovaRemnant',
  4: 'Pulsar',
  5: 'PlanetaryNebula',
  6: 'InterstellarMedium',
  7: 'MovingGroup',
  8: 'EmissionNebula',
  9: 'DarkNebula',
  10: 'DeepSkyLandmark',
};

const DEFAULT_STRUCTURE_DESCRIPTIONS: Record<number, string> = {
  1: 'Galactic open star cluster cataloged in Cantat-Gaudin Gaia survey.',
  2: 'Milky Way halo globular cluster from Harris (2010) catalog.',
  3: "Galactic supernova remnant from Green's SNR Catalogue.",
  4: 'Rotation-powered pulsar from ATNF Pulsar Database.',
  9: 'Dark absorption cloud cataloged by E. E. Barnard.',
  10: 'Deep sky landmark cataloged in OpenNGC.',
};

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
}

export function encodeGalacticStructure(
  struct: GalacticStructureRecord,
  options?: { omitId?: boolean },
): CompactGalacticStructure {
  const k = STRUCTURE_TYPE_TO_CODE[struct.type] ?? 10;
  const compact: CompactGalacticStructure = {
    n: struct.name,
    k,
    p: [
      Math.round(struct.x * 100) / 100,
      Math.round(struct.y * 100) / 100,
      Math.round(struct.z * 100) / 100,
    ],
  };
  if (!options?.omitId) compact.i = struct.id;
  if (struct.radiusPc !== undefined && struct.radiusPc !== null) compact.r = struct.radiusPc;
  if (struct.ageMyr !== undefined && struct.ageMyr !== null) compact.a = struct.ageMyr;
  if (struct.memberCount !== undefined && struct.memberCount !== null) {
    compact.c = struct.memberCount;
  }
  const extraDesig = struct.designations.filter((d) => d !== struct.name);
  if (extraDesig.length > 0) {
    compact.g = extraDesig;
  }
  const defaultDesc = DEFAULT_STRUCTURE_DESCRIPTIONS[k];
  if (struct.description && struct.description !== defaultDesc) {
    compact.d = struct.description;
  }
  if (struct.confidence && struct.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[struct.confidence];
    if (code !== 1) compact.C = code;
  }
  if (struct.theoreticalFlags && struct.theoreticalFlags > 0) {
    compact.f = struct.theoreticalFlags;
  }
  return compact;
}

export function decodeGalacticStructure(
  compact: CompactGalacticStructure,
  fallbackId?: string,
): GalacticStructureRecord {
  const id = compact.i ?? fallbackId ?? '';
  const [x, y, z] = compact.p;
  const dist = Math.round(Math.sqrt(x * x + y * y + z * z) * 100) / 100;
  const type = CODE_TO_STRUCTURE_TYPE[compact.k] ?? 'DeepSkyLandmark';
  const description =
    compact.d ?? DEFAULT_STRUCTURE_DESCRIPTIONS[compact.k] ?? 'Galactic deep-sky structure.';

  const result: GalacticStructureRecord = {
    id,
    name: compact.n,
    type,
    x,
    y,
    z,
    dist,
    radiusPc: compact.r,
    ageMyr: compact.a,
    memberCount: compact.c,
    designations: compact.g ?? [compact.n],
    description,
    confidence: compact.C ? (CODE_TO_CONFIDENCE[compact.C] ?? 'confirmed') : 'confirmed',
  };
  if (compact.f && compact.f > 0) {
    result.theoreticalFlags = compact.f;
  }
  return result;
}

const SOLAR_CLASS_TO_CODE: Record<SolarSystemBodyRecord['classification'], number> = {
  Star: 1,
  Planet: 2,
  DwarfPlanet: 3,
  Moon: 4,
  AsteroidNEO: 5,
  AsteroidMainBelt: 6,
  AsteroidDistant: 7,
  Comet: 8,
};

const CODE_TO_SOLAR_CLASS: Record<number, SolarSystemBodyRecord['classification']> = {
  1: 'Star',
  2: 'Planet',
  3: 'DwarfPlanet',
  4: 'Moon',
  5: 'AsteroidNEO',
  6: 'AsteroidMainBelt',
  7: 'AsteroidDistant',
  8: 'Comet',
};

export interface CompactSolarSystemBody {
  t?: 'sol';
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
}

export function encodeSolarSystemBody(
  body: SolarSystemBodyRecord,
  options?: { omitId?: boolean },
): CompactSolarSystemBody {
  const compact: CompactSolarSystemBody = {
    n: body.name,
    k: SOLAR_CLASS_TO_CODE[body.classification] ?? 6,
    r: body.meanRadiusKm,
  };
  if (!options?.omitId) compact.i = body.id;
  if (body.parentBodyId && body.parentBodyId !== 'sol') {
    compact.b = body.parentBodyId;
  }
  if (body.massKg !== undefined) compact.m = body.massKg;
  if (body.gm !== undefined) compact.g = body.gm;
  if (body.albedo !== undefined) compact.a = body.albedo;
  if (body.rotationalPeriodHours !== undefined) compact.R = body.rotationalPeriodHours;
  const orbitTuple = encodeOrbitTuple(body.orbit);
  if (orbitTuple) compact.o = orbitTuple;
  if (body.tags && body.tags.length > 0) compact.tags = body.tags;
  if (body.confidence && body.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[body.confidence];
    if (code !== 1) compact.C = code;
  }
  if (body.theoreticalFlags && body.theoreticalFlags > 0) {
    compact.f = body.theoreticalFlags;
  }
  return compact;
}

export function decodeSolarSystemBody(
  compact: CompactSolarSystemBody,
  fallbackId?: string,
): SolarSystemBodyRecord {
  const id = compact.i ?? fallbackId ?? '';
  const classification = CODE_TO_SOLAR_CLASS[compact.k] ?? 'AsteroidMainBelt';
  const result: SolarSystemBodyRecord = {
    id,
    name: compact.n,
    classification,
    parentBodyId: compact.b ?? 'sol',
    meanRadiusKm: compact.r,
    massKg: compact.m,
    gm: compact.g,
    albedo: compact.a,
    rotationalPeriodHours: compact.R,
    orbit: decodeOrbitTuple(compact.o),
    tags: compact.tags,
    confidence: compact.C ? (CODE_TO_CONFIDENCE[compact.C] ?? 'confirmed') : 'confirmed',
  };
  if (compact.f && compact.f > 0) {
    result.theoreticalFlags = compact.f;
  }
  return result;
}

export type CompactDetailRecord =
  | (CompactSystemManifest & { t: 'sys' })
  | (CompactGalacticStructure & { t: 'str' })
  | (CompactSolarSystemBody & { t: 'sol' });

export interface ShardedBucketEnvelope<T> {
  i: string;
  c: number;
  d: Record<string, T>;
}

const ALL_36_BUCKETS = Array.from({ length: 36 }, (_, idx) => idx.toString(36));

/**
 * Builds the 36-bucket ('0'..'z') O(1) dictionary shards for both
 * summaries (`public/data/summaries/<0..z>.json`) and full details (`public/data/details/<0..z>.json`).
 */
export function buildShardedSummariesAndDetails(input: {
  systems: SystemSummaryNode[];
  manifests: SystemManifest[];
  structures: GalacticStructureRecord[];
  solarBodies: SolarSystemBodyRecord[];
}): {
  summariesByBucket: Map<string, ShardedBucketEnvelope<CompactSummaryNode>>;
  detailsByBucket: Map<string, ShardedBucketEnvelope<CompactDetailRecord>>;
} {
  const summariesByBucket = new Map<string, ShardedBucketEnvelope<CompactSummaryNode>>();
  const detailsByBucket = new Map<string, ShardedBucketEnvelope<CompactDetailRecord>>();

  for (const b of ALL_36_BUCKETS) {
    summariesByBucket.set(b, { i: b, c: 0, d: {} });
    detailsByBucket.set(b, { i: b, c: 0, d: {} });
  }

  for (const sys of input.systems) {
    const bucketKey = getShardKey(sys.id);
    const env = summariesByBucket.get(bucketKey);
    if (!env) continue;
    env.d[sys.id] = encodeSummaryNode(sys, { omitId: true });
    env.c++;
  }

  for (const manifest of input.manifests) {
    const bucketKey = getShardKey(manifest.id);
    const env = detailsByBucket.get(bucketKey);
    if (!env) continue;
    env.d[manifest.id] = {
      t: 'sys',
      ...encodeSystemManifest(manifest, { omitId: true }),
    };
    env.c++;
  }

  for (const struct of input.structures) {
    const bucketKey = getShardKey(struct.id);
    const env = detailsByBucket.get(bucketKey);
    if (!env) continue;
    env.d[struct.id] = {
      t: 'str',
      ...encodeGalacticStructure(struct, { omitId: true }),
    };
    env.c++;
  }

  for (const body of input.solarBodies) {
    const targetId =
      body.id === 'sol' && body.classification === 'Star' ? 'sol-A' : body.id;
    const bucketKey = getShardKey(targetId);
    const env = detailsByBucket.get(bucketKey);
    if (!env) continue;
    env.d[targetId] = {
      t: 'sol',
      ...encodeSolarSystemBody(body, { omitId: true }),
    };
    env.c++;
  }

  return { summariesByBucket, detailsByBucket };
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
  /** Precalculated system tags bitmask (`SYSTEM_TAG_BITS`) */
  g?: number;
  /** Precalculated planet composition counts `[terrestrial, superEarth, iceGiant, gasGiant]` or legacy 3-tuple */
  b?: [number, number, number, number] | [number, number, number];
  /** Precalculated reticle / composition classification when non-default */
  u?: CelestialClassification | 'super-earth' | 'sub-neptune';
  /** Precalculated environmental hazard bitmask (`SYSTEM_HAZARD_BITS` or `PLANET_HAZARD_BITS`) */
  H?: number;
  /** Precalculated habitable zone candidate flag (`1` = true) on planet entries (`k: 2`) */
  z?: 1;
  /** Precalculated 1-indexed radial orbital rank within parent system or host planet (1 = closest orbit to primary, N = furthest) */
  r?: number;
  /** Precalculated orbital region overlap ('belt' = Main Asteroid Belt, 'kuiper' = Kuiper Belt / Outer Disk) */
  e?: 'belt' | 'kuiper';
  /** Precalculated parent body ID (`parentBodyId`) when orbiting a planet/dwarf-planet (e.g. `'earth'`, `'jupiter'`) */
  o?: string;
  /** Precalculated orbital semi-major axis in AU (`semiMajorAxisAu`) */
  A?: number;
  /** Precalculated orbital period in days (`periodDays`) */
  P?: number;
  h?: 1;
  a?: string;
  w?: string;
  c?: string;
}

export interface SearchIndexEnvelope {
  i: string;
  n: string;
  c: number;
  t: string;
  d: CompactSearchEntry[];
}

/**
 * Determines whether a star system summary node is eligible for indexing in the search catalog.
 * Excludes unnamed faint Gaia field stars outside the 10 pc solar neighbourhood without planets.
 */
export function isSearchableStarSystem(sys: SystemSummaryNode): boolean {
  const rawGaiaSuffix = sys.id.startsWith('gaia-') ? sys.id.slice(5) : undefined;
  const isUnnamedGaia =
    rawGaiaSuffix !== undefined && sys.name === `Gaia DR3 ${rawGaiaSuffix}`;
  if (isUnnamedGaia && sys.planetCount === 0 && sys.dist > 10 && sys.mag > 6.5) {
    return false;
  }
  return true;
}

/**
 * Determines whether a searchable star system qualifies for the instant Core search tier (`core.json`).
 */
export function isCoreSearchStarSystem(sys: SystemSummaryNode): boolean {
  return (
    sys.dist <= 10 ||
    sys.mag <= 6.5 ||
    sys.planetCount > 0 ||
    Boolean(sys.properName) ||
    (!sys.name.startsWith('HIP ') &&
      !sys.name.startsWith('HD ') &&
      !sys.name.startsWith('Gaia '))
  );
}

/**
 * Determines whether a Solar System minor body qualifies for the instant Core search tier (`core.json`).
 * Includes curated landmark asteroids, comets, interstellar visitors, and spacecraft while keeping bulk
 * MPC/SBDB catalog rows (`pha-*`, `distant-*`, `comet-*`) in the Full/Minor-Bodies shards.
 */
export function isCoreSearchMinorBody(body: SolarSystemBodyRecord): boolean {
  return (
    !body.id.startsWith('pha-') &&
    !body.id.startsWith('distant-') &&
    !body.id.startsWith('comet-')
  );
}

/**
 * Determines whether a galactic structure qualifies for the instant Core search tier (`core.json`).
 */
export function isCoreSearchStructure(struct: GalacticStructureRecord): boolean {
  const isCuratedStructure =
    !struct.id.startsWith('cluster-') &&
    !struct.id.startsWith('globular-') &&
    !struct.id.startsWith('snr-') &&
    !struct.id.startsWith('pulsar-') &&
    !struct.id.startsWith('barnard-') &&
    !struct.id.startsWith('ngc-');

  return (
    isCuratedStructure ||
    struct.type === 'DeepSkyLandmark' ||
    struct.designations.some((d) => d.startsWith('M ') || /^M\d+$/i.test(d)) ||
    struct.dist <= 200
  );
}

/**
 * Constructs a standardized SearchIndexEnvelope for a search shard.
 */
export function buildSearchIndexEnvelope(
  id: string,
  name: string,
  entries: CompactSearchEntry[],
  timestamp: string,
): SearchIndexEnvelope {
  return {
    i: id,
    n: name,
    c: entries.length,
    t: timestamp,
    d: entries,
  };
}

/**
 * Builds the Dual-Tier Composite Search Indices (`core.json`, `full.json`) and
 * the 5 Category-Sharded Search Indices (`stars.json`, `planets.json`, `structures.json`, `minor-bodies.json`, `layers.json`).
 */
export function buildSearchIndices(input: {
  systems: SystemSummaryNode[];
  manifests: SystemManifest[];
  structures: GalacticStructureRecord[];
  solarBodies: SolarSystemBodyRecord[];
  starAliasesById?: Map<string, string[]>;
  layerEntries?: CompactSearchEntry[];
}): {
  core: SearchIndexEnvelope;
  full: SearchIndexEnvelope;
  stars: SearchIndexEnvelope;
  planets: SearchIndexEnvelope;
  structures: SearchIndexEnvelope;
  minorBodies: SearchIndexEnvelope;
  layers: SearchIndexEnvelope;
} {
  const nowIso = new Date().toISOString();
  const coreEntries: CompactSearchEntry[] = [];
  const fullEntries: CompactSearchEntry[] = [];
  const starsEntries: CompactSearchEntry[] = [];
  const planetsEntries: CompactSearchEntry[] = [];
  const structuresEntries: CompactSearchEntry[] = [];
  const minorBodiesEntries: CompactSearchEntry[] = [];
  const layerEntries: CompactSearchEntry[] = input.layerEntries ? [...input.layerEntries] : [];

  // 1. Index Star Systems
  for (const sys of input.systems) {
    if (!isSearchableStarSystem(sys)) {
      continue;
    }

    const rawAliases = input.starAliasesById?.get(sys.id) ?? [
      sys.name,
      ...(sys.properName ? [sys.properName] : []),
    ];
    const cleanKeys = buildCleanKeys(rawAliases);

    const summaryTuple: SearchSummaryTuple = sys.hasHabitableCandidate
      ? [sys.mag, sys.spect || 'Unknown', sys.planetCount, 1]
      : [sys.mag, sys.spect || 'Unknown', sys.planetCount];

    const entry: CompactSearchEntry = {
      i: sys.id,
      n: sys.name,
      m: summaryTuple,
    };
    if (sys.x !== 0 || sys.y !== 0 || sys.z !== 0) {
      entry.p = [sys.x, sys.y, sys.z];
    }
    if (sys.id === 'sol' || sys.name === 'Sol') {
      entry.h = 1;
    }
    const tagsMask = encodeTagsMask(sys.tags);
    if (tagsMask !== undefined) {
      entry.g = tagsMask;
    }
    if (
      sys.planetCompositionCounts &&
      ((sys.planetCompositionCounts[0] ?? 0) > 0 ||
        (sys.planetCompositionCounts[1] ?? 0) > 0 ||
        (sys.planetCompositionCounts[2] ?? 0) > 0 ||
        (sys.planetCompositionCounts[3] !== undefined && sys.planetCompositionCounts[3] > 0))
    ) {
      entry.b = sys.planetCompositionCounts;
    }
    if (sys.hazardMask && sys.hazardMask > 0) {
      entry.H = sys.hazardMask;
    }
    const spectUpper = (sys.spect ?? '').trim().toUpperCase();
    if (spectUpper.startsWith('D')) {
      entry.u = 'white-dwarf';
    } else if (
      spectUpper.startsWith('L') ||
      spectUpper.startsWith('T') ||
      spectUpper.startsWith('Y')
    ) {
      entry.u = 'brown-dwarf';
    } else if (spectUpper.startsWith('PSR')) {
      entry.u = 'neutron-star';
    }
    if (cleanKeys) {
      entry.a = cleanKeys;
    }

    starsEntries.push(entry);
    fullEntries.push(entry);

    if (isCoreSearchStarSystem(sys)) {
      coreEntries.push(entry);
    }
  }

  // 2. Index Exoplanets from System Manifests (excluding Sol, whose planets are indexed in Step 3)
  for (const manifest of input.manifests) {
    if (manifest.id === 'sol') {
      continue;
    }
    const hostAliases = input.starAliasesById?.get(manifest.id) ?? [];
    const sortedPlanets = [...manifest.planets].sort(
      (a, b) =>
        (a.orbit?.semiMajorAxis ?? Number.POSITIVE_INFINITY) -
        (b.orbit?.semiMajorAxis ?? Number.POSITIVE_INFINITY),
    );
    const exoplanetRankMap = new Map<string, number>();
    sortedPlanets.forEach((p, idx) => {
      if (p.orbit?.semiMajorAxis !== undefined) {
        exoplanetRankMap.set(p.id, idx + 1);
      }
    });

    for (const planet of manifest.planets) {
      const cleanKeys = buildCleanKeys([
        planet.name,
        ...expandGlieseVariants(planet.name),
        `${manifest.name} ${planet.letter}`,
        ...(manifest.properName ? [`${manifest.properName} ${planet.letter}`] : []),
        ...hostAliases.map((alias) => `${alias} ${planet.letter}`),
      ]);

      const comp = planet.composition ?? classifyPlanetPhysical(planet);
      const isHz =
        planet.isHabitableCandidate ??
        isPlanetHabitableCandidate(
          {
            equilibriumTempK: planet.equilibriumTempK,
            esi: planet.esi,
            semiMajorAxis: planet.orbit?.semiMajorAxis,
          },
          manifest.stars[0]?.luminosityLsun,
        );

      const planetEntry: CompactSearchEntry = {
        i: planet.id,
        k: 2,
        n: planet.name,
        s: manifest.id,
        p: [manifest.x, manifest.y, manifest.z],
        a: cleanKeys,
      };
      if (exoplanetRankMap.has(planet.id)) {
        planetEntry.r = exoplanetRankMap.get(planet.id);
      }
      if (planet.orbit?.semiMajorAxis !== undefined) {
        planetEntry.A = Math.round(planet.orbit.semiMajorAxis * 10000) / 10000;
      }
      if (planet.orbit?.periodDays !== undefined) {
        planetEntry.P = Math.round(planet.orbit.periodDays * 1000) / 1000;
      }
      if (comp !== 'terrestrial') {
        planetEntry.u = comp;
      }
      if (isHz) {
        planetEntry.z = 1;
      }
      const surfaceGravityG =
        planet.surfaceGravityG ?? computePlanetSurfaceGravityG(planet);
      const hazardMask =
        planet.hazardMask ??
        computePlanetHazardMask({
          equilibriumTempK: planet.equilibriumTempK,
          surfaceGravityG,
          periodDays: planet.orbit?.periodDays,
          semiMajorAxisAu: planet.orbit?.semiMajorAxis,
          eccentricity: planet.orbit?.eccentricity,
        });
      if (hazardMask > 0) {
        planetEntry.H = hazardMask;
      }

      planetsEntries.push(planetEntry);
      coreEntries.push(planetEntry);
      fullEntries.push(planetEntry);
    }
  }

  // 3. Index Solar System Bodies (Planets, Dwarf Planets, Moons vs Minor Bodies)
  const orbitRankMap = new Map<string, number>();
  const solarBodiesByParent = new Map<string, SolarSystemBodyRecord[]>();

  for (const body of input.solarBodies) {
    if (body.classification === 'Star') continue;
    if (body.orbit?.semiMajorAxis !== undefined && body.orbit.semiMajorAxis > 0) {
      const parentKey =
        body.parentBodyId && body.parentBodyId !== 'sol'
          ? body.parentBodyId
          : 'sol';
      let list = solarBodiesByParent.get(parentKey);
      if (!list) {
        list = [];
        solarBodiesByParent.set(parentKey, list);
      }
      list.push(body);
    }
  }

  for (const [, bodies] of solarBodiesByParent) {
    bodies.sort((a, b) => {
      const diff = (a.orbit?.semiMajorAxis ?? 0) - (b.orbit?.semiMajorAxis ?? 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
    bodies.forEach((b, idx) => {
      orbitRankMap.set(b.id, idx + 1);
    });
  }

  for (const body of input.solarBodies) {
    if (body.classification === 'Star') continue;
    const parentKey =
      body.parentBodyId && body.parentBodyId !== 'sol'
        ? body.parentBodyId
        : 'sol';
    const cleanKeys = buildCleanKeys([body.name, body.id, ...(body.tags ?? [])]);

    if (
      body.classification === 'Planet' ||
      body.classification === 'DwarfPlanet' ||
      body.classification === 'Moon'
    ) {
      const kindCode =
        body.classification === 'Planet' ? 2 : body.classification === 'Moon' ? 3 : 4;
      const entry: CompactSearchEntry = {
        i: body.id,
        k: kindCode,
        n: body.name,
        s: 'sol',
        h: 1,
        a: cleanKeys,
      };
      if (body.parentBodyId && body.parentBodyId !== 'sol') {
        entry.o = body.parentBodyId;
      }
      if (orbitRankMap.has(body.id)) {
        entry.r = orbitRankMap.get(body.id);
      }
      if (body.orbit?.semiMajorAxis !== undefined) {
        entry.A = Math.round(body.orbit.semiMajorAxis * 10000) / 10000;
      }
      if (body.orbit?.periodDays !== undefined) {
        entry.P = Math.round(body.orbit.periodDays * 1000) / 1000;
      }
      if (parentKey === 'sol') {
        if (
          body.orbit?.semiMajorAxis !== undefined &&
          body.orbit.semiMajorAxis >= 0.75 &&
          body.orbit.semiMajorAxis <= 1.77
        ) {
          entry.z = 1;
        }
        if (
          body.classification === 'DwarfPlanet' &&
          body.orbit?.semiMajorAxis !== undefined &&
          body.orbit.semiMajorAxis >= 2.0 &&
          body.orbit.semiMajorAxis <= 3.5
        ) {
          entry.e = 'belt';
        } else if (
          body.classification === 'DwarfPlanet' &&
          body.orbit?.semiMajorAxis !== undefined &&
          body.orbit.semiMajorAxis >= 30
        ) {
          entry.e = 'kuiper';
        }
      }
      if (body.classification === 'Planet') {
        const mEarth =
          body.massKg !== undefined ? body.massKg / 5.97237e24 : undefined;
        const rEarth = body.meanRadiusKm / 6371.0;
        const comp = classifyPlanetPhysical({
          massMearth: mEarth,
          radiusRearth: rEarth,
          classification: body.tags?.join(' '),
        });
        if (comp !== 'terrestrial') {
          entry.u = comp;
        }
        if (
          isPlanetHabitableCandidate(
            {
              semiMajorAxis: body.orbit?.semiMajorAxis,
              tags: body.tags,
            },
            1.0,
          )
        ) {
          entry.z = 1;
        }
        const surfaceGravityG =
          mEarth !== undefined && rEarth > 0
            ? computePlanetSurfaceGravityG({ massMearth: mEarth, radiusRearth: rEarth })
            : undefined;
        const hazardMask = computePlanetHazardMask({
          surfaceGravityG,
          periodDays: body.orbit?.periodDays,
          semiMajorAxisAu: body.orbit?.semiMajorAxis,
          eccentricity: body.orbit?.eccentricity,
        });
        if (hazardMask > 0) {
          entry.H = hazardMask;
        }
      }
      planetsEntries.push(entry);
      coreEntries.push(entry);
      fullEntries.push(entry);
    } else {
      const entry: CompactSearchEntry = {
        i: body.id,
        k: 6,
        n: body.name,
        s: 'sol',
        h: 1,
        a: cleanKeys,
      };
      if (body.parentBodyId && body.parentBodyId !== 'sol') {
        entry.o = body.parentBodyId;
      }
      if (orbitRankMap.has(body.id)) {
        entry.r = orbitRankMap.get(body.id);
      }
      if (body.orbit?.semiMajorAxis !== undefined) {
        entry.A = Math.round(body.orbit.semiMajorAxis * 10000) / 10000;
      }
      if (body.orbit?.periodDays !== undefined) {
        entry.P = Math.round(body.orbit.periodDays * 1000) / 1000;
      }
      if (parentKey === 'sol') {
        if (
          body.orbit?.semiMajorAxis !== undefined &&
          body.orbit.semiMajorAxis >= 0.75 &&
          body.orbit.semiMajorAxis <= 1.77
        ) {
          entry.z = 1;
        }
        if (
          body.classification === 'AsteroidMainBelt' ||
          (body.classification === 'Comet' &&
            body.orbit?.semiMajorAxis !== undefined &&
            body.orbit.semiMajorAxis >= 2.0 &&
            body.orbit.semiMajorAxis <= 3.5)
        ) {
          entry.e = 'belt';
        } else if (body.classification === 'AsteroidDistant') {
          entry.e = 'kuiper';
        }
      }
      if (body.tags?.includes('Spacecraft')) {
        entry.u = 'construct';
      }
      minorBodiesEntries.push(entry);
      fullEntries.push(entry);
      if (isCoreSearchMinorBody(body)) {
        coreEntries.push(entry);
      }
    }
  }

  // 4. Index Galactic Deep-Sky Structures
  for (const struct of input.structures) {
    const cleanKeys = buildCleanKeys([struct.name, ...struct.designations]);
    const entry: CompactSearchEntry = {
      i: struct.id,
      k: 5,
      n: struct.name,
      p: [
        Math.round(struct.x * 100) / 100,
        Math.round(struct.y * 100) / 100,
        Math.round(struct.z * 100) / 100,
      ],
      a: cleanKeys,
    };
    if (struct.type === 'Pulsar' || struct.type === 'SupernovaRemnant') {
      entry.u = 'hazard';
    }

    structuresEntries.push(entry);
    fullEntries.push(entry);
    if (isCoreSearchStructure(struct)) {
      coreEntries.push(entry);
    }
  }

  // 5. Include Layer Entries in core & full
  for (const layerEntry of layerEntries) {
    coreEntries.push(layerEntry);
    fullEntries.push(layerEntry);
  }

  return {
    core: buildSearchIndexEnvelope('search-core', 'Starmap Core Search Index', coreEntries, nowIso),
    full: buildSearchIndexEnvelope('search-full', 'Starmap Full Search Index', fullEntries, nowIso),
    stars: buildSearchIndexEnvelope('search-stars', 'Stars & Stellar Systems Search Index', starsEntries, nowIso),
    planets: buildSearchIndexEnvelope('search-planets', 'Planets, Exoplanets & Moons Search Index', planetsEntries, nowIso),
    structures: buildSearchIndexEnvelope('search-structures', 'Galactic Structures & Deep Sky Search Index', structuresEntries, nowIso),
    minorBodies: buildSearchIndexEnvelope('search-minor-bodies', 'Solar System Minor Bodies Search Index', minorBodiesEntries, nowIso),
    layers: buildSearchIndexEnvelope('search-layers', 'Curated Layers & Canons Search Index', layerEntries, nowIso),
  };
}
