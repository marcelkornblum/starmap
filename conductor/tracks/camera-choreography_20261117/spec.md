# Specification: Camera Choreography

## Overview
Owns how the 3D camera moves and how the HUD gets out of its way. Delivers smooth cross-scale glides (`Galaxy` ↔ `System` ↔ `Planet`), HUD panel retraction during flight with viewport compensation so the focused target stays centred in the visible canvas area, multi-result search framing (`FS-003`), and the conditional `Centre` CTA driven by independent camera `center` vs entity `focused` state (`FS-013`). Consolidates backlog `FS-012` (absorbing `FS-003` and `FS-013`) and the camera-related residuals of the former "Minimap & Scene Transitions" plan (removed unstarted) and of the archived `3d-engine-implementation`, `console-ui-shell`, `telemetry-container` and `search-discovery` tracks into a single owner.

> [!IMPORTANT]
> **Consolidated Camera/Transition Requirements (`FS-003`, `FS-012`, `FS-013`) — single authoritative copy:**
> 1. **Choreographed View & Intra-View State Transitions (`FS-012`):** Smoothly glide the 3D camera (origin, azimuth/elevation, dolly distance) both across distinct views (`GalaxyView` ↔ `SystemView` ↔ `PlanetView`, including `<LayerCard />` waypoint stepping) and between configurations of the same view (`focused`, `center`, `select`), dissolving parsec drop stalks and galactic grids as AU orbital rings and the circumstellar Habitable Zone materialise. HUD panels retract during flight and snap back once the camera settles, respecting `prefers-reduced-motion`.
> 2. **Search Results Scale & Multi-Result Framing (`FS-003`):** Multi-result sets (`count > 1`) stay at or transition to the galactic scale and auto-frame all matching systems; single-result sets (`count === 1`) only auto-enter system scale for Solar System (*Sol*) bodies.
> 3. **Camera `center` vs. Entity `focused` Independence & Conditional `Centre` CTA (`FS-013`):** Cold-loading a focused view initially centres the camera on that target; subsequent camera panning mutates `center` independently of `focused`; applying `?focus=` does not force-re-centre the camera; and the `Centre` CTA (`data-testid="details-button-center"`) in `<DetailsPanel />` is only visible when the live 3D camera centre differs from the focused entity.

## Current State (baseline at 2026-11-17)
- Same-view centre glides exist: `src/components/canvas/instrument/useCameraTransition.ts` (+ `CameraTransitionController`, `cameraRigZoomAndPan.ts`) and `useCameraStore` (`src/stores/useCameraStore.ts`: `triggerRecenter`, `clearCanvasFocus`, `setPendingCenterSlug`, `setInFlightFocusSlug`).
- The single persistent canvas is `RootCanvasHost` (`src/components/domain/CanvasLayer/RootCanvasHost.tsx`, remediation T07); HUD layout is owned by `SpatialShell` (`src/components/domain/SpatialShell/`) with `DetentSheet` on mobile.
- Not built: cross-scale glides, HUD retraction / snap-back, viewport compensation (no `viewOffset` or equivalent), multi-result search framing, and a conditional `Centre` CTA — `DetailsActionControls.tsx` renders `Centre` unconditionally with a hard-coded `/galaxy?center=…` fallback.
- Routing state is router-owned (`DEC-R014` URL grammar, single `?center=` plus orthogonal `layer`/`select`/`focus`/`route`); choreography must read and write through typed router navigation, never `window.location`.

## Scope
1. **Cross-Scale & Intra-View Camera Glides** (`FS-012`): coordinated glides on `Galaxy` ↔ `System` ↔ `Planet` scale changes and on `focused` / `center` / `select` changes, maintaining focal continuity on the target (no hard cuts or route flashes), with datum-plane/grid dissolve and orbital-ring materialisation. Extends `useCameraTransition`.
2. **HUD Retraction & Viewport Compensation** (`FS-012`): retract `SpatialShell` panels while the camera is in flight and snap them back on settle (`prefers-reduced-motion` respected); compensate the camera projection (aspect ratio and optical offset) for the area of the canvas not covered by HUD panels or an open `DetentSheet`, keeping the focused target centred in the visible region. Carried over from the archived `console-ui-shell` ("3D camera viewport compensation").
3. **Search Framing** (`FS-003`): auto-frame all matches for multi-result sets at galactic scale; Solar System single-result exception. Carried over from the archived `3d-engine-implementation` ("3D-synchronised search framing") and `search-discovery`.
4. **`center` vs. `focused` Independence & Conditional `Centre` CTA** (`FS-013`): independent state per requirement 3 above; replace the unconditional `Centre` button and hard-coded fallback in `DetailsActionControls.tsx`. Carried over from the archived `telemetry-container`.

## Out of Scope
- Compass / attitude widget and datum-plane tilt indicators: [`orientation-instruments`](../orientation-instruments_20261117/spec.md).
- Keyboard camera bindings (`W/A/S/D`, `Q/E`, `+/-`) and navigation modes: [`interaction-controls`](../interaction-controls_20261010/spec.md).
- Two-point route framing (camera enclosing both route endpoints): backlog group "Routing (future initiative)" ([`backlog.md`](../../backlog.md)).
- Docked (split-workstation) shell mode: backlog "Docked mode"; this track only supplies the projection compensation it would need.
- Post-processing and any new 3D materials.

## Acceptance Criteria
- [ ] Switching between `Galaxy`, `System` and `Planet` (route navigation and `<LayerCard />` waypoint stepping) glides the camera with focal lock instead of a hard cut, with no WebGL context recreation (the `RootCanvasHost` canvas persists).
- [ ] Changing `focused`, `center` or `select` within a view glides the camera; `prefers-reduced-motion` replaces glides with immediate settling.
- [ ] HUD panels retract during flight and snap back on settle, and the focused target remains centred in the visible (non-occluded) canvas area at every `DetentSheet` detent and viewport size.
- [ ] Multi-result search sets frame all matches at galactic scale; single results auto-enter system scale only for Solar System bodies.
- [ ] Cold-loading a focused view centres the camera on the target; panning changes `center` without altering `focused`; applying `?focus=` does not re-centre; the `Centre` CTA (`details-button-center`) is visible only when the live camera centre differs from the focused entity, with no hard-coded route fallback.
- [ ] All camera state changes flow through typed router navigation (no `window.location` / `history.replaceState`).
- [ ] Every new or changed component has its full component quad; `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:guards` and `npm run audit:r3f` pass; Playwright covers the transition and `Centre` CTA contracts.
