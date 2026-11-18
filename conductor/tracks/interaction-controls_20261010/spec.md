# Specification: Interaction Controls

## Overview
Owns how the user drives the map: which input devices are present, which keyboard shortcuts exist (one registry, one dispatcher, one help modal), and which navigation modes shape camera behaviour. Rewritten 2026-11-17 (Conductor registry tidy, decision T6d) to the residual scope after `ControlBar`, the layer toggles and the four-key shortcut handler shipped during Journeys 1–5. The original spec's temporal/scrubber scope and the exploratory research phase are no longer part of this track (see Out of Scope).

## Current State (baseline at 2026-11-17)
- `src/components/domain/ControlBar/ControlBar.tsx` renders projection buttons (3D / Top-Down), Orbits / Grid / Labels toggles backed by `useSettingsStore` (`src/stores/useSettingsStore.ts`), and a static `SHORTCUTS` list rendered with the `Kbd` primitive.
- `src/hooks/useKeyboardShortcuts.ts` handles only `/`, `Space`, `R` and `Esc`, with a local `isTypingInInputElement` guard.
- `useKeyboardShortcuts.ts` (Escape → clear focus) still reads `window.location.search` and falls back to `history.replaceState` + a `starmap:locationchange` event, contradicting the router-as-single-source-of-truth rule (remediation T06, `DEC-R041`).
- No input-capability detection exists (`hasKeyboard` / `hasTouch` / `hasMouse` / `hasTrackpad`), no shortcut registry, no keyboard help modal and no navigation modes beyond the 3D / Top-Down projection toggle.

## Scope

1. **Input-Capability Detection & Multi-Modal HUD Accommodation**
   - **Non-exclusive capability model:** reactive capability set (`hasKeyboard`, `hasTouch`, `hasMouse`, `hasTrackpad`), never a viewport-width proxy (`mobile` vs `desktop`).
   - **Runtime probing and dynamic promotion:** combine initial media/platform queries (`(any-pointer: fine)`, `(any-pointer: coarse)`, `(any-hover: hover)`, `navigator.maxTouchPoints`, `navigator.keyboard`) with live event verification (`PointerEvent.pointerType` for `'mouse' | 'touch' | 'pen'`, physical `KeyboardEvent`, `WheelEvent` trackpad vs stepped-wheel heuristics) so capabilities promote as soon as a device is used.
   - **HUD accommodation:** `ControlBar` renders `Kbd` shortcut tiles when `hasKeyboard`, touch-sized controls when `hasTouch`, and both when both are present.
   - **Deterministic overrides:** capability overrides exposed through `useSettingsStore` and Storybook parameters so unit tests and Playwright can simulate every permutation independently of viewport size.
2. **Shortcut Registry, Dispatcher & Keyboard Help Modal**
   - One declarative registry and one global dispatcher (with the existing editable-element guard: `<input>`, `<textarea>`, `<select>`, `contentEditable`). `ControlBar` shortcut tiles and the dispatcher read the same binding definitions (no second hard-coded list).
   - Bindings to cover (missing today): `Ctrl+K` / `Cmd+K` focuses `#starmap-search-input`; `ArrowUp` / `ArrowDown` / `Enter` navigate and commit search results; `W` / `A` / `S` / `D` pan; `Q` / `E` orbit; `+` / `-` zoom; `G` grid, `L` labels, `O` orbits toggles. Existing `/`, `R`, `Esc` migrate onto the registry. (`Space` play/pause is tied to the time controller — see Out of Scope.)
   - **Keyboard help modal:** accessible keymap cheat-sheet generated from the registry (global navigation bindings, camera presets, layer toggles), composed from Tier 1 primitives (`Kbd`, `Heading`, `Button`, `Stack`/`Cluster`). Absorbs the former backlog item "Keyboard Shortcut Reference Modal".
   - **Router SSOT fix:** replace the `window.location` / `history.replaceState` / `starmap:locationchange` fallback in `useKeyboardShortcuts.ts` with typed TanStack Router navigation (`navigate({ search, replace: true })`), matching `useSystemOutOfScopeGuard` / `usePlanetOutOfScopeGuard`.
3. **Navigation Modes**
   - Free Orbit, Constrained Ecliptic / System plane, and Top-Down Cartographic survey modes, reconfiguring pointer, keyboard and gesture mapping (pan, orbit, zoom, pinch) according to the active mode and detected capabilities.
   - Builds on the shipped `projection` setting and orthographic presets from the archived `camera-orthographic-projection_20261010`; mode state lives in `useSettingsStore`.
   - Control dampening near coordinate poles ($Y \approx \pm 1$, $Z \approx \pm 1$) to mitigate gimbal lock without forcing roll alignment.

## Out of Scope
- **Time controller** (Play/Pause, speed scrubber, epoch picker in `ControlBar` — currently local `useState` scaffolding, wired to nothing): moved to the backlog group "Routing (future initiative)" with `FS-017` ([`backlog.md`](../../backlog.md)). It is left untouched here; the `Space` binding is registered only when that work is graduated.
- Camera choreography, HUD retraction, search framing, `Centre` CTA conditionality (`FS-003`, `FS-012`, `FS-013`): [`camera-choreography`](../camera-choreography_20261117/spec.md).
- Compass / attitude widget and datum-plane tilt indicators: [`orientation-instruments`](../orientation-instruments_20261117/spec.md).
- Layer visibility toggles for orbits, grid and labels: already shipped. Additional toggles from the original spec (habitable zones / stellar radii, kinematic velocity vectors, magnitude-threshold culling) are not carried over by this rewrite.
- The original Phase 1 research survey of professional 3D control methods and `docs/3d-interaction-controls.md`: dropped (the document never existed); capability-detection and mode behaviour are specified in this track instead.
- System Settings drawer and analytics (backlog).

## Acceptance Criteria
- [ ] `useInputCapabilities` (or an equivalent `useSettingsStore` slice) detects and reactively updates `hasKeyboard`, `hasTouch`, `hasMouse` and `hasTrackpad` from initial probing and live event promotion, with deterministic test overrides.
- [ ] `ControlBar` adapts to capabilities: keyboard tiles with a keyboard, touch controls with touch, both on hybrid devices; unit tests cover keyboard-only, touch-only, mouse+keyboard, touch+keyboard and all-inputs permutations, and Storybook stories cover each.
- [ ] A single shortcut registry drives both the global dispatcher and every `Kbd` tile in `ControlBar`; editable-element focus guards hold; every binding listed in Scope item 2 is covered by unit tests.
- [ ] The keyboard help modal lists every registered binding, opens and closes by keyboard and pointer, and is generated from the registry (no duplicated key list).
- [ ] `src/hooks/useKeyboardShortcuts.ts` (and its replacement, if the hook is restructured) contains no `window.location`, `history.replaceState` or `starmap:locationchange` usage; `Esc` clears `?focus=` via typed router navigation.
- [ ] Navigation modes switch cleanly and reconfigure gesture and key behaviour on the camera, including pole dampening.
- [ ] Every new or changed component has its full component quad (`.tsx`, `.module.css`, `.stories.tsx`, `.test.tsx`); `npm run lint`, `npm run typecheck`, `npm run test:coverage` and `npm run audit:guards` pass.
