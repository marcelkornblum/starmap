import fs from 'node:fs';
import path from 'node:path';
import type { ExoplanetRecord, KeplerianOrbit, StarmapNode } from '../../src/types/astro';
import {
  classifyPlanetPhysical,
  computePlanetHazardMask,
  computePlanetSurfaceGravityG,
  isPlanetHabitableCandidate,
} from '../../src/utils/astroMath';
import { resolvePlanetReticleType } from '../../src/utils/astroPrecalculation';
import {
  collectStarLookupKeys,
  expandGouldOrConstellationSuffix,
} from '../../src/utils/nomenclature';
import { parseCsvRowsSync } from './csvParser';
import { IAU_NAME_EXOWORLDS } from './seedCatalogs';

function computeEsi(rEarth?: number, temperature?: number): number | undefined {
  if (rEarth !== undefined && temperature !== undefined && !isNaN(rEarth) && !isNaN(temperature)) {
    const rTerm = 1 - Math.abs((rEarth - 1) / (rEarth + 1));
    const tTerm = 1 - Math.abs((temperature - 288) / (temperature + 288));
    return Math.max(0, Math.min(1, Math.sqrt(Math.max(0, rTerm * tTerm))));
  }
  return undefined;
}

function splitPlanetName(name?: string): { hostName: string; letter: string } | null {
  const clean = name?.trim();
  if (!clean) return null;
  const lastSpace = clean.lastIndexOf(' ');
  if (lastSpace === -1) return null;
  return { hostName: clean.substring(0, lastSpace).trim(), letter: clean.substring(lastSpace + 1).trim() };
}

function makeOrbit(
  semiMajorAxis = 0, eccentricity = 0, inclination = 0, ascendingNode = 0, argumentOfPeriapsis = 0, periodDays = 0,
): KeplerianOrbit {
  return {
    semiMajorAxis: isNaN(semiMajorAxis) ? 0 : semiMajorAxis,
    eccentricity: isNaN(eccentricity) ? 0 : eccentricity,
    inclination: isNaN(inclination) ? 0 : inclination,
    ascendingNode: isNaN(ascendingNode) ? 0 : ascendingNode,
    argumentOfPeriapsis: isNaN(argumentOfPeriapsis) ? 0 : argumentOfPeriapsis,
    meanAnomaly: 0,
    periodDays: isNaN(periodDays) ? 0 : periodDays,
  };
}

export function mergeExoplanetRecords(existing: ExoplanetRecord, incoming: ExoplanetRecord): ExoplanetRecord {
  let flags = (existing.theoreticalFlags ?? 0) | (incoming.theoreticalFlags ?? 0);
  const hasTemp = (p: ExoplanetRecord) => p.equilibriumTempK !== undefined && !((p.theoreticalFlags ?? 0) & 1);
  if (hasTemp(existing) || hasTemp(incoming)) flags &= ~(1 | 8);

  return {
    ...existing,
    name: existing.name.includes('(') ? existing.name : incoming.name.includes('(') ? incoming.name : existing.name,
    discoveryYear: existing.discoveryYear ?? incoming.discoveryYear,
    discoveryMethod: existing.discoveryMethod ?? incoming.discoveryMethod,
    massMjup: existing.massMjup ?? incoming.massMjup, massMearth: existing.massMearth ?? incoming.massMearth,
    radiusRjup: existing.radiusRjup ?? incoming.radiusRjup, radiusRearth: existing.radiusRearth ?? incoming.radiusRearth,
    equilibriumTempK: existing.equilibriumTempK ?? incoming.equilibriumTempK, esi: existing.esi ?? incoming.esi,
    orbit: existing.orbit?.semiMajorAxis ? existing.orbit : incoming.orbit ?? existing.orbit,
    confidence: existing.confidence === 'confirmed' || incoming.confidence === 'confirmed'
      ? 'confirmed' : existing.confidence ?? incoming.confidence ?? 'confirmed',
    ...(flags > 0 ? { theoreticalFlags: flags } : {}),
  };
}

export function loadAllExoplanetCatalogs(
  oecCsv: string,
  nasaCsv: string,
  euCsv: string,
): Map<string, ExoplanetRecord[]> {
  const hostMap = new Map<string, ExoplanetRecord[]>();
  const hasNasaCatalog = fs.existsSync(nasaCsv);

  function addPlanet(hostKey: string, planet: ExoplanetRecord) {
    const key = hostKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bucket = hostMap.get(key);
    if (!bucket) hostMap.set(key, (bucket = []));
    const idx = bucket.findIndex((p) => p.letter === planet.letter || p.id === planet.id);
    if (idx === -1) bucket.push(planet);
    else bucket[idx] = mergeExoplanetRecords(bucket[idx], planet);
  }

  function addIauExo(rawName: string, expName: string, record: ExoplanetRecord, host: string) {
    const iau = IAU_NAME_EXOWORLDS[rawName] ?? IAU_NAME_EXOWORLDS[expName];
    if (iau && !record.name.includes(iau.planetName)) record.name = `${expName} (${iau.planetName})`;
    addPlanet(host, record);
    if (iau) addPlanet(iau.starName, record);
  }

  if (fs.existsSync(oecCsv)) {
    const rows = parseCsvRowsSync(fs.readFileSync(oecCsv, 'utf-8'));
    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      const parsed = splitPlanetName(parts[0]);
      if (!parsed) continue;
      const planetName = parts[0]!.trim();
      const [mass, radius, period, semimajoraxis, eccentricity] = [
        parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]), parseFloat(parts[5]), parseFloat(parts[6]),
      ];
      let temperature = parseFloat(parts[11]);
      const [hostRadiusRsun, hostTempK] = [parseFloat(parts[20]), parseFloat(parts[22])];

      let derivedTemp = false;
      if (isNaN(temperature) && hostTempK > 0 && hostRadiusRsun > 0 && semimajoraxis > 0) {
        temperature = Math.round(hostTempK * Math.pow(0.7, 0.25) * Math.sqrt((hostRadiusRsun * 0.00465047) / (2 * semimajoraxis)) * 100) / 100;
        derivedTemp = true;
      }

      const mEarth = !isNaN(mass) ? Math.round(mass * 317.828 * 100) / 100 : undefined;
      const rEarth = !isNaN(radius) ? Math.round(radius * 11.209 * 100) / 100 : undefined;
      const esi = computeEsi(rEarth, temperature);
      const theoreticalFlags = derivedTemp ? 1 | (esi !== undefined ? 8 : 0) : 0;
      const expName = expandGouldOrConstellationSuffix(planetName);

      addIauExo(planetName, expName, {
        id: expName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: expName, letter: parsed.letter,
        discoveryYear: parseInt(parts[14], 10) || undefined, discoveryMethod: parts[13]?.trim() || undefined,
        massMjup: !isNaN(mass) ? mass : undefined, massMearth: mEarth,
        radiusRjup: !isNaN(radius) ? radius : undefined, radiusRearth: rEarth,
        equilibriumTempK: !isNaN(temperature) ? temperature : undefined, esi,
        orbit: makeOrbit(semimajoraxis, eccentricity, parseFloat(parts[10]), parseFloat(parts[9]), parseFloat(parts[7]), period),
        confidence: hasNasaCatalog ? 'candidate' : 'confirmed',
        ...(theoreticalFlags > 0 ? { theoreticalFlags } : {}),
      }, parsed.hostName);
    }
  }

  if (hasNasaCatalog) {
    const rows = parseCsvRowsSync(fs.readFileSync(nasaCsv, 'utf-8'));
    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      const [planetName, hostName] = [parts[0]?.trim(), parts[1]?.trim()];
      if (!planetName || !hostName) continue;

      const [period, semimajoraxis, massEarth, radiusEarth, temperature] = [
        parseFloat(parts[6]), parseFloat(parts[7]), parseFloat(parts[8]), parseFloat(parts[9]), parseFloat(parts[10]),
      ];
      const expName = expandGouldOrConstellationSuffix(planetName);
      addIauExo(planetName, expName, {
        id: expName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: expName, letter: planetName.split(' ').pop() || 'b',
        discoveryYear: parseInt(parts[5], 10) || undefined, discoveryMethod: parts[4]?.trim() || undefined,
        massMearth: !isNaN(massEarth) ? massEarth : undefined, massMjup: !isNaN(massEarth) ? massEarth / 317.828 : undefined,
        radiusRearth: !isNaN(radiusEarth) ? radiusEarth : undefined, radiusRjup: !isNaN(radiusEarth) ? radiusEarth / 11.209 : undefined,
        equilibriumTempK: !isNaN(temperature) ? temperature : undefined,
        esi: computeEsi(!isNaN(radiusEarth) ? radiusEarth : undefined, !isNaN(temperature) ? temperature : undefined),
        orbit: makeOrbit(semimajoraxis, 0, 0, 0, 0, period), confidence: 'confirmed',
      }, hostName);
    }
  }

  if (fs.existsSync(euCsv)) {
    const rows = parseCsvRowsSync(fs.readFileSync(euCsv, 'utf-8'));
    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      const parsed = splitPlanetName(parts[0]);
      if (!parsed) continue;
      const [mass, radius, period, semimajoraxis, eccentricity, inclination] = [
        parseFloat(parts[2]), parseFloat(parts[8]), parseFloat(parts[11]), parseFloat(parts[14]), parseFloat(parts[17]), parseFloat(parts[20]),
      ];
      const expName = expandGouldOrConstellationSuffix(parts[0]!.trim());
      addIauExo(parts[0]!.trim(), expName, {
        id: expName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: expName, letter: parsed.letter,
        discoveryYear: parseInt(parts[24], 10) || undefined, discoveryMethod: parts[63]?.trim() || undefined,
        massMjup: !isNaN(mass) ? mass : undefined, massMearth: !isNaN(mass) ? Math.round(mass * 317.828 * 100) / 100 : undefined,
        radiusRjup: !isNaN(radius) ? radius : undefined, radiusRearth: !isNaN(radius) ? Math.round(radius * 11.209 * 100) / 100 : undefined,
        orbit: makeOrbit(semimajoraxis, eccentricity, inclination, 0, 0, period),
        confidence: hasNasaCatalog ? 'candidate' : 'confirmed',
      }, parsed.hostName);
    }
  }

  return hostMap;
}

export function loadExoplanetCatalog(csvPath: string): Map<string, ExoplanetRecord[]> {
  const hostMap = new Map<string, ExoplanetRecord[]>();
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) return hostMap;

  const content = fs.readFileSync(resolved, 'utf-8');
  const rows = parseCsvRowsSync(content);
  if (rows.length <= 1) return hostMap;

  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i];
    const parsed = splitPlanetName(parts[0]);
    if (!parsed) continue;
    const planetName = parts[0]!.trim();
    const [mass, radius, period, semimajoraxis, eccentricity, periastron, ascendingnode, inclination, temperature] = [
      parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]), parseFloat(parts[5]),
      parseFloat(parts[6]), parseFloat(parts[7]), parseFloat(parts[9]), parseFloat(parts[10]), parseFloat(parts[11]),
    ];
    const iauMatch = IAU_NAME_EXOWORLDS[planetName];
    const planetRecord: ExoplanetRecord = {
      id: planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: iauMatch ? `${planetName} (${iauMatch.planetName})` : planetName,
      letter: parsed.letter, discoveryYear: parseInt(parts[14], 10) || undefined, discoveryMethod: parts[13]?.trim() || undefined,
      massMjup: !isNaN(mass) ? mass : undefined, radiusRjup: !isNaN(radius) ? radius : undefined,
      equilibriumTempK: !isNaN(temperature) ? temperature : undefined,
      orbit: makeOrbit(semimajoraxis, eccentricity, inclination, ascendingnode, periastron, period),
    };

    const keys = [parsed.hostName.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (iauMatch) keys.push(iauMatch.starName.toLowerCase().replace(/[^a-z0-9]/g, ''));

    for (const key of keys) {
      let bucket = hostMap.get(key);
      if (!bucket) hostMap.set(key, (bucket = []));
      if (!bucket.some((p) => p.id === planetRecord.id)) bucket.push(planetRecord);
    }
  }

  return hostMap;
}

export function matchExoplanetsForStar(
  star: StarmapNode & { aliases?: string[] },
  hostMap: Map<string, ExoplanetRecord[]>,
): ExoplanetRecord[] {
  if (hostMap.size === 0) return [];

  const candidateKeys = new Set<string>(collectStarLookupKeys(star));
  if (star.aliases) {
    for (const alias of star.aliases) candidateKeys.add(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }

  const mergedByLetter = new Map<string, ExoplanetRecord>();
  for (const key of candidateKeys) {
    for (const planet of hostMap.get(key) ?? []) {
      const dedupKey = planet.letter || planet.id;
      const existing = mergedByLetter.get(dedupKey);
      mergedByLetter.set(dedupKey, existing ? mergeExoplanetRecords(existing, planet) : planet);
    }
  }

  return Array.from(mergedByLetter.values());
}

export function checkHabitableCandidate(planets: ExoplanetRecord[], starLum?: number): boolean {
  return planets.some((p) =>
    isPlanetHabitableCandidate(
      { equilibriumTempK: p.equilibriumTempK, esi: p.esi, semiMajorAxis: p.orbit?.semiMajorAxis, isHabitableCandidate: p.isHabitableCandidate },
      starLum,
    ),
  );
}

export function classifyExoplanet(planet: ExoplanetRecord): 'terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant' {
  return planet.composition ?? classifyPlanetPhysical(planet);
}

export function enrichPlanetsWithPrecalculatedFields(
  planets: ExoplanetRecord[],
  starLum?: number,
): ExoplanetRecord[] {
  return planets.map((p) => {
    const composition = p.composition ?? classifyPlanetPhysical(p);
    const surfaceGravityG = p.surfaceGravityG ?? computePlanetSurfaceGravityG(p);
    const hazardMask =
      p.hazardMask ??
      computePlanetHazardMask({
        equilibriumTempK: p.equilibriumTempK, surfaceGravityG, periodDays: p.orbit?.periodDays, semiMajorAxisAu: p.orbit?.semiMajorAxis, eccentricity: p.orbit?.eccentricity,
      });

    const reticleComp = composition === 'ice-giant' ? 'sub-neptune' : composition;
    return {
      ...p, composition, reticleType: p.reticleType ?? resolvePlanetReticleType(reticleComp),
      isHabitableCandidate:
        p.isHabitableCandidate ??
        isPlanetHabitableCandidate(
          { equilibriumTempK: p.equilibriumTempK, esi: p.esi, semiMajorAxis: p.orbit?.semiMajorAxis }, starLum,
        ),
      ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}), ...(hazardMask > 0 ? { hazardMask } : {}),
    };
  });
}

export function getPlanetCensus(planets: ExoplanetRecord[]): ('terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant')[] | undefined {
  if (planets.length === 0) return undefined;
  const present = (['terrestrial', 'super-earth', 'gas-giant', 'ice-giant'] as const).filter((cat) =>
    planets.some((p) => classifyExoplanet(p) === cat)
  );
  return present.length > 0 ? present : undefined;
}
