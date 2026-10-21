# Specification: Dataset Layers, Search Indexing & Tag Taxonomy Expansion

## 1. Overview & Motivation

This track graduates the **Dataset Layers & Tag Taxonomy Audit, Renaming & Expansion** backlog item into a comprehensive schema tightening, search index optimisation, factual overlay reorganisation, fictional canon catalogue expansion, and tag taxonomy unification across the 100-parsec and Solar System datasets.

### Key Problems Addressed
1. **Search Index Prose Bloat (`public/data/search/layers.json`):**
   - `buildSearchEntriesFromLayers` (`src/utils/datasetLayerCodec.ts`) currently passes `layer.description` and `layer.source.summary` directly into `buildCleanKeys(...)`. Because `normalizeCleanKey` strips whitespace, entire prose sentences are emitted into `CompactSearchEntry.a` as 100+ character unsearchable tokens.
   - Meanwhile, `executeCatalogSearch` (`src/services/searchService.ts`) already implements a **Relational System Pass** that pulls in all child layer entries attached to any matched real-sky star system (`systemId` / `entry.s` with `score >= 700`). Repeating real-sky host star or planet names in child `aliases` is redundant.
2. **Codec Type & Field Inconsistency:**
   - `CompactSearchEntry.a` in `src/utils/compactDataCodec.ts` is a space-delimited `string`, whereas `CompactLayerEntry.a` in `src/utils/datasetLayerCodec.ts` was typed as `string[]`, and parent manifests (`DatasetLayerManifest` / `CompactLayerManifest`) lacked top-level `subtitle` (`t`) and `aliases` (`a`) fields.
   - Child entries forced role descriptions into `inUniverseName` via parenthetical suffixes (e.g. `"Tau Ceti (Astrophage Destination)"`, `"Wolf 359 (Borg Cube Battle)"`) or duplicated the real-sky star name when no distinct in-universe name existed.
3. **Grab-Bag Anthology Layers & Missing Franchises:**
   - `canon-classic-scifi` bundled unrelated works (*Alien*, *2001*, *Foundation*, *Hyperion*, *Contact*, *Aurora*) into a single layer, while major sci-fi franchises across literature, film, television, and games were absent.
   - `overlay-interstellar-missions` mixed physical solar-escape spacecraft, paper-only propulsion studies, and radio SETI transmissions into a single layer.
4. **Legacy Collection & Tag Duplication:**
   - `SEED_CURATED_COLLECTIONS` in `src/data/guideCatalog.ts` duplicates `SEED_DATASET_LAYERS`, and `SYSTEM_TAG_BITS` / planet tags have naming inconsistencies (`HabitableCandidate` vs `HabitableHost` vs `HabitableWorld`).

---

## 2. Schema, Search Indexing & Authoring Skill Specification

### 2.1 Unified Layer & Search Codec Schema (`src/types/astro.ts` & `src/utils/datasetLayerCodec.ts`)

Unify `aliases` (`a`) as a **single space-delimited `string`** across `DatasetLayerManifest`, `DatasetLayerEntry`, `CompactLayerManifest`, `CompactLayerEntry`, and `CompactSearchEntry`, and introduce optional `subtitle` (`t`) at both parent and child levels:

| Level | Field | Compact Key | Type | Strict Rule |
| :--- | :--- | :---: | :---: | :--- |
| **Parent (`DatasetLayerManifest`)** | `title` | `n` | `string` | **Shortest unambiguous canonical name** (e.g. `"Hail Mary"`, `"Three-Body"`, `"Dune"`, `"Star Trek"`, `"Bobiverse"`, `"Avatar"`). Zero brackets, zero `"Universe"` / `"Canon"` suffixes. |
| **Parent (`DatasetLayerManifest`)** | `subtitle` | `t` | `string?` | **Strictly optional.** Omit by default. Only populate when the short `title` genuinely benefits from a secondary title (e.g. `title: "Three-Body"`, `subtitle: "Remembrance of Earth's Past"`). Never put authors, dates, or brackets in `subtitle`. |
| **Parent (`DatasetLayerManifest`)** | `aliases` | `a` | `string?` | **Space-delimited string of non-redundant search tokens** (`"project astrophage grace rocky"`). Do **not** index `description` or `source.summary` prose into `CompactSearchEntry.a`. At build time, `CompactSearchEntry.a` combines `subtitle` (stopword-stripped), book author surname(s) from `source.creator`, and `aliases` through `buildCleanKeys`. |
| **Child (`DatasetLayerEntry`)** | `inUniverseName` | `u` | `string?` | **Strictly optional. Omit whenever the in-universe name is the same as the real-sky star/body name** (e.g. omit for *Tau Ceti* in *Hail Mary*, *Wolf 359* in *Star Trek*, *Vega* in *Contact*, *Europa* in *2010*—the UI and search already resolve the real entity name from `targetId` / `systemId`). Only populate when the work gives the body a **different** in-universe name (*"Erid"*, *"Adrian"*, *"Trisolaris"*, *"Vulcan"*, *"Arrakis"*, *"Ceres Station"*), and always prioritise that distinctive name over the real-sky designation. Zero brackets. |
| **Child (`DatasetLayerEntry`)** | `subtitle` | `t` | `string?` | **Strictly optional.** Only populate when an entry genuinely benefits from a short role/context label (e.g. for `Tau Ceti`: `subtitle: "Astrophage Destination"`; for `Wolf 359`: `subtitle: "Borg Cube Battle"`). Omit when self-explanatory. Zero brackets. |
| **Child (`DatasetLayerEntry`)** | `aliases` | `a` | `string?` | **Space-delimited string of delta-only search tokens** (`"rocky blipa"`). Must **never** repeat words already in `inUniverseName`, `subtitle`, or parent `title`, nor the real-sky host star/planet name (already linked via `systemId` / `targetId` relational search pass), nor stopwords. |

#### Reference Manifest Example (`canon-project-hail-mary`)
```ts
{
  layerId: 'canon-project-hail-mary',
  title: 'Hail Mary',
  aliases: 'project astrophage grace rocky', // 'weir' auto-indexed from source.creator
  entries: {
    'gaia-2452378776434477184': {
      // inUniverseName omitted — uses real-sky name "Tau Ceti" from targetId/systemId
      subtitle: 'Astrophage Destination',
      aliases: 'petrova',
    },
    'tau-ceti-e': {
      inUniverseName: 'Adrian',
      aliases: 'taumoeba',
    },
    'gaia-3195919528989223040': {
      inUniverseName: 'Erid',
      aliases: 'rocky blipa',
    },
  },
}
```

### 2.2 Stopword Stripping & Deduplication Pipeline (`buildSearchEntriesFromLayers`)
1. **Drop Prose Indexing:** Remove `layer.description`, `layer.kind`, and `layer.source.summary` from `buildSearchEntriesFromLayers`.
2. **Stopword & Redundancy Filter (`buildCompactLayerSearchKeys`):**
   - Split whitespace-delimited tokens and strip English stopwords (`the`, `of`, `in`, `on`, `at`, `to`, `for`, `and`, `or`, `a`, `an`, `from`, `by`, `with`, `is`, `are`, `we`).
   - Extract only **book author surname(s)** from `layer.source?.creator` (e.g. `"Andy Weir"` $\rightarrow$ `"weir"`). Do not index film/TV directors or showrunners.
   - Exclude any token that is already a substring of `normalizeCleanKey(entry.n)` (display name) or `normalizeCleanKey(entry.c)` (canon title), because `scoreSearchEntry` already searches `nameClean` and `canonClean` directly.
   - Run prefix deduplication via `buildCleanKeys`.

### 2.3 Authoring Skills Synchronisation
Update `.agents/skills/canon-layer-author/SKILL.md` and `.agents/skills/astro-news-curator/SKILL.md` so future agent runs strictly follow:
- Concise bracket-free `title` (`n`) and optional `subtitle` (`t`).
- Optional `inUniverseName` (`u`) omitted whenever identical to the real-sky star/body name, always prioritising distinctive in-universe names over real-sky designations when both exist.
- Optional child `subtitle` (`t`) for role/context labels without brackets.
- Single space-delimited `aliases` (`a`) string containing only delta keywords, with book author surnames auto-extracted at build time.

---

## 3. Consolidated Master Inventory of Sci-Fi Franchises (114 Off-Earth / Real-Sky Works)

All Earth-only and purely fictional-galaxy works are excluded; multi-media adaptations are consolidated into single franchise entries; film/TV creator names are omitted (only book authors are recorded for surname indexing).

| # | Concise `title` | Optional `subtitle` | Media | Book Author | Year(s) | Real-Sky Stars & Off-Earth Solar System Bodies | Key In-Universe Worlds / Stations | Canonical / Wiki Link |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| 1 | **Hail Mary** | — | Book, Film | Andy Weir | 2021–2026 | **Tau Ceti**, **40 Eridani A**, **Venus** | **Adrian** (Tau Ceti e), **Erid** (40 Eridani b), *Hail Mary*, *Blip-A* | [Wikipedia](https://en.wikipedia.org/wiki/Project_Hail_Mary) |
| 2 | **Three-Body** | Remembrance of Earth's Past | Book, TV | Liu Cixin | 2006–2024 | **Alpha Centauri**, **DX Cancri**, **Jupiter**, **Saturn**, **Neptune**, **Oort Cloud** | **Trisolaris**, **Planet Blue** (DX3906), Bunker Era Jupiter Cities | [Wikipedia](https://en.wikipedia.org/wiki/Remembrance_of_Earth%27s_Past) |
| 3 | **Dune** | — | Book, Film, TV | Frank Herbert | 1965–2024 | **Canopus**, **Delta Pavonis**, **36 Ophiuchi B**, **70 Ophiuchi A**, **40 Eridani A**, **Mu Boötis** | **Arrakis**, **Caladan**, **Giedi Prime**, **Kaitain / Sikun**, **Richese**, **Ix** | [Wikipedia](https://en.wikipedia.org/wiki/Dune_(franchise)) |
| 4 | **The Expanse** | — | Book, TV | James S. A. Corey | 2011–2022 | **Moon**, **Mars**, **Phobos**, **Deimos**, **Ceres**, **433 Eros**, **Ganymede**, **Europa**, **Io**, **Callisto**, **Titan**, **Phoebe**, **Iapetus**, **Uranus**, **Tau Ceti** | **Ceres Station**, **Eros Station**, **Ganymede**, **Io Lab**, **Phoebe Station**, **Titan**, **Ilus** | [Wikipedia](https://en.wikipedia.org/wiki/The_Expanse_(novel_series)) |
| 5 | **Star Trek** | — | TV, Film | — | 1966–present | **40 Eridani A**, **Procyon**, **61 Cygni**, **Wolf 359**, **Alpha Centauri**, **Epsilon Eridani**, **Epsilon Indi**, **Sirius**, **Tau Ceti**, **Alpha Ceti**, **Epsilon Ceti**, **Vega**, **Altair**, **Deneb**, **Rigel**, **Mintaka**, **Moon**, **Mars**, **Jupiter**, **Titan** | **Vulcan**, **Andoria**, **Tellar Prime**, **Wolf 359**, **Risa**, **Ceti Alpha V**, **Axanar**, **Utopia Planitia** | [Wikipedia](https://en.wikipedia.org/wiki/Star_Trek) |
| 6 | **Space Odyssey** | 2001–3001 | Book, Film | Arthur C. Clarke | 1968–1997 | **Moon** (Tycho, Clavius), **Jupiter**, **Io**, **Europa**, **Ganymede**, **Saturn**, **Iapetus**, **Halley's Comet** | **Clavius Base**, **TMA-1**, **TMA-2**, **Lucifer** (Jupiter), *Discovery One* | [Wikipedia](https://en.wikipedia.org/wiki/Space_Odyssey) |
| 7 | **Alien** | — | Film, TV | — | 1979–2025 | **Zeta-2 Reticuli** ($39.2\text{ ly}$) | **LV-426 (Acheron)**, **LV-223**, **Calpamos**, Hadley's Hope, *Nostromo*, *Prometheus* | [Wikipedia](https://en.wikipedia.org/wiki/Alien_(franchise)) |
| 8 | **Avatar** | — | Film | — | 2009–2025 | **Alpha Centauri A** ($4.37\text{ ly}$) | **Pandora**, **Polyphemus** | [Wikipedia](https://en.wikipedia.org/wiki/Avatar_(franchise)) |
| 9 | **Foundation** | Robot & Empire | Book, TV | Isaac Asimov | 1950–2024 | **Tau Ceti**, **Alpha Centauri**, **Sirius**, **61 Cygni**, **82 G. Eridani**, **Moon** | **Aurora** (Tau Ceti), **Alpha** (Alpha Centauri), **Sirius Sector**, **Solaria** | [Wikipedia](https://en.wikipedia.org/wiki/Foundation_series) |
| 10 | **Bobiverse** | We Are Legion | Book | Dennis E. Taylor | 2016–2024 | **Epsilon Eridani**, **Delta Eridani**, **82 G. Eridani**, **Eta Cassiopeiae**, **Alpha Centauri**, **Delta Pavonis**, **40 Eridani**, **Groombridge 34**, **Gliese 876** | **Rana** (Delta Eridani), **Takama / Vulcan** (82 G. Eridani), **Heaven's River** (Eta Cassiopeiae) | [Wikipedia](https://en.wikipedia.org/wiki/Dennis_E._Taylor#Bobiverse_series) |
| 11 | **Revelation Space** | — | Book | Alastair Reynolds | 2000–2021 | **Delta Pavonis**, **Epsilon Eridani**, **61 Cygni A**, **Lacaille 9352**, **Ross 128**, **Tau Ceti**, **p Eridani**, **Mars**, **Europa** | **Resurgam** (Delta Pavonis), **Yellowstone / Chasm City** (Epsilon Eridani), **Sky's Edge** (61 Cygni A), **Zion** (Lacaille 9352), **Haldora** (Tau Ceti) | [Wikipedia](https://en.wikipedia.org/wiki/Revelation_Space_universe) |
| 12 | **Halo** | — | Game, Book, TV | Eric Nylund | 2001–2024 | **Epsilon Eridani**, **Epsilon Indi**, **Procyon**, **Tau Ceti**, **23 Librae**, **51 Pegasi**, **Sigma Octanus**, **Moon**, **Mars**, **Io**, **Ganymede** | **Reach** (Epsilon Eridani II), **Harvest** (Epsilon Indi IV), **Arcadia** (Procyon III), **Madrigal** (23 Librae) | [Wikipedia](https://en.wikipedia.org/wiki/Halo_(franchise)) |
| 13 | **Babylon 5** | — | TV | — | 1993–1999 | **Epsilon Eridani**, **Proxima Centauri**, **Tau Ceti**, **Vega**, **Altair**, **Ross 128**, **Wolf 359**, **Sirius**, **Moon**, **Mars**, **Io**, **Europa**, **Ganymede** | **Babylon 5** (Epsilon Eridani III / Euphrates L5), **Proxima III**, **Io Jumpgate**, Mars Colony | [Wikipedia](https://en.wikipedia.org/wiki/Babylon_5) |
| 14 | **Hyperion** | Hyperion Cantos | Book | Dan Simmons | 1989–1997 | **Tau Ceti**, **Vega**, **70 Ophiuchi**, **Groombridge 34**, **Altair**, **Mars** | **Tau Ceti Center**, **Heaven's Gate** (Vega), **Mare Infinitus** (70 Ophiuchi) | [Wikipedia](https://en.wikipedia.org/wiki/Hyperion_Cantos) |
| 15 | **The Dispossessed** | Hainish Cycle | Book | Ursula K. Le Guin | 1974 | **Tau Ceti** ($11.9\text{ ly}$) | **Anarres** & **Urras** (Tau Ceti) | [Wikipedia](https://en.wikipedia.org/wiki/The_Dispossessed) |
| 16 | **Rocannon's World** | Hainish Cycle | Book | Ursula K. Le Guin | 1966 | **Fomalhaut** ($\alpha\text{ PsA}$, $25.1\text{ ly}$) | **Rokanan** (Fomalhaut II) | [Wikipedia](https://en.wikipedia.org/wiki/Rocannon%27s_World) |
| 17 | **Known Space** | Ringworld | Book | Larry Niven | 1966–2012 | **Alpha Centauri**, **Sirius**, **Procyon**, **Tau Ceti**, **Epsilon Indi**, **Delta Pavonis**, **Groombridge 1618**, **61 Cygni**, **Mars**, **Mercury**, **Saturn** | **Wunderland** (Alpha Cen), **Jinx** (Sirius), **We Made It** (Procyon), **Plateau** (Tau Ceti), **Home** (Epsilon Indi), **Fafnir** (Delta Pavonis) | [Wikipedia](https://en.wikipedia.org/wiki/Known_Space) |
| 18 | **Alliance–Union** | Downbelow Station & Cyteen | Book | C. J. Cherryh | 1976–2023 | **Tau Ceti**, **Gliese 908** (Lalande 46650), **Sigma Draconis**, **UV Ceti**, **Ross 128**, **61 Cygni**, **Sol Asteroid Belt** | **Pell's World / Downbelow Station** (Tau Ceti), **Cyteen** (Gliese 908), **Russell's Station**, **Mariner** | [Wikipedia](https://en.wikipedia.org/wiki/Alliance%E2%80%93Union_universe) |
| 19 | **Contact** | — | Book, Film | Carl Sagan | 1985, 1997 | **Vega** ($\alpha\text{ Lyr}$, $25.0\text{ ly}$) | **Vega Wormhole Relay** | [Wikipedia](https://en.wikipedia.org/wiki/Contact_(novel)) |
| 20 | **The Martian** | — | Book, Film | Andy Weir | 2011, 2015 | **Mars** (Acidalia Planitia, Schiaparelli Crater) | **Ares III Hab**, **Ares IV MAV**, *Hermes* | [Wikipedia](https://en.wikipedia.org/wiki/The_Martian_(Weir_novel)) |
| 21 | **Artemis** | — | Book | Andy Weir | 2017 | **Moon** (Mare Tranquillitatis) | **Artemis** (Lunar Bubble City) | [Wikipedia](https://en.wikipedia.org/wiki/Artemis_(novel)) |
| 22 | **Interstellar** | — | Film | — | 2014 | **Saturn** ($10\text{ AU}$ Wormhole & Orbit) | **Gargantua Wormhole**, **Cooper Station** (Saturn orbit) | [Wikipedia](https://en.wikipedia.org/wiki/Interstellar_(film)) |
| 23 | **Mars Trilogy** | Red, Green & Blue Mars | Book | Kim Stanley Robinson | 1992–1996 | **Mars**, **Phobos**, **Deimos**, **Ceres**, **Saturn**, **Miranda**, **Mercury** | **Underhill**, **Sheffield** (Pavonis Mons), **Burroughs**, **Terminator** | [Wikipedia](https://en.wikipedia.org/wiki/Mars_trilogy) |
| 24 | **Aurora** | — | Book | Kim Stanley Robinson | 2015 | **Tau Ceti** (**Tau Ceti e**, **Tau Ceti f**), **Jupiter**, **Saturn** | **Aurora** (moon of Tau Ceti e), *Ship* | [Wikipedia](https://en.wikipedia.org/wiki/Aurora_(novel)) |
| 25 | **2312** | — | Book | Kim Stanley Robinson | 2012 | **Mercury**, **Venus**, **Moon**, **Mars**, **Io**, **Europa**, **Ganymede**, **Titan**, **Enceladus**, **Iapetus** | **Terminator** (Mercury), **Asteroid Terraria** | [Wikipedia](https://en.wikipedia.org/wiki/2312_(novel)) |
| 26 | **Icehenge** | — | Book | Kim Stanley Robinson | 1984 | **Pluto**, **Mars**, **Saturn** | **Pluto North Pole Icehenge** | [Wikipedia](https://en.wikipedia.org/wiki/Icehenge) |
| 27 | **For All Mankind** | — | TV | — | 2019–present | **Moon** (Shackleton Crater), **Mars** (Happy Valley), **Saturn / Titan** | **Jamestown Base**, **Zvezda Base**, **Happy Valley**, **Goldilocks Asteroid** | [Wikipedia](https://en.wikipedia.org/wiki/For_All_Mankind_(TV_series)) |
| 28 | **Wandering Earth** | — | Book, Film | Liu Cixin | 2000–2023 | **Moon**, **Jupiter**, **Alpha Centauri** ($4.37\text{ ly}$) | **Planetary Engine Earth**, **Jupiter Gravity Slingshot**, **Alpha Centauri** | [Wikipedia](https://en.wikipedia.org/wiki/The_Wandering_Earth) |
| 29 | **Rendezvous with Rama** | — | Book | Arthur C. Clarke | 1973 | **Mercury**, **Mars**, **Venus** (Perihelion transit through inner Sol) | **Rama** (Interstellar Cylinder) | [Wikipedia](https://en.wikipedia.org/wiki/Rendezvous_with_Rama) |
| 30 | **Imperial Earth** | — | Book | Arthur C. Clarke | 1975 | **Titan** (Saturn) | **Oasis** (Titan Hydrogen Colony) | [Wikipedia](https://en.wikipedia.org/wiki/Imperial_Earth) |
| 31 | **Songs of Distant Earth** | — | Book | Arthur C. Clarke | 1986 | **Pasiphae / Sol**, **Alpha Centauri**, **Sirius** | *Magellan* Generation Ship, **Thalassa** | [Wikipedia](https://en.wikipedia.org/wiki/The_Songs_of_Distant_Earth) |
| 32 | **Childhood's End** | — | Book, TV | Arthur C. Clarke | 1953, 2015 | **Canopus / Carina** (NGS 549672) | **Overlord Homeworld** | [Wikipedia](https://en.wikipedia.org/wiki/Childhood%27s_End) |
| 33 | **Forever War** | — | Book | Joe Haldeman | 1974 | **Aldebaran** ($65.3\text{ ly}$), **Mizar** ($82.9\text{ ly}$), **Charon** (Pluto) | **Charon Training Base**, **Middle Finger / Heaven** (Mizar), **Aldebaran Collapsar** | [Wikipedia](https://en.wikipedia.org/wiki/The_Forever_War) |
| 34 | **Old Man's War** | — | Book | John Scalzi | 2005–2020 | **Alpha Centauri**, **Beta Hydri** ($24.3\text{ ly}$), **Delta Pavonis** ($19.9\text{ ly}$) | **Phoenix Station**, **Coral**, **Roanoke** | [Wikipedia](https://en.wikipedia.org/wiki/Old_Man%27s_War) |
| 35 | **Hitchhiker's Guide** | — | Book, Radio, TV, Film | Douglas Adams | 1978–2005 | **Alpha Centauri**, **Barnard's Star**, **Betelgeuse** | **Alpha Centauri Planning Office**, **Brontitall** (Barnard's Star), **Betelgeuse V & VII** | [Wikipedia](https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy) |
| 36 | **Cowboy Bebop** | — | TV | — | 1998–1999 | **Moon**, **Venus**, **Mars**, **Ceres**, **Io**, **Europa**, **Ganymede**, **Callisto**, **Titan**, **Pluto** | **Alba City** (Mars), **Ganymede**, **Callisto**, **Tijuana** (Asteroid Belt) | [Wikipedia](https://en.wikipedia.org/wiki/Cowboy_Bebop) |
| 37 | **Mass Effect** | — | Game, Book | Drew Karpyshyn | 2007–present | **Charon / Pluto**, **Mars**, **Moon**, **Titan**, **Arcturus** ($36.7\text{ ly}$), **Alpha Centauri**, **Sirius**, **Tau Ceti**, **Epsilon Eridani**, **Procyon**, **61 Ursae Majoris** | **Charon Mass Relay**, **Mars Prothean Archive**, **Arcturus Station**, **Eden Prime**, **Terra Nova** | [Wikipedia](https://en.wikipedia.org/wiki/Mass_Effect) |
| 38 | **Starfield** | Settled Systems | Game | — | 2023–present | **Alpha Centauri**, **Sirius**, **Barnard's Star**, **Luyten's Star**, **Wolf 359**, **Tau Ceti**, **Procyon**, **Groombridge 34**, **Epsilon Eridani**, **Altair**, **61 Cygni**, **Delta Pavonis**, **Mars**, **Titan**, **Moon** | **Jemison / New Atlantis** (Alpha Centauri), **Cydonia** (Mars), **New Homestead** (Titan) | [Wikipedia](https://en.wikipedia.org/wiki/Starfield_(video_game)) |
| 39 | **Ender's Game** | — | Book, Film | Orson Scott Card | 1985, 2013 | **433 Eros**, **Moon** | **Command School** (433 Eros), **Battle School** | [Wikipedia](https://en.wikipedia.org/wiki/Ender%27s_Game) |
| 40 | **Forbidden Planet** | — | Film | — | 1956 | **Altair** ($\alpha\text{ Aql}$, $16.7\text{ ly}$) | **Altair IV** (Krell Great Machine) | [Wikipedia](https://en.wikipedia.org/wiki/Forbidden_Planet) |
| 41 | **Moon Is a Harsh Mistress** | — | Book | Robert A. Heinlein | 1966 | **Moon** | **Luna City**, **Tycho Under**, **Complex** | [Wikipedia](https://en.wikipedia.org/wiki/The_Moon_Is_a_Harsh_Mistress) |
| 42 | **Stranger in a Strange Land** | — | Book | Robert A. Heinlein | 1961 | **Mars** | **Mars** (*Envoy* Landing Site & Martian Nests) | [Wikipedia](https://en.wikipedia.org/wiki/Stranger_in_a_Strange_Land) |
| 43 | **Have Space Suit—Will Travel** | — | Book | Robert A. Heinlein | 1958 | **Moon**, **Pluto**, **Vega** ($25.0\text{ ly}$) | **Tombaugh Station** (Pluto), **Vega** | [Wikipedia](https://en.wikipedia.org/wiki/Have_Space_Suit%E2%80%94Will_Travel) |
| 44 | **Double Star** | — | Book | Robert A. Heinlein | 1956 | **Mars**, **Moon** | **Marsopolis**, **Luna City** | [Wikipedia](https://en.wikipedia.org/wiki/Double_Star) |
| 45 | **Starship Troopers** | — | Book, Film | Robert A. Heinlein | 1959, 1997 | **Moon**, **Pluto** | **Lunar Ring / Fleet Base**, **Pluto Research Station** | [Wikipedia](https://en.wikipedia.org/wiki/Starship_Troopers) |
| 46 | **Destination Moon** | — | Film | Robert A. Heinlein | 1950 | **Moon** (Harpalus Crater) | *Luna* Landing Site | [Wikipedia](https://en.wikipedia.org/wiki/Destination_Moon_(film)) |
| 47 | **Night's Dawn** | Reality Dysfunction | Book | Peter F. Hamilton | 1996–1999 | **Lalande 21185** ($8.3\text{ ly}$), **Ross 154** ($9.7\text{ ly}$), **Moon**, **Jupiter** | **Felicity** (Lalande 21185), **New California** (Ross 154) | [Wikipedia](https://en.wikipedia.org/wiki/The_Night%27s_Dawn_Trilogy) |
| 48 | **Commonwealth Saga** | Pandora's Star | Book | Peter F. Hamilton | 2004–2005 | **Mars**, **Alpha Centauri**, **Sirius** | **Mars Wormhole Landing**, **Centauri Colony** | [Wikipedia](https://en.wikipedia.org/wiki/Commonwealth_Saga) |
| 49 | **Blindsight** | Firefall | Book | Peter Watts | 2006, 2014 | **Oort Cloud**, **Mercury / Sun** ($0.05\text{ AU}$), **Jupiter** | **Burns-Caulfield / Rorschach** (Oort Cloud), **Icarus Array** (Sun) | [Wikipedia](https://en.wikipedia.org/wiki/Blindsight_(Watts_novel)) |
| 50 | **Diaspora** | — | Book | Greg Egan | 1997 | **Vega** ($25.0\text{ ly}$), **61 Cygni** ($11.4\text{ ly}$), **Groombridge 1618** ($15.9\text{ ly}$), **Sirius** | **Orpheus** (Vega), *Carter-Zimmerman* | [Wikipedia](https://en.wikipedia.org/wiki/Diaspora_(novel)) |
| 51 | **Schild's Ladder** | — | Book | Greg Egan | 2002 | **Beta Crucis** (Mimosa) | **Mimosa Station** | [Wikipedia](https://en.wikipedia.org/wiki/Schild%27s_Ladder) |
| 52 | **Quarantine** | — | Book | Greg Egan | 1992 | **Moon**, **Mars**, **Pluto** | **Solar System Bubble Boundary** | [Wikipedia](https://en.wikipedia.org/wiki/Quarantine_(Egan_novel)) |
| 53 | **Gateway** | Heechee Saga | Book | Frederik Pohl | 1977–1990 | **Venus**, **Tau Ceti**, **2100 Ra-Shalom** | **Gateway Asteroid**, **Peggy's World** (Tau Ceti), **Venus Tunnels** | [Wikipedia](https://en.wikipedia.org/wiki/Gateway_(novel)) |
| 54 | **The Sparrow** | — | Book | Mary Doria Russell | 1996, 1998 | **Alpha Centauri A** ($4.37\text{ ly}$) | **Rakhat** (Alpha Centauri A) | [Wikipedia](https://en.wikipedia.org/wiki/The_Sparrow_(novel)) |
| 55 | **Proxima** | Proxima & Ultima | Book | Stephen Baxter | 2013–2014 | **Proxima Centauri** ($4.25\text{ ly}$), **Mercury** | **Per Ardua** (Proxima Centauri) | [Wikipedia](https://en.wikipedia.org/wiki/Proxima_(novel)) |
| 56 | **Manifold** | Time, Space & Origin | Book | Stephen Baxter | 1999–2002 | **Moon**, **Mars**, **3753 Cruithne**, **Kuiper Belt** | **Cruithne Mining Base** | [Wikipedia](https://en.wikipedia.org/wiki/Manifold_Trilogy) |
| 57 | **Xeelee Sequence** | — | Book | Stephen Baxter | 1991–2018 | **Jupiter**, **Moon**, **Sagittarius A\*** | **Sol Wormhole Portal**, **Sagittarius A\*** | [Wikipedia](https://en.wikipedia.org/wiki/Xeelee_Sequence) |
| 58 | **Poseidon's Children** | Blue Remembered Earth | Book | Alastair Reynolds | 2012–2015 | **Gliese 667 C** ($23.6\text{ ly}$), **Moon**, **Mars**, **Phobos**, **Saturn**, **Neptune** | **Crucible** (Gliese 667 C), **Wintergarden** | [Wikipedia](https://en.wikipedia.org/wiki/Blue_Remembered_Earth) |
| 59 | **Pushing Ice** | — | Book | Alastair Reynolds | 2005 | **Saturn** (Janus), **Spica** ($250\text{ ly}$) | **Janus** (Saturn alien moonship), *Rockhopper* | [Wikipedia](https://en.wikipedia.org/wiki/Pushing_Ice) |
| 60 | **Tau Zero** | — | Book | Poul Anderson | 1970 | **Beta Virginis** ($35.6\text{ ly}$) | **Beta Virginis III** (*Leonora Christine* target) | [Wikipedia](https://en.wikipedia.org/wiki/Tau_Zero) |
| 61 | **Mission of Gravity** | — | Book | Hal Clement | 1954 | **61 Cygni A** ($11.4\text{ ly}$) | **Mesklin** (61 Cygni A) | [Wikipedia](https://en.wikipedia.org/wiki/Mission_of_Gravity) |
| 62 | **Rocheworld** | Flight of the Dragonfly | Book | Robert L. Forward | 1984 | **Barnard's Star** ($5.96\text{ ly}$) | **Rocheworld** (Eau & Roche double planet), **Gargantua** | [Wikipedia](https://en.wikipedia.org/wiki/Rocheworld) |
| 63 | **Coyote** | — | Book | Allen Steele | 2002–2016 | **47 Ursae Majoris** ($45.3\text{ ly}$) | **Coyote** (moon of **47 Ursae Majoris b** / Bear) | [Wikipedia](https://en.wikipedia.org/wiki/Coyote_(novel)) |
| 64 | **Frontlines** | — | Book | Marko Kloos | 2013–2022 | **Alpha Centauri**, **Sirius**, **Fomalhaut** ($25.1\text{ ly}$), **Capella** ($42.9\text{ ly}$), **Luhman 16** ($6.5\text{ ly}$), **Mars**, **Moon** | **New Svalbard** (Fomalhaut), **Sirius Ad** | [Wikipedia](https://en.wikipedia.org/wiki/Marko_Kloos) |
| 65 | **Mote in God's Eye** | CoDominium | Book | Larry Niven, Jerry Pournelle | 1974, 1993 | **Coalsack Nebula** (`coalsack-dark-nebula`) | **Murcheson's Eye / Mote Prime** | [Wikipedia](https://en.wikipedia.org/wiki/The_Mote_in_God%27s_Eye) |
| 66 | **Footfall** | — | Book | Larry Niven, Jerry Pournelle | 1985 | **Alpha Centauri**, **Saturn** | **Thuktun Fithp** (Alpha Centauri to Saturn) | [Wikipedia](https://en.wikipedia.org/wiki/Footfall) |
| 67 | **Quantum Thief** | Jean le Flambeur | Book | Hannu Rajaniemi | 2010–2014 | **Mars**, **Phobos**, **Venus**, **Jupiter**, **Oort Cloud** | **Oubliette** (Mars), **Dilemma Prison** (Phobos), **Zoku** (Jupiter) | [Wikipedia](https://en.wikipedia.org/wiki/The_Quantum_Thief) |
| 68 | **Accelerando** | — | Book | Charles Stross | 2005 | **Mercury**, **Jupiter**, **Saturn**, **Gliese 726** ($45.7\text{ ly}$) | **Matrioshka Swarm**, *Field Circus* (Gliese 726) | [Wikipedia](https://en.wikipedia.org/wiki/Accelerando) |
| 69 | **Saturn's Children** | — | Book | Charles Stross | 2008 | **Saturn**, **Titan**, **Rhea**, **Mercury**, **Mars**, **Eris** | **Rhea City**, **Floating Cities of Saturn** | [Wikipedia](https://en.wikipedia.org/wiki/Saturn%27s_Children_(novel)) |
| 70 | **Stars My Destination** | Tiger! Tiger! | Book | Alfred Bester | 1956 | **Mars**, **Ceres**, **Io**, **Europa**, **Ganymede**, **Callisto**, **Titan** | *Vorga*, *Nomad* (Asteroid Belt) | [Wikipedia](https://en.wikipedia.org/wiki/The_Stars_My_Destination) |
| 71 | **Demolished Man** | — | Book | Alfred Bester | 1953 | **Moon**, **Mars**, **Venus**, **Ganymede** | **Solar System Esper Guild** | [Wikipedia](https://en.wikipedia.org/wiki/The_Demolished_Man) |
| 72 | **Sirens of Titan** | — | Book | Kurt Vonnegut | 1959 | **Mars**, **Mercury**, **Titan** (Saturn) | **Caves of Mercury**, **Titan** (Rumfoord Estate) | [Wikipedia](https://en.wikipedia.org/wiki/The_Sirens_of_Titan) |
| 73 | **Palmer Eldritch** | Three Stigmata | Book | Philip K. Dick | 1965 | **Proxima Centauri** ($4.25\text{ ly}$), **Mars**, **Venus**, **Ganymede** | **Prox System**, **Mars Hovels** | [Wikipedia](https://en.wikipedia.org/wiki/The_Three_Stigmata_of_Palmer_Eldritch) |
| 74 | **Blade Runner** | Do Androids Dream of Electric Sheep? | Book, Film | Philip K. Dick | 1968, 1982, 2017 | **Mars**, **Betelgeuse** ($\alpha\text{ Ori}$, Shoulder of Orion) | **Mars Off-World Colony**, **Shoulder of Orion** | [Wikipedia](https://en.wikipedia.org/wiki/Blade_Runner_(franchise)) |
| 75 | **Ubik** | — | Book | Philip K. Dick | 1969 | **Moon** | **Luna City** | [Wikipedia](https://en.wikipedia.org/wiki/Ubik) |
| 76 | **Total Recall** | We Can Remember It for You Wholesale | Book, Film | Philip K. Dick | 1966, 1990 | **Mars** | **Pyramid Mine Reactor**, **Venusville** | [Wikipedia](https://en.wikipedia.org/wiki/Total_Recall_(1990_film)) |
| 77 | **Martian Chronicles** | — | Book | Ray Bradbury | 1950 | **Mars** | **Dead Seas of Mars** | [Wikipedia](https://en.wikipedia.org/wiki/The_Martian_Chronicles) |
| 78 | **War of the Worlds** | — | Book, Film | H. G. Wells | 1898, 1953 | **Mars** | **Mars Launch Cylinders** | [Wikipedia](https://en.wikipedia.org/wiki/The_War_of_the_Worlds) |
| 79 | **First Men in the Moon** | — | Book, Film | H. G. Wells | 1901, 1964 | **Moon** | **Subterranean Selenite Sea** | [Wikipedia](https://en.wikipedia.org/wiki/The_First_Men_in_the_Moon) |
| 80 | **From the Earth to the Moon** | — | Book, Film | Jules Verne | 1865, 1902 | **Moon** | **Columbiad Lunar Projectile Orbit** | [Wikipedia](https://en.wikipedia.org/wiki/From_the_Earth_to_the_Moon) |
| 81 | **Galactic Center** | In the Ocean of Night | Book | Gregory Benford | 1977–1995 | **Ross 128** ($11.0\text{ ly}$), **Alpha Centauri**, **1566 Icarus**, **Sagittarius A\*** | *Snark* (1566 Icarus), **Ross 128**, **Galactic Core** | [Wikipedia](https://en.wikipedia.org/wiki/Galactic_Center_Saga) |
| 82 | **Sundiver** | Uplift | Book | David Brin | 1980 | **Mercury**, **Sol** (Solar Chromosphere) | **Mercury Bradshaw Base**, **Sun-Ghosts** | [Wikipedia](https://en.wikipedia.org/wiki/Sundiver) |
| 83 | **Canticle for Leibowitz** | — | Book | Walter M. Miller Jr. | 1960 | **Alpha Centauri** ($4.37\text{ ly}$) | *Stella Maris* Colony Destination | [Wikipedia](https://en.wikipedia.org/wiki/A_Canticle_for_Leibowitz) |
| 84 | **Engines of God** | Academy Series | Book | Jack McDevitt | 1994–2007 | **Moon**, **Iapetus** (Saturn), **Beta Hydri** ($24.3\text{ ly}$) | **Iapetus Ice Monument**, **Quraqua** (Beta Hydri) | [Wikipedia](https://en.wikipedia.org/wiki/The_Engines_of_God) |
| 85 | **Seveneves** | — | Book | Neal Stephenson | 2015 | **Moon** (Shattered Cleft), **Mars** | **The Cleft / Cradle** (Moon), **Cloud Ark** | [Wikipedia](https://en.wikipedia.org/wiki/Seveneves) |
| 86 | **Ad Astra** | — | Film | — | 2019 | **Moon**, **Mars**, **Neptune** | **Lima Project** (Neptune), **Copernicus Base** (Moon) | [Wikipedia](https://en.wikipedia.org/wiki/Ad_Astra_(film)) |
| 87 | **Sunshine** | — | Film | — | 2007 | **Sol** (The Sun), **Mercury** | *Icarus II*, *Icarus I* (Mercury) | [Wikipedia](https://en.wikipedia.org/wiki/Sunshine_(2007_film)) |
| 88 | **Event Horizon** | — | Film | — | 1997 | **Neptune** | *Event Horizon* (Neptune orbit) | [Wikipedia](https://en.wikipedia.org/wiki/Event_Horizon_(film)) |
| 89 | **Moon** | — | Film | — | 2009 | **Moon** (Far Side) | **Sarang Station** (Helium-3 Mine) | [Wikipedia](https://en.wikipedia.org/wiki/Moon_(2009_film)) |
| 90 | **Passengers** | — | Film | — | 2016 | **Arcturus** ($\alpha\text{ Boo}$, $36.7\text{ ly}$) | *Avalon* (Arcturus Slingshot) | [Wikipedia](https://en.wikipedia.org/wiki/Passengers_(2016_film)) |
| 91 | **Oxygen** | — | Film | — | 2021 | **Wolf 1061** ($14.05\text{ ly}$) | **Wolf 1061 c** | [Wikipedia](https://en.wikipedia.org/wiki/Oxygen_(2021_film)) |
| 92 | **Silent Running** | — | Film | — | 1972 | **Saturn** | *Valley Forge* (Saturn Rings Bio-Domes) | [Wikipedia](https://en.wikipedia.org/wiki/Silent_Running) |
| 93 | **Outland** | — | Film | — | 1981 | **Io** (Jupiter) | **Con-Am 27** (Io Mining Colony) | [Wikipedia](https://en.wikipedia.org/wiki/Outland_(film)) |
| 94 | **Europa Report** | — | Film | — | 2013 | **Europa** (Jupiter) | *Europa One* (Conamara Chaos) | [Wikipedia](https://en.wikipedia.org/wiki/Europa_Report) |
| 95 | **Gattaca** | — | Film | — | 1997 | **Titan** (Saturn) | **Gattaca Titan Mission** | [Wikipedia](https://en.wikipedia.org/wiki/Gattaca) |
| 96 | **WALL-E** | — | Film | — | 2008 | **Moon**, **Kuiper Belt** | *Axiom* Starliner | [Wikipedia](https://en.wikipedia.org/wiki/WALL-E) |
| 97 | **Oblivion** | — | Film | — | 2013 | **Moon**, **Titan** (Saturn) | **Shattered Moon**, **Titan Refuge** | [Wikipedia](https://en.wikipedia.org/wiki/Oblivion_(2013_film)) |
| 98 | **Ikarie XB-1** | — | Film | Stanisław Lem | 1963 | **Alpha Centauri** ($4.37\text{ ly}$) | **White Planet** (Alpha Centauri) | [Wikipedia](https://en.wikipedia.org/wiki/Ikarie_XB-1) |
| 99 | **Mission to Mars** | — | Film | — | 2000 | **Mars** (Cydonia) | **Cydonia Mensae** | [Wikipedia](https://en.wikipedia.org/wiki/Mission_to_Mars) |
| 100 | **Red Planet** | — | Film | — | 2000 | **Mars** | *Mars-1* Terraforming Habitat | [Wikipedia](https://en.wikipedia.org/wiki/Red_Planet_(film)) |
| 101 | **Stowaway** | — | Film | — | 2021 | **Mars** | *MTS Hyperion* | [Wikipedia](https://en.wikipedia.org/wiki/Stowaway_(2021_film)) |
| 102 | **Robinson Crusoe on Mars** | — | Film | — | 1964 | **Mars**, **Saturn** | **Martian Caves** | [Wikipedia](https://en.wikipedia.org/wiki/Robinson_Crusoe_on_Mars) |
| 103 | **Spaceman** | Spaceman of Bohemia | Book, Film | Jaroslav Kalfař | 2017, 2024 | **Jupiter**, **Venus** | *JanHus1* (Jupiter Chopra Cloud) | [Wikipedia](https://en.wikipedia.org/wiki/Spaceman_(2024_film)) |
| 104 | **Space: Above and Beyond** | — | TV | — | 1995–1996 | **Alpha Centauri**, **Barnard's Star**, **Groombridge 34**, **Tau Ceti**, **Groombridge 1618**, **Epsilon Indi**, **Zeta Reticuli**, **Mars** | **Vesta Colony**, **Tellus Colony** (Epsilon Indi) | [Wikipedia](https://en.wikipedia.org/wiki/Space:_Above_and_Beyond) |
| 105 | **Lost in Space** | — | TV | — | 1965, 2018 | **Alpha Centauri** ($4.37\text{ ly}$) | **Alpha Centauri Colony**, *Jupiter 2* / *Resolute* | [Wikipedia](https://en.wikipedia.org/wiki/Lost_in_Space_(2018_TV_series)) |
| 106 | **Stargate** | — | Film, TV | — | 1994–2011 | **Altair** ($16.7\text{ ly}$), **Sirius**, **Alpha Centauri**, **Moon**, **Mars** | **P3X-989** (Altair) | [Wikipedia](https://en.wikipedia.org/wiki/Stargate) |
| 107 | **Doctor Who** | — | TV | — | 1963–present | **Alpha Centauri**, **Sirius**, **Tau Ceti**, **Canopus**, **Betelgeuse**, **Moon**, **Mars**, **Saturn** | **Mondas** (Sol), **Mars** (Ice Warriors), **Alpha Centauri** | [Wikipedia](https://en.wikipedia.org/wiki/Doctor_Who) |
| 108 | **Red Dwarf** | — | TV, Book | Rob Grant, Doug Naylor | 1988–present | **Jupiter**, **Io**, **Europa**, **Ganymede**, **Titan**, **Mimas**, **Miranda** | *Red Dwarf* (Jupiter Mining Corp), **Titan**, **Mimas** | [Wikipedia](https://en.wikipedia.org/wiki/Red_Dwarf) |
| 109 | **Futurama** | — | TV | — | 1999–present | **Moon**, **Mars**, **Neptune**, **Titan**, **Europa**, **Pluto**, **Vega**, **Alpha Centauri**, **Sirius** | **Luna Park**, **Mars University**, **Vega 4** | [Wikipedia](https://en.wikipedia.org/wiki/Futurama) |
| 110 | **Planetes** | — | Book, TV | Makoto Yukimura | 1999–2004 | **Moon**, **Jupiter** | **Von Braun City** (Moon), *Von Braun* (Jupiter Mission) | [Wikipedia](https://en.wikipedia.org/wiki/Planetes) |
| 111 | **Gundam** | Universal Century | TV | — | 1979–present | **Moon**, **Ceres**, **Jupiter** | **Von Braun / Granada** (Moon), **Axis** (Asteroid Belt), **Jupiter Energy Fleet** | [Wikipedia](https://en.wikipedia.org/wiki/Mobile_Suit_Gundam) |
| 112 | **Space Battleship Yamato** | — | TV | — | 1974–present | **Mars**, **Pluto**, **Enceladus**, **Alpha Centauri**, **Barnard's Star**, **Sirius** | **Pluto Forward Base**, *Yamato* | [Wikipedia](https://en.wikipedia.org/wiki/Space_Battleship_Yamato) |
| 113 | **Alpha Centauri** | Sid Meier's Alpha Centauri | Game | — | 1999 | **Alpha Centauri A** ($4.37\text{ ly}$) | **Chiron (Planet)**, *UNS Unity* | [Wikipedia](https://en.wikipedia.org/wiki/Sid_Meier%27s_Alpha_Centauri) |
| 114 | **Dead Space** | — | Game, Book | Brian Evenson | 2008–present | **Titan** (Saturn), **Moon** | **Titan Station (The Sprawl)**, **Lunar Colony** | [Wikipedia](https://en.wikipedia.org/wiki/Dead_Space_(franchise)) |

---

## 4. Factual Layer Taxonomy (`kind: 'scientific-overlay'`)

### 4.1 Core Principles
- **Flat Taxonomy (`kind: 'scientific-overlay'`):** No extra sub-category schema field. Layers may serve as either ordered narrative tours (`order: 1..N`) or unordered reference collections/filters.
- **Dual Spacecraft + Stellar Target Tagging in `overlay-interstellar-probes`:** Tag **both** the live hyperbolic ephemeris spacecraft inside `sol` (`new-horizons`, `pioneer-11`, `pioneer-10`, `voyager-2`, `voyager-1`) **and** their future stellar encounter systems (*Aldebaran*, *Ross 248*, *Gliese 445*).
- **Grounded Hardware & Observations Only:** Drop paper-only propulsion studies (`Starflight Concepts`). Every factual layer must map to real spacecraft, real radio transmissions/telescope observations, or confirmed astrophysical objects.

### 4.2 Factual Layer Roster (7 Layers)

| Layer ID | Concise `title` | Optional `subtitle` | Style | Member Entries & Location Anchors |
| :--- | :--- | :--- | :---: | :--- |
| `overlay-interstellar-probes` | **Interstellar Probes** | Solar-Escape Spacecraft & Future Encounters | Narrative Tour (`order`) | **Tags both the live spacecraft in `sol` and its future stellar encounter:**<br>1. `new-horizons` (`sol` spacecraft — Pluto & Arrokoth Kuiper Belt flyby)<br>2. `pioneer-11` (`sol` spacecraft — Saturn flyby & Scutum escape vector)<br>3. `pioneer-10` (`sol` spacecraft) $\rightarrow$ 4. `hip-21421` (*Aldebaran* — Pioneer 10's 2-Myr trajectory target)<br>5. `voyager-2` (`sol` spacecraft) $\rightarrow$ 6. `gaia-1926461164913660160` (*Ross 248* — Voyager 2's $1.7\text{ ly}$ flyby in ~42,000 yr)<br>7. `voyager-1` (`sol` spacecraft) $\rightarrow$ 8. `gaia-1129149723913123456` (*Gliese 445* — Voyager 1's $1.6\text{ ly}$ flyby in ~40,000 yr) |
| `overlay-seti-landmarks` | **SETI & Radio Signals** | Broadcasts, Surveys & Candidate Detections | Narrative Tour (`order`) | **Real radio telescope targets and active transmissions:**<br>1. `gaia-2452378776434477184` (*Tau Ceti* — 1960 Project Ozma target 1)<br>2. `gaia-5164707970261890560` (*Epsilon Eridani* — 1960 Project Ozma target 2)<br>3. `m13-hercules` (*Messier 13* — 1974 Arecibo Message broadcast target)<br>4. `hip-95477` (*Chi-1 Sagittarii* — 1977 Big Ear `6EQUJ5` Wow! Signal sky region)<br>5. `gaia-704967037090946688` (*55 Cancri* — 1999/2003 Evpatoria Cosmic Call broadcast target)<br>6. `gaia-5853498713190525696` (*Proxima Centauri* — 2019 Breakthrough Listen BLC-1 signal analysis) |
| `overlay-solar-landmarks` | **Solar System Landmarks** | Historic Landings, Rovers & Sample Returns | Narrative Tour (`order`) | **Real surface landings and sample-return bodies in `sol`:**<br>• `venus` (*Venera 13*) · `moon` (*Apollo 11*) · `mars` (*Viking 1 & Perseverance*) · `433-eros` (*NEAR Shoemaker*) · `101955-bennu` (*OSIRIS-REx*) · `162173-ryugu` (*Hayabusa2*) · `67p-churyumov` (*Rosetta / Philae*) · `titan` (*Cassini–Huygens*) |
| `overlay-jwst-targets` | **JWST Targets** | Exoplanet Atmospheres & Direct Imaging | Collection / Tour | **Anchored at `jwst` in `sol` L2 plus its flagship observed exoplanets:**<br>• `jwst` (`sol` Sun–Earth L2) · `lhs-1140-b` · `trappist-1-e` · `55-cancri-e` · `eps-ind-ab` · `hr-8799-e` |
| `overlay-habitable-worlds` | **Habitable Worlds Survey** | Direct-Imaging Priority Solar Analogues | Collection | **NASA Habitable Worlds Observatory (HWO) Tier-A nearby solar analogues:**<br>• *Alpha Centauri A* · *Epsilon Eridani* · *Tau Ceti* · *Epsilon Indi A* · *Eta Cassiopeiae A* · *Delta Pavonis* · *82 G. Eridani* |
| `overlay-recent-discoveries` | **Recent Discoveries** | Newly Confirmed Nearby Exoplanets | Collection / Tour | • `lhs-1140-b` · `barnard-b` · `eps-ind-ab` · `proxima-centauri-d` · `teegarden-s-star-d` *(maintained via `astro-news-curator`)* |
| `overlay-extreme-worlds` | **Extreme Worlds** | Planetary Record-Holders & Ocean Moons | Collection | • `55-cancri-e` (*Lava World*) · `proxima-centauri-b` (*Nearest HZ World*) · `trappist-1-b` (*Resonant Chain*) · `beta-pictoris-b` (*Fast Rotator*) · `europa` (*Subsurface Ocean*) |

---

## 5. Legacy Collection Retirement & Tag Taxonomy Unification

1. **Retire Duplicate `SEED_CURATED_COLLECTIONS` (`src/data/guideCatalog.ts`):**
   - Replace hardcoded `SEED_CURATED_COLLECTIONS` (`notable-exoplanets`, `famous-systems`, `sci-fi-stars`) with direct consumption of the unified `DatasetLayerManifest` registry so curated tours and layers have a single source of truth.
2. **System & Planet Tag Taxonomy Unification (`SYSTEM_TAG_BITS` in `src/utils/compactDataCodec.ts`):**
   - Audit and rationalise `SYSTEM_TAG_BITS` and planet/minor-body tag strings (`HabitableCandidate`, `HabitableHost`, `HabitableWorld`, `ExoplanetHost`, `NakedEye`, `SolarNeighborhood10pc`, `VariableStar`, `RECONSGroundTruth`) so tag identifiers, bitmasks, and UI display labels are 100% consistent across `scripts/build-data.ts`, `src/utils/compactDataCodec.ts`, `src/services/searchService.ts`, and UI panels.
