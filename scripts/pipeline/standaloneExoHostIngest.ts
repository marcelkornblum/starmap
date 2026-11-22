import type { ExoplanetRecord, SystemSummaryNode } from '../../src/types/astro';
import { collectStarLookupKeys, normalizeCleanKey } from '../../src/utils/nomenclature';
import { resolveStarDisplayName, resolveStarProperName } from '../../src/utils/starNaming';
import type { ExoplanetHostGroup } from './exoplanetHosts';
import { matchExoplanetsForStar } from './exoplanets';
import { OFFICIAL_IAU_STAR_NAMES } from './seedCatalogs';
import type { HygCrossMatch } from './types';

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

export function findOfficialStarName(h?: HygCrossMatch) {
  if (!h) return undefined;
  if (h.hip && OFFICIAL_IAU_STAR_NAMES[`hip-${h.hip}`]) return OFFICIAL_IAU_STAR_NAMES[`hip-${h.hip}`];
  if (h.gl) {
    if (OFFICIAL_IAU_STAR_NAMES[`gl-${h.gl}`]) return OFFICIAL_IAU_STAR_NAMES[`gl-${h.gl}`];
    const k = `gl-${h.gl.toLowerCase().replace(/^(?:gl|gj|gliese)\s*/i, '').replace(/\s+/g, '')}`;
    if (OFFICIAL_IAU_STAR_NAMES[k]) return OFFICIAL_IAU_STAR_NAMES[k];
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

export function emitStandaloneExoplanetHosts(params: {
  canonicalHosts: readonly ExoplanetHostGroup[];
  matchedExoplanetIds: Set<string>;
  cataloguedSummaries: readonly SystemSummaryNode[];
  starAliasesById: Map<string, string[]>;
  emitHost: (sysId: string, group: ExoplanetHostGroup, planets: ExoplanetRecord[]) => void;
}): void {
  const { canonicalHosts, matchedExoplanetIds, cataloguedSummaries, starAliasesById, emitHost } = params;
  const usedSysIds = new Set<string>(cataloguedSummaries.map((s) => s.id));
  const cataloguedKeySet = buildCataloguedKeySet(cataloguedSummaries, starAliasesById);

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
