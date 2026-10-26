/**
 * Astronomical Nomenclature Expansion, Clean-Key Generation & Multi-Key Lookup Utilities
 */

export const GREEK_BAYER_MAP: Record<string, string> = {
  alp: 'Alpha',
  bet: 'Beta',
  gam: 'Gamma',
  del: 'Delta',
  eps: 'Epsilon',
  zet: 'Zeta',
  eta: 'Eta',
  the: 'Theta',
  iot: 'Iota',
  kap: 'Kappa',
  lam: 'Lambda',
  mu: 'Mu',
  nu: 'Nu',
  xi: 'Xi',
  omi: 'Omicron',
  pi: 'Pi',
  rho: 'Rho',
  sig: 'Sigma',
  tau: 'Tau',
  ups: 'Upsilon',
  phi: 'Phi',
  chi: 'Chi',
  psi: 'Psi',
  ome: 'Omega',
};

export const IAU_CONSTELLATION_GENITIVE_MAP: Record<string, string> = {
  and: 'Andromedae',
  ant: 'Antliae',
  aps: 'Apodis',
  aqr: 'Aquarii',
  aql: 'Aquilae',
  ara: 'Arae',
  ari: 'Arietis',
  aur: 'Aurigae',
  boo: 'Bootis',
  cae: 'Caeli',
  cam: 'Camelopardalis',
  cnc: 'Cancri',
  cvn: 'Canum Venaticorum',
  cma: 'Canis Majoris',
  cmi: 'Canis Minoris',
  cap: 'Capricorni',
  car: 'Carinae',
  cas: 'Cassiopeiae',
  cen: 'Centauri',
  cep: 'Cephei',
  cet: 'Ceti',
  cha: 'Chamaeleontis',
  cir: 'Circini',
  col: 'Columbae',
  com: 'Comae Berenices',
  cra: 'Coronae Australis',
  crb: 'Coronae Borealis',
  crv: 'Corvi',
  crt: 'Crateris',
  cru: 'Crucis',
  cyg: 'Cygni',
  del: 'Delphini',
  dor: 'Doradus',
  dra: 'Draconis',
  equ: 'Equulei',
  eri: 'Eridani',
  for: 'Fornacis',
  gem: 'Geminorum',
  gru: 'Gruis',
  her: 'Herculis',
  hor: 'Horologii',
  hya: 'Hydrae',
  hyi: 'Hydri',
  ind: 'Indi',
  lac: 'Lacertae',
  leo: 'Leonis',
  lmi: 'Leonis Minoris',
  lep: 'Leporis',
  lib: 'Librae',
  lup: 'Lupi',
  lyn: 'Lyncis',
  lyr: 'Lyrae',
  men: 'Mensae',
  mic: 'Microscopii',
  mon: 'Monocerotis',
  mus: 'Muscae',
  nor: 'Normae',
  oct: 'Octantis',
  oph: 'Ophiuchi',
  ori: 'Orionis',
  pav: 'Pavonis',
  peg: 'Pegasi',
  per: 'Persei',
  phe: 'Phoenicis',
  pic: 'Pictoris',
  psc: 'Piscium',
  psa: 'Piscis Austrini',
  pup: 'Puppis',
  pyx: 'Pyxidis',
  ret: 'Reticuli',
  sge: 'Sagittae',
  sgr: 'Sagittarii',
  sco: 'Scorpii',
  scl: 'Sculptoris',
  sct: 'Scuti',
  ser: 'Serpentis',
  sex: 'Sextantis',
  tau: 'Tauri',
  tel: 'Telescopii',
  tri: 'Trianguli',
  tra: 'Trianguli Australis',
  tuc: 'Tucanae',
  uma: 'Ursae Majoris',
  umi: 'Ursae Minoris',
  vel: 'Velorum',
  vir: 'Virginis',
  vol: 'Volantis',
  vul: 'Vulpeculae',
};

export const IAU_CONSTELLATION_NOMINATIVE_MAP: Record<string, string> = {
  and: 'Andromeda',
  ant: 'Antlia',
  aps: 'Apus',
  aqr: 'Aquarius',
  aql: 'Aquila',
  ara: 'Ara',
  ari: 'Aries',
  aur: 'Auriga',
  boo: 'Bootes',
  cae: 'Caelum',
  cam: 'Camelopardalis',
  cnc: 'Cancer',
  cvn: 'Canes Venatici',
  cma: 'Canis Major',
  cmi: 'Canis Minor',
  cap: 'Capricornus',
  car: 'Carina',
  cas: 'Cassiopeia',
  cen: 'Centaurus',
  cep: 'Cepheus',
  cet: 'Cetus',
  cha: 'Chamaeleon',
  cir: 'Circinus',
  col: 'Columba',
  com: 'Coma Berenices',
  cra: 'Corona Australis',
  crb: 'Corona Borealis',
  crv: 'Corvus',
  crt: 'Crater',
  cru: 'Crux',
  cyg: 'Cygnus',
  del: 'Delphinus',
  dor: 'Dorado',
  dra: 'Draco',
  equ: 'Equuleus',
  eri: 'Eridanus',
  for: 'Fornax',
  gem: 'Gemini',
  gru: 'Grus',
  her: 'Hercules',
  hor: 'Horologium',
  hya: 'Hydra',
  hyi: 'Hydrus',
  ind: 'Indus',
  lac: 'Lacerta',
  leo: 'Leo',
  lmi: 'Leo Minor',
  lep: 'Lepus',
  lib: 'Libra',
  lup: 'Lupus',
  lyn: 'Lynx',
  lyr: 'Lyra',
  men: 'Mensa',
  mic: 'Microscopium',
  mon: 'Monoceros',
  mus: 'Musca',
  nor: 'Norma',
  oct: 'Octans',
  oph: 'Ophiuchus',
  ori: 'Orion',
  pav: 'Pavo',
  peg: 'Pegasus',
  per: 'Perseus',
  phe: 'Phoenix',
  pic: 'Pictor',
  psc: 'Pisces',
  psa: 'Piscis Austrinus',
  pup: 'Puppis',
  pyx: 'Pyxis',
  ret: 'Reticulum',
  sge: 'Sagitta',
  sgr: 'Sagittarius',
  sco: 'Scorpius',
  scl: 'Sculptor',
  sct: 'Scutum',
  ser: 'Serpens',
  sex: 'Sextans',
  tau: 'Taurus',
  tel: 'Telescopium',
  tri: 'Triangulum',
  tra: 'Triangulum Australe',
  tuc: 'Tucana',
  uma: 'Ursa Major',
  umi: 'Ursa Minor',
  vel: 'Vela',
  vir: 'Virgo',
  vol: 'Volans',
  vul: 'Vulpecula',
};

const GENITIVE_TO_NOMINATIVE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(IAU_CONSTELLATION_GENITIVE_MAP).map(([code, genitive]) => [
    genitive.toLowerCase(),
    IAU_CONSTELLATION_NOMINATIVE_MAP[code] ?? genitive,
  ]),
);

export const UNICODE_GREEK_TO_LATIN_MAP: Record<string, string> = {
  α: 'alpha',
  β: 'beta',
  γ: 'gamma',
  δ: 'delta',
  ε: 'epsilon',
  ζ: 'zeta',
  η: 'eta',
  θ: 'theta',
  ϑ: 'theta',
  ι: 'iota',
  κ: 'kappa',
  ϰ: 'kappa',
  λ: 'lambda',
  μ: 'mu',
  ν: 'nu',
  ξ: 'xi',
  ο: 'omicron',
  π: 'pi',
  ϖ: 'pi',
  ρ: 'rho',
  ϱ: 'rho',
  σ: 'sigma',
  ς: 'sigma',
  τ: 'tau',
  υ: 'upsilon',
  φ: 'phi',
  ϕ: 'phi',
  χ: 'chi',
  ψ: 'psi',
  ω: 'omega',
  Α: 'Alpha',
  Β: 'Beta',
  Γ: 'Gamma',
  Δ: 'Delta',
  Ε: 'Epsilon',
  Ζ: 'Zeta',
  Η: 'Eta',
  Θ: 'Theta',
  Ι: 'Iota',
  Κ: 'Kappa',
  Λ: 'Lambda',
  Μ: 'Mu',
  Ν: 'Nu',
  Ξ: 'Xi',
  Ο: 'Omicron',
  Π: 'Pi',
  Ρ: 'Rho',
  Σ: 'Sigma',
  Τ: 'Tau',
  Υ: 'Upsilon',
  Φ: 'Phi',
  Χ: 'Chi',
  Ψ: 'Psi',
  Ω: 'Omega',
};

export const SUPERSCRIPT_DIGIT_MAP: Record<string, string> = {
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁰': '0',
};

/**
 * Transliterates Unicode Greek characters (α–ω, Α–Ω, ς) into Latin names
 * and Unicode superscript digits (¹–⁹, ⁰) into standard Arabic digits.
 */
export function transliterateGreekAndSuperscripts(raw: string): string {
  let result = '';
  for (const char of raw) {
    if (UNICODE_GREEK_TO_LATIN_MAP[char]) {
      result += UNICODE_GREEK_TO_LATIN_MAP[char];
    } else if (SUPERSCRIPT_DIGIT_MAP[char]) {
      result += SUPERSCRIPT_DIGIT_MAP[char];
    } else {
      result += char;
    }
  }
  return result;
}

const GREEK_CANONICAL_EXPANSION_MAP: Record<string, string> = {
  alp: 'Alpha',
  alpha: 'Alpha',
  bet: 'Beta',
  beta: 'Beta',
  gam: 'Gamma',
  gamma: 'Gamma',
  del: 'Delta',
  delta: 'Delta',
  eps: 'Epsilon',
  epsilon: 'Epsilon',
  zet: 'Zeta',
  zeta: 'Zeta',
  eta: 'Eta',
  the: 'Theta',
  theta: 'Theta',
  iot: 'Iota',
  iota: 'Iota',
  kap: 'Kappa',
  kappa: 'Kappa',
  lam: 'Lambda',
  lambda: 'Lambda',
  mu: 'Mu',
  nu: 'Nu',
  xi: 'Xi',
  omi: 'Omicron',
  omicron: 'Omicron',
  pi: 'Pi',
  rho: 'Rho',
  sig: 'Sigma',
  sigma: 'Sigma',
  tau: 'Tau',
  ups: 'Upsilon',
  upsilon: 'Upsilon',
  phi: 'Phi',
  chi: 'Chi',
  psi: 'Psi',
  ome: 'Omega',
  omega: 'Omega',
};

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
 * Expands a HYG Greek Bayer abbreviation (e.g. "Alp", "Eps", "Kap-1", "Omi-2"),
 * Greek Unicode character (e.g. "τ", "α", "ε", "π³", "ο²"), or full name
 * into its full Latinized Greek letter name ("Alpha", "Epsilon", "Kappa-1", "Pi-3", "Omicron-2").
 */
export function expandGreekBayer(bayer: string): string {
  const trimmed = bayer.trim();
  if (!trimmed) return trimmed;

  const match = trimmed.match(
    /^([A-Za-z\u0370-\u03FF\u1F00-\u1FFF]+)(?:(?:-|\s+)([0-9]+)|([¹²³⁴⁵⁶⁷⁸⁹⁰]+)|([0-9]+))?$/,
  );
  if (!match) return trimmed;

  const rawPrefix = match[1];
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
 * Expands a 3-letter IAU constellation abbreviation (e.g. "Cet", "Eri", "CMa")
 * into its official Latin genitive ("Ceti", "Eridani", "Canis Majoris").
 */
export function expandConstellationGenitive(con: string): string {
  const trimmed = con.trim();
  const genitive = IAU_CONSTELLATION_GENITIVE_MAP[trimmed.toLowerCase()];
  return genitive || trimmed;
}

/**
 * Expands a Bayer or Flamsteed designation paired with an IAU constellation code
 * into a full human-readable designation (e.g. "Tau Ceti", "Epsilon Eridani", "40 Eridani").
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

const KNOWN_GENITIVE_MAP: Record<string, string> = Object.fromEntries(
  Object.values(IAU_CONSTELLATION_GENITIVE_MAP).map((gen) => [gen.toLowerCase(), gen]),
);

/**
 * Expands trailing IAU constellation abbreviations (or full genitives) and Greek Bayer prefixes
 * in Gould, Bayer, or exoplanet strings (e.g. "82 G. Eri" -> "82 G. Eridani",
 * "Tau Cet" -> "Tau Ceti", "tau Ceti e" -> "Tau Ceti e", "alp Canis Majoris" -> "Alpha Canis Majoris",
 * "omi 2 Eri" -> "Omicron-2 Eridani", "pi 3 Ori" -> "Pi-3 Orionis").
 */
export function expandGouldOrConstellationSuffix(rawName: string): string {
  const trimmed = rawName.trim();
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return trimmed;

  const trailingSuffix: string[] = [];
  const starTokens = [...tokens];

  // Peel off optional lowercase exoplanet letter suffix (b..z)
  if (starTokens.length > 2 && /^[b-z]$/.test(starTokens[starTokens.length - 1])) {
    const popped = starTokens.pop();
    if (popped) trailingSuffix.unshift(popped);
  }
  // Peel off optional uppercase binary component letter (A..D)
  if (starTokens.length > 2 && /^[A-D]$/.test(starTokens[starTokens.length - 1])) {
    const popped = starTokens.pop();
    if (popped) trailingSuffix.unshift(popped);
  }

  let genitive: string | undefined;
  let constellationTokenCount = 0;

  // 1. Check for two-word IAU constellation genitive (e.g. "Canis Majoris", "Ursae Majoris")
  if (starTokens.length >= 2) {
    const lastTwo = `${starTokens[starTokens.length - 2]} ${starTokens[starTokens.length - 1]}`.toLowerCase();
    if (KNOWN_GENITIVE_MAP[lastTwo]) {
      genitive = KNOWN_GENITIVE_MAP[lastTwo];
      constellationTokenCount = 2;
    }
  }

  // 2. Check for single-word IAU constellation abbreviation or genitive (e.g. "Cet", "Ceti", "Eri")
  if (!genitive && starTokens.length >= 1) {
    const lastOne = starTokens[starTokens.length - 1].toLowerCase();
    genitive = IAU_CONSTELLATION_GENITIVE_MAP[lastOne] || KNOWN_GENITIVE_MAP[lastOne];
    if (genitive) {
      constellationTokenCount = 1;
    }
  }

  if (!genitive) return trimmed;

  const remainingStarTokens = starTokens.slice(0, starTokens.length - constellationTokenCount);

  // If there are exactly two remaining tokens before constellation, check for space-separated numbered Bayer:
  // e.g. "omi 2 Eri" -> remainingStarTokens = ['omi', '2'] -> "Omicron-2"
  if (
    remainingStarTokens.length === 2 &&
    isGreekBayerPrefix(remainingStarTokens[0]) &&
    (/^\d+$/.test(remainingStarTokens[1]) || /^[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/.test(remainingStarTokens[1]))
  ) {
    const prefix = expandGreekBayer(remainingStarTokens[0]);
    const digits = transliterateGreekAndSuperscripts(remainingStarTokens[1]);
    remainingStarTokens.splice(0, 2, `${prefix}-${digits}`);
  } else if (remainingStarTokens.length === 1) {
    remainingStarTokens[0] = expandGreekBayer(remainingStarTokens[0]);
  }

  return [...remainingStarTokens, genitive, ...trailingSuffix].join(' ');
}

/**
 * Normalizes a raw designation or query into a lowercase alphanumeric clean key,
 * transliterating Unicode Greek characters (e.g. "τ" -> "tau", "α" -> "alpha")
 * and Unicode superscript digits (e.g. "³" -> "3").
 */
export function normalizeCleanKey(raw: string): string {
  const transliterated = transliterateGreekAndSuperscripts(raw);
  return transliterated.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Expands a Gliese / Jahreiß / Woolley catalog designation (e.g. "Gl 447", "GJ 887 b", "Gliese 581")
 * into its three canonical prefix forms ("Gl ...", "GJ ...", "Gliese ...").
 * Returns an empty array if the string does not start with a Gliese-family prefix.
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
 * Resolves the canonical proper name for a star system across IAU WGSN catalog names,
 * curated official star names, and HYG proper names, expanding any trailing constellation
 * or Gould shorthand.
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
 * Resolves the primary human-readable display title (`name`) for a star system following
 * astronomical nomenclature precedence:
 * 1. Proper Name (IAU / curated / HYG)
 * 2. Expanded Bayer or Flamsteed designation (e.g. "Tau Ceti", "40 Eridani")
 * 3. Gliese / GJ catalog number
 * 4. Hipparcos catalog number (`HIP <n>`)
 * 5. Henry Draper catalog number (`HD <n>`)
 * 6. Gaia DR3 source identifier (`Gaia DR3 <id>`)
 */
export function resolveStarDisplayName(input: StarTitleResolutionInput): string {
  const properName = resolveStarProperName(input);
  if (properName) {
    return properName;
  }

  const expandedBf = expandBayerOrFlamsteed(input.bayer, input.con, input.flam);
  if (expandedBf) {
    return expandedBf;
  }

  if (input.gl && input.gl.trim().length > 0) {
    return input.gl.trim();
  }

  if (input.hip !== undefined && input.hip !== null && !Number.isNaN(input.hip)) {
    return `HIP ${input.hip}`;
  }

  if (input.hd !== undefined && input.hd !== null && !Number.isNaN(input.hd)) {
    return `HD ${input.hd}`;
  }

  if (input.sourceId !== undefined && input.sourceId !== null && String(input.sourceId).trim().length > 0) {
    const rawSource = String(input.sourceId).trim();
    return rawSource.startsWith('gaia-')
      ? `Gaia DR3 ${rawSource.slice(5)}`
      : `Gaia DR3 ${rawSource}`;
  }

  if (input.fallbackId && input.fallbackId.trim().length > 0) {
    const rawFallback = input.fallbackId.trim();
    return rawFallback.startsWith('gaia-')
      ? `Gaia DR3 ${rawFallback.slice(5)}`
      : rawFallback;
  }

  return 'Unknown System';
}

/**
 * Builds a space-delimited string of clean keys from raw designation strings.
 * Deduplicates keys where a shorter key is a prefix of a longer key
 * on the same object (e.g. "taucet" is a prefix of "tauceti" -> keeps only "tauceti").
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
 * Collects all normalized lookup keys for a star across proper names, abbreviated and expanded
 * Bayer/Flamsteed designations, Gould designations, HD, HIP, HR, and Gliese (Gl/GJ/Gliese) catalogs.
 * Used both for multi-key exoplanet host cross-matching and search alias generation.
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

  // Include nominative constellation name when star has constellation code, genitive, or alias
  const nominativesToAdd = new Set<string>();

  if (star.con) {
    const conKey = star.con.trim().toLowerCase();
    const nom = IAU_CONSTELLATION_NOMINATIVE_MAP[conKey];
    if (nom) nominativesToAdd.add(nom);
  }

  for (const cand of rawCandidates) {
    if (!cand) continue;
    const lower = cand.toLowerCase();

    // Check two-word genitives (e.g. "canis majoris", "ursae majoris", "piscis austrini")
    for (const [genitive, nominative] of Object.entries(GENITIVE_TO_NOMINATIVE_MAP)) {
      if (genitive.includes(' ') && lower.includes(genitive)) {
        nominativesToAdd.add(nominative);
      }
    }

    // Check individual tokens for single-word genitives or 3-letter IAU codes
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
          // Disambiguate from English conjunction/preposition: require astronomical Bayer/Flamsteed context
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
