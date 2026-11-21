/**
 * DEC-027 / Phase 3.3A-1: Guide Catalog Examples & Resolvers
 * Resolution of star types, planet types, and hazards from raw URL slugs.
 */

import {
  STAR_TYPE_GUIDE_ENTRIES,
  PLANET_TYPE_GUIDE_ENTRIES,
  resolveHazardGuideEntry,
  type GuideExampleTarget,
  type PlanetTypeGuideEntry,
  type HazardGuideEntry,
} from '../../content/guide';
import type { GuideExamplesDataset, GuideSectionKey } from '../../types/guideData';
import {
  fetchGuideExamples,
  getCachedGuideExamplesForEntry,
} from '../../data/guideExamplesRepository';
import type { ResolvedStarTypeDetail } from './guideTypes';
import { getLuminosityLabel } from './guideCombinator';

export function getGuideExamplesForEntry(
  section: GuideSectionKey,
  entryId: string,
): readonly GuideExampleTarget[] {
  return getCachedGuideExamplesForEntry(section, entryId);
}

export function hydrateGuideExamples(): Promise<GuideExamplesDataset> {
  return fetchGuideExamples();
}

const SPECTRAL_LETTER_TO_ID: Record<string, string> = {
  O: 'o',
  B: 'b',
  A: 'a',
  F: 'f',
  G: 'g',
  K: 'k',
  M: 'm',
  L: 'l',
  T: 'l',
  Y: 'l',
  D: 'd',
};

const YERKES_REGEX = /^([OBAFGKMLTYD])([A-Z])?(\d+(?:\.\d+)?)?\s*(Ia|Ib|VII|VI|V|IV|III|II|I)?([a-z]+)?$/i;

/**
 * Resolves a raw star type slug into a strongly typed detail record,
 * decoding Yerkes spectral letters, subdivisions, and luminosity classes.
 * Handles compound strings (e.g. G2V+K1V) by resolving the primary component.
 */
export const resolveStarTypeGuideEntry = (
  rawSlug: string,
): ResolvedStarTypeDetail | null => {
  if (!rawSlug) return null;
  const rawTrimmed = rawSlug.trim();
  if (!rawTrimmed) return null;

  const trimmed = rawTrimmed.includes('+')
    ? (rawTrimmed.split('+')[0] ?? '').trim()
    : rawTrimmed;
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const directId = lower === 'lty' ? 'l' : lower;
  const directEntry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === directId);
  if (directEntry) {
    return {
      requestedRaw: rawTrimmed,
      entry: directEntry,
    };
  }

  // Parse Yerkes spectral string (e.g. G8.5V, g2v, M5.5Ve, DA2, K1V)
  const match = YERKES_REGEX.exec(trimmed);
  if (!match) return null;

  const spectralLetter = match[1]?.toUpperCase();
  if (!spectralLetter) return null;
  const entryId = SPECTRAL_LETTER_TO_ID[spectralLetter];
  if (!entryId) return null;

  const entry = STAR_TYPE_GUIDE_ENTRIES.find((e) => e.id === entryId);
  if (!entry) return null;

  const subdivision = match[3] || undefined;
  const rawLuminosity = match[4];
  let luminosityClass = rawLuminosity
    ? rawLuminosity.length === 2 &&
      rawLuminosity.toLowerCase().startsWith('i') &&
      (rawLuminosity.endsWith('a') || rawLuminosity.endsWith('b'))
      ? `${rawLuminosity.charAt(0).toUpperCase()}${rawLuminosity.charAt(1).toLowerCase()}`
      : rawLuminosity.toUpperCase()
    : undefined;

  // White dwarfs (D) default to luminosity class VII when not otherwise specified
  if (spectralLetter === 'D' && !luminosityClass) {
    luminosityClass = 'VII';
  }

  const luminosityLabel = getLuminosityLabel(luminosityClass);

  if (subdivision || luminosityClass) {
    return {
      requestedRaw: rawTrimmed,
      entry,
      decodedSubtype: {
        spectralLetter,
        subdivision,
        luminosityClass,
        luminosityLabel,
      },
    };
  }

  return {
    requestedRaw: rawTrimmed,
    entry,
  };
};

/**
 * Resolves multi-value star type slug (e.g. 'G2V,K1V' or 'G2V+K1V') into an array
 * of strongly typed detail records, deduplicated by classification.
 */
export const resolveStarTypeGuideEntries = (
  rawSlug: string,
): ResolvedStarTypeDetail[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: ResolvedStarTypeDetail[] = [];
  for (const token of tokens) {
    const resolved = resolveStarTypeGuideEntry(token);
    if (resolved) {
      const key = `${resolved.entry.id}:${resolved.decodedSubtype?.subdivision ?? ''}:${resolved.decodedSubtype?.luminosityClass ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(resolved);
      }
    }
  }
  return results;
};

/**
 * Resolves a planetary composition slug into its authoritative guide entry.
 */
export const resolvePlanetTypeGuideEntry = (
  rawSlug: string,
): PlanetTypeGuideEntry | null => {
  if (!rawSlug) return null;
  const trimmed = rawSlug.trim().toLowerCase();
  if (!trimmed) return null;

  const entry = PLANET_TYPE_GUIDE_ENTRIES.find((e) => e.id === trimmed);
  return entry ?? null;
};

/**
 * Resolves multi-value planet type slugs (e.g. 'terrestrial,super-earth')
 * into an array of authoritative guide entries.
 */
export const resolvePlanetTypeGuideEntries = (
  rawSlug: string,
): PlanetTypeGuideEntry[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: PlanetTypeGuideEntry[] = [];
  for (const token of tokens) {
    const entry = resolvePlanetTypeGuideEntry(token);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      results.push(entry);
    }
  }
  return results;
};

/**
 * Resolves multi-value environmental hazard slugs (e.g. 'high-gravity,tidal-locking')
 * into an array of authoritative guide entries.
 */
export const resolveHazardGuideEntries = (
  rawSlug: string,
): HazardGuideEntry[] => {
  if (!rawSlug) return [];
  const tokens = rawSlug
    .split(/[,+]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const results: HazardGuideEntry[] = [];
  for (const token of tokens) {
    const entry = resolveHazardGuideEntry(token);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      results.push(entry);
    }
  }
  return results;
};
