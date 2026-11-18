# Implementation Plan: Interaction Controls

> **Phase skeleton (rewritten 2026-11-17).** The previous plan (26 tasks across research, capability detection, registry, timeline scrubber and `ControlBar`) was reset to the residual scope in [spec.md](./spec.md). Phases below are to be detailed into TDD tasks at track kick-off via `conductor-new-track`; do not start implementation from this skeleton.

## Phase 1: Input-Capability Detection & Multi-Modal `ControlBar`
- [ ] Task: To be detailed at kick-off — capability detector (`hasKeyboard`, `hasTouch`, `hasMouse`, `hasTrackpad`), runtime promotion, test overrides.
- [ ] Task: To be detailed at kick-off — capability-aware `ControlBar` (keyboard tiles via `Kbd`, touch controls, hybrid) with stories per permutation.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:guards`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Shortcut Registry, Dispatcher, Router SSOT Fix & Keyboard Help Modal
- [ ] Task: To be detailed at kick-off — declarative shortcut registry and single global dispatcher (editable-element guards).
- [ ] Task: To be detailed at kick-off — migrate `/`, `R`, `Esc` and add the missing bindings (Scope item 2); `ControlBar` tiles read the registry.
- [ ] Task: To be detailed at kick-off — remove `window.location` / `history.replaceState` / `starmap:locationchange` from `src/hooks/useKeyboardShortcuts.ts` in favour of typed router navigation.
- [ ] Task: To be detailed at kick-off — keyboard help modal generated from the registry.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:guards`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Navigation Modes
- [ ] Task: To be detailed at kick-off — Free Orbit / Ecliptic / Top-Down mode state in `useSettingsStore` and camera gesture/key reconfiguration.
- [ ] Task: To be detailed at kick-off — pole dampening.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:guards`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
