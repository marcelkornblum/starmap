# Specification: Scene Draw-Call Reduction & Adaptive GPU Tiering

## Overview
Improves active-motion frame times and mobile/constrained-GPU reliability by collapsing per-entity draw calls, consolidating the 132-object `CoordinateFins` rig, wiring real WebGL GPU renderer probing into `deviceTierService`, and adding frame-time-driven adaptive quality downgrade with an absolute performance budget.

Covers Performance Review findings `P-07`, `P-08`, `P-12`, and optional opportunistic hygiene `P-15` if touching sector buffers/shaders.

## Current State (baseline at 2026-11-21)
- Each active entity renders a `16×16` sphere (512 tris) for a 5 px dot, an always-drawn invisible hit-area mesh (`transparent`, `opacity=0`), and an uncached per-instance reticle geometry built from `new THREE.Vector3` per vertex (~3 draw calls per entity, ~290 draw calls at desktop cutoff 96) (`P-07`).
- `CoordinateFins.tsx:129-225` creates 132 separate `LineSegments` and 132 `LineBasicMaterial` instances (3 planes × 4 quadrants × perimeter + baseline + ticks + 8 pooled arcs), most invisible, traversed and updated every frame (`P-08`).
- `deviceTierService.ts:81-83` chooses device tier solely from `navigator.deviceMemory` / `hardwareConcurrency` / `saveData`; GPU renderer, `maxTextureSize`, and `maxVertexAttribs` are never passed, leaving `isConstrainedGpuRenderer` dead in production; Safari/Firefox treat `deviceMemory === undefined` as adequate; DPR is fixed to 1 with no runtime adaptation, and the CI frame-time baseline (`7.5 fps` system) ratchets in a slow state (`P-12`).
- Sector streaming (`P-15`) uploads an unused `starId` attribute (~25 % of GPU bytes) and copies decoded positions while retaining raw buffers (< 2 MB total RAM).

## Scope
1. **Entity Draw-Call Batching & Reticle Geometry Cache (`P-07`)**:
   - Replace per-entity 512-tri dot spheres with shared `Points` or an instanced quad.
   - Stop shading invisible hit-area meshes (`colorWrite={false}` or `visible={false}` — verified against Playwright selection e2e tests).
   - Cache reticle `BufferGeometry` by `(classification, size, isAnnotated, multiplicity, planetsKey)` without per-vertex `new THREE.Vector3` churn.
2. **CoordinateFins Rig Consolidation (`P-08`)**:
   - Merge or share materials per alpha class across the 132 `CoordinateFins` `LineSegments` objects and set `matrixAutoUpdate = false` on static children.
3. **Real GPU Tier Probing & Adaptive Frame Budget (`P-12`)**:
   - Probe `WEBGL_debug_renderer_info`, `maxTextureSize`, and `maxVertexAttribs` into `deviceTierService` so `isConstrainedGpuRenderer` is live in production and Safari/Firefox without `deviceMemory` are tiered accurately.
   - Add frame-time-driven runtime adaptation (adaptive DPR up to HiDPI on capable GPUs, graceful DPR/label-cap downgrade under sustained load) and define an absolute frame-time budget alongside the regression baseline.
4. **Optional Sector Buffer Hygiene (`P-15`, opportunistic)**:
   - Only if touching sector shaders/buffers: drop unused `starId` GPU attribute, use `InterleavedBufferAttribute`, and skip redundant queue sorts when unchanged.

## Coordination Notes
- Coordinates directly with active track [`orientation-instruments_20261117`](../orientation-instruments_20261117/spec.md), which also touches `CartographicInstrument` / datum-plane indicators; sequence `P-08` ahead of or alongside `orientation-instruments` to avoid double work.
- Calibrating `P-12` after [`render-loop-and-r3f-hot-paths_20261121`](../render-loop-and-r3f-hot-paths_20261121/spec.md) and [`spatial-data-delivery-and-search_20261121`](../spatial-data-delivery-and-search_20261121/spec.md) ensures frame-time budgets reflect real GPU cost rather than loop or JSON-parse noise.

## Out of Scope
- `frameloop` gating, idle occlusion registry, `OrbitPath`/`KinematicVector` `NOOP_RAYCAST`, and `PlanetBody` texture caching: [`render-loop-and-r3f-hot-paths_20261121`](../render-loop-and-r3f-hot-paths_20261121/spec.md).
- Visual redesign of reticles, fins, or orientation instruments: [`orientation-instruments_20261117`](../orientation-instruments_20261117/spec.md).

## Acceptance Criteria
- [ ] Per-entity draw calls drop materially at desktop cutoff (measured via renderer `info.render.calls`); reticle geometries are cached by key with zero visual regression and passing Playwright selection e2e tests.
- [ ] `CoordinateFins` object and material count is consolidated well below 132 with identical cartographic appearance across all 5 standard viewports.
- [ ] `deviceTierService` receives live WebGL renderer/capability telemetry (covering Safari/Firefox without `deviceMemory`), adaptive DPR/label downgrade responds to sustained frame-time spikes, and `scripts/guards/frame-time-baseline.json` is recalibrated against an absolute budget.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`, Playwright FPS/selection specs, and `npm run capture:views` (5 viewports) pass cleanly.
