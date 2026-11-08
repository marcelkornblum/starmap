import type { SystemSummaryNode } from '../../src/types/astro';
import { CONSTELLATION_NAMES_RAW, SPECIAL_SYSTEM_NAME_MAP } from './seedCatalogs';
import type { ConsolidateMultiStarSystemsParams } from './types';

/**
 * Strips component designations (' A', ' B', ' C', ' AB', ' BC', parentheticals)
 * and normalizes well-known historical/IAU multiple star system names to their base system name.
 */
export function getStrippedSystemBaseName(rawName: string): string {
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();

  for (const [key, val] of Object.entries(SPECIAL_SYSTEM_NAME_MAP)) {
    if (lower === key || lower.startsWith(`${key} `) || lower.startsWith(`${key}-`) || lower.includes(`(${key}`) || lower.includes(`${key})`)) {
      return val;
    }
  }

  if (lower.includes('alpha centauri')) return 'Alpha Centauri';
  if (lower.includes('luyten 726-8') || lower.includes('uv ceti') || lower.includes('bl ceti') || /\b(?:gl|gj|gliese)\s*65(?:[a-e]|\b)/i.test(lower)) {
    return 'Luyten 726-8';
  }
  if (lower.includes('sirius') || /\b(?:gl|gj|gliese)\s*244(?:[a-e]|\b)/i.test(lower)) {
    return 'Sirius';
  }

  let clean = trimmed.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (!clean && trimmed.startsWith('(') && trimmed.endsWith(')')) clean = trimmed.slice(1, -1).trim();
  clean = clean.replace(/(?:(?<=\d)|\s+)(?:[A-E]{1,2})$/i, '').trim();

  const cleanLower = clean.toLowerCase();
  for (const [key, val] of Object.entries(SPECIAL_SYSTEM_NAME_MAP)) {
    if (cleanLower === key || cleanLower.startsWith(`${key} `) || cleanLower.startsWith(`${key}-`) || cleanLower.includes(`(${key}`) || cleanLower.includes(`${key})`)) {
      return val;
    }
  }

  return clean || trimmed;
}

const CONSTELLATION_NAMES_SET = new Set<string>();
for (const raw of CONSTELLATION_NAMES_RAW) {
  const lower = raw.toLowerCase().trim();
  CONSTELLATION_NAMES_SET.add(lower);
  CONSTELLATION_NAMES_SET.add(lower.replace(/\s+/g, ''));
  CONSTELLATION_NAMES_SET.add(lower.replace(/[^a-z0-9]/g, ''));
}

export function isConstellationName(str: string): boolean {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CONSTELLATION_NAMES_SET.has(clean) || CONSTELLATION_NAMES_SET.has(str.toLowerCase().trim());
}

export function addKeyVariants(set: Set<string>, raw: string | undefined): void {
  if (!raw) return;
  const stripped = getStrippedSystemBaseName(raw).toLowerCase().trim();
  if (stripped.length >= 2 && !isConstellationName(stripped)) {
    set.add(stripped);
    set.add(stripped.replace(/\s+/g, ''));
    set.add(stripped.replace(/[^a-z0-9]/g, ''));
  }
  const rawLower = raw.toLowerCase().trim();
  if (rawLower.length >= 2 && !isConstellationName(rawLower)) {
    set.add(rawLower);
    set.add(rawLower.replace(/\s+/g, ''));
    set.add(rawLower.replace(/[^a-z0-9]/g, ''));
  }
}

export function isDuplicateCatalogRecord(c: SystemSummaryNode, other: SystemSummaryNode): boolean {
  const isOneGaiaOneHyg =
    (c.id.startsWith('gaia-') && (other.id.startsWith('hyg-') || other.id.startsWith('hip-'))) ||
    ((c.id.startsWith('hyg-') || c.id.startsWith('hip-')) && other.id.startsWith('gaia-'));
  if (!isOneGaiaOneHyg) return false;

  const componentRegex = /(?:(?<=\d)|\s+)[A-E]{1,2}(?:\s*\(.*\))?$/i;
  const cLower = c.name.toLowerCase().trim();
  const otherLower = other.name.toLowerCase().trim();
  const hasCompC = componentRegex.test(c.name) || Boolean(SPECIAL_SYSTEM_NAME_MAP[cLower]);
  const hasCompOther = componentRegex.test(other.name) || Boolean(SPECIAL_SYSTEM_NAME_MAP[otherLower]);
  return !hasCompC && !hasCompOther;
}

export function pruneAbsorbedCollections(params: ConsolidateMultiStarSystemsParams, absorbed: Set<string>): void {
  const prune = <T extends { id: string }>(arr?: T[]) => {
    if (!arr) return;
    const f = arr.filter((s) => !absorbed.has(s.id));
    arr.length = 0;
    arr.push(...f);
  };
  prune(params.cataloguedSummaries);
  prune(params.local10pcSystems);
  prune(params.referenceBrightSystems);
  prune(params.exoplanetHostSummaries);
  prune(params.allSystemManifests);
  if (params.sectorMap) for (const list of params.sectorMap.values()) prune(list);
  if (params.sectorManifestsMap) for (const list of params.sectorManifestsMap.values()) prune(list);
}

export function mergeSystemAliases(
  primary: { id: string; name: string; properName?: string },
  secondaries: { id: string; name: string; properName?: string }[],
  aliasesById?: Map<string, string[]>,
): void {
  if (!aliasesById) return;
  const set = new Set<string>();
  const add = (c: { id: string; name: string; properName?: string }) => {
    set.add(c.id.toLowerCase());
    set.add(c.name.toLowerCase());
    if (c.properName) set.add(c.properName.toLowerCase());
    const existing = aliasesById.get(c.id);
    if (existing) for (const a of existing) set.add(a.toLowerCase());
  };
  add(primary);
  for (const s of secondaries) { add(s); aliasesById.delete(s.id); }
  aliasesById.set(primary.id, Array.from(set));
}
