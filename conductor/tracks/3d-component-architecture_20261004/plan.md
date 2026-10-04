# Implementation Plan: 3D Component Architecture Refactor

## Phase 0: Baseline & Track Setup
- [x] Task: Create track artifacts and configure track registry with dependency on `3d-engine-implementation`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 1: Tokens, Line Material & Spatial Mathematics (TDD)
- [ ] Task: Add semantic tokens in `src/styles/tokens/semantic.css` for motion durations/easings, kinematic chrome, stalks, footprints, orbits, routes, instrument alphas, and dash metrics.
- [ ] Task: Update `useThreeTokenStore.ts` to read new semantic tokens, parse durations and bezier easings, and handle theme / reduced-motion updates.
- [ ] Task: Write failing unit tests for pure spatial mathematics: logarithmic ring step generation, bearing vector resolution, aperture containment, and interaction tier derivation.
- [ ] Task: Implement pure spatial maths library in `src/components/canvas/math/` until all tests pass with 100% coverage.
- [ ] Task: Implement `CartoLineMaterial` shader/material supporting solid, dashed, and dotted screen-space lines with arbitrary pixel widths.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Instrument Decomposition & Camera Rig (TDD)
- [ ] Task: Define `ReferenceFrame` interfaces and declarative presets (`GALACTIC_FRAME`, `SYSTEM_FRAME`, `PLANETARY_FRAME`).
- [ ] Task: Decompose `CartographicGrid.tsx` into modular instrument primitives in `src/components/canvas/instrument/`: `SpatialFrameProvider`, `PlanarGrid`, `RangeRings`, `CoordinateFins` (with grazing fade and 360° Polar Cartographic Dial cardinal expansion), `BearingVectors`.
- [ ] Task: Implement generic `ScreenEdgeCue` component driven by frame bearing definitions.
- [ ] Task: Implement `CameraRig` component isolating camera frustum, reference FOV, and metric zoom scaling.
- [ ] Task: Verify Galaxy, System, and Planet instrument rendering parity.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Entity Store & Node Decomposition (TDD)
- [ ] Task: Implement local per-viewport `useSpatialEntityStore` managing entity registration, interaction FSM (`passive`, `active`, `selected`, `focused`), and aperture queries.
- [ ] Task: Implement `BodyMarkers` rendering central celestial markers at strictly invariant screen-pixel size in monochrome.
- [ ] Task: Implement `Reticles` rendering category reticle frames and decorating facet components (multiplicity, label, census pips, spectral symbol).
- [ ] Task: Implement `EntityLabels` with leader stems, collision displacement, and camera-proximity occlusion.
- [ ] Task: Implement `DropStalks` with state-driven extend/retract animation, monochrome styling, and decoupled footprint token.
- [ ] Task: Implement `KinematicVector` rendering projected dotted velocity vector to fixed-time delta Δt.
- [ ] Task: Implement `OrbitPath` with state-driven kinematic styling and forced rendering on select/focus.
- [ ] Task: Implement `OcclusionPass` for non-leaky O(n) per-frame occlusion evaluation.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Production Scene Consolidation
- [ ] Task: Implement `SpatialViewport` composition root.
- [ ] Task: Implement canonical `GalaxyScene.tsx`, `SystemScene.tsx`, and `PlanetScene.tsx`.
- [ ] Task: Implement `PlanetBody.tsx` with uniform-lit disc rendering and classification-keyed texture manifest.
- [ ] Task: Wire canonical scenes into `GalaxyView`, `SystemView`, and `PlanetView`, replacing placeholder geometry.
- [ ] Task: Update Storybook stories to consume canonical scenes directly.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: HUD & View Shell Harmonisation
- [ ] Task: Implement `ViewportLayout` HUD slot template.
- [ ] Task: Implement `Heading` typographic primitive.
- [ ] Task: Implement `ViewControlsDock` consuming capabilities from the active `ReferenceFrame`.
- [ ] Task: Implement `SecondaryObjectsPane` for secondary entity selection and sync.
- [ ] Task: Strip duplicate `.hudOverlay`, `.eyebrow`, `.title`, and positioning CSS from view modules.
- [ ] Task: Run end-to-end visual and navigation checks across Galaxy, System, and Planet views.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
