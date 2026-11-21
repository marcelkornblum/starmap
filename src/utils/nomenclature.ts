import { transliterateGreekAndSuperscripts } from './bayerTables';
import {
  GENITIVE_TO_NOMINATIVE_MAP,
  IAU_CONSTELLATION_NOMINATIVE_MAP,
} from './constellationTables';
import {
  expandBayerOrFlamsteed,
  expandGouldOrConstellationSuffix,
  isGreekBayerPrefix,
} from './starNaming';

/**
 * Normalizes a raw designation or query into a lowercase alphanumeric clean key.
 */
export function normalizeCleanKey(raw: string): string {
  const transliterated = transliterateGreekAndSuperscripts(raw);
  return transliterated.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const GLIESE_CLEAN_REGEX = /^(?:gliese|gj|gl|nn|wo)(\d[a-z0-9]*)$/;

/**
 * Canonicalizes a clean key's Gliese/GJ/Gl/NN/Wo numeric designation prefix to `gj<suffix>`.
 */
export function canonicalizeGlieseCleanKey(cleanKey: string): string {
  const match = GLIESE_CLEAN_REGEX.exec(cleanKey);
  return match ? `gj${match[1]}` : cleanKey;
}

/**
 * Strips alias keys that are already derivable at query time from `entryId`, `entryName`,
 * `gaia-<id>` -> `gaiadr3<id>`, and collapses redundant `gl`/`gj`/`gliese` variants to a
 * single canonical `gj<suffix>` key.
 */
export function pruneDerivableAliases(
  entryId: string,
  entryName: string,
  cleanKeysSpaceDelimited: string,
): string {
  if (!cleanKeysSpaceDelimited) {
    return '';
  }

  const derivable = new Set<string>();
  const addDerivable = (key: string) => {
    if (!key) return;
    derivable.add(key);
    derivable.add(canonicalizeGlieseCleanKey(key));
  };

  addDerivable(normalizeCleanKey(entryName));
  addDerivable(normalizeCleanKey(entryId));
  addDerivable(entryId.toLowerCase());

  if (/[(),/]/.test(entryName)) {
    for (const segment of entryName.split(/[(),/]+/)) {
      addDerivable(normalizeCleanKey(segment));
    }
  }

  const lowerId = entryId.toLowerCase();
  if (lowerId.startsWith('gaia-')) {
    const digits = normalizeCleanKey(lowerId.slice(5));
    if (digits) {
      addDerivable(`gaiadr3${digits}`);
    }
  }

  const remaining: string[] = [];
  const seen = new Set<string>();
  for (const rawKey of cleanKeysSpaceDelimited.split(' ')) {
    if (!rawKey) continue;
    const canonical = canonicalizeGlieseCleanKey(rawKey);
    if (derivable.has(rawKey) || derivable.has(canonical)) {
      continue;
    }
    if (!seen.has(canonical)) {
      seen.add(canonical);
      remaining.push(canonical);
    }
  }

  const filtered = remaining.filter(
    (key) => !remaining.some((other) => other.length > key.length && other.startsWith(key)),
  );
  return filtered.join(' ');
}

/**
 * Expands a Gliese / Jahreiß / Woolley catalog designation into its canonical prefix forms.
 */
export function expandGlieseVariants(rawDesignation?: string | null): string[] {
  if (!rawDesignation) {
    return [];
  }
  const trimmed = rawDesignation.trim();
  const glMatch = trimmed.match(/^(?:gliese|gl|gj|nn|wo)\s*(.+)$/i);
  if (!glMatch) {
    return [];
  }
  const suffix = glMatch[1].trim();
  return Array.from(new Set([trimmed, `Gl ${suffix}`, `GJ ${suffix}`, `Gliese ${suffix}`]));
}

/**
 * Builds a space-delimited string of clean keys from raw designation strings.
 * Deduplicates prefix keys on the same object.
 */
export function buildCleanKeys(rawTerms: (string | undefined | null)[]): string {
  const uniqueKeys: string[] = [];
  const seen = new Set<string>();

  const pushKey = (raw: string) => {
    const clean = normalizeCleanKey(raw);
    if (clean.length > 0 && !seen.has(clean)) {
      seen.add(clean);
      uniqueKeys.push(clean);
    }
  };

  for (const term of rawTerms) {
    if (!term) continue;
    pushKey(term);
    if (/[(),/]/.test(term)) {
      for (const segment of term.split(/[(),/]+/)) {
        const trimmed = segment.trim();
        if (trimmed.length >= 2) {
          pushKey(trimmed);
        }
      }
    }
  }

  const filtered = uniqueKeys.filter(
    (key) => !uniqueKeys.some((other) => other.length > key.length && other.startsWith(key)),
  );

  return filtered.join(' ');
}

export interface StarLookupInput {
  properName?: string | null;
  name?: string | null;
  bayer?: string | null;
  flam?: number | null;
  con?: string | null;
  bf?: string | null;
  hd?: number | null;
  hip?: number | null;
  hr?: number | null;
  gl?: string | null;
  aliases?: string[] | null;
}

/**
 * Collects all normalized lookup keys for a star across catalogs.
 */
export function collectStarLookupKeys(star: StarLookupInput): string[] {
  const rawCandidates: string[] = [];

  if (star.properName) {
    rawCandidates.push(star.properName);
    rawCandidates.push(expandGouldOrConstellationSuffix(star.properName));
  }

  if (star.name) {
    rawCandidates.push(star.name);
    rawCandidates.push(expandGouldOrConstellationSuffix(star.name));
  }

  if (star.bayer && star.con) {
    rawCandidates.push(`${star.bayer} ${star.con}`);
    const expandedBayer = expandBayerOrFlamsteed(star.bayer, star.con);
    if (expandedBayer) {
      rawCandidates.push(expandedBayer);
    }
  }

  if (star.flam !== undefined && star.flam !== null && !isNaN(star.flam) && star.con) {
    rawCandidates.push(`${star.flam} ${star.con}`);
    const expandedFlam = expandBayerOrFlamsteed(undefined, star.con, star.flam);
    if (expandedFlam) {
      rawCandidates.push(expandedFlam);
    }
  }

  if (star.bf) {
    rawCandidates.push(star.bf);
  }

  if (star.hd !== undefined && star.hd !== null && !isNaN(star.hd)) {
    rawCandidates.push(`HD ${star.hd}`);
  }

  if (star.hip !== undefined && star.hip !== null && !isNaN(star.hip)) {
    rawCandidates.push(`HIP ${star.hip}`);
  }

  if (star.hr !== undefined && star.hr !== null && !isNaN(star.hr)) {
    rawCandidates.push(`HR ${star.hr}`);
  }

  if (star.gl) {
    rawCandidates.push(...expandGlieseVariants(star.gl));
  }

  if (star.aliases) {
    for (const alias of star.aliases) {
      if (!alias) continue;
      rawCandidates.push(alias);
      rawCandidates.push(expandGouldOrConstellationSuffix(alias));
      rawCandidates.push(...expandGlieseVariants(alias));
    }
  }

  const nominativesToAdd = new Set<string>();

  if (star.con) {
    const conKey = star.con.trim().toLowerCase();
    const nom = IAU_CONSTELLATION_NOMINATIVE_MAP[conKey];
    if (nom) nominativesToAdd.add(nom);
  }

  for (const cand of rawCandidates) {
    if (!cand) continue;
    const lower = cand.toLowerCase();

    for (const [genitive, nominative] of Object.entries(GENITIVE_TO_NOMINATIVE_MAP)) {
      if (genitive.includes(' ') && lower.includes(genitive)) {
        nominativesToAdd.add(nominative);
      }
    }

    const tokens = lower.split(/[^a-z0-9]+/);
    for (const token of tokens) {
      if (!token) continue;
      const genitiveMatch = GENITIVE_TO_NOMINATIVE_MAP[token];
      if (genitiveMatch) {
        nominativesToAdd.add(genitiveMatch);
        continue;
      }
      const codeMatch = IAU_CONSTELLATION_NOMINATIVE_MAP[token];
      if (codeMatch) {
        if (token === 'and' || token === 'for') {
          const hasAstroContext = tokens.some(
            (t) => t !== token && (isGreekBayerPrefix(t) || /^\d+$/.test(t)),
          );
          if (hasAstroContext) {
            nominativesToAdd.add(codeMatch);
          }
        } else {
          nominativesToAdd.add(codeMatch);
        }
      }
    }
  }

  for (const nom of nominativesToAdd) {
    rawCandidates.push(nom);
  }

  const keys: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawCandidates) {
    const clean = normalizeCleanKey(raw);
    if (clean.length > 0 && !seen.has(clean)) {
      seen.add(clean);
      keys.push(clean);
    }
  }

  return keys;
}
