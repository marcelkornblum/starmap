# Implementation Plan: Startup, Code Splitting & Fonts

Review mode: **Whole-Track Review in PR** (archive standalone track into `conductor/archive/tracks/` before opening PR).

Ratified decisions:
- **Self-hosted JetBrains Mono (`P-06`):** vendor a single static variable latin WOFF2 file (`public/fonts/jetbrains-mono-latin.woff2`, weights `400`–`700`, SIL OFL 1.1) with `@font-face` (`font-display: swap`) in `src/styles/fonts.css` and `<link rel="preload" as="font" type="font/woff2" crossorigin>` in `index.html` (zero new npm dependency).
- **RootCanvasHost lazy latch (`P-02`/`M9`):** latch `hasActivatedSpatialCanvas` in `RootCanvasHost` on first `activeSlotCount > 0` (staying mounted permanently afterwards for WebGL context persistence) and lazy-load `CanvasLayer` + the 3 spatial scene contents (`GalacticSceneContent`, `SystemSceneContent`, `PlanetarySceneContent`) so `/guide/*` and `/search` cold loads download zero bytes of `three`/R3F/spatial scenes, while keeping the shared `three`/R3F vendor chunk cleanly isolated for future `FS-011` 3D guide cutaways.

---

## Phase 1: Non-Blocking Boot & Self-Hosted JetBrains Mono (`P-05`, `P-06`)
- [x] Task 1.1: Vendor `public/fonts/jetbrains-mono-latin.woff2`, replace the render-blocking 8-family Google Fonts `@import` in `src/styles/fonts.css` with `@font-face` (`font-display: swap`, `font-weight: 100 800`), and add `<link rel="preload">` in `index.html`. *(40 kB WOFF2 vendored; built CSS and HTML both resolve `/starmap/fonts/jetbrains-mono-latin.woff2` with zero Google Fonts strings in `dist/`.)*
- [x] Task 1.2: Remove the pre-render `loadIndex()` `Promise.race` await in `src/main.tsx` so React mounts immediately while `useLayerStore.getState().loadIndex()` resolves asynchronously and `useLayerIndex` subscribers react automatically (with colocated TDD test for non-blocking boot). *(Extracted `src/bootstrap.tsx` + `src/bootstrap.test.tsx`; 11/11 boot & layer tests pass.)*
- [x] Task 1.3: Phase 1 Checkpoint — `standards` cleanup; run `npm run check`, `npm run build` (verify zero `fonts.googleapis.com` in built CSS), and targeted unit tests; commit checkpoint. *(`npm run check` 0 warnings/0 errors; `npm run build` clean.)*

## Phase 2: Heavy Layer Barrel Removal & Route/Scene Code Splitting (`P-02`, `M9`, `L2` layer barrels)
- [~] Task 2.1: Replace all imports from `src/components/domain/index.ts` (12 views + 4 journey tests) with direct leaf component imports, delete `src/components/domain/index.ts` and unused `src/data/index.ts`, and align `src/stores/index.ts` (including `useCanvasStageStore` or pruning if unused).
- [~] Task 2.2: Split `SpatialScenes.tsx` into 3 independent scene entry modules (`GalacticSceneEntry.tsx`, `SystemSceneEntry.tsx`, `PlanetarySceneEntry.tsx`), lazy-load them inside `CanvasLayer.tsx`, lazy-mount `CanvasLayer` inside `RootCanvasHost.tsx` behind the first-slot latch (`hasActivatedSpatialCanvas`), lazy-load guide/search/system/planet routes in `src/router/index.ts` (and `GalaxyView` in `RootLayout.tsx`), and configure `build.rolldownOptions.output.codeSplitting` in `vite.config.ts` (`three`, `@react-three/fiber`, `@react-three/drei`, `@tanstack/react-router` vendor groups isolated from spatial scenes).
- [ ] Task 2.3: Phase 2 Checkpoint & Track Closeout — `standards` cleanup; run `npm run check`, `npm run test:coverage` (record unit-test wall-clock improvement!), `npm run build` (verify initial entry JS gzip size vs 500.5 kB baseline and zero `three`/R3F in non-spatial chunks), Playwright E2E tests, and 5-viewport `npm run capture:views`; run dual `code-review` + `architecture-review`; update `CHANGELOG.md`; archive standalone track before opening PR; start live LAN smoke-test servers (`5173` + `6006`).
