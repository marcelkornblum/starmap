import type {
  CircumstellarDiskRecord,
  ExoplanetRecord,
  KeplerianOrbit,
  SatelliteRecord,
} from '../../src/types/astro';
import type {
  GalacticStructureRecord,
  SolarSystemBodyRecord,
} from '../../src/types/astroStructures';
import {
  CONFIDENCE_TO_CODE,
  DISK_KIND_TO_CODE,
  DISCOVERY_METHOD_TO_CODE,
  PLANET_COMP_TO_CODE,
  SOLAR_CLASS_TO_CODE,
  STRUCTURE_TYPE_TO_CODE,
} from '../../src/utils/compactDataConstants';
import type {
  CompactCircumstellarDisk,
  CompactExoplanet,
  CompactGalacticStructure,
  CompactSatelliteRecord,
  CompactSolarSystemBody,
  OrbitTuple,
} from '../../src/utils/compactDataTypes';
import {
  classifyPlanetPhysical,
  computePlanetSurfaceGravityG,
  isPlanetHabitableCandidate,
} from '../../src/utils/planetaryPhysics';
import { computePlanetHazardMask } from '../../src/utils/astroHazards';
import {
  precalculateSolarSystemBodyFlags,
  resolveDefaultStructureDescription,
} from '../../src/utils/astroPrecalculation';

export function encodeOrbitTuple(orbit: KeplerianOrbit): OrbitTuple;
export function encodeOrbitTuple(orbit?: KeplerianOrbit): OrbitTuple | undefined;
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

export function encodeSatellite(sat: SatelliteRecord): CompactSatelliteRecord {
  if (!sat.orbit) {
    throw new Error(`Satellite "${sat.id}" is missing required Keplerian orbit elements.`);
  }
  const compact: CompactSatelliteRecord = {
    i: sat.id,
    n: sat.name,
    p: sat.parentId,
    o: encodeOrbitTuple(sat.orbit),
  };
  if (sat.radiusKm !== undefined) compact.r = sat.radiusKm;
  if (sat.radiusEarth !== undefined) compact.re = sat.radiusEarth;
  if (sat.massEarth !== undefined) compact.me = sat.massEarth;
  if (sat.composition !== undefined) compact.c = sat.composition;
  if (sat.reticleType !== undefined) compact.rt = sat.reticleType;
  if (sat.description !== undefined) compact.d = sat.description;
  return compact;
}

export function encodeCircumstellarDisk(disk: CircumstellarDiskRecord): CompactCircumstellarDisk {
  const compact: CompactCircumstellarDisk = {
    i: disk.id,
    n: disk.name,
    k: DISK_KIND_TO_CODE[disk.kind] ?? 3,
    a: [disk.innerRadiusAu, disk.outerRadiusAu, disk.semiMajorAxisAu],
    c: disk.composition,
  };
  if (disk.tempK !== undefined) compact.T = disk.tempK;
  if (disk.confidence && disk.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[disk.confidence];
    if (code !== 1) compact.C = code as 2 | 3 | 4;
  }
  if (disk.reticleType) compact.rt = disk.reticleType;
  return compact;
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
  const surfaceGravityG = planet.surfaceGravityG ?? computePlanetSurfaceGravityG(planet);
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
  if (compCode !== 1) compact.c = compCode as 2 | 3 | 4;

  const isHz =
    planet.isHabitableCandidate ??
    isPlanetHabitableCandidate({
      equilibriumTempK: planet.equilibriumTempK,
      esi: planet.esi,
      semiMajorAxis: planet.orbit?.semiMajorAxis,
    });
  if (isHz) compact.h = 1;

  const orbitTuple = encodeOrbitTuple(planet.orbit);
  if (orbitTuple) compact.o = orbitTuple;
  if (planet.confidence && planet.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[planet.confidence];
    if (code !== 1) compact.C = code;
  }
  if (planet.theoreticalFlags && planet.theoreticalFlags > 0) compact.f = planet.theoreticalFlags;
  if (planet.reticleType) compact.rt = planet.reticleType;
  if (planet.satellites && planet.satellites.length > 0) {
    compact.sat = planet.satellites.map(encodeSatellite);
  }
  return compact;
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
  if (struct.memberCount !== undefined && struct.memberCount !== null) compact.c = struct.memberCount;
  const extraDesig = struct.designations.filter((d) => d !== struct.name);
  if (extraDesig.length > 0) compact.g = extraDesig;
  const defaultDesc = resolveDefaultStructureDescription(struct.type);
  if (struct.description && struct.description !== defaultDesc) compact.d = struct.description;
  if (struct.confidence && struct.confidence !== 'confirmed') {
    const code = CONFIDENCE_TO_CODE[struct.confidence];
    if (code !== 1) compact.C = code;
  }
  if (struct.theoreticalFlags && struct.theoreticalFlags > 0) compact.f = struct.theoreticalFlags;
  if (struct.reticleType) compact.rt = struct.reticleType;
  return compact;
}

export const encodeStructure = encodeGalacticStructure;

export function encodeSolarSystemBody(
  rawBody: SolarSystemBodyRecord,
  options?: { omitId?: boolean },
): CompactSolarSystemBody {
  const body =
    rawBody.reticleType !== undefined && rawBody.targetStarId !== undefined
      ? rawBody
      : precalculateSolarSystemBodyFlags(rawBody);

  const compact: CompactSolarSystemBody = {
    n: body.name,
    k: SOLAR_CLASS_TO_CODE[body.classification] ?? 6,
    r: body.meanRadiusKm,
  };
  if (!options?.omitId) compact.i = body.id;
  if (body.parentBodyId && body.parentBodyId !== 'sol') compact.b = body.parentBodyId;
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
  if (body.theoreticalFlags && body.theoreticalFlags > 0) compact.f = body.theoreticalFlags;
  if (body.reticleType) compact.rt = body.reticleType;
  if (body.isHabitableCandidate) compact.z = 1;
  if (body.beltZone) compact.e = body.beltZone;
  if (body.targetStarId) compact.s = body.targetStarId;
  if (body.composition) compact.u = body.composition;
  if (body.isCoreSearch) compact.core = 1;

  return compact;
}

export const encodeMinorBody = encodeSolarSystemBody;
