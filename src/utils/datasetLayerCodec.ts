import type {
  DatasetLayerKind,
  DatasetLayerTargetType,
  DatasetLayerSourceMeta,
  DatasetLayerEntry,
  DatasetLayerManifest,
  DatasetLayerIndexEntry,
} from '../types/astro';
import {
  CONFIDENCE_TO_CODE,
  CODE_TO_CONFIDENCE,
  type CompactSearchEntry,
} from './compactDataCodec';
import { buildCleanKeys } from './nomenclature';

const LAYER_KIND_TO_CODE: Record<DatasetLayerKind, number> = {
  'fictional-canon': 1,
  'custom-user': 2,
  'scientific-overlay': 3,
};

const CODE_TO_LAYER_KIND: Record<number, DatasetLayerKind> = {
  1: 'fictional-canon',
  2: 'custom-user',
  3: 'scientific-overlay',
};

const TARGET_TYPE_TO_CODE: Record<DatasetLayerTargetType, number> = {
  system: 1,
  planet: 2,
  moon: 3,
  structure: 4,
  'minor-body': 5,
  'fictional-body': 6,
};

const CODE_TO_TARGET_TYPE: Record<number, DatasetLayerTargetType> = {
  1: 'system',
  2: 'planet',
  3: 'moon',
  4: 'structure',
  5: 'minor-body',
  6: 'fictional-body',
};

export interface CompactLayerSourceMeta {
  s: string;
  a: string;
  y?: string;
  m?: string;
  r?: string;
  u?: string;
}

export interface CompactLayerEntry {
  k?: number;
  s?: string;
  u?: string;
  x: string;
  w?: string;
  a?: string[];
  g?: string[];
  c?: 2 | 3 | 4;
}

export interface CompactLayerManifest {
  i: string;
  n: string;
  k: number;
  d: string;
  v: number;
  b?: CompactLayerSourceMeta;
  e: Record<string, CompactLayerEntry>;
}

function encodeSourceMeta(source?: DatasetLayerSourceMeta): CompactLayerSourceMeta | undefined {
  if (!source) return undefined;
  const b: CompactLayerSourceMeta = {
    s: source.summary,
    a: source.creator,
  };
  if (source.publicationYear) b.y = source.publicationYear;
  if (source.medium) b.m = source.medium;
  if (source.canonicalReference) b.r = source.canonicalReference;
  if (source.url) b.u = source.url;
  return b;
}

function decodeSourceMeta(b?: CompactLayerSourceMeta): DatasetLayerSourceMeta | undefined {
  if (!b) return undefined;
  const source: DatasetLayerSourceMeta = {
    summary: b.s,
    creator: b.a,
  };
  if (b.y) source.publicationYear = b.y;
  if (b.m) source.medium = b.m;
  if (b.r) source.canonicalReference = b.r;
  if (b.u) source.url = b.u;
  return source;
}

/**
 * Encodes a DatasetLayerManifest into its minified 1-letter keyed dictionary format (`DEC-007`).
 */
export function encodeLayerManifest(manifest: DatasetLayerManifest): CompactLayerManifest {
  const compactEntries: Record<string, CompactLayerEntry> = {};

  for (const [targetId, entry] of Object.entries(manifest.entries)) {
    const k = TARGET_TYPE_TO_CODE[entry.targetType] ?? 1;
    const compactEntry: CompactLayerEntry = {
      x: entry.text,
    };

    if (k !== 1) compactEntry.k = k;
    if (entry.systemId && entry.systemId !== targetId) {
      compactEntry.s = entry.systemId;
    }
    if (entry.inUniverseName) compactEntry.u = entry.inUniverseName;
    if (entry.workTitle) compactEntry.w = entry.workTitle;
    if (entry.aliases && entry.aliases.length > 0) compactEntry.a = entry.aliases;
    if (entry.tags && entry.tags.length > 0) compactEntry.g = entry.tags;
    if (entry.confidence && entry.confidence !== 'confirmed') {
      const code = CONFIDENCE_TO_CODE[entry.confidence];
      if (code !== 1) compactEntry.c = code;
    }

    compactEntries[targetId] = compactEntry;
  }

  const compact: CompactLayerManifest = {
    i: manifest.layerId,
    n: manifest.title,
    k: LAYER_KIND_TO_CODE[manifest.kind] ?? 1,
    d: manifest.description,
    v: manifest.version,
    e: compactEntries,
  };

  const b = encodeSourceMeta(manifest.source);
  if (b) compact.b = b;

  return compact;
}

/**
 * Decodes a minified CompactLayerManifest back into a full DatasetLayerManifest.
 */
export function decodeLayerManifest(compact: CompactLayerManifest): DatasetLayerManifest {
  const entries: Record<string, DatasetLayerEntry> = {};

  for (const [targetId, ce] of Object.entries(compact.e)) {
    const entry: DatasetLayerEntry = {
      targetId,
      targetType: CODE_TO_TARGET_TYPE[ce.k ?? 1] ?? 'system',
      systemId: ce.s ?? targetId,
      text: ce.x,
      confidence: ce.c ? (CODE_TO_CONFIDENCE[ce.c] ?? 'confirmed') : 'confirmed',
    };
    if (ce.u) entry.inUniverseName = ce.u;
    if (ce.w) entry.workTitle = ce.w;
    if (ce.a && ce.a.length > 0) entry.aliases = ce.a;
    if (ce.g && ce.g.length > 0) entry.tags = ce.g;

    entries[targetId] = entry;
  }

  const manifest: DatasetLayerManifest = {
    layerId: compact.i,
    title: compact.n,
    kind: CODE_TO_LAYER_KIND[compact.k] ?? 'fictional-canon',
    description: compact.d,
    version: compact.v,
    entries,
  };

  const source = decodeSourceMeta(compact.b);
  if (source) manifest.source = source;

  return manifest;
}

export interface ResolvedLayerAnnotation {
  layerId: string;
  layerTitle: string;
  kind: DatasetLayerKind;
  source?: DatasetLayerSourceMeta;
  entry: DatasetLayerEntry;
}

/**
 * Resolves all layer annotations targeting a given `targetId` across active layers in O(1) per layer.
 */
export function resolveEntityLayers(
  targetId: string,
  activeLayers: DatasetLayerManifest[],
): ResolvedLayerAnnotation[] {
  const results: ResolvedLayerAnnotation[] = [];

  for (const layer of activeLayers) {
    const entry = layer.entries[targetId];
    if (entry) {
      results.push({
        layerId: layer.layerId,
        layerTitle: layer.title,
        kind: layer.kind,
        source: layer.source,
        entry,
      });
    }
  }

  return results;
}

/**
 * Resolves all layer annotations belonging to a given host star system (`systemId`),
 * including the system itself, its catalogued exoplanets, and any attached `fictional-body` worlds.
 */
export function resolveSystemLayerEntries(
  systemId: string,
  activeLayers: DatasetLayerManifest[],
): ResolvedLayerAnnotation[] {
  const results: ResolvedLayerAnnotation[] = [];

  for (const layer of activeLayers) {
    for (const entry of Object.values(layer.entries)) {
      if (entry.systemId === systemId || entry.targetId === systemId) {
        results.push({
          layerId: layer.layerId,
          layerTitle: layer.title,
          kind: layer.kind,
          source: layer.source,
          entry,
        });
      }
    }
  }

  return results;
}

/**
 * Converts DatasetLayerManifest entries into `CompactSearchEntry` records (`k = 7` fiction)
 * for inclusion in `public/data/search/fiction.json`, `core.json`, and `full.json`.
 */
export function buildSearchEntriesFromLayers(
  layers: DatasetLayerManifest[],
  coordsById: Map<string, [number, number, number]>,
): CompactSearchEntry[] {
  const searchEntries: CompactSearchEntry[] = [];

  for (const layer of layers) {
    for (const [targetId, entry] of Object.entries(layer.entries)) {
      const displayName = entry.inUniverseName || `${layer.title} (${targetId})`;
      const cleanKeys = buildCleanKeys([
        displayName,
        layer.title,
        ...(entry.aliases ?? []),
        entry.workTitle,
        ...(entry.tags ?? []),
      ]);

      const coords = coordsById.get(targetId) ?? coordsById.get(entry.systemId);
      const searchId = targetId.startsWith(`${layer.layerId}:`)
        ? targetId
        : `${layer.layerId}:${targetId}`;
      const searchEntry: CompactSearchEntry = {
        i: searchId,
        k: 7,
        n: displayName,
        s: entry.systemId,
        w: layer.layerId,
        c: layer.title,
        a: cleanKeys,
      };

      if (coords && (coords[0] !== 0 || coords[1] !== 0 || coords[2] !== 0)) {
        searchEntry.p = coords;
      }
      if (
        entry.systemId === 'sol' ||
        targetId === 'sol' ||
        targetId === 'earth' ||
        targetId === 'mars' ||
        targetId === 'europa' ||
        targetId === 'ganymede' ||
        targetId === 'titan'
      ) {
        searchEntry.h = 1;
      }

      searchEntries.push(searchEntry);
    }
  }

  return searchEntries;
}

/**
 * Builds the `public/data/overlays/layers/index.json` summary envelope.
 */
export function buildLayerIndexManifest(layers: DatasetLayerManifest[]): {
  i: string;
  n: string;
  c: number;
  d: DatasetLayerIndexEntry[];
} {
  return {
    i: 'dataset-layers-index',
    n: 'Dataset Layers Registry (FS-001 & FS-002)',
    c: layers.length,
    d: layers.map((l) => ({
      layerId: l.layerId,
      title: l.title,
      kind: l.kind,
      description: l.description,
      ...(l.source ? { source: l.source } : {}),
      entryCount: Object.keys(l.entries).length,
      path: `/data/overlays/layers/${l.layerId}.json`,
    })),
  };
}

/**
 * Seed Fictional Canon Layers (`FS-001`) emitted to `public/data/overlays/layers/`.
 */
export const SEED_FICTIONAL_CANON_LAYERS: DatasetLayerManifest[] = [
  {
    layerId: 'canon-project-hail-mary',
    title: 'Project Hail Mary',
    kind: 'fictional-canon',
    description: 'Stellar systems and worlds featured in Andy Weir’s Project Hail Mary.',
    version: 1,
    source: {
      summary:
        'Hard science-fiction novel in which solar-dimming Astrophage infects local stars within ~20 light-years of Sol except Tau Ceti, prompting humanity to launch the Hail Mary while the Eridian civilization launches the Blip-A from 40 Eridani.',
      creator: 'Andy Weir',
      publicationYear: '2021',
      medium: 'Novel',
      canonicalReference: 'Project Hail Mary (Ballantine Books, 2021)',
      url: 'https://en.wikipedia.org/wiki/Project_Hail_Mary',
    },
    entries: {
      'gaia-2452378776434477184': {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Tau Ceti (Astrophage Destination)',
        text: 'Only nearby star immune to Astrophage dimming; destination of the Hail Mary and Blip-A.',
        workTitle: 'Project Hail Mary',
        aliases: ['Project Hail Mary', 'Hail Mary', 'Astrophage', 'Petrova'],
        tags: ['Astrophage', 'Hail Mary'],
        confidence: 'confirmed',
      },
      'tau-ceti-e': {
        targetId: 'tau-ceti-e',
        targetType: 'planet',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Adrian',
        text: 'Super-Earth in Tau Ceti where Ryland Grace and Rocky harvest natural Astrophage predators (Taumoeba).',
        workTitle: 'Project Hail Mary',
        aliases: ['Adrian', 'Taumoeba World'],
        tags: ['Adrian', 'Taumoeba'],
        confidence: 'confirmed',
      },
      'gaia-3195919528989223040': {
        targetId: 'gaia-3195919528989223040',
        targetType: 'system',
        systemId: 'gaia-3195919528989223040',
        inUniverseName: '40 Eridani (Erid)',
        text: 'Home system of Rocky and the Eridian civilization aboard the Blip-A.',
        workTitle: 'Project Hail Mary',
        aliases: ['Erid', 'Eridians', 'Rocky'],
        tags: ['Erid', 'Rocky'],
        confidence: 'confirmed',
      },
    },
  },
  {
    layerId: 'canon-star-trek',
    title: 'Star Trek Canon',
    kind: 'fictional-canon',
    description: 'Real-sky star systems mapped in official Star Trek Star Charts canon.',
    version: 1,
    source: {
      summary:
        'United Federation of Planets astrometric cartography linking Alpha and Beta Quadrant worlds to real Hipparcos and Gliese stars in the solar neighbourhood.',
      creator: 'Gene Roddenberry / Geoffrey Mandel',
      publicationYear: '1966–present',
      medium: 'TV & Film Franchise',
      canonicalReference: 'Star Trek Star Charts (Pocket Books, 2002)',
      url: 'https://en.wikipedia.org/wiki/Star_Trek',
    },
    entries: {
      'gaia-3195919528989223040': {
        targetId: 'gaia-3195919528989223040',
        targetType: 'system',
        systemId: 'gaia-3195919528989223040',
        inUniverseName: 'Vulcan System (40 Eridani A)',
        text: 'Home system of the Vulcans (40 Eridani A / Keid), ratified by Gene Roddenberry and the Harvard-Smithsonian / IAU team.',
        workTitle: 'Star Trek',
        aliases: ['Vulcan System', 'NiVar System', 'Star Trek'],
        tags: ['Vulcan', 'Federation'],
        confidence: 'confirmed',
      },
      'canon-star-trek:vulcan': {
        targetId: 'canon-star-trek:vulcan',
        targetType: 'fictional-body',
        systemId: 'gaia-3195919528989223040',
        inUniverseName: 'Vulcan (NiVar)',
        text: 'M-class desert homeworld orbiting 40 Eridani A; founding member of the United Federation of Planets.',
        workTitle: 'Star Trek',
        aliases: ['Vulcan', 'NiVar', 'TKhasi'],
        tags: ['Vulcan', 'Federation'],
        confidence: 'confirmed',
      },
      'hip-37279': {
        targetId: 'hip-37279',
        targetType: 'system',
        systemId: 'hip-37279',
        inUniverseName: 'Andoria (Procyon VIII)',
        text: 'Icy M-class moon orbiting a ringed gas giant in the Procyon (Alpha Canis Minoris) system; homeworld of the Andorians and founding Federation member.',
        workTitle: 'Star Trek',
        aliases: ['Andoria', 'Andor', 'Procyon VIII'],
        tags: ['Andoria', 'Federation'],
        confidence: 'confirmed',
      },
      'gaia-1872046609345556480': {
        targetId: 'gaia-1872046609345556480',
        targetType: 'system',
        systemId: 'gaia-1872046609345556480',
        inUniverseName: 'Tellar Prime (61 Cygni)',
        text: 'Homeworld of the Tellarites in the 61 Cygni binary system and founding member of the United Federation of Planets.',
        workTitle: 'Star Trek',
        aliases: ['Tellar Prime', 'Tellar', '61 Cygni'],
        tags: ['Tellar Prime', 'Federation'],
        confidence: 'confirmed',
      },
      'gaia-3864972938605115520': {
        targetId: 'gaia-3864972938605115520',
        targetType: 'system',
        systemId: 'gaia-3864972938605115520',
        inUniverseName: 'Wolf 359 (Battle of Wolf 359)',
        text: 'Red dwarf system 7.86 light-years from Sol where Starfleet fought the Borg Cube in 2367 (The Best of Both Worlds).',
        workTitle: 'Star Trek: The Next Generation',
        aliases: ['Wolf 359', 'Battle of Wolf 359', 'Borg Cube Battle'],
        tags: ['Wolf 359', 'Borg', 'Starfleet'],
        confidence: 'confirmed',
      },
      'hip-12390': {
        targetId: 'hip-12390',
        targetType: 'system',
        systemId: 'hip-12390',
        inUniverseName: 'Risa (Epsilon Ceti)',
        text: 'Federation pleasure planet orbiting in the Epsilon Ceti binary system, renowned for its climate-controlled tropical resorts.',
        workTitle: 'Star Trek: The Next Generation',
        aliases: ['Risa', 'Epsilon Ceti'],
        tags: ['Risa', 'Federation'],
        confidence: 'confirmed',
      },
      'hip-14135': {
        targetId: 'hip-14135',
        targetType: 'system',
        systemId: 'hip-14135',
        inUniverseName: 'Ceti Alpha V (Alpha Ceti / Menkar)',
        text: 'Harsh desert world in the Alpha Ceti system where Khan Noonien Singh and the Botany Bay crew were exiled prior to Star Trek II: The Wrath of Khan.',
        workTitle: 'Star Trek II: The Wrath of Khan',
        aliases: ['Ceti Alpha', 'Ceti Alpha V', 'Ceti Alpha VI', 'Wrath of Khan'],
        tags: ['Ceti Alpha', 'Khan'],
        confidence: 'confirmed',
      },
      'canon-star-trek:babel': {
        targetId: 'canon-star-trek:babel',
        targetType: 'fictional-body',
        systemId: 'gaia-3195919528989223040',
        inUniverseName: 'Babel (Neutral Conference World)',
        text: 'Neutral planetoid near the Vulcan/Andorian border hosting historic Federation diplomatic conferences (Journey to Babel).',
        workTitle: 'Star Trek: The Original Series',
        aliases: ['Babel', 'Journey to Babel'],
        tags: ['Babel', 'Federation'],
        confidence: 'candidate',
      },
      'gaia-5164707970261890560': {
        targetId: 'gaia-5164707970261890560',
        targetType: 'system',
        systemId: 'gaia-5164707970261890560',
        inUniverseName: 'Axanar / Epsilon Eridani',
        text: 'Major Federation core system and historical site in Star Trek Star Charts.',
        workTitle: 'Star Trek',
        aliases: ['Axanar', 'Starfleet Shipyard'],
        tags: ['Federation', 'Epsilon Eridani'],
        confidence: 'confirmed',
      },
      sol: {
        targetId: 'sol',
        targetType: 'system',
        systemId: 'sol',
        inUniverseName: 'Sector 001 (Sol / Terra)',
        text: 'Capital system of the United Federation of Planets and headquarters of Starfleet Command.',
        workTitle: 'Star Trek',
        aliases: ['Sector 001', 'Starfleet Command', 'United Federation of Planets'],
        tags: ['Sector 001', 'Federation'],
        confidence: 'confirmed',
      },
    },
  },
  {
    layerId: 'canon-three-body',
    title: 'Remembrance of Earth’s Past (Three-Body)',
    kind: 'fictional-canon',
    description: 'Systems featured in Liu Cixin’s The Three-Body Problem trilogy.',
    version: 1,
    source: {
      summary:
        'Hard science-fiction trilogy beginning with first contact between Earth and the chaotic triple-star system of Alpha Centauri (Trisolaris), 4.2 light-years away.',
      creator: 'Liu Cixin',
      publicationYear: '2006–2010',
      medium: 'Novel Trilogy',
      canonicalReference: 'The Three-Body Problem / The Dark Forest / Death’s End',
      url: 'https://en.wikipedia.org/wiki/Remembrance_of_Earth%27s_Past',
    },
    entries: {
      'gaia-5853498713190525696': {
        targetId: 'gaia-5853498713190525696',
        targetType: 'system',
        systemId: 'gaia-5853498713190525696',
        inUniverseName: 'Trisolaris (Alpha Centauri)',
        text: 'Chaotic triple-star system 4.2 light-years from Sol housing the Trisolaran civilization.',
        workTitle: 'The Three-Body Problem',
        aliases: ['Trisolaris', 'Three-Body Problem', 'San-Ti', 'Sophon'],
        tags: ['Trisolaris', 'Dark Forest'],
        confidence: 'confirmed',
      },
      'canon-three-body:dx3906': {
        targetId: 'canon-three-body:dx3906',
        targetType: 'fictional-body',
        systemId: 'gaia-5853498713190525696',
        inUniverseName: 'DX3906 (Planet Blue / Our Star)',
        text: 'Dim red dwarf system gifted to Cheng Xin by Yun Tianming in Death’s End, orbiting two terrestrial worlds (Planet Blue and Planet Gray) where Cheng Xin and Guan Yifan experience curvature-propulsion death lines.',
        workTitle: 'Death’s End',
        aliases: ['DX3906', 'Planet Blue', 'Our Star', 'Death’s End'],
        tags: ['DX3906', 'Cheng Xin', 'Death Line'],
        confidence: 'candidate',
      },
    },
  },
  {
    layerId: 'canon-halo',
    title: 'Halo Universe',
    kind: 'fictional-canon',
    description: 'UNSC colonial star systems in the Halo universe.',
    version: 1,
    source: {
      summary:
        'Military science-fiction universe in which the United Nations Space Command (UNSC) colonises real nearby stars within the local 50-parsec solar neighbourhood, anchored by the fortress world Reach in the Epsilon Eridani system.',
      creator: 'Bungie / 343 Industries / Eric Nylund',
      publicationYear: '2001–present',
      medium: 'Video Game & Novel Franchise',
      canonicalReference: 'Halo Encyclopedia (Dark Horse Books, 2022) & Halo: The Fall of Reach (2001)',
      url: 'https://en.wikipedia.org/wiki/Halo_(franchise)',
    },
    entries: {
      'gaia-5164707970261890560': {
        targetId: 'gaia-5164707970261890560',
        targetType: 'system',
        systemId: 'gaia-5164707970261890560',
        inUniverseName: 'Epsilon Eridani System (FLEETCOM Sector One)',
        text: 'Primary naval hub of the UNSC Inner Colonies and site of the Fall of Reach in 2552.',
        workTitle: 'Halo: The Fall of Reach',
        aliases: ['FLEETCOM Sector One', 'Halo'],
        tags: ['Reach', 'UNSC'],
        confidence: 'confirmed',
      },
      'canon-halo:reach': {
        targetId: 'canon-halo:reach',
        targetType: 'fictional-body',
        systemId: 'gaia-5164707970261890560',
        inUniverseName: 'Reach (Epsilon Eridani II)',
        text: 'Fortress world and second planet of Epsilon Eridani; headquarters of UNSC FLEETCOM and the SPARTAN-II program before its glassing by the Covenant.',
        workTitle: 'Halo: The Fall of Reach',
        aliases: ['Reach', 'Epsilon Eridani II', 'UNSC Fleet Command', 'FLEETCOM'],
        tags: ['Reach', 'UNSC', 'Inner Colonies'],
        confidence: 'confirmed',
      },
      'gaia-6412595290592307840': {
        targetId: 'gaia-6412595290592307840',
        targetType: 'system',
        systemId: 'gaia-6412595290592307840',
        inUniverseName: 'Harvest (Epsilon Indi IV)',
        text: 'Agricultural UNSC Outer Colony orbiting Epsilon Indi; site of humanity’s first contact with the Covenant in 2525.',
        workTitle: 'Halo: Contact Harvest',
        aliases: ['Harvest', 'Epsilon Indi IV', 'Contact Harvest'],
        tags: ['Harvest', 'UNSC', 'Outer Colonies'],
        confidence: 'confirmed',
      },
      'gaia-6226694571859532800': {
        targetId: 'gaia-6226694571859532800',
        targetType: 'system',
        systemId: 'gaia-6226694571859532800',
        inUniverseName: 'Madrigal (23 Librae)',
        text: 'Resource-rich UNSC Outer Colony and Insurrectionist stronghold in the 23 Librae system.',
        workTitle: 'Halo: The Cole Protocol',
        aliases: ['Madrigal', '23 Librae', 'The Rubble'],
        tags: ['Madrigal', 'Outer Colonies'],
        confidence: 'confirmed',
      },
      'hip-37279': {
        targetId: 'hip-37279',
        targetType: 'system',
        systemId: 'hip-37279',
        inUniverseName: 'Arcadia (Procyon III)',
        text: 'Lush UNSC tourism and resort colony in the Procyon system besieged during Halo Wars (2531).',
        workTitle: 'Halo Wars',
        aliases: ['Arcadia', 'Procyon III', 'Halo Wars'],
        tags: ['Arcadia', 'UNSC'],
        confidence: 'confirmed',
      },
      'gaia-2452378776434477184': {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Tau Ceti System',
        text: 'Strategic inner-colony frontier sector in the Halo UNSC astrometric network.',
        workTitle: 'Halo',
        aliases: ['Tau Ceti Halo'],
        tags: ['UNSC', 'Inner Colonies'],
        confidence: 'confirmed',
      },
    },
  },
  {
    layerId: 'canon-dune',
    title: 'Dune Universe (Known Universe)',
    kind: 'fictional-canon',
    description: 'Imperial fiefdom star systems from Frank Herbert’s Dune Chronicles.',
    version: 1,
    source: {
      summary:
        'Feudal interstellar empire spanning real navigational stars in Frank Herbert’s Dune appendix and the Dune Encyclopedia, centred on Arrakis (Canopus III), Caladan (Delta Pavonis III), and Giedi Prime (36 Ophiuchi B).',
      creator: 'Frank Herbert',
      publicationYear: '1965',
      medium: 'Novel Series',
      canonicalReference: 'Dune (Chilton Books, 1965) — Appendix: Terminology of the Imperium',
      url: 'https://en.wikipedia.org/wiki/Dune_(franchise)',
    },
    entries: {
      'hip-30438': {
        targetId: 'hip-30438',
        targetType: 'system',
        systemId: 'hip-30438',
        inUniverseName: 'Arrakis (Dune / Canopus III)',
        text: 'Third planet of Canopus; harsh desert world and sole source of the geriatric spice melange in the Known Universe.',
        workTitle: 'Dune',
        aliases: ['Arrakis', 'Dune', 'Canopus III', 'Rakis', 'Melange'],
        tags: ['Arrakis', 'Dune', 'Atreides'],
        confidence: 'confirmed',
      },
      'gaia-6427464123776727168': {
        targetId: 'gaia-6427464123776727168',
        targetType: 'system',
        systemId: 'gaia-6427464123776727168',
        inUniverseName: 'Caladan (Delta Pavonis III)',
        text: 'Oceanic third planet of Delta Pavonis and ancestral fiefdom of House Atreides for twenty-six generations.',
        workTitle: 'Dune',
        aliases: ['Caladan', 'Delta Pavonis III', 'Dan', 'House Atreides'],
        tags: ['Caladan', 'Dune', 'Atreides'],
        confidence: 'confirmed',
      },
      'gaia-4109030160308317312': {
        targetId: 'gaia-4109030160308317312',
        targetType: 'system',
        systemId: 'gaia-4109030160308317312',
        inUniverseName: 'Giedi Prime (36 Ophiuchi B)',
        text: 'Industrialised, low-photosynthesis homeworld of House Harkonnen orbiting 36 Ophiuchi B.',
        workTitle: 'Dune',
        aliases: ['Giedi Prime', '36 Ophiuchi B', 'Gammu', 'House Harkonnen'],
        tags: ['Giedi Prime', 'Dune', 'Harkonnen'],
        confidence: 'confirmed',
      },
      'canon-dune:kaitain': {
        targetId: 'canon-dune:kaitain',
        targetType: 'fictional-body',
        systemId: 'gaia-6427464123776727168',
        inUniverseName: 'Kaitain (Imperial Capital)',
        text: 'Seat of the Padishah Emperor and House Corrino following the devastation of Salusa Secundus.',
        workTitle: 'Dune',
        aliases: ['Kaitain', 'Salusa Secundus', 'House Corrino'],
        tags: ['Kaitain', 'Dune', 'Corrino'],
        confidence: 'candidate',
      },
    },
  },
  {
    layerId: 'canon-avatar',
    title: 'Avatar (Alpha Centauri System)',
    kind: 'fictional-canon',
    description: 'Pandora and Polyphemus in the Alpha Centauri A system from James Cameron’s Avatar.',
    version: 1,
    source: {
      summary:
        'Exomoon Pandora orbiting the gas giant Polyphemus in the habitable zone of Alpha Centauri A, 4.37 light-years from Earth.',
      creator: 'James Cameron',
      publicationYear: '2009–present',
      medium: 'Film Franchise',
      canonicalReference: 'Avatar: An Activist Survival Guide (2009)',
      url: 'https://en.wikipedia.org/wiki/Avatar_(franchise)',
    },
    entries: {
      'canon-avatar:pandora': {
        targetId: 'canon-avatar:pandora',
        targetType: 'fictional-body',
        systemId: 'gaia-5853498713190525696',
        inUniverseName: 'Pandora (Alpha Centauri A Exomoon)',
        text: 'Lush, habitable exomoon of the gas giant Polyphemus in the Alpha Centauri A system; home of the Na’vi and source of unobtanium.',
        workTitle: 'Avatar',
        aliases: ['Pandora', 'Avatar', 'Na’vi', 'Unobtanium'],
        tags: ['Pandora', 'Avatar', 'Alpha Centauri'],
        confidence: 'confirmed',
      },
      'canon-avatar:polyphemus': {
        targetId: 'canon-avatar:polyphemus',
        targetType: 'fictional-body',
        systemId: 'gaia-5853498713190525696',
        inUniverseName: 'Polyphemus (Alpha Centauri A Gas Giant)',
        text: 'Blue-and-violet gas giant orbiting in the habitable zone of Alpha Centauri A, orbited by fourteen moons including Pandora.',
        workTitle: 'Avatar',
        aliases: ['Polyphemus', 'Avatar Gas Giant'],
        tags: ['Polyphemus', 'Avatar', 'Alpha Centauri'],
        confidence: 'confirmed',
      },
    },
  },
  {
    layerId: 'canon-the-expanse',
    title: 'The Expanse',
    kind: 'fictional-canon',
    description: 'Solar System stations, moons, and Ring Gate worlds from James S. A. Corey’s The Expanse.',
    version: 1,
    source: {
      summary:
        'Hard science-fiction series chronicling humanity’s colonisation of the Solar System (Earth, Mars, the Asteroid Belt, and outer-planet moons) and the discovery of the Extrasolar Protomolecule Ring network.',
      creator: 'James S. A. Corey (Daniel Abraham & Ty Franck)',
      publicationYear: '2011–2021',
      medium: 'Novel & TV Series',
      canonicalReference: 'Leviathan Wakes (2011) – Leviathan Falls (2021)',
      url: 'https://en.wikipedia.org/wiki/The_Expanse_(novel_series)',
    },
    entries: {
      ceres: {
        targetId: 'ceres',
        targetType: 'minor-body',
        systemId: 'sol',
        inUniverseName: 'Ceres Station (Capital of the Belt)',
        text: 'Spun-up dwarf planet serving as the largest trading hub and demographic capital of the Outer Planets Alliance (OPA) in the Asteroid Belt.',
        workTitle: 'The Expanse',
        aliases: ['Ceres Station', 'The Expanse', 'OPA', 'Belt'],
        tags: ['Ceres', 'The Expanse', 'Belt'],
        confidence: 'confirmed',
      },
      '433-eros': {
        targetId: '433-eros',
        targetType: 'minor-body',
        systemId: 'sol',
        inUniverseName: 'Eros Station (Protomolecule Incident)',
        text: 'Near-Earth asteroid station infected with the Phoebe Protomolecule during the Eros Incident in Leviathan Wakes.',
        workTitle: 'The Expanse (Leviathan Wakes)',
        aliases: ['Eros Station', 'Protomolecule', 'Julie Mao'],
        tags: ['Eros', 'The Expanse', 'Protomolecule'],
        confidence: 'confirmed',
      },
      ganymede: {
        targetId: 'ganymede',
        targetType: 'moon',
        systemId: 'sol',
        inUniverseName: 'Ganymede Station (Breadbasket of the Outer Planets)',
        text: 'Orbital-mirror agricultural dome complex on Jupiter’s largest moon supplying food and obstetric care across the Jovian system.',
        workTitle: 'The Expanse (Caliban’s War)',
        aliases: ['Ganymede Station', 'Praxidike Meng'],
        tags: ['Ganymede', 'The Expanse', 'Jovian'],
        confidence: 'confirmed',
      },
      io: {
        targetId: 'io',
        targetType: 'moon',
        systemId: 'sol',
        inUniverseName: 'Io (Protogen / Mao-Kwikowski Hybrid Lab)',
        text: 'Volcanic Jovian moon hosting the clandestine Protomolecule hybrid research facility in Caliban’s War.',
        workTitle: 'The Expanse (Caliban’s War)',
        aliases: ['Io Facility', 'Mao-Kwikowski'],
        tags: ['Io', 'The Expanse'],
        confidence: 'confirmed',
      },
      titan: {
        targetId: 'titan',
        targetType: 'moon',
        systemId: 'sol',
        inUniverseName: 'Titan (Outer Planets Resort & Shipyards)',
        text: 'Major Saturnian domed colony and high-gravity naval resort in the outer Solar System.',
        workTitle: 'The Expanse',
        aliases: ['Titan Colony', 'Saturn'],
        tags: ['Titan', 'The Expanse'],
        confidence: 'confirmed',
      },
      phoebe: {
        targetId: 'phoebe',
        targetType: 'moon',
        systemId: 'sol',
        inUniverseName: 'Phoebe Station (Protomolecule Discovery Site)',
        text: 'Retrograde irregular moon of Saturn captured from interstellar space, where Protogen discovered the extrasolar Protomolecule.',
        workTitle: 'The Expanse',
        aliases: ['Phoebe Station', 'Phoebe Bug', 'Protomolecule Origin'],
        tags: ['Phoebe', 'The Expanse', 'Protomolecule'],
        confidence: 'confirmed',
      },
      'canon-the-expanse:ilus': {
        targetId: 'canon-the-expanse:ilus',
        targetType: 'fictional-body',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Ilus (New Terra)',
        text: 'Lithium-rich extrasolar world beyond the Ring Gates settled by Belter refugees and Royal Charter Energy in Cibola Burn.',
        workTitle: 'The Expanse (Cibola Burn)',
        aliases: ['Ilus', 'New Terra', 'Cibola Burn'],
        tags: ['Ilus', 'New Terra', 'The Expanse'],
        confidence: 'candidate',
      },
    },
  },
  {
    layerId: 'canon-bobiverse',
    title: 'Bobiverse (We Are Legion)',
    kind: 'fictional-canon',
    description: 'Von Neumann replicant probe destinations in Dennis E. Taylor’s Bobiverse series.',
    version: 1,
    source: {
      summary:
        'Hard science-fiction series following Bob Johansson and his Von Neumann replicant descendants exploring Epsilon Eridani, Delta Eridani, 82 Eridani, and Eta Cassiopeiae.',
      creator: 'Dennis E. Taylor',
      publicationYear: '2016–present',
      medium: 'Novel Series',
      canonicalReference: 'We Are Legion (We Are Bob) (2016) – Heaven’s River (2020)',
      url: 'https://en.wikipedia.org/wiki/Dennis_E._Taylor#Bobiverse_series',
    },
    entries: {
      'gaia-5164707970261890560': {
        targetId: 'gaia-5164707970261890560',
        targetType: 'system',
        systemId: 'gaia-5164707970261890560',
        inUniverseName: 'Epsilon Eridani (Bob-1 First Replication Hub)',
        text: 'First interstellar target reached by Bob-1 (HEAVEN-1), where he defeats the Brazilian probe and builds Riker, Bill, Milo, and Mario.',
        workTitle: 'We Are Legion (We Are Bob)',
        aliases: ['Bobiverse', 'We Are Legion', 'We Are Bob', 'HEAVEN-1'],
        tags: ['Bobiverse', 'Epsilon Eridani'],
        confidence: 'confirmed',
      },
      'gaia-5164120762333028736': {
        targetId: 'gaia-5164120762333028736',
        targetType: 'system',
        systemId: 'gaia-5164120762333028736',
        inUniverseName: 'Delta Eridani (Rana / Deltan Homeworld)',
        text: 'System where Original Bob discovers and shepherds the primitive Deltan species on planet Eden.',
        workTitle: 'We Are Legion (We Are Bob)',
        aliases: ['Delta Eridani', 'Rana', 'Deltans', 'Archimedes'],
        tags: ['Bobiverse', 'Delta Eridani'],
        confidence: 'confirmed',
      },
      'gaia-4847957292277399296': {
        targetId: 'gaia-4847957292277399296',
        targetType: 'system',
        systemId: 'gaia-4847957292277399296',
        inUniverseName: '82 G. Eridani (Takama / Vulcan Colony)',
        text: 'Nearby G8V star system colonised by human survivors evacuated from Earth by the Bobiverse.',
        workTitle: 'For We Are Many',
        aliases: ['82 Eridani', '82 G. Eridani', 'Vulcan Bobiverse'],
        tags: ['Bobiverse', '82 Eridani'],
        confidence: 'confirmed',
      },
      'gaia-425040000962559616': {
        targetId: 'gaia-425040000962559616',
        targetType: 'system',
        systemId: 'gaia-425040000962559616',
        inUniverseName: "Heaven's River (Eta Cassiopeiae Topopolis)",
        text: "Artificial megastructure (Topopolis) orbiting Eta Cassiopeiae housing the Quinlan civilisation in Heaven's River.",
        workTitle: "Heaven's River",
        aliases: ["Heaven's River", 'Eta Cassiopeiae', 'Topopolis', 'Quinlans'],
        tags: ['Bobiverse', "Heaven's River"],
        confidence: 'confirmed',
      },
    },
  },
  {
    layerId: 'canon-revelation-space',
    title: 'Revelation Space Universe',
    kind: 'fictional-canon',
    description: 'Lighthugger colonies and Inhibitor artifacts in Alastair Reynolds’s Revelation Space universe.',
    version: 1,
    source: {
      summary:
        'Hard space-opera universe spanning real stars within 50 light-years of Sol, including Yellowstone (Epsilon Eridani), Resurgam (Delta Pavonis), Sky’s Edge (61 Cygni), and Zion (Lacaille 9352).',
      creator: 'Alastair Reynolds',
      publicationYear: '2000–present',
      medium: 'Novel Series',
      canonicalReference: 'Revelation Space (2000) & Chasm City (2001)',
      url: 'https://en.wikipedia.org/wiki/Revelation_Space_universe',
    },
    entries: {
      'gaia-6427464123776727168': {
        targetId: 'gaia-6427464123776727168',
        targetType: 'system',
        systemId: 'gaia-6427464123776727168',
        inUniverseName: 'Resurgam (Delta Pavonis)',
        text: 'Desert archaeological colony orbiting Delta Pavonis containing the extinct avian Amarantin ruins and the Hades Matrix.',
        workTitle: 'Revelation Space',
        aliases: ['Resurgam', 'Revelation Space', 'Amarantin', 'Delta Pavonis'],
        tags: ['Resurgam', 'Revelation Space'],
        confidence: 'confirmed',
      },
      'gaia-5164707970261890560': {
        targetId: 'gaia-5164707970261890560',
        targetType: 'system',
        systemId: 'gaia-5164707970261890560',
        inUniverseName: 'Yellowstone (Chasm City / Epsilon Eridani)',
        text: 'Heart of the Demarchist Glitter Band (10,000 orbital habitats) and Chasm City in the Epsilon Eridani system prior to the Melding Plague.',
        workTitle: 'Chasm City',
        aliases: ['Yellowstone', 'Chasm City', 'Glitter Band', 'Demarchists'],
        tags: ['Yellowstone', 'Chasm City', 'Revelation Space'],
        confidence: 'confirmed',
      },
      'gaia-1872046609345556480': {
        targetId: 'gaia-1872046609345556480',
        targetType: 'system',
        systemId: 'gaia-1872046609345556480',
        inUniverseName: "Sky's Edge (61 Cygni A)",
        text: 'Jungle frontier world orbiting 61 Cygni A settled by generation ships from the Santiago flotilla.',
        workTitle: 'Chasm City',
        aliases: ["Sky's Edge", '61 Cygni A'],
        tags: ["Sky's Edge", 'Revelation Space'],
        confidence: 'confirmed',
      },
      'gaia-6385548541499112448': {
        targetId: 'gaia-6385548541499112448',
        targetType: 'system',
        systemId: 'gaia-6385548541499112448',
        inUniverseName: 'Zion (Lacaille 9352)',
        text: 'Oceanic world orbiting the red dwarf Lacaille 9352, home to the Pattern Juggler marine biomass.',
        workTitle: 'Redemption Ark',
        aliases: ['Zion', 'Lacaille 9352', 'Pattern Jugglers'],
        tags: ['Zion', 'Revelation Space'],
        confidence: 'confirmed',
      },
    },
  },
  {
    layerId: 'canon-classic-scifi',
    title: 'Classic Hard Sci-Fi Landmarks',
    kind: 'fictional-canon',
    description: 'Iconic real-sky worlds from Alien, 2001/2010, Contact, Forbidden Planet, Aurora, Hyperion, and Foundation.',
    version: 1,
    source: {
      summary:
        'Curated anthology of hard science-fiction films and literature anchoring iconic settings to real catalogued stars and moons.',
      creator: 'Arthur C. Clarke, Carl Sagan, Ridley Scott, Kim Stanley Robinson, Ursula K. Le Guin, Dan Simmons, Isaac Asimov',
      publicationYear: '1951–2015',
      medium: 'Literature & Cinema',
      canonicalReference: '2001: A Space Odyssey (1968), Alien (1979), Contact (1985), Aurora (2015)',
      url: 'https://en.wikipedia.org/wiki/Stars_and_planetary_systems_in_fiction',
    },
    entries: {
      'gaia-4722135642226902656': {
        targetId: 'gaia-4722135642226902656',
        targetType: 'system',
        systemId: 'gaia-4722135642226902656',
        inUniverseName: 'LV-426 (Acheron / Zeta-2 Reticuli)',
        text: 'Exomoon of Calpamos in the Zeta-2 Reticuli system where the USCSS Nostromo discovers the derelict Engineer vessel and Xenomorph eggs in Alien (1979) and Hadley’s Hope in Aliens (1986).',
        workTitle: 'Alien / Aliens',
        aliases: ['LV-426', 'Acheron', 'Zeta-2 Reticuli', 'Zeta Reticuli', 'Nostromo', 'Alien'],
        tags: ['LV-426', 'Acheron', 'Alien'],
        confidence: 'confirmed',
      },
      europa: {
        targetId: 'europa',
        targetType: 'moon',
        systemId: 'sol',
        inUniverseName: 'Europa (TMA-2 Monolith Sanctuary)',
        text: 'Jovian ocean moon transformed into a nascent sun-warmed biosphere in Arthur C. Clarke’s 2010: Odyssey Two ("All these worlds are yours except Europa. Attempt no landing there.").',
        workTitle: '2010: Odyssey Two',
        aliases: ['Europa Monolith', '2001 A Space Odyssey', '2010 Odyssey Two'],
        tags: ['Europa', 'Monolith', 'Odyssey'],
        confidence: 'confirmed',
      },
      iapetus: {
        targetId: 'iapetus',
        targetType: 'moon',
        systemId: 'sol',
        inUniverseName: 'Iapetus (Star Gate Monolith — Novel)',
        text: 'Two-tone Saturnian moon whose bright equatorial oval houses the TMA-2 Star Gate monolith in Arthur C. Clarke’s 1968 novel 2001: A Space Odyssey.',
        workTitle: '2001: A Space Odyssey',
        aliases: ['Iapetus Monolith', 'Japetus', 'Star Gate'],
        tags: ['Iapetus', 'Monolith', '2001'],
        confidence: 'confirmed',
      },
      'hip-91262': {
        targetId: 'hip-91262',
        targetType: 'system',
        systemId: 'hip-91262',
        inUniverseName: 'Vega (Contact Signal Source & Wormhole Relay)',
        text: 'Bright A0V star 25 light-years from Earth from which Dr. Ellie Arroway detects the prime-number television signal and Machine blueprints in Carl Sagan’s Contact.',
        workTitle: 'Contact',
        aliases: ['Contact', 'Vega Signal', 'Ellie Arroway'],
        tags: ['Vega', 'Contact'],
        confidence: 'confirmed',
      },
      'hip-97649': {
        targetId: 'hip-97649',
        targetType: 'system',
        systemId: 'hip-97649',
        inUniverseName: 'Altair IV (Krell Homeworld — Forbidden Planet)',
        text: 'Fourth planet of Altair visited by United Planets Cruiser C-57D, housing the subterranean Great Machine of the extinct Krell in Forbidden Planet (1956).',
        workTitle: 'Forbidden Planet',
        aliases: ['Altair IV', 'Forbidden Planet', 'Krell'],
        tags: ['Altair IV', 'Forbidden Planet'],
        confidence: 'confirmed',
      },
      'gaia-2452378776434477184': {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Tau Ceti Literary Worlds (Aurora / Anarres & Urras / Tau Ceti Center)',
        text: 'Nexus of classic hard sci-fi: exomoon Aurora in Kim Stanley Robinson’s Aurora (2015), binary worlds Urras & Anarres in Ursula K. Le Guin’s The Dispossessed (1974), and Hegemony capital Tau Ceti Center in Dan Simmons’s Hyperion (1989).',
        workTitle: 'Aurora / The Dispossessed / Hyperion',
        aliases: ['Aurora', 'Anarres', 'Urras', 'The Dispossessed', 'Tau Ceti Center', 'Hyperion'],
        tags: ['Aurora', 'Anarres', 'Urras', 'Hyperion'],
        confidence: 'confirmed',
      },
      'hip-32349': {
        targetId: 'hip-32349',
        targetType: 'system',
        systemId: 'hip-32349',
        inUniverseName: 'Sirius Sector (Foundation / Spacer Worlds)',
        text: 'Core administrative sector of the Galactic Empire and early Spacer settlement hub in Isaac Asimov’s Robots and Foundation series.',
        workTitle: 'Foundation',
        aliases: ['Sirius Sector', 'Foundation', 'Isaac Asimov'],
        tags: ['Sirius', 'Foundation'],
        confidence: 'confirmed',
      },
    },
  },
  {
    layerId: 'overlay-interstellar-missions',
    title: 'Interstellar Missions & SETI Landmarks',
    kind: 'scientific-overlay',
    description: 'Deep-space escape probes, future stellar flyby targets, interstellar mission concepts, and historical SETI transmissions.',
    version: 1,
    source: {
      summary:
        'Scientific and historical overlay mapping humanity’s five solar-escape probes (Voyager 1 & 2, Pioneer 10 & 11, New Horizons), JWST, interstellar propulsion studies (Breakthrough Starshot, Project Daedalus, Project Longshot), and landmark SETI broadcasts (Project Ozma, Arecibo Message, Wow! Signal).',
      creator: 'NASA / JPL / SETI Institute / British Interplanetary Society',
      publicationYear: '1960–present',
      medium: 'Spaceflight & Radio Astronomy Archive',
      canonicalReference: 'NASA JPL Horizons & Bailer-Jones et al. (2019) Gaia DR2 Stellar Encounters',
      url: 'https://science.nasa.gov/mission/voyager/',
    },
    entries: {
      'gaia-1129149723913123456': {
        targetId: 'gaia-1129149723913123456',
        targetType: 'system',
        systemId: 'gaia-1129149723913123456',
        inUniverseName: 'Voyager 1 Stellar Encounter (Gliese 445 / AC +79 3888)',
        text: 'Voyager 1 crossed the heliopause in 2012 and will pass within 1.6 light-years of the M-dwarf Gliese 445 (AC +79 3888) in ~40,000 years.',
        workTitle: 'Voyager Interstellar Mission',
        aliases: ['Voyager 1', 'Voyager', 'Gliese 445', 'AC +79 3888', 'Golden Record'],
        tags: ['Voyager 1', 'Interstellar Probe'],
        confidence: 'confirmed',
      },
      'gaia-1926461164913660160': {
        targetId: 'gaia-1926461164913660160',
        targetType: 'system',
        systemId: 'gaia-1926461164913660160',
        inUniverseName: 'Voyager 2 Stellar Encounter (Ross 248 / Gliese 905)',
        text: 'Voyager 2 will pass within 1.7 light-years of the red dwarf Ross 248 (Gliese 905) in ~42,000 years before continuing toward a 4.3-ly encounter with Sirius in ~296,000 years.',
        workTitle: 'Voyager Interstellar Mission',
        aliases: ['Voyager 2', 'Voyager', 'Ross 248', 'Gliese 905'],
        tags: ['Voyager 2', 'Interstellar Probe'],
        confidence: 'confirmed',
      },
      'hip-21421': {
        targetId: 'hip-21421',
        targetType: 'system',
        systemId: 'hip-21421',
        inUniverseName: 'Pioneer 10 Trajectory (Aldebaran)',
        text: 'First spacecraft to traverse the Asteroid Belt and visit Jupiter (1973); heading on a hyperbolic trajectory toward the red giant Aldebaran (~2 million years travel time).',
        workTitle: 'Pioneer Program',
        aliases: ['Pioneer 10', 'Pioneer Plaque', 'Aldebaran Trajectory'],
        tags: ['Pioneer 10', 'Interstellar Probe'],
        confidence: 'confirmed',
      },
      'overlay-interstellar-missions:pioneer-11': {
        targetId: 'overlay-interstellar-missions:pioneer-11',
        targetType: 'minor-body',
        systemId: 'sol',
        inUniverseName: 'Pioneer 11 (Saturn Flyby & Scutum Escape Trajectory)',
        text: 'First spacecraft to encounter Saturn (1979); escaping the Solar System toward the constellation Scutum and Aquila.',
        workTitle: 'Pioneer Program',
        aliases: ['Pioneer 11', 'Pioneer Plaque'],
        tags: ['Pioneer 11', 'Interstellar Probe'],
        confidence: 'confirmed',
      },
      'overlay-interstellar-missions:new-horizons': {
        targetId: 'overlay-interstellar-missions:new-horizons',
        targetType: 'minor-body',
        systemId: 'sol',
        inUniverseName: 'New Horizons (Pluto & Arrokoth Kuiper Belt Probe)',
        text: 'Fifth spacecraft to achieve solar escape velocity after conducting the first reconnaissance of Pluto (2015) and Kuiper Belt contact binary 486958 Arrokoth (2019).',
        workTitle: 'New Horizons Mission',
        aliases: ['New Horizons', 'Pluto Probe', 'Ultima Thule'],
        tags: ['New Horizons', 'Kuiper Belt'],
        confidence: 'confirmed',
      },
      'overlay-interstellar-missions:jwst': {
        targetId: 'overlay-interstellar-missions:jwst',
        targetType: 'minor-body',
        systemId: 'sol',
        inUniverseName: 'James Webb Space Telescope (JWST at Sun-Earth L2)',
        text: 'Premier infrared space observatory orbiting the Sun-Earth L2 Lagrange point, characterizing exoplanet atmospheres (TRAPPIST-1, K2-18 b, WASP-39 b, LHS 475 b).',
        workTitle: 'James Webb Space Telescope',
        aliases: ['James Webb Space Telescope', 'JWST', 'Webb Telescope'],
        tags: ['JWST', 'Space Observatory'],
        confidence: 'confirmed',
      },
      'gaia-2452378776434477184': {
        targetId: 'gaia-2452378776434477184',
        targetType: 'system',
        systemId: 'gaia-2452378776434477184',
        inUniverseName: 'Project Ozma (First SETI Survey — Tau Ceti & Epsilon Eridani)',
        text: 'Pioneering 1960 SETI radio experiment conducted by Frank Drake at Green Bank Observatory, scanning Tau Ceti and Epsilon Eridani near the 1.420 GHz hydrogen line.',
        workTitle: 'Project Ozma (1960)',
        aliases: ['Project Ozma', 'Frank Drake', 'SETI'],
        tags: ['Project Ozma', 'SETI'],
        confidence: 'confirmed',
      },
      'gaia-5853498713190525696': {
        targetId: 'gaia-5853498713190525696',
        targetType: 'system',
        systemId: 'gaia-5853498713190525696',
        inUniverseName: 'Breakthrough Starshot & Project Longshot (Alpha Centauri)',
        text: 'Target of Breakthrough Starshot (relativistically laser-pushed gram-scale nanocraft at 0.2c reaching Alpha Centauri & Proxima Centauri b in ~20 years) and the 1988 USNA/NASA Project Longshot nuclear-pulse study.',
        workTitle: 'Breakthrough Starshot / Project Longshot',
        aliases: ['Breakthrough Starshot', 'Project Longshot', 'Starshot'],
        tags: ['Breakthrough Starshot', 'Project Longshot'],
        confidence: 'confirmed',
      },
      'gaia-4472832130942575872': {
        targetId: 'gaia-4472832130942575872',
        targetType: 'system',
        systemId: 'gaia-4472832130942575872',
        inUniverseName: "Project Daedalus (Barnard's Star Fusion Probe Study)",
        text: "Landmark 1973–1978 British Interplanetary Society engineering design for a two-stage inertial-confinement fusion probe accelerating to 0.12c to reach Barnard's Star in 50 years.",
        workTitle: 'Project Daedalus (BIS)',
        aliases: ['Project Daedalus', 'Daedalus Probe'],
        tags: ['Project Daedalus', "Barnard's Star"],
        confidence: 'confirmed',
      },
      'm13-hercules': {
        targetId: 'm13-hercules',
        targetType: 'structure',
        systemId: 'm13-hercules',
        inUniverseName: 'Arecibo Message Target (Messier 13 / Great Hercules Cluster)',
        text: '1,679-bit pictorial radio broadcast transmitted by Frank Drake and Carl Sagan from the Arecibo Observatory on 16 November 1974 toward globular cluster Messier 13.',
        workTitle: 'Arecibo Message (1974)',
        aliases: ['Arecibo Message', 'Arecibo Broadcast', 'M13 SETI'],
        tags: ['Arecibo Message', 'SETI', 'M13'],
        confidence: 'confirmed',
      },
      'hip-95477': {
        targetId: 'hip-95477',
        targetType: 'system',
        systemId: 'hip-95477',
        inUniverseName: 'Wow! Signal Sky Region (Chi-1 Sagittarii)',
        text: 'Strong narrowband 1420 MHz radio signal recorded by Jerry R. Ehman at the Big Ear radio telescope on 15 August 1977 in Sagittarius near the Chi Sagittarii star group.',
        workTitle: 'Big Ear SETI Survey (1977)',
        aliases: ['Wow! Signal', 'Wow Signal', '6EQUJ5', 'Chi Sagittarii'],
        tags: ['Wow! Signal', 'SETI'],
        confidence: 'confirmed',
      },
    },
  },
];


