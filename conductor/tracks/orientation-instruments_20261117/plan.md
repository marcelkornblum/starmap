# Implementation Plan: Orientation Instruments

**Spec:** [spec.md](./spec.md) | **Decisions:** [decision-log.md](./decision-log.md)

## Phase 1: Build-Time Orientation Data & Projection Maths
- [ ] Task 1.1: Precalculate Solar System planetary `axialTiltDeg` in `data/seed/solar-system-bodies.json` and emit through `scripts/pipeline/` (`solarBodies.ts`, `compactEntityEncoder.ts`, `compactEntityDecoder.ts`, `SolarSystemBodyRecord`, `FocusedPlanetTelemetry`) with unit tests and regenerated fixture shards (`npm run data:fixture`).
- [ ] Task 1.2: Precalculate known system Galactic-plane inclination (`planeInclinationDeg`) in the build-time pipeline (Sol `60.19°`, undefined/neutral `0°` when unmeasured) and propagate through `SystemSummaryNode` / `FocusedEntityDetails` / `buildFocusedPreviewSummary` with zero hardcoded entity IDs in `src/`.
- [ ] Task 1.3: Implement and unit-test pure 3D→2D projection module (`src/utils/orientationProjectionMath.ts` & `.test.ts`), covering orthonormal camera basis, pole singularities, ring projection, and orbital point projection.
- [ ] Task 1.4: Update `useCameraRigStoreSync.ts` (sync `camera.up` and publish pose during active camera transitions) and add `useLiveCameraPose.ts` (+ `.test.tsx`) with `requestAnimationFrame` coalescing.
- [ ] Task 1.5: Phase 1 Quality Check (`npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, targeted Vitest suite) & Checkpoint.

## Phase 2: `<Minimap />` Orientation Instrument (`Map Moves`)
- [ ] Task 2.1: Implement `src/components/domain/Minimap/minimapHudHelpers.ts` (and colocated unit tests) for the zoomed-in Galactic Frame polar sector (`CORE`, `ORB`, converging radials), perpendicular north (`+Z` / `N`) stalk, cumulative cross-scale Galactic tilt, zoom-coupled local footprint ring, and logarithmic zoom bar.
- [ ] Task 2.2: Upgrade `Minimap.tsx` and `Minimap.module.css` to the minimal borderless `Map Moves` SVG instrument while preserving `.srOnlyMarkers` for E2E URL contract compatibility, and adjust `SpatialShell.module.css` `.minimapRegion` clearance above `<ControlBar />`.
- [ ] Task 2.3: Update `Minimap.test.tsx` and `Minimap.stories.tsx` (covering `galaxy`, `system`, `planet` scopes, camera attitude updates, north stalk, zoom bar, and pole stability).
- [ ] Task 2.4: Phase 2 Quality Check (`npm run lint`, `npm run typecheck`, `npm run audit:ui`, `npm run audit:guards`, Vitest coverage) & Checkpoint.

## Phase 3: `<PreviewPanel />` Outer-View Tilt Preview & Integration
- [ ] Task 3.1: Extend `PreviewOrbitElement` (`symbolType?: CelestialSymbolType`) and `FocusedPreviewSummary` (`detailsHref?: string`, honest `primaryInclinationDeg` / planetary `axialTiltDeg`) in `detailsNavigationTypes.ts` and `detailsPreview.ts` (+ unit tests).
- [ ] Task 3.2: Move `<PreviewPanel />` into `<DetailsPanel />`'s `Partial` detent directly below `<DetailsActionControls />` (`DetailsPanel.tsx`, `DetailsDeferredSections.tsx`, `DetailsPanel.test.tsx`).
- [ ] Task 3.3: Upgrade `PreviewPanel.tsx`, `previewPanelHelpers.ts`, and `PreviewPanel.module.css` to the minimal borderless fixed outer-view SVG with two light concentric circles, `CelestialSymbol` reticles (`renderGlyphContent`), and clickable SPA navigation (`useSpaLinkClick`) matching `Details`.
- [ ] Task 3.4: Update `PreviewPanel.test.tsx` and `PreviewPanel.stories.tsx` (covering Sol `60.2°`, neutral unmeasured exoplanet system `0°`, Earth `23.4°`, Uranus `97.8°`, reticle rendering, and clickable `Details` navigation).
- [ ] Task 3.5: Full Verification & Visual Review — run `npm run lint`, `npm run typecheck`, `npm run audit:ui`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`, relevant Playwright E2E specs (`e2e/url-contracts.spec.ts`), and 5-viewport `capture:views` review across `/galaxy?focus=sol`, `/galaxy?focus=tau-ceti`, `/system/sol?focus=earth`, and `/system/sol?focus=uranus`.
