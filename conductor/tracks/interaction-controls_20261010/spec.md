# Specification: Interaction Controls

## Overview
Establishes the interactive navigation modes, layer visibility controls, temporal playback controls, and domain interaction dock (`ViewControlsDock`). Sits upstream of domain panels so that interaction paradigms and control states are established before data surfaces consume them.

## Scope

1. **Navigation Modes & Paradigms:**
   - 3D Navigation modes: Free Orbit mode, Constrained Ecliptic/System plane mode, and Top-Down Cartographic survey mode.
   - Pointer / gesture interaction mapping (pan, orbit, zoom, pinch) aligned with the active navigation mode.
2. **Layer Visibility & Filter Controls:**
   - Visual layer visibility toggles driven by `useSettingsStore` and the active `ReferenceFrame`:
     - Keplerian orbits (`showOrbits`)
     - Cartographic coordinate grid (`showGrid`)
     - Entity labels and designations (`showLabels`)
     - Habitable zones / stellar radii
     - Kinematic velocity vectors
     - Magnitude threshold culling
3. **Temporal & Playback Controls:**
   - Play / pause time progression.
   - Time speed multiplier stepper (e.g., $1\times, 10\times, 100\times, 1000\times$).
   - Integration with Keplerian mean anomaly propagation.
4. **`ViewControlsDock` Component:**
   - Production HUD controls dock component consolidating layer toggles, camera preset buttons, and playback controls.
   - Replaces the exploratory POC `SystemControls.tsx` component.
   - Fully tokenised using scoped CSS Modules, zero inline styles, and semantic button/toggle primitives.

## Acceptance Criteria
- [ ] Navigation modes switch cleanly and reconfigure gesture behaviour on the camera.
- [ ] Layer visibility toggles instantly update 3D cartographic elements without component remounts.
- [ ] Playback controls accurately adjust simulation delta-time in the animation loop.
- [ ] `ViewControlsDock` implemented as a production component with comprehensive Storybook story.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass with 100% test coverage on state actions.
