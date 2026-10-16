# Specification: Console UI Shell

## Overview
Builds the production "Adaptive Hybrid Console" shell around the 3D canvas and domain panels, orchestrating screen real estate between the 2D workstation chrome and the 3D WebGL renderer.

## Scope

1. **Spatial UI & Codex References (References & Exploration):**
   - Benchmark game references: main gameplay HUD vs in-game codexes/encyclopaedias (Elite Dangerous, Star Citizen, Homeworld, Endless Space, Civilization Civilopedia, Destiny Director).
   - Benchmark infinite canvas and map exploration applications across desktop, tablet, and mobile (Google Earth, Figma, Apple Maps, SkySafari).
   - Document layout paradigms, co-presence patterns, and responsive chassis designs in `docs/ui-shell-references.md`.
2. **Adaptive Console Frame (Layout & Canvas Co-presence):**
   - Coordinates the physical split between the 3D Canvas Area, the Coplanar Dock, and the Telemetry Workstation.
   - Dual Workstation Modes:
     - **Overlay Mode:** Canvas is full-bleed ($100\text{vw} \times 100\text{vh}$); transient panels float over the top.
     - **Docked Mode (Split Workstation):** The 2D workspace locks flush to the side or bottom. The shell physically resizes the 3D canvas container so space objects and 2D data exist side-by-side with zero occlusion.
   - **3D Camera Viewport Compensation:** When toggling between Overlay and Docked modes, notifies the WebGL camera rig to update projection aspect ratio and optical offset, keeping the focused target centred in the visible canvas area.
   - **Mobile Responsive Detents:** Bottom sheet chassis supporting stepped vertical detents (Peek $\to$ Partial $\to$ Full).
3. **Selection-Aware Breadcrumbs & Shell Header:**
   - Top-level spatial locator (`Local Volume → Tau Ceti → Tau Ceti e`) reflecting current navigation state.
   - Upward navigation event dispatching.
4. **Total View Decoupling:**
   - Strips all view modules (`GalaxyView`, `SystemView`, `PlanetView`, `ReferenceView`) of root positioning, ad-hoc HUD divs, and duplicate layout CSS.
   - Views become pure content providers that plug into the shell's declared slots (`canvas`, `workspace`, `controls`).

## Out of Scope
- Heading typographic primitive (moved upstream to `telemetry-container_20261004`).
- Persistent Dock implementation (moved upstream to `telemetry-container_20261004`).
- ViewControlsDock implementation (moved upstream to `interaction-controls_20261010`).
- Selection pipeline & camera focal locks (moved to `3d-engine-implementation_20260929`).
- Keyboard shortcut modal (moved to `conductor/backlog.md`).

## Acceptance Criteria
- [ ] Comprehensive research document benchmarking game UIs, codexes, and infinite canvas map apps.
- [ ] Starmap runs inside a single, continuous shell across all routes.
- [ ] Toggling between Overlay and Docked modes resizes canvas cleanly with camera viewport compensation.
- [ ] Breadcrumbs reflect and clear selection correctly.
- [ ] Mobile viewports support Peek, Partial, and Full sheet detents.
- [ ] No view module declares window-level HUD positioning or margin hacks.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
