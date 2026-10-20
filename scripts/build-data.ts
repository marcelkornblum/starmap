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
  CircumstellarDiskRecord,
} from '../src/types/astro';
import {
  equatorialToCartesian,
  parseKinematicVector,
  formatSectorId,
  getSectorBounds,
  DEFAULT_SECTOR_SIZE_PC,
  classifyPlanetPhysical,
  computePlanetCompositionCounts,
  isPlanetHabitableCandidate,
  computePlanetSurfaceGravityG,
  computeSystemHazardMask,
  computePlanetHazardMask,
} from '../src/utils/astroMath';
import {
  expandGouldOrConstellationSuffix,
  expandGlieseVariants,
  resolveStarProperName,
  resolveStarDisplayName,
  collectStarLookupKeys,
} from '../src/utils/nomenclature';
import {
  buildShardedSummariesAndDetails,
  buildSearchIndices,
  encodeSectorPartition,
} from '../src/utils/compactDataCodec';
import {
  encodeLayerManifest,
  buildLayerIndexManifest,
  buildSearchEntriesFromLayers,
  SEED_FICTIONAL_CANON_LAYERS,
} from '../src/utils/datasetLayerCodec';
import {
  OFFICIAL_IAU_STAR_NAMES,
  RECONS_10PC_SUPPLEMENT,
  IAU_NAME_EXOWORLDS,
  AAVSO_VARIABLE_CATALOG,
  FULL_GALACTIC_STRUCTURES,
  FULL_SOLAR_SYSTEM_BODIES,
  CIRCUMSTELLAR_DISKS_CATALOG,
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
  hr?: number | null;
  gl?: string;
  bf?: string;
  proper?: string;
  bayer?: string;
  flam?: number;
  con?: string;
  spect?: string;
  ci?: number;
  lum?: number;
  ra?: number;
  dec?: number;
  dist?: number;
  mag?: number;
  absmag?: number;
  pmra?: number;
  pmdec?: number;
  rv?: number;
  raDegJ2016?: number;
  decDegJ2016?: number;
}

/**
 * Indexes HYG database by Hipparcos number and epoch-propagated coordinate buckets for cross-referencing.
 */
export function loadHygCrossMatch(csvPath: string): {
  byHip: Map<number, HygCrossMatch>;
  byCoord: Map<string, HygCrossMatch>;
  byCoordCandidates: Map<string, HygCrossMatch[]>;
  allItems: HygCrossMatch[];
} {
  const byHip = new Map<number, HygCrossMatch>();
  const byCoord = new Map<string, HygCrossMatch>();
  const byCoordCandidates = new Map<string, HygCrossMatch[]>();
  const allItems: HygCrossMatch[] = [];
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) return { byHip, byCoord, byCoordCandidates, allItems };

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split('\n');
  if (lines.length <= 1) return { byHip, byCoord, byCoordCandidates, allItems };

  const header = lines[0].split(',');
  const idIdx = header.indexOf('id');
  const hipIdx = header.indexOf('hip');
  const hdIdx = header.indexOf('hd');
  const hrIdx = header.indexOf('hr');
  const glIdx = header.indexOf('gl');
  const bfIdx = header.indexOf('bf');
  const properIdx = header.indexOf('proper');
  const bayerIdx = header.indexOf('bayer');
  const flamIdx = header.indexOf('flam');
  const conIdx = header.indexOf('con');
  const spectIdx = header.indexOf('spect');
  const ciIdx = header.indexOf('ci');
  const lumIdx = header.indexOf('lum');
  const raIdx = header.indexOf('ra');
  const decIdx = header.indexOf('dec');
  const distIdx = header.indexOf('dist');
  const magIdx = header.indexOf('mag');
  const absmagIdx = header.indexOf('absmag');
  const pmraIdx = header.indexOf('pmra');
  const pmdecIdx = header.indexOf('pmdec');
  const rvIdx = header.indexOf('rv');

  function addCandidate(cellKey: string, item: HygCrossMatch) {
    let list = byCoordCandidates.get(cellKey);
    if (!list) {
      list = [];
      byCoordCandidates.set(cellKey, list);
    }
    if (!list.includes(item)) {
      list.push(item);
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const id = parseInt(parts[idIdx], 10);
    if (isNaN(id)) continue;

    const hip = hipIdx >= 0 && parts[hipIdx] ? parseInt(parts[hipIdx], 10) : null;
    const hd = hdIdx >= 0 && parts[hdIdx] ? parseInt(parts[hdIdx], 10) : null;
    const hr = hrIdx >= 0 && parts[hrIdx] ? parseInt(parts[hrIdx], 10) : null;
    const gl = glIdx >= 0 ? parts[glIdx]?.trim() || undefined : undefined;
    const bf = bfIdx >= 0 ? parts[bfIdx]?.trim() || undefined : undefined;
    const proper = properIdx >= 0 ? parts[properIdx]?.trim() || undefined : undefined;
    const bayer = bayerIdx >= 0 ? parts[bayerIdx]?.trim() || undefined : undefined;
    const flam = flamIdx >= 0 && parts[flamIdx] ? parseInt(parts[flamIdx], 10) : undefined;
    const con = conIdx >= 0 ? parts[conIdx]?.trim() || undefined : undefined;
    const spect = spectIdx >= 0 ? parts[spectIdx]?.trim() || undefined : undefined;
    const ci = ciIdx >= 0 && parts[ciIdx] ? parseFloat(parts[ciIdx]) : undefined;
    const lum = lumIdx >= 0 && parts[lumIdx] ? parseFloat(parts[lumIdx]) : undefined;
    const ra = raIdx >= 0 && parts[raIdx] ? parseFloat(parts[raIdx]) : undefined;
    const dec = decIdx >= 0 && parts[decIdx] ? parseFloat(parts[decIdx]) : undefined;
    const dist = distIdx >= 0 && parts[distIdx] ? parseFloat(parts[distIdx]) : undefined;
    const mag = magIdx >= 0 && parts[magIdx] ? parseFloat(parts[magIdx]) : undefined;
    const absmag = absmagIdx >= 0 && parts[absmagIdx] ? parseFloat(parts[absmagIdx]) : undefined;
    const pmra = pmraIdx >= 0 && parts[pmraIdx] ? parseFloat(parts[pmraIdx]) : 0;
    const pmdec = pmdecIdx >= 0 && parts[pmdecIdx] ? parseFloat(parts[pmdecIdx]) : 0;
    const rv = rvIdx >= 0 && parts[rvIdx] ? parseFloat(parts[rvIdx]) : 0;

    let raDegJ2016: number | undefined;
    let decDegJ2016: number | undefined;
    if (ra !== undefined && dec !== undefined && !isNaN(ra) && !isNaN(dec)) {
      const cosDec = Math.max(0.05, Math.cos((dec * Math.PI) / 180));
      raDegJ2016 = ((ra * 15 + ((isNaN(pmra) ? 0 : pmra) * 16) / (3600000 * cosDec)) % 360 + 360) % 360;
      decDegJ2016 = Math.max(-90, Math.min(90, dec + ((isNaN(pmdec) ? 0 : pmdec) * 16) / 3600000));
    }

    const item: HygCrossMatch = {
      id,
      hip,
      hd,
      hr,
      gl,
      bf,
      proper,
      bayer,
      flam,
      con,
      spect,
      ci,
      lum,
      ra,
      dec,
      dist,
      mag,
      absmag,
      pmra: isNaN(pmra) ? 0 : pmra,
      pmdec: isNaN(pmdec) ? 0 : pmdec,
      rv: isNaN(rv) ? 0 : rv,
      raDegJ2016,
      decDegJ2016,
    };

    allItems.push(item);
    if (hip) byHip.set(hip, item);
    if (ra !== undefined && dec !== undefined && !isNaN(ra) && !isNaN(dec)) {
      const j2000Key = `${(ra * 15).toFixed(1)}_${dec.toFixed(1)}`;
      const existing = byCoord.get(j2000Key);
      if (!existing || (item.mag ?? 99) < (existing.mag ?? 99)) {
        byCoord.set(j2000Key, item);
      }
      addCandidate(j2000Key, item);
      if (raDegJ2016 !== undefined && decDegJ2016 !== undefined) {
        const j2016Key = `${raDegJ2016.toFixed(1)}_${decDegJ2016.toFixed(1)}`;
        addCandidate(j2016Key, item);
      }
    }
  }

  return { byHip, byCoord, byCoordCandidates, allItems };
}

function findBestHygMatch(
  raDeg: number,
  decDeg: number,
  distPc: number,
  gmag: number,
  byCoordCandidates: Map<string, HygCrossMatch[]>,
  matchedHygIds: Set<number>,
): HygCrossMatch | undefined {
  if (byCoordCandidates.size === 0) return undefined;

  const cosDec = Math.max(0.05, Math.cos((decDeg * Math.PI) / 180));
  let bestCandidate: HygCrossMatch | undefined;
  let bestScore = Infinity;

  const decOffsets = [-0.1, 0, 0.1];
  const maxRaSteps = Math.min(20, Math.ceil(1 / cosDec));
  const raOffsets: number[] = [];
  for (let step = -maxRaSteps; step <= maxRaSteps; step++) {
    raOffsets.push(step * 0.1);
  }

  for (const dRa of raOffsets) {
    for (const dDec of decOffsets) {
      const rKey = ((raDeg + dRa + 360) % 360).toFixed(1);
      const dKey = (decDeg + dDec).toFixed(1);
      const list = byCoordCandidates.get(`${rKey}_${dKey}`);
      if (!list) continue;

      for (const cand of list) {
        if (cand.id === 0 || matchedHygIds.has(cand.id)) continue;
        if (cand.ra === undefined || cand.dec === undefined) continue;

        const candRa16 = cand.raDegJ2016 ?? cand.ra * 15;
        const candDec16 = cand.decDegJ2016 ?? cand.dec;
        const dRa16 = Math.min(Math.abs(raDeg - candRa16), 360 - Math.abs(raDeg - candRa16)) * cosDec;
        const dDec16 = Math.abs(decDeg - candDec16);
        const sep16 = Math.hypot(dRa16, dDec16);

        const candRa00 = cand.ra * 15;
        const candDec00 = cand.dec;
        const dRa00 = Math.min(Math.abs(raDeg - candRa00), 360 - Math.abs(raDeg - candRa00)) * cosDec;
        const dDec00 = Math.abs(decDeg - candDec00);
        const sep00 = Math.hypot(dRa00, dDec00);

        const sepDeg = Math.min(sep16, sep00);
        if (sepDeg > 0.08) continue;

        const candMag = cand.mag ?? gmag;
        const magDiff = Math.abs(gmag - candMag);
        if (magDiff > 3.5) continue;

        if (cand.dist !== undefined && cand.dist > 0 && cand.dist < 1000) {
          const minDist = Math.max(0.5, Math.min(distPc, cand.dist));
          if (minDist <= 25 && Math.abs(distPc - cand.dist) / minDist > 0.6) {
            continue;
          }
        }

        const score = sepDeg * 25 + magDiff * 0.25 + (cand.hip ? 0 : 0.05);
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = cand;
        }
      }
    }
  }

  if (bestCandidate) {
    matchedHygIds.add(bestCandidate.id);
  }
  return bestCandidate;
}

function mergeExoplanetRecords(existing: ExoplanetRecord, incoming: ExoplanetRecord): ExoplanetRecord {
  return {
    ...existing,
    name: existing.name.includes('(') ? existing.name : incoming.name.includes('(') ? incoming.name : existing.name,
    discoveryYear: existing.discoveryYear ?? incoming.discoveryYear,
    discoveryMethod: existing.discoveryMethod ?? incoming.discoveryMethod,
    massMjup: existing.massMjup ?? incoming.massMjup,
    massMearth: existing.massMearth ?? incoming.massMearth,
    radiusRjup: existing.radiusRjup ?? incoming.radiusRjup,
    radiusRearth: existing.radiusRearth ?? incoming.radiusRearth,
    equilibriumTempK: existing.equilibriumTempK ?? incoming.equilibriumTempK,
    esi: existing.esi ?? incoming.esi,
    orbit: existing.orbit?.semiMajorAxis ? existing.orbit : incoming.orbit ?? existing.orbit,
    confidence:
      existing.confidence === 'confirmed' || incoming.confidence === 'confirmed'
        ? 'confirmed'
        : existing.confidence ?? incoming.confidence ?? 'confirmed',
    ...(() => {
      let flags = (existing.theoreticalFlags ?? 0) | (incoming.theoreticalFlags ?? 0);
      const existingHasMeasuredTemp =
        existing.equilibriumTempK !== undefined && !((existing.theoreticalFlags ?? 0) & 1);
      const incomingHasMeasuredTemp =
        incoming.equilibriumTempK !== undefined && !((incoming.theoreticalFlags ?? 0) & 1);
      if (existingHasMeasuredTemp || incomingHasMeasuredTemp) {
        flags &= ~(1 | 8);
      }
      return { theoreticalFlags: flags > 0 ? flags : undefined };
    })(),
  };
}

/**
 * Loads and harmonizes exoplanet catalogs across OEC, NASA Exoplanet Archive, and Exoplanet.eu.
 * Includes all entries (confirmed and retracted candidates) and computes derived M_earth and radiative T_eq when missing.
 */
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
    if (!bucket) {
      bucket = [];
      hostMap.set(key, bucket);
    }
    const existingIdx = bucket.findIndex((p) => p.letter === planet.letter || p.id === planet.id);
    if (existingIdx === -1) {
      bucket.push(planet);
    } else {
      bucket[existingIdx] = mergeExoplanetRecords(bucket[existingIdx], planet);
    }
  }

  function enrichWithIauExoWorld(rawPlanetName: string, expandedPlanetName: string, record: ExoplanetRecord, hostName: string) {
    const iauMatch = IAU_NAME_EXOWORLDS[rawPlanetName] ?? IAU_NAME_EXOWORLDS[expandedPlanetName];
    if (iauMatch && !record.name.includes(iauMatch.planetName)) {
      record.name = `${expandedPlanetName} (${iauMatch.planetName})`;
    }
    addPlanet(hostName, record);
    if (iauMatch) {
      addPlanet(iauMatch.starName, record);
    }
  }

  // 1. Ingest Open Exoplanet Catalogue (including retracted candidates)
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
      let temperature = parseFloat(parts[11]);
      const discoverymethod = parts[13]?.trim() || undefined;
      const discoveryyear = parseInt(parts[14], 10);
      const hostRadiusRsun = parseFloat(parts[20]);
      const hostTempK = parseFloat(parts[22]);

      let derivedTemp = false;
      // Derive radiative equilibrium temperature when blank in OEC (Bond albedo A = 0.3)
      if (
        isNaN(temperature) &&
        !isNaN(hostTempK) &&
        hostTempK > 0 &&
        !isNaN(hostRadiusRsun) &&
        hostRadiusRsun > 0 &&
        !isNaN(semimajoraxis) &&
        semimajoraxis > 0
      ) {
        const hostRadiusAu = hostRadiusRsun * 0.00465047;
        temperature = Math.round(hostTempK * Math.pow(1 - 0.3, 0.25) * Math.sqrt(hostRadiusAu / (2 * semimajoraxis)) * 100) / 100;
        derivedTemp = true;
      }

      const mEarth = !isNaN(mass) ? Math.round(mass * 317.828 * 100) / 100 : undefined;
      const rEarth = !isNaN(radius) ? Math.round(radius * 11.209 * 100) / 100 : undefined;

      // Estimate Earth Similarity Index (ESI)
      let esi: number | undefined;
      if (rEarth !== undefined && !isNaN(temperature)) {
        const rTerm = 1 - Math.abs((rEarth - 1) / (rEarth + 1));
        const tTerm = 1 - Math.abs((temperature - 288) / (temperature + 288));
        esi = Math.max(0, Math.min(1, Math.sqrt(Math.max(0, rTerm * tTerm))));
      }

      let theoreticalFlags = 0;
      if (derivedTemp) {
        theoreticalFlags |= 1;
        if (esi !== undefined) theoreticalFlags |= 8;
      }

      const expandedPlanetName = expandGouldOrConstellationSuffix(planetName);
      const record: ExoplanetRecord = {
        id: expandedPlanetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: expandedPlanetName,
        letter,
        discoveryYear: !isNaN(discoveryyear) ? discoveryyear : undefined,
        discoveryMethod: discoverymethod,
        massMjup: !isNaN(mass) ? mass : undefined,
        massMearth: mEarth,
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
        confidence: hasNasaCatalog ? 'candidate' : 'confirmed',
        ...(theoreticalFlags > 0 ? { theoreticalFlags } : {}),
      };

      enrichWithIauExoWorld(planetName, expandedPlanetName, record, hostName);
    }
  }

  // 2. Ingest NASA Exoplanet Archive
  if (hasNasaCatalog) {
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

      const expandedPlanetName = expandGouldOrConstellationSuffix(planetName);
      const record: ExoplanetRecord = {
        id: expandedPlanetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: expandedPlanetName,
        letter,
        discoveryYear: !isNaN(discoveryyear) ? discoveryyear : undefined,
        discoveryMethod: discoverymethod,
        massMearth: !isNaN(massEarth) ? massEarth : undefined,
        massMjup: !isNaN(massEarth) ? massEarth / 317.828 : undefined,
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
        confidence: 'confirmed',
      };

      enrichWithIauExoWorld(planetName, expandedPlanetName, record, hostName);
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

      const expandedPlanetName = expandGouldOrConstellationSuffix(planetName);
      const record: ExoplanetRecord = {
        id: expandedPlanetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: expandedPlanetName,
        letter,
        discoveryYear: !isNaN(discYear) ? discYear : undefined,
        discoveryMethod: detectionType,
        massMjup: !isNaN(mass) ? mass : undefined,
        massMearth: !isNaN(mass) ? Math.round(mass * 317.828 * 100) / 100 : undefined,
        radiusRjup: !isNaN(radius) ? radius : undefined,
        radiusRearth: !isNaN(radius) ? Math.round(radius * 11.209 * 100) / 100 : undefined,
        orbit: {
          semiMajorAxis: !isNaN(semimajoraxis) ? semimajoraxis : 0,
          eccentricity: !isNaN(eccentricity) ? eccentricity : 0,
          inclination: !isNaN(inclination) ? inclination : 0,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 0,
          periodDays: !isNaN(period) ? period : 0,
        },
        confidence: hasNasaCatalog ? 'candidate' : 'confirmed',
      };

      enrichWithIauExoWorld(planetName, expandedPlanetName, record, hostName);
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
      hostName.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ];

    if (iauMatch) {
      keys.push(iauMatch.starName.toLowerCase());
      keys.push(iauMatch.starName.toLowerCase().replace(/\s+/g, ''));
      keys.push(iauMatch.starName.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }

    for (const key of keys) {
      let bucket = hostMap.get(key);
      if (!bucket) {
        bucket = [];
        hostMap.set(key, bucket);
      }
      if (!bucket.some((p) => p.id === planetRecord.id)) {
        bucket.push(planetRecord);
      }
    }
  }

  return hostMap;
}

/**
 * Cross-matches a stellar node against the indexed exoplanet catalog across all candidate
 * lookup keys (properName, expanded/abbreviated Bayer & Flamsteed, HD, HIP, and Gliese),
 * merging matched planets across multiple host aliases by letter.
 */
export function matchExoplanetsForStar(
  star: StarmapNode & { aliases?: string[] },
  hostMap: Map<string, ExoplanetRecord[]>,
): ExoplanetRecord[] {
  if (hostMap.size === 0) return [];

  const candidateKeys = new Set<string>(collectStarLookupKeys(star));

  if (star.aliases) {
    for (const alias of star.aliases) {
      candidateKeys.add(alias.toLowerCase());
      candidateKeys.add(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  }

  // Include spaced lowercase keys for backward compatibility with loadExoplanetCatalog
  if (star.properName) candidateKeys.add(star.properName.toLowerCase());
  if (star.name) candidateKeys.add(star.name.toLowerCase());
  if (star.hd) candidateKeys.add(`hd ${star.hd}`.toLowerCase());
  if (star.hip) candidateKeys.add(`hip ${star.hip}`.toLowerCase());
  if (star.gl) {
    for (const variant of expandGlieseVariants(star.gl)) {
      candidateKeys.add(variant.toLowerCase());
    }
  }

  const mergedByLetter = new Map<string, ExoplanetRecord>();

  for (const key of candidateKeys) {
    const matched = hostMap.get(key);
    if (!matched || matched.length === 0) continue;

    for (const planet of matched) {
      const dedupKey = planet.letter || planet.id;
      const existing = mergedByLetter.get(dedupKey);
      if (!existing) {
        mergedByLetter.set(dedupKey, planet);
      } else {
        mergedByLetter.set(dedupKey, mergeExoplanetRecords(existing, planet));
      }
    }
  }

  return Array.from(mergedByLetter.values());
}

const DISK_HOST_ALIASES: Record<string, string[]> = {
  'Sol': ['sol', 'sun', 'solar system'],
  'Epsilon Eridani': ['epsilon eridani', 'eps eri', 'ran', 'hd 22049', 'hd22049', 'hip 16537', 'hip16537', 'gl 144', 'gliese 144', 'gl144'],
  'Tau Ceti': ['tau ceti', 'tau cet', 'hd 10700', 'hd10700', 'hip 8102', 'hip8102', 'gl 71', 'gliese 71', 'gl71'],
  '82 G. Eridani': ['82 g. eridani', '82 g eridani', '82 eridani', 'hd 20794', 'hd20794', 'hip 15510', 'hip15510', 'gl 139', 'gliese 139', 'gl139', 'e eridani', 'e eri'],
  'Fomalhaut': ['fomalhaut', 'alpha piscis austrini', 'alp psa', 'hd 216956', 'hd216956', 'hip 113368', 'hip113368', 'gl 881', 'gliese 881', 'gl881'],
  'Vega': ['vega', 'alpha lyrae', 'alp lyr', 'hd 172167', 'hd172167', 'hip 91262', 'hip91262', 'gl 721', 'gliese 721', 'gl721'],
  'Beta Pictoris': ['beta pictoris', 'bet pic', 'hd 39060', 'hd39060', 'hip 27321', 'hip27321', 'gl 219', 'gliese 219', 'gl219'],
  'HR 8799': ['hr 8799', 'hr8799', 'hd 218396', 'hd218396', 'hip 114189', 'hip114189'],
  'Proxima Centauri': ['proxima centauri', 'proxima', 'alpha centauri c', 'hip 70890', 'hip70890', 'gl 551', 'gliese 551', 'gl551', 'v645 centauri'],
  'Sirius': ['sirius', 'sirius a', 'alpha canis majoris', 'alp cma', 'hd 48915', 'hd48915', 'hip 32349', 'hip32349', 'gl 244', 'gliese 244', 'gl244'],
  'Procyon': ['procyon', 'procyon a', 'alpha canis minoris', 'alp cmi', 'hd 61421', 'hd61421', 'hip 37279', 'hip37279', 'gl 280', 'gliese 280', 'gl280'],
  'Pollux': ['pollux', 'beta geminorum', 'bet gem', 'hd 62509', 'hd62509', 'hip 37826', 'hip37826', 'gl 286', 'gliese 286', 'gl286'],
};

let diskLookupMapCache: Map<string, CircumstellarDiskRecord[]> | null = null;

function getDiskLookupMap(): Map<string, CircumstellarDiskRecord[]> {
  if (diskLookupMapCache) return diskLookupMapCache;
  diskLookupMapCache = new Map();
  for (const [starName, disks] of Object.entries(CIRCUMSTELLAR_DISKS_CATALOG)) {
    const rawKeys: string[] = [starName, ...(DISK_HOST_ALIASES[starName] ?? [])];
    for (const raw of rawKeys) {
      const lower = raw.toLowerCase();
      const stripped = lower.replace(/[^a-z0-9]/g, '');
      diskLookupMapCache.set(lower, disks as CircumstellarDiskRecord[]);
      diskLookupMapCache.set(stripped, disks as CircumstellarDiskRecord[]);
    }
  }
  return diskLookupMapCache;
}

/**
 * Cross-matches a star against the authoritative circumstellar disks and belts catalog.
 */
export function matchCircumstellarDisksForStar(
  star: StarmapNode & { aliases?: string[] },
): CircumstellarDiskRecord[] {
  const map = getDiskLookupMap();
  const candidateKeys = new Set<string>(collectStarLookupKeys(star));

  if (star.aliases) {
    for (const alias of star.aliases) {
      candidateKeys.add(alias.toLowerCase());
      candidateKeys.add(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  }
  if (star.properName) {
    candidateKeys.add(star.properName.toLowerCase());
    candidateKeys.add(star.properName.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  if (star.name) {
    candidateKeys.add(star.name.toLowerCase());
    candidateKeys.add(star.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  if (star.hd) {
    candidateKeys.add(`hd ${star.hd}`.toLowerCase());
    candidateKeys.add(`hd${star.hd}`.toLowerCase());
  }
  if (star.hip) {
    candidateKeys.add(`hip ${star.hip}`.toLowerCase());
    candidateKeys.add(`hip${star.hip}`.toLowerCase());
  }
  if (star.gl) {
    for (const variant of expandGlieseVariants(star.gl)) {
      candidateKeys.add(variant.toLowerCase());
      candidateKeys.add(variant.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  }

  for (const key of candidateKeys) {
    const matched = map.get(key);
    if (matched && matched.length > 0) {
      return matched;
    }
  }
  return [];
}

/**
 * Evaluates whether an exoplanetary system contains a plausible habitable zone candidate.
 */
export function checkHabitableCandidate(planets: ExoplanetRecord[], starLum?: number): boolean {
  return planets.some((p) =>
    isPlanetHabitableCandidate(
      {
        equilibriumTempK: p.equilibriumTempK,
        esi: p.esi,
        semiMajorAxis: p.orbit?.semiMajorAxis,
        isHabitableCandidate: p.isHabitableCandidate,
      },
      starLum,
    ),
  );
}

/**
 * Classifies an exoplanet into a census category based on physical metrics:
 * - Terrestrial: Rp <= 1.75 R_earth or Mp <= 10 M_earth
 * - Ice Giant: 1.75 R_earth < Rp <= 6.0 R_earth or 10 M_earth < Mp <= 50 M_earth
 * - Gas Giant: Rp > 6.0 R_earth or Mp > 50 M_earth
 */
export function classifyExoplanet(planet: ExoplanetRecord): 'terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant' {
  return planet.composition ?? classifyPlanetPhysical(planet);
}

/**
 * Enriches an array of ExoplanetRecords in-place with precalculated `composition`
 * and `isHabitableCandidate` flags, surface gravity, and environmental hazard masks.
 */
export function enrichPlanetsWithPrecalculatedFields(
  planets: ExoplanetRecord[],
  starLum?: number,
): ExoplanetRecord[] {
  return planets.map((p) => {
    const composition = p.composition ?? classifyPlanetPhysical(p);
    const isHabitableCandidate =
      p.isHabitableCandidate ??
      isPlanetHabitableCandidate(
        {
          equilibriumTempK: p.equilibriumTempK,
          esi: p.esi,
          semiMajorAxis: p.orbit?.semiMajorAxis,
        },
        starLum,
      );
    const surfaceGravityG =
      p.surfaceGravityG ?? computePlanetSurfaceGravityG(p);
    const hazardMask =
      p.hazardMask ??
      computePlanetHazardMask({
        equilibriumTempK: p.equilibriumTempK,
        surfaceGravityG,
        periodDays: p.orbit?.periodDays,
        semiMajorAxisAu: p.orbit?.semiMajorAxis,
        eccentricity: p.orbit?.eccentricity,
      });

    return {
      ...p,
      composition,
      isHabitableCandidate,
      ...(surfaceGravityG !== undefined ? { surfaceGravityG } : {}),
      ...(hazardMask > 0 ? { hazardMask } : {}),
    };
  });
}

/**
 * Builds the authoritative `SystemManifest` for the Solar System (`sol`) from `FULL_SOLAR_SYSTEM_BODIES`,
 * converting all catalogued Solar System planets into `ExoplanetRecord` entries with precalculated
 * physical metrics, equilibrium temperatures, compositions, and habitable-zone flags.
 */
export function buildSolSystemManifest(
  solarBodies: readonly SolarSystemBodyRecord[] = FULL_SOLAR_SYSTEM_BODIES as unknown as SolarSystemBodyRecord[],
): SystemManifest {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;
  const hostTempK = 5778;
  const hostRadiusAu = 1.0 * 0.00465047;

  const solPlanets: ExoplanetRecord[] = solarBodies
    .filter((b) => b.classification === 'Planet')
    .map((b) => {
      const massMearth =
        b.massKg !== undefined ? round2(b.massKg / 5.97237e24) : undefined;
      const massMjup =
        b.massKg !== undefined ? round4(b.massKg / 1.8982e27) : undefined;
      const radiusRearth = round2(b.meanRadiusKm / 6371.0);
      const radiusRjup = round4(b.meanRadiusKm / 69911.0);
      const a = b.orbit?.semiMajorAxis;
      const albedo = b.albedo ?? 0.3;
      const equilibriumTempK =
        a && a > 0
          ? round2(
              hostTempK *
                Math.pow(Math.max(0, 1 - Math.min(0.99, albedo)), 0.25) *
                Math.sqrt(hostRadiusAu / (2 * a)),
            )
          : undefined;
      const composition = classifyPlanetPhysical({
        massMearth,
        radiusRearth,
        classification: b.tags?.join(' '),
      });
      const isHabitableCandidate = isPlanetHabitableCandidate(
        {
          equilibriumTempK,
          semiMajorAxis: a,
          tags: b.tags,
        },
        1.0,
      );
      const surfaceGravityG = computePlanetSurfaceGravityG({
        massMearth,
        radiusRearth,
      });
      const hazardMask = computePlanetHazardMask({
        equilibriumTempK,
        surfaceGravityG,
        periodDays: b.orbit?.periodDays,
        semiMajorAxisAu: a,
        eccentricity: b.orbit?.eccentricity,
      });

      return {
        id: b.id,
        name: b.name,
        letter: '',
        massMearth,
        massMjup,
        radiusRearth,
        radiusRjup,
        equilibriumTempK,
        surfaceGravityG,
        ...(hazardMask > 0 ? { hazardMask } : {}),
        composition,
        isHabitableCandidate,
        orbit: b.orbit,
        confidence: 'confirmed',
      };
    });

  const planetCompositionCounts = computePlanetCompositionCounts(solPlanets);
  const hasHabitableCandidate = solPlanets.some((p) => Boolean(p.isHabitableCandidate));

  return {
    id: 'sol',
    name: 'Sol',
    properName: 'Sun',
    x: 0,
    y: 0,
    z: 0,
    dist: 0,
    velocity: { vx: 0, vy: 0, vz: 0, speed: 0 },
    sectorId: 'sector_+000_+000_+000',
    stars: [
      {
        id: 'sol-A',
        name: 'Sol',
        componentDesignation: 'A',
        spectralType: 'G2V',
        mag: -26.74,
        absmag: 4.83,
        luminosityLsun: 1.0,
        massMsun: 1.0,
        radiusRsun: 1.0,
        effectiveTempK: 5778,
      },
    ],
    planets: solPlanets,
    planetCompositionCounts,
    hasHabitableCandidate,
    tags: [
      'HomeSystem',
      'SolarNeighborhood10pc',
      'NakedEye',
      'ExoplanetHost',
      'HabitableCandidate',
      'HabitableHost',
    ],
    disks: CIRCUMSTELLAR_DISKS_CATALOG['Sol'],
  };
}

/**
 * Computes the census categories of present exoplanets for a planetary system.
 */
export function getPlanetCensus(planets: ExoplanetRecord[]): ('terrestrial' | 'super-earth' | 'gas-giant' | 'ice-giant')[] | undefined {
  if (planets.length === 0) return undefined;
  const present = (['terrestrial', 'super-earth', 'gas-giant', 'ice-giant'] as const).filter((cat) =>
    planets.some((p) => classifyExoplanet(p) === cat)
  );
  return present.length > 0 ? present : undefined;
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

  const effectivePlanets =
    star.name === 'Sol' && planets.length === 0
      ? buildSolSystemManifest().planets
      : enrichPlanetsWithPrecalculatedFields(planets, star.lum);

  const planetCount = effectivePlanets.length;
  const hasHabitable = checkHabitableCandidate(effectivePlanets, star.lum);
  const planetCensus = getPlanetCensus(effectivePlanets);
  const planetCompositionCounts = computePlanetCompositionCounts(effectivePlanets);

  if (planetCount > 0) {
    tags.push('ExoplanetHost');
  }
  if (hasHabitable) {
    tags.push('HabitableCandidate');
  }

  const hazardMask = computeSystemHazardMask({
    spect: star.spect,
    lum: star.lum,
    tags,
  });

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
    sectorId,
    tags: tags.length > 0 ? tags : undefined,
    ...(hazardMask > 0 ? { hazardMask } : {}),
  };
}

/**
 * Loads all deep-sky galactic structures across Layers 3 & 4.
 */
export function loadAllGalacticStructures(): GalacticStructureRecord[] {
  const structures: GalacticStructureRecord[] = FULL_GALACTIC_STRUCTURES.map((seed) => ({
    ...seed,
    type: seed.type as GalacticStructureRecord['type'],
    confidence: 'confirmed' as const,
  }));

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
        const hasPlx = plx > 0;
        const dist = hasPlx ? 1000 / plx : 500;
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
          confidence: hasPlx ? 'confirmed' : 'theoretical',
          ...(hasPlx ? {} : { theoreticalFlags: 1 }),
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
          confidence: 'confirmed',
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
          confidence: 'theoretical',
          theoreticalFlags: 1,
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
          confidence: 'theoretical',
          theoreticalFlags: 1,
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
          confidence: 'theoretical',
          theoreticalFlags: 1,
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

          const messierNum = messier ? parseInt(messier, 10) : NaN;
          const messierDesignations =
            messier && !isNaN(messierNum)
              ? [`M${messierNum}`, `M ${messierNum}`, `Messier ${messierNum}`, `M ${messier}`]
              : messier
                ? [`M ${messier}`]
                : [];

          structures.push({
            id: `ngc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name: commonNames ? `${name} (${commonNames})` : name,
            type: structType,
            x,
            y,
            z,
            dist: distPc,
            designations: [name, ...messierDesignations, ...(commonNames ? [commonNames] : [])],
            description: `Deep sky landmark cataloged in OpenNGC.`,
            confidence: 'theoretical',
            theoreticalFlags: 1,
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
  // 1. Primary & Curated Solar System bodies (Horizons seed + FULL_SOLAR_SYSTEM_BODIES)
  const primaryBodies: SolarSystemBodyRecord[] = FULL_SOLAR_SYSTEM_BODIES.map((b) => ({
    ...(b as SolarSystemBodyRecord),
    confidence: 'confirmed' as const,
  }));

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
        const uCode = line.length >= 106 ? parseInt(line.substring(105, 106).trim(), 10) : NaN;
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
            confidence: !isNaN(uCode) && uCode >= 3 ? 'candidate' : 'confirmed',
            theoreticalFlags: 1,
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
        const uCode = line.length >= 106 ? parseInt(line.substring(105, 106).trim(), 10) : NaN;
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
            confidence: !isNaN(uCode) && uCode >= 3 ? 'candidate' : 'confirmed',
            theoreticalFlags: 1,
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
        const name = (line.length > 102 ? line.substring(102, 158).trim() : '') || desig;

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
            confidence: 'confirmed',
            theoreticalFlags: 1,
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
  summariesDir?: string;
  detailsDir?: string;
  searchDir?: string;
  compactFormat?: boolean;
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
        const matchedDisks = matchCircumstellarDisksForStar(node);
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

          if (options?.systemsDir && (matchedPlanets.length > 0 || matchedDisks.length > 0 || node.name === 'Sol')) {
            const sectorId = summary.sectorId;
            let manifestBucket = sectorManifestsMap.get(sectorId);
            if (!manifestBucket) {
              manifestBucket = [];
              sectorManifestsMap.set(sectorId, manifestBucket);
            }

            if (node.name === 'Sol') {
              const solManifest = buildSolSystemManifest();
              manifestBucket.push({
                ...solManifest,
                id: String(node.id),
                stars: solManifest.stars.map((s) => ({
                  ...s,
                  id: `${node.id}-A`,
                  name: node.name,
                })),
              });
            } else {
              const enriched = enrichPlanetsWithPrecalculatedFields(matchedPlanets);
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
                planets: enriched,
                ...(matchedDisks.length > 0 ? { disks: matchedDisks } : {}),
                planetCompositionCounts: summary.planetCompositionCounts,
                hasHabitableCandidate: summary.hasHabitableCandidate,
                tags: summary.tags,
              });
            }
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
          const matchedPlanets = enrichPlanetsWithPrecalculatedFields(
            matchExoplanetsForStar(
              { id: 990000, name: recons.name, ra: recons.ra, dec: recons.dec, dist: recons.dist, mag: recons.mag, absmag: recons.absmag, x: rx, y: ry, z: rz },
              exoplanetHostMap,
            ),
          );
          const hasHabitableCandidate = matchedPlanets.some((p) => Boolean(p.isHabitableCandidate));
          const rTags = [
            'SolarNeighborhood10pc',
            'RECONSGroundTruth',
            ...(matchedPlanets.length > 0 ? ['ExoplanetHost'] : []),
            ...(hasHabitableCandidate ? ['HabitableCandidate'] : []),
          ];

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
            planetCensus: getPlanetCensus(matchedPlanets),
            planetCompositionCounts: computePlanetCompositionCounts(matchedPlanets),
            hasHabitableCandidate,
            sectorId: rSectorId,
            tags: rTags,
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
    const cataloguedSummaries: SystemSummaryNode[] = [];
    const allSystemManifests: SystemManifest[] = [];
    const starAliasesById = new Map<string, string[]>();
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

    const solManifest = buildSolSystemManifest();

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
      planetCount: solManifest.planets.length,
      planetCensus: ['terrestrial', 'gas-giant', 'ice-giant'],
      planetCompositionCounts: solManifest.planetCompositionCounts,
      hasHabitableCandidate: true,
      sectorId: 'sector_+000_+000_+000',
      tags: solManifest.tags,
      velocity: solNode.velocity,
    };

    local10pcSystems.push(solSummary);
    referenceBrightSystems.push(solSummary);
    cataloguedSummaries.push(solSummary);
    starAliasesById.set('sol', ['Sol', 'Sun', 'Solar System']);
    let solBucket = sectorMap.get('sector_+000_+000_+000');
    if (!solBucket) {
      solBucket = [];
      sectorMap.set('sector_+000_+000_+000', solBucket);
    }
    solBucket.push(solSummary);

    if (options?.systemsDir || options?.detailsDir || options?.searchDir) {
      let solManifestBucket = sectorManifestsMap.get('sector_+000_+000_+000');
      if (!solManifestBucket) {
        solManifestBucket = [];
        sectorManifestsMap.set('sector_+000_+000_+000', solManifestBucket);
      }
      solManifestBucket.push(solManifest);
      allSystemManifests.push(solManifest);
    }

    const writeStream = fs.createWriteStream(resolvedOutput, { encoding: 'utf-8' });
    writeStream.write('[');
    writeStream.write(JSON.stringify(solNode));
    totalStars++;
    totalKinematics++;

    const matchedHygIds = new Set<number>();

    function round3(n: number): number {
      return Math.round(n * 1000) / 1000;
    }
    function round2(n: number): number {
      return Math.round(n * 100) / 100;
    }

    function findOfficialStarName(hygMatch: HygCrossMatch | undefined) {
      if (!hygMatch) return undefined;
      if (hygMatch.hip && OFFICIAL_IAU_STAR_NAMES[`hip-${hygMatch.hip}`]) {
        return OFFICIAL_IAU_STAR_NAMES[`hip-${hygMatch.hip}`];
      }
      if (hygMatch.gl) {
        if (OFFICIAL_IAU_STAR_NAMES[`gl-${hygMatch.gl}`]) {
          return OFFICIAL_IAU_STAR_NAMES[`gl-${hygMatch.gl}`];
        }
        const glKey = `gl-${hygMatch.gl.toLowerCase().replace(/^(?:gl|gj|gliese)\s*/i, '').replace(/\s+/g, '')}`;
        if (OFFICIAL_IAU_STAR_NAMES[glKey]) {
          return OFFICIAL_IAU_STAR_NAMES[glKey];
        }
      }
      return undefined;
    }

    function ingestStarEntry(
      sysId: string,
      sourceId: string,
      ra: number,
      dec: number,
      dist: number,
      pmra: number,
      pmdec: number,
      rv: number | null,
      gmag: number,
      bpmag: number,
      rpmag: number,
      hygMatch: HygCrossMatch | undefined,
      ePlx?: number,
    ) {
      // Coordinate transform
      const [x, y, z] = equatorialToCartesian(ra / 15, dec, dist);

      // Kinematics in km/s
      const velocity = computeGaiaKinematics(ra, dec, dist, isNaN(pmra) ? 0 : pmra, isNaN(pmdec) ? 0 : pmdec, rv);
      totalKinematics++;

      const iauCatalogName =
        hygMatch?.hip && iauProperStars.has(hygMatch.hip)
          ? iauProperStars.get(hygMatch.hip)
          : undefined;
      const officialMatch = findOfficialStarName(hygMatch);

      const properName = resolveStarProperName({
        hygProperName: hygMatch?.proper,
        iauProperName: iauCatalogName,
        officialProperName: officialMatch?.properName,
      });

      const extraAliases: string[] = [];
      if (officialMatch) {
        if (officialMatch.properName) extraAliases.push(officialMatch.properName);
        if (officialMatch.aliases) extraAliases.push(...officialMatch.aliases);
      }

      const name = resolveStarDisplayName({
        properName,
        bayer: hygMatch?.bayer,
        con: hygMatch?.con,
        flam: hygMatch?.flam,
        gl: hygMatch?.gl,
        hip: hygMatch?.hip,
        hd: hygMatch?.hd,
        sourceId,
      });

      const mag = !isNaN(gmag) ? gmag : hygMatch?.mag ?? 15.0;
      const ci = !isNaN(bpmag) && !isNaN(rpmag) ? bpmag - rpmag : hygMatch?.ci ?? null;
      const absmag = mag - 5 * (Math.log10(dist) - 1);

      let theoreticalFlags = 0;

      // Estimate spectral type from BP-RP color or HYG match
      let spect = hygMatch?.spect;
      if (!spect && ci !== null) {
        theoreticalFlags |= 1;
        if (ci < 0.0) spect = 'O/B';
        else if (ci < 0.3) spect = 'A';
        else if (ci < 0.6) spect = 'F';
        else if (ci < 0.9) spect = 'G';
        else if (ci < 1.4) spect = 'K';
        else spect = 'M';
      }

      if (rv === null || isNaN(rv)) {
        theoreticalFlags |= 2;
      }

      const plxMas = dist > 0 ? 1000.0 / dist : 0;
      const isCandidateParallax =
        ePlx !== undefined && !isNaN(ePlx) && plxMas > 0 && ePlx / plxMas >= 0.1;

      const lookupInput = {
        id: totalStars,
        name,
        properName,
        hip: hygMatch?.hip,
        hd: hygMatch?.hd,
        hr: hygMatch?.hr,
        gl: hygMatch?.gl,
        bayer: hygMatch?.bayer,
        flam: hygMatch?.flam,
        con: hygMatch?.con,
        bf: hygMatch?.bf,
        aliases: extraAliases.length > 0 ? extraAliases : undefined,
        ra: ra / 15,
        dec,
        dist,
        mag,
        absmag,
        x,
        y,
        z,
      };

      // Cross-match exoplanets across all star lookup keys
      const matchedPlanets = enrichPlanetsWithPrecalculatedFields(
        matchExoplanetsForStar(lookupInput, exoplanetHostMap),
      );
      const matchedDisks = matchCircumstellarDisksForStar(lookupInput);
      if (matchedPlanets.length > 0) {
        totalExoplanets += matchedPlanets.length;
      }

      const hasHabitableCandidate = matchedPlanets.some((p) => Boolean(p.isHabitableCandidate));
      const planetCompositionCounts = computePlanetCompositionCounts(matchedPlanets);

      const sectorId = formatSectorId(x, y, z);
      const tags: string[] = [];
      if (dist <= 10) tags.push('SolarNeighborhood10pc');
      if (mag <= 6.5) tags.push('NakedEye');
      if (matchedPlanets.length > 0) tags.push('ExoplanetHost');
      if (hasHabitableCandidate) tags.push('HabitableCandidate');

      const hazardMask = computeSystemHazardMask({
        spect,
        lum: hygMatch?.lum !== undefined && !Number.isNaN(hygMatch.lum) ? hygMatch.lum : undefined,
        tags,
      });

      const summary: SystemSummaryNode = {
        id: sysId,
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
        planetCensus: getPlanetCensus(matchedPlanets),
        planetCompositionCounts,
        hasHabitableCandidate,
        sectorId,
        confidence: isCandidateParallax ? 'candidate' : 'confirmed',
      };
      if (theoreticalFlags > 0) summary.theoreticalFlags = theoreticalFlags;
      if (properName) summary.properName = properName;
      if (ci !== null && ci !== undefined) summary.ci = round2(ci);
      if (tags.length > 0) summary.tags = tags;
      if (hazardMask > 0) summary.hazardMask = hazardMask;
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

      const isCatalogued =
        Boolean(hygMatch) || dist <= 10 || mag <= 6.5 || matchedPlanets.length > 0;
      if (isCatalogued) {
        cataloguedSummaries.push(summary);
        starAliasesById.set(sysId, collectStarLookupKeys(lookupInput));
      }

      // Add to spatial sector partition bucket
      let bucket = sectorMap.get(sectorId);
      if (!bucket) {
        bucket = [];
        sectorMap.set(sectorId, bucket);
      }
      bucket.push(summary);

      // Add to detailed system manifest if exoplanets, disks, or bright
      if (
        (options?.systemsDir || options?.detailsDir || options?.searchDir) &&
        (matchedPlanets.length > 0 || matchedDisks.length > 0 || mag <= 4.0)
      ) {
        let manifestBucket = sectorManifestsMap.get(sectorId);
        if (!manifestBucket) {
          manifestBucket = [];
          sectorManifestsMap.set(sectorId, manifestBucket);
        }

        const sysManifest: SystemManifest = {
          id: sysId,
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
          ...(matchedDisks.length > 0 ? { disks: matchedDisks } : {}),
          planetCompositionCounts,
          hasHabitableCandidate,
          ...(tags.length > 0 ? { tags } : {}),
          ...(hazardMask > 0 ? { hazardMask } : {}),
        };
        manifestBucket.push(sysManifest);
        allSystemManifests.push(sysManifest);
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
      if (hygMatch?.hr) starRecord.hr = hygMatch.hr;
      if (hygMatch?.gl) starRecord.gl = hygMatch.gl;
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
    }

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
      const ePlx = parseFloat(line.substring(78, 85).trim());
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

      const hygMatch = findBestHygMatch(
        ra,
        dec,
        dist,
        !isNaN(gmag) ? gmag : 15.0,
        hygCrossMatch.byCoordCandidates,
        matchedHygIds,
      );

      ingestStarEntry(
        `gaia-${sourceId}`,
        sourceId,
        ra,
        dec,
        dist,
        pmra,
        pmdec,
        rv,
        gmag,
        bpmag,
        rpmag,
        hygMatch,
        ePlx,
      );
    });

    rl.on('close', () => {
      // Supplement bright/nearby HYG stars missing from Gaia DR3 GCNS (e.g. CCD-saturated first-magnitude stars)
      for (const hyg of hygCrossMatch.allItems) {
        if (hyg.id === 0 || matchedHygIds.has(hyg.id)) continue;
        const officialMatch = findOfficialStarName(hyg);
        if (!hyg.dist || hyg.dist <= 0 || (hyg.dist > maxPartitionDist && !officialMatch)) continue;
        if (hyg.ra === undefined || hyg.dec === undefined) continue;

        const isNotable =
          Boolean(officialMatch) ||
          (hyg.mag !== undefined && hyg.mag <= 6.5) ||
          hyg.dist <= 10 ||
          Boolean(hyg.proper) ||
          Boolean(hyg.bayer) ||
          Boolean(hyg.flam);
        if (!isNotable) continue;

        matchedHygIds.add(hyg.id);
        const sysId = hyg.hip ? `hip-${hyg.hip}` : `hyg-${hyg.id}`;
        const sourceId = hyg.hip ? String(hyg.hip) : String(hyg.id);
        ingestStarEntry(
          sysId,
          sourceId,
          hyg.ra * 15,
          hyg.dec,
          hyg.dist,
          hyg.pmra ?? 0,
          hyg.pmdec ?? 0,
          hyg.rv ?? 0,
          hyg.mag ?? 6.5,
          NaN,
          NaN,
          hyg,
        );
      }

      // Supplement RECONS / curated brown dwarfs, red dwarfs & distant landmark exoplanet hosts
      for (const recons of RECONS_10PC_SUPPLEMENT) {
        if (
          cataloguedSummaries.some(
            (s) => s.id === recons.id || s.name.toLowerCase() === recons.name.toLowerCase(),
          )
        ) {
          continue;
        }

        const [rx, ry, rz] = equatorialToCartesian(recons.ra, recons.dec, recons.dist);
        const rSectorId = formatSectorId(rx, ry, rz);
        const reconsLookup = {
          id: totalStars,
          name: recons.name,
          properName: recons.properName,
          aliases: recons.aliases,
          ra: recons.ra,
          dec: recons.dec,
          dist: recons.dist,
          mag: recons.mag,
          absmag: recons.absmag,
          x: rx,
          y: ry,
          z: rz,
        };

        const matchedPlanets = enrichPlanetsWithPrecalculatedFields(
          matchExoplanetsForStar(reconsLookup, exoplanetHostMap),
        );
        const matchedDisks = matchCircumstellarDisksForStar(reconsLookup);
        if (matchedPlanets.length > 0) {
          totalExoplanets += matchedPlanets.length;
        }

        const hasHabitableCandidate = matchedPlanets.some((p) => Boolean(p.isHabitableCandidate));
        const planetCompositionCounts = computePlanetCompositionCounts(matchedPlanets);

        const rTags: string[] = [];
        if (recons.dist <= 10) rTags.push('SolarNeighborhood10pc', 'RECONSGroundTruth');
        if (matchedPlanets.length > 0) rTags.push('ExoplanetHost');
        if (hasHabitableCandidate) rTags.push('HabitableCandidate');

        const rSummary: SystemSummaryNode = {
          id: recons.id,
          name: recons.name,
          properName: recons.properName,
          x: round3(rx),
          y: round3(ry),
          z: round3(rz),
          dist: round3(recons.dist),
          mag: round2(recons.mag),
          absmag: round2(recons.absmag),
          spect: recons.spect,
          starCount: recons.starCount,
          planetCount: matchedPlanets.length,
          planetCensus: getPlanetCensus(matchedPlanets),
          planetCompositionCounts,
          hasHabitableCandidate,
          sectorId: rSectorId,
          confidence: 'confirmed',
          ...(rTags.length > 0 ? { tags: rTags } : {}),
        };

        cataloguedSummaries.push(rSummary);
        starAliasesById.set(recons.id, collectStarLookupKeys(reconsLookup));

        if (recons.dist <= 10) {
          local10pcSystems.push(rSummary);
          local10pcCount++;
        }
        if (matchedPlanets.length > 0) {
          exoplanetHostSummaries.push(rSummary);
        }

        if (recons.dist <= maxPartitionDist) {
          let bucket = sectorMap.get(rSectorId);
          if (!bucket) {
            bucket = [];
            sectorMap.set(rSectorId, bucket);
          }
          bucket.push(rSummary);
        }

        if (options?.systemsDir || options?.detailsDir || options?.searchDir) {
          let manifestBucket = sectorManifestsMap.get(rSectorId);
          if (!manifestBucket) {
            manifestBucket = [];
            sectorManifestsMap.set(rSectorId, manifestBucket);
          }
          const sysManifest: SystemManifest = {
            id: recons.id,
            name: recons.name,
            properName: recons.properName,
            x: round3(rx),
            y: round3(ry),
            z: round3(rz),
            dist: round3(recons.dist),
            velocity: { vx: 0, vy: 0, vz: 0, speed: 0 },
            sectorId: rSectorId,
            stars: [
              {
                id: `${recons.id}-A`,
                name: recons.name,
                componentDesignation: 'A',
                spectralType: recons.spect,
                mag: round2(recons.mag),
                absmag: round2(recons.absmag),
              },
            ],
            planets: matchedPlanets,
            ...(matchedDisks.length > 0 ? { disks: matchedDisks } : {}),
            planetCompositionCounts,
            hasHabitableCandidate,
            ...(rTags.length > 0 ? { tags: rTags } : {}),
          };
          manifestBucket.push(sysManifest);
          allSystemManifests.push(sysManifest);
        }

        const starRecord: Record<string, unknown> = {
          id: totalStars,
          name: recons.name,
          properName: recons.properName,
          // StarmapNode.ra defines Right Ascension in decimal hours [0, 24); recons.ra is in hours matching stars.json
          ra: round3(recons.ra),
          dec: round3(recons.dec),
          dist: round3(recons.dist),
          mag: round2(recons.mag),
          absmag: round2(recons.absmag),
          spect: recons.spect,
          x: round3(rx),
          y: round3(ry),
          z: round3(rz),
        };
        writeStream.write(',');
        writeStream.write(JSON.stringify(starRecord));
        totalStars++;
      }

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

          const payload = options.compactFormat ? encodeSectorPartition(manifest) : manifest;
          fs.writeFileSync(path.join(resolvedPartitions, `${sectorId}.json`), JSON.stringify(payload), 'utf-8');
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
      let allStructures: GalacticStructureRecord[] = [];
      if (options?.overlaysDir || options?.detailsDir || options?.searchDir) {
        allStructures = loadAllGalacticStructures();
        galacticCount = allStructures.length;
      }

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

        // Dataset Layering Registry & Seed Fictional Canon Layers (FS-001 & FS-002 — DEC-007)
        const layersDir = path.join(resolvedOverlays, 'layers');
        if (!fs.existsSync(layersDir)) fs.mkdirSync(layersDir, { recursive: true });
        fs.writeFileSync(
          path.join(layersDir, 'index.json'),
          JSON.stringify(buildLayerIndexManifest(SEED_FICTIONAL_CANON_LAYERS)),
          'utf-8',
        );
        for (const layer of SEED_FICTIONAL_CANON_LAYERS) {
          fs.writeFileSync(
            path.join(layersDir, `${layer.layerId}.json`),
            JSON.stringify(encodeLayerManifest(layer)),
            'utf-8',
          );
        }
      }

      // 5. Ingest and write Layer 4 Solar System natural bodies & orbits
      let solarBodiesCount = 0;
      let allSolarBodies: SolarSystemBodyRecord[] = [];
      if (options?.solDir || options?.detailsDir || options?.searchDir) {
        const { primaryBodies, phaAsteroids, distantAsteroids, comets } = loadAllSolarSystemBodies();
        allSolarBodies = [...primaryBodies, ...phaAsteroids, ...distantAsteroids, ...comets];
        solarBodiesCount = allSolarBodies.length;

        if (options?.solDir) {
          const resolvedSol = path.resolve(options.solDir);
          if (!fs.existsSync(resolvedSol)) fs.mkdirSync(resolvedSol, { recursive: true });

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
      }

      // 6. Write 36-bucket O(1) dictionary shards for summaries/ and details/ (DEC-006)
      if (options?.summariesDir || options?.detailsDir) {
        const { summariesByBucket, detailsByBucket } = buildShardedSummariesAndDetails({
          systems: cataloguedSummaries,
          manifests: allSystemManifests,
          structures: allStructures,
          solarBodies: allSolarBodies,
        });

        if (options.summariesDir) {
          const resolvedSummaries = path.resolve(options.summariesDir);
          if (!fs.existsSync(resolvedSummaries)) fs.mkdirSync(resolvedSummaries, { recursive: true });
          for (const [bucket, env] of summariesByBucket.entries()) {
            fs.writeFileSync(path.join(resolvedSummaries, `${bucket}.json`), JSON.stringify(env), 'utf-8');
          }
        }

        if (options.detailsDir) {
          const resolvedDetails = path.resolve(options.detailsDir);
          if (!fs.existsSync(resolvedDetails)) fs.mkdirSync(resolvedDetails, { recursive: true });
          for (const [bucket, env] of detailsByBucket.entries()) {
            fs.writeFileSync(path.join(resolvedDetails, `${bucket}.json`), JSON.stringify(env), 'utf-8');
          }
        }
      }

      // 7. Write Dual-Tier & Category-Sharded Search Indices (DEC-004, DEC-006 & DEC-007)
      if (options?.searchDir) {
        const resolvedSearch = path.resolve(options.searchDir);
        if (!fs.existsSync(resolvedSearch)) fs.mkdirSync(resolvedSearch, { recursive: true });

        const coordsById = new Map<string, [number, number, number]>();
        for (const sys of cataloguedSummaries) {
          coordsById.set(sys.id, [sys.x, sys.y, sys.z]);
        }
        for (const man of allSystemManifests) {
          for (const pl of man.planets) {
            coordsById.set(pl.id, [man.x, man.y, man.z]);
          }
        }
        for (const st of allStructures) {
          coordsById.set(st.id, [st.x, st.y, st.z]);
        }
        const fictionEntries = buildSearchEntriesFromLayers(SEED_FICTIONAL_CANON_LAYERS, coordsById);

        const indices = buildSearchIndices({
          systems: cataloguedSummaries,
          manifests: allSystemManifests,
          structures: allStructures,
          solarBodies: allSolarBodies,
          starAliasesById,
          fictionEntries,
        });

        fs.writeFileSync(path.join(resolvedSearch, 'core.json'), JSON.stringify(indices.core), 'utf-8');
        fs.writeFileSync(path.join(resolvedSearch, 'full.json'), JSON.stringify(indices.full), 'utf-8');
        fs.writeFileSync(path.join(resolvedSearch, 'stars.json'), JSON.stringify(indices.stars), 'utf-8');
        fs.writeFileSync(path.join(resolvedSearch, 'planets.json'), JSON.stringify(indices.planets), 'utf-8');
        fs.writeFileSync(path.join(resolvedSearch, 'structures.json'), JSON.stringify(indices.structures), 'utf-8');
        fs.writeFileSync(path.join(resolvedSearch, 'minor-bodies.json'), JSON.stringify(indices.minorBodies), 'utf-8');
        fs.writeFileSync(path.join(resolvedSearch, 'fiction.json'), JSON.stringify(indices.fiction), 'utf-8');
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
  const summariesDir = process.env.SUMMARIES_DIR || 'public/data/summaries';
  const detailsDir = process.env.DETAILS_DIR || 'public/data/details';
  const searchDir = process.env.SEARCH_DIR || 'public/data/search';

  console.log(`Starting Data Pipeline: Ingesting Gaia DR3 GCNS from ${gcnsGz}...`);
  const startTime = Date.now();

  buildStarDataPipeline(gcnsGz, outputJson, {
    catalogsDir,
    partitionsDir,
    systemsDir,
    overlaysDir,
    solDir,
    summariesDir,
    detailsDir,
    searchDir,
    maxPartitionDistancePc: 100,
    compactFormat: true,
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
