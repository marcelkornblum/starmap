# Specification: Interaction Controls

## Overview
Establishes the interactive navigation modes, professional 3D camera control paradigms, layer visibility controls, temporal playback and timeline scrubber, and domain interaction dock (`ViewControlsDock`). Sits upstream of domain panels so that interaction paradigms and control states are established before data surfaces consume them.

## Scope

1. **Professional 3D Control Methods (References & Exploration):**
   - Survey and benchmark camera and navigation control methods used by 3D professionals across CAD, DCC (Blender, Maya, Houdini), GIS platforms, astronomical observatory tools (Stellarium, Aladin), and flight telemetry games.
   - Document standard input mapping matrices (orbit, pan, dolly, roll, pinch) and spatial orientation conventions across mouse, keyboard, and touch.
2. **Navigation Modes & Paradigms:**
   - 3D Navigation modes: Free Orbit mode, Constrained Ecliptic/System plane mode, and Top-Down Cartographic survey mode.
   - Pointer and gesture interaction mapping (pan, orbit, zoom, pinch) aligned with the active navigation mode.
3. **Layer Visibility & Filter Controls:**
   - Visual layer visibility toggles driven by `useSettingsStore` and the active `ReferenceFrame`:
     - Keplerian orbits (`showOrbits`)
     - Cartographic coordinate grid (`showGrid`)
     - Entity labels and designations (`showLabels`)
     - Habitable zones / stellar radii
     - Kinematic velocity vectors
     - Magnitude threshold culling
4. **Temporal Controls & Timeline Scrubber:**
   - Interactive timeline scrubber well and scrubhead allowing users to drag and propagate planetary and stellar orbits forward and backward through time.
   - Date/epoch readout and reset to current epoch.
   - Play / pause time progression.
   - Time speed multiplier stepper (e.g., $1\times, 10\times, 100\times, 1000\times$).
   - Integration with Keplerian mean anomaly propagation in `astroMath.ts`.
5. **`ViewControlsDock` Component:**
   - Production HUD controls dock component consolidating layer toggles, camera preset buttons, and playback/scrubber controls.
   - Replaces the exploratory POC `SystemControls.tsx` component.
   - Fully tokenised using scoped CSS Modules, zero inline styles, and semantic button/toggle primitives.

## Acceptance Criteria
- [ ] Comprehensive reference document detailing professional 3D control methods and input mappings.
- [ ] Navigation modes switch cleanly and reconfigure gesture behaviour on the camera.
- [ ] Layer visibility toggles instantly update 3D cartographic elements without component remounts.
- [ ] Interactive timeline scrubber scrubs planetary positions forward and backward in real time without lag.
- [ ] Playback controls accurately adjust simulation delta-time in the animation loop.
- [ ] `ViewControlsDock` implemented as a production component with comprehensive Storybook story.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass with 100% test coverage on state actions.
