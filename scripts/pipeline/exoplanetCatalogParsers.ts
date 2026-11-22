import fs from 'node:fs';
import type { ExoplanetRecord, KeplerianOrbit } from '../../src/types/astro';
import { expandGouldOrConstellationSuffix } from '../../src/utils/starNaming';
import { parseCsvRowsSync } from './csvParser';
import {
  buildCsvHeaderIndex,
  finiteOrUndefined,
  numAt,
  parseSexagesimalDecDeg,
  parseSexagesimalRaDeg,
  strAt,
  type CatalogSourceKind,
  type SourceHostMeta,
} from './exoplanetHosts';

export type RegisterExoplanetFn = (
  rawName: string,
  expName: string,
  record: ExoplanetRecord,
  rawHost: string,
  source: CatalogSourceKind,
  sourceMeta: SourceHostMeta,
  isConfirmedRow: boolean,
) => void;

export function computeEsi(rEarth?: number, temperature?: number): number | undefined {
  if (rEarth !== undefined && temperature !== undefined && !isNaN(rEarth) && !isNaN(temperature)) {
    const rTerm = 1 - Math.abs((rEarth - 1) / (rEarth + 1));
    const tTerm = 1 - Math.abs((temperature - 288) / (temperature + 288));
    return Math.max(0, Math.min(1, Math.sqrt(Math.max(0, rTerm * tTerm))));
  }
  return undefined;
}

export function splitPlanetName(name?: string): { hostName: string; letter: string } | null {
  const clean = name?.trim();
  if (!clean) return null;
  const lastSpace = clean.lastIndexOf(' ');
  if (lastSpace === -1) return null;
  return { hostName: clean.substring(0, lastSpace).trim(), letter: clean.substring(lastSpace + 1).trim() };
}

export function makeOrbit(
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

export function parseOecCatalog(oecCsv: string, hasNasaCatalog: boolean, registerEntry: RegisterExoplanetFn): void {
  if (!oecCsv || !fs.existsSync(oecCsv)) return;
  const rows = parseCsvRowsSync(fs.readFileSync(oecCsv, 'utf-8'));
  const h = buildCsvHeaderIndex(rows[0]);
  const usePos = !h.has('system_rightascension') && (rows[0]?.length ?? 0) >= 24;
  const col = (name: string, pos: number) => h.get(name) ?? (usePos ? pos : undefined);
  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i];
    if (!parts) continue;
    const rawName = strAt(parts, h.get('name') ?? 0);
    const parsed = splitPlanetName(rawName);
    if (!parsed || !rawName) continue;
    const [mass, radius, period, semimajoraxis, eccentricity] = [
      numAt(parts, col('mass', 2)), numAt(parts, col('radius', 3)), numAt(parts, col('period', 4)),
      numAt(parts, col('semimajoraxis', 5)), numAt(parts, col('eccentricity', 6)),
    ];
    let temperature = numAt(parts, col('temperature', 11));
    const [hostRadiusRsun, hostTempK, hostMassMsun] = [
      numAt(parts, col('hoststar_radius', 20)), numAt(parts, col('hoststar_temperature', 22)), numAt(parts, col('hoststar_mass', 19)),
    ];
    let derivedTemp = false;
    if (isNaN(temperature) && hostTempK > 0 && hostRadiusRsun > 0 && semimajoraxis > 0) {
      temperature = Math.round(hostTempK * Math.pow(0.7, 0.25) * Math.sqrt((hostRadiusRsun * 0.00465047) / (2 * semimajoraxis)) * 100) / 100;
      derivedTemp = true;
    }
    const mEarth = !isNaN(mass) ? Math.round(mass * 317.828 * 100) / 100 : undefined;
    const rEarth = !isNaN(radius) ? Math.round(radius * 11.209 * 100) / 100 : undefined;
    const esi = computeEsi(rEarth, temperature);
    const theoreticalFlags = derivedTemp ? 1 | (esi !== undefined ? 8 : 0) : 0;
    const expName = expandGouldOrConstellationSuffix(rawName);
    const listVal = strAt(parts, col('list', 24)).toLowerCase();
    const isConfirmedOec = !listVal || (!listVal.includes('candidate') && !listVal.includes('retracted') && !listVal.includes('unconfirmed') && !listVal.includes('controversial'));

    registerEntry(rawName, expName, {
      id: expName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: expName, letter: parsed.letter,
      discoveryYear: parseInt(strAt(parts, col('discoveryyear', 14)), 10) || undefined,
      discoveryMethod: strAt(parts, col('discoverymethod', 13)) || undefined,
      massMjup: finiteOrUndefined(mass), massMearth: mEarth, radiusRjup: finiteOrUndefined(radius), radiusRearth: rEarth,
      equilibriumTempK: finiteOrUndefined(temperature), esi,
      orbit: makeOrbit(semimajoraxis, eccentricity, numAt(parts, col('inclination', 10)), numAt(parts, col('ascendingnode', 9)), numAt(parts, col('periastron', 7)), period),
      confidence: hasNasaCatalog || !isConfirmedOec ? 'candidate' : 'confirmed',
      ...(theoreticalFlags > 0 ? { theoreticalFlags } : {}),
    }, parsed.hostName, 'oec', {
      hostName: parsed.hostName,
      raDeg: finiteOrUndefined(parseSexagesimalRaDeg(strAt(parts, col('system_rightascension', 16)))),
      decDeg: finiteOrUndefined(parseSexagesimalDecDeg(strAt(parts, col('system_declination', 17)))),
      distPc: finiteOrUndefined(numAt(parts, col('system_distance', 18))),
      teffK: finiteOrUndefined(hostTempK), radiusRsun: finiteOrUndefined(hostRadiusRsun), massMsun: finiteOrUndefined(hostMassMsun),
    }, isConfirmedOec);
  }
}

export function parseNasaCatalog(nasaCsv: string, registerEntry: RegisterExoplanetFn): void {
  if (!nasaCsv || !fs.existsSync(nasaCsv)) return;
  const rows = parseCsvRowsSync(fs.readFileSync(nasaCsv, 'utf-8'));
  const h = buildCsvHeaderIndex(rows[0]);
  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i];
    if (!parts) continue;
    const planetName = strAt(parts, h.get('pl_name'));
    const hostName = strAt(parts, h.get('hostname'));
    if (!planetName || !hostName) continue;
    const [period, semimajoraxis, massEarth, radiusEarth, temperature] = [
      numAt(parts, h.get('pl_orbper')), numAt(parts, h.get('pl_orbsmax')),
      numAt(parts, h.get('pl_bmasse')), numAt(parts, h.get('pl_rade')), numAt(parts, h.get('pl_eqt')),
    ];
    const stLumLog = numAt(parts, h.get('st_lum'));
    const expName = expandGouldOrConstellationSuffix(planetName);

    registerEntry(planetName, expName, {
      id: expName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: expName, letter: planetName.split(' ').pop() || 'b',
      discoveryYear: parseInt(strAt(parts, h.get('disc_year')), 10) || undefined,
      discoveryMethod: strAt(parts, h.get('discoverymethod')) || undefined,
      massMearth: finiteOrUndefined(massEarth), massMjup: Number.isFinite(massEarth) ? massEarth / 317.828 : undefined,
      radiusRearth: finiteOrUndefined(radiusEarth), radiusRjup: Number.isFinite(radiusEarth) ? radiusEarth / 11.209 : undefined,
      equilibriumTempK: finiteOrUndefined(temperature), esi: computeEsi(finiteOrUndefined(radiusEarth), finiteOrUndefined(temperature)),
      orbit: makeOrbit(semimajoraxis, 0, 0, 0, 0, period), confidence: 'confirmed',
    }, hostName, 'nasa', {
      hostName,
      raDeg: finiteOrUndefined(numAt(parts, h.get('ra'))), decDeg: finiteOrUndefined(numAt(parts, h.get('dec'))),
      distPc: finiteOrUndefined(numAt(parts, h.get('sy_dist'))),
      mag: finiteOrUndefined(numAt(parts, h.get('sy_vmag'))), spect: strAt(parts, h.get('st_spectype')) || undefined,
      teffK: finiteOrUndefined(numAt(parts, h.get('st_teff'))), radiusRsun: finiteOrUndefined(numAt(parts, h.get('st_rad'))),
      massMsun: finiteOrUndefined(numAt(parts, h.get('st_mass'))),
      lumLsun: Number.isFinite(stLumLog) ? Math.pow(10, stLumLog) : undefined,
    }, true);
  }
}

export function parseEuCatalog(euCsv: string, hasNasaCatalog: boolean, registerEntry: RegisterExoplanetFn): void {
  if (!euCsv || !fs.existsSync(euCsv)) return;
  const rows = parseCsvRowsSync(fs.readFileSync(euCsv, 'utf-8'));
  const h = buildCsvHeaderIndex(rows[0]);
  const isLegacyPos = (rows[0]?.length ?? 0) >= 64 && !h.has('orbital_period');
  const col = (name: string, pos: number) => h.get(name) ?? (isLegacyPos ? pos : undefined);
  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i];
    if (!parts) continue;
    const rawName = strAt(parts, h.get('name') ?? 0);
    const parsed = splitPlanetName(rawName);
    if (!parsed || !rawName) continue;
    const hostName = strAt(parts, h.get('star_name')) || parsed.hostName;
    const status = strAt(parts, h.get('planet_status')).toLowerCase();
    const isConfirmedEu = status === '' || status === 'confirmed';
    const [mass, radius, period, semimajoraxis, eccentricity, inclination] = [
      numAt(parts, col('mass', 2)), numAt(parts, col('radius', 8)), numAt(parts, col('orbital_period', 11)),
      numAt(parts, col('semi_major_axis', 14)), numAt(parts, col('eccentricity', 17)), numAt(parts, col('inclination', 20)),
    ];
    const expName = expandGouldOrConstellationSuffix(rawName);

    registerEntry(rawName, expName, {
      id: expName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: expName, letter: parsed.letter,
      discoveryYear: parseInt(strAt(parts, col('discovered', 24)), 10) || undefined,
      discoveryMethod: strAt(parts, col('detection_type', 63)) || undefined,
      massMjup: finiteOrUndefined(mass), massMearth: Number.isFinite(mass) ? Math.round(mass * 317.828 * 100) / 100 : undefined,
      radiusRjup: finiteOrUndefined(radius), radiusRearth: Number.isFinite(radius) ? Math.round(radius * 11.209 * 100) / 100 : undefined,
      orbit: makeOrbit(semimajoraxis, eccentricity, inclination, 0, 0, period),
      confidence: status === 'confirmed' || (status === '' && !hasNasaCatalog) ? 'confirmed' : 'candidate',
    }, hostName, 'eu', {
      hostName,
      raDeg: finiteOrUndefined(numAt(parts, h.get('ra'))), decDeg: finiteOrUndefined(numAt(parts, h.get('dec'))),
      distPc: finiteOrUndefined(numAt(parts, h.get('star_distance'))),
      mag: finiteOrUndefined(numAt(parts, h.get('mag_v'))), spect: strAt(parts, h.get('star_sp_type')) || undefined,
      teffK: finiteOrUndefined(numAt(parts, h.get('star_teff'))),
    }, isConfirmedEu);
  }
}
