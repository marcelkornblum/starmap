# Specification: Data Contract Purity & Precalculation

## Overview
Enforces the build-time precalculation and zero-hardcoding contract across pipeline, codecs, runtime services, guide content, and AST guards. Removes hardcoded entity attributes and formatted display strings from `src/config` and `src/content`, deletes runtime `?? computeXxx(...)` physics fallbacks, consolidates drifting inline type unions, and decouples `G-literals` from committed `public/data/` outputs.

Covers Architecture Review findings `H1`, `H2`, `M2`, `M10`, and `M17`. Serves as a hard prerequisite before changing shard topology in [`spatial-data-delivery-and-search_20261121`](../spatial-data-delivery-and-search_20261121/spec.md).

## Current State (baseline at 2026-11-21)
- `src/config/referenceTargets.ts:80-192` hardcodes Sol/Earth/Tau Ceti physical attributes and pre-formatted display strings (`'-26.74 V / +4.83 M_V'`, `'5,778 K'`) and is imported by ~30 runtime files; `scripts/audit-guards.ts:207` exempts `src/config/` and `src/content/` from `G-literals` (`H1`).
- Runtime decoders and services retain `precomputed ?? compute(...)` fallbacks and render-time classification (`focusedBaseDetails.ts:164,173`, `detailsComposition.ts:19,66`, `compactDataCodec.ts:186`, `compactEntityDecoder.ts:88,102`, `Reticle.tsx:10`, `systemPlanetResolver.ts:3`), shipping build-time physics (`planetaryPhysics`, `astroHazards`) to the client (`H2`).
- `scripts/audit-guards.ts:56-60,87-93` builds the `G-literals` entity catalogue from committed `public/data/search/{core,stars,planets}.json` (silently skipping if absent) plus 9 hand-listed names (`M2`).
- `src/types/astro.ts` and `src/utils/compactDataTypes.ts` re-declare inline unions with inconsistent members (`PlanetComposition`, `StellarClassification` ×4, `composition: string` on disks, stringly-typed `tags`) (`M10`).
- `src/content/guide/{metricTypes,planetTypes,starTypes}.ts` hardcodes entity facts and hand-built hrefs with 25 `guard-disable-line G-literals` suppressions, and duplicates `--star-chromaticity-*` hex colours (`M17`).

## Scope
1. **Canonical Types & Strict Precalculated Codecs (`M10`, `H2`)**:
   - Define single canonical unions (`PlanetComposition`, `StellarClassification`, typed bitmask/flag helpers) in `src/types/` and derive compact codec types from them.
   - Make all precalculated fields required in compact codecs, fail loudly in decoders when missing, delete runtime `?? computeXxx(...)` fallbacks and render-time classification in `Reticle.tsx`, and keep build-only physics modules (`planetaryPhysics`, `astroHazards`) out of the runtime bundle.
   - Add an automated shard contract test asserting that every emitted shard decodes with all required precalculated fields present.
2. **Eliminate Hardcoded Reference Targets & Guide Facts (`H1`, `M17`)**:
   - Move Sol/Earth/Tau Ceti baseline parameters into `data/seed` → build pipeline → structured `{ value, unit }` shard outputs; keep only entity IDs (`'sol'`, `'earth'`, `'tau-ceti'`) in `src/config/referenceTargets.ts`.
   - Drive guide entity examples in `src/content/guide/*` from dataset lookups by ID (extending `guideCatalogExamples`), replace hand-built hrefs with URL builders, deduplicate star hex colours against tokens, and delete all 25 `guard-disable-line G-literals` suppressions.
3. **Guard Hardening (`H1`, `M2`)**:
   - Remove the `src/config/` and `src/content/` exemptions from `scripts/audit-guards.ts`.
   - Source the `G-literals` catalogue from `data/seed` instead of generated `public/data/search/*.json`, and fail loudly if the catalogue is empty.

## Out of Scope
- Changing shard partitioning, search corpus layout, or schema versioning: [`spatial-data-delivery-and-search_20261121`](../spatial-data-delivery-and-search_20261121/spec.md).
- Enabling `noUncheckedIndexedAccess` across `src/utils` and codecs (`L5`): [`state-layering-and-legacy-cleanup_20261121`](../state-layering-and-legacy-cleanup_20261121/spec.md).

## Acceptance Criteria
- [ ] `src/config/referenceTargets.ts` contains only entity IDs/references — zero hardcoded physical values or pre-formatted display strings.
- [ ] `src/content/guide/*` resolves all entity examples from dataset records by ID with zero `guard-disable-line G-literals` suppressions and zero hand-built entity hrefs.
- [ ] `scripts/audit-guards.ts` enforces `G-literals` across `src/config/` and `src/content/` using `data/seed`, failing if the seed catalogue is empty.
- [ ] Zero runtime `?? computeXxx(...)` physics fallbacks or render-time reticle classifications remain in `src/`; build-only physics modules do not enter the client bundle; a contract test validates all required precalculated fields across emitted shards.
- [ ] `PlanetComposition`, `StellarClassification`, and bitmask/tag types are declared once in `src/types/` with zero drifting inline duplicates.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run test:coverage`, and `npm run capture:views` (verifying Details/Guide views) pass cleanly.
