# Implementation Plan: Dataset Layers, Search Indexing & Tag Taxonomy Expansion

## Phase 1: Schema, Codec & Search Index Optimisation + Skill Updates
- [ ] Task: Update `DatasetLayerManifest`, `DatasetLayerEntry`, `CompactLayerManifest`, and `CompactLayerEntry` in `src/types/astro.ts` and `src/utils/datasetLayerCodec.ts`:
  - Add optional `subtitle?: string` (`t`) and space-delimited `aliases?: string` (`a`) to `DatasetLayerManifest` / `CompactLayerManifest`.
  - Make `inUniverseName?: string` (`u`) optional on `DatasetLayerEntry` / `CompactLayerEntry`, add optional `subtitle?: string` (`t`), and unify `aliases?: string` (`a`) to a single space-delimited string (replacing `string[]`).
- [ ] Task: Update `buildSearchEntriesFromLayers` in `src/utils/datasetLayerCodec.ts` (with unit tests in `src/utils/datasetLayerCodec.test.ts`):
  - Remove `layer.description`, `layer.kind`, and `layer.source.summary` from `CompactSearchEntry.a`.
  - Implement stopword stripping (`the`, `of`, `in`, `on`, `at`, `to`, `for`, `and`, `or`, `a`, `an`, `from`, `by`, `with`, `is`, `are`, `we`), automatic book-author surname extraction from `layer.source?.creator`, and substring deduplication against `normalizeCleanKey(entry.n)` and `normalizeCleanKey(entry.c)`.
- [ ] Task: Update `layerCardService.ts`, `detailsPanelService.ts`, and `searchService.ts` to consume optional `inUniverseName` (falling back to the resolved real-sky entity name when `inUniverseName` is omitted) and optional `subtitle` (`t`).
- [ ] Task: Update `.agents/skills/canon-layer-author/SKILL.md` and `.agents/skills/astro-news-curator/SKILL.md` to enforce the new `subtitle` (`t`), space-delimited `aliases` (`a`), optional `inUniverseName` (`u`), and book-author-only surname indexing rules.
- [ ] Task: Phase Verification & Checkpoint (Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`).

## Phase 2: Existing Layer Tightening, Anthology Splitting & Factual Layer Expansion
- [ ] Task: Audit and tighten all existing fictional canon layers (`canon-project-hail-mary`, `canon-three-body`, `canon-dune`, `canon-the-expanse`, `canon-star-trek`, `canon-bobiverse`, `canon-revelation-space`, `canon-halo`, `canon-avatar`, `canon-hitchhikers-guide`) to use concise bracket-free `title`, optional `subtitle`, omitted `inUniverseName` when identical to real-sky names, distinctive in-universe names prioritised over real-sky designations, and minimal delta-only `aliases`.
- [ ] Task: Split `canon-classic-scifi` into dedicated single-franchise layers (`canon-space-odyssey`, `canon-alien`, `canon-foundation`, `canon-hyperion`, `canon-contact`, `canon-aurora`) and remove the `canon-classic-scifi` grab-bag layer.
- [ ] Task: Reorganise and expand factual scientific overlays (`kind: 'scientific-overlay'`) into the 7 ratified layers:
  - `overlay-interstellar-probes` (**Interstellar Probes** — tagging both `new-horizons`, `pioneer-11`, `pioneer-10`, `voyager-2`, `voyager-1` in `sol` and their future encounter stars *Aldebaran*, *Ross 248*, *Gliese 445*).
  - `overlay-seti-landmarks` (**SETI & Radio Signals** — *Tau Ceti*, *Epsilon Eridani*, *M13 Hercules*, *Chi-1 Sagittarii*, *55 Cancri*, *Proxima Centauri*).
  - `overlay-solar-landmarks` (**Solar System Landmarks** — *Venus*, *Moon*, *Mars*, *433 Eros*, *101955 Bennu*, *162173 Ryugu*, *67P*, *Titan*).
  - `overlay-jwst-targets` (**JWST Targets** — anchored at `jwst` in `sol` L2 plus flagship exoplanet targets).
  - `overlay-habitable-worlds` (**Habitable Worlds Survey** — NASA HWO Tier-A solar analogues).
  - `overlay-recent-discoveries` (**Recent Discoveries**).
  - `overlay-extreme-worlds` (**Extreme Worlds**).
- [ ] Task: Phase Verification & Checkpoint (Rebuild data shards via `npm run build:data` and run `npm run lint`, `npm run typecheck`, `npm run test:coverage`).

## Phase 3: Comprehensive Sci-Fi Canon Catalogue Expansion (114-Franchise Master Roster)
- [ ] Task: Cross-match and author Batch 1 of the consolidated 114-franchise master roster in `SEED_DATASET_LAYERS` (major multi-system & classic literary/TV/game franchises: *Babylon 5*, *The Dispossessed*, *Rocannon's World*, *Known Space*, *Alliance–Union*, *The Martian*, *Artemis*, *Interstellar*, *Mars Trilogy*, *2312*, *Icehenge*, *For All Mankind*, *Wandering Earth*, *Rendezvous with Rama*, *Imperial Earth*, *Songs of Distant Earth*, *Childhood's End*, *Forever War*, *Old Man's War*, *Cowboy Bebop*, *Mass Effect*, *Starfield*, *Ender's Game*, *Forbidden Planet*, Heinlein works, Hamilton works, Watts/Egan/Pohl/Russell/Baxter works).
- [ ] Task: Cross-match and author Batch 2 of the consolidated 114-franchise master roster in `SEED_DATASET_LAYERS` (remaining literary, film, TV, and game works #58–#114: *Poseidon's Children*, *Pushing Ice*, *Tau Zero*, *Mission of Gravity*, *Rocheworld*, *Coyote*, *Frontlines*, *Mote in God's Eye*, *Footfall*, *Quantum Thief*, *Accelerando*, *Saturn's Children*, *Stars My Destination*, *Demolished Man*, *Sirens of Titan*, Philip K. Dick works, Bradbury/Wells/Verne/Benford/Brin/Miller/McDevitt/Stephenson works, standalone films #86–#103, and TV/anime/game franchises #104–#114).
- [ ] Task: Rebuild `public/data/overlays/layers/*.json` and `public/data/search/layers.json` via `npm run build:data` and verify search index compactness and query accuracy across franchise titles, book author surnames, and in-universe planet names.
- [ ] Task: Phase Verification & Checkpoint (Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`).

## Phase 4: Legacy Collection Retirement, Tag Taxonomy Unification & Final Verification
- [ ] Task: Retire duplicate `SEED_CURATED_COLLECTIONS` in `src/data/guideCatalog.ts` and wire all consumers to the unified `DatasetLayerManifest` registry.
- [ ] Task: Audit and unify `SYSTEM_TAG_BITS` and planet/minor-body tag taxonomy across `scripts/build-data.ts`, `src/utils/compactDataCodec.ts`, `src/services/searchService.ts`, and UI panels.
- [ ] Task: Run full data build (`npm run build:data`), quality suite (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:r3f`), and capture 5-viewport Playwright screenshots (`npm run capture:views`).
