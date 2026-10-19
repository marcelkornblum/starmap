# Specification: Interaction Controls

## Overview
Establishes the interactive navigation modes, professional 3D camera control paradigms, layer visibility controls, temporal playback and timeline scrubber, and domain interaction dock (`ViewControlsDock`). Sits upstream of domain panels so that interaction paradigms and control states are established before data surfaces consume them.

## Scope

1. **Professional 3D Control Methods (References & Exploration):**
   - Survey and benchmark camera and navigation control methods used by 3D professionals across CAD, DCC (Blender, Maya, Houdini), GIS platforms, astronomical observatory tools (Stellarium, Aladin), and flight telemetry games.
   - Document standard input mapping matrices (orbit, pan, dolly, roll, pinch) and spatial orientation conventions across mouse, trackpad, keyboard, and touch.
2. **Explicit Input Capability Detection & Multi-Modal UI Accommodation:**
   - **Non-Exclusive Capability Model:** Model device input capabilities as a reactive, non-mutually-exclusive capability set (`hasKeyboard`, `hasTouch`, `hasMouse`, `hasTrackpad`), never a naive viewport-width proxy (`mobile` vs `desktop`).
   - **Runtime Probing & Dynamic Promotion:** Combine initial media/platform capability queries (`(any-pointer: fine)`, `(any-pointer: coarse)`, `(any-hover: hover)`, `navigator.maxTouchPoints`, `navigator.keyboard`) with live event verification (`PointerEvent.pointerType` for `'mouse' | 'touch' | 'pen'`, physical `KeyboardEvent` detection, and `WheelEvent` trackpad vs stepped-wheel heuristics) so capabilities promote dynamically as soon as an input device is used (e.g., attaching a Bluetooth keyboard to a tablet or touching a hybrid laptop screen).
   - **Explicit HUD & Control Accommodation ("If keyboard → keyboard tiles; if touch → touch controls; if both → both"):**
     - **`hasKeyboard` Active:** Render `<Key />` keyboard shortcut tiles and keycap bindings in the HUD (`ControlBar` / `ViewControlsDock`). Hide keyboard tiles when no keyboard capability is present.
     - **`hasTouch` Active:** Render explicit on-screen touch controls, touch-sized manipulation affordances, and multi-touch gesture indicators.
     - **Hybrid / Multi-Modal (`hasKeyboard && hasTouch`, etc.):** Render **both** keyboard tiles and touch controls simultaneously when both input types are present, accommodating every permutation (`mouse + keyboard`, `touch only`, `touch + keyboard`, `mouse + touch + keyboard`) explicitly.
   - **Unified Keyboard Shortcut Registry & Global Dispatcher:**
     - Centralise all keyboard shortcuts into a single declarative registry and global keybinding dispatcher (respecting editable input focus guards `<input>`, `<textarea>`, `<select>`, `contentEditable`) so that every `<Key />` tile displayed in `ControlBar` is backed by the exact same binding definition:
       - **Search & Command Activation:** `/` or `Ctrl+K` / `Cmd+K` focuses `#starmap-search-input`; `Escape` blurs/dismisses active search or clears transient selection; `ArrowUp` / `ArrowDown` and `Enter` navigate and commit search results.
       - **Camera & Spatial Framing:** `W` / `A` / `S` / `D` pan, `Q` / `E` rotate/orbit, `+` / `-` zoom, `R` reset/re-centre camera.
       - **Layer & Temporal Toggles:** `G` toggle cartographic grid, `L` toggle labels, `O` toggle orbits (system/planet scale), `Space` play/pause simulation clock.
   - **Deterministic Override & Test Harness:** Expose input capability overrides in `useSettingsStore` and Storybook parameters so unit tests and Playwright E2E suites can deterministically simulate and verify every single input type and combination independently of viewport size.
3. **Navigation Modes & Paradigms:**
   - 3D Navigation modes: Free Orbit mode, Constrained Ecliptic/System plane mode, and Top-Down Cartographic survey mode.
   - Pointer, keyboard, and gesture interaction mapping (pan, orbit, zoom, pinch) aligned with the active navigation mode and detected input capabilities.
   - Control dampening & polar singularity mitigation: Explore dampening rotational sensitivity and controls near coordinate poles ($Y \approx \pm 1$, $Z \approx \pm 1$) to prevent gimbal lock and erratic camera yaw without forcing roll alignment.
4. **Layer Visibility & Filter Controls:**
   - Visual layer visibility toggles driven by `useSettingsStore` and the active `ReferenceFrame`:
     - Keplerian orbits (`showOrbits`)
     - Cartographic coordinate grid (`showGrid`)
     - Entity labels and designations (`showLabels`)
     - Habitable zones / stellar radii
     - Kinematic velocity vectors
     - Magnitude threshold culling
5. **Temporal Controls & Timeline Scrubber:**
   - Interactive timeline scrubber well and scrubhead allowing users to drag and propagate planetary and stellar orbits forward and backward through time across pointer, touch, and keyboard step keys.
   - Date/epoch readout and reset to current epoch.
   - Play / pause time progression.
   - Time speed multiplier stepper (e.g., $1\times, 10\times, 100\times, 1000\times$).
   - Integration with Keplerian mean anomaly propagation in `astroMath.ts`.
6. **`ViewControlsDock` / `ControlBar` Component:**
   - Production HUD controls dock component consolidating layer toggles, camera preset buttons, playback/scrubber controls, and capability-driven input affordances (keyboard tiles, touch controls, or both).
   - Replaces the exploratory POC `SystemControls.tsx` component.
   - Fully tokenised using scoped CSS Modules, zero inline styles, and semantic button/toggle primitives.

## Acceptance Criteria
- [ ] Comprehensive reference document detailing professional 3D control methods and input mappings across mouse, trackpad, keyboard, and touch.
- [ ] Input capability detector (`useInputCapabilities` / store slice) accurately detects and reactively updates `hasKeyboard`, `hasTouch`, `hasMouse`, and `hasTrackpad` via initial probing and live event promotion, with deterministic override support for testing.
- [ ] HUD explicitly adapts to active input capabilities: keyboard-equipped setups render keyboard shortcut tiles, touch-equipped setups render touch controls, and hybrid setups (`hasKeyboard && hasTouch`) render both simultaneously.
- [ ] Automated unit and integration tests explicitly verify each input modality (`keyboard`, `touch`, `mouse`, `trackpad`) and combined permutations (`keyboard-only`, `touch-only`, `mouse+keyboard`, `touch+keyboard`, `all`).
- [ ] Unified keyboard shortcut registry and dispatcher binds every `<Key />` HUD tile (`/`, `Ctrl+K`, `Escape`, arrow result navigation, `Enter`, `W/A/S/D`, `Q/E`, `+/-`, `R`, `G`, `L`, `O`, `Space`) with input-element focus guards and 100% unit test coverage.
- [ ] Navigation modes switch cleanly and reconfigure gesture/key behaviour on the camera.
- [ ] Layer visibility toggles instantly update 3D cartographic elements without component remounts.
- [ ] Interactive timeline scrubber scrubs planetary positions forward and backward in real time without lag.
- [ ] Playback controls accurately adjust simulation delta-time in the animation loop.
- [ ] `ViewControlsDock` / `ControlBar` implemented as a production component with comprehensive Storybook stories covering each input capability permutation.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass with 100% test coverage on state actions and input capability selectors.
