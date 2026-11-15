# Spec: Guard Baseline Zero & Module Decomposition

## Overview

Eliminate the remaining 98 baselined production guard entries in `scripts/guards/baseline.json` and resolve all Medium and Low hygiene items surfaced during the Track T10 Six-Area Closing Architecture Audit (`AUD-151`, `DEC-R059`, `DEC-R061`). Drive the guard baseline to literal zero (`0` entries) permanently, establishing strict zero-tolerance enforcement in CI across all guard categories without relying on blanket suppressions or inline disable comments.

**Behaviour change:** None (pure architectural decomposition, dead-code removal, and hygiene remediation).  
**Risk:** Low to Medium (canvas decomposition and data codec splitting require rigorous automated test verification).  
**Track type:** Chore (standalone follow-on track).

---

## Lineage & Context

- **Predecessor:** `architecture-remediation_10_closing-audit_20261106`
- **Decisions:** [DEC-R059](../../archive/initiatives/architecture-remediation/decision-log.md#dec-r059-guard-baseline-disposition-vs-track-t10-scope-boundary) & [DEC-R061](../../archive/initiatives/architecture-remediation/decision-log.md#dec-r061-disposition-of-fresh-six-area-closing-audit-findings-aud-151)
- **Audit Findings:** `AUD-151` (Medium/Low items across Areas 1, 2, 3, 5, and 6)
- **Baseline State:** 98 entries in `scripts/guards/baseline.json` (`G-size`, `eslint(max-lines)`, `G-literals`, `react(refs)`, `react(immutability)`, `react(set-state-in-effect)`, `react-hooks(exhaustive-deps)`).

---

## Scope

### 1. Production Module Decomposition (`G-size` & `eslint(max-lines)` → 0)

Decompose all oversized production modules exceeding the 300-line limit into focused, single-responsibility sub-modules with 1:1 colocated tests:

- **Data Pipeline & Codecs:**
  - Split `src/utils/compactDataCodec.ts` (1,809 lines) into a lightweight runtime decoder (`src/utils/compactDataCodec.ts` ≤ 300 lines) and build-time pipeline encoder (`scripts/pipeline/compactDataEncoder.ts`), keeping runtime bundle size minimal.
  - Decompose `src/utils/datasetLayerCodec.ts` into sub-modules for layer metadata, polygon geometries, and filter bitmasks.
- **Astronomy Math & Nomenclature:**
  - Extract static Bayer/IAU nomenclature lookup tables from `src/utils/nomenclature.ts` (810 lines) into `src/utils/nomenclatureTables.ts` (or `data/seed/`).
  - Decompose `src/utils/astroMath.ts` (783 lines) into domain math modules (`coordinates.ts`, `kepler.ts`, `relativity.ts`, `planetaryPhysics.ts`).
- **Domain Services & Types:**
  - Decompose `src/services/searchService.ts` into indexing, query filtering, and ranking helpers.
  - Decompose `src/services/guideService.ts`, `src/services/journeyService.ts`, `src/services/sectorStreamingService.ts`, and `src/services/layerCardService.ts` into sub-services ≤ 300 lines.
  - Decompose `src/services/details/**` oversized modules: `types.ts`, `navigationAndCamera.ts`, `bodiesAndSchematics.ts`, `focusedEntityDetails.ts`, `minimapAndPreview.ts`, `hazardsAndComposition.ts`, and `galacticAperture.ts`.
  - Partition `src/types/astro.ts` into domain-specific type modules (`bodies.ts`, `orbits.ts`, `spectral.ts`).
  - Partition `src/stores/useThreeTokenStore.ts` into theme synchronisation and pure easing tokens.
- **3D Canvas & Spatial Cartography:**
  - Decompose `src/components/canvas/entity/CelestialEntity.tsx`, `OrbitPath.tsx`, `SectorPointCloud.tsx`, and `SpatialEntityStore.ts`.
  - Decompose `src/components/canvas/instrument/CoordinateFins.tsx`, `PlanarGrid.tsx`, `CameraRig.tsx`, and `cameraRigControls.ts`.
  - Decompose `src/components/canvas/scenes/SpatialScenes.tsx`, `SystemScene.tsx`, and `PlanetScene.tsx`.
  - Decompose `src/components/canvas/viewport/SpatialViewport.tsx`.
  - Decompose `src/components/canvas/cartography/cartographyMath.ts`, `celestialOcclusionRegistry.ts`, `reticleGeometry.ts`, and `src/components/canvas/materials/CartoLineMaterial.ts`.

### 2. Guard Heuristic Refinement & React Compiler / Hook Warnings

- **AST Guard Heuristic Refinement (`G-literals`):**
  - Refine `G-literals` in `scripts/audit-guards.ts` to distinguish benign math/transform constants (`0`, `1`, `-1`, `2 * Math.PI`, bitmask shifts `1 << n`) from celestial magic numbers, avoiding false positives in canvas matrices, shaders, and unit conversions.
  - Eliminate hardcoded celestial fallback strings:
    - Replace `'earth'`/`'Earth'` fallback literals in `src/services/details/navigationAndCamera.ts#L215` and `src/services/details/bodiesAndSchematics.ts#L142,157` with structured constants or data-driven lookups.
    - Annotate or rename `'sol'` shard tag in `src/data/detailsRepository.ts#L118`.
- **React Compiler & Hook Warnings (`react(refs)`, `react(set-state-in-effect)`, `react-hooks(exhaustive-deps)`, `react(immutability)`):**
  - Resolve ref-access during render in `CelestialEntity.tsx`, `CameraRig.tsx`, `SectorPointCloud.tsx`, and `.storybook/helpers/StoryCanvas.tsx`.
  - Resolve state updates within effects in `CelestialEntity.tsx`.
  - Fix exhaustive dependency arrays in `useLayerData.ts`, `useThemeTokenSync.ts`, and `useCameraTransition.ts`.
  - Fix mutable parameter updates in `ScreenEdgeCue.tsx` and `PlanarGrid.tsx`.
  - Verify zero warnings across overlay primitives (`SearchRoot.tsx`, `Tooltip.tsx`, `Modal.tsx`, `Popover.tsx`, `Toast.tsx`, `Drawer.tsx`, `DetentSheet.tsx`).

### 3. Medium & Low Findings from T10 Six-Area Closing Audit (`AUD-151`, `DEC-R061`)

- **Area 1 — Routing & State Machine:**
  - Replace `window.location.href` and `window.history.replaceState` fallbacks in `src/views/useSystemOutOfScopeGuard.ts` and `src/views/usePlanetOutOfScopeGuard.ts` with pure TanStack Router `navigate({ replace: true })`.
  - Remove residual deprecated `journeyOption` query parameter in `src/router/index.ts`, `src/hooks/useSpaLocation.ts`, and `src/views/useGalaxyViewModel.ts` (`DEC-R014h`).
  - Delete unused `src/router/navigation.ts` (`useStarmapNav`, `AUD-088`).
  - Extract pure easing functions out of `src/stores/useThreeTokenStore.ts`.
- **Area 2 — Codecs & Caches:**
  - Replace ad-hoc `SLUG_CACHE` raw `Map.clear()` in `src/utils/datasetLayerCodec.ts#L344-L362` with `BoundedLruCache`.
- **Area 3 — Services & Taxonomy:**
  - Replace pre-formatted `secondaryGeometryLabel` prose in `src/services/journeyService.ts#L582,634` with structured quantities (`{ value, unit }`).
  - Rename `chromaticityHex` in `src/services/guideService.ts#L137` to `chromaticityToken`.
- **Area 5 — UI Design System:**
  - Remove legacy `Measurement` and `MeasurementProps` alias exports in `src/components/interface/information/Quantity/Quantity.tsx#L62-L63`.
  - Refactor `src/components/domain/OrbitalSchematicPanel/OrbitalSchematicPanel.tsx` to compose `<SpectralBadge>`, `<Badge href={...}>` (unnesting the inner `<a>`), and `<Heading as="h2">`.
  - Purge dead CSS selectors in `StarTypeCombinator.module.css` and unused `className` props in `Guide3DPreview.tsx`.
  - Replace `(unit.type as any)` with typed discriminated narrowing in `DataTable.tsx` and `Quantity.tsx`.
- **Area 6 — Tests & CI Workflow:**
  - Replace weak `.toBeDefined()` and `.toBeTruthy()` assertions on `screen.getBy*` with exact accessibility or DOM matching across unit tests.
  - Replace `.querySelector` and `.textContent` DOM assertions in `tests/journey5TransitFlow.test.tsx` with Testing Library queries (`screen.getByRole`, `screen.getByText`).
  - Deduplicate redundant pure unit test assertions inside `tests/journey1ReaderFlow.test.tsx` and `tests/journey3ExplorerFlow.test.tsx`.
  - Remove dead `Test Python scripts` step and append `&& !cancelled()` to `coverage:comment` in `.github/workflows/ci.yml`.

---

## Out of Scope

- Functional UI redesign or new journey features.
- Wire format or public data shard schema alterations (retains identical runtime decoding behaviour).
- Re-opening closed architecture remediation initiative tracks.

---

## Acceptance Criteria

- [ ] `scripts/guards/baseline.json` reduced to exactly 0 entries, with CI running in strict downward-only mode.
- [ ] Every production file in `src/` is ≤ 300 lines (zero `G-size` and zero `eslint(max-lines)` violations).
- [ ] `scripts/audit-guards.ts` `G-literals` heuristic refined to distinguish benign math/transform constants from celestial magic numbers with zero false positives.
- [ ] All React compiler and React hook warnings resolved without inline suppression comments (`react(refs)`, `react(immutability)`, `react(set-state-in-effect)`, `react-hooks(exhaustive-deps)`).
- [ ] All T10 Closing Audit Medium and Low findings across Areas 1, 2, 3, 5, and 6 cleanly resolved.
- [ ] Full automated test suite passing with 100% coverage thresholds maintained (`npm run test:coverage`).
- [ ] Quality gates green: `npm run lint`, `npm run typecheck`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:guards`, `npm run test:e2e`.
