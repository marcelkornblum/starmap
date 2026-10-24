# Decision Log: Dataset Layers, Search Indexing & Tag Taxonomy Expansion

*Standalone track (no initiative) — decisions recorded here.*

## Phase 1 — Schema, Codec & Search Index

### DL-01 — Book-author surname source *(Ratified direction 2026-10-21; field shape pending confirmation)*
- **Problem:** `source.creator` / `source.medium` are free-form display strings; heuristic parsing cannot distinguish book authors from film/TV directors, nor handle family-name-first (`Liu Cixin` → `liu`) or multi-word surnames (`Le Guin` → `leguin`).
- **Options considered:** (A) explicit authored surname field; (B) structured `{ name, surname }[]` authors; (C) build-time heuristic parse of `creator` gated on `medium`.
- **Decision:** No heuristic/scripted extraction. Book-author surnames are **researched and authored explicitly per layer** by the agent (primary research), not derived from `creator` at build time.
- **Follow-up:** Audit of the spec §3 master roster's author attributions and roster completeness (only 80 of 114 rows carry a book author) in progress.

### DL-02 — Real-sky display name when `inUniverseName` is omitted *(Ratified 2026-10-21)*
- **Problem:** Runtime currently falls back to `formatSlugFallbackTitle(targetId)` (`"Gaia 2452378776434477184"`) and search `n` to `"<layer> (<targetId>)"`.
- **Options considered:** (A) precalculate at build time; (B) resolve at runtime from catalogue shards.
- **Decision:** **(A)** `scripts/build-data.ts` resolves each entry's real-sky display name and writes it into the layer shard (new compact entry field) and search entry `n`; runtime reads it directly.

### DL-03 — Hardcoded entity IDs in `buildSearchEntriesFromLayers` *(Ratified 2026-10-21)*
- **Problem:** Search `h` flag set from a hardcoded list (`earth`, `mars`, `europa`, `ganymede`, `titan`) — breaches zero-hardcoded-entity-attributes guardrail.
- **Decision:** **Fix in this track.** Derive `h` from precalculated pipeline data (semantics of `h` to be confirmed during implementation; no hardcoded IDs).

### DL-04 — Externalise authored layer data from `src/` *(Ratified 2026-10-21 — Phase 1 scope)*
- **Problem:** `SEED_FICTIONAL_CANON_LAYERS` lives in `src/utils/datasetLayerCodec.ts` and is imported directly by `layerCardService.ts`, `searchService.ts` and `details/hazardsAndComposition.ts`, so it ships in the client bundle and bypasses the generated shards.
- **Decision:** Authored layer data moves to versioned source files read only by `scripts/build-data.ts`; runtime consumes only generated `public/data/` shards.

### DL-05 — Layer sharding strategy *(Ratified 2026-10-21)*
- **S1 Authoring format:** **One TypeScript module per layer** in a non-`src` data directory (e.g. `data/layers/canon-dune.ts`), each `export default` a typed `DatasetLayerManifest`, collected by a barrel file. (Rejected: per-layer JSON + schema; single large TS file.)
- **S2 URL parsing index:** **Fetch `overlays/layers/index.json` at app bootstrap** before the router resolves; services receive the index as a parameter. (Rejected: layer-agnostic URL param — would change the URL contract.)
- **S3 Entity → layer reverse lookup:** **Bake canon annotations into the existing `details/<0..z>.json` shards** at build time; zero extra fetch on focus. (Rejected: dedicated `by-entity` shards; single global reverse index.)
- **S4 Runtime contract:** Services stay pure and synchronous with `SEED_*` default parameters removed; new `src/data/layerRepository.ts` owns shard fetching/caching, mirroring `detailsRepository.ts` / `searchRepository.ts`. (Proposed; no objection raised.)
- **S1 location (ratified 2026-10-21):** `content/layers/` (top-level, versioned). The root `/data/` directory is **gitignored** (raw downloaded catalogues) so cannot host authored content. `content/` is added to `tsconfig.app.json` `include` so the modules are type-checked (`tsc -b` previously covered only `src`, `tests`, `.storybook`; `scripts/` is not type-checked at all).

## Roster Curation Decisions

### DL-06 — Author-token policy *(Ratified 2026-10-21)*
- Surname tokens only for the author(s) of the **original primary book / novella / short story / manga**. Creators, showrunners, directors, studios and tie-in/novelisation authors get **none**.
- Resolved cases: **Halo, Mass Effect, Dead Space, Red Dwarf** → none (tie-in only; Red Dwarf creators' novels do not count). **Robinson Crusoe on Mars** → none. **Destination Moon** → none. **Ikarie XB-1** → none (adaptation link to Lem too tenuous).
- Net effect on audit: `heinlein`/`lem`/`defoe`/`grant`/`naylor` removed from those rows; 77 → 75 tokenised rows; Heinlein/Lem remain tokenised only for their own book-based rows.

### DL-07 — Inclusion rule: narrative events must occur at the location *(Ratified 2026-10-21)*
- A work is anchored to a body/star/structure **only if actual narrative events occur there**. Sprawling or simulation-scale works that merely *contain* real locations are excluded.
- **Elite / Elite Dangerous** → excluded (whole-galaxy simulation). **Sailor Moon** → excluded (mythological planetary kingdoms).
- Implication: works already flagged as marginal (Thunderbirds, Star Cops, Perry Rhodan, Warhammer 40,000, Stellaris, Star Citizen, etc.) must be justified per-anchor against this rule when authored; partial/incidental settings are dropped.

### DL-08 — Verification marking via confidence pip *(Direction ratified 2026-10-21; mapping pending)*
- Unverified roster entries / anchors are to be marked with the existing `<ConfidencePip>` / `ObservationalConfidence` tier (`DatasetLayerEntry.confidence`, already in the schema) rather than a new field. Exact tier mapping (and whether unverified anchors ship at all, or are verified before release) to be settled.

### DL-09 — Layer granularity: group where it improves the UI *(Ratified direction 2026-10-21; grouping boundaries per-case)*
- Where several works share a setting, universe, author-cycle or narrative continuity, they are **grouped into one layer** (e.g. Heinlein juveniles, Asimov *Lucky Starr*, Clarke lunar novels, Varley *Eight Worlds*, Gerry Anderson series) when this yields a better layer card / UI than separate layers.
- Standalone works with distinct, substantial settings stay as single-work layers.
- Layer `title` stays short and bracket-free; individual works inside a grouped layer are carried by the entry-level `workTitle` field (already in `DatasetLayerEntry`). Concrete groupings will be proposed per batch for ratification before authoring.

### DL-08 (resolved) — Verify first *(Ratified 2026-10-21)*
- Every roster entry and real-sky anchor is **verified against a cited source before it is authored** into `content/layers/`. No unchecked guesses ship.
- The confidence pip (`DatasetLayerEntry.confidence`) is reserved for entries where a source genuinely cannot be found or the anchor is interpretive (e.g. `candidate`/`theoretical`), not as a shortcut for unfinished research.
- Consequence: Phase 3 authoring is gated on per-batch source verification; the research artifacts (author audit, screen/game and literature candidates) are *leads*, not authoritative data.

### DL-01 (resolved) — Author surnames live in parent `aliases` *(Ratified 2026-10-21)*
- Researched book-author surnames (DL-06 policy) are authored directly into the **parent layer `aliases` (`a`)** space-delimited string. No new `source` field.
- **Supersedes spec §2.2:** `buildCompactLayerSearchKeys` does **not** extract surnames from `source.creator`; `creator` remains display-only metadata.

### DL-05 amendment — S3 reopened and revised *(Ratified 2026-10-21)*
- **S3 now:** dedicated `overlays/layers/by-entity/<bucket>.json` shards (same 36-bucket hashing as details) mapping entity ID → annotation records (layer ID, title, optional name/subtitle, text, order). Written by `scripts/build-data.ts` alongside the per-layer shards.
- **Supersedes** the earlier "bake into `details/<0..z>.json`" choice. Reasons: layer edits would otherwise churn all details shards; prose duplicated per popular body; user-authored layers (`FS-002`) cannot be baked; details repository caches indefinitely while layers version independently. Rejected: ID-only reverse index + per-layer fetch (fan-out for Sol bodies).
- **Store (S2 mechanism):** layer index held in a Zustand store (like `useSettingsStore`) populated by the bootstrap fetch.

### DL-10 — Remove canon entry tags; `tag:` is catalogue-only *(Ratified 2026-10-21)*
- **Finding:** `DatasetLayerEntry.tags` (~90 hand-authored free-text labels such as `Astrophage`) pre-dates this track (Journey 1 PR #37). No documented rule governs when to create or show one; they overlap with `aliases`/`subtitle` and with layers themselves (`?select=layer:` is already the grouping/highlighting mechanism).
- **Decision:** Drop canon entry tags entirely. `?select=tag:` resolves **catalogue system tags only** (the pipeline-computed bitmask: `HomeSystem`, `NakedEye`, `ExoplanetHost`, `HabitableCandidate`, `VariableStar`, …).
- **Cutover scope (no shims/aliases):** remove `tags` from `DatasetLayerEntry`, `CompactLayerEntry` (`g`), `CompactEntityAnnotation` (`g`), `FocusedCanonAnnotation`; remove the canon tag line/links in `DetailsPanel` (`details-canon-tags`); drop entry tags from `buildSearchEntriesFromLayers` keys; remove `tags:` from every `content/layers/*.ts`; `isCatalogOrCanonTag` → catalogue-only; `resolveSelectedSystemsFromTag` catalogue-only.
- **Consequence:** token validation no longer needs layer data; only `layer:` tokens need the layer index. Resolves the DL-05 S2/S3 tag ambiguity without index growth.

### DL-03 (corrected) — meaning of search `h` *(2026-10-21)*
- Earlier note misread `h` as a habitability flag. Per `public/data/README.md`, search-entry `h` = **`isSolSystem`** (entity belongs to Sol). The hardcoded `earth`/`mars`/`europa`/`ganymede`/`titan` list in `buildSearchEntriesFromLayers` is redundant: `h = 1` iff `systemId === 'sol' || targetId === 'sol'`. All hardcoded entity IDs removed.
