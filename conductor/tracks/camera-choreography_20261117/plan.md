# Implementation Plan: Camera Choreography

> **Living, malleable plan (Phase-by-Phase Review mode).**
> Revised after adversarial architecture review against the live codebase. Feel, timing, and choreography details stay intentionally loose behind clean seams—starting with a single shared easing curve (defaulting to quadratic) and an immediate live demo—so we can tune or pivot after every phase review.
>
> **Per-Phase Review Contract:** At the end of every phase, halt and present:
> 1. Clickable local-network URLs (`http://<LAN_HOST>:5173/...`) and a short **"What to see & try"** guide describing the exact interactions to test.
> 2. 5-viewport Playwright screenshots (`npm run capture:views`) for UI/visual phases.
> 3. Explicit tuning/pivot checkpoint before starting the next phase.

---

## Core Design Seams (Kept Tunable)
- **Single Easing Source (`DEC-R012`-compliant):** Pure easing math and curve registry live in `src/utils/cameraEasing.ts` (importable by both `src/stores/` and `src/components/canvas/`), defaulting to quadratic (`easeInOutQuad`), with named alternatives (`easeOutQuad`, `easeInOutCubic`, `linear`, etc.) for live comparison.
- **Live Experimentation Hook:** A lightweight store/config knob on `useCameraStore` (active curve name, base duration, and linear vs. logarithmic distance interpolation toggle) read by the single camera engine so you can experiment live without hunting across files.
- **Single Camera Engine:** One unified transition controller interpolates `(target, sphericalDir, distance/orthoZoom, up, fov)` along the shared easing curve, gating `OrbitControls` updates and store/URL sync while in flight (eliminating double `controls.update()`, damping battles, and 60fps store writes).
- **`frameloop="demand"` & Frame-0 Safety:** Transitions anchor `startTime` on the **first `useFrame` tick** (`pendingStart` flag) so shader-compile or scene-mount stalls never cause frame-0 jumps, and call `invalidate()` strictly while active.
- **Reduced Motion:** `prefersReducedMotion()` (`src/utils/reducedMotion.ts`) and `useReducedMotion()` (`src/hooks/useReducedMotion.ts`) short-circuit all camera glides and HUD retractions to immediate settle (never pulsing `isCameraTransitioning`).
- **Router SSOT (`DEC-R014`) & File Size (`max-lines: 300`):** All URL camera state flows through typed TanStack Router navigation (no `window.location.search` / `replaceSpaHistoryUrl` leaks); near-300-line files (`GalacticCameraController`, `useGalaxyViewModel`, `useSystemViewModel`, `useCameraTransition`) are decomposed cleanly as touched.

---

## Phase 1: Unified Single-Curve Camera Engine, Intra-View Glides & `center`/`focused` Foundation
**Goal:** Collapse split/snapping camera controllers into one unified single-curve glide engine across Galaxy, System, and Planet views, establish clean `center` vs. `focused` independence early (avoiding rework in Phases 2–5), and deliver an immediate live demo to feel and tune the quadratic curve.

- [~] **Task 1.1 (Red/Green/Refactor): Shared Easing Registry, Reduced-Motion & Experimentation Knob**
  - Create `src/utils/cameraEasing.ts` (`easeInOutQuad` default, named alternatives, pure interpolation helpers) and `src/utils/reducedMotion.ts` + `src/hooks/useReducedMotion.ts`.
  - Add tunable `easingCurve`, `transitionDurationSec`, and `useLogarithmicDistance` settings to `useCameraStore` (defaulting to `'easeInOutQuad'`).
  - Unit tests covering curve endpoints, monotonicity, curve switching, and reduced-motion short-circuit.
- [ ] **Task 1.2 (Red/Green/Refactor): Unified Camera Transition Engine**
  - Unify `CameraTransitionController`, `CardinalTransitionController`, and perspective/orthographic camera presets (`reset`, `radial`, `top-down`, `orbital-lock`, cardinal axes) onto a single controller interpolating `(target, sphericalDir, distance/orthoZoom, up, fov)` via `src/utils/cameraEasing.ts`.
  - Anchor `startTime` on the first `useFrame` tick (`pendingStart`); clamp idle `delta` in `DropStalk.tsx` as well; gate `OrbitControls` updates and suppress 60fps store/URL sync while `isCameraTransitioning` is true (syncing once on settle).
  - Ensure OrbitControls user `'start'` interrupts any active glide cleanly and clears damping momentum; deduplicate double-click callbacks in `useViewportPointerHandlers.ts`.
- [ ] **Task 1.3 (Red/Green/Refactor): Replace Synchronous Snaps & Establish `center` vs. `focused` Semantics**
  - Replace synchronous snaps in `GalacticCameraController` and `SystemCameraController` with unified glides (keeping cold-load initial placement instant so initial load does not swoop from `[0,0,0]`).
  - Resolve the dual-controller overlap in `SystemSceneEntry` (`SystemCameraController` + `SystemScene -> GalacticCameraController`), wire `centerId` into `PlanetarySceneContent`, and ensure `SystemCameraController` keeps `useCameraStore.target` in sync on settle.
  - Separate `center` from `focused` cleanly: cold-loading a focused view centres on that target; subsequent panning mutates `center` without altering `focused`; applying `?focus=` does not force-re-centre.
  - Remove remaining `window.location.search` / `replaceSpaHistoryUrl` camera-URL leaks (`GalacticCameraController`, `useGalaxyViewModel`, `useKeyboardShortcuts`, `spaNavigation`, `SearchPanel`) in favour of typed TanStack Router navigation (`DEC-R014`).
- [ ] **Task 1.4 (Red/Green/Refactor): Dev-Only Camera Motion Lab UI**
  - Add a compact, collapsible dev-only (`import.meta.env.DEV`) Motion Lab overlay/popover (using Tier 1 Interface Primitives, CSS Modules, and full component quad) allowing live switching of easing curve, duration, and linear vs. logarithmic distance, plus one-click test journeys of varying lengths (short / medium / long hops sampled dynamically from loaded entities in `SpatialEntityStore` — zero hardcoded entity names) and camera presets.
- [ ] **Task 1.5: Quality Gate & Standards Cleanup**
  - Run `standards` cleanup; verify `max-lines: 300` and `DEC-R012` boundaries.
  - Run `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run test:coverage`.
- [ ] **Task 1.6: Phase 1 Verification, Demo Link & Checkpoint**
  - Commit checkpoint on `feat/camera-choreography`.
  - Present clickable `<LAN_HOST>:5173` links (`/galaxy`, `/system/sol`, `/planet/earth`), **"What to see & try"** walkthrough (Motion Lab curve switcher + short/medium/long journeys, clicking `Centre`, stepping `<LayerCard />`, picking search results, presets, panning away from focus), and HALT for user feedback & curve tuning.

---

## Phase 2: Cross-Scale Choreography (`Galaxy` ↔ `System` ↔ `Planet`)
**Goal:** Eliminate hard scene cuts and `<Suspense>` canvas flashes when moving between `Galaxy`, `System`, and `Planet` (including `<LayerCard />` cross-scale waypoint stepping) via a sequential two-stage handoff on the persistent `RootCanvasHost` canvas.

- [ ] **Task 2.0: Phase 2 Tune / Scope Check**
  - Apply any easing/duration/log-distance tweaks from the Phase 1 demo.
  - Confirm `savedGalaxyCamera` return-glide behaviour (gliding back to saved pose instead of snapping on mount). *(Note: 3D Habitable Zone geometry is out of scope unless explicitly requested, as no 3D HZ primitive exists in `src/components/canvas/`.)*
- [ ] **Task 2.1 (Red/Green/Refactor): Persistent-Stage `<Suspense>` Guard & Sequential Two-Stage Handoff**
  - Prevent `RootLayout` `<Suspense>` from dropping `activeSlotCount` to `0` during lazy route transitions (keep last `stageProps` active while the next route chunk + `preloadSceneEntry` + data shard load) so `RootCanvasHost` never flashes hidden or unmounts WebGL.
  - Implement a sequential two-stage cross-scale transition in `CanvasWebGLHost`: (1) departure glide toward target + fade out outgoing scale instruments while preloading target chunk/data → (2) atomic scene swap with coordinate-origin (`[0,0,0]`) and scale-appropriate FOV rebase (`GALACTIC_FRAME` / `SYSTEM_FRAME.baseFov = 35` / `PLANETARY_FRAME.baseFov = 30`) → (3) fade in incoming scale + arrival settle glide.
  - Support clean interruption and `prefers-reduced-motion` immediate swap.
- [ ] **Task 2.2 (Red/Green/Refactor): Zero-Allocation `instrumentFade` Dissolve & Materialisation**
  - Add an `instrumentFade` scalar to `SpatialFrameState` (`frameRef.current`) consumed directly in `useFrame` by existing cartographic primitives (`DropStalk`, `PlanarGrid`, `RangeRings`, `CoordinateFins`, `BearingVectors`, and `OrbitPath` including a material ref for `periapsisTick`) — zero React prop threading or per-frame allocations.
- [ ] **Task 2.3 (Red/Green/Refactor): Cross-Scale `<LayerCard />` Waypoint Routing**
  - Fix `resolveLayerItemTargetHref` (`src/services/layerCardNavigation.ts`) so stepping waypoints across scales (including from `/planet/...`) routes to the appropriate orbit context instead of pinning to the current path and triggering out-of-scope guards.
- [ ] **Task 2.4: Quality Gate & Standards Cleanup**
  - Run `standards` cleanup; pass `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`.
- [ ] **Task 2.5: Phase 2 Verification, Demo Link & Checkpoint**
  - Commit checkpoint; present clickable `<LAN_HOST>:5173` links + **"What to see & try"** cross-scale walkthrough and HALT for review.

---

## Phase 3: HUD Retraction & Viewport Compensation
**Goal:** Retract floating HUD panels smoothly during camera flight and offset the 3D camera optical centre so the focused target stays centred in the visible (non-occluded) canvas area across desktop, tablet, and mobile `DetentSheet` detents.

- [ ] **Task 3.0: Phase 3 Tune / Scope Check**
  - Confirm retraction feel (slide/fade vs. subtle dim) before wiring CSS/state.
- [ ] **Task 3.1 (Red/Green/Refactor): Scoped HUD Panel Retraction**
  - Drive a CUBE `data-camera-in-flight="true|false"` attribute on `SpatialShell` from `useUIStore.isCameraTransitioning` (never set when `prefersReducedMotion()` is active).
  - Retract `.floatingLeft`, `.minimapRegion`, and mobile `DetentSheet` during flight and snap back on settle via CSS Modules + semantic motion tokens—keeping `.topBar` (breadcrumbs, search, `<LayerCard />`) and `.controlsRegion` anchored so controls never dodge the pointer mid-click.
- [ ] **Task 3.2 (Red/Green/Refactor): Visible Safe-Rect Measurement**
  - Measure individual active HUD panel rects (`.topBar`, `.floatingLeft > *`, open `.bodiesRegion`, `.controlsRegion`, and non-`full` mobile `DetentSheet`) via `ResizeObserver` into a deduplicated safe-rect store slice—explicitly NOT measuring the full-height `.leftColumn` container.
  - Bypass/clamp compensation when mobile `DetentSheet` is in `full` detent (`visibleHeight <= minSafeHeight`).
- [ ] **Task 3.3 (Red/Green/Refactor): Dual-Camera Optical Offset & `ScreenEdgeCue` Alignment**
  - Apply `setViewOffset(w, h, offsetX, offsetY, w, h)` (optical-centre shift only, preserving full frustum height so `BodyMarker` / `CartoLineMaterial` pixel sizing stays exact) inside `CameraRig` to **both** perspective and orthographic cameras on every sync/resize, interpolated with the shared easing curve.
  - Pass the measured safe rect into `calculateScreenEdgeBearing` (`ScreenEdgeCue.tsx`) so edge cues clamp to the visible canvas rather than hiding under HUD panels.
- [ ] **Task 3.4: Quality Gate & Standards Cleanup**
  - Run `standards` cleanup; pass `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run test:coverage`.
- [ ] **Task 3.5: Phase 3 Verification, Multi-Viewport Screenshots, Demo Link & Checkpoint**
  - Commit checkpoint; run `npm run capture:views` across all 5 viewports; present clickable `<LAN_HOST>:5173` links, embedded screenshots, and **"What to see & try"** guide; HALT for review.

---

## Phase 4: Search Framing (`FS-003`)
**Goal:** Auto-frame multi-result search sets at galactic scale and handle the single-result Solar System (*Sol*) exception cleanly without mid-typing whiplash.

- [ ] **Task 4.0: Phase 4 Tune / Scope Check**
  - Confirm framing trigger (explicit Enter/submit vs. settled search intent, avoiding 150ms typing-debounce whiplash) and framing padding.
- [ ] **Task 4.1 (Red/Green/Refactor): Multi-Result Bounding-Sphere Framing Utility**
  - Pure math utility computing target + dolly distance/orthoZoom from the full match set (not `limitPerCategory={3}` truncated groups), respecting Phase 3 safe-rect insets and `useGalacticCeilingDistance` / `maxSafeDistance` bounds.
  - Unit tests covering 2 results, colinear/co-located results, wide-spread results (ceiling clamp), and Sol (`[0,0,0]`) inclusion.
- [ ] **Task 4.2 (Red/Green/Refactor): Search Framing Wiring & Sol Single-Result Exception**
  - Wire search submit/framing in `SearchPanel` / `SearchRoot` so `count > 1` stays at or transitions to galactic scale and glides to frame all matches; `count === 1` auto-enters `/system/sol` only for Solar System (*Sol*) bodies (`entry.h === 1`), while preserving DEC-038 result-link `href`s for explicit item clicks.
- [ ] **Task 4.3: Quality Gate & Standards Cleanup**
  - Run `standards` cleanup; pass `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`.
- [ ] **Task 4.4: Phase 4 Verification, Demo Link & Checkpoint**
  - Commit checkpoint; present clickable `<LAN_HOST>:5173` links + **"What to see & try"** search queries and HALT for review.

---

## Phase 5: Conditional `Centre` CTA (`FS-013`), E2E Coverage & Delivery
**Goal:** Wire the conditional `Centre` CTA against live scene-local camera coordinates, cover all contracts in Playwright, and complete dual review + PR delivery.

- [ ] **Task 5.1 (Red/Green/Refactor): Conditional `Centre` CTA in `DetailsActionControls`**
  - Replace the unconditional `Centre` button and hard-coded `/galaxy?center=…` fallback in `DetailsActionControls.tsx`.
  - Compare live `useCameraStore.target` against the focused entity's **scene-local** position (from `SpatialEntityStore` / active frame units, not galactic `coordinatesPc`) within a frame-appropriate epsilon so `data-testid="details-button-center"` renders only when off-centre, preserving orthogonal query params (`select`, `layer`, `route`) on click.
  - Update `DetailsActionControls` stories/tests and verify `audit:ui` quads.
- [ ] **Task 5.2: End-to-End Playwright Verification**
  - Add Playwright coverage for intra-view and cross-scale glides, `prefers-reduced-motion`, search framing (`FS-003`), and the conditional `Centre` CTA + `DEC-R014a` `center` vs. `focused` contract (`FS-013`).
- [ ] **Task 5.3: End-of-Track Dual Review, Changelog & PR Delivery**
  - Run `standards` cleanup, `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run test:coverage`, and `npm run capture:views`.
  - Run dual `code-review` + `architecture-review` skills and address findings.
  - Update `CHANGELOG.md`, update track status in `metadata.json` / `tracks.md`, push `feat/camera-choreography`, and open PR via `gh pr create`.
