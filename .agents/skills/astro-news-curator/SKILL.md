---
name: astro-news-curator
description: Researches, verifies, curates, and synchronizes breaking astronomical news, recent exoplanet discoveries (<= 100 pc), and JWST/ground-based atmospheric characterizations into Starmap's scientific overlay layers. Use when curating news releases or updating overlay-recent-discoveries, overlay-jwst-targets, or overlay-extreme-worlds.
---

# Astro News Curator Skill (`DEC-040`)

Use this skill whenever the user or automated workflows ingest breaking astronomical news, newly confirmed exoplanetary discoveries within 100 parsecs, or flagship space telescope observational targets (e.g., JWST, HST, Europa Clipper, Roman).

---

## Core Scientific & Architectural Rules

1. **100-Parsec Catalog Boundary (`sy_dist <= 100`):**
   - Starmap focuses on the local interstellar neighborhood within 100 parsecs (~326 light-years).
   - Only curate exoplanet discoveries and stellar targets whose confirmed distance satisfies `sy_dist <= 100 pc`.
2. **Catalog Integrity & Host Star Verification:**
   - Every exoplanet or structure entry **must** bind to a real host star system (`systemId`) in Starmap's catalog.
   - If a host star is missing from the baseline catalog, add the host star's astrometric parameters (Gaia DR3 / SIMBAD coordinates, spectral type, distance, apparent magnitude) into `scripts/fetch-sources.ts` and run `npm run data:pipeline`.
3. **Deterministic Tour Ordering (`order`):**
   - Each entry in a scientific overlay layer (`overlay-recent-discoveries`, `overlay-jwst-targets`, `overlay-extreme-worlds`) **must** include a positive integer `order?: number` (e.g. `order: 1`, `order: 2`, ...).
   - This ensures the `<LayerCard />` step counter (`Step X of Y`) and Previous/Next buttons progress through the layer in a curated, logical pedagogical sequence.
4. **Planetary Parent Context (`parentBodyId`):**
   - For exomoons or planetary satellites (e.g. Europa, Titan), always specify `parentBodyId?: string` (e.g. `parentBodyId: 'jupiter'`).
   - This routes the user directly to the **Planet View** (`/planet/<parentPlanetSlug>?focus=<moonSlug>`) so the moon's orbit around its parent planet is directly visible in the viewport.
5. **No Ad-Hoc Scripts:**
   - Execute all operations via first-class npm scripts (`npm run sync:discoveries`, `npm run build:data`) and native file editing tools.

---

## Step-by-Step Curation Workflow

### Step 1: Ingest & Audit Discoveries
1. Run discovery audit via:
   ```bash
   npm run sync:discoveries -- --offline
   ```
   Or query NASA Exoplanet Archive TAP service (`pscomppars` where `sy_dist <= 100` and `disc_year >= 2024`).
2. Identify:
   - **Candidates Ready to Curate:** Host star exists in Starmap's catalog (`systemId` resolved).
   - **Missing Host Stars:** Host star requires ingestion into `scripts/fetch-sources.ts`.
   - **Already Curated:** Entries already present in `overlay-recent-discoveries`.

### Step 2: Verify or Ingest Missing Host Stars
If a discovery's host star is not yet present in Starmap:
1. Look up the host star on SIMBAD / Gaia DR3 for:
   - Right ascension / declination / parallax (`distancePc = 1000 / parallax_mas`).
   - Cartesian coordinates `[x, y, z]` in parsecs.
   - Spectral type and visual magnitude.
2. Add the host star definition to `scripts/fetch-sources.ts` under the appropriate gazetteer / survey table.
3. Add the confirmed exoplanet parameters to the composite exoplanet table in `scripts/fetch-sources.ts`.

### Step 3: Curate Scientific Layer Entries in `content/layers/`
1. Locate the appropriate scientific overlay layer module under `content/layers/` (registered in the barrel `content/layers/index.ts`):
   - `overlay-recent-discoveries`: Newly discovered or confirmed worlds (< 100 pc).
   - `overlay-jwst-targets`: Benchmark atmospheric reconnaissance targets (transmission/emission spectroscopy, direct imaging).
   - `overlay-extreme-worlds`: Astrobiological or physical extremes (hottest, fastest spinning, ocean worlds, nearest habitable candidates).
2. Add the entry to the layer's `entries` map. Layer `title` stays concise and bracket-free with an optional `subtitle`; entry `inUniverseName` is **omitted** when it equals the real-sky body name (the build resolves it from `targetId` / `systemId`); the optional entry `subtitle` is a short bracket-free label; `aliases` is a single space-delimited string of delta-only tokens (never repeating the name, subtitle, parent title or host name). There are no entry `tags`.
   ```ts
   'proxima-centauri-d': {
     order: 4,
     targetId: 'proxima-centauri-d',
     targetType: 'planet',
     systemId: 'gaia-5853498713190525696',
     inUniverseName: 'Proxima Centauri d',
     text: 'Sub-Earth candidate orbiting Sol’s closest stellar neighbour at 4.25 light-years with a 5.1-day period.',
     workTitle: 'ESPRESSO / ESO (2022)',
     aliases: ['Proxima Centauri d', 'Proxima d'],
     tags: ['Sub-Earth', 'Proxima Centauri', 'Nearby World'],
     confidence: 'confirmed',
   },
   ```
3. Ensure `order` is sequential and contiguous.

### Step 4: Rebuild Data & Verify
Run the following checks as separate single commands:
1. `npm run build:data` to rebuild `public/data/overlays/layers/*.json` and search indices.
2. `npx vitest run tests/syncDiscoveries.test.ts tests/datasetLayerCodec.test.ts` to ensure data codec and sync tests pass cleanly.
3. `npm run typecheck` to verify complete type safety.
