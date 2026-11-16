import type {
  ExoplanetRecord,
  KeplerianOrbit,
  SatelliteRecord,
} from '../types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../types/astroStructures';
import {
  CODE_TO_CONFIDENCE,
  CODE_TO_DISCOVERY_METHOD,
  CODE_TO_PLANET_COMP,
  CODE_TO_SOLAR_CLASS,
  CODE_TO_STRUCTURE_TYPE,
} from './compactDataConstants';
import type {
  CompactExoplanet,
  CompactGalacticStructure,
  CompactSatelliteRecord,
  CompactSearchEntry,
  CompactSolarSystemBody,
  DecodedSearchEntry,
  OrbitTuple,
} from './compactDataTypes';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import {
  classifyPlanetPhysical,
  computePlanetSurfaceGravityG,
  isPlanetHabitableCandidate,
} from './planetaryPhysics';
import { computePlanetHazardMask } from './astroHazards';
import { resolveDefaultStructureDescription } from './astroPrecalculation';

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

export function decodeSatellite(compact: CompactSatelliteRecord): SatelliteRecord {
  const orbit = decodeOrbitTuple(compact.o) ?? {
    semiMajorAxis: compact.o[0],
    eccentricity: compact.o[1],
    inclination: compact.o[2],
    ascendingNode: compact.o[3],
    argumentOfPeriapsis: compact.o[4],
    meanAnomaly: compact.o[5],
    periodDays: compact.o[6],
  };
  return {
    id: compact.i,
    name: compact.n,
    parentId: compact.p,
    radiusKm: compact.r,
    radiusEarth: compact.re,
    massEarth: compact.me,
    composition: compact.c,
    reticleType: compact.rt,
    orbit,
    description: compact.d,
  };
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
    compact.g ?? computePlanetSurfaceGravityG({ massMearth, radiusRearth });

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
  if (compact.rt) {
    result.reticleType = compact.rt;
  }
  if (compact.sat && compact.sat.length > 0) {
    result.satellites = compact.sat.map(decodeSatellite);
  }
  return result;
}

export function decodeGalacticStructure(
  compact: CompactGalacticStructure,
  fallbackId?: string,
): GalacticStructureRecord {
  const id = compact.i ?? fallbackId ?? '';
  const [x, y, z] = compact.p;
  const dist = Math.round(Math.sqrt(x * x + y * y + z * z) * 100) / 100;
  const type = CODE_TO_STRUCTURE_TYPE[compact.k] ?? 'DeepSkyLandmark';
  const description = compact.d ?? resolveDefaultStructureDescription(type);

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
    reticleType: compact.rt,
  };
  if (compact.f && compact.f > 0) {
    result.theoreticalFlags = compact.f;
  }
  return result;
}

export const decodeStructure = decodeGalacticStructure;

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
    parentBodyId: compact.b ?? SOL_REFERENCE_TARGET.id,
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
  if (compact.rt) result.reticleType = compact.rt;
  if (compact.z === 1) result.isHabitableCandidate = true;
  if (compact.e) result.beltZone = compact.e;
  if (compact.s) result.targetStarId = compact.s;
  if (compact.u) result.composition = compact.u;
  if (compact.core === 1) result.isCoreSearch = true;
  return result;
}

export const decodeMinorBody = decodeSolarSystemBody;

export function decodeCompactSearchEntry(entry: CompactSearchEntry): DecodedSearchEntry {
  return {
    id: entry.i,
    kind: entry.k,
    name: entry.n,
    position: entry.p,
    magnitude: entry.m?.[0],
    spectralType: entry.m?.[1],
    planetCount: entry.m?.[2],
    hasHabitableCandidate: entry.m?.[3] === 1,
    designations: entry.a ? entry.a.split(' ') : undefined,
    parentSystemName: entry.w,
    systemId: entry.s,
    parentBodyId: entry.o,
    tagsBitmask: entry.g,
    isHomeSystem: entry.h === 1 ? true : undefined,
    isHabitableZonePlanet: entry.z === 1 ? true : undefined,
    subCategory: entry.c,
    reticleType: entry.u,
    semiMajorAxisAu: entry.A,
  };
}
