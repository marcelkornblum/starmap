# Implementation Plan: Render-Loop Control & R3F Hot Paths

Review mode: **Whole-Track Review in PR** (archive standalone track into `conductor/archive/tracks/` before opening PR).

Ratified decisions:
- **Slot-gated & demand frameloop (`P-01`):** gate `<Canvas frameloop>` strictly on `activeSlotCount > 0` (`'demand'` when active, `'never'` when inactive — never a route-path ban, preserving `FS-011` 3D guide compatibility); unmount inactive spatial scene content when no slot is active; keep `useBoundedDeferredValue` intact until `demand` mode is proven.
- **`NOOP_RAYCAST` scope (`P-10`):** apply `NOOP_RAYCAST` to `OrbitPath` (`Line2`, periapsis tick, direction arrow), `KinematicVector` (`Line2`, terminus mesh), and `PlanetBody` (`planet-surface`, `planet-atmosphere`), and enforce `NOOP_RAYCAST` on `Line2` / decorative meshes in `scripts/audit-r3f.ts`.

---

## Phase 1: Slot-Gated & On-Demand Render Loop (`P-01`)
- [x] Task 1.1: Gate `<Canvas frameloop={hasActiveSlot ? 'demand' : 'never'}>` in `CanvasLayer.tsx` / `RootCanvasHost.tsx` (and `frameloop="demand"` in `StandaloneSceneShell.tsx`) and unmount inactive spatial scene content when `!hasActiveSlot || !stageProps`, keeping the `<Canvas>` shell persistent across route changes with colocated TDD tests. *(Gated strictly on `hasActiveSlot` via atomic store selectors; unmounts spatial scene content when inactive; `FS-011` compatible.)*
- [x] Task 1.2: Wire `invalidate()` for all continuous animations, batched uploads, and imperative mutations under `frameloop="demand"` (`DropStalk`, `SectorPointCloud`, `GalacticCameraController`, `SystemCameraController`, `ThemeTokenBridge`, `useViewportPointerHandlers` / `useCelestialEntityInteractions` / `SpatialEntityStore`) with colocated TDD tests verifying frames settle to 0 Hz at rest. *(Added zero-alloc `hasPendingUploads()` to `SectorStreamingManager`; wired `invalidate()` across all 10 components/hooks with 94 passing tests.)*
- [x] Task 1.3: Phase 1 Checkpoint — `standards` cleanup; run `npm run check` and targeted R3F/Canvas unit tests; commit checkpoint. *(`npm run check` 0 warnings/0 errors; 17 test files / 94 tests pass.)*

## Phase 2: Idle Occlusion & Raycasting Fixes (`P-09`, `P-10`)
- [~] Task 2.1: Fix `celestialOcclusionRegistry.ts` 250 ms idle expiry bug (`evaluate()` keeps batch-evaluation state fresh / dirty-flag driven so `useCelestialEntityOcclusion` and `EntityLabel` perform zero redundant projection/label work while idle) with TDD tests.
- [~] Task 2.2: Apply `NOOP_RAYCAST` to `OrbitPath` (`Line2`, periapsis tick, direction arrow), `KinematicVector` (`Line2`, terminus), and `PlanetBody` (`planet-surface`, `planet-atmosphere`); add a `require-noop-raycast` rule (with tests) in `scripts/audit-r3f.ts`.
- [ ] Task 2.3: Phase 2 Checkpoint — `standards` cleanup; run `npm run check` and targeted unit tests; commit checkpoint.

## Phase 3: Portal, Selector, Texture & Allocation Hygiene (`P-14`, `P-16`, `P-17`)
- [ ] Task 3.1: Replace all 7 bare `useThree()` calls (`CameraRig`, `GalacticCameraController`, `SystemCameraController`, `PlanetBody`, `SafeHtml`, `ThemeTokenBridge`, `useCameraTransition`) with narrow selectors, and stabilise `SafeHtml` portal subscriptions with keyed per-portal updates so changing one label does not re-reconcile all portals.
- [ ] Task 3.2: Cache `PlanetBody` `512×256` canvas textures by `(classification, palette)` (avoiding disposal of shared cached textures on unmount) and trim `planet-surface` sphere tessellation from `48×48` to `32×32` with TDD tests.
- [ ] Task 3.3: Refactor `KinematicVector` so `LineGeometry`, `CartoLineMaterial`, `Line2`, and `useFrame` are allocated lazily only when `isEnabled` is true (sharing material across instances) with TDD tests.
- [ ] Task 3.4: Phase 3 Checkpoint & Track Closeout — `standards` cleanup; run `npm run check`, `npm run test:coverage`, `npm run build`, Playwright selection/interaction/FPS e2e tests, and `npm run capture:views` (5 viewports); run dual `code-review` + `architecture-review`; update `CHANGELOG.md`; archive standalone track before opening PR; start live LAN smoke-test servers (`5173` + `6006`).
