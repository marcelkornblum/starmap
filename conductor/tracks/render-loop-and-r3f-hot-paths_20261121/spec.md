# Specification: Render-Loop Control & R3F Hot Paths

## Overview
Eliminates constant 60 Hz CPU/GPU burn on hidden and idle routes by gating the persistent `<Canvas>` render loop (`'never'` when no spatial slot is active, moving to `'demand'` when idle), and closes low-risk R3F/DOM hot-path leaks across occlusion, raycasting, portal subscriptions, planet textures, and disabled kinematic vectors.

Covers Performance Review findings `P-01` (Critical), `P-09`, `P-10`, `P-14`, `P-16`, and `P-17`.

## Current State (baseline at 2026-11-21)
- `<Canvas>` in `src/components/domain/CanvasLayer/CanvasLayer.tsx:212-222` never sets `frameloop` (defaults to `'always'`). `RootLayout.tsx:35` keeps the root canvas mounted on all routes and merely hides it via `visibility: hidden` (`CanvasLayer.module.css:55-58`) on `/search` and `/guide/*`, so the full galaxy scene continues rendering, running ~5 `useFrame` hooks per entity, and streaming sectors while invisible.
- Frame-time baselines are 20.8 fps on `/galaxy` and 7.5 fps on `/system/sol` (`scripts/guards/frame-time-baseline.json`), and `useBoundedDeferredValue.ts:5-8` documents React transition starvation from the continuous loop.
- `celestialOcclusionRegistry.ts:41,57-60` early-returns when idle without refreshing `lastEvaluationTime`, causing `isBatchEvaluating()` to flip false after 250 ms at rest so every entity/label performs full projection and occlusion work every frame while idle (`P-09`).
- `OrbitPath.tsx:99-104`, `KinematicVector.tsx:89-93`, and `PlanetBody` spheres omit `NOOP_RAYCAST` despite root `<group onPointerMissed>` traversing the subtree on pointer events (`P-10`).
- `SafeHtml.tsx:124,159-176` rebuilds the portal list and re-renders all labels on `children` identity changes; `CameraRig.tsx:34`, `GalacticCameraController.tsx:34`, and `PlanetBody.tsx:141` call bare `useThree()` without selectors (`P-14`).
- `PlanetBody.tsx:23-85,170,181` allocates a `48×48` sphere and regenerates a `512×256` canvas texture on every mount with no cache (`P-16`).
- `KinematicVector.tsx:73-93,122` allocates `LineGeometry`, `CartoLineMaterial`, `Line2`, and a `useFrame` subscription even when disabled (`P-17`).

## Scope
1. **Slot-Gated & On-Demand Render Loop (`P-01`)**:
   - Pass `frameloop="never"` whenever no spatial canvas slot is active (`activeSlotCount === 0`) and unmount inactive spatial scene content so `/search` and `/guide/*` incur zero background galaxy rendering or sector streaming.
   - **3D Guide (`FS-011`) constraint:** gate `frameloop` strictly on active canvas slot / surface registration — never via a route-path ban on `/guide/*` — so future 3D guide cutaways (`FS-011`) can mount or claim a demand-rendered 3D surface cleanly without waking the background galaxy scene.
   - Transition the active spatial canvas to `frameloop="demand"`, ensuring camera controls, damping, transitions (`useCameraTransition`), hover/selection, sector uploads, and animation loops invoke `invalidate()` reliably (and re-evaluating whether `useBoundedDeferredValue` is still needed).
2. **Idle Occlusion & Raycasting Fixes (`P-09`, `P-10`)**:
   - Convert `celestialOcclusionRegistry` / `useCelestialEntityOcclusion` to a dirty-flag single-pass model so idle scenes perform zero redundant projection/occlusion work.
   - Apply `NOOP_RAYCAST` to `OrbitPath` and `KinematicVector` `Line2` meshes (and non-interactive `PlanetBody` meshes where appropriate), and extend `scripts/audit-r3f.ts` to enforce it.
3. **Portal, Selector & Allocation Hygiene (`P-14`, `P-16`, `P-17`)**:
   - Replace bare `useThree()` calls with narrow selectors (`useThree((s) => s.gl)`, etc.) and stabilise `SafeHtml` portal subscriptions with per-portal keying.
   - Cache `PlanetBody` canvas textures by `(classification, palette)` and reduce sphere tessellation to `32×32`.
   - Lazily create `KinematicVector` geometry, material, and `useFrame` subscription only when enabled, sharing its material across instances.

## Coordination Notes
- Active track [`camera-choreography_20261117`](../camera-choreography_20261117/spec.md) should build cross-scale glides on top of this track's `frameloop="demand"` + `invalidate()` contract.
- Unmounting inactive spatial scene content here directly prepares for lazy scene code splitting in [`startup-code-splitting-and-fonts_20261121`](../startup-code-splitting-and-fonts_20261121/spec.md).

## Out of Scope
- Entity dot instancing, hit-area geometry changes, `CoordinateFins` 132-object consolidation, and GPU tiering / adaptive DPR: [`scene-draw-calls-and-gpu-tiering_20261121`](../scene-draw-calls-and-gpu-tiering_20261121/spec.md).
- Implementing 3D guide cutaways (`FS-011`, remains in `conductor/backlog.md`).

## Acceptance Criteria
- [ ] Navigating to `/search` or `/guide/*` sets the spatial `<Canvas>` to `frameloop="never"` and unmounts inactive spatial scene content; zero background `useFrame` or sector streaming occurs while inactive.
- [ ] Active spatial views (`/galaxy`, `/system/*`, `/planet/*`) run with `frameloop="demand"`, rendering on camera motion, damping, transitions, pointer interaction, and sector uploads, and settling to 0 Hz when idle.
- [ ] Slot-based gating leaves `/guide/*` free to mount future demand-rendered 3D guide surfaces (`FS-011`) without activating the spatial galaxy scene.
- [ ] Idle occlusion registry performs zero per-frame projection/label recalculation at rest.
- [ ] `OrbitPath` and `KinematicVector` `Line2` meshes use `NOOP_RAYCAST` and `audit:r3f` enforces the rule; disabled `KinematicVector` allocates no GPU geometry/material or `useFrame`.
- [ ] Zero bare `useThree()` calls remain in touched components; `PlanetBody` caches textures by `(classification, palette)`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`, and Playwright selection/interaction/FPS e2e tests pass, with multi-viewport visual verification via `npm run capture:views`.
