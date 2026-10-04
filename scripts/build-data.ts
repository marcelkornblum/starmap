import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import csv from 'csv-parser';
import type {
  StarmapNode,
  SystemSummaryNode,
  SectorPartitionManifest,
  CatalogManifestHeader,
  ExoplanetRecord,
  SystemManifest,
  GalacticStructureRecord,
  SolarSystemBodyRecord,
  KinematicVector,
} from '../src/types/astro';
import {
  equatorialToCartesian,
  parseKinematicVector,
  formatSectorId,
  getSectorBounds,
  DEFAULT_SECTOR_SIZE_PC,
} from '../src/utils/astroMath';
import { classifyPlanetPhysical } from '../src/components/canvas/math/astronomy';
import {
  OFFICIAL_IAU_STAR_NAMES,
  RECONS_10PC_SUPPLEMENT,
  IAU_NAME_EXOWORLDS,
  AAVSO_VARIABLE_CATALOG,
  FULL_GALACTIC_STRUCTURES,
  FULL_SOLAR_SYSTEM_BODIES,
} from './fetch-sources';

const DEG2RAD = Math.PI / 180;
const K_CONSTANT = 4.74047; // km/s per (AU * mas/yr)

/**
 * Parses and harmonizes a raw CSV record from hygdata_v3 into a strict StarmapNode.
 * Attaches calculated Cartesian coordinates, 3D velocity vectors, and official IAU proper names.
 */
export function parseHygRow(row: Record<string, string>): StarmapNode | null {
  const id = parseInt(row.id, 10);
  if (isNaN(id)) {
    return null;
  }

  const dist = parseFloat(row.dist);
  const ra = parseFloat(row.ra);
  const dec = parseFloat(row.dec);

  // Skip rows with missing, NaN, or invalid coordinates (Sol at dist=0 is valid)
  if (isNaN(dist) || isNaN(ra) || isNaN(dec) || dist < 0) {
    return null;
  }

  const hip = row.hip && row.hip.trim().length > 0 ? parseInt(row.hip, 10) : null;
  const hd = row.hd && row.hd.trim().length > 0 ? parseInt(row.hd, 10) : null;

  // Derive human-readable primary display name
  let properName = row.proper && row.proper.trim().length > 0 ? row.proper.trim() : undefined;

  // Cross-reference official IAU Working Group on Star Names gazetteer
  if (!properName && hip && OFFICIAL_IAU_STAR_NAMES[`hip-${hip}`]) {
    properName = OFFICIAL_IAU_STAR_NAMES[`hip-${hip}`].properName;
  }

  let name = properName;

  if (!name) {
    if (row.bf && row.bf.trim().length > 0) {
      name = row.bf.trim();
    } else if (row.bayer && row.con && row.bayer.trim().length > 0) {
      name = `${row.bayer.trim()} ${row.con.trim()}`;
    } else if (row.gl && row.gl.trim().length > 0) {
      name = row.gl.trim();
    } else if (hip) {
      name = `HIP ${hip}`;
    } else if (hd) {
      name = `HD ${hd}`;
    } else if (row.hr && row.hr.trim().length > 0) {
      name = `HR ${row.hr.trim()}`;
    } else {
      name = `HYG ${id}`;
    }
  }

  // Pre-calculate Cartesian XYZ coordinates using equatorialToCartesian utility
  const [x, y, z] = equatorialToCartesian(ra, dec, dist);

  // Parse astrometric and kinematic motion components if available
  const pmra = row.pmra && !isNaN(parseFloat(row.pmra)) ? parseFloat(row.pmra) : undefined;
  const pmdec = row.pmdec && !isNaN(parseFloat(row.pmdec)) ? parseFloat(row.pmdec) : undefined;
  const rv = row.rv && !isNaN(parseFloat(row.rv)) ? parseFloat(row.rv) : undefined;

  const rawVx = row.vx && !isNaN(parseFloat(row.vx)) ? parseFloat(row.vx) : undefined;
  const rawVy = row.vy && !isNaN(parseFloat(row.vy)) ? parseFloat(row.vy) : undefined;
  const rawVz = row.vz && !isNaN(parseFloat(row.vz)) ? parseFloat(row.vz) : undefined;

  const velocity = parseKinematicVector(rawVx, rawVy, rawVz, pmra, pmdec, rv);

  const hr = row.hr && row.hr.trim().length > 0 ? parseInt(row.hr, 10) : null;
  const flam = row.flam && row.flam.trim().length > 0 ? parseInt(row.flam, 10) : null;
  const gl = row.gl && row.gl.trim().length > 0 ? row.gl.trim() : null;
  const bayer = row.bayer && row.bayer.trim().length > 0 ? row.bayer.trim() : null;
  const con = row.con && row.con.trim().length > 0 ? row.con.trim() : null;
  const spect = row.spect && row.spect.trim().length > 0 ? row.spect.trim() : undefined;
  const ci = row.ci && row.ci.trim().length > 0 && !isNaN(parseFloat(row.ci)) ? parseFloat(row.ci) : null;
  const lum = row.lum && row.lum.trim().length > 0 && !isNaN(parseFloat(row.lum)) ? parseFloat(row.lum) : undefined;
  const mag = row.mag && !isNaN(parseFloat(row.mag)) ? parseFloat(row.mag) : 0;
  const absmag = row.absmag && !isNaN(parseFloat(row.absmag)) ? parseFloat(row.absmag) : 0;

  return {
    id,
    name,
    properName,
    hip,
    hd,
    hr,
    gl,
    bayer,
    flam,
    con,
    ra,
    dec,
    dist,
    mag,
    absmag,
    spect,
    ci,
    x,
    y,
    z,
    lum,
    velocity,
  };
}

/**
 * Computes 3D Cartesian velocity vector relative to Sol from Gaia astrometric observables.
 */
export function computeGaiaKinematics(
  raDeg: number,
  decDeg: number,
  distPc: number,
  pmra: number,
  pmdec: number,
  rv?: number | null,
): KinematicVector {
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const radialVel = rv !== null && rv !== undefined && !isNaN(rv) ? rv : 0;

  // Tangential velocity components in km/s (4.74047 * mu * d)
  const vAlpha = K_CONSTANT * (pmra / 1000) * distPc;
  const vDelta = K_CONSTANT * (pmdec / 1000) * distPc;

  const cosRa = Math.cos(ra);
  const sinRa = Math.sin(ra);
  const cosDec = Math.cos(dec);
  const sinDec = Math.sin(dec);

  const vx = radialVel * cosDec * cosRa - vAlpha * sinRa - vDelta * sinDec * cosRa;
  const vy = radialVel * cosDec * sinRa + vAlpha * cosRa - vDelta * sinDec * sinRa;
  const vz = radialVel * sinDec + vDelta * cosDec;
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  return {
    vx,
    vy,
    vz,
    speed,
    pmra,
    pmdec,
    radialVelocity: radialVel !== 0 ? radialVel : undefined,
  };
}

/**
 * Loads official IAU star names gazetteer.
 */
export function loadIauStarNames(csvPath: string): Map<number, string> {
  const hipMap = new Map<number, string>();
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) return hipMap;

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Format: Proper Names,NEC+,Designation,HIP,...
    const parts = line.split(',');
    const properName = parts[0]?.trim();
    const hipStr = parts[3]?.trim();
    if (properName && hipStr && !isNaN(parseInt(hipStr, 10))) {
      hipMap.set(parseInt(hipStr, 10), properName);
    }
  }
  return hipMap;
}

export interface HygCrossMatch {
  id: number;
  hip?: number | null;
  hd?: number | null;
  proper?: string;
  bayer?: string;
  flam?: number;
  con?: string;
  spect?: string;
  ci?: number;
  lum?: number;
}

/**
 * Indexes HYG database by Hipparcos number and coordinate hash for cross-referencing.
 */
export function loadHygCrossMatch(csvPath: string): {
  byHip: Map<number, HygCrossMatch>;
  byCoord: Map<string, HygCrossMatch>;
} {
  const byHip = new Map<number, HygCrossMatch>();
  const byCoord = new Map<string, HygCrossMatch>();
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) return { byHip, byCoord };

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');
  if (lines.length <= 1) return { byHip, byCoord };

  const header = lines[0].split(',');
  const idIdx = header.indexOf('id');
  const hipIdx = header.indexOf('hip');
  const hdIdx = header.indexOf('hd');
  const properIdx = header.indexOf('proper');
  const bayerIdx = header.indexOf('bayer');
  const flamIdx = header.indexOf('flam');
  const conIdx = header.indexOf('con');
  const spectIdx = header.indexOf('spect');
  const ciIdx = header.indexOf('ci');
  const lumIdx = header.indexOf('lum');
  const raIdx = header.indexOf('ra');
  const decIdx = header.indexOf('dec');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const id = parseInt(parts[idIdx], 10);
    if (isNaN(id)) continue;

    const hip = parts[hipIdx] ? parseInt(parts[hipIdx], 10) : null;
    const hd = parts[hdIdx] ? parseInt(parts[hdIdx], 10) : null;
    const proper = parts[properIdx]?.trim() || undefined;
    const bayer = parts[bayerIdx]?.trim() || undefined;
    const flam = parts[flamIdx] ? parseInt(parts[flamIdx], 10) : undefined;
    const con = parts[conIdx]?.trim() || undefined;
    const spect = parts[spectIdx]?.trim() || undefined;
    const ci = parts[ciIdx] ? parseFloat(parts[ciIdx]) : undefined;
    const lum = parts[lumIdx] ? parseFloat(parts[lumIdx]) : undefined;
    const ra = parts[raIdx] ? parseFloat(parts[raIdx]) : undefined;
    const dec = parts[decIdx] ? parseFloat(parts[decIdx]) : undefined;

    const item: HygCrossMatch = { id, hip, hd, proper, bayer, flam, con, spect, ci, lum };
    if (hip) byHip.set(hip, item);
    if (ra !== undefined && dec !== undefined) {
      // Coordinate key: round to ~0.05 deg (~3 arcmin)
      const key = `${(ra * 15).toFixed(1)}_${dec.toFixed(1)}`;
      byCoord.set(key, item);
    }
  }

  return { byHip, byCoord };
}

/**
 * Loads and harmonizes exoplanet catalogs across OEC, NASA Exoplanet Archive, and Exoplanet.eu.
 */
export function loadAllExoplanetCatalogs(
  oecCsv: string,
  nasaCsv: string,
  euCsv: string,
): Map<string, ExoplanetRecord[]> {
  const hostMap = new Map<string, ExoplanetRecord[]>();

  function addPlanet(hostKey: string, planet: ExoplanetRecord) {
    const key = hostKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bucket = hostMap.get(key);
    if (!bucket) {
      bucket = [];
      hostMap.set(key, bucket);
    }
    // Check if planet letter or designation already present
    if (!bucket.some((p) => p.letter === planet.letter || p.id === planet.id)) {
      bucket.push(planet);
    }
  }

  // 1. Ingest Open Exoplanet Catalogue
  if (fs.existsSync(oecCsv)) {
    const lines = fs.readFileSync(oecCsv, 'utf-8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      const planetName = parts[0]?.trim();
      if (!planetName) continue;

      const lastSpace = planetName.lastIndexOf(' ');
      if (lastSpace === -1) continue;
      const hostName = planetName.substring(0, lastSpace).trim();
      const letter = planetName.substring(lastSpace + 1).trim();

      const semimajoraxis = parseFloat(parts[5]);
      const eccentricity = parseFloat(parts[6]);
      const period = parseFloat(parts[4]);
      const mass = parseFloat(parts[2]);
      const radius = parseFloat(parts[3]);
      const temperature = parseFloat(parts[11]);
      const discoverymethod = parts[13]?.trim() || undefined;
      const discoveryyear = parseInt(parts[14], 10);

      // Estimate Earth Similarity Index (ESI)
      let esi: number | undefined;
      const rEarth = !isNaN(radius) ? radius * 11.209 : undefined;
      if (rEarth !== undefined && !isNaN(temperature)) {
        const rTerm = 1 - Math.abs((rEarth - 1) / (rEarth + 1));
        const tTerm = 1 - Math.abs((temperature - 288) / (temperature + 288));
        esi = Math.max(0, Math.min(1, Math.sqrt(Math.max(0, rTerm * tTerm))));
      }

      const record: ExoplanetRecord = {
        id: planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: planetName,
        letter,
        discoveryYear: !isNaN(discoveryyear) ? discoveryyear : undefined,
        discoveryMethod: discoverymethod,
        massMjup: !isNaN(mass) ? mass : undefined,
        radiusRjup: !isNaN(radius) ? radius : undefined,
        radiusRearth: rEarth,
        equilibriumTempK: !isNaN(temperature) ? temperature : undefined,
        esi,
        orbit: {
          semiMajorAxis: !isNaN(semimajoraxis) ? semimajoraxis : 0,
          eccentricity: !isNaN(eccentricity) ? eccentricity : 0,
          inclination: !isNaN(parseFloat(parts[10])) ? parseFloat(parts[10]) : 0,
          ascendingNode: !isNaN(parseFloat(parts[9])) ? parseFloat(parts[9]) : 0,
          argumentOfPeriapsis: !isNaN(parseFloat(parts[7])) ? parseFloat(parts[7]) : 0,
          meanAnomaly: 0,
          periodDays: !isNaN(period) ? period : 0,
        },
      };

      addPlanet(hostName, record);
    }
  }

  // 2. Ingest NASA Exoplanet Archive
  if (fs.existsSync(nasaCsv)) {
    const lines = fs.readFileSync(nasaCsv, 'utf-8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // CSV format: "HD 2039 b","HD 2039",1,1,"Radial Velocity",2002,...
      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      const planetName = parts[0];
      const hostName = parts[1];
      if (!planetName || !hostName) continue;

      const letter = planetName.split(' ').pop() || 'b';
      const discoverymethod = parts[4] || undefined;
      const discoveryyear = parseInt(parts[5], 10);
      const period = parseFloat(parts[6]);
      const semimajoraxis = parseFloat(parts[7]);
      const massEarth = parseFloat(parts[8]);
      const radiusEarth = parseFloat(parts[9]);
      const temperature = parseFloat(parts[10]);

      let esi: number | undefined;
      if (!isNaN(radiusEarth) && !isNaN(temperature)) {
        const rTerm = 1 - Math.abs((radiusEarth - 1) / (radiusEarth + 1));
        const tTerm = 1 - Math.abs((temperature - 288) / (temperature + 288));
        esi = Math.max(0, Math.min(1, Math.sqrt(Math.max(0, rTerm * tTerm))));
      }

      const record: ExoplanetRecord = {
        id: planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: planetName,
        letter,
        discoveryYear: !isNaN(discoveryyear) ? discoveryyear : undefined,
        discoveryMethod: discoverymethod,
        massMearth: !isNaN(massEarth) ? massEarth : undefined,
        massMjup: !isNaN(massEarth) ? massEarth / 317.8 : undefined,
        radiusRearth: !isNaN(radiusEarth) ? radiusEarth : undefined,
        radiusRjup: !isNaN(radiusEarth) ? radiusEarth / 11.209 : undefined,
        equilibriumTempK: !isNaN(temperature) ? temperature : undefined,
        esi,
        orbit: {
          semiMajorAxis: !isNaN(semimajoraxis) ? semimajoraxis : 0,
          eccentricity: 0,
          inclination: 0,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 0,
          periodDays: !isNaN(period) ? period : 0,
        },
      };

      addPlanet(hostName, record);
    }
  }

  // 3. Ingest Exoplanet.eu
  if (fs.existsSync(euCsv)) {
    const lines = fs.readFileSync(euCsv, 'utf-8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      const planetName = parts[0]?.trim();
      if (!planetName) continue;

      const lastSpace = planetName.lastIndexOf(' ');
      if (lastSpace === -1) continue;
      const hostName = planetName.substring(0, lastSpace).trim();
      const letter = planetName.substring(lastSpace + 1).trim();

      const mass = parseFloat(parts[2]);
      const radius = parseFloat(parts[8]);
      const period = parseFloat(parts[11]);
      const semimajoraxis = parseFloat(parts[14]);
      const eccentricity = parseFloat(parts[17]);
      const inclination = parseFloat(parts[20]);
      const discYear = parseInt(parts[24], 10);
      const detectionType = parts[63]?.trim() || undefined;

      const record: ExoplanetRecord = {
        id: planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: planetName,
        letter,
        discoveryYear: !isNaN(discYear) ? discYear : undefined,
        discoveryMethod: detectionType,
        massMjup: !isNaN(mass) ? mass : undefined,
        radiusRjup: !isNaN(radius) ? radius : undefined,
        orbit: {
          semiMajorAxis: !isNaN(semimajoraxis) ? semimajoraxis : 0,
          eccentricity: !isNaN(eccentricity) ? eccentricity : 0,
          inclination: !isNaN(inclination) ? inclination : 0,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 0,
          periodDays: !isNaN(period) ? period : 0,
        },
      };

      addPlanet(hostName, record);
    }
  }

  return hostMap;
}

/**
 * Loads and indexes exoplanets from the Open Exoplanet Catalogue CSV,
 * enriching with official IAU NameExoWorlds common designations.
 */
export function loadExoplanetCatalog(csvPath: string): Map<string, ExoplanetRecord[]> {
  const hostMap = new Map<string, ExoplanetRecord[]>();
  const resolved = path.resolve(csvPath);

  if (!fs.existsSync(resolved)) {
    return hostMap;
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');
  if (lines.length <= 1) return hostMap;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const planetName = parts[0]?.trim();
    if (!planetName) continue;

    const lastSpace = planetName.lastIndexOf(' ');
    if (lastSpace === -1) continue;

    const hostName = planetName.substring(0, lastSpace).trim();
    const letter = planetName.substring(lastSpace + 1).trim();

    const semimajoraxis = parseFloat(parts[5]);
    const eccentricity = parseFloat(parts[6]);
    const periastron = parseFloat(parts[7]);
    const ascendingnode = parseFloat(parts[9]);
    const inclination = parseFloat(parts[10]);
    const temperature = parseFloat(parts[11]);
    const period = parseFloat(parts[4]);
    const mass = parseFloat(parts[2]);
    const radius = parseFloat(parts[3]);
    const discoverymethod = parts[13]?.trim() || undefined;
    const discoveryyear = parseInt(parts[14], 10);

    // Cross-match IAU NameExoWorlds official common nomenclature
    const iauMatch = IAU_NAME_EXOWORLDS[planetName];
    const displayName = iauMatch ? `${planetName} (${iauMatch.planetName})` : planetName;

    const planetRecord: ExoplanetRecord = {
      id: planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: displayName,
      letter,
      discoveryYear: !isNaN(discoveryyear) ? discoveryyear : undefined,
      discoveryMethod: discoverymethod,
      massMjup: !isNaN(mass) ? mass : undefined,
      radiusRjup: !isNaN(radius) ? radius : undefined,
      equilibriumTempK: !isNaN(temperature) ? temperature : undefined,
      orbit: {
        semiMajorAxis: !isNaN(semimajoraxis) ? semimajoraxis : 0,
        eccentricity: !isNaN(eccentricity) ? eccentricity : 0,
        inclination: !isNaN(inclination) ? inclination : 0,
        ascendingNode: !isNaN(ascendingnode) ? ascendingnode : 0,
        argumentOfPeriapsis: !isNaN(periastron) ? periastron : 0,
        meanAnomaly: 0,
        periodDays: !isNaN(period) ? period : 0,
      },
    };

    const keys = [
      hostName.toLowerCase(),
      hostName.toLowerCase().replace(/\s+/g, ''),
    ];

    if (iauMatch) {
      keys.push(iauMatch.starName.toLowerCase());
      keys.push(iauMatch.starName.toLowerCase().replace(/\s+/g, ''));
    }

    for (const key of keys) {
      let bucket = hostMap.get(key);
      if (!bucket) {
        bucket = [];
        hostMap.set(key, bucket);
      }
      bucket.push(planetRecord);
    }
  }

  return hostMap;
}

/**
 * Cross-matches a stellar node against the indexed exoplanet catalog.
 */
export function matchExoplanetsForStar(
  star: StarmapNode,
  hostMap: Map<string, ExoplanetRecord[]>,
): ExoplanetRecord[] {
  if (hostMap.size === 0) return [];

  const candidateKeys: string[] = [];

  if (star.properName) {
    candidateKeys.push(star.properName.toLowerCase());
    candidateKeys.push(star.properName.toLowerCase().replace(/\s+/g, ''));
  }
  if (star.name) {
    candidateKeys.push(star.name.toLowerCase());
    candidateKeys.push(star.name.toLowerCase().replace(/\s+/g, ''));
  }
  if (star.hd) {
    candidateKeys.push(`hd ${star.hd}`.toLowerCase());
    candidateKeys.push(`hd${star.hd}`.toLowerCase());
  }
  if (star.hip) {
    candidateKeys.push(`hip ${star.hip}`.toLowerCase());
    candidateKeys.push(`hip${star.hip}`.toLowerCase());
  }
  if (star.gl) {
    candidateKeys.push(star.gl.toLowerCase());
    candidateKeys.push(star.gl.toLowerCase().replace(/\s+/g, ''));
    candidateKeys.push(star.gl.toLowerCase().replace('gl ', 'gj '));
    candidateKeys.push(star.gl.toLowerCase().replace('gl ', 'gliese '));
  }

  for (const key of candidateKeys) {
    const matched = hostMap.get(key);
    if (matched && matched.length > 0) {
      const uniqueMap = new Map<string, ExoplanetRecord>();
      for (const p of matched) {
        uniqueMap.set(p.id, p);
      }
      return Array.from(uniqueMap.values());
    }
  }

  return [];
}

/**
 * Evaluates whether an exoplanetary system contains a plausible habitable zone candidate.
 */
export function checkHabitableCandidate(planets: ExoplanetRecord[], starLum?: number): boolean {
  for (const p of planets) {
    // 1. Direct equilibrium temperature range [200 K, 320 K]
    if (p.equilibriumTempK !== undefined && p.equilibriumTempK >= 200 && p.equilibriumTempK <= 320) {
      return true;
    }
    // 2. Insolation / habitable zone approximation based on stellar luminosity (AU)
    if (starLum !== undefined && starLum > 0 && p.orbit?.semiMajorAxis) {
      const hzInner = 0.75 * Math.sqrt(starLum);
      const hzOuter = 1.77 * Math.sqrt(starLum);
      if (p.orbit.semiMajorAxis >= hzInner && p.orbit.semiMajorAxis <= hzOuter) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Classifies an exoplanet into a census category based on physical metrics:
 * - Terrestrial: Rp <= 1.75 R_earth or Mp <= 10 M_earth
 * - Ice Giant: 1.75 R_earth < Rp <= 6.0 R_earth or 10 M_earth < Mp <= 50 M_earth
 * - Gas Giant: Rp > 6.0 R_earth or Mp > 50 M_earth
 */
export function classifyExoplanet(planet: ExoplanetRecord): 'terrestrial' | 'gas-giant' | 'ice-giant' {
  return classifyPlanetPhysical(planet);
}

/**
 * Transforms a StarmapNode into a collapsed SystemSummaryNode with spatial sector tags,
 * variability flags, and attached exoplanetary metrics.
 */
export function starNodeToSystemSummary(
  star: StarmapNode,
  planets: ExoplanetRecord[] = [],
): SystemSummaryNode {
  const sectorId = formatSectorId(star.x, star.y, star.z);
  const tags: string[] = [];

  if (star.mag <= 6.5) {
    tags.push('NakedEye');
  }
  if (star.dist <= 10) {
    tags.push('SolarNeighborhood10pc');
  }
  if (star.name === 'Sol') {
    tags.push('HomeSystem');
  }

  // Cross-reference variable star index
  if (star.properName && AAVSO_VARIABLE_CATALOG[star.properName]) {
    tags.push('VariableStar');
  } else if (AAVSO_VARIABLE_CATALOG[star.name]) {
    tags.push('VariableStar');
  }

  const isSol = star.name === 'Sol';
  const planetCount = isSol ? 8 : planets.length;
  const hasHabitable = isSol ? true : checkHabitableCandidate(planets, star.lum);

  let planetCensus: ('terrestrial' | 'gas-giant' | 'ice-giant')[] | undefined;
  if (isSol) {
    planetCensus = ['terrestrial', 'gas-giant', 'ice-giant'];
  } else if (planets.length > 0) {
    const present = (['terrestrial', 'gas-giant', 'ice-giant'] as const).filter((cat) =>
      planets.some((p) => classifyExoplanet(p) === cat)
    );
    if (present.length > 0) {
      planetCensus = present;
    }
  }

  if (planetCount > 0) {
    tags.push('ExoplanetHost');
  }
  if (hasHabitable) {
    tags.push('HabitableCandidate');
  }

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
    hasHabitableCandidate: hasHabitable,
    sectorId,
    tags: tags.length > 0 ? tags : undefined,
  };
}

/**
 * Loads all deep-sky galactic structures across Layers 3 & 4.
 */
export function loadAllGalacticStructures(): GalacticStructureRecord[] {
  const structures: GalacticStructureRecord[] = [];

  // 1. Cantat-Gaudin Open Clusters (2,017 clusters)
  const cgPath = path.resolve('data/raw/cantat_gaudin_clusters.dat');
  if (fs.existsSync(cgPath)) {
    const lines = fs.readFileSync(cgPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const name = line.substring(0, 17).trim();
      const ra = parseFloat(line.substring(17, 26).trim());
      const dec = parseFloat(line.substring(26, 35).trim());
      const plx = parseFloat(line.substring(50, 58).trim());
      const nbStars = parseInt(line.substring(58, 65).trim(), 10);
      const logAge = parseFloat(line.substring(135, 142).trim());

      if (name && !isNaN(ra) && !isNaN(dec)) {
        const dist = plx > 0 ? 1000 / plx : 500;
        const [x, y, z] = equatorialToCartesian(ra / 15, dec, dist);
        structures.push({
          id: `cluster-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: name.replace(/_/g, ' '),
          type: 'OpenCluster',
          x,
          y,
          z,
          dist,
          ageMyr: !isNaN(logAge) ? Math.round(Math.pow(10, logAge) / 1e6) : undefined,
          memberCount: !isNaN(nbStars) ? nbStars : undefined,
          designations: [name],
          description: `Galactic open star cluster cataloged in Cantat-Gaudin Gaia survey.`,
        });
      }
    }
  }

  // 2. Harris Globular Clusters (157 globulars)
  const harrisPath = path.resolve('data/raw/harris_globulars.dat.gz');
  if (fs.existsSync(harrisPath)) {
    const content = zlib.gunzipSync(fs.readFileSync(harrisPath)).toString('utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.length < 50) continue;
      const id = line.substring(1, 10).trim();
      const name = line.substring(11, 22).trim() || id;
      const raH = parseFloat(line.substring(23, 25));
      const raM = parseFloat(line.substring(26, 28));
      const raS = parseFloat(line.substring(29, 33));
      const decSign = line.substring(34, 35) === '-' ? -1 : 1;
      const decD = parseFloat(line.substring(35, 37));
      const decM = parseFloat(line.substring(38, 40));
      const decS = parseFloat(line.substring(41, 43));
      const distKpc = parseFloat(line.substring(55, 61));

      if (id && !isNaN(raH) && !isNaN(distKpc)) {
        const raHours = raH + raM / 60 + raS / 3600;
        const decDeg = decSign * (decD + decM / 60 + decS / 3600);
        const distPc = distKpc * 1000;
        const [x, y, z] = equatorialToCartesian(raHours, decDeg, distPc);

        structures.push({
          id: `globular-${id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: name ? `${id} (${name})` : id,
          type: 'GlobularCluster',
          x,
          y,
          z,
          dist: distPc,
          designations: [id, ...(name ? [name] : [])],
          description: `Milky Way halo globular cluster from Harris (2010) catalog.`,
        });
      }
    }
  }

  // 3. Green's Supernova Remnants (294 SNRs)
  const snrPath = path.resolve('data/raw/greens_snr.dat');
  if (fs.existsSync(snrPath)) {
    const lines = fs.readFileSync(snrPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length < 30) continue;
      const snrId = line.substring(0, 12).trim();
      const raH = parseFloat(line.substring(13, 15));
      const raM = parseFloat(line.substring(16, 18));
      const raS = parseFloat(line.substring(19, 21));
      const decSign = line.substring(22, 23) === '-' ? -1 : 1;
      const decD = parseFloat(line.substring(23, 25));
      const decM = parseFloat(line.substring(26, 28));

      if (snrId && !isNaN(raH)) {
        const raHours = raH + raM / 60 + (isNaN(raS) ? 0 : raS) / 3600;
        const decDeg = decSign * (decD + decM / 60);
        const distPc = 1500; // Representative distance
        const [x, y, z] = equatorialToCartesian(raHours, decDeg, distPc);

        structures.push({
          id: `snr-${snrId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: `SNR ${snrId}`,
          type: 'SupernovaRemnant',
          x,
          y,
          z,
          dist: distPc,
          designations: [snrId],
          description: `Galactic supernova remnant from Green's SNR Catalogue.`,
        });
      }
    }
  }

  // 4. ATNF Pulsars (706 pulsars)
  const atnfPath = path.resolve('data/raw/atnf_pulsars.dat');
  if (fs.existsSync(atnfPath)) {
    const lines = fs.readFileSync(atnfPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length < 40) continue;
      const jname = line.substring(0, 12).trim();
      const raHours = parseFloat(line.substring(24, 38));
      const decDeg = parseFloat(line.substring(48, 62));

      if (jname && !isNaN(raHours) && !isNaN(decDeg)) {
        const distPc = 800; // Representative local pulsar distance
        const [x, y, z] = equatorialToCartesian(raHours / 15, decDeg, distPc);

        structures.push({
          id: `pulsar-${jname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: `PSR ${jname}`,
          type: 'Pulsar',
          x,
          y,
          z,
          dist: distPc,
          designations: [jname],
          description: `Rotation-powered pulsar from ATNF Pulsar Database.`,
        });
      }
    }
  }

  // 5. Barnard Dark Nebulae (349 dark clouds)
  const barnardPath = path.resolve('data/raw/barnard_dark_clouds.dat');
  if (fs.existsSync(barnardPath)) {
    const lines = fs.readFileSync(barnardPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length < 25) continue;
      const bNum = line.substring(0, 5).trim();
      const raH = parseFloat(line.substring(6, 8));
      const raM = parseFloat(line.substring(9, 11));
      const decSign = line.substring(15, 16) === '-' ? -1 : 1;
      const decD = parseFloat(line.substring(16, 18));
      const decM = parseFloat(line.substring(19, 21));

      if (bNum && !isNaN(raH)) {
        const raHours = raH + raM / 60;
        const decDeg = decSign * (decD + decM / 60);
        const distPc = 300;
        const [x, y, z] = equatorialToCartesian(raHours, decDeg, distPc);

        structures.push({
          id: `barnard-${bNum.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: `Barnard ${bNum}`,
          type: 'DarkNebula',
          x,
          y,
          z,
          dist: distPc,
          designations: [`B ${bNum}`, `Barnard ${bNum}`],
          description: `Dark absorption cloud cataloged by E. E. Barnard.`,
        });
      }
    }
  }

  // 6. OpenNGC Deep Sky Landmarks (Messier, Caldwell, Bright NGC)
  const ngcPath = path.resolve('data/raw/open_ngc.csv');
  if (fs.existsSync(ngcPath)) {
    const lines = fs.readFileSync(ngcPath, 'utf-8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(';');
      const name = parts[0]?.trim();
      const type = parts[1]?.trim();
      const raStr = parts[2]?.trim();
      const decStr = parts[3]?.trim();
      const commonNames = parts[28]?.trim() || '';
      const messier = parts[23]?.trim();

      // Filter to landmark objects (Messier, Named, or nearby types)
      if (name && raStr && decStr && (messier || commonNames || type === 'OCl' || type === 'GCl' || type === 'PN')) {
        const [raH, raM, raS] = raStr.split(':').map(Number);
        const decParts = decStr.split(':').map(Number);
        const decSign = decStr.startsWith('-') ? -1 : 1;
        const decD = Math.abs(decParts[0]);
        const decM = decParts[1] || 0;
        const decS = decParts[2] || 0;

        if (!isNaN(raH) && !isNaN(decD)) {
          const raHours = raH + raM / 60 + (raS || 0) / 3600;
          const decDeg = decSign * (decD + decM / 60 + decS / 3600);
          const distPc = messier ? 1200 : 2500;
          const [x, y, z] = equatorialToCartesian(raHours, decDeg, distPc);

          let structType: GalacticStructureRecord['type'] = 'DeepSkyLandmark';
          if (type === 'OCl') structType = 'OpenCluster';
          else if (type === 'GCl') structType = 'GlobularCluster';
          else if (type === 'PN') structType = 'PlanetaryNebula';
          else if (type === 'Neb') structType = 'EmissionNebula';

          structures.push({
            id: `ngc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name: commonNames ? `${name} (${commonNames})` : name,
            type: structType,
            x,
            y,
            z,
            dist: distPc,
            designations: [name, ...(messier ? [`M ${messier}`] : []), ...(commonNames ? [commonNames] : [])],
            description: `Deep sky landmark cataloged in OpenNGC.`,
          });
        }
      }
    }
  }

  return structures;
}

/**
 * Loads all natural solar system bodies and minor planet orbits across Layer 4.
 */
export function loadAllSolarSystemBodies(): {
  primaryBodies: SolarSystemBodyRecord[];
  phaAsteroids: SolarSystemBodyRecord[];
  distantAsteroids: SolarSystemBodyRecord[];
  comets: SolarSystemBodyRecord[];
} {
  // 1. Primary bodies (Horizons seed)
  const primaryJson = path.resolve('data/raw/solar-system-bodies.json');
  let primaryBodies: SolarSystemBodyRecord[] = [];
  if (fs.existsSync(primaryJson)) {
    primaryBodies = JSON.parse(fs.readFileSync(primaryJson, 'utf-8'));
  }

  // 2. Potentially Hazardous Asteroids (PHAs from MPC)
  const phaAsteroids: SolarSystemBodyRecord[] = [];
  const phaPath = path.resolve('data/raw/mpc_pha.txt');
  if (fs.existsSync(phaPath)) {
    const lines = fs.readFileSync(phaPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length >= 100) {
        const desig = line.substring(0, 7).trim();
        const h = parseFloat(line.substring(8, 13));
        const m = parseFloat(line.substring(26, 35));
        const peri = parseFloat(line.substring(37, 46));
        const node = parseFloat(line.substring(48, 57));
        const inc = parseFloat(line.substring(59, 68));
        const e = parseFloat(line.substring(70, 79));
        const a = parseFloat(line.substring(92, 103));
        const name = line.substring(166, 194).trim() || desig;

        if (desig && !isNaN(a) && !isNaN(e)) {
          // Approximate diameter from absolute magnitude H (assuming albedo 0.14)
          const estRadiusKm = (1329 / Math.sqrt(0.14)) * Math.pow(10, -0.2 * (isNaN(h) ? 18 : h)) / 2;
          const periodDays = Math.pow(a, 1.5) * 365.25;

          phaAsteroids.push({
            id: `pha-${desig.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name,
            classification: 'AsteroidNEO',
            parentBodyId: 'sol',
            meanRadiusKm: parseFloat(estRadiusKm.toFixed(2)),
            albedo: 0.14,
            orbit: {
              semiMajorAxis: a,
              eccentricity: e,
              inclination: !isNaN(inc) ? inc : 0,
              ascendingNode: !isNaN(node) ? node : 0,
              argumentOfPeriapsis: !isNaN(peri) ? peri : 0,
              meanAnomaly: !isNaN(m) ? m : 0,
              periodDays: parseFloat(periodDays.toFixed(1)),
              epoch: 'J2000',
            },
            tags: ['PHA', 'NEO', 'MinorPlanetCenter'],
          });
        }
      }
    }
  }

  // 3. Distant Asteroids (Centaurs, Trojans, TNOs from MPC)
  const distantAsteroids: SolarSystemBodyRecord[] = [];
  const distPath = path.resolve('data/raw/mpc_distant.txt');
  if (fs.existsSync(distPath)) {
    const lines = fs.readFileSync(distPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length >= 100) {
        const desig = line.substring(0, 7).trim();
        const h = parseFloat(line.substring(8, 13));
        const m = parseFloat(line.substring(26, 35));
        const peri = parseFloat(line.substring(37, 46));
        const node = parseFloat(line.substring(48, 57));
        const inc = parseFloat(line.substring(59, 68));
        const e = parseFloat(line.substring(70, 79));
        const a = parseFloat(line.substring(92, 103));
        const name = line.substring(166, 194).trim() || desig;

        if (desig && !isNaN(a) && !isNaN(e)) {
          const estRadiusKm = (1329 / Math.sqrt(0.08)) * Math.pow(10, -0.2 * (isNaN(h) ? 10 : h)) / 2;
          const periodDays = Math.pow(a, 1.5) * 365.25;

          distantAsteroids.push({
            id: `distant-${desig.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name,
            classification: 'AsteroidDistant',
            parentBodyId: 'sol',
            meanRadiusKm: parseFloat(estRadiusKm.toFixed(1)),
            albedo: 0.08,
            orbit: {
              semiMajorAxis: a,
              eccentricity: e,
              inclination: !isNaN(inc) ? inc : 0,
              ascendingNode: !isNaN(node) ? node : 0,
              argumentOfPeriapsis: !isNaN(peri) ? peri : 0,
              meanAnomaly: !isNaN(m) ? m : 0,
              periodDays: parseFloat(periodDays.toFixed(1)),
              epoch: 'J2000',
            },
            tags: ['OuterSolarSystem', 'CentaurOrTNO', 'MinorPlanetCenter'],
          });
        }
      }
    }
  }

  // 4. Comets (MPC AllCometEls.txt)
  const comets: SolarSystemBodyRecord[] = [];
  const cometsPath = path.resolve('data/raw/mpc_comets.txt');
  if (fs.existsSync(cometsPath)) {
    const lines = fs.readFileSync(cometsPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length >= 80) {
        const desig = line.substring(0, 10).trim();
        const qPerihelion = parseFloat(line.substring(30, 39));
        const e = parseFloat(line.substring(41, 49));
        const peri = parseFloat(line.substring(51, 59));
        const node = parseFloat(line.substring(61, 69));
        const inc = parseFloat(line.substring(71, 79));
        const name = line.substring(80, 110)?.trim() || desig;

        if (desig && !isNaN(qPerihelion) && !isNaN(e)) {
          const a = e < 1 ? qPerihelion / (1 - e) : qPerihelion;
          const periodDays = e < 1 ? Math.pow(a, 1.5) * 365.25 : 100000;

          comets.push({
            id: `comet-${desig.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name,
            classification: 'Comet',
            parentBodyId: 'sol',
            meanRadiusKm: 2.5,
            albedo: 0.04,
            orbit: {
              semiMajorAxis: parseFloat(a.toFixed(3)),
              eccentricity: e,
              inclination: !isNaN(inc) ? inc : 0,
              ascendingNode: !isNaN(node) ? node : 0,
              argumentOfPeriapsis: !isNaN(peri) ? peri : 0,
              meanAnomaly: 0,
              periodDays: parseFloat(periodDays.toFixed(1)),
              epoch: 'J2000',
            },
            tags: ['Comet', 'MinorPlanetCenter'],
          });
        }
      }
    }
  }

  return { primaryBodies, phaAsteroids, distantAsteroids, comets };
}

export interface BuildPipelineOptions {
  catalogsDir?: string;
  partitionsDir?: string;
  systemsDir?: string;
  overlaysDir?: string;
  solDir?: string;
  exoplanetsCsvPath?: string;
  maxPartitionDistancePc?: number;
}

export interface PipelineSummary {
  totalStars: number;
  totalRows?: number;
  validStars: number;
  skippedRows: number;
  outputPath: string;
  kinematicCount: number;
  totalKinematics?: number;
  localVolume10pcCount?: number;
  local10pcCount?: number;
  referenceBrightCount?: number;
  sectorPartitionCount?: number;
  exoplanetSystemCount?: number;
  totalExoplanets?: number;
  totalExoplanetsAttached?: number;
  galacticStructuresCount?: number;
  solarSystemBodiesCount?: number;
}

export interface CatalogPayload {
  header: CatalogManifestHeader;
  systems: SystemSummaryNode[];
}

/**
 * Streams raw HYG CSV dataset, harmonizes into StarmapNode records with 3D velocities,
 * merges RECONS ground truth, cross-matches exoplanets, emits formal catalogs,
 * sector partitions, and multi-layer overlays.
 */
export async function buildCsvDataPipeline(
  resolvedInput: string,
  outputJsonPath: string,
  options?: BuildPipelineOptions,
): Promise<PipelineSummary> {
  const resolvedOutput = path.resolve(outputJsonPath);
  const maxPartitionDist = options?.maxPartitionDistancePc ?? 100;

  const outDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const exoplanetCsv = options?.exoplanetsCsvPath || 'data/raw/open_exoplanet_catalogue.csv';
  const exoplanetHostMap = loadExoplanetCatalog(exoplanetCsv);

  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let validStars = 0;
    let skippedRows = 0;
    let kinematicCount = 0;
    let exoplanetSystemCount = 0;
    let totalExoplanetsAttached = 0;

    const local10pcSystems: SystemSummaryNode[] = [];
    const referenceBrightSystems: SystemSummaryNode[] = [];
    const exoplanetHostSummaries: SystemSummaryNode[] = [];
    const sectorMap = new Map<string, SystemSummaryNode[]>();
    const sectorManifestsMap = new Map<string, SystemManifest[]>();

    const readStream = fs.createReadStream(resolvedInput);
    const writeStream = fs.createWriteStream(resolvedOutput, { encoding: 'utf-8' });

    writeStream.write('[');
    let isFirst = true;

    readStream
      .pipe(csv())
      .on('data', (row: Record<string, string>) => {
        totalRows++;
        const node = parseHygRow(row);
        if (!node) {
          skippedRows++;
          return;
        }

        if (node.velocity) {
          kinematicCount++;
        }

        const matchedPlanets = matchExoplanetsForStar(node, exoplanetHostMap);
        if (matchedPlanets.length > 0) {
          exoplanetSystemCount++;
          totalExoplanetsAttached += matchedPlanets.length;
        }

        if (options?.catalogsDir || options?.partitionsDir || options?.overlaysDir || options?.systemsDir) {
          const summary = starNodeToSystemSummary(node, matchedPlanets);

          if (node.dist <= 10) {
            local10pcSystems.push(summary);
          }
          if (node.mag <= 6.5 && node.dist <= maxPartitionDist) {
            referenceBrightSystems.push(summary);
          }
          if (summary.planetCount > 0) {
            exoplanetHostSummaries.push(summary);
          }

          if (options?.partitionsDir && node.dist <= maxPartitionDist) {
            const sectorId = summary.sectorId;
            let bucket = sectorMap.get(sectorId);
            if (!bucket) {
              bucket = [];
              sectorMap.set(sectorId, bucket);
            }
            bucket.push(summary);
          }

          if (options?.systemsDir && (matchedPlanets.length > 0 || node.name === 'Sol')) {
            const sectorId = summary.sectorId;
            let manifestBucket = sectorManifestsMap.get(sectorId);
            if (!manifestBucket) {
              manifestBucket = [];
              sectorManifestsMap.set(sectorId, manifestBucket);
            }

            manifestBucket.push({
              id: String(node.id),
              name: node.name,
              properName: node.properName,
              x: node.x,
              y: node.y,
              z: node.z,
              dist: node.dist,
              velocity: node.velocity,
              sectorId,
              stars: [
                {
                  id: `${node.id}-A`,
                  name: node.name,
                  componentDesignation: 'A',
                  spectralType: node.spect || 'Unknown',
                  mag: node.mag,
                  absmag: node.absmag,
                  luminosityLsun: node.lum,
                },
              ],
              planets: matchedPlanets,
            });
          }
        }

        const serialized = JSON.stringify(node);
        if (!isFirst) {
          writeStream.write(',');
        } else {
          isFirst = false;
        }
        writeStream.write(serialized);
        validStars++;
      })
      .on('end', () => {
        for (const recons of RECONS_10PC_SUPPLEMENT) {
          const [rx, ry, rz] = equatorialToCartesian(recons.ra, recons.dec, recons.dist);
          const rSectorId = formatSectorId(rx, ry, rz);
          const matchedPlanets = matchExoplanetsForStar(
            { id: 990000, name: recons.name, ra: recons.ra, dec: recons.dec, dist: recons.dist, mag: recons.mag, absmag: recons.absmag, x: rx, y: ry, z: rz },
            exoplanetHostMap,
          );

          const rSummary: SystemSummaryNode = {
            id: recons.id,
            name: recons.name,
            properName: recons.properName,
            x: rx,
            y: ry,
            z: rz,
            dist: recons.dist,
            mag: recons.mag,
            absmag: recons.absmag,
            spect: recons.spect,
            starCount: recons.starCount,
            planetCount: matchedPlanets.length,
            planetCensus: matchedPlanets.length > 0
              ? (['terrestrial', 'gas-giant', 'ice-giant'] as const).filter((cat) =>
                  matchedPlanets.some((p) => classifyExoplanet(p) === cat)
                )
              : undefined,
            hasHabitableCandidate: matchedPlanets.length > 0,
            sectorId: rSectorId,
            tags: ['SolarNeighborhood10pc', 'RECONSGroundTruth', ...(matchedPlanets.length > 0 ? ['ExoplanetHost'] : [])],
          };

          if (recons.dist <= 10) {
            local10pcSystems.push(rSummary);
          }

          if (options?.partitionsDir) {
            let bucket = sectorMap.get(rSectorId);
            if (!bucket) {
              bucket = [];
              sectorMap.set(rSectorId, bucket);
            }
            bucket.push(rSummary);
          }
        }

        writeStream.write(']');
        writeStream.end();
      })
      .on('error', (err) => {
        reject(err);
      });

    writeStream.on('finish', () => {
      const nowIso = new Date().toISOString();

      if (options?.catalogsDir) {
        const resolvedCatalogs = path.resolve(options.catalogsDir);
        if (!fs.existsSync(resolvedCatalogs)) {
          fs.mkdirSync(resolvedCatalogs, { recursive: true });
        }

        const local10pcPayload: CatalogPayload = {
          header: {
            catalogId: 'solar-neighborhood-10pc',
            name: 'Solar Neighborhood 10-Parsec Census',
            description: 'Comprehensive census of verified stellar systems within 10 parsecs of Sol including RECONS ground truth',
            epoch: 'J2000',
            count: local10pcSystems.length,
            timestamp: nowIso,
          },
          systems: local10pcSystems,
        };

        const brightStarsPayload: CatalogPayload = {
          header: {
            catalogId: 'reference-bright-stars',
            name: 'Photometric Reference Bright Stars (V <= 6.5, <= 100 pc)',
            description: 'Navigational and naked-eye reference stars within the 100-parsec volume enriched with IAU official names',
            epoch: 'J2000',
            count: referenceBrightSystems.length,
            timestamp: nowIso,
          },
          systems: referenceBrightSystems,
        };

        fs.writeFileSync(
          path.join(resolvedCatalogs, 'solar-neighborhood-10pc.json'),
          JSON.stringify(local10pcPayload),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedCatalogs, 'reference-bright-stars.json'),
          JSON.stringify(brightStarsPayload),
          'utf-8',
        );
      }

      if (options?.partitionsDir) {
        const resolvedPartitions = path.resolve(options.partitionsDir);
        if (!fs.existsSync(resolvedPartitions)) {
          fs.mkdirSync(resolvedPartitions, { recursive: true });
        }

        for (const [sectorId, systems] of sectorMap.entries()) {
          const bounds = getSectorBounds(sectorId, DEFAULT_SECTOR_SIZE_PC) || {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
          };

          const partitionManifest: SectorPartitionManifest = {
            sectorId,
            bounds,
            count: systems.length,
            systems,
          };

          fs.writeFileSync(
            path.join(resolvedPartitions, `${sectorId}.json`),
            JSON.stringify(partitionManifest),
            'utf-8',
          );
        }
      }

      if (options?.systemsDir && sectorManifestsMap.size > 0) {
        const resolvedSystems = path.resolve(options.systemsDir);
        if (!fs.existsSync(resolvedSystems)) {
          fs.mkdirSync(resolvedSystems, { recursive: true });
        }

        for (const [sectorId, manifests] of sectorManifestsMap.entries()) {
          fs.writeFileSync(
            path.join(resolvedSystems, `${sectorId}.json`),
            JSON.stringify(manifests),
            'utf-8',
          );
        }
      }

      if (options?.overlaysDir) {
        const resolvedOverlays = path.resolve(options.overlaysDir);
        if (!fs.existsSync(resolvedOverlays)) {
          fs.mkdirSync(resolvedOverlays, { recursive: true });
        }

        fs.writeFileSync(
          path.join(resolvedOverlays, 'exoplanetary-systems.json'),
          JSON.stringify({
            overlayId: 'exoplanetary-systems',
            title: 'Exoplanetary Systems Index',
            totalSystems: exoplanetHostSummaries.length,
            timestamp: nowIso,
            systems: exoplanetHostSummaries,
          }),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedOverlays, 'galactic-structures.json'),
          JSON.stringify({
            overlayId: 'galactic-structures',
            title: 'Local Galactic Structures, Clusters & Deep Sky',
            count: FULL_GALACTIC_STRUCTURES.length,
            timestamp: nowIso,
            structures: FULL_GALACTIC_STRUCTURES,
          }),
          'utf-8',
        );
      }

      if (options?.solDir) {
        const resolvedSol = path.resolve(options.solDir);
        if (!fs.existsSync(resolvedSol)) {
          fs.mkdirSync(resolvedSol, { recursive: true });
        }

        const primaryBodies = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'Star' || b.classification === 'Planet' || b.classification === 'DwarfPlanet' || b.classification === 'Moon',
        );
        const asteroids = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'AsteroidMainBelt' || b.classification === 'AsteroidNEO',
        );
        const comets = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'Comet',
        );
        const neos = FULL_SOLAR_SYSTEM_BODIES.filter(
          (b) => b.classification === 'AsteroidNEO',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'ephemeris-primary-bodies.json'),
          JSON.stringify({
            datasetId: 'sol-primary-bodies',
            title: 'Solar System Primary Bodies & Major Moons',
            epoch: 'J2000',
            count: primaryBodies.length,
            timestamp: nowIso,
            bodies: primaryBodies,
          }),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-asteroids.json'),
          JSON.stringify({
            datasetId: 'sol-asteroids',
            title: 'Solar System Asteroids, Trojans & Centaurs',
            epoch: 'J2000',
            count: asteroids.length,
            timestamp: nowIso,
            bodies: asteroids,
          }),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-comets.json'),
          JSON.stringify({
            datasetId: 'sol-comets',
            title: 'Solar System Periodic & Historic Comets',
            epoch: 'J2000',
            count: comets.length,
            timestamp: nowIso,
            bodies: comets,
          }),
          'utf-8',
        );

        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-neo.json'),
          JSON.stringify({
            datasetId: 'sol-minor-bodies-neo',
            title: 'Solar System Near-Earth Objects & Hazardous Asteroids',
            epoch: 'J2000',
            count: neos.length,
            timestamp: nowIso,
            bodies: neos,
          }),
          'utf-8',
        );
      }

      resolve({
        totalStars: validStars,
        totalRows,
        validStars,
        skippedRows,
        outputPath: resolvedOutput,
        kinematicCount,
        totalKinematics: kinematicCount,
        localVolume10pcCount: local10pcSystems.length,
        local10pcCount: local10pcSystems.length,
        referenceBrightCount: referenceBrightSystems.length,
        sectorPartitionCount: options?.partitionsDir ? sectorMap.size : undefined,
        exoplanetSystemCount: exoplanetHostSummaries.length || exoplanetSystemCount,
        totalExoplanets: totalExoplanetsAttached,
        totalExoplanetsAttached,
        galacticStructuresCount: options?.overlaysDir ? FULL_GALACTIC_STRUCTURES.length : undefined,
        solarSystemBodiesCount: options?.solDir ? FULL_SOLAR_SYSTEM_BODIES.length : undefined,
      });
    });

    writeStream.on('error', (err) => reject(err));
    readStream.on('error', (err) => reject(err));
  });
}

/**
 * Builds the comprehensive astronomical data pipeline ingesting all 25 authoritative sources from Gaia DR3 GCNS.
 */
export async function buildGaiaDataPipeline(
  gcnsGzPath: string,
  outputJsonPath: string,
  options?: BuildPipelineOptions,
): Promise<PipelineSummary> {
  const resolvedGcns = path.resolve(gcnsGzPath);
  const resolvedOutput = path.resolve(outputJsonPath);
  const maxPartitionDist = options?.maxPartitionDistancePc ?? 100;

  // Ensure base output directories exist
  const outDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Loading cross-match reference catalogs...');
  const iauProperStars = loadIauStarNames('data/raw/iau_proper_stars.csv');
  const hygCrossMatch = loadHygCrossMatch('data/hygdata_v3.csv');
  const exoplanetHostMap = loadAllExoplanetCatalogs(
    'data/raw/open_exoplanet_catalogue.csv',
    'data/raw/nasa_exoplanet_archive.csv',
    'data/raw/exoplanet_eu.csv',
  );

  return new Promise((resolve, reject) => {
    let totalStars = 0;
    let totalKinematics = 0;
    let local10pcCount = 0;
    let referenceBrightCount = 0;
    let totalExoplanets = 0;

    const local10pcSystems: SystemSummaryNode[] = [];
    const referenceBrightSystems: SystemSummaryNode[] = [];
    const exoplanetHostSummaries: SystemSummaryNode[] = [];
    const sectorMap = new Map<string, SystemSummaryNode[]>();
    const sectorManifestsMap = new Map<string, SystemManifest[]>();

    // 0. Include Sol at origin
    const solNode: StarmapNode = {
      id: 0,
      name: 'Sol',
      properName: 'Sol',
      dist: 0,
      ra: 0,
      dec: 0,
      mag: -26.74,
      absmag: 4.83,
      spect: 'G2V',
      ci: 0.656,
      x: 0,
      y: 0,
      z: 0,
      lum: 1.0,
      velocity: { vx: 0, vy: 0, vz: 0, speed: 0, radialVelocity: 0 },
    };

    const solSummary: SystemSummaryNode = {
      id: 'sol',
      name: 'Sol',
      properName: 'Sun',
      x: 0,
      y: 0,
      z: 0,
      dist: 0,
      mag: -26.74,
      absmag: 4.83,
      spect: 'G2V',
      ci: 0.656,
      starCount: 1,
      planetCount: 8,
      planetCensus: ['terrestrial', 'gas-giant', 'ice-giant'],
      hasHabitableCandidate: true,
      sectorId: 'sector_+000_+000_+000',
      tags: ['HomeSystem', 'SolarNeighborhood10pc', 'NakedEye', 'HabitableHost'],
      velocity: solNode.velocity,
    };

    local10pcSystems.push(solSummary);
    referenceBrightSystems.push(solSummary);
    let solBucket = sectorMap.get('sector_+000_+000_+000');
    if (!solBucket) {
      solBucket = [];
      sectorMap.set('sector_+000_+000_+000', solBucket);
    }
    solBucket.push(solSummary);

    const writeStream = fs.createWriteStream(resolvedOutput, { encoding: 'utf-8' });
    writeStream.write('[');
    writeStream.write(JSON.stringify(solNode));
    totalStars++;
    totalKinematics++;

    const rl = readline.createInterface({
      input: fs.createReadStream(resolvedGcns).pipe(zlib.createGunzip()),
      crlfDelay: Infinity,
    });

    rl.on('line', (line: string) => {
      if (line.length < 130) return;

      const sourceId = line.substring(2, 21).trim();
      const ra = parseFloat(line.substring(22, 36).trim());
      const dec = parseFloat(line.substring(45, 59).trim());
      const plx = parseFloat(line.substring(68, 77).trim());
      const pmra = parseFloat(line.substring(86, 95).trim());
      const pmdec = parseFloat(line.substring(104, 113).trim());
      const gmag = parseFloat(line.substring(122, 130).trim());
      const bpmag = parseFloat(line.substring(141, 149).trim());
      const rpmag = parseFloat(line.substring(160, 168).trim());
      const rvStr = line.substring(198, 206).trim();
      const rv = rvStr ? parseFloat(rvStr) : null;

      if (isNaN(ra) || isNaN(dec) || isNaN(plx) || plx <= 0) return;

      const dist = 1000.0 / plx;
      if (dist > maxPartitionDist) return;

      // Coordinate transform
      const [x, y, z] = equatorialToCartesian(ra / 15, dec, dist);

      // Kinematics in km/s
      const velocity = computeGaiaKinematics(ra, dec, dist, isNaN(pmra) ? 0 : pmra, isNaN(pmdec) ? 0 : pmdec, rv);
      totalKinematics++;

      // Cross-match HYG and IAU names
      const coordKey = `${ra.toFixed(1)}_${dec.toFixed(1)}`;
      const hygMatch = hygCrossMatch.byCoord.get(coordKey);
      let properName: string | undefined = hygMatch?.proper;

      if (hygMatch?.hip && iauProperStars.has(hygMatch.hip)) {
        properName = iauProperStars.get(hygMatch.hip);
      }

      let name = properName;
      if (!name) {
        if (hygMatch?.bayer && hygMatch?.con) {
          name = `${hygMatch.bayer} ${hygMatch.con}`;
        } else if (hygMatch?.hip) {
          name = `HIP ${hygMatch.hip}`;
        } else if (hygMatch?.hd) {
          name = `HD ${hygMatch.hd}`;
        } else {
          name = `Gaia DR3 ${sourceId}`;
        }
      }

      const mag = !isNaN(gmag) ? gmag : 15.0;
      const ci = !isNaN(bpmag) && !isNaN(rpmag) ? bpmag - rpmag : hygMatch?.ci || null;
      const absmag = mag - 5 * (Math.log10(dist) - 1);

      // Estimate spectral type from BP-RP color or HYG match
      let spect = hygMatch?.spect;
      if (!spect && ci !== null) {
        if (ci < 0.0) spect = 'O/B';
        else if (ci < 0.3) spect = 'A';
        else if (ci < 0.6) spect = 'F';
        else if (ci < 0.9) spect = 'G';
        else if (ci < 1.4) spect = 'K';
        else spect = 'M';
      }

      // Cross-match exoplanets
      const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedPlanets = exoplanetHostMap.get(cleanKey) || [];
      if (matchedPlanets.length > 0) {
        totalExoplanets += matchedPlanets.length;
      }

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

      const sectorId = formatSectorId(x, y, z);
      const tags: string[] = [];
      if (dist <= 10) tags.push('SolarNeighborhood10pc');
      if (mag <= 6.5) tags.push('NakedEye');
      if (matchedPlanets.length > 0) tags.push('ExoplanetHost');

      const summary: SystemSummaryNode = {
        id: `gaia-${sourceId}`,
        name,
        x: round3(x),
        y: round3(y),
        z: round3(z),
        dist: round3(dist),
        mag: round2(mag),
        absmag: round2(absmag),
        spect: spect || 'Unknown',
        starCount: 1,
        planetCount: matchedPlanets.length,
        planetCensus: matchedPlanets.length > 0
          ? (['terrestrial', 'gas-giant', 'ice-giant'] as const).filter((cat) =>
              matchedPlanets.some((p) => classifyExoplanet(p) === cat)
            )
          : undefined,
        hasHabitableCandidate: matchedPlanets.some((p) => (p.esi && p.esi > 0.7) || (p.equilibriumTempK && p.equilibriumTempK >= 200 && p.equilibriumTempK <= 320)),
        sectorId,
      };
      if (properName) summary.properName = properName;
      if (ci !== null && ci !== undefined) summary.ci = round2(ci);
      if (tags.length > 0) summary.tags = tags;
      if (velocity) {
        summary.velocity = {
          vx: round2(velocity.vx),
          vy: round2(velocity.vy),
          vz: round2(velocity.vz),
          speed: round2(velocity.speed),
        };
      }

      if (dist <= 10) {
        local10pcSystems.push(summary);
        local10pcCount++;
      }
      if (mag <= 6.5) {
        referenceBrightSystems.push(summary);
        referenceBrightCount++;
      }
      if (matchedPlanets.length > 0) {
        exoplanetHostSummaries.push(summary);
      }

      // Add to spatial sector partition bucket
      let bucket = sectorMap.get(sectorId);
      if (!bucket) {
        bucket = [];
        sectorMap.set(sectorId, bucket);
      }
      bucket.push(summary);

      // Add to detailed system manifest if exoplanets or bright
      if (options?.systemsDir && (matchedPlanets.length > 0 || mag <= 4.0)) {
        let manifestBucket = sectorManifestsMap.get(sectorId);
        if (!manifestBucket) {
          manifestBucket = [];
          sectorManifestsMap.set(sectorId, manifestBucket);
        }

        manifestBucket.push({
          id: `gaia-${sourceId}`,
          name,
          properName,
          x: round3(x),
          y: round3(y),
          z: round3(z),
          dist: round3(dist),
          velocity: {
            vx: round2(velocity.vx),
            vy: round2(velocity.vy),
            vz: round2(velocity.vz),
            speed: round2(velocity.speed),
          },
          sectorId,
          stars: [
            {
              id: `${sourceId}-A`,
              name,
              componentDesignation: 'A',
              spectralType: spect || 'Unknown',
              mag: round2(mag),
              absmag: round2(absmag),
            },
          ],
          planets: matchedPlanets,
        });
      }

      // Write to base stars.json
      const starRecord: Record<string, unknown> = {
        id: totalStars,
        name,
        ra: round3(ra / 15),
        dec: round3(dec),
        dist: round3(dist),
        mag: round2(mag),
        absmag: round2(absmag),
        x: round3(x),
        y: round3(y),
        z: round3(z),
      };
      if (properName) starRecord.properName = properName;
      if (hygMatch?.hip) starRecord.hip = hygMatch.hip;
      if (hygMatch?.hd) starRecord.hd = hygMatch.hd;
      if (hygMatch?.bayer) starRecord.bayer = hygMatch.bayer;
      if (hygMatch?.flam) starRecord.flam = hygMatch.flam;
      if (hygMatch?.con) starRecord.con = hygMatch.con;
      if (spect) starRecord.spect = spect;
      if (ci !== null && ci !== undefined) starRecord.ci = round2(ci);
      if (velocity) {
        starRecord.velocity = {
          vx: round2(velocity.vx),
          vy: round2(velocity.vy),
          vz: round2(velocity.vz),
          speed: round2(velocity.speed),
        };
      }

      writeStream.write(',');
      writeStream.write(JSON.stringify(starRecord));
      totalStars++;
    });

    rl.on('close', () => {
      writeStream.write(']');
      writeStream.end();
    });

    writeStream.on('finish', () => {
      console.log(`Writing partitions, catalogs, and multi-layer overlays...`);
      const nowIso = new Date().toISOString();

      // 1. Write formal catalogs
      if (options?.catalogsDir) {
        const resolvedCatalogs = path.resolve(options.catalogsDir);
        if (!fs.existsSync(resolvedCatalogs)) fs.mkdirSync(resolvedCatalogs, { recursive: true });

        const local10pcPayload = {
          header: {
            catalogId: 'solar-neighborhood-10pc',
            name: 'Solar Neighborhood 10-Parsec Census',
            description: 'Census of verified stellar systems within 10 parsecs of Sol from Gaia DR3 GCNS and RECONS ground truth',
            epoch: 'J2000',
            count: local10pcSystems.length,
            timestamp: nowIso,
          },
          systems: local10pcSystems,
        };

        const brightStarsPayload = {
          header: {
            catalogId: 'reference-bright-stars',
            name: 'Photometric Reference Bright Stars (V <= 6.5, <= 100 pc)',
            description: 'Naked-eye navigational reference stars within 100 pc enriched with official IAU proper names',
            epoch: 'J2000',
            count: referenceBrightSystems.length,
            timestamp: nowIso,
          },
          systems: referenceBrightSystems,
        };

        fs.writeFileSync(path.join(resolvedCatalogs, 'solar-neighborhood-10pc.json'), JSON.stringify(local10pcPayload), 'utf-8');
        fs.writeFileSync(path.join(resolvedCatalogs, 'reference-bright-stars.json'), JSON.stringify(brightStarsPayload), 'utf-8');
      }

      // 2. Write spatial sector partitions
      if (options?.partitionsDir) {
        const resolvedPartitions = path.resolve(options.partitionsDir);
        if (!fs.existsSync(resolvedPartitions)) fs.mkdirSync(resolvedPartitions, { recursive: true });

        for (const [sectorId, systems] of sectorMap.entries()) {
          const bounds = getSectorBounds(sectorId, DEFAULT_SECTOR_SIZE_PC) || {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
          };

          const manifest: SectorPartitionManifest = {
            sectorId,
            bounds,
            count: systems.length,
            systems,
          };

          fs.writeFileSync(path.join(resolvedPartitions, `${sectorId}.json`), JSON.stringify(manifest), 'utf-8');
        }
      }

      // 3. Write detailed system manifests
      if (options?.systemsDir && sectorManifestsMap.size > 0) {
        const resolvedSystems = path.resolve(options.systemsDir);
        if (!fs.existsSync(resolvedSystems)) fs.mkdirSync(resolvedSystems, { recursive: true });

        for (const [sectorId, manifests] of sectorManifestsMap.entries()) {
          fs.writeFileSync(path.join(resolvedSystems, `${sectorId}.json`), JSON.stringify(manifests), 'utf-8');
        }
      }

      // 4. Ingest and write Layer 3 Galactic Structures & Deep Sky
      let galacticCount = 0;
      if (options?.overlaysDir) {
        const resolvedOverlays = path.resolve(options.overlaysDir);
        if (!fs.existsSync(resolvedOverlays)) fs.mkdirSync(resolvedOverlays, { recursive: true });

        // Layer 2 Exoplanetary overlay index
        fs.writeFileSync(
          path.join(resolvedOverlays, 'exoplanetary-systems.json'),
          JSON.stringify({
            overlayId: 'exoplanetary-systems',
            title: 'Exoplanetary Systems Index',
            totalSystems: exoplanetHostSummaries.length,
            timestamp: nowIso,
            systems: exoplanetHostSummaries,
          }),
          'utf-8',
        );

        // Layer 3 Deep sky structures
        const allStructures = loadAllGalacticStructures();
        galacticCount = allStructures.length;
        fs.writeFileSync(
          path.join(resolvedOverlays, 'galactic-structures.json'),
          JSON.stringify({
            overlayId: 'galactic-structures',
            title: 'Local Galactic Structures, Clusters, Remnants & Deep Sky',
            count: allStructures.length,
            timestamp: nowIso,
            structures: allStructures,
          }),
          'utf-8',
        );
      }

      // 5. Ingest and write Layer 4 Solar System natural bodies & orbits
      let solarBodiesCount = 0;
      if (options?.solDir) {
        const resolvedSol = path.resolve(options.solDir);
        if (!fs.existsSync(resolvedSol)) fs.mkdirSync(resolvedSol, { recursive: true });

        const { primaryBodies, phaAsteroids, distantAsteroids, comets } = loadAllSolarSystemBodies();
        solarBodiesCount = primaryBodies.length + phaAsteroids.length + distantAsteroids.length + comets.length;

        // Primary bodies & major moons
        fs.writeFileSync(
          path.join(resolvedSol, 'ephemeris-primary-bodies.json'),
          JSON.stringify({
            datasetId: 'sol-primary-bodies',
            title: 'Solar System Primary Bodies & Major Moons',
            epoch: 'J2000',
            count: primaryBodies.length,
            timestamp: nowIso,
            bodies: primaryBodies,
          }),
          'utf-8',
        );

        // Distant Asteroids (Centaurs, Trojans, KBOs)
        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-asteroids.json'),
          JSON.stringify({
            datasetId: 'sol-asteroids-distant',
            title: 'Solar System Centaurs, Trojans & Kuiper Belt Objects',
            epoch: 'J2000',
            count: distantAsteroids.length,
            timestamp: nowIso,
            bodies: distantAsteroids,
          }),
          'utf-8',
        );

        // Near-Earth Objects & PHAs
        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-neo.json'),
          JSON.stringify({
            datasetId: 'sol-minor-bodies-pha',
            title: 'Solar System Potentially Hazardous Asteroids (PHAs)',
            epoch: 'J2000',
            count: phaAsteroids.length,
            timestamp: nowIso,
            bodies: phaAsteroids,
          }),
          'utf-8',
        );

        // Comets
        fs.writeFileSync(
          path.join(resolvedSol, 'orbital-elements-comets.json'),
          JSON.stringify({
            datasetId: 'sol-comets',
            title: 'Solar System Periodic & Historic Comets',
            epoch: 'J2000',
            count: comets.length,
            timestamp: nowIso,
            bodies: comets,
          }),
          'utf-8',
        );
      }

      resolve({
        totalStars,
        totalRows: totalStars,
        validStars: totalStars,
        skippedRows: 0,
        kinematicCount: totalKinematics,
        totalKinematics,
        localVolume10pcCount: local10pcCount,
        local10pcCount,
        referenceBrightCount,
        sectorPartitionCount: sectorMap.size,
        exoplanetSystemCount: exoplanetHostSummaries.length,
        totalExoplanets,
        totalExoplanetsAttached: totalExoplanets,
        galacticStructuresCount: galacticCount,
        solarSystemBodiesCount: solarBodiesCount,
        outputPath: resolvedOutput,
      });
    });

    writeStream.on('error', (err) => reject(err));
    rl.on('error', (err) => reject(err));
  });
}

/**
 * Builds the comprehensive astronomical data pipeline ingesting all 25 authoritative sources.
 * Seamlessly routes CSV input or compressed Gaia DR3 GCNS archive.
 */
export async function buildStarDataPipeline(
  inputPath: string,
  outputJsonPath: string,
  options?: BuildPipelineOptions,
): Promise<PipelineSummary> {
  const resolved = path.resolve(inputPath);
  if (resolved.endsWith('.gz') || resolved.includes('gcns')) {
    return buildGaiaDataPipeline(resolved, outputJsonPath, options);
  } else {
    return buildCsvDataPipeline(resolved, outputJsonPath, options);
  }
}

// CLI entrypoint
const isDirectExecution = process.argv[1]?.endsWith('build-data.ts');
if (isDirectExecution) {
  const gcnsGz = process.env.GCNS_GZ || 'data/raw/gaia_dr3_gcns.dat.gz';
  const outputJson = process.env.OUTPUT_JSON || 'public/data/stars.json';
  const catalogsDir = process.env.CATALOGS_DIR || 'public/data/catalogs';
  const partitionsDir = process.env.PARTITIONS_DIR || 'public/data/partitions';
  const systemsDir = process.env.SYSTEMS_DIR || 'public/data/systems';
  const overlaysDir = process.env.OVERLAYS_DIR || 'public/data/overlays';
  const solDir = process.env.SOL_DIR || 'public/data/sol';

  console.log(`Starting Data Pipeline: Ingesting Gaia DR3 GCNS from ${gcnsGz}...`);
  const startTime = Date.now();

  buildStarDataPipeline(gcnsGz, outputJson, {
    catalogsDir,
    partitionsDir,
    systemsDir,
    overlaysDir,
    solDir,
    maxPartitionDistancePc: 100,
  })
    .then((summary) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\nPipeline complete in ${elapsed}s:`);
      console.log(`  - Total Stars Processed: ${summary.totalStars}`);
      console.log(`  - 3D Kinematic Space Velocities: ${summary.totalKinematics} (100%)`);
      console.log(`  - Base Catalog Output: ${summary.outputPath}`);
      console.log(`  - Layer 1 (<= 10 pc Census): ${summary.local10pcCount} systems`);
      console.log(`  - Layer 1 (Naked-eye V <= 6.5): ${summary.referenceBrightCount} systems`);
      console.log(`  - Spatial 25 pc Sectors: ${summary.sectorPartitionCount} partitions`);
      console.log(`  - Layer 2 (Exoplanet Systems): ${summary.exoplanetSystemCount} systems (${summary.totalExoplanets} confirmed planets)`);
      console.log(`  - Layer 3 (Galactic Deep Sky): ${summary.galacticStructuresCount} structures`);
      console.log(`  - Layer 4 (Solar System Natural Bodies): ${summary.solarSystemBodiesCount} bodies`);
    })
    .catch((err) => {
      console.error('Data Pipeline failed:', err);
      process.exit(1);
    });
}
