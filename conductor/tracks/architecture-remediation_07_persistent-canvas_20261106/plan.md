# Plan: T07 · One Persistent Canvas & R3F Hot Paths

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006, DEC-R044)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md
- [x] Task: Decide — Scene composition model inside the single Canvas (DEC-R045)
- [x] Task: Decide — Replacement for data-* test hooks on R3F nodes (userData vs DOM mirror) (DEC-R046)
- [x] Task: Decide — Occlusion registration model (DEC-R047)
- [x] Task: Decide — R3F frame-loop, shader performance & interaction standards (DEC-R048)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation (Ratified Decisions)
- [x] Task 2.1: Dead Infrastructure Removal & Prototype Purity (AUD-101, AUD-102)
  - Delete `GlobalCanvas.tsx`, `SceneBridge.tsx`, `SceneBridgeContext.ts`, and prune `tests/canvasAndLoaders.test.ts`
  - Delete `patchR3F.ts`, remove imports in `main.tsx`, `setup.ts`, `.storybook/preview.tsx`, replace intrinsic `data-*` on 3D elements with `name` / `userData`
- [x] Task 2.2: Single Persistent Canvas in `RootCanvasHost` & Scope Scene Switching (AUD-100)
  - Lift `<Canvas>` into `RootCanvasHost` in `CanvasLayer.tsx`
  - Refactor `GalacticViewScene`, `SystemViewScene`, `PlanetaryViewScene` in `SpatialScenes.tsx` to be pure child components without nested `<Canvas>`
  - Ensure WebGL context is created once and survives galaxy <-> system <-> planet transitions
- [x] Task 2.3: Occlusion Lifecycle, Passive Star Filtering & Hit Area Fan-Out (AUD-103, AUD-114)
  - Register footprints on mount / unregister on unmount in `CelestialEntity.tsx` (never in `useFrame`)
  - Evaluate screen projections in $O(N)$ batch pass (`OcclusionPass.evaluate`)
  - Filter `other.hasReticle` in `computeHitAreaOffsetFor` and `getCyclicSelectionTarget`
- [x] Task 2.4: Frame-Loop Purity & Allocation Elimination (AUD-104, AUD-105, AUD-108, AUD-113)
  - Remove layout reads (`offsetWidth`/`offsetHeight`) in `EntityLabel.tsx`
  - Remove render-phase ref mutations in `CelestialEntity.tsx`
  - Remove `getState()` and `setApertureIds(new Set())` from frame callbacks in `SpatialEntityContext.tsx` and `SpatialFrameProvider.tsx`
  - Replace `style={{ transform }}` in `EntityLabel.tsx` with CSS custom properties
- [x] Task 2.5: Shader & Material Uniform Stability & Token Alignment (AUD-106, AUD-107, AUD-111, AUD-112)
  - Allocate `CartoLineMaterial` and `Line2` stably in `OrbitPath.tsx` and `DropStalk.tsx`, updating colors/opacity in-place
  - Remove per-frame `color.copy()` in `RangeRings.tsx` and `CoordinateFins.tsx`, updating on theme changes
  - Store primitive hex strings in `useThreeTokenStore.ts`, building `THREE.Color` at material boundary
  - Unify dash/dot metrics in `cartography.ts`
- [x] Task 2.6: Interaction Invariants & Camera Ownership (AUD-109, AUD-110, AUD-115, AUD-116)
  - Eliminate module singletons, making hooks throw outside provider (`AUD-109`)
  - Consolidate camera restoration and constraints into `CameraRig`, removing duplicate overrides in `GalacticCameraController` (`AUD-110`)
  - Call `billboardRef.current.updateMatrixWorld(true)` on transform mutations in `BodyMarker.tsx` (`AUD-115`)
  - Implement 6-8 px drag threshold for `BodyMarker` click activation with `OrbitControls` (`AUD-116`)
- [x] Task 2.7: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, guard suite
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [x] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [x] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [x] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
