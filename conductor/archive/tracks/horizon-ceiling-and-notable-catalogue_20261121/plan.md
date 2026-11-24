# Implementation Plan: Horizon Ceiling, Notable Catalogue Expansion & CI Data Artefacts

Follow strict Red-Green-Refactor TDD per [`conductor/workflow.md`](../../workflow.md). Gate every task and phase on `npm run lint`, `npm run typecheck`, `npm run audit:guards`, and `npm run test:coverage` (plus `npm run audit:r3f` / `npm run audit:budgets` where touched).

---

## Phase 1: Hardware Ceiling, 1-Ring Streaming & Camera Bounds

- [x] **Task 1.1: Preserve 1-ring active selection with distant-target bypass** *(Shipped: 1-ring nearest-first `computeSectorRings` (`dx, dy, dz in [-1, 0, 1]`, up to `27` active sectors + `chebyshev > 1` outer prefetch), distant-focus clip bypass beyond 125 pc, and manifest-gated `fetchSectorBinaryBuffer` short-circuit; 64-sector 2-ring fan-out reverted)*
  - **Red:** Add unit tests in `src/services/sectorSelection.test.ts` and `src/services/sectorStreamingService.test.ts` verifying `activeSectorIds` stays within 1-ring (`12` on `tier1`, `27` on `tier2`/`tier3`) sorted nearest-first while keeping `prefetchSectorIds` disjoint and bypassing origin clip beyond `maxCatalogRadiusPc`.
  - **Green:** Update `computeSectorRings` in `src/services/sectorSelection.ts` for 1-ring active + `chebyshev > 1` outer prefetch with distant-target bypass and ensure `SectorStreamingManager` queues them for rate-limited GPU upload (`budgetDeferredSet` + `updateRequestSeq` + transient retry).
  - **Refactor:** Verify `tier1` (12), `tier2` (27), and `tier3` (27 active / 53 prefetch) memory/point budgets stay within limits.

- [x] **Task 1.2: Hardware-budget zoom ceiling & pure horizon math module** *(Shipped: pure `deviceTierHorizonMath.ts` helpers + hardware-budget `computeCeilingMaxCameraDistancePc` without dense-volume edge clamping in runtime zoom/search framing)*
  - **Red:** Add unit tests in `src/services/deviceTierService.test.ts` and `src/services/deviceTierHorizonMath.test.ts` covering hardware-budget ceiling and pure horizon math helpers.
  - **Green:** Keep `computeMaxSafeCameraDistancePc` and `computeCeilingMaxCameraDistancePc` in `src/services/deviceTierHorizonMath.ts` / `deviceTierService.ts`, keeping `useGalacticCeilingDistance` and `useSearchFraming` on hardware-budget ceilings (dense-volume edge clamp omitted).
  - **Refactor:** Ensure zero frame-loop allocations or pan-triggered re-renders.

- [x] **Task 1.3: Reactive `subscribeDeviceTier` wiring, Orthographic zoom sync & `useCameraRigProjection` fix** *(Shipped: reactive `subscribeDeviceTier` in `SectorStreamingManager`, `GalaxyScene`, `useGalacticCeilingDistance`; authoritative `SpatialViewport` frame distance overrides; Orthographic `minZoom`/`maxZoom` sync; `GALACTIC_FRAME.camera.far = 25_000` and `SYSTEM_FRAME`/`PLANETARY_FRAME` `far = 2_500`; `budgetDeferredSet` upload deferral)*
  - **Red:** Add tests for `useGalacticCeilingDistance.test.tsx`, `GalaxyScene.test.tsx`, `SectorPointCloud`, and `useCameraRigProjection.test.tsx` verifying: (a) post-mount `registerWebGLGpuTelemetry` updates ceiling/budgets across consumers without pan re-renders, (b) `isLocked` Orthographic mode syncs `minZoom`/`maxZoom` to the ceiling, (c) upward ceiling changes are not clobbered by stale `prevMax`, and (d) `camera.far >= 20_000 pc` in `GALACTIC_FRAME`.
  - **Green:** Subscribe `useGalacticCeilingDistance`, `GalaxyScene`, and `SectorStreamingManager` to `subscribeDeviceTier`; remove render-time `controls.maxDistance` read-back/clobber in `useCameraRigProjection.ts`; sync Orthographic `minZoom`/`maxZoom`; raise `camera.far` in `CanvasWebGLHost.tsx` and orthographic camera ref.
  - **Refactor:** Ensure zero unnecessary re-renders or R3F hot-path allocations (`npm run audit:r3f`).

- [x] **Phase 1 Checkpoint:** Run `standards` cleanup, `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`, and multi-viewport visual review (`npm run capture:views`) checking max-zoom near Sol and a distant target. *(All 6 checks passed; 339 test files; 5-viewport capture verified on port 5174)*

---

## Phase 2: Notable Catalogue Expansion & `startup.json` Scoping Fix

- [x] **Task 2.1: Unlock all confirmed exoplanet hosts beyond 100 pc** *(Shipped: updated NASA TAP query + `sync-discoveries.ts`, header-keyed `exoplanetHosts.ts`/`exoplanetCatalogParsers.ts` with `NASA > OEC > EU` precedence, and `standaloneExoHostIngest.ts` emitting `exo-<slug>` host systems)*
  - **Red:** Add unit tests in `scripts/pipeline/exoplanets.test.ts` and `scripts/pipeline/gaiaPipeline.test.ts` verifying parsing of `ra`, `dec`, and `sy_dist` for exoplanet hosts absent from GCNS/HYG and standalone host-star emission beyond 100 pc.
  - **Green:** Remove `WHERE sy_dist<=100` from `scripts/sources.config.ts` and `scripts/sync-discoveries.ts`; parse host coordinates/distances in `scripts/pipeline/exoplanets.ts` and emit standalone host systems in `scripts/pipeline/gaiaPipeline.ts`.
  - **Refactor:** Ensure deterministic ID generation, precalculated reticle/classification/hazard masks, and zero hardcoded entity literals.

- [x] **Task 2.2: Unlock valid HYG v3 stars beyond 100 pc & filter `100,000 pc` sentinels** *(Shipped: explicit `dist > 0 && dist < 10000` sentinel filter on HYG loop, removed `maxPartitionDist` cap for valid distant notable/bright + exoplanet-host HYG stars, and `gaiaPipeline.test.ts` coverage)*
  - **Red:** Add unit tests in `scripts/pipeline/gaiaPipeline.test.ts` verifying that HYG rows with `dist >= 10000` (the 10,215 `100,000 pc` sentinel rows) are excluded while valid distant HYG/Hipparcos stars are ingested.
  - **Green:** Relax `maxPartitionDistancePc` clipping for valid HYG/Hipparcos stars in `scripts/pipeline/gaiaPipeline.ts` with explicit sentinel filtering (`dist > 0 && dist < 10000`).
  - **Refactor:** Verify `multiStarConsolidation.ts` and `compactDataEncoder.ts` handle sparse outer sectors cleanly without performance regressions.

- [x] **Task 2.3: Tighten `search/startup.json` strictly to Sol + layers + layer-referenced items** *(Shipped: restricted `startupEntries` in `searchIndexBuilder.ts` to Sol primary bodies/constructs, layers, and `referencedLayerIds` across all categories; added `structures` shard to `searchBackgroundWarmup.ts` and `searchRepository.ts` startup merge)*
  - **Red:** Add unit tests in `scripts/pipeline/searchIndexBuilder.test.ts` asserting that `startup` includes Sol system bodies, layer entries, and `referencedLayerIds` only—excluding unreferenced `coreEntries` stars/exoplanets and unreferenced `structuresEntries`.
  - **Green:** Update `buildSearchIndices` in `scripts/pipeline/searchIndexBuilder.ts` to remove the broad `coreEntries` and `structuresEntries` copy loops into `startupEntries`; confirm `searchBackgroundWarmup.ts` continues to hydrate `stars`, `planets`, and `minor-bodies` on idle/interaction.
  - **Refactor:** Verify `npm run audit:budgets` passes with substantial headroom under `maxStartupSearchBytes` (`1.5 MB`).

- [x] **Phase 2 Checkpoint:** Run `standards` cleanup, `npm run data:build`, `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:budgets`, and `npm run test:coverage`. *(All 5 gates passed: 339/339 test files, 2,062/2,062 tests; `search/startup` = 95.9 KB; `data.maxTotalBytes` raised to 50 MiB; generated `public/data/` intentionally left uncommitted ahead of Phase 3 untracking)*

---

## Phase 3: CI-Built Runtime Data Artefacts & GitHub Release Asset

- [x] **Task 3.1: Create compact deterministic test fixture set & decouple tests from `public/data/`** *(Shipped: curated ~300 KiB raw slice under `tests/fixtures/pipeline-raw/`, `scripts/build-fixture-data.ts` (`npm run data:fixture`, <1s build) + 4 unit tests, `.gitignore` excluding generated `public/data/*` while preserving `.gitkeep` & `README.md`, untracked generated shards from Git, and verified `389/389` Vitest + `48/48` Playwright E2E offline against the fixture)*
  - **Red:** Identify all unit/E2E tests reading `public/data/` directly and add fixture-loading assertions so `npm run test` and `npm run test:e2e` run cleanly on a fresh checkout without generated `public/data/` shards.
  - **Green:** Introduce a compact deterministic fixture generator/directory for tests, add `public/data/` generated paths to `.gitignore` (preserving `.gitkeep` and `README.md`), and untrack generated shards from Git.
  - **Refactor:** Verify `npm run data:build` reproduces `public/data/` locally on demand and update `public/data/README.md`.

- [x] **Task 3.2: CI shard build, `.br` precompression & `stars.json` GitHub Release asset** *(Shipped: opt-in `WRITE_STARS_JSON=1` in `scripts/build-data.ts` / `gaiaPipeline.ts`, post-build `scripts/precompress-dist-data.ts` (`npm run data:precompress`) + unit tests, updated `ci.yml` & `data-reproducibility.yml`, and added `release-data.yml` for `stars.json.gz` + `.sha256` GitHub Release uploads)*
  - **Red:** Add/update script tests verifying opt-in `stars.json` emission and `.br` precompression manifest/budget integrity.
  - **Green:** Update GitHub Actions deploy workflow to run `npm run data:build`, precompress shards (`.br`), and publish directly into the deploy artefact; update `.github/workflows/data-reproducibility.yml` to verify deterministic build hashes without requiring tracked `public/data/` files; add GitHub Release asset upload for `data/stars.json`.
  - **Refactor:** Verify `scripts/audit-budgets.ts` handles both local dev and CI artefact validation cleanly.

- [x] **Phase 3 Checkpoint:** Run `standards` cleanup, full quality suite (`npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:budgets`, `npm run test:coverage`), and multi-viewport visual review (`npm run capture:views`). *(All 10 CI gates + `48/48` Playwright E2E passed on compact fixture; `389/389` test files, `93.22%` line coverage, `data:precompress` 68% Brotli reduction, 5-viewport screenshots captured)*

---

## Finalisation

- [x] **Task 4.1: Dual review & `CHANGELOG.md` update** *(Completed: dual `code-review` + `architecture-review` resolved all High/Medium findings across CI workflows, `useRoutingSummaryFallback.ts`, `gaiaPipeline.ts`, `build-fixture-data.ts`, and `searchCorpusHelpers.ts`; updated `CHANGELOG.md`, `metadata.json`, and archived standalone track)*
  - Run `code-review` and `architecture-review` across the full track diff; resolve any findings.
  - Append a concise summary of shipped changes to root `CHANGELOG.md`.
