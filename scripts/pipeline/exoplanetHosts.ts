import type { ExoplanetRecord } from '../../src/types/astro';
import { expandGouldOrConstellationSuffix } from '../../src/utils/starNaming';
import { IAU_NAME_EXOWORLDS } from './seedCatalogs';

export interface ExoplanetHostMetadata {
  hostName: string;
  canonicalKey: string;
  raDeg: number;
  decDeg: number;
  distPc: number;
  mag?: number;
  spect?: string;
  teffK?: number;
  radiusRsun?: number;
  massMsun?: number;
  lumLsun?: number;
  confirmed: boolean;
}

export interface ExoplanetHostGroup {
  host: ExoplanetHostMetadata;
  planets: ExoplanetRecord[];
  aliases: string[];
}

export interface SourceHostMeta {
  hostName: string;
  raDeg?: number;
  decDeg?: number;
  distPc?: number;
  mag?: number;
  spect?: string;
  teffK?: number;
  radiusRsun?: number;
  massMsun?: number;
  lumLsun?: number;
}

export type CatalogSourceKind = 'nasa' | 'oec' | 'eu';

interface MutableHostGroup {
  canonicalKey: string;
  confirmed: boolean;
  planets: ExoplanetRecord[];
  aliases: Set<string>;
  metaBySource: { nasa?: SourceHostMeta; oec?: SourceHostMeta; eu?: SourceHostMeta };
}

export function parseSexagesimalRaDeg(raw?: string): number {
  const trimmed = raw?.trim();
  if (!trimmed) return NaN;
  const parts = trimmed.split(/[\s:]+/);
  const h = parseFloat(parts[0] ?? '');
  const m = parts.length > 1 ? parseFloat(parts[1] ?? '') : 0;
  const s = parts.length > 2 ? parseFloat(parts[2] ?? '') : 0;
  if (isNaN(h) || isNaN(m) || isNaN(s)) return NaN;
  return (h + m / 60 + s / 3600) * 15;
}

export function parseSexagesimalDecDeg(raw?: string): number {
  const trimmed = raw?.trim();
  if (!trimmed) return NaN;
  const sign = trimmed.startsWith('-') ? -1 : 1;
  const unsigned = trimmed.replace(/^[+-]/, '').trim();
  const parts = unsigned.split(/[\s:]+/);
  const d = parseFloat(parts[0] ?? '');
  const m = parts.length > 1 ? parseFloat(parts[1] ?? '') : 0;
  const s = parts.length > 2 ? parseFloat(parts[2] ?? '') : 0;
  if (isNaN(d) || isNaN(m) || isNaN(s)) return NaN;
  return sign * (Math.abs(d) + m / 60 + s / 3600);
}

export function inferSpectralClassFromTeff(teffK?: number): string | undefined {
  if (teffK === undefined || !Number.isFinite(teffK) || teffK <= 0) return undefined;
  if (teffK >= 30000) return 'O';
  if (teffK >= 10000) return 'B';
  if (teffK >= 7500) return 'A';
  if (teffK >= 6000) return 'F';
  if (teffK >= 5200) return 'G';
  if (teffK >= 3700) return 'K';
  if (teffK >= 2400) return 'M';
  if (teffK >= 1300) return 'L';
  if (teffK >= 550) return 'T';
  return 'Y';
}

export function buildCsvHeaderIndex(headerRow: string[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!headerRow) return map;
  for (let i = 0; i < headerRow.length; i++) {
    const k = headerRow[i]?.trim();
    if (k) map.set(k, i);
  }
  return map;
}

export const strAt = (parts: string[], idx?: number): string =>
  idx !== undefined && idx >= 0 ? (parts[idx]?.trim() ?? '') : '';

export const numAt = (parts: string[], idx?: number): number => {
  const raw = strAt(parts, idx);
  return raw ? parseFloat(raw) : NaN;
};

export const finiteOrUndefined = (v: number): number | undefined => (Number.isFinite(v) ? v : undefined);

export function normalizeExoHostKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mergeSourceMetadata(group: MutableHostGroup): ExoplanetHostMetadata {
  const ordered = [group.metaBySource.nasa, group.metaBySource.oec, group.metaBySource.eu].filter(
    (m): m is SourceHostMeta => Boolean(m),
  );
  const hostName = ordered.find((m) => m.hostName)?.hostName ?? group.canonicalKey;
  const coords = ordered.find(
    (m) => m.raDeg !== undefined && Number.isFinite(m.raDeg) && m.decDeg !== undefined && Number.isFinite(m.decDeg),
  );
  const distPc = ordered.find((m) => m.distPc !== undefined && Number.isFinite(m.distPc) && m.distPc > 0)?.distPc ?? NaN;
  const mag = ordered.find((m) => m.mag !== undefined && Number.isFinite(m.mag))?.mag;
  const spect = ordered.find((m) => m.spect && m.spect.length > 0)?.spect;
  const teffK = ordered.find((m) => m.teffK !== undefined && Number.isFinite(m.teffK) && m.teffK > 0)?.teffK;
  const radiusRsun = ordered.find((m) => m.radiusRsun !== undefined && Number.isFinite(m.radiusRsun) && m.radiusRsun > 0)?.radiusRsun;
  const massMsun = ordered.find((m) => m.massMsun !== undefined && Number.isFinite(m.massMsun) && m.massMsun > 0)?.massMsun;
  const lumLsun = ordered.find((m) => m.lumLsun !== undefined && Number.isFinite(m.lumLsun) && m.lumLsun > 0)?.lumLsun;

  return {
    hostName,
    canonicalKey: group.canonicalKey,
    raDeg: coords?.raDeg ?? NaN,
    decDeg: coords?.decDeg ?? NaN,
    distPc,
    ...(mag !== undefined ? { mag } : {}),
    ...(spect !== undefined ? { spect } : {}),
    ...(teffK !== undefined ? { teffK } : {}),
    ...(radiusRsun !== undefined ? { radiusRsun } : {}),
    ...(massMsun !== undefined ? { massMsun } : {}),
    ...(lumLsun !== undefined ? { lumLsun } : {}),
    confirmed: group.confirmed,
  };
}

export function createExoplanetHostRegistry(
  hostMap: Map<string, ExoplanetRecord[]>,
  mergeRecords: (existing: ExoplanetRecord, incoming: ExoplanetRecord) => ExoplanetRecord,
) {
  const canonicalGroups = new Map<string, MutableHostGroup>();
  const aliasToCanonical = new Map<string, string>();

  function addToBucket(bucket: ExoplanetRecord[], planet: ExoplanetRecord) {
    const idx = bucket.findIndex((p) => p.letter === planet.letter || p.id === planet.id);
    const existing = idx >= 0 ? bucket[idx] : undefined;
    if (!existing) bucket.push(planet);
    else bucket[idx] = mergeRecords(existing, planet);
  }

  function addPlanetKey(hostKey: string, planet: ExoplanetRecord) {
    const key = normalizeExoHostKey(hostKey);
    if (!key) return;
    let bucket = hostMap.get(key);
    if (!bucket) hostMap.set(key, (bucket = []));
    addToBucket(bucket, planet);
  }

  function registerEntry(
    rawName: string,
    expName: string,
    record: ExoplanetRecord,
    rawHost: string,
    source: CatalogSourceKind,
    sourceMeta: SourceHostMeta,
    isConfirmedRow: boolean,
  ) {
    const iau = IAU_NAME_EXOWORLDS[rawName] ?? IAU_NAME_EXOWORLDS[expName];
    if (iau && !record.name.includes(iau.planetName)) record.name = `${expName} (${iau.planetName})`;

    addPlanetKey(rawHost, record);
    const expandedHost = expandGouldOrConstellationSuffix(rawHost);
    if (expandedHost !== rawHost) addPlanetKey(expandedHost, record);
    if (iau) addPlanetKey(iau.starName, record);

    const rawKey = normalizeExoHostKey(rawHost);
    const expandedKey = normalizeExoHostKey(expandedHost);
    const iauKey = iau ? normalizeExoHostKey(iau.starName) : '';
    const canonicalKey =
      aliasToCanonical.get(expandedKey) ??
      aliasToCanonical.get(rawKey) ??
      (iauKey ? aliasToCanonical.get(iauKey) : undefined) ??
      (expandedKey || rawKey);

    if (!canonicalKey) return;
    if (rawKey) aliasToCanonical.set(rawKey, canonicalKey);
    if (expandedKey) aliasToCanonical.set(expandedKey, canonicalKey);
    if (iauKey) aliasToCanonical.set(iauKey, canonicalKey);

    let group = canonicalGroups.get(canonicalKey);
    if (!group) {
      group = { canonicalKey, confirmed: false, planets: [], aliases: new Set<string>(), metaBySource: {} };
      canonicalGroups.set(canonicalKey, group);
    }
    if (isConfirmedRow) group.confirmed = true;
    addToBucket(group.planets, record);
    group.aliases.add(rawHost);
    if (expandedHost) group.aliases.add(expandedHost);
    if (iau?.starName) group.aliases.add(iau.starName);
    if (!group.metaBySource[source]) group.metaBySource[source] = sourceMeta;
  }

  function buildCanonicalHosts(): ExoplanetHostGroup[] {
    return Array.from(canonicalGroups.values()).map((group) => ({
      host: mergeSourceMetadata(group),
      planets: group.planets,
      aliases: Array.from(group.aliases),
    }));
  }

  return { registerEntry, buildCanonicalHosts };
}
