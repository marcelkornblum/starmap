import fs from 'node:fs';
import path from 'node:path';
import type { KinematicVector, StarmapNode } from '../../src/types/astro';
import { equatorialToCartesian, parseKinematicVector } from '../../src/utils/astroMath';
import { parseCsvRowsSync } from './csvParser';
import { OFFICIAL_IAU_STAR_NAMES } from './seedCatalogs';
import type { HygCrossMatch } from './types';

const DEG2RAD = Math.PI / 180;
const K_CONSTANT = 4.74047; // km/s per (AU * mas/yr)

export function parseHygRow(row: Record<string, string>): StarmapNode | null {
  const id = parseInt(row.id, 10);
  if (isNaN(id)) return null;

  const [dist, ra, dec] = [parseFloat(row.dist), parseFloat(row.ra), parseFloat(row.dec)];
  if (isNaN(dist) || isNaN(ra) || isNaN(dec) || dist < 0) return null;

  const hip = row.hip?.trim() ? parseInt(row.hip, 10) : null;
  const hd = row.hd?.trim() ? parseInt(row.hd, 10) : null;
  let properName = row.proper?.trim() || undefined;

  if (!properName && hip && OFFICIAL_IAU_STAR_NAMES[`hip-${hip}`]) {
    properName = OFFICIAL_IAU_STAR_NAMES[`hip-${hip}`].properName;
  }

  let name = properName;
  if (!name) {
    if (row.bf?.trim()) name = row.bf.trim();
    else if (row.bayer?.trim() && row.con?.trim()) name = `${row.bayer.trim()} ${row.con.trim()}`;
    else if (row.gl?.trim()) name = row.gl.trim();
    else if (hip) name = `HIP ${hip}`;
    else if (hd) name = `HD ${hd}`;
    else if (row.hr?.trim()) name = `HR ${row.hr.trim()}`;
    else name = `HYG ${id}`;
  }

  const [x, y, z] = equatorialToCartesian(ra, dec, dist);
  const p = (k: string) => row[k] && !isNaN(parseFloat(row[k])) ? parseFloat(row[k]) : undefined;
  const pmra = p('pmra');
  const pmdec = p('pmdec');
  const rv = p('rv');
  const velocity = parseKinematicVector(p('vx'), p('vy'), p('vz'), pmra, pmdec, rv);

  return {
    id, name, properName, hip, hd,
    hr: row.hr?.trim() ? parseInt(row.hr, 10) : null,
    gl: row.gl?.trim() || null, bayer: row.bayer?.trim() || null,
    flam: row.flam?.trim() ? parseInt(row.flam, 10) : null, con: row.con?.trim() || null,
    ra, dec, dist,
    mag: p('mag') ?? 0, absmag: p('absmag') ?? 0,
    spect: row.spect?.trim() || undefined,
    ci: row.ci?.trim() && !isNaN(parseFloat(row.ci)) ? parseFloat(row.ci) : null,
    x, y, z, lum: p('lum'), velocity,
  };
}

export function computeGaiaKinematics(
  raDeg: number,
  decDeg: number,
  distPc: number,
  pmra: number,
  pmdec: number,
  rv?: number | null,
): KinematicVector {
  const [ra, dec] = [raDeg * DEG2RAD, decDeg * DEG2RAD];
  const radialVel = rv !== null && rv !== undefined && !isNaN(rv) ? rv : 0;
  const [vAlpha, vDelta] = [K_CONSTANT * (pmra / 1000) * distPc, K_CONSTANT * (pmdec / 1000) * distPc];
  const [cosRa, sinRa, cosDec, sinDec] = [Math.cos(ra), Math.sin(ra), Math.cos(dec), Math.sin(dec)];
  const vx = radialVel * cosDec * cosRa - vAlpha * sinRa - vDelta * sinDec * cosRa;
  const vy = radialVel * cosDec * sinRa + vAlpha * cosRa - vDelta * sinDec * sinRa;
  const vz = radialVel * sinDec + vDelta * cosDec;
  return {
    vx, vy, vz, speed: Math.sqrt(vx * vx + vy * vy + vz * vz),
    pmra, pmdec, radialVelocity: radialVel !== 0 ? radialVel : undefined,
  };
}

export function loadIauStarNames(csvPath: string): Map<number, string> {
  const hipMap = new Map<number, string>();
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) return hipMap;

  const content = fs.readFileSync(resolved, 'utf-8');
  const rows = parseCsvRowsSync(content);
  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i];
    const properName = parts[0]?.trim();
    const hipStr = parts[3]?.trim();
    if (properName && hipStr && !isNaN(parseInt(hipStr, 10))) {
      hipMap.set(parseInt(hipStr, 10), properName);
    }
  }
  return hipMap;
}

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
  const rows = parseCsvRowsSync(content);
  if (rows.length <= 1) return { byHip, byCoord, byCoordCandidates, allItems };

  const header = rows[0];
  const idx = (k: string) => header.indexOf(k);
  const [idIdx, hipIdx, hdIdx, hrIdx, glIdx, bfIdx, properIdx, bayerIdx, flamIdx, conIdx] = [
    idx('id'), idx('hip'), idx('hd'), idx('hr'), idx('gl'), idx('bf'), idx('proper'), idx('bayer'), idx('flam'), idx('con'),
  ];
  const [compIdx, compPrimaryIdx, baseIdx, spectIdx, ciIdx, lumIdx] = [
    idx('comp'), idx('comp_primary'), idx('base'), idx('spect'), idx('ci'), idx('lum'),
  ];
  const [raIdx, decIdx, distIdx, magIdx, absmagIdx, pmraIdx, pmdecIdx, rvIdx] = [
    idx('ra'), idx('dec'), idx('dist'), idx('mag'), idx('absmag'), idx('pmra'), idx('pmdec'), idx('rv'),
  ];

  function addCandidate(cellKey: string, item: HygCrossMatch) {
    let list = byCoordCandidates.get(cellKey);
    if (!list) {
      list = [];
      byCoordCandidates.set(cellKey, list);
    }
    if (!list.includes(item)) list.push(item);
  }

  for (let i = 1; i < rows.length; i++) {
    const parts = rows[i];
    const id = parseInt(parts[idIdx], 10);
    if (isNaN(id)) continue;

    const parseNum = (cIdx: number) => {
      const v = cIdx >= 0 && parts[cIdx] ? parseFloat(parts[cIdx]) : undefined;
      return v !== undefined && !isNaN(v) ? v : undefined;
    };
    const parseIntNum = (cIdx: number) => {
      const v = cIdx >= 0 && parts[cIdx] ? parseInt(parts[cIdx], 10) : undefined;
      return v !== undefined && !isNaN(v) ? v : undefined;
    };
    const parseStr = (cIdx: number) => (cIdx >= 0 ? parts[cIdx]?.trim() || undefined : undefined);

    const ra = parseNum(raIdx);
    const dec = parseNum(decIdx);
    const pmra = parseNum(pmraIdx) ?? 0;
    const pmdec = parseNum(pmdecIdx) ?? 0;

    let raDegJ2016: number | undefined;
    let decDegJ2016: number | undefined;
    if (ra !== undefined && dec !== undefined && !isNaN(ra) && !isNaN(dec)) {
      const cosDec = Math.max(0.05, Math.cos((dec * Math.PI) / 180));
      raDegJ2016 = ((ra * 15 + (pmra * 16) / (3600000 * cosDec)) % 360 + 360) % 360;
      decDegJ2016 = Math.max(-90, Math.min(90, dec + (pmdec * 16) / 3600000));
    }

    const hip = parseIntNum(hipIdx) ?? null;
    const item: HygCrossMatch = {
      id, hip, hd: parseIntNum(hdIdx) ?? null, hr: parseIntNum(hrIdx) ?? null,
      gl: parseStr(glIdx), bf: parseStr(bfIdx), proper: parseStr(properIdx), bayer: parseStr(bayerIdx),
      flam: parseIntNum(flamIdx), con: parseStr(conIdx), comp: parseIntNum(compIdx),
      compPrimary: parseIntNum(compPrimaryIdx), base: parseStr(baseIdx), spect: parseStr(spectIdx),
      ci: parseNum(ciIdx), lum: parseNum(lumIdx), ra, dec, dist: parseNum(distIdx),
      mag: parseNum(magIdx), absmag: parseNum(absmagIdx), pmra, pmdec, rv: parseNum(rvIdx) ?? 0,
      raDegJ2016, decDegJ2016,
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
        addCandidate(`${raDegJ2016.toFixed(1)}_${decDegJ2016.toFixed(1)}`, item);
      }
    }
  }

  return { byHip, byCoord, byCoordCandidates, allItems };
}

export function findBestHygMatch(
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

        const [candRa16, candDec16] = [cand.raDegJ2016 ?? cand.ra * 15, cand.decDegJ2016 ?? cand.dec];
        const dRa16 = Math.min(Math.abs(raDeg - candRa16), 360 - Math.abs(raDeg - candRa16)) * cosDec;
        const sep16 = Math.hypot(dRa16, Math.abs(decDeg - candDec16));

        const candRa00 = cand.ra * 15;
        const dRa00 = Math.min(Math.abs(raDeg - candRa00), 360 - Math.abs(raDeg - candRa00)) * cosDec;
        const sep00 = Math.hypot(dRa00, Math.abs(decDeg - cand.dec));

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
