import {
  GREEK_CANONICAL_EXPANSION_MAP,
  SUPERSCRIPT_DIGIT_MAP,
  UNICODE_GREEK_TO_LATIN_MAP,
  transliterateGreekAndSuperscripts,
} from './bayerTables';
import {
  IAU_CONSTELLATION_GENITIVE_MAP,
  KNOWN_GENITIVE_MAP,
} from './constellationTables';

/**
 * Pure predicate determining whether a token is a recognized Greek Bayer prefix
 * in Latin abbreviation, Latin full name, or Unicode Greek script.
 */
export function isGreekBayerPrefix(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  const transliterated =
    UNICODE_GREEK_TO_LATIN_MAP[trimmed]?.toLowerCase() ?? trimmed.toLowerCase();
  return Boolean(GREEK_CANONICAL_EXPANSION_MAP[transliterated]);
}

/**
 * Expands a HYG Greek Bayer abbreviation, Greek Unicode character, or full name
 * into its full Latinized Greek letter name.
 */
export function expandGreekBayer(bayer: string): string {
  const trimmed = bayer.trim();
  if (!trimmed) return trimmed;

  const match = trimmed.match(
    /^([A-Za-z\u0370-\u03FF\u1F00-\u1FFF]+)(?:(?:-|\s+)([0-9]+)|([¹²³⁴⁵⁶⁷⁸⁹⁰]+)|([0-9]+))?$/,
  );
  if (!match) return trimmed;

  const rawPrefix = match[1];
  if (rawPrefix === undefined) return trimmed;
  const hyphenOrSpaceSuffix = match[2];
  const superscriptSuffix = match[3];
  const plainDigitSuffix = match[4];

  const transliterated =
    UNICODE_GREEK_TO_LATIN_MAP[rawPrefix]?.toLowerCase() ?? rawPrefix.toLowerCase();
  const expanded = GREEK_CANONICAL_EXPANSION_MAP[transliterated];
  if (!expanded) return trimmed;

  if (hyphenOrSpaceSuffix !== undefined) {
    return `${expanded}-${hyphenOrSpaceSuffix}`;
  }

  if (superscriptSuffix !== undefined) {
    const digits = superscriptSuffix
      .split('')
      .map((ch) => SUPERSCRIPT_DIGIT_MAP[ch] ?? ch)
      .join('');
    return `${expanded}-${digits}`;
  }

  if (plainDigitSuffix !== undefined) {
    return `${expanded}${plainDigitSuffix}`;
  }

  return expanded;
}

/**
 * Expands a 3-letter IAU constellation abbreviation into its official Latin genitive.
 */
export function expandConstellationGenitive(con: string): string {
  const trimmed = con.trim();
  const genitive = IAU_CONSTELLATION_GENITIVE_MAP[trimmed.toLowerCase()];
  return genitive || trimmed;
}

/**
 * Expands a Bayer or Flamsteed designation paired with an IAU constellation code
 * into a full human-readable designation (e.g. "Tau Ceti", "40 Eridani").
 */
export function expandBayerOrFlamsteed(
  bayer?: string | null,
  con?: string | null,
  flam?: number | null,
): string | undefined {
  if (!con || !con.trim()) return undefined;
  const genitive = expandConstellationGenitive(con);

  if (bayer && bayer.trim().length > 0) {
    return `${expandGreekBayer(bayer)} ${genitive}`;
  }

  if (flam !== undefined && flam !== null && !isNaN(flam)) {
    return `${flam} ${genitive}`;
  }

  return undefined;
}

/**
 * Expands trailing IAU constellation abbreviations and Greek Bayer prefixes in Gould,
 * Bayer, or exoplanet strings (e.g. "82 G. Eri" -> "82 G. Eridani", "Tau Cet" -> "Tau Ceti").
 */
export function expandGouldOrConstellationSuffix(rawName: string): string {
  const trimmed = rawName.trim();
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return trimmed;

  const trailingSuffix: string[] = [];
  const starTokens = [...tokens];

  const lastBeforePlanet = starTokens.at(-1);
  if (starTokens.length > 2 && lastBeforePlanet !== undefined && /^[b-z]$/.test(lastBeforePlanet)) {
    const popped = starTokens.pop();
    if (popped) trailingSuffix.unshift(popped);
  }
  const lastBeforeComp = starTokens.at(-1);
  if (starTokens.length > 2 && lastBeforeComp !== undefined && /^[A-D]$/.test(lastBeforeComp)) {
    const popped = starTokens.pop();
    if (popped) trailingSuffix.unshift(popped);
  }

  let genitive: string | undefined;
  let constellationTokenCount = 0;

  if (starTokens.length >= 2) {
    const lastTwo = `${starTokens[starTokens.length - 2]} ${starTokens[starTokens.length - 1]}`.toLowerCase();
    if (KNOWN_GENITIVE_MAP[lastTwo]) {
      genitive = KNOWN_GENITIVE_MAP[lastTwo];
      constellationTokenCount = 2;
    }
  }

  const lastToken = starTokens.at(-1);
  if (!genitive && lastToken !== undefined) {
    const lastOne = lastToken.toLowerCase();
    genitive = IAU_CONSTELLATION_GENITIVE_MAP[lastOne] || KNOWN_GENITIVE_MAP[lastOne];
    if (genitive) {
      constellationTokenCount = 1;
    }
  }

  if (!genitive) return trimmed;

  const remainingStarTokens = starTokens.slice(0, starTokens.length - constellationTokenCount);

  const firstToken = remainingStarTokens[0];
  const secondToken = remainingStarTokens[1];
  if (
    remainingStarTokens.length === 2 &&
    firstToken !== undefined &&
    secondToken !== undefined &&
    isGreekBayerPrefix(firstToken) &&
    (/^\d+$/.test(secondToken) || /^[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/.test(secondToken))
  ) {
    const prefix = expandGreekBayer(firstToken);
    const digits = transliterateGreekAndSuperscripts(secondToken);
    remainingStarTokens.splice(0, 2, `${prefix}-${digits}`);
  } else if (remainingStarTokens.length === 1 && firstToken !== undefined) {
    remainingStarTokens[0] = expandGreekBayer(firstToken);
  }

  return [...remainingStarTokens, genitive, ...trailingSuffix].join(' ');
}

/**
 * Pure formatter turning a URL slug (e.g. `'tau-ceti'`) into a human-readable fallback title (`'Tau Ceti'`).
 */
export function formatSlugFallbackTitle(slug: string): string {
  return slug
    .trim()
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface StarTitleResolutionInput {
  readonly properName?: string | null;
  readonly hygProperName?: string | null;
  readonly iauProperName?: string | null;
  readonly officialProperName?: string | null;
  readonly bayer?: string | null;
  readonly flam?: number | null;
  readonly con?: string | null;
  readonly gl?: string | null;
  readonly hip?: number | null;
  readonly hd?: number | null;
  readonly sourceId?: string | number | null;
  readonly fallbackId?: string | null;
}

/**
 * Resolves the canonical proper name for a star system across catalog sources.
 */
export function resolveStarProperName(input: StarTitleResolutionInput): string | undefined {
  if (input.properName && input.properName.trim().length > 0) {
    return expandGouldOrConstellationSuffix(input.properName);
  }
  if (input.iauProperName && input.iauProperName.trim().length > 0) {
    return expandGouldOrConstellationSuffix(input.iauProperName);
  }
  if (input.hygProperName && input.hygProperName.trim().length > 0) {
    return expandGouldOrConstellationSuffix(input.hygProperName);
  }
  if (input.officialProperName && input.officialProperName.trim().length > 0) {
    return input.officialProperName.trim();
  }
  return undefined;
}

/**
 * Resolves primary human-readable display title (`name`) for a star system.
 */
export function resolveStarDisplayName(input: StarTitleResolutionInput): string {
  const properName = resolveStarProperName(input);
  if (properName) return properName;

  const expandedBf = expandBayerOrFlamsteed(input.bayer, input.con, input.flam);
  if (expandedBf) return expandedBf;

  if (input.gl && input.gl.trim().length > 0) return input.gl.trim();

  if (input.hip !== undefined && input.hip !== null && !Number.isNaN(input.hip)) {
    return `HIP ${input.hip}`;
  }

  if (input.hd !== undefined && input.hd !== null && !Number.isNaN(input.hd)) {
    return `HD ${input.hd}`;
  }

  if (input.sourceId !== undefined && input.sourceId !== null && String(input.sourceId).trim().length > 0) {
    const rawSource = String(input.sourceId).trim();
    return rawSource.startsWith('gaia-') ? `Gaia DR3 ${rawSource.slice(5)}` : `Gaia DR3 ${rawSource}`;
  }

  if (input.fallbackId && input.fallbackId.trim().length > 0) {
    const rawFallback = input.fallbackId.trim();
    return rawFallback.startsWith('gaia-') ? `Gaia DR3 ${rawFallback.slice(5)}` : rawFallback;
  }

  return 'Unknown System';
}
