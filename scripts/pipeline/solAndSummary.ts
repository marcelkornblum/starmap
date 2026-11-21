import type {
  CircumstellarDiskRecord,
  ExoplanetRecord,
  KeplerianOrbit,
  SatelliteRecord,
  StarmapNode,
  SystemManifest,
  SystemSummaryNode,
  SystemTag,
} from '../../src/types/astro';
import {
  classifyPlanetPhysical,
  computePlanetCompositionCounts,
  computePlanetSurfaceGravityG,
  isPlanetHabitableCandidate,
  isPlanetTidallyLocked,
} from '../../src/utils/planetaryPhysics';
import {
  computePlanetHazardMask,
  computeSystemHazardMask,
} from '../../src/utils/astroHazards';
import { formatSectorId } from '../../src/utils/sectorMath';
import {
  resolvePlanetReticleType,
  resolveStellarClassificationFromSpectrum,
  resolveStellarReticleType,
} from '../../src/utils/astroPrecalculation';
import {
  collectStarLookupKeys,
  expandGlieseVariants,
} from '../../src/utils/nomenclature';
import {
  checkHabitableCandidate,
  computeEsi,
  enrichPlanetsWithPrecalculatedFields,
  getPlanetCensus,
} from './exoplanets';
import {
  AAVSO_VARIABLE_CATALOG,
  CIRCUMSTELLAR_DISKS_CATALOG,
  DISK_HOST_ALIASES,
  FULL_SOLAR_SYSTEM_BODIES,
  type SolarSystemBodyEntry,
} from './seedCatalogs';

let diskLookupMapCache: Map<string, CircumstellarDiskRecord[]> | null = null;

function getDiskLookupMap(): Map<string, CircumstellarDiskRecord[]> {
  if (diskLookupMapCache) return diskLookupMapCache;
  diskLookupMapCache = new Map();
  for (const [starName, disks] of Object.entries(CIRCUMSTELLAR_DISKS_CATALOG)) {
    const rawKeys: string[] = [starName, ...(DISK_HOST_ALIASES[starName] ?? [])];
    for (const raw of rawKeys) {
      const lower = raw.toLowerCase();
      diskLookupMapCache.set(lower, disks as CircumstellarDiskRecord[]);
      diskLookupMapCache.set(lower.replace(/[^a-z0-9]/g, ''), disks as CircumstellarDiskRecord[]);
    }
  }
  return diskLookupMapCache;
}

function addKeys(set: Set<string>, ...items: (string | undefined | null)[]) {
  for (const item of items) {
    if (!item) continue;
    set.add(item.toLowerCase());
    set.add(item.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
}

export function matchCircumstellarDisksForStar(
  star: StarmapNode & { aliases?: string[] },
): CircumstellarDiskRecord[] {
  const map = getDiskLookupMap();
  const candidateKeys = new Set<string>(collectStarLookupKeys(star));

  if (star.aliases) addKeys(candidateKeys, ...star.aliases);
  addKeys(candidateKeys, star.properName, star.name);
  if (star.hd) addKeys(candidateKeys, `hd ${star.hd}`);
  if (star.hip) addKeys(candidateKeys, `hip ${star.hip}`);
  if (star.gl) {
    for (const v of expandGlieseVariants(star.gl)) addKeys(candidateKeys, v);
  }

  for (const key of candidateKeys) {
    const matched = map.get(key);
    if (matched && matched.length > 0) return matched;
  }
  return [];
}

const DEFAULT_ORBIT: KeplerianOrbit = {
  semiMajorAxis: 0, eccentricity: 0, inclination: 0, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 0,
};

const RSUN_IN_AU = 0.00465047;
const EARTH_MASS_KG = 5.97237e24;
const JUPITER_MASS_KG = 1.8982e27;
const EARTH_RADIUS_KM = 6371.0;
const JUPITER_RADIUS_KM = 69911.0;

export function buildSolSystemManifest(
  solarBodies: readonly SolarSystemBodyEntry[] = FULL_SOLAR_SYSTEM_BODIES,
): SystemManifest {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;
  const solSeed =
    solarBodies.find((b) => b.id === 'sol') ??
    FULL_SOLAR_SYSTEM_BODIES.find((b) => b.id === 'sol');
  if (
    !solSeed ||
    solSeed.effectiveTempK === undefined ||
    solSeed.mag === undefined ||
    solSeed.absmag === undefined ||
    solSeed.luminosityLsun === undefined ||
    !solSeed.spectralType
  ) {
    throw new Error('Missing required Sol stellar seed fields in solar-system-bodies.json');
  }
  const hostTempK = solSeed.effectiveTempK;
  const hostLuminosityLsun = solSeed.luminosityLsun;
  const hostRadiusRsun = solSeed.radiusRsun ?? 1.0;
  const hostMassMsun = solSeed.massMsun ?? 1.0;
  const hostRadiusAu = hostRadiusRsun * RSUN_IN_AU;
  const [sx, sy, sz] = solSeed.coordinatesPc ?? [0, 0, 0];
  const solSystemName = solSeed.systemName ?? solSeed.displayName ?? solSeed.name;
  const solProperName = solSeed.properName ?? solSystemName;

  const moonsByParent = new Map<string, typeof solarBodies[number][]>();
  for (const b of solarBodies) {
    if (b.classification === 'Moon' && b.parentBodyId) {
      const pKey = b.parentBodyId.toLowerCase();
      let list = moonsByParent.get(pKey);
      if (!list) {
        list = [];
        moonsByParent.set(pKey, list);
      }
      list.push(b);
    }
  }

  const solPlanets: ExoplanetRecord[] = solarBodies
    .filter((b) => b.classification === 'Planet')
    .map((b) => {
      const massMearth = b.massKg !== undefined ? round2(b.massKg / EARTH_MASS_KG) : undefined;
      const massMjup = b.massKg !== undefined ? round4(b.massKg / JUPITER_MASS_KG) : undefined;
      const radiusRearth = round2(b.meanRadiusKm / EARTH_RADIUS_KM);
      const radiusRjup = round4(b.meanRadiusKm / JUPITER_RADIUS_KM);
      const a = b.orbit?.semiMajorAxis;
      const albedo = b.albedo ?? 0.3;
      const equilibriumTempK = a && a > 0
        ? round2(hostTempK * Math.pow(Math.max(0, 1 - Math.min(0.99, albedo)), 0.25) * Math.sqrt(hostRadiusAu / (2 * a)))
        : undefined;
      const composition = classifyPlanetPhysical({ massMearth, radiusRearth, classification: b.tags?.join(' ') });
      const isHabitableCandidate = isPlanetHabitableCandidate({ equilibriumTempK, semiMajorAxis: a, tags: b.tags }, hostLuminosityLsun);
      const surfaceGravityG = computePlanetSurfaceGravityG({ massMearth, radiusRearth });
      const isTidallyLocked = isPlanetTidallyLocked({
        periodDays: b.orbit?.periodDays,
        semiMajorAxisAu: a,
      });
      const esi = computeEsi(radiusRearth, equilibriumTempK);
      const hazardMask = computePlanetHazardMask({
        equilibriumTempK,
        surfaceGravityG,
        periodDays: b.orbit?.periodDays,
        semiMajorAxisAu: a,
        eccentricity: b.orbit?.eccentricity,
      });

      const rawMoons = moonsByParent.get(b.id.toLowerCase()) ?? [];
      const satellites: SatelliteRecord[] = rawMoons.map((moon) => ({
        id: moon.id,
        name: moon.name,
        parentId: moon.parentBodyId ?? b.id,
        radiusKm: moon.meanRadiusKm,
        radiusEarth: round4(moon.meanRadiusKm / EARTH_RADIUS_KM),
        ...(moon.massKg !== undefined ? { massEarth: round4(moon.massKg / EARTH_MASS_KG) } : {}),
        composition: 'terrestrial',
        reticleType: 'moon',
        orbit: moon.orbit ?? DEFAULT_ORBIT,
      }));

      return {
        id: b.id,
        name: b.name,
        letter: '',
        massMearth,
        massMjup,
        radiusRearth,
        radiusRjup,
        equilibriumTempK,
        ...(esi !== undefined ? { esi } : {}),
        surfaceGravityG,
        isTidallyLocked,
        ...(hazardMask > 0 ? { hazardMask } : {}),
        composition,
        reticleType: resolvePlanetReticleType(composition),
        isHabitableCandidate,
        orbit: b.orbit,
        ...(satellites.length > 0 ? { satellites } : {}),
        confidence: 'confirmed',
      };
    });

  const solTags: SystemTag[] = [
    'HomeSystem',
    'SolarNeighborhood10pc',
    'NakedEye',
    'ExoplanetHost',
    'HabitableCandidate',
  ];
  const solHazardMask = computeSystemHazardMask({
    spect: solSeed.spectralType,
    lum: hostLuminosityLsun,
    effectiveTempK: hostTempK,
    tags: solTags,
  });

  return {
    id: solSeed.id,
    name: solSystemName,
    properName: solProperName,
    x: sx,
    y: sy,
    z: sz,
    dist: Math.hypot(sx, sy, sz),
    velocity: { vx: 0, vy: 0, vz: 0, speed: 0 },
    sectorId: formatSectorId(sx, sy, sz),
    stars: [{
      id: `${solSeed.id}-A`,
      name: solSystemName,
      componentDesignation: 'A',
      spectralType: solSeed.spectralType,
      mag: solSeed.mag,
      absmag: solSeed.absmag,
      luminosityLsun: hostLuminosityLsun,
      massMsun: hostMassMsun,
      radiusRsun: hostRadiusRsun,
      effectiveTempK: hostTempK,
      reticleType: resolveStellarReticleType(
        resolveStellarClassificationFromSpectrum(solSeed.spectralType),
        false,
      ),
    }],
    planets: solPlanets,
    planetCompositionCounts: computePlanetCompositionCounts(solPlanets),
    hasHabitableCandidate: solPlanets.some((p) => Boolean(p.isHabitableCandidate)),
    tags: solTags,
    ...(solHazardMask > 0 ? { hazardMask: solHazardMask } : {}),
    disks: CIRCUMSTELLAR_DISKS_CATALOG[solSystemName] ?? CIRCUMSTELLAR_DISKS_CATALOG['Sol'],
  };
}

export function starNodeToSystemSummary(
  star: StarmapNode,
  planets: ExoplanetRecord[] = [],
): SystemSummaryNode {
  const tags: SystemTag[] = [];
  if (star.mag <= 6.5) tags.push('NakedEye');
  if (star.dist <= 10) tags.push('SolarNeighborhood10pc');
  if (star.name === 'Sol') tags.push('HomeSystem');
  if (star.properName && AAVSO_VARIABLE_CATALOG[star.properName]) tags.push('VariableStar');
  else if (AAVSO_VARIABLE_CATALOG[star.name]) tags.push('VariableStar');

  const effectivePlanets = star.name === 'Sol' && planets.length === 0
    ? buildSolSystemManifest().planets
    : enrichPlanetsWithPrecalculatedFields(planets, star.lum);

  const planetCount = effectivePlanets.length;
  const hasHabitable = checkHabitableCandidate(effectivePlanets, star.lum);
  const planetCensus = getPlanetCensus(effectivePlanets);
  const planetCompositionCounts = computePlanetCompositionCounts(effectivePlanets);

  if (planetCount > 0) tags.push('ExoplanetHost');
  if (hasHabitable) tags.push('HabitableCandidate');

  const hazardMask = computeSystemHazardMask({ spect: star.spect, lum: star.lum, tags });
  const classification = resolveStellarClassificationFromSpectrum(star.spect);

  return {
    id: String(star.id),
    name: star.name,
    properName: star.properName,
    x: star.x,
    y: star.y,
    z: star.z,
    dist: star.dist,
    velocity: star.velocity,
    mag: star.mag,
    absmag: star.absmag,
    spect: star.spect,
    ci: star.ci,
    starCount: 1,
    planetCount,
    planetCensus,
    ...(planetCompositionCounts ? { planetCompositionCounts } : {}),
    hasHabitableCandidate: hasHabitable,
    sectorId: formatSectorId(star.x, star.y, star.z),
    tags: tags.length > 0 ? tags : undefined,
    ...(hazardMask > 0 ? { hazardMask } : {}),
    classification,
    reticleType: resolveStellarReticleType(classification, false),
  };
}
