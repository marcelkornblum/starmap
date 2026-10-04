# Specification: Console UI Shell

> **Status: Stub.** Scope captured from `conductor/backlog.md`, `docs/feature-backlog.md` (retired) and Phase 5 of `3d-component-architecture_20261004`. Refine via `conductor-new-track` before implementation.

## Overview
Builds the production "Adaptive Hybrid Console" shell around the 3D canvas, replacing the per-view HUD overlays with a single layout that owns all 2D chrome placement.

## Scope

1. **Viewport Layout & Typography** *(moved from `3d-component-architecture` Phase 5)*
   - `ViewportLayout` HUD slot template (canvas, dock, telemetry slot, edge slots).
   - `Heading` typographic primitive.
   - Strip duplicate `.hudOverlay`, `.eyebrow`, `.title` and positioning CSS from `GalaxyView`, `SystemView`, `PlanetView` modules.
2. **Persistent Dock**
   - Global navigation and search entry point.
   - **Persistent top-level modes:** Map vs Encyclopedia/Codex as global anchors (former Feature 20).
3. **Unified Selection Pipeline** (former Feature 2)
   - Selecting an entity from any 2D surface or by clicking its 3D reticle dispatches the same pipeline: camera focal lock, reticle state promotion, telemetry activation.
   - Typed 2D → 3D camera commands (the 2D half of the former "Unified 3D-2D Event Bridge").
4. **Selection-Aware Breadcrumbs** (former Feature 13)
   - Terminal segment reflects the current selection (`Local Volume → Tau Ceti → Tau Ceti e`).
   - Clicking a parent segment navigates up and clears child selection.
5. **View Controls** *(`ViewControlsDock` moved from `3d-component-architecture` Phase 5)*
   - Capabilities sourced from the active `ReferenceFrame`.
   - Layer visibility toggles (constellation lines, habitable zones, grid, names, velocity vectors, magnitude thresholds).
   - Camera controls and presets (logarithmic zoom stepper, reset, orbital lock, top-down ecliptic toggle).
6. **Keyboard Shortcut Reference Modal.**

## Out of Scope
- Telemetry container, dossiers, Secondary Objects Pane (`telemetry-container_20261004`).
- Search results, scoping, filters, command palette (`search-discovery_20261004` / backlog).

## Acceptance Criteria
- [ ] No view module declares HUD positioning; all placement owned by `ViewportLayout`.
- [ ] Dock renders on all views with Map/Encyclopedia modes.
- [ ] 2D and 3D selection dispatch an identical pipeline (tested).
- [ ] Breadcrumbs reflect and clear selection correctly.
- [ ] Layer toggles and camera presets drive the scene via shared state.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
