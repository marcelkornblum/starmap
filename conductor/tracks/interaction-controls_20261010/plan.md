# Implementation Plan: Interaction Controls

## Phase 1: References & Exploration (Professional 3D Control Paradigms & Input Modalities)
- [ ] Task: Research and benchmark control methods across CAD, DCC (Blender, Maya), GIS, observatories (Stellarium, Aladin), and space flight systems.
- [ ] Task: Document input mapping matrices (orbit, pan, dolly, pinch, roll) and capability detection strategies across mouse, trackpad, keyboard, touch, and hybrid devices in `docs/3d-interaction-controls.md`.
- [ ] Task: Explore control dampening techniques near coordinate poles to mitigate gimbal lock and erratic camera yaw without forced roll snapping.
- [ ] Task: Synthesise and ratify control paradigms and multi-modal HUD adaptation rules with the user.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Explicit Input Capability Detection & Multi-Modal State Slice
- [ ] Task: Write unit tests for non-exclusive input capability detection (`hasKeyboard`, `hasTouch`, `hasMouse`, `hasTrackpad`), dynamic runtime promotion (`PointerEvent`, `KeyboardEvent`, `WheelEvent`), and deterministic test overrides.
- [ ] Task: Implement input capability detector (`useInputCapabilities` / store slice in `src/stores/useSettingsStore.ts`) supporting independent and combined modalities (`keyboard-only`, `touch-only`, `mouse+keyboard`, `touch+keyboard`, `mouse+touch+keyboard`).
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Unified Keyboard Shortcut Registry, Navigation Modes & Layer State Store
- [ ] Task: Write unit tests for the unified keyboard shortcut registry and global keybinding dispatcher (`/`, `Ctrl+K`/`Cmd+K` search focus, `Escape` dismiss/blur, `ArrowUp`/`ArrowDown`/`Enter` result navigation, `W/A/S/D`, `Q/E`, `+/-`, `R`, `G`, `L`, `O`, `Space`) including editable input focus guards.
- [ ] Task: Implement the unified keyboard shortcut registry and hook so `<ControlBar />` `<Key />` tiles and global keyboard listeners share a single source of truth.
- [ ] Task: Write unit tests for navigation mode transitions (Free Orbit, Ecliptic, Top-Down) in `src/stores/useSettingsStore.ts`.
- [ ] Task: Extend layer visibility state with typed toggles for grid, orbits, stalks, labels, and vectors.
- [ ] Task: Wire layer visibility state and input-capability-aware gesture/key handlers to canvas scene elements and verify reactive updates.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Temporal Playback & Interactive Timeline Scrubber
- [ ] Task: Write unit tests for time simulation store (play/pause, forward/backward, speed multipliers, scrubhead epoch).
- [ ] Task: Implement simulation clock hook syncing Keplerian anomaly advancement with R3F `useFrame`.
- [ ] Task: Implement interactive timeline scrubber well and scrubhead component supporting pointer drag, touch scrub, and keyboard step keys with zero inline styles.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Production `ViewControlsDock` / `ControlBar` & Multi-Modal HUD Accommodation
- [ ] Task: Write unit and integration tests for `ViewControlsDock` / `ControlBar` verifying explicit input accommodation:
  - `hasKeyboard: true, hasTouch: false` → renders `<Key />` keyboard shortcut tiles only.
  - `hasKeyboard: false, hasTouch: true` → renders explicit touch control affordances only (hiding keyboard tiles).
  - `hasKeyboard: true, hasTouch: true` → renders both keyboard shortcut tiles and touch control affordances simultaneously.
- [ ] Task: Implement `ViewControlsDock` / `ControlBar` composing `Button`, `Toggle`, `Slider`, `<Key />` tiles, touch controls, and scrubber controls with scoped CSS Modules and CUBE `data-*` capability attributes.
- [ ] Task: Create Storybook stories showcasing layer toggles, presets, temporal controls, and each input capability permutation (`KeyboardAndMouse`, `TouchOnly`, `HybridTouchAndKeyboard`).
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

