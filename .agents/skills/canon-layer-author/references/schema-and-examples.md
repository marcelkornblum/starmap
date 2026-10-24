# Canon Layer Schema & Worked Examples (`FS-001` & `FS-002`)

## 1. TypeScript Interfaces (`src/types/astro.ts`)

```ts
export type ObservationalConfidence = 'confirmed' | 'candidate' | 'theoretical' | 'unverified';

export type DatasetLayerKind = 'fictional-canon' | 'custom-user' | 'scientific-overlay';

export type DatasetLayerTargetType =
  | 'system'
  | 'planet'
  | 'moon'
  | 'structure'
  | 'minor-body'
  | 'fictional-body';

export interface DatasetLayerSourceMeta {
  /** Summary of the source work and how real-sky astronomy/cartography is used in its canon */
  summary: string;
  /** Primary author(s), creator(s), or studio (e.g. "Andy Weir", "Liu Cixin", "Gene Roddenberry") */
  creator: string;
  /** Original publication or release year/span (e.g. "2021", "2006–2010", "1966–present") */
  publicationYear?: string;
  /** Medium or format (e.g. "Novel", "Novel Trilogy", "TV & Film Franchise") */
  medium?: string;
  /** Specific canonical reference book, atlas, or source used for star coordinates */
  canonicalReference?: string;
  /** Authoritative reference link (Wikipedia or official canon encyclopedia URL) */
  url?: string;
}

export interface DatasetLayerEntry {
  targetId: string;
  targetType: DatasetLayerTargetType;
  /** Real host star system ID in the Starmap catalog */
  systemId: string;
  order?: number;
  parentBodyId?: string;
  inUniverseName?: string;
  resolvedName?: string;
  subtitle?: string;
  text: string;
  workTitle?: string;
  aliases?: string;
  confidence?: ObservationalConfidence;
}

export interface DatasetLayerManifest {
  layerId: string;
  title: string;
  subtitle?: string;
  kind: DatasetLayerKind;
  description: string;
  version: number;
  aliases?: string;
  source?: DatasetLayerSourceMeta;
  entries: Record<string, DatasetLayerEntry>;
}
```

---

## 2. Compact 1-Letter JSON Wire Format (`public/data/overlays/layers/<layerId>.json`)

| Scope | Key | Type | Full Property | Omission / Default Rule |
| :--- | :---: | :--- | :--- | :--- |
| **Root** | `i` | `string` | `layerId` | Required |
| **Root** | `n` | `string` | `title` | Required |
| **Root** | `t` | `string` | `subtitle` | Optional secondary title |
| **Root** | `k` | `1 \| 2 \| 3` | `kind` | `1` = `fictional-canon`, `2` = `custom-user`, `3` = `scientific-overlay` |
| **Root** | `d` | `string` | `description` | Required |
| **Root** | `v` | `number` | `version` | Required (`1`) |
| **Root** | `a` | `string` | `aliases` | Optional space-delimited search tokens (incl. book-author surnames) |
| **Root** | `b` | `object` | `source` | Optional bibliographic block |
| **`b.*`** | `s` | `string` | `source.summary` | Required if `b` present |
| **`b.*`** | `a` | `string` | `source.creator` | Required if `b` present (display only) |
| **`b.*`** | `y` | `string` | `source.publicationYear` | Omitted if undefined |
| **`b.*`** | `m` | `string` | `source.medium` | Omitted if undefined |
| **`b.*`** | `r` | `string` | `source.canonicalReference` | Omitted if undefined |
| **`b.*`** | `u` | `string` | `source.url` | Omitted if undefined (must be authoritative) |
| **Root** | `e` | `Record<targetId, CompactLayerEntry>` | `entries` | O(1) dictionary keyed by `targetId` |
| **`e[id].*`** | `k` | `2..6` | `targetType` | **Omitted when `1` (`'system'`)**; `2`=`planet`, `3`=`moon`, `4`=`structure`, `5`=`minor-body`, `6`=`fictional-body` |
| **`e[id].*`** | `s` | `string` | `systemId` | **Omitted when `systemId === targetId`** |
| **`e[id].*`** | `u` | `string` | `inUniverseName` | Omitted when identical to real-sky star/body name |
| **`e[id].*`** | `r` | `string` | `resolvedName` | Precalculated real-sky display name resolved at build time |
| **`e[id].*`** | `t` | `string` | `subtitle` | Optional short role/context label |
| **`e[id].*`** | `x` | `string` | `text` | Required flattened note text |
| **`e[id].*`** | `w` | `string` | `workTitle` | Omitted if undefined |
| **`e[id].*`** | `a` | `string` | `aliases` | Optional space-delimited delta-only search tokens |
| **`e[id].*`** | `c` | `2 \| 3 \| 4` | `confidence` | **Omitted when `1` (`'confirmed'`)**; `2`=`candidate`, `3`=`theoretical`, `4`=`unverified` |

---

## 3. Worked Example: Real System + Real Exoplanet + Fictional Body

```json
{
  "i": "canon-halo",
  "n": "Halo Universe",
  "k": 1,
  "d": "UNSC colonial star systems in the Halo universe.",
  "v": 1,
  "b": {
    "s": "Military science-fiction universe in which the United Nations Space Command (UNSC) colonises real nearby stars within the local 50-parsec solar neighbourhood, anchored by the fortress world Reach in the Epsilon Eridani system.",
    "a": "Bungie / 343 Industries / Eric Nylund",
    "y": "2001–present",
    "m": "Video Game & Novel Franchise",
    "r": "Halo Encyclopedia (Dark Horse Books, 2022) & Halo: The Fall of Reach (2001)",
    "u": "https://en.wikipedia.org/wiki/Halo_(franchise)"
  },
  "e": {
    "gaia-5164707970261890560": {
      "u": "Epsilon Eridani System (FLEETCOM Sector One)",
      "x": "Primary naval hub of the UNSC Inner Colonies and site of the Fall of Reach in 2552.",
      "w": "Halo: The Fall of Reach",
      "a": ["FLEETCOM Sector One", "Halo"],
      "g": ["Reach", "UNSC"]
    },
    "canon-halo:reach": {
      "k": 6,
      "s": "gaia-5164707970261890560",
      "u": "Reach (Epsilon Eridani II)",
      "x": "Fortress world and second planet of Epsilon Eridani; headquarters of UNSC FLEETCOM and the SPARTAN-II program before its glassing by the Covenant.",
      "w": "Halo: The Fall of Reach",
      "a": ["Reach", "Epsilon Eridani II", "UNSC Fleet Command", "FLEETCOM"],
      "g": ["Reach", "UNSC", "Inner Colonies"]
    }
  }
}
```
