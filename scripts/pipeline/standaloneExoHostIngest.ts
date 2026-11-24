import type { ExoplanetRecord, SystemManifest, SystemSummaryNode, SystemTag } from '../../src/types/astro';
import { DEG_TO_RADIANS, equatorialToCartesian, RADIANS_TO_DEG } from '../../src/utils/astroCoordinates';
import { computeSystemHazardMask } from '../../src/utils/astroHazards';
import { resolveStellarClassificationFromSpectrum, resolveStellarReticleType } from '../../src/utils/astroPrecalculation';
import { collectStarLookupKeys, normalizeCleanKey } from '../../src/utils/nomenclature';
import { computePlanetCompositionCounts } from '../../src/utils/planetaryPhysics';
import { resolveStarDisplayName, resolveStarProperName } from '../../src/utils/starNaming';
import type { ExoplanetHostGroup } from './exoplanetHosts';
import {
  enrichPlanetsWithPrecalculatedFields,
  getPlanetCensus,
  matchExoplanetsForStar,
  mergeExoplanetRecords,
} from './exoplanets';
import { OFFICIAL_IAU_STAR_NAMES } from './seedCatalogs';
import type { HygCrossMatch } from './types';

const SPATIAL_CELL_SIZE_PC = 0.25;
const SPATIAL_MAX_DIST_SQ_PC2 = SPATIAL_CELL_SIZE_PC * SPATIAL_CELL_SIZE_PC;
const ANGULAR_BIN_DEG = 0.5;
const NUM_DEC_BINS = Math.round(180 / ANGULAR_BIN_DEG);
const MAX_ANGULAR_SEP_DEG = 0.05;
const MAX_CHORD_SQ = (2 * Math.sin(MAX_ANGULAR_SEP_DEG * 0.5 * DEG_TO_RADIANS)) ** 2;
const MAX_RELATIVE_DIST_DIFF = 0.05;

export interface ExoHostIngestOverride {
  hostName: string;
  spect?: string;
  teffK?: number;
  mag?: number;
  radiusRsun?: number;
  massMsun?: number;
  lumLsun?: number;
  planets: ExoplanetRecord[];
  aliases: string[];
}

export function findOfficialStarName(hyg?: HygCrossMatch) {
  if (!hyg) return undefined;
  if (hyg.hip && OFFICIAL_IAU_STAR_NAMES[`hip-${hyg.hip}`]) return OFFICIAL_IAU_STAR_NAMES[`hip-${hyg.hip}`];
  if (hyg.gl) {
    if (OFFICIAL_IAU_STAR_NAMES[`gl-${hyg.gl}`]) return OFFICIAL_IAU_STAR_NAMES[`gl-${hyg.gl}`];
    const glKey = `gl-${hyg.gl.toLowerCase().replace(/^(?:gl|gj|gliese)\s*/i, '').replace(/\s+/g, '')}`;
    if (OFFICIAL_IAU_STAR_NAMES[glKey]) return OFFICIAL_IAU_STAR_NAMES[glKey];
  }
  return undefined;
}

export function hasHygExoplanetMatch(
  hyg: HygCrossMatch,
  iauProperStars: Map<number, string>,
  exoplanetHostMap: Map<string, ExoplanetRecord[]>,
): boolean {
  if (exoplanetHostMap.size === 0) return false;
  const iauName = hyg.hip && iauProperStars.has(hyg.hip) ? iauProperStars.get(hyg.hip) : undefined;
  const official = findOfficialStarName(hyg);
  const properName = resolveStarProperName({
    properName: official?.properName,
    hygProperName: hyg.proper,
    iauProperName: iauName,
  });
  const aliases: string[] = [];
  if (official?.properName) aliases.push(official.properName);
  if (official?.aliases) aliases.push(...official.aliases);
  if (iauName) aliases.push(iauName);
  if (hyg.proper) aliases.push(hyg.proper);

  const sourceId = hyg.hip ? String(hyg.hip) : String(hyg.id);
  const name = resolveStarDisplayName({
    properName, bayer: hyg.bayer, con: hyg.con, flam: hyg.flam,
    gl: hyg.gl, hip: hyg.hip, hd: hyg.hd, sourceId,
  });

  return matchExoplanetsForStar({
    id: hyg.id,
    name,
    properName,
    hip: hyg.hip,
    hd: hyg.hd,
    hr: hyg.hr,
    gl: hyg.gl,
    bayer: hyg.bayer,
    flam: hyg.flam,
    con: hyg.con,
    aliases: aliases.length > 0 ? aliases : undefined,
    ra: hyg.ra ?? 0,
    dec: hyg.dec ?? 0,
    dist: hyg.dist ?? 0,
    mag: hyg.mag ?? 6.5,
    absmag: hyg.absmag ?? 0,
    x: 0,
    y: 0,
    z: 0,
  }, exoplanetHostMap).length > 0;
}

export function toExoHostSlug(hostName: string): string {
  const slug = hostName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'host';
}

export function buildCataloguedKeySet(
  cataloguedSummaries: readonly SystemSummaryNode[],
  starAliasesById: Map<string, string[]>,
): Set<string> {
  const keys = new Set<string>();
  for (const summary of cataloguedSummaries) {
    const idKey = normalizeCleanKey(summary.id);
    if (idKey) keys.add(idKey);
    const nameKey = normalizeCleanKey(summary.name);
    if (nameKey) keys.add(nameKey);
    if (summary.properName) {
      const properKey = normalizeCleanKey(summary.properName);
      if (properKey) keys.add(properKey);
    }
    for (const k of collectStarLookupKeys({ name: summary.name, properName: summary.properName })) {
      keys.add(k);
    }
    for (const aliasKey of starAliasesById.get(summary.id) ?? []) {
      keys.add(aliasKey);
    }
  }
  return keys;
}

interface AngularBucketEntry {
  summary: SystemSummaryNode;
  dist: number;
  ux: number;
  uy: number;
  uz: number;
}

function getNumRaBinsForDecBin(decBin: number): number {
  const centerDec = decBin * ANGULAR_BIN_DEG - 90 + ANGULAR_BIN_DEG * 0.5;
  const cosDec = Math.max(0.05, Math.cos(centerDec * DEG_TO_RADIANS));
  return Math.max(1, Math.round((360 * cosDec) / ANGULAR_BIN_DEG));
}

/**
 * Builds O(1) 3D and angular spatial lookups over already-catalogued stars so standalone
 * exoplanet hosts cannot emit duplicate `exo-*` nodes on top of existing HYG/Gaia/RECONS entries.
 */
function buildSpatialCatalogLookup(cataloguedSummaries: readonly SystemSummaryNode[]) {
  const grid3D = new Map<string, SystemSummaryNode[]>();
  const angularGrid = new Map<string, AngularBucketEntry[]>();

  for (const summary of cataloguedSummaries) {
    if (summary.id === 'sol' || summary.id === 'hyg-0' || (summary.x === 0 && summary.y === 0 && summary.z === 0)) {
      continue;
    }
    const norm = Math.hypot(summary.x, summary.y, summary.z);
    if (norm <= 0) continue;
    const dist = summary.dist > 0 ? summary.dist : norm;

    const key3D = `${Math.floor(summary.x / SPATIAL_CELL_SIZE_PC)}_${Math.floor(summary.y / SPATIAL_CELL_SIZE_PC)}_${Math.floor(summary.z / SPATIAL_CELL_SIZE_PC)}`;
    let cell3D = grid3D.get(key3D);
    if (!cell3D) grid3D.set(key3D, (cell3D = []));
    cell3D.push(summary);

    const [ux, uy, uz] = [summary.x / norm, summary.y / norm, summary.z / norm];
    const decDeg = Math.asin(Math.max(-1, Math.min(1, uz))) * RADIANS_TO_DEG;
    const raDeg = ((Math.atan2(uy, ux) * RADIANS_TO_DEG) + 360) % 360;
    const decBin = Math.min(NUM_DEC_BINS - 1, Math.max(0, Math.floor((decDeg + 90) / ANGULAR_BIN_DEG)));
    const numRaBins = getNumRaBinsForDecBin(decBin);
    const raBin = Math.min(numRaBins - 1, Math.max(0, Math.floor((raDeg / 360) * numRaBins)));
    const angKey = `${decBin}_${raBin}`;
    let angCell = angularGrid.get(angKey);
    if (!angCell) angularGrid.set(angKey, (angCell = []));
    angCell.push({ summary, dist, ux, uy, uz });
  }

  return function findSpatialMatch(
    x: number,
    y: number,
    z: number,
    raDeg: number,
    decDeg: number,
    distPc: number,
  ): SystemSummaryNode | undefined {
    if (distPc <= 100) {
      const cx = Math.floor(x / SPATIAL_CELL_SIZE_PC);
      const cy = Math.floor(y / SPATIAL_CELL_SIZE_PC);
      const cz = Math.floor(z / SPATIAL_CELL_SIZE_PC);
      let best: SystemSummaryNode | undefined;
      let bestDistSq = SPATIAL_MAX_DIST_SQ_PC2;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const bucket = grid3D.get(`${cx + dx}_${cy + dy}_${cz + dz}`);
            if (!bucket) continue;
            for (const cand of bucket) {
              const dSq = (cand.x - x) ** 2 + (cand.y - y) ** 2 + (cand.z - z) ** 2;
              if (dSq <= SPATIAL_MAX_DIST_SQ_PC2 && (best === undefined || dSq < bestDistSq)) {
                best = cand;
                bestDistSq = dSq;
              }
            }
          }
        }
      }
      return best;
    }

    const norm = Math.hypot(x, y, z);
    if (norm <= 0) return undefined;
    const [ux, uy, uz] = [x / norm, y / norm, z / norm];
    const raNorm = ((raDeg % 360) + 360) % 360;
    const decClamped = Math.max(-90, Math.min(90, decDeg));
    const decBin = Math.min(NUM_DEC_BINS - 1, Math.max(0, Math.floor((decClamped + 90) / ANGULAR_BIN_DEG)));
    const cosAtDec = Math.cos(Math.min(89.999, Math.abs(decClamped)) * DEG_TO_RADIANS);
    const raHalfSpanDeg = cosAtDec > 1e-4 ? Math.min(180, MAX_ANGULAR_SEP_DEG / cosAtDec) : 180;

    let best: SystemSummaryNode | undefined;
    let bestChordSq = MAX_CHORD_SQ;

    for (let dDec = -1; dDec <= 1; dDec++) {
      const candDecBin = decBin + dDec;
      if (candDecBin < 0 || candDecBin >= NUM_DEC_BINS) continue;
      const candNumRaBins = getNumRaBinsForDecBin(candDecBin);
      const centerRaBin = Math.min(candNumRaBins - 1, Math.max(0, Math.floor((raNorm / 360) * candNumRaBins)));
      const dRaMax = Math.min(
        Math.floor(candNumRaBins / 2),
        Math.max(1, Math.ceil(raHalfSpanDeg / (360 / candNumRaBins))),
      );
      const scanAllRa = dRaMax * 2 + 1 >= candNumRaBins;
      const startRa = scanAllRa ? 0 : -dRaMax;
      const endRa = scanAllRa ? candNumRaBins - 1 : dRaMax;

      for (let step = startRa; step <= endRa; step++) {
        const candRaBin = scanAllRa ? step : (centerRaBin + step + candNumRaBins) % candNumRaBins;
        const bucket = angularGrid.get(`${candDecBin}_${candRaBin}`);
        if (!bucket) continue;
        for (const cand of bucket) {
          if (Math.abs(cand.dist - distPc) / Math.max(distPc, 1) > MAX_RELATIVE_DIST_DIFF) continue;
          const chordSq = (ux - cand.ux) ** 2 + (uy - cand.uy) ** 2 + (uz - cand.uz) ** 2;
          if (chordSq < MAX_CHORD_SQ && (best === undefined || chordSq < bestChordSq)) {
            best = cand.summary;
            bestChordSq = chordSq;
          }
        }
      }
    }
    return best;
  };
}

export function emitStandaloneExoplanetHosts(params: {
  canonicalHosts: readonly ExoplanetHostGroup[];
  matchedExoplanetIds: Set<string>;
  cataloguedSummaries: readonly SystemSummaryNode[];
  starAliasesById: Map<string, string[]>;
  emitHost: (sysId: string, group: ExoplanetHostGroup, planets: ExoplanetRecord[]) => void;
  attachPlanetsToExisting?: (
    existingSummary: SystemSummaryNode,
    group: ExoplanetHostGroup,
    planets: ExoplanetRecord[],
  ) => void;
}): void {
  const {
    canonicalHosts,
    matchedExoplanetIds,
    cataloguedSummaries,
    starAliasesById,
    emitHost,
    attachPlanetsToExisting,
  } = params;
  const usedSysIds = new Set<string>(cataloguedSummaries.map((s) => s.id));
  const cataloguedKeySet = buildCataloguedKeySet(cataloguedSummaries, starAliasesById);
  const findSpatialMatch = buildSpatialCatalogLookup(cataloguedSummaries);

  for (const group of canonicalHosts) {
    const { host, planets, aliases } = group;
    if (!host.confirmed) continue;
    if (
      !Number.isFinite(host.raDeg) ||
      !Number.isFinite(host.decDeg) ||
      !Number.isFinite(host.distPc) ||
      host.distPc <= 0 ||
      host.distPc >= 10000
    ) {
      continue;
    }

    const hostKeyCandidates = [
      host.canonicalKey,
      normalizeCleanKey(host.hostName),
      ...aliases.map(normalizeCleanKey),
    ].filter((k) => k.length > 0);

    if (hostKeyCandidates.some((k) => cataloguedKeySet.has(k))) continue;

    const unmatchedPlanets = planets.filter((p) => !matchedExoplanetIds.has(p.id));
    if (unmatchedPlanets.length === 0) continue;

    const [x, y, z] = equatorialToCartesian(host.raDeg / 15, host.decDeg, host.distPc);
    const spatialMatch = findSpatialMatch(x, y, z, host.raDeg, host.decDeg, host.distPc);
    if (spatialMatch) {
      for (const p of unmatchedPlanets) matchedExoplanetIds.add(p.id);
      attachPlanetsToExisting?.(spatialMatch, group, unmatchedPlanets);
      for (const k of hostKeyCandidates) cataloguedKeySet.add(k);
      continue;
    }

    const baseSlug = toExoHostSlug(host.hostName);
    let sysId = `exo-${baseSlug}`;
    let suffix = 2;
    while (usedSysIds.has(sysId)) {
      sysId = `exo-${baseSlug}-${suffix++}`;
    }
    usedSysIds.add(sysId);

    emitHost(sysId, group, unmatchedPlanets);

    for (const k of hostKeyCandidates) cataloguedKeySet.add(k);
  }
}

/**
 * Attaches unmatched planets from a spatially matched exoplanet host onto an existing
 * catalogued system summary and manifest without emitting a duplicate `exo-*` node.
 */
export function attachPlanetsToCataloguedSystem(params: {
  existingSummary: SystemSummaryNode;
  group: ExoplanetHostGroup;
  planets: ExoplanetRecord[];
  includeDetails: boolean;
  allSystemManifests: SystemManifest[];
  manifestById: Map<string, SystemManifest>;
  sectorManifestsMap: Map<string, SystemManifest[]>;
  exoplanetHostSummaries: SystemSummaryNode[];
  starAliasesById: Map<string, string[]>;
  matchedExoplanetIds: Set<string>;
}): number {
  const {
    existingSummary, group, planets, includeDetails, allSystemManifests, manifestById,
    sectorManifestsMap, exoplanetHostSummaries, starAliasesById, matchedExoplanetIds,
  } = params;

  const enriched = enrichPlanetsWithPrecalculatedFields(planets, group.host.lumLsun);
  for (const p of enriched) matchedExoplanetIds.add(p.id);

  let manifest = manifestById.get(existingSummary.id);
  const prevCount = manifest?.planets.length ?? existingSummary.planetCount;
  const mergedByKey = new Map<string, ExoplanetRecord>();
  for (const p of [...(manifest?.planets ?? []), ...enriched]) {
    const key = p.letter || p.id;
    const prev = mergedByKey.get(key);
    mergedByKey.set(key, prev ? mergeExoplanetRecords(prev, p) : p);
  }
  const mergedPlanets = Array.from(mergedByKey.values());
  const addedExoplanets = Math.max(0, mergedPlanets.length - prevCount);

  existingSummary.planetCount = mergedPlanets.length;
  existingSummary.planetCensus = getPlanetCensus(mergedPlanets);
  existingSummary.planetCompositionCounts = computePlanetCompositionCounts(mergedPlanets);
  existingSummary.hasHabitableCandidate = mergedPlanets.some((p) => Boolean(p.isHabitableCandidate));

  const tagSet = new Set<SystemTag>(existingSummary.tags ?? []);
  tagSet.add('ExoplanetHost');
  if (existingSummary.hasHabitableCandidate) tagSet.add('HabitableCandidate');
  existingSummary.tags = Array.from(tagSet);

  const newHazardMask = computeSystemHazardMask({
    spect: existingSummary.spect,
    lum: group.host.lumLsun,
    effectiveTempK: group.host.teffK,
    tags: existingSummary.tags,
  });
  if (newHazardMask > 0) {
    existingSummary.hazardMask = (existingSummary.hazardMask ?? 0) | newHazardMask;
  }

  if (mergedPlanets.length > 0 && !exoplanetHostSummaries.some((s) => s.id === existingSummary.id)) {
    exoplanetHostSummaries.push(existingSummary);
  }

  const aliasSet = new Set<string>(starAliasesById.get(existingSummary.id) ?? []);
  for (const k of collectStarLookupKeys({ name: group.host.hostName, aliases: group.aliases })) {
    aliasSet.add(k);
  }
  starAliasesById.set(existingSummary.id, Array.from(aliasSet));

  if (includeDetails) {
    if (manifest) {
      manifest.planets = mergedPlanets;
      manifest.planetCompositionCounts = existingSummary.planetCompositionCounts;
      manifest.hasHabitableCandidate = existingSummary.hasHabitableCandidate;
      manifest.tags = existingSummary.tags;
      if (existingSummary.hazardMask && existingSummary.hazardMask > 0) {
        manifest.hazardMask = existingSummary.hazardMask;
      }
    } else {
      manifest = {
        id: existingSummary.id,
        name: existingSummary.name,
        ...(existingSummary.properName ? { properName: existingSummary.properName } : {}),
        x: existingSummary.x,
        y: existingSummary.y,
        z: existingSummary.z,
        dist: existingSummary.dist,
        ...(existingSummary.velocity ? { velocity: existingSummary.velocity } : {}),
        sectorId: existingSummary.sectorId,
        stars: [{
          id: `${existingSummary.id}-A`,
          name: existingSummary.name,
          componentDesignation: 'A',
          spectralType: existingSummary.spect || 'Unknown',
          mag: existingSummary.mag,
          absmag: existingSummary.absmag,
          reticleType: existingSummary.reticleType ?? resolveStellarReticleType(
            existingSummary.classification ?? resolveStellarClassificationFromSpectrum(existingSummary.spect),
            false,
          ),
          ...(group.host.lumLsun !== undefined ? { luminosityLsun: group.host.lumLsun } : {}),
          ...(group.host.massMsun !== undefined ? { massMsun: group.host.massMsun } : {}),
          ...(group.host.radiusRsun !== undefined ? { radiusRsun: group.host.radiusRsun } : {}),
          ...(group.host.teffK !== undefined ? { effectiveTempK: group.host.teffK } : {}),
        }],
        planets: mergedPlanets,
        planetCompositionCounts: existingSummary.planetCompositionCounts,
        hasHabitableCandidate: existingSummary.hasHabitableCandidate,
        ...(existingSummary.tags?.length ? { tags: existingSummary.tags } : {}),
        ...(existingSummary.hazardMask && existingSummary.hazardMask > 0 ? { hazardMask: existingSummary.hazardMask } : {}),
      };
      allSystemManifests.push(manifest);
      manifestById.set(manifest.id, manifest);
      let sectorManifests = sectorManifestsMap.get(existingSummary.sectorId);
      if (!sectorManifests) sectorManifestsMap.set(existingSummary.sectorId, (sectorManifests = []));
      sectorManifests.push(manifest);
    }
  }

  return addedExoplanets;
}
