import type { ObservationalConfidence } from './astro';

/**
 * Category of a dataset layer (`FS-001` Fictional Canon Layers & `FS-002` Custom User Layers).
 */
export type DatasetLayerKind = 'fictional-canon' | 'custom-user' | 'scientific-overlay';

/**
 * Target entity kind annotated by a dataset layer entry.
 */
export type DatasetLayerTargetType =
  | 'system'
  | 'planet'
  | 'moon'
  | 'structure'
  | 'minor-body'
  | 'fictional-body';

/**
 * Bibliographic & source metadata block for a dataset layer.
 */
export interface DatasetLayerSourceMeta {
  /** Summary of the source work and how real-sky astronomy/cartography is used in its canon */
  summary: string;
  /** Primary author(s), creator(s), or studio (e.g. "Andy Weir", "Cixin Liu", "Gene Roddenberry") */
  creator: string;
  /** Original publication or release year/span (e.g. "2021", "2006–2010", "1966–present") */
  publicationYear?: string;
  /** Medium or format (e.g. "Novel", "Novel Trilogy", "TV & Film Franchise", "Video Game Franchise") */
  medium?: string;
  /** Specific canonical reference book, atlas, or source used for star coordinates */
  canonicalReference?: string;
  /** Authoritative reference link (Wikipedia or official canon encyclopedia URL) */
  url?: string;
}

/**
 * Flattened annotation record for a specific celestial entity inside a dataset layer.
 * Every entry attaches to a real host star system (`systemId`) so Galactic View highlighting
 * and System View drill-down work uniformly for systems, real exoplanets, and fictional bodies.
 */
export interface DatasetLayerEntry {
  targetId: string;
  targetType: DatasetLayerTargetType;
  /** Real host star system ID in the Starmap catalog */
  systemId: string;
  /** Optional sequence order for stepped waypoints and curated tours (DEC-036b) */
  order?: number;
  /** Optional parent celestial body ID for moons and orbiting structures (DEC-038) */
  parentBodyId?: string;
  /**
   * Optional distinctive in-universe name. Omit whenever identical to the real-sky
   * star/body name; the UI and search resolve the real name from `targetId` / `systemId`.
   * Zero brackets.
   */
  inUniverseName?: string;
  /**
   * Precalculated real-sky display name resolved at build time from catalogue data
   * when `inUniverseName` is omitted (DL-02).
   */
  resolvedName?: string;
  /** Optional short role/context label (e.g. `Astrophage Destination`). Zero brackets. */
  subtitle?: string;
  text: string;
  workTitle?: string;
  /**
   * Space-delimited delta-only search tokens. Must never repeat words already present in
   * `inUniverseName`, `subtitle`, or the parent `title`, nor the real-sky host name.
   */
  aliases?: string;
  confidence?: ObservationalConfidence;
}

/**
 * Unified Dataset Layer Manifest supporting both static fictional canons (`FS-001`)
 * and user-authored custom note layers (`FS-002`).
 */
export interface DatasetLayerManifest {
  layerId: string;
  /** Shortest unambiguous canonical name (zero brackets, no "Universe"/"Canon" suffix) */
  title: string;
  /** Strictly optional secondary title; omit by default */
  subtitle?: string;
  kind: DatasetLayerKind;
  description: string;
  version: number;
  /**
   * Space-delimited non-redundant search tokens, including researched book-author
   * surnames (DL-01 / DL-06).
   */
  aliases?: string;
  source?: DatasetLayerSourceMeta;
  entries: Record<string, DatasetLayerEntry>;
}

/**
 * Summary entry in `public/data/overlays/layers/index.json`.
 */
export interface DatasetLayerIndexEntry {
  layerId: string;
  title: string;
  kind: DatasetLayerKind;
  description: string;
  source?: DatasetLayerSourceMeta;
  entryCount: number;
  path: string;
}
