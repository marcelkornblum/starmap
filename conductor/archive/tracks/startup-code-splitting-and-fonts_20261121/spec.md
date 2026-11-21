# Specification: Startup, Code Splitting & Fonts

## Overview
Cuts initial load latency and Time to First Paint by splitting the single 1.78 MB JS chunk along route and 3D-scene boundaries, removing the up-to-1.5 s network wait before first React render, replacing the render-blocking 8-family Google Fonts `@import` with a self-hosted JetBrains Mono subset, and breaking heavy layer barrels.

Covers Performance Review findings `P-02`, `P-05`, `P-06`, and Architecture Review findings `M9` and `L2` (layer barrels).

## Current State (baseline at 2026-11-21)
- `vite build` produces a single JS chunk (`index-*.js`: 1,779 kB / 500.5 kB gzip) and 188 kB CSS; all 13 route components are statically imported in `src/router/index.ts:7-18`, and `CanvasLayer.tsx:11-15` statically imports `GalacticSceneContent`, `SystemSceneContent`, and `PlanetarySceneContent` (`P-02`, `M9`).
- `src/components/domain/index.ts` re-exports every domain component (including `CanvasLayer` and `Guide3DPreview`), pulling 3D and guide graphs into unrelated views and unit tests (`M9`, `L2`); `src/data/index.ts` re-exports a single file.
- `src/main.tsx:22-33` awaits `loadIndex()` (capped at 1.5 s) before the first React render, even though `useLayerIndex` is already reactive via `useSyncExternalStore` (`P-05`).
- `src/styles/fonts.css:5` emits a render-blocking `@import url(https://fonts.googleapis.com/...)` for 8 font families (~29 weights), while design tokens (`literal.css:354-356`) reference only `"JetBrains Mono"` and system stacks (`P-06`).

## Scope
1. **Non-Blocking Boot & Self-Hosted Fonts (`P-05`, `P-06`)**:
   - Render the React root immediately in `src/main.tsx` without awaiting `loadIndex()`; kick off layer-index loading asynchronously and let `useLayerIndex` subscribers react when ready.
   - Delete the render-blocking Google Fonts `@import` in `src/styles/fonts.css` and all 7 unused font families; self-host only the required WOFF2 weights of JetBrains Mono with `<link rel="preload">` and `font-display: swap`.
2. **Route & 3D Scene Code Splitting (`P-02`, `M9`)**:
   - Convert guide views and search view in `src/router/index.ts` to lazy-loaded chunks (`React.lazy` / TanStack lazy routes) with clean Suspense fallbacks.
   - Lazy-load `GalacticSceneContent`, `SystemSceneContent`, and `PlanetarySceneContent` so the shell paints first and non-spatial routes never download the full spatial cartographic engine.
   - Configure vendor chunking in `vite.config.ts` (`three`, `@react-three/fiber`, `@react-three/drei`, `@tanstack/react-router`) for long-term browser caching.
   - **3D Guide (`FS-011`) constraint:** keep the shared `three`/R3F vendor chunk cleanly decoupled from the spatial scene chunks so future 3D guide cutaways (`FS-011`) on `/guide/*` can lazy-load lightweight 3D previews without downloading `GalacticSceneContent` / `SystemSceneContent` / `PlanetarySceneContent`.
3. **Heavy Layer Barrel Cleanup (`M9`, `L2` partial)**:
   - Replace imports from `src/components/domain/index.ts` in views and tests with leaf component imports, and remove `src/components/domain/index.ts` and `src/data/index.ts` (aligning barrel policy across layers).

## Out of Scope
- Deleting ~60 one-line per-component `ComponentName/index.ts` barrels (`L2` component-barrel subset, accepted/deferred as low-ROI churn once heavy layer barrels are removed).
- Re-sharding runtime data or lazy-loading the search corpus: [`spatial-data-delivery-and-search_20261121`](../spatial-data-delivery-and-search_20261121/spec.md).

## Acceptance Criteria
- [ ] `src/main.tsx` renders immediately with zero pre-render network await; layer-driven UI hydrates reactively when `loadIndex()` resolves.
- [ ] Built CSS contains zero external `fonts.googleapis.com` `@import` statements; JetBrains Mono WOFF2 is self-hosted and preloaded with identical typography across all 5 standard viewports.
- [ ] `vite build` splits guide routes, search route, spatial 3D scene contents, and `three`/R3F/router vendor chunks; initial entry JS gzip size is substantially below the 500.5 kB baseline (measured and documented).
- [ ] Spatial scene chunks (`Galactic`, `System`, `Planetary`) are isolated from the shared `three`/R3F vendor chunk so `/guide/*` can independently lazy-load future `FS-011` 3D cutaways.
- [ ] `src/components/domain/index.ts` and `src/data/index.ts` are removed; views and tests import leaf modules directly.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run test:coverage`, and `npm run capture:views` (5 viewports) pass cleanly.
