# Implementation Plan: Interaction Controls

## Phase 1: References & Exploration (Professional 3D Control Paradigms)
- [ ] Task: Research and benchmark control methods across CAD, DCC (Blender, Maya), GIS, observatories (Stellarium, Aladin), and space flight systems.
- [ ] Task: Document input mapping matrices (orbit, pan, dolly, pinch, roll) across desktop, tablet, and mobile in `docs/3d-interaction-controls.md`.
- [ ] Task: Synthesise and ratify control paradigms for Starmap navigation modes with the user.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Navigation Modes & Layer State Store
- [ ] Task: Write unit tests for navigation mode transitions (Free Orbit, Ecliptic, Top-Down) in `src/stores/useSettingsStore.ts`.
- [ ] Task: Extend layer visibility state with typed toggles for grid, orbits, stalks, labels, and vectors.
- [ ] Task: Wire layer visibility state to canvas scene elements and verify reactive updates.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Temporal Playback & Interactive Timeline Scrubber
- [ ] Task: Write unit tests for time simulation store (play/pause, forward/backward, speed multipliers, scrubhead epoch).
- [ ] Task: Implement simulation clock hook syncing Keplerian anomaly advancement with R3F `useFrame`.
- [ ] Task: Implement interactive timeline scrubber well and scrubhead component with zero inline styles.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Production `ViewControlsDock`
- [ ] Task: Write unit tests for `ViewControlsDock` component (`src/components/interface/controls/ViewControlsDock`).
- [ ] Task: Implement `ViewControlsDock` composing `Button`, `Toggle`, `Slider`, and scrubber controls with scoped CSS Modules.
- [ ] Task: Create Storybook story for `ViewControlsDock` showcasing layer toggles, presets, and temporal controls.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
