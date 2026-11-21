# Implementation Plan: Data Contract Purity & Precalculation

> **Ratified Decisions (2026-11-21):**
> - **A1 (`M10`):** Standardise on canonical 4-member `PlanetComposition = 'terrestrial' | 'super-earth' | 'ice-giant' | 'gas-giant'` everywhere (including `SolarSystemBodyRecord`, `SatelliteRecord`, `CompactSolarSystemBody`, and `data/seed/solar-system-bodies.json`, migrating Uranus/Neptune from `'sub-neptune'` to `'ice-giant'`; zero aliases).
> - **A2 (`H1`/`M17`):** Move curated guide examples and Sol/Earth physical baselines into `data/seed/` → build-time JSON shards (`public/data/guide-examples.json`, `public/data/reference-baselines.json`). Shrink `src/config/referenceTargets.ts` to structural ID references only (`sol`, `earth`, `tau-ceti`, `tau-ceti-e`, and wire tag `'sol'`), narrowly allowlisted for ID constants in `scripts/audit-guards.ts`, with zero `G-literals` suppressions in `src/content/`.
> - **A3 (`M2`):** Source `G-literals` strictly from `data/seed/*.json` (failing loudly if empty) plus structural catalogue-ID regex checks (`gaia-*`, `hip-*`, `hyg-*`).

## Phase 1: Canonical Types & Strict Precalculated Codecs (`M10`, `H2`)
- [x] Task 1.1: Define canonical `PlanetComposition`, `PlanetCompositionCounts`, `StellarClassification`, `SystemTag`, `SystemTagBit`, `PlanetHazardBit`, and `SystemHazardBit` in `src/types/astro.ts` (and re-export where needed in `src/types/spatial.ts`, `src/types/astroStructures.ts`, `src/utils/compactDataConstants.ts`, `src/utils/compactDataTypes.ts`, `src/content/guide/types.ts`). Migrate `data/seed/solar-system-bodies.json` (`'sub-neptune'` → `'ice-giant'`) and remove all duplicate/drifting inline unions across `src/` and `scripts/`.
- [x] Task 1.2: Move `SYSTEM_HAZARD_BITS` and `PLANET_HAZARD_BITS` into `src/utils/compactDataConstants.ts` (re-exported by `src/utils/astroHazards.ts` for pipeline callers) so runtime hazard decoders (`detailsHazards.ts`) never import `astroHazards.ts`.
- [x] Task 1.3: Complete build-time precalculation in `scripts/pipeline/*` (`gaiaPipeline.ts`, `solAndSummary.ts`, `multiStarConsolidation.ts`, `compactDataEncoder.ts`, `compactEntityEncoder.ts`, `solarSearchIndexer.ts`, `exoplanets.ts`):
  - Always emit explicit `c` (composition) on every exoplanet and solar-system planet, `rt` (`reticleType`) on every `StellarComponent`, `b` (`planetCompositionCounts`) on every planet-hosting system, `l` (`isTidallyLocked`) on exoplanets/solar bodies where determinable, and `hazardMask` on Sol & RECONS manifests.
  - Rebuild `public/data/` via `npm run data:build` and verify deterministic output.
- [x] Task 1.4: Make runtime codecs strict and remove all runtime physics fallbacks and render-time classification:
  - Fail loudly in `compactDataCodec.ts` / `compactEntityDecoder.ts` when required precalculated fields (`c` on exoplanets, `b` on planet-hosting systems, `rt` on stellar components) are missing.
  - Remove `planetaryPhysics` and `astroHazards` imports and all `?? computeXxx(...)` fallbacks from `compactDataCodec.ts`, `compactEntityDecoder.ts`, `focusedBaseDetails.ts`, `detailsComposition.ts`, `focusedManifestMapper.ts`, `focusedPlanetDetails.ts`, `galaxyBodiesExtractor.ts`, `Reticle.tsx`, `systemPlanetResolver.ts`, and `guideMetricBenchmarks.ts`.
  - Add an automated shard contract test (`scripts/pipeline/shardContract.test.ts` or `src/utils/compactDataCodec.contract.test.ts`) verifying every emitted summary/detail shard decodes cleanly with all required precalculated fields present, and a bundle/import guard verifying `planetaryPhysics.ts` and `astroHazards.ts` have zero runtime importers in `src/`.
- [x] Task 1.5: Quality Check: `npm run check`, `npm run test:coverage`, `npm run build` (verify `planetaryPhysics`/`astroHazards` absent from client bundle).
- [x] Task 1.6: Phase 1 Checkpoint commit on `chore/data-contract-purity`.

## Phase 2: Reference Targets & Guide Content Purity (`H1`, `M17`)
- [x] Task 2.1: Author `data/seed/guide-examples.json` (curated example entity IDs + scopes + educational context tags for `starTypes`, `planetTypes`, `metricTypes`, `hazardTypes`) and enrich Sol/Earth seed fields in `data/seed/solar-system-bodies.json` (`mag`, `absmag`, `luminosityLsun`, `effectiveTempK`, `spectralType`, `coordinatesPc`) so all baseline physical telemetry derives from `data/seed/` → build pipeline.
- [x] Task 2.2: Extend `scripts/build-data.ts` to emit `public/data/reference-baselines.json` (structured `{ value, unit }` Sol/Earth/Tau Ceti baselines) and `public/data/guide-examples.json` (resolved names, canonical hrefs via URL builders, and structured telemetry from the real pipeline dataset). Rebuild `public/data/`.
- [x] Task 2.3: Shrink `src/config/referenceTargets.ts` to structural entity IDs and wire tag only (`SOL_REFERENCE_TARGET`, `EARTH_REFERENCE_TARGET`, `DEFAULT_GUIDE_BENCHMARKS`, `DEFAULT_ORIGIN_TARGETS`, `COMPACT_SOLAR_BODY_TAG` — zero physical values, zero display names, zero formatted display strings). Update all ~30 callers across `src/` to read display names and telemetry from dataset/baseline repositories instead of `referenceTargets.ts`.
- [x] Task 2.4: Refactor `src/content/guide/{starTypes,planetTypes,metricTypes,hazardTypes}.ts` and `src/services/guide/{guideCatalogExamples,guideMetricBenchmarks,guideMetrics}.ts`:
  - Remove all hardcoded entity facts, hand-built entity hrefs, and all 25 `guard-disable-line G-literals` suppressions from `src/content/guide/*`.
  - Deduplicate `chromaticityHex` in `src/content/guide/starTypes.ts` against CSS semantic tokens (`var(--spectral-*)` / `var(--star-chromaticity-*)`, removing raw hex literals from `starTypes.ts` and `Guide3DPreview`).
  - Wire Guide views (`StarTypesListView`, `StarTypeDetailView`, `PlanetTypesListView`, `PlanetTypeDetailView`, `MetricsListView`, `MetricDetailView`, `HazardsListView`, `HazardDetailView`) to consume dataset-driven examples and structured baselines cleanly.
- [x] Task 2.5: Quality Check & Visual Review: `npm run check`, `npm run test:coverage`, `npm run build`, and `npm run capture:views` across all 5 viewports for Guide and Details views.
- [x] Task 2.6: Phase 2 Checkpoint commit on `chore/data-contract-purity`.

## Phase 3: Seed-Backed `G-literals` & Exemption Removal (`H1`, `M2`)
- [ ] Task 3.1: Refactor `scripts/audit-guards.ts`:
  - Remove the blanket `src/content/` and `src/config/` exemptions from `auditLiteralsContent`.
  - Add narrow structural-ID allowlist strictly for `src/config/referenceTargets.ts` (allowing only ID constants, still rejecting any display names, physical values, or numeric fallbacks).
  - Replace `loadEntityCatalog` to load strictly from `data/seed/*.json` (failing loudly with an error if the loaded catalogue is empty) and remove the 9 hand-listed benchmark names/IDs.
  - Add structural catalogue-ID literal detection (`/^gaia-\d+$/`, `/^hip-\d+$/`, `/^hyg-\d+$/`) so raw catalogue IDs from `data/raw/` cannot be hardcoded in `src/`.
- [ ] Task 3.2: Update `scripts/audit-guards.test.ts` to verify seed-backed loading, fail-loud empty catalogue guard, enforcement across `src/content/` and `src/config/`, narrow `referenceTargets.ts` ID-only allowance, and structural catalogue-ID regexes.
- [ ] Task 3.3: Full Quality Gate, Archival & Delivery:
  - Run `npm run check`, `npm run test:coverage`, `npm run build`, `npm run build-storybook`, Playwright E2E, and `code-review` self-audit.
  - Update `CHANGELOG.md`, archive `conductor/tracks/data-contract-purity_20261121` → `conductor/archive/tracks/data-contract-purity_20261121` and update `conductor/tracks.md`.
  - Commit, push `chore/data-contract-purity`, open PR against `main`, monitor CI + Gemini Code Review until clean pass, and present live LAN smoke-test links.
