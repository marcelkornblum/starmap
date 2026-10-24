# Implementation Plan: Dataset Layers, Search Indexing & Tag Taxonomy Expansion

## Phase 1: Schema, Codec & Search Index Optimisation + Skill Updates
- [x] Task: Update `DatasetLayerManifest`, `DatasetLayerEntry`, `CompactLayerManifest`, and `CompactLayerEntry` in `src/types/astro.ts` and `src/utils/datasetLayerCodec.ts`:
  - Add optional `subtitle?: string` (`t`) and space-delimited `aliases?: string` (`a`) to `DatasetLayerManifest` / `CompactLayerManifest`.
  - Make `inUniverseName?: string` (`u`) optional on `DatasetLayerEntry` / `CompactLayerEntry`, add optional `subtitle?: string` (`t`), and unify `aliases?: string` (`a`) to a single space-delimited string (replacing `string[]`).
- [x] Task: Update `buildSearchEntriesFromLayers` in `src/utils/datasetLayerCodec.ts` (with unit tests in `src/utils/datasetLayerCodec.test.ts`):
  - Remove `layer.description`, `layer.kind`, and `layer.source.summary` from `CompactSearchEntry.a`.
  - Implement stopword stripping (`the`, `of`, `in`, `on`, `at`, `to`, `for`, `and`, `or`, `a`, `an`, `from`, `by`, `with`, `is`, `are`, `we`), automatic book-author surname extraction from `layer.source?.creator` (superseded by DL-01: author surnames authored directly into parent `aliases`), and substring deduplication against `normalizeCleanKey(entry.n)` and `normalizeCleanKey(entry.c)`.
- [x] Task: Update `layerCardService.ts`, `detailsPanelService.ts`, and `searchService.ts` to consume optional `inUniverseName` (falling back to the resolved real-sky entity name when `inUniverseName` is omitted) and optional `subtitle` (`t`).
- [x] Task: Update `.agents/skills/canon-layer-author/SKILL.md` and `.agents/skills/astro-news-curator/SKILL.md` to enforce the new `subtitle` (`t`), space-delimited `aliases` (`a`), optional `inUniverseName` (`u`), and book-author-only surname indexing rules (DL-01) — and the new `content/layers/<layerId>.ts` authoring location (DL-05).
- [x] Task: Layer data externalisation (DL-04 / DL-05):
  - [x] Add `content` to `tsconfig.app.json` `include` so authored layer modules are type-checked.
  - [x] Migrate each layer in `SEED_FICTIONAL_CANON_LAYERS` to its own `content/layers/<layerId>.ts` (`export default` typed `DatasetLayerManifest`) plus a barrel `content/layers/index.ts`; `scripts/build-data.ts` imports the barrel; delete `SEED_FICTIONAL_CANON_LAYERS` from `src/`.
  - [x] Add `src/data/layerRepository.ts` (fetch/cache `overlays/layers/index.json` and `overlays/layers/<layerId>.json`, mirroring `searchRepository.ts`); fetch the index at app bootstrap before router resolution (S2).
  - [x] Remove all `= SEED_FICTIONAL_CANON_LAYERS` default parameters from `searchService.ts`, `layerCardService.ts`, `details/hazardsAndComposition.ts`; callers pass the index / manifest / annotations explicitly.
  - [x] Dedicated by-entity annotation shards `overlays/layers/by-entity/<bucket>.json` (DL-05 S3 amendment) written by `scripts/build-data.ts` and consumed in `resolveFocusedCanonAnnotations` / `resolveDirectTargetCanonAnnotations`.
  - [x] Precalculate real-sky display names (DL-02) and the search `h` flag (DL-03) in `scripts/build-data.ts`; remove the hardcoded entity-ID list from `buildSearchEntriesFromLayers`.
- [x] Task: Phase Verification & Checkpoint (Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`).

## Phase 2: Existing Layer Tightening, Anthology Splitting & Factual Layer Expansion
- [x] Task: Audit and tighten all existing fictional canon layers (`canon-project-hail-mary`, `canon-three-body`, `canon-dune`, `canon-the-expanse`, `canon-star-trek`, `canon-bobiverse`, `canon-revelation-space`, `canon-halo`, `canon-avatar`, `canon-hitchhikers-guide`) to use concise bracket-free `title`, optional `subtitle`, omitted `inUniverseName` when identical to real-sky names, distinctive in-universe names prioritised over real-sky designations, and minimal delta-only `aliases`.
- [x] Task: Split `canon-classic-scifi` into dedicated single-franchise layers (`canon-space-odyssey`, `canon-alien`, `canon-foundation`, `canon-hyperion`, `canon-contact`, `canon-aurora`) and remove the `canon-classic-scifi` grab-bag layer.
- [x] Task: Reorganise and expand factual scientific overlays (`kind: 'scientific-overlay'`) into the 7 ratified layers:
  - `overlay-interstellar-probes` (**Interstellar Probes** — tagging both `new-horizons`, `pioneer-11`, `pioneer-10`, `voyager-2`, `voyager-1` in `sol` and their future encounter stars *Aldebaran*, *Ross 248*, *Gliese 445*).
  - `overlay-seti-landmarks` (**SETI & Radio Signals** — *Tau Ceti*, *Epsilon Eridani*, *M13 Hercules*, *Chi-1 Sagittarii*, *55 Cancri*, *Proxima Centauri*).
  - `overlay-solar-landmarks` (**Solar System Landmarks** — *Venus*, *Moon*, *Mars*, *433 Eros*, *101955 Bennu*, *162173 Ryugu*, *67P*, *Titan*).
  - `overlay-jwst-targets` (**JWST Targets** — anchored at `jwst` in `sol` L2 plus flagship exoplanet targets).
  - `overlay-habitable-worlds` (**Habitable Worlds Survey** — NASA HWO Tier-A solar analogues).
  - `overlay-recent-discoveries` (**Recent Discoveries**).
  - `overlay-extreme-worlds` (**Extreme Worlds**).
- [x] Task: Phase Verification & Checkpoint (Rebuild data shards via `npm run build:data` and run `npm run lint`, `npm run typecheck`, `npm run test:coverage`).

## Phase 3: Comprehensive Sci-Fi Canon Catalogue Expansion (114-Franchise Master Roster)
- [x] Task: Cross-match and author Batch 1 of the consolidated 114-franchise master roster in `SEED_DATASET_LAYERS` (major multi-system & classic literary/TV/game franchises: *Babylon 5*, *The Dispossessed*, *Rocannon's World*, *Known Space*, *Alliance–Union*, *The Martian*, *Artemis*, *Interstellar*, *Mars Trilogy*, *2312*, *Icehenge*, *For All Mankind*, *Wandering Earth*, *Rendezvous with Rama*, *Imperial Earth*, *Songs of Distant Earth*, *Childhood's End*, *Forever War*, *Old Man's War*, *Cowboy Bebop*, *Mass Effect*, *Starfield*, *Ender's Game*, *Forbidden Planet*, Heinlein works, Hamilton works, Watts/Egan/Pohl/Russell/Baxter works).
- [x] Task: Cross-match and author Batch 2 of the consolidated 114-franchise master roster in `SEED_DATASET_LAYERS` (remaining literary, film, TV, and game works #58–#114: *Poseidon's Children*, *Pushing Ice*, *Tau Zero*, *Mission of Gravity*, *Rocheworld*, *Coyote*, *Frontlines*, *Mote in God's Eye*, *Footfall*, *Quantum Thief*, *Accelerando*, *Saturn's Children*, *Stars My Destination*, *Demolished Man*, *Sirens of Titan*, Philip K. Dick works, Bradbury/Wells/Verne/Benford/Brin/Miller/McDevitt/Stephenson works, standalone films #86–#103, and TV/anime/game franchises #104–#114).
- [x] Task: Rebuild `public/data/overlays/layers/*.json` and `public/data/search/layers.json` via `npm run build:data` and verify search index compactness and query accuracy across franchise titles, book author surnames, and in-universe planet names.
- [x] Task: Phase Verification & Checkpoint (Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`).

## Phase 4: Legacy Collection Retirement, Tag Taxonomy Unification & Final Verification
- [ ] Task: Retire duplicate `SEED_CURATED_COLLECTIONS` in `src/data/guideCatalog.ts` and wire all consumers to the unified `DatasetLayerManifest` registry.
- [ ] Task: Audit and unify `SYSTEM_TAG_BITS` and planet/minor-body tag taxonomy across `scripts/build-data.ts`, `src/utils/compactDataCodec.ts`, `src/services/searchService.ts`, and UI panels.
- [ ] Task: Run full data build (`npm run build:data`), quality suite (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:r3f`), and capture 5-viewport Playwright screenshots (`npm run capture:views`).
