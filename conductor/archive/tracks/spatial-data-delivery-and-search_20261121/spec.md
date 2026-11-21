# Specification: Spatial Data Delivery, Search & Hydration

## Overview
Eliminates the main runtime data-transfer and main-thread parsing bottlenecks: ~4.9 MB eager startup search JSON, ~4 MB scatter-gather aperture hydration caused by FNV hash-sharded summaries/details, full ~12k-entry corpus cloning on every hydration, missing manifest/schema versioning, and ~33.6 MB of unreferenced build artefacts under `public/data/`.

Covers Performance Review findings `P-03`, `P-04`, `P-11`, `P-13`, and Architecture Review finding `M16` (artefact pruning, required schema check, and manifest versioning).

## Current State (baseline at 2026-11-21)
- Summaries (36 × ~125 kB = 4.5 MB) and details (36 × ~370 kB = 13 MB) are bucketed by `fnv1a32(id) % 36` (`binarySectorCodec.ts:30-32`, `detailsSummaryCache.ts:116`, `detailsRepository.ts:186-198`), so an 80-hit aperture touches ~89 % of all summary shards (~4 MB fetched and parsed on the main thread) and a single star selection parses a 370 kB shard (`P-03`).
- `useSearchCorpus('all')` eagerly fetches and parses `core.json` (1.64 MB) + `structures.json` (0.28 MB) + `minor-bodies.json` (3.0 MB) at startup even if the user never searches; verbose alias strings repeat derivable Gaia spellings (`P-04`).
- Every hydration after focus moves > 0.5 pc fires 3 state updates + a store write, rebuilds id/slug maps, copies the ~12k corpus (`[...corpus, ...extras]`), and builds an unused `hydratedByHash: new Map(hydratedMap)` (`P-11`).
- ~33.6 MB of the 67 MB build output (`public/data/{systems,sol,catalogs}`, `search/full.json`, `overlays/{exoplanetary-systems,galactic-structures}.json`) is never fetched by `src/` (`P-13`).
- `compactDataCodec.ts:126,221,234` checks schema `v` optionally and repeats the check 3×; shard filenames carry no content hash or manifest version (`M16`).

## Scope
1. **Phase 1 — Artefact Pruning, Schema Versioning, Lazy Search & Hydration Diffs (`P-13`, `M16`, `P-04`, `P-11`)**:
   - Stop emitting unreferenced pipeline outputs into `public/data/` (`systems/`, `sol/`, `catalogs/`, `search/full.json`, unreferenced overlays); move pipeline-only outputs outside `public/` where needed.
   - Require schema version `v` unconditionally via one shared `assertSchemaVersion()` helper, and introduce manifest-based content hashing / versioning so stale cached shards never collide with new bundles.
   - Ship a lightweight startup index (`id`, `name`, `pos`, `kind`) for focus/aperture, lazy-load `minor-bodies` on query/filter, prune derivable alias variants at build time, and move JSON parsing off the main thread into a Web Worker.
   - Return diffs from the hydration bridge, keep merged corpus layered (`base` + `extras`) without copying ~12k arrays, and delete the unused `hydratedByHash` `Map` copy.
2. **Phase 2 — Spatial Sector-Based Summary & Detail Sharding (`P-03`)**:
   - Re-shard summaries and details by spatial sector ID (co-located with `partitions/*.bin` or binary summary columns beside each sector) so an aperture or focus selection fetches only local spatial shards, with Worker-based decoding/parsing.

## Coordination Notes
- Requires [`data-contract-purity_20261121`](../data-contract-purity_20261121/spec.md) first so canonical types, strict precalculated fields, seed-backed `G-literals`, and shard contract tests guard the migration.
- Directly advances backlog item `FS-006` (*Adaptive Multi-Tier Search*) and lays the foundation for backlog items *CI-Built Runtime Data Artefacts* and *Full-Catalogue System Expansion*.

## Out of Scope
- Removing the remaining active `public/data/` shards from git into CI-built deploy artefacts (`M16`/`P-13` git-tracking subset) and `.br` precompression / streaming pipeline memory (`P-18`): tracked separately in `conductor/backlog.md` (*CI-Built Runtime Data Artefacts* and *Full-Catalogue System Expansion*).
- Zero-result search escalation UI and device/network search tiering (`FS-006`, remains in `conductor/backlog.md`).

## Acceptance Criteria
- [ ] `public/data/` contains zero unreferenced build artefacts; deployed data payload drops by ≥ 30 MB vs the 65 MB baseline.
- [ ] All compact JSON codecs require `v` through a single `assertSchemaVersion()` helper, and shard fetches resolve through versioned/fingerprinted manifest metadata.
- [ ] Initial galaxy startup does not fetch `minor-bodies.json`; startup search/focus index payload is materially smaller than 4.9 MB (measured and recorded), and JSON decoding runs in a Worker.
- [ ] Hydration applies incremental diffs without copying the full ~12k corpus or creating an unused `hydratedByHash` `Map`.
- [ ] Summary and detail shards are keyed by spatial sector so a typical aperture fetches only local sector shards rather than touching ~89 % of all buckets, validated by the shard contract test and Playwright e2e suite.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run test:coverage`, and `npm run capture:views` pass cleanly.
