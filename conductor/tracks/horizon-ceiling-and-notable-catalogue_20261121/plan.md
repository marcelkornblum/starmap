# Implementation Plan: Horizon Ceiling, Notable Catalogue Expansion & CI Data Artefacts

Follow strict Red-Green-Refactor TDD per [`conductor/workflow.md`](../../workflow.md). Gate every task and phase on `npm run lint`, `npm run typecheck`, `npm run audit:guards`, and `npm run test:coverage` (plus `npm run audit:r3f` / `npm run audit:budgets` where touched).

---

## Phase 1: Horizon Ceiling, 2-Ring Streaming & Camera Bounds

- [x] **Task 1.1: Expand `computeSectorRings` to 2-ring active selection** *(Shipped: unified 2-ring nearest-first `computeSectorRings` unlocking 64 active sectors on `tier3`, distant-focus clip bypass beyond 125 pc, and manifest-gated `fetchSectorBinaryBuffer` short-circuit)*
  - **Red:** Add unit tests in `src/services/sectorSelection.test.ts` and `src/services/sectorStreamingService.test.ts` verifying `activeSectorIds` expands beyond `3×3×3` (27 sectors) up to `budget.maxActiveSectors` (64 on `tier3`) sorted nearest-first, while keeping `prefetchSectorIds` disjoint.
  - **Green:** Update `computeSectorRings` in `src/services/sectorSelection.ts` to populate `activeSectorIds` across a 2-ring radius up to `budget.maxActiveSectors` and ensure `SectorStreamingManager` queues them for rate-limited GPU upload.
  - **Refactor:** Verify `tier1` (12), `tier2` (27), and `tier3` (64) memory/point budgets stay within limits.

- [x] **Task 1.2: Horizon-aware dense-catalogue edge clamp & distant-target bypass** *(Shipped: pure `deviceTierHorizonMath.ts` helpers + `computeCeilingMaxCameraDistancePc` dense-volume & active-sector horizon clamp with distant-target bypass)*
  - **Red:** Add unit tests in `src/services/deviceTierService.test.ts` covering: (a) horizon-aware clamping against `denseCatalogRadiusPc - targetDistFromSol - edgeMarginPc` inside the dense volume (including wide-aspect FOV margin), and (b) bypassing the edge clamp (reverting to hardware ceiling) when `targetDistFromSol >= denseCatalogRadiusPc - edgeMarginPc`.
  - **Green:** Extend `computeCeilingMaxCameraDistancePc` in `src/services/deviceTierService.ts` with `denseCatalogRadiusPc`, `targetDistFromSolPc`, and `edgeMarginPc` inputs; preserve the `0.45` `radialFalloff` shader floor untouched.
  - **Refactor:** Extract pure horizon-to-camera-distance math helpers with zero frame-loop allocations.

- [ ] **Task 1.3: Reactive `subscribeDeviceTier` wiring, Orthographic zoom sync & `useCameraRigProjection` fix**
  - **Red:** Add tests for `useGalacticCeilingDistance.test.tsx`, `GalaxyScene.test.tsx`, `SectorPointCloud`, and `useCameraRigProjection.test.tsx` verifying: (a) post-mount `registerWebGLGpuTelemetry` updates ceiling/budgets across all three consumers, (b) `isLocked` Orthographic mode syncs `minZoom`/`maxZoom` to the ceiling, (c) upward ceiling changes are not clobbered by stale `prevMax`, and (d) `camera.far >= 20_000 pc` in `GALACTIC_FRAME`.
  - **Green:** Subscribe `useGalacticCeilingDistance`, `GalaxyScene`, and `SectorStreamingManager` to `subscribeDeviceTier`; remove render-time `controls.maxDistance` read-back/clobber in `useCameraRigProjection.ts`; sync Orthographic `minZoom`/`maxZoom`; raise `camera.far` in `CanvasWebGLHost.tsx` and orthographic camera ref; coordinate soft pan bounds with `GalacticCameraController` and `useCameraTransition`.
  - **Refactor:** Ensure zero unnecessary re-renders or R3F hot-path allocations (`npm run audit:r3f`).

- [ ] **Phase 1 Checkpoint:** Run `standards` cleanup, `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`, and multi-viewport visual review (`npm run capture:views`) checking max-zoom near Sol and a distant target.

---

## Phase 2: Notable Catalogue Expansion & `startup.json` Scoping Fix

- [ ] **Task 2.1: Unlock all confirmed exoplanet hosts beyond 100 pc**
  - **Red:** Add unit tests in `scripts/pipeline/exoplanets.test.ts` and `scripts/pipeline/gaiaPipeline.test.ts` verifying parsing of `ra`, `dec`, and `sy_dist` for exoplanet hosts absent from GCNS/HYG and standalone host-star emission beyond 100 pc.
  - **Green:** Remove `WHERE sy_dist<=100` from `scripts/sources.config.ts` and `scripts/sync-discoveries.ts`; parse host coordinates/distances in `scripts/pipeline/exoplanets.ts` and emit standalone host systems in `scripts/pipeline/gaiaPipeline.ts`.
  - **Refactor:** Ensure deterministic ID generation, precalculated reticle/classification/hazard masks, and zero hardcoded entity literals.

- [ ] **Task 2.2: Unlock valid HYG v3 stars beyond 100 pc & filter `100,000 pc` sentinels**
  - **Red:** Add unit tests in `scripts/pipeline/gaiaPipeline.test.ts` verifying that HYG rows with `dist >= 10000` (the 10,215 `100,000 pc` sentinel rows) are excluded while valid distant HYG/Hipparcos stars are ingested.
  - **Green:** Relax `maxPartitionDistancePc` clipping for valid HYG/Hipparcos stars in `scripts/pipeline/gaiaPipeline.ts` with explicit sentinel filtering (`dist > 0 && dist < 10000`).
  - **Refactor:** Verify `multiStarConsolidation.ts` and `compactDataEncoder.ts` handle sparse outer sectors cleanly without performance regressions.

- [ ] **Task 2.3: Tighten `search/startup.json` strictly to Sol + layers + layer-referenced items**
  - **Red:** Add unit tests in `scripts/pipeline/searchIndexBuilder.test.ts` asserting that `startup` includes Sol system bodies, layer entries, and `referencedLayerIds` only—excluding unreferenced `coreEntries` stars/exoplanets and unreferenced `structuresEntries`.
  - **Green:** Update `buildSearchIndices` in `scripts/pipeline/searchIndexBuilder.ts` to remove the broad `coreEntries` and `structuresEntries` copy loops into `startupEntries`; confirm `searchBackgroundWarmup.ts` continues to hydrate `stars`, `planets`, and `minor-bodies` on idle/interaction.
  - **Refactor:** Verify `npm run audit:budgets` passes with substantial headroom under `maxStartupSearchBytes` (`1.5 MB`).

- [ ] **Phase 2 Checkpoint:** Run `standards` cleanup, `npm run data:build`, `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:budgets`, and `npm run test:coverage`.

---

## Phase 3: CI-Built Runtime Data Artefacts & GitHub Release Asset

- [ ] **Task 3.1: Create compact deterministic test fixture set & decouple tests from `public/data/`**
  - **Red:** Identify all unit/E2E tests reading `public/data/` directly and add fixture-loading assertions so `npm run test` and `npm run test:e2e` run cleanly on a fresh checkout without generated `public/data/` shards.
  - **Green:** Introduce a compact deterministic fixture generator/directory for tests, add `public/data/` generated paths to `.gitignore` (preserving `.gitkeep` and `README.md`), and untrack generated shards from Git.
  - **Refactor:** Verify `npm run data:build` reproduces `public/data/` locally on demand and update `public/data/README.md`.

- [ ] **Task 3.2: CI shard build, `.br` precompression & `stars.json` GitHub Release asset**
  - **Red:** Add/update script tests verifying opt-in `stars.json` emission and `.br` precompression manifest/budget integrity.
  - **Green:** Update GitHub Actions deploy workflow to run `npm run data:build`, precompress shards (`.br`), and publish directly into the deploy artefact; update `.github/workflows/data-reproducibility.yml` to verify deterministic build hashes without requiring tracked `public/data/` files; add GitHub Release asset upload for `data/stars.json`.
  - **Refactor:** Verify `scripts/audit-budgets.ts` handles both local dev and CI artefact validation cleanly.

- [ ] **Phase 3 Checkpoint:** Run `standards` cleanup, full quality suite (`npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:budgets`, `npm run test:coverage`), and multi-viewport visual review (`npm run capture:views`).

---

## Finalisation

- [ ] **Task 4.1: Dual review & `CHANGELOG.md` update**
  - Run `code-review` and `architecture-review` across the full track diff; resolve any findings.
  - Append a concise summary of shipped changes to root `CHANGELOG.md`.
