import fs from 'node:fs';
import path from 'node:path';
import type { ExoplanetRecord, PlanetComposition, StarmapNode } from '../../src/types/astro';
import {
  classifyPlanetPhysical,
  computePlanetSurfaceGravityG,
  isPlanetHabitableCandidate,
  isPlanetTidallyLocked,
} from '../../src/utils/planetaryPhysics';
import { computePlanetHazardMask } from '../../src/utils/astroHazards';
import { resolvePlanetReticleType } from '../../src/utils/astroPrecalculation';
import { collectStarLookupKeys } from '../../src/utils/nomenclature';
import { parseCsvRowsSync } from './csvParser';
import { IAU_NAME_EXOWORLDS } from './seedCatalogs';
import {
  createExoplanetHostRegistry,
  inferSpectralClassFromTeff,
  parseSexagesimalDecDeg,
  parseSexagesimalRaDeg,
  type ExoplanetHostGroup,
  type ExoplanetHostMetadata,
} from './exoplanetHosts';
import {
  computeEsi,
  makeOrbit,
  parseEuCatalog,
  parseNasaCatalog,
  parseOecCatalog,
  splitPlanetName,
} from './exoplanetCatalogParsers';

export type { ExoplanetHostGroup, ExoplanetHostMetadata };
export { computeEsi, inferSpectralClassFromTeff, parseSexagesimalDecDeg, parseSexagesimalRaDeg };

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

export function loadAllExoplanetCatalogsWithHosts(
  oecCsv: string,
  nasaCsv: string,
  euCsv: string,
): { hostMap: Map<string, ExoplanetRecord[]>; canonicalHosts: ExoplanetHostGroup[] } {
  const hostMap = new Map<string, ExoplanetRecord[]>();
  const { registerEntry, buildCanonicalHosts } = createExoplanetHostRegistry(hostMap, mergeExoplanetRecords);
  const hasNasaCatalog = Boolean(nasaCsv) && fs.existsSync(nasaCsv);

  parseOecCatalog(oecCsv, hasNasaCatalog, registerEntry);
  parseNasaCatalog(nasaCsv, registerEntry);
  parseEuCatalog(euCsv, hasNasaCatalog, registerEntry);

  return { hostMap, canonicalHosts: buildCanonicalHosts() };
}

export function loadExoplanetCatalog(csvPath: string): Map<string, ExoplanetRecord[]> {
  const hostMap = new Map<string, ExoplanetRecord[]>();
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) return hostMap;

  const rows = parseCsvRowsSync(fs.readFileSync(resolved, 'utf-8'));
  if (rows.length <= 1) return hostMap;

  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i];
    if (!parts) continue;
    const rawName = parts[0];
    const parsed = splitPlanetName(rawName);
    if (!parsed || !rawName) continue;
    const planetName = rawName.trim();
    const [mass, radius, period, semimajoraxis, eccentricity, periastron, ascendingnode, inclination, temperature] = [
      parseFloat(parts[2] ?? ''), parseFloat(parts[3] ?? ''), parseFloat(parts[4] ?? ''), parseFloat(parts[5] ?? ''),
      parseFloat(parts[6] ?? ''), parseFloat(parts[7] ?? ''), parseFloat(parts[9] ?? ''), parseFloat(parts[10] ?? ''), parseFloat(parts[11] ?? ''),
    ];
    const iauMatch = IAU_NAME_EXOWORLDS[planetName];
    const planetRecord: ExoplanetRecord = {
      id: planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: iauMatch ? `${planetName} (${iauMatch.planetName})` : planetName,
      letter: parsed.letter, discoveryYear: parseInt(parts[14] ?? '', 10) || undefined, discoveryMethod: parts[13]?.trim() || undefined,
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
  if (star.aliases) for (const alias of star.aliases) candidateKeys.add(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
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

export function classifyExoplanet(planet: ExoplanetRecord): PlanetComposition {
  return planet.composition ?? classifyPlanetPhysical(planet);
}

export function enrichPlanetsWithPrecalculatedFields(planets: ExoplanetRecord[], starLum?: number): ExoplanetRecord[] {
  return planets.map((p) => {
    const composition = p.composition ?? classifyPlanetPhysical(p);
    const surfaceGravityG = p.surfaceGravityG ?? computePlanetSurfaceGravityG(p);
    const isTidallyLocked = p.isTidallyLocked ?? isPlanetTidallyLocked({ periodDays: p.orbit?.periodDays, semiMajorAxisAu: p.orbit?.semiMajorAxis });
    const esi = p.esi ?? computeEsi(p.radiusRearth, p.equilibriumTempK);
    const hazardMask = p.hazardMask ?? computePlanetHazardMask({
      equilibriumTempK: p.equilibriumTempK, surfaceGravityG, periodDays: p.orbit?.periodDays, semiMajorAxisAu: p.orbit?.semiMajorAxis, eccentricity: p.orbit?.eccentricity,
    });
    return {
      ...p, composition, reticleType: p.reticleType ?? resolvePlanetReticleType(composition),
      isHabitableCandidate: p.isHabitableCandidate ?? isPlanetHabitableCandidate({ equilibriumTempK: p.equilibriumTempK, esi, semiMajorAxis: p.orbit?.semiMajorAxis }, starLum),
      isTidallyLocked,
      ...(esi !== undefined ? { esi } : {}), ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}), ...(hazardMask > 0 ? { hazardMask } : {}),
    };
  });
}

export function getPlanetCensus(planets: ExoplanetRecord[]): PlanetComposition[] | undefined {
  if (planets.length === 0) return undefined;
  const present = (['terrestrial', 'super-earth', 'gas-giant', 'ice-giant'] as const).filter((cat) =>
    planets.some((p) => classifyExoplanet(p) === cat),
  );
  return present.length > 0 ? present : undefined;
}
