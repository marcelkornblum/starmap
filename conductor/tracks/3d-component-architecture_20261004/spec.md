# Specification: 3D Component Architecture Refactor

## Overview
This track delivers the full architectural refactoring and component decomposition of Starmap's 3D spatial elements across Galaxy, System, and Planetary inspection scales. It eliminates ad-hoc per-view overrides, breaks down monolithic components (`CartographicGrid` and `CelestialNode`), establishes strict token-driven rendering, and introduces reusable primitives for instruments, entities, and canvas HUD layouts.

## Functional Requirements

1. **Semantic Tokens & 3D Bridge:**
   - Define missing semantic tokens in `src/styles/tokens/semantic.css` for motion (`--chrome-stalk-extend-duration`, `--chrome-stalk-extend-ease`, `--chrome-stalk-retract-duration`, `--chrome-stalk-retract-ease`, `--chrome-footprint-stamp-duration`), kinematic chrome (`--chrome-kinematic-color`, `--chrome-kinematic-alpha`), stalks & footprints (`--chrome-stalk-*`, `--chrome-footprint-*`), orbits (`--chrome-orbit-*`), routes (`--chrome-route-*`), and instrument alphas/dash metrics.
   - Update `useThreeTokenStore` to parse durations and bezier easings, and re-read on theme or reduced-motion changes.
2. **Unified Line Material (`CartoLineMaterial`):**
   - Provide a screen-space line material supporting solid, dashed, and dotted styling with configurable pixel widths, resolving WebGL `linewidth` restrictions.
3. **Headless Spatial Mathematics:**
   - Extract bearing calculations, aperture membership, logarithmic ring progressions, and tier derivations into pure TypeScript functions with unit test coverage, completely decoupled from R3F rendering.
4. **Instrument Decomposition (`CartographicGrid` Split):**
   - Decompose `CartographicGrid.tsx` into modular components: `SpatialFrameProvider`, `PlanarGrid`, `RangeRings`, `CoordinateFins`, `BearingVectors`, `ScreenEdgeCue`, and `CameraRig`.
   - `CoordinateFins`: Renders the three mobile orthogonal quarter-circle fins ($XY, XZ, YZ$) with view-dependent grazing fade; on cardinal alignment / orthographic approach, smoothly expands the face-on plane into the full $360^\circ$ **Polar Cartographic Dial** with full perimeter degree ticks while edge-on fins collapse.
   - Scale-specific behaviours are driven by declarative `ReferenceFrame` presets (`GALACTIC_FRAME`, `SYSTEM_FRAME`, `PLANETARY_FRAME`) rather than branching code paths.
5. **Entity & Interaction Decomposition (`CelestialNode` Split):**
   - Create a local per-viewport `useSpatialEntityStore` managing interaction state (`passive`, `active`, `selected`, `focused`).
   - `CelestialEntity` contract: Pure world-space coordinates, with optional `velocity?: [number, number, number]` for fixed-time $\Delta t$ kinematic projections, and optional `orbit?: KeplerianElements`.
   - `BodyMarkers`: Renders body markers at strictly invariant screen-pixel size in monochrome.
   - `Reticles`: Renders uniform-envelope category reticles (star diamond, terrestrial circle, gas giant slash-circle, ice giant ringed circle) and reticle-decorating facet components (multiplicity, label, planetary census pips, spectral symbol).
   - `EntityLabels`: Screen-space displacement along leader stems and camera-proximity occlusion.
   - `DropStalks`: Projects state-driven drop stalks and datum footprints for `selected` and `focused` tiers, supporting extend/retract motion.
   - `KinematicVector`: Renders projected dotted velocity vector to fixed-time delta $\Delta t$, independent of closed orbital paths, consuming `--chrome-kinematic-*` tokens.
   - `OrbitPath`: Renders dashed/dotted orbits with kinematic styling on select/focus, force-rendering on selected/focused entities.
   - `OcclusionPass`: O(n) per-frame occlusion evaluation scoped to the active viewport.
6. **Canonical Production Scenes:**
   - Implement `GalaxyScene.tsx`, `SystemScene.tsx`, and `PlanetScene.tsx` inside `SpatialViewport`.
   - Implement `PlanetBody.tsx` with uniform cartographic lighting (no day/night terminator) and classification-keyed surface texture.
   - Wire canonical scenes into routes and update Storybook stories to consume canonical scenes directly.
7. ~~**Canvas HUD & View Harmonisation**~~ — relocated to `console-ui-shell_20261004` (`ViewportLayout`, `Heading`, `ViewControlsDock`, HUD CSS stripping) and `telemetry-container_20261004` (`SecondaryObjectsPane`).

## Non-Functional Requirements

- **Design System & Styling Guardrails:** Zero inline styles, zero in-component multipliers or floors, zero hardcoded hex colours. Semantic tokens only.
- **Performance & Leak Prevention:** O(n) occlusion pass; per-viewport stores to prevent cross-view contamination.
- **Architectural Integrity:** Each specification rule has exactly one owner component. Scale differences are data, not code branches.
- **Direct Unit Testability:** All core maths and state transitions tested as pure functions with 100% coverage.

## Acceptance Criteria

- [ ] All new tokens defined and mapped correctly in both themes.
- [ ] Spatial maths library passes 100% unit tests.
- [ ] `CartographicGrid.tsx` decomposed into focused instrument primitives with visual and navigational parity.
- [ ] `CelestialNode.tsx` decomposed into `BodyMarkers`, `Reticles`, `EntityLabels`, `DropStalks`, and `OrbitPath`.
- [ ] Drop stalks extend on select/focus, retract on exit, and remain monochrome.
- [ ] Body markers render at invariant screen-pixel size in monochrome.
- [ ] Production scenes render in `GalaxyView`, `SystemView`, and `PlanetView` without placeholder geometry.
- [ ] Lint (`npm run lint`), typecheck (`npm run typecheck`), and tests (`npm run test:coverage`) pass with zero errors.

## Out of Scope

- GPU instancing / buffer packing (deferred to `3d-engine-implementation`).
- Real-time orbital propagation or astrodynamics solvers.
- Arbitrary route planning UI.
