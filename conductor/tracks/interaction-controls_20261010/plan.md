# Implementation Plan: Interaction Controls

## Phase 1: Navigation Modes & Layer State Store
- [ ] Task: Write unit tests for navigation mode transitions (Free Orbit, Ecliptic, Top-Down) in `src/stores/useSettingsStore.ts`.
- [ ] Task: Extend layer visibility state with typed toggles for grid, orbits, stalks, labels, and vectors.
- [ ] Task: Wire layer visibility state to canvas scene elements and verify reactive updates.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Temporal Playback Controls
- [ ] Task: Write unit tests for time simulation store (play/pause, forward/backward, speed multipliers).
- [ ] Task: Implement simulation clock hook syncing Keplerian anomaly advancement with R3F `useFrame`.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Production `ViewControlsDock`
- [ ] Task: Write unit tests for `ViewControlsDock` component (`src/components/interface/controls/ViewControlsDock`).
- [ ] Task: Implement `ViewControlsDock` composing `Button`, `Toggle`, and `Slider` primitives with scoped CSS Modules and zero inline styles.
- [ ] Task: Create Storybook story for `ViewControlsDock` showcasing layer toggles, presets, and time steppers.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
