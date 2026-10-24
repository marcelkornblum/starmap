---
name: canon-layer-author
description: Researches, cross-matches, authors, and validates Fictional Universe Canon Layers (FS-001) and Custom User Layers (FS-002) for Starmap from user-supplied source material, URLs, books, or franchises. Use when the user asks to create, expand, or curate a fictional universe canon layer or map fictional star systems and worlds onto Starmap's real-sky catalog.
---

# Canon Layer Author Skill (`FS-001` & `FS-002`)

Use this skill whenever the user points you at source material (a novel, franchise, wiki URL, star chart, or lore summary) and asks to build or update a **Fictional Canon Layer** (`DatasetLayerManifest`) for Starmap.

For complete TypeScript interfaces, compact 1-letter JSON wire keys, and worked examples, read [`references/schema-and-examples.md`](references/schema-and-examples.md).

---

## Core Architectural Rules

1. **Every Entry Must Attach to a Real Host Star System (`systemId`):**
   - Regardless of whether an entry represents a star system (`targetType: 'system'`), a real catalogued exoplanet (`targetType: 'planet'`), a Solar System moon/minor body (`targetType: 'moon' | 'minor-body'`), or a fictional planet not in the astronomical catalog (`targetType: 'fictional-body'`), it **must** specify a real host `systemId` from Starmap's 100-parsec catalog (e.g. `gaia-5164707970261890560` for Epsilon Eridani, `gaia-3195919528989223040` for 40 Eridani, `gaia-2452378776434477184` for Tau Ceti, `sol` for Sol).
   - This guarantees that searching for or filtering by any canon world on the **Galactic View** always highlights and flies to its real parent star system on the 3D map.
2. **Exclude Purely Fictional Star Systems:**
   - If a fictional location has no real-sky star counterpart within Starmap's catalog (e.g., *Arrakis / Canopus* outside 100 pc if unmapped, or a purely invented star like *Tatooine* or *Romulus* with no canonical real star), **leave it out of `entries`** and list it in the review briefing under **Excluded / Unmapped Lore Entities** with the reason.
3. **Flattened Single-Note Entries (`text` / `x`):**
   - Each node entry in `entries` is a single flattened `DatasetLayerEntry` with one concise `text` note (`x` in compact JSON). Do not nest a `snippets` array.
   - If both a star system and a specific planet inside that system are significant, create a `'system'` entry keyed by the `systemId` **and** a `'planet'` (or `'fictional-body'`) entry keyed by the planet's `targetId` (with `systemId` pointing to the parent star system).
4. **Authoritative Source URL (`source.url` / `b.u`):**
   - Never blindly copy a transient, user-supplied, or ad-hoc scrape URL into `source.url` (`b.u`).
   - Always resolve an **authoritative reference URL** for the work or franchise:
     - **Default preference:** The canonical **English Wikipedia** article for the book, series, or franchise (`https://en.wikipedia.org/wiki/...`).
     - **Research-based alternative:** An official or primary canonical encyclopedia/bibliography page (e.g. Memory Alpha for *Star Trek*, Halopedia for *Halo*, ISFDB) when it provides superior astrometric provenance.
   - **Mandatory Review Surface:** During Step 4 (Interactive Review Checkpoint), explicitly show the user both the Wikipedia URL and any strong research-based alternative URL so the user can ratify which authoritative link to store in `source.url`.

---

## Step-by-Step Workflow

### Step 1: Ingest & Extract Source Material
1. Read the user-supplied material (files, text, or URLs via `read_url_content` / `search_web`).
2. Extract **Main Canon Layer Metadata (`DatasetLayerManifest` / `DatasetLayerSourceMeta` / `b`)**:
   - `layerId`: `canon-<kebab-slug>` (e.g., `canon-dune`, `canon-the-expanse`, `canon-revelation-space`).
   - `title` (`n`): **Shortest unambiguous canonical name** (`"Hail Mary"`, `"Three-Body"`, `"Dune"`, `"Star Trek"`). Zero brackets, no `"Universe"` / `"Canon"` suffix.
   - `subtitle` (`t`): **Strictly optional — omit by default.** Only when the short title genuinely benefits from a secondary title (e.g. `title: "Three-Body"`, `subtitle: "Remembrance of Earth's Past"`). Never put authors, dates, or brackets in it.
   - `aliases` (`a`): **Single space-delimited string** of non-redundant search tokens for the layer (`"project astrophage grace rocky weir"`). Include the **surname(s) of the author(s) of the original primary book / novella / short story / manga only** (lowercase, alphanumeric, true family name: `Liu Cixin` → `liu`, `Ursula K. Le Guin` → `leguin`, pen names by pen-name surname). **Directors, showrunners, studios, game developers, tie-in/novelisation authors and creator-written spin-off novels get no token.** Never repeat words already in `title` / `subtitle`, and never paste prose.
   - `description`: 1-sentence deck description for the Layer Toggle UI.
   - `source.summary` (`b.s`): 1–2 sentence synthesis of the work and how real-sky astronomy is used in its setting.
   - `source.creator` (`b.a`): Author(s), creator(s), or studio (display-only; **not** parsed for search).
   - `source.publicationYear` (`b.y`): Original publication/release year or span.
   - `source.medium` (`b.m`): `"Novel"`, `"Novel Trilogy"`, `"TV & Film Franchise"`, `"Video Game & Novel Franchise"`, etc.
   - `source.canonicalReference` (`b.r`): Specific book, star chart, or encyclopedia establishing the astrometric mapping.
   - `source.url` (`b.u`): Authoritative reference URL (resolved per Rule 4 above).
3. **Inclusion rule:** anchor a work to a body, star or structure **only where actual narrative events take place**. Sprawling or simulation-scale works that merely contain real locations, and purely symbolic/mythological uses of planet names, are excluded. Group works that share a setting, universe or author-cycle into one layer where this gives a better layer card (individual works are carried by entry `workTitle`).
4. **Verify first:** every anchor and attribution must be verified against a cited source before it is authored. Use `confidence` (`candidate` / `theoretical`) only where a source genuinely cannot be found or the mapping is interpretive — never as a shortcut for unfinished research.
5. Extract **Candidate Celestial Entities**:
   - For each star system, planet, moon, or station mentioned in the source material, record its **in-universe name**, **claimed real-sky star/planet designation** (Proper name, Bayer/Flamsteed, Gliese/GJ, HD, HIP), and **role in the work**.

### Step 2: Cross-Match Against Starmap's Catalog (via `codebase-researcher` on `Model: "flash"`)
Delegate catalog cross-matching against Starmap's built search indices (`public/data/search/core.json`, `public/data/search/stars.json`, `public/data/search/planets.json`) to `codebase-researcher` (`Model: "flash"`):
1. Search for the real-sky star or planet using normalized clean keys (`buildCleanKeys` in `src/utils/nomenclature.ts`) or by inspecting `public/data/search/stars.json` and `public/data/search/planets.json`.
2. Classify each matched entity's `targetType` and `targetId`:
   - **Real Star System (`targetType: 'system'`):**
     - `targetId` = canonical Starmap system ID (e.g. `gaia-2452378776434477184` or `sol`).
     - `systemId` = same as `targetId` (omitted in compact JSON).
   - **Real Catalogued Planet / Moon / Minor Body (`targetType: 'planet' | 'moon' | 'minor-body'`):**
     - `targetId` = canonical Starmap body ID (e.g. `tau-ceti-e`, `earth`, `europa`, `pha-00433`).
     - `systemId` = parent star system ID (e.g. `gaia-2452378776434477184` or `sol`).
   - **Fictional Planet / World Orbiting a Real Star (`targetType: 'fictional-body'`):**
     - Use when the planet itself is fictional or uncatalogued in real astronomy (e.g., *Reach* at Epsilon Eridani, *Vulcan* at 40 Eridani A, *Resurgam* at Delta Pavonis), **provided its host star system exists in Starmap's catalog**.
     - `targetId` = `<layerId>:<kebab-world-slug>` (e.g. `canon-halo:reach`).
     - `systemId` = the real host star system's Starmap ID (e.g. `gaia-5164707970261890560`).
3. Assign **Mapping Confidence (`confidence` / `c`)**:
   - `'confirmed'` (`1`, omitted in compact JSON): Explicitly stated in primary canon text or official star charts.
   - `'candidate'` (`2`): Inferred from strong secondary canon, RPG sourcebooks, or author interviews.
   - `'theoretical'` (`3`): Deduced from distance/spectral clues in the text without an explicit catalog designation.
   - `'unverified'` (`4`): Fan consensus or ambiguous lore mapping.

### Step 3: Draft Node Entries & Search Aliases
For each matched entity, draft a flattened `DatasetLayerEntry`:
- `order` (`o`): Positive integer indicating the sequence of this node during guided layer exploration in `<LayerCard />`.
- `parentBodyId` (`p`): Parent planetary body ID for moons and sub-satellites (e.g. `'jupiter'`, `'earth'`) enabling direct Orbit-Context navigation to `/planet/<parentPlanetSlug>?focus=<itemSlug>`.
- `inUniverseName` (`u`): **Strictly optional. Omit whenever the in-universe name equals the real-sky star/body name** (e.g. omit for *Tau Ceti* in *Hail Mary*, *Wolf 359* in *Star Trek* — the build resolves the real name from `targetId` / `systemId`). Populate only when the work gives the body a **different** name (`"Erid"`, `"Adrian"`, `"Trisolaris"`, `"Vulcan"`, `"Arrakis"`), and always prefer that distinctive name over the real-sky designation. Zero brackets; no parenthetical real-sky suffixes.
- `subtitle` (`t`): Strictly optional short role/context label (e.g. `"Astrophage Destination"`, `"Borg Cube Battle"`). Omit when self-explanatory. Zero brackets.
- `text` (`x`): 1–2 sentences (max ~220 characters) explaining the entity's significance in the work, written in Starmap's objective encyclopedic tone.
- `workTitle` (`w`): Specific book/installment title if the layer spans multiple works.
- `aliases` (`a`): **Single space-delimited string of delta-only search tokens** (`"rocky blipa"`). Must never repeat words already in `inUniverseName`, `subtitle`, or the parent `title`, nor the real-sky host star/planet name (the Relational System Pass already links child entries to matched systems), nor stopwords.
- **No entry `tags`:** canon entry tags were removed (DL-10). `?select=tag:` resolves catalogue system tags only.

### Step 3b: Unified Search & Guided LayerCard Navigation
- **Unified Layer Search (`category: layers`):** Both parent layer overview nodes and individual layer items are indexed into `public/data/search/layers.json`, allowing direct search discovery.
- **Deep-Linking via `?layer=`:** Selecting a layer item produces a clean RFC 3986 URL `?select=layer:<layerSlug>&layer=<layerSlug>:<itemSlug>`, opening the HUD `<LayerCard />` with step-by-step Previous/Next guided tour controls.

### Step 4: Interactive Review Checkpoint (Mandatory Halt)
Before writing to `content/layers/<layerId>.ts` or running `npm run build:data`:
1. Write a **Canon Layer Proposal Artifact** (`UserFacing: true`) containing:
   - **Main Tag Bibliographic Block (`source` / `b`):** All fields, explicitly highlighting the **Authoritative URL (`source.url`)** choice (e.g., Wikipedia vs. primary canon wiki/reference) for user ratification.
   - **Matched Entries Table:** Columns for `In-Universe Name`, `Target Type`, `Target ID`, `Host System ID & Real Name`, `Distance (pc)`, `Confidence`, `Aliases`, and `Entry Text`.
   - **Excluded / Unmapped Lore Entities:** Any purely fictional systems or stars outside the 100-pc catalog that were excluded.
2. **HALT** and ask the user to review the artifact (and confirm the authoritative `source.url` and any `'candidate'` / `'theoretical'` mappings).

### Step 5: Emit, Build & Verify (via `tdd-worker` & `qa-verifier` on `Model: "flash"`)
Once ratified by the user, delegate emission, data build, and verification to `tdd-worker` / `qa-verifier` (`Model: "flash"`) using separate single-command `run_command` calls (zero `&&` chaining):
1. Add or update the layer as its own module `content/layers/<layerId>.ts` (`export default` a typed `DatasetLayerManifest`) and register it in the barrel `content/layers/index.ts` (`LAYER_MANIFESTS`). Authored layer content lives only under `content/` (versioned, read by `scripts/build-data.ts`); nothing authored belongs in `src/`.
2. Run `npm run build:data` to regenerate (the build is offline and deterministic; it resolves real-sky names from the on-disk catalogue):
   - `public/data/overlays/layers/index.json`
   - `public/data/overlays/layers/<layerId>.json`
   - `public/data/overlays/layers/by-entity/<0..z>.json`
   - `public/data/search/layers.json`, `public/data/search/core.json`, and `public/data/search/full.json`
3. Run `npx vitest run tests/datasetLayerCodec.test.ts` and `npm run typecheck` as separate single commands to verify lossless round-trip encoding and search index generation.
