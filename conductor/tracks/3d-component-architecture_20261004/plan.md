# Implementation Plan: 3D Component Architecture Refactor

## Phase 0: Baseline & Track Setup
- [x] Task: Create track artifacts and register track as an upstream dependency of `3d-engine-implementation`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 1: Tokens, Line Material & Spatial Mathematics (TDD)
- [x] Task: Add semantic tokens in `src/styles/tokens/semantic.css` for motion durations/easings, kinematic chrome, stalks, footprints, orbits, routes, instrument alphas, and dash metrics.
- [x] Task: Update `useThreeTokenStore.ts` to read new semantic tokens, parse durations and bezier easings, and handle theme / reduced-motion updates.
- [x] Task: Write failing unit tests for pure spatial mathematics: logarithmic ring step generation, bearing vector resolution, aperture containment, and interaction tier derivation.
- [x] Task: Implement pure spatial maths library in `src/components/canvas/math/` until all tests pass with 100% coverage.
- [x] Task: Implement `CartoLineMaterial` shader/material supporting solid, dashed, and dotted screen-space lines with arbitrary pixel widths.
- [x] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Instrument Decomposition & Camera Rig (TDD)
- [x] Task: Define `ReferenceFrame` interfaces and declarative presets (`GALACTIC_FRAME`, `SYSTEM_FRAME`, `PLANETARY_FRAME`).
- [x] Task: Decompose `CartographicGrid.tsx` into modular instrument primitives in `src/components/canvas/instrument/`: `SpatialFrameProvider`, `PlanarGrid`, `RangeRings`, `CoordinateFins` (with grazing fade and 360° Polar Cartographic Dial cardinal expansion), `BearingVectors`.
- [x] Task: Implement generic `ScreenEdgeCue` component driven by frame bearing definitions.
- [x] Task: Implement `CameraRig` component isolating camera frustum, reference FOV, and metric zoom scaling.
- [x] Task: Verify Galaxy, System, and Planet instrument rendering parity.
- [x] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Entity Store & Node Decomposition (TDD)
- [x] Task: Implement local per-viewport `useSpatialEntityStore` managing entity registration, interaction FSM (`passive`, `active`, `selected`, `focused`), and aperture queries.
- [x] Task: Implement `BodyMarkers` rendering central celestial markers at strictly invariant screen-pixel size in monochrome.
- [x] Task: Implement `Reticles` rendering category reticle frames and decorating facet components (multiplicity, label, census pips, spectral symbol).
- [x] Task: Implement `EntityLabels` with leader stems, collision displacement, and camera-proximity occlusion.
- [x] Task: Implement `DropStalks` with state-driven extend/retract animation, monochrome styling, and decoupled footprint token.
- [x] Task: Implement `KinematicVector` rendering projected dotted velocity vector to fixed-time delta Δt.
- [x] Task: Implement `OrbitPath` with state-driven kinematic styling and forced rendering on select/focus.
- [x] Task: Implement `OcclusionPass` for non-leaky O(n) per-frame occlusion evaluation.
- [x] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Production Scene Consolidation
- [x] Task: Implement `SpatialViewport` composition root.
- [x] Task: Implement canonical `GalaxyScene.tsx`, `SystemScene.tsx`, and `PlanetScene.tsx`.
- [x] Task: Implement `PlanetBody.tsx` with uniform-lit disc rendering and classification-keyed texture manifest.
- [x] Task: Wire canonical scenes into `GalaxyView`, `SystemView`, and `PlanetView`, replacing placeholder geometry.
- [x] Task: Update Storybook stories to consume canonical scenes directly.
- [x] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## ~~Phase 5: HUD & View Shell Harmonisation~~ (Relocated)
> Moved out of this track. `ViewportLayout`, `Heading`, `ViewControlsDock` and HUD CSS stripping → `console-ui-shell_20261004`. `SecondaryObjectsPane` → `telemetry-container_20261004`. This track completes at Phase 4.
