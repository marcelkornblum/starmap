# Plan: Guard Baseline Zero & Module Decomposition

## Phase 1: Alignment & Baseline Inventory

- [x] Task 1.1: Confirm review mode (Phase-by-Phase vs Whole-Track PR) and create feature branch `chore/guard-baseline-zero-and-module-decomposition`.
- [x] Task 1.2: Baseline Inventory & Audit Mapping (`codebase-researcher` flash subagent). Map all 98 entries in `scripts/guards/baseline.json` to their target decomposition modules, AST heuristic rules, or React compiler warning fixes.
- [x] Task 1.3: Architectural Alignment & Decision Ratification. Ratify module partitioning boundaries for `compactDataCodec.ts`, `astroMath.ts`, `nomenclature.ts`, and details services, `BoundedLruCache` sizing for `SLUG_CACHE`, and `G-literals` allowlist criteria in the track decision log.
- [x] Task 1.4: Phase Verification & Checkpoint.

---

## Phase 2: UI/Router/CI Hygiene & Audit Cleanups (T10 Medium/Low Items)

- [x] Task 2.1 (Area 1 — Routing & State Machine):
  - Replace `window.location.href` and `window.history.replaceState` fallbacks in `src/views/useSystemOutOfScopeGuard.ts` and `src/views/usePlanetOutOfScopeGuard.ts` with pure TanStack Router `navigate({ replace: true })`.
  - Remove residual deprecated `journeyOption` query parameter from `src/router/index.ts`, `src/hooks/useSpaLocation.ts`, and `src/views/useGalaxyViewModel.ts` (`DEC-R014h`).
  - Delete unused `src/router/navigation.ts` (`useStarmapNav`, `AUD-088`) and clean up references.
  - Extract pure easing functions out of `src/stores/useThreeTokenStore.ts` into a dedicated math utility.
- [x] Task 2.2 (Area 2 & 3 — Codecs & Services Hygiene):
  - Replace ad-hoc `SLUG_CACHE` raw `Map.clear()` in `src/utils/datasetLayerCodec.ts#L344-L362` with `BoundedLruCache`.
  - Replace pre-formatted `secondaryGeometryLabel` prose in `src/services/journeyService.ts#L582,634` with structured quantities (`{ value, unit }`).
  - Rename `chromaticityHex` in `src/services/guideService.ts#L137` to `chromaticityToken`.
  - Replace hardcoded `'earth'`/`'Earth'` fallback literals in `src/services/details/navigationAndCamera.ts#L215` and `src/services/details/bodiesAndSchematics.ts#L142,157`.
  - Annotate/rename `'sol'` shard tag in `src/data/detailsRepository.ts#L118`.
- [x] Task 2.3 (Area 5 — UI Design System):
  - Remove legacy `Measurement` and `MeasurementProps` alias exports in `src/components/interface/information/Quantity/Quantity.tsx#L62-L63`.
  - Refactor `src/components/domain/OrbitalSchematicPanel/OrbitalSchematicPanel.tsx` to compose `<SpectralBadge>`, `<Badge href={...}>` (unnesting the inner `<a>`), and `<Heading as="h2">`.
  - Purge dead CSS selectors in `StarTypeCombinator.module.css` and unused `className` props in `Guide3DPreview.tsx`.
  - Replace `(unit.type as any)` with typed discriminated narrowing in `DataTable.tsx` and `Quantity.tsx`.
- [x] Task 2.4 (Area 6 — Tests & CI Workflow):
  - Replace weak `.toBeDefined()` and `.toBeTruthy()` assertions on `screen.getBy*` with exact accessibility or DOM matching across unit tests.
  - Replace `.querySelector` and `.textContent` DOM assertions in `tests/journey5TransitFlow.test.tsx` with Testing Library queries (`screen.getByRole`, `screen.getByText`).
  - Deduplicate redundant pure unit test assertions inside `tests/journey1ReaderFlow.test.tsx` and `tests/journey3ExplorerFlow.test.tsx`.
  - Remove dead `Test Python scripts` step and append `&& !cancelled()` to `coverage:comment` in `.github/workflows/ci.yml`.
- [x] Task 2.5: Phase Verification & Checkpoint.

---

## Phase 3: Codec, Math & Service Decomposition

- [x] Task 3.1 (Compact Data Codec Split):
  - Split `src/utils/compactDataCodec.ts` (1,809 lines) into a lightweight runtime decoder (`src/utils/compactDataCodec.ts` ≤ 300 lines) and build-time pipeline encoder (`scripts/pipeline/compactDataEncoder.ts`).
  - Update `scripts/build-data.ts` to consume the pipeline encoder.
  - Colocate 1:1 tests for both decoder and encoder; verify data build reproducibility (`npm run build:data`).
- [x] Task 3.2 (Nomenclature & Astronomy Math):
  - Extract static Bayer/IAU nomenclature lookup tables from `src/utils/nomenclature.ts` (810 lines) into `src/utils/nomenclatureTables.ts` (or `data/seed/`), ensuring `nomenclature.ts` ≤ 300 lines.
  - Decompose `src/utils/astroMath.ts` (783 lines) into domain math modules (`coordinates.ts`, `kepler.ts`, `relativity.ts`, `planetaryPhysics.ts`).
  - Verify all astronomical calculation tests pass.
- [x] Task 3.3 (Domain Services & Types Decomposition):
  - Decompose `src/services/searchService.ts` into indexing, query filtering, and ranking sub-modules ≤ 300 lines.
  - Decompose `src/services/guideService.ts`, `src/services/journeyService.ts`, `src/services/sectorStreamingService.ts`, and `src/services/layerCardService.ts` into ≤ 300-line sub-modules with colocated tests.
  - Partition `src/types/astro.ts` into domain-specific type files (`bodies.ts`, `orbits.ts`, `spectral.ts`).
- [x] Task 3.4 (Details Services Decomposition):
  - Decompose `src/services/details/**` oversized modules: `types.ts`, `navigationAndCamera.ts`, `bodiesAndSchematics.ts`, `focusedEntityDetails.ts`, `minimapAndPreview.ts`, `hazardsAndComposition.ts`, and `galacticAperture.ts` into ≤ 300-line sub-modules with colocated tests.
- [x] Task 3.5: Phase Verification & Checkpoint.

---

## Phase 4: Canvas Decomposition & Zero-Baseline Cutover

- [ ] Task 4.1 (Guard Heuristic Refinement — `G-literals`):
  - Refine AST literal matching in `scripts/audit-guards.ts` to recognise benign math/transform constants (`0`, `1`, `-1`, `2 * Math.PI`, bitmask shifts `1 << n`) while strictly catching real celestial magic numbers.
  - Verify `G-literals` baseline drops cleanly without false positives.
- [ ] Task 4.2 (React Compiler & Hook Warnings Resolution):
  - Resolve `react(refs)` in `CelestialEntity.tsx`, `CameraRig.tsx`, `SectorPointCloud.tsx`, and `.storybook/helpers/StoryCanvas.tsx`.
  - Resolve `react(set-state-in-effect)` in `CelestialEntity.tsx`.
  - Resolve `react(immutability)` in `ScreenEdgeCue.tsx`, `PlanarGrid.tsx`, and `SectorPointCloud.tsx`.
  - Resolve `react-hooks(exhaustive-deps)` in `useLayerData.ts`, `useThemeTokenSync.ts`, and `useCameraTransition.ts`.
  - Verify zero warnings across overlay primitives (`SearchRoot.tsx`, `Tooltip.tsx`, `Modal.tsx`, `Popover.tsx`, `Toast.tsx`, `Drawer.tsx`, `DetentSheet.tsx`).
- [ ] Task 4.3 (3D Canvas Decomposition):
  - Decompose `src/components/canvas/entity/**`: `CelestialEntity.tsx`, `OrbitPath.tsx`, `SectorPointCloud.tsx`, and `SpatialEntityStore.ts`.
  - Decompose `src/components/canvas/instrument/**`: `CoordinateFins.tsx`, `PlanarGrid.tsx`, `CameraRig.tsx`, and `cameraRigControls.ts`.
  - Decompose `src/components/canvas/scenes/**`: `SpatialScenes.tsx`, `SystemScene.tsx`, and `PlanetScene.tsx`.
  - Decompose `src/components/canvas/viewport/**`: `SpatialViewport.tsx`.
  - Decompose `src/components/canvas/cartography/**` & materials: `cartographyMath.ts`, `celestialOcclusionRegistry.ts`, `reticleGeometry.ts`, and `CartoLineMaterial.ts`.
  - Ensure every component and helper is ≤ 300 lines with colocated R3F tests.
- [ ] Task 4.4 (Zero-Baseline Cutover):
  - Empty `scripts/guards/baseline.json` to 0 entries.
  - Run `npm run audit:guards` to verify 0 violations and 0 baseline entries.
  - Enforce strict downward-only CI check.
- [ ] Task 4.5: Phase Verification & Checkpoint.

---

## Phase 5: Review & Verification

- [ ] Task 5.1: Automated QA Suite Execution (`qa-verifier` flash subagent). Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:guards`, and `npm run test:e2e`. All checks must pass with zero warnings or errors.
- [ ] Task 5.2: Multi-Viewport Visual Smoke Verification (`screenshot-capturer` flash subagent). Capture 5 standard viewports (`390×844`, `768×1024`, `1024×768`, `1440×900`, `2560×1440`) to verify zero visual regressions in canvas, navigation, or panels.
- [ ] Task 5.3: Pre-PR Code Review via `code-review` skill.
- [ ] Task 5.4: PR Creation, CI & Gemini Automated Review Loop. Open PR against `main`, monitor GitHub Actions CI, and address any automated Gemini review comments.
- [ ] Task 5.5: Phase Verification & Checkpoint.
