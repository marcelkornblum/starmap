# Specification: Horizon Ceiling, Notable Catalogue Expansion & CI Data Artefacts

## Overview

Eliminate visible unpopulated-space edges in the 3D Galactic view, unlock all distant notable star systems and confirmed exoplanets beyond the 100 pc GCNS horizon, tighten `startup.json` to Sol + layers only, and move generated runtime data artefacts (`public/data/` and `data/stars.json`) out of Git into CI-built deploy and GitHub Release artefacts.

This track graduates the backlog items **CI-Built Runtime Data Artefacts (Untrack `public/data/` from Git)** and **Publish Full Star Dataset (`stars.json`) as a GitHub Release Asset**, and establishes the runtime and delivery foundation for future dense-catalogue expansion.

---

## Scope

### 1. Keep the Camera Inside Populated Space (Preserving `0.45` Shader Falloff)
- **Preserve the `0.45` `radialFalloff` floor** in `src/components/canvas/entity/sectorPointCloudShaders.ts`—do not fade the starfield to zero.
- **2-Ring Active Sector Streaming:** Expand `computeSectorRings` in `src/services/sectorSelection.ts` beyond the hardcoded `3×3×3` 1-ring cube (`dx, dy, dz ∈ [-1, 0, 1]`, max 27 sectors) so `activeSectorIds` selects nearest-first sectors across a 2-ring radius up to `budget.maxActiveSectors` (unlocking `tier3`'s `64` active sectors and ensuring loaded sectors cover `uHorizonRadius`).
- **Horizon-Aware Dense-Catalogue Edge Clamp:** Bound `uHorizonRadius` (accounting for viewport aspect/FOV reach) against `denseCatalogRadiusPc - targetDistFromSol - edgeMarginPc` **only while inside the dense volume** (`targetDistFromSol < denseCatalogRadiusPc - edgeMarginPc`). Disable the edge clamp (falling back strictly to the hardware tier ceiling) when focused on a distant notable system outside the dense sphere so jumped-to distant hosts remain freely zoomable.
- **Single Authoritative Zoom Ceiling:**
  - Subscribe `useGalacticCeilingDistance`, `GalaxyScene`, and `SectorStreamingManager` (`SectorPointCloud`) to `subscribeDeviceTier` so post-mount WebGL GPU telemetry updates all three consistently.
  - Sync `minZoom` / `maxZoom` on `OrbitControls` in Orthographic (`isLocked`) mode so top-down zoom respects the same ceiling as Perspective `maxDistance`.
  - Remove the render-time `controls?.maxDistance` read-back and `useEffect` cleanup clobber in `useCameraRigProjection.ts` so upward ceiling increases are never reverted.
  - Raise `camera.far` in `GALACTIC_FRAME` (`CanvasWebGLHost.tsx` and orthographic rig) to `>= 20_000 pc` so distant Stage 1A stars are not frustum-clipped.
  - Coordinate soft pan bounds cleanly with `GalacticCameraController` and `useCameraTransition`.

### 2. Unlock All Distant Notable Catalogues & Fix `startup.json` Drift
- **All Confirmed Exoplanet Hosts:** Remove `WHERE sy_dist<=100` from `scripts/sources.config.ts` and `scripts/sync-discoveries.ts`. Parse `ra`, `dec`, and `sy_dist` in `scripts/pipeline/exoplanets.ts` and emit standalone host-star records in `scripts/pipeline/gaiaPipeline.ts` for confirmed exoplanet hosts not matched in GCNS or HYG.
- **All Valid HYG v3 / Hipparcos Stars:** Relax the 100 pc clip in `scripts/pipeline/gaiaPipeline.ts` for notable/HYG stars while explicitly filtering out HYG v3's **10,215 sentinel rows** (`dist >= 10000` / missing or negative parallax) so no artificial `100,000 pc` shell is generated.
- **Fix `startup.json` Scoping Drift:** Tighten `scripts/pipeline/searchIndexBuilder.ts` so `search/startup.json` includes strictly **Sol system + layer entries + layer-referenced items** (stopping the unintended inclusion of all `coreEntries` and `structuresEntries`). Rely on existing `searchBackgroundWarmup.ts` (`requestIdleCallback` + Search-interaction escalation) for `stars`, `planets`, and `minor-bodies`.

### 3. CI-Built Runtime Data Artefacts & GitHub Release Asset
- **Untrack `public/data/` from Git:** Stop committing generated runtime shards under `public/data/`. Retain a compact, deterministic fixture dataset in Git for unit and E2E tests.
- **CI Build & Precompression:** Build runtime shards in CI, precompress (`.br`), and publish directly into the deploy artefact. Update `.github/workflows/data-reproducibility.yml` to verify deterministic build hashes rather than `git status` against tracked shards.
- **Publish `stars.json` as a GitHub Release Asset:** Emit `data/stars.json` opt-in / in release workflows and upload it as a downloadable GitHub Release asset for external research and offline verification.

---

## Out of Scope

- Expanding dense Gaia DR3 volume to 200 pc (~2M–2.6M stars) or adding `meta/*.bin` lazy binary sidecars (captured in `conductor/backlog.md` for a future track).
- Moving `partitions/` to external object storage (R2/S3) or removing `partitions/*` from `manifest.json`.
- Full-sky Gaia DR3/DR4 (~1.5B–2B stars), 3D octree LOD, `BigUint64` IDs, out-of-core DuckDB/Rust builder, or scene-wide floating origin.
- Changing the `0.45` `radialFalloff` shader floor in `sectorPointCloudShaders.ts`.

---

## Functional & Non-Functional Requirements

- **FR-1:** At any zoom level inside the dense 100 pc volume (both Perspective and Orthographic modes, across `tier1`/`tier2`/`tier3` and `390×844` through `2560×1440` viewports), loaded sectors cover `uHorizonRadius` and the camera cannot zoom out past the populated dense catalogue boundary.
- **FR-2:** Focusing or jumping to a distant notable system outside the 100 pc dense sphere (e.g., Kepler, TRAPPIST, or distant HYG/Hipparcos stars) renders the star without `camera.far` clipping and preserves full hardware-tier zoom range.
- **FR-3:** Post-mount WebGL GPU telemetry updates propagate to `useGalacticCeilingDistance`, `GalaxyScene`, and `SectorStreamingManager` without clobbering upward ceiling changes.
- **FR-4:** All confirmed exoplanet hosts with valid coordinates/distances (including hosts absent from GCNS/HYG) and all valid HYG v3 stars (excluding `dist >= 10000` sentinels) are ingested into the pipeline and searchable.
- **FR-5:** `search/startup.json` contains only Sol system, layer entries, and layer-referenced items, staying well under `maxStartupSearchBytes` (`1.5 MB`).
- **FR-6:** Generated `public/data/` shards are untracked from Git; CI builds, precompresses (`.br`), and packages them into the deploy artefact; `data/stars.json` is published as a GitHub Release asset; unit and E2E tests pass offline using the committed deterministic fixture set.
- **NFR-1:** Zero regressions in `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:budgets`, and `npm run test:coverage`.
- **NFR-2:** Zero new runtime hardcoding of celestial entities; all new attributes precalculated in the build pipeline.

---

## Acceptance Criteria

1. `computeSectorRings` uploads nearest-first active sectors across a 2-ring radius up to `budget.maxActiveSectors`, verified by unit tests across all three device tiers.
2. Perspective and Orthographic (`isLocked`) zoom ceilings both respect hardware limits and the dense-volume edge clamp inside 100 pc, and disable the edge clamp when focused on distant systems outside 100 pc.
3. No `100,000 pc` sentinel stars exist in built partitions; distant confirmed exoplanet hosts beyond 100 pc are present and inspectable in the app.
4. `search/startup.json` contains strictly Sol + layers + layer-referenced items and passes `audit:budgets`.
5. `git ls-files public/data` contains only `.gitkeep` / `README.md` (and test fixtures live in a dedicated compact fixture directory), CI builds and verifies deterministic data hashes, and release workflow uploads `stars.json`.
6. Multi-viewport Playwright visual review confirms zero unpopulated-space edges at maximum zoom near Sol and clean framing on a distant exoplanet host.
