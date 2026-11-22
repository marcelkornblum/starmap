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
- **Single Easing Source (`DEC-R012`-compliant):** Pure easing math and curve registry live in `src/utils/cameraEasing.ts` (importable by both `src/stores/` and `src/components/canvas/`), defaulting to quadratic (`easeInOutQuad`).
- **Temporary Live Experimentation (Never Committed):** Any temporary curve/duration/journey demo UI or runtime tuning knobs used during live Phase 1 review stay strictly uncommitted in the working tree and are removed cleanly before committing the phase checkpoint so production code and stores remain spotless.
- **Single Camera Engine:** One unified transition controller interpolates `(target, sphericalDir, distance/orthoZoom, up, fov)` along the shared easing curve, gating `OrbitControls` updates and store/URL sync while in flight (eliminating double `controls.update()`, damping battles, and 60fps store writes).
- **`frameloop="demand"` & Frame-0 Safety:** Transitions anchor `startTime` on the **first `useFrame` tick** (`pendingStart` flag) so shader-compile or scene-mount stalls never cause frame-0 jumps, and call `invalidate()` strictly while active.
- **Reduced Motion:** `prefersReducedMotion()` (`src/utils/reducedMotion.ts`) and `useReducedMotion()` (`src/hooks/useReducedMotion.ts`) short-circuit all camera glides and HUD retractions to immediate settle (never pulsing `isCameraTransitioning`).
- **Router SSOT (`DEC-R014`) & File Size (`max-lines: 300`):** All URL camera state flows through typed TanStack Router navigation (no `window.location.search` / `replaceSpaHistoryUrl` leaks); near-300-line files (`GalacticCameraController`, `useGalaxyViewModel`, `useSystemViewModel`, `useCameraTransition`) are decomposed cleanly as touched.

---

## Phase 1: Unified Single-Curve Camera Engine, Intra-View Glides & `center`/`focused` Foundation
**Goal:** Collapse split/snapping camera controllers into one unified single-curve glide engine across Galaxy, System, and Planet views, establish clean `center` vs. `focused` independence early (avoiding rework in Phases 2–5), and deliver an immediate live demo to feel and tune the quadratic curve.

- [x] **Task 1.1 (Red/Green/Refactor): Shared Easing Module & Reduced-Motion Helper** *(shipped `cameraEasing.ts`, `reducedMotion.ts`, `useReducedMotion.ts` + 12 unit tests)*
  - Create `src/utils/cameraEasing.ts` (`easeInOutQuad` default, pure easing & distance interpolation helpers) and `src/utils/reducedMotion.ts` + `src/hooks/useReducedMotion.ts`.
  - Keep `useCameraStore.ts` free of temporary tuning knobs.
  - Unit tests covering curve endpoints, monotonicity, and reduced-motion short-circuit.
- [x] **Task 1.2 (Red/Green/Refactor): Unified Camera Transition Engine** *(shipped `cameraTransitionEngine.ts`, `cameraTransitionPoseMath.ts`, `useCameraTransition.ts`, `cameraRigControls.ts`, `useCameraRigStoreSync.ts`, `DropStalk.tsx`, `useViewportPointerHandlers.ts` + 68 tests green)*
  - Unify `CameraTransitionController`, `CardinalTransitionController`, and perspective/orthographic camera presets (`reset`, `radial`, `top-down`, `orbital-lock`, cardinal axes) onto a single controller interpolating `(target, sphericalDir, distance/orthoZoom, up, fov)` via `src/utils/cameraEasing.ts`.
  - Anchor `startTime` on the first `useFrame` tick (`pendingStart`); clamp idle `delta` in `DropStalk.tsx` as well; gate `OrbitControls` updates and suppress 60fps store/URL sync while `isCameraTransitioning` is true (syncing once on settle).
  - Ensure OrbitControls user `'start'` interrupts any active glide cleanly and clears damping momentum; deduplicate double-click callbacks in `useViewportPointerHandlers.ts`.
- [x] **Task 1.3 (Red/Green/Refactor): Replace Synchronous Snaps & Establish `center` vs. `focused` Semantics** *(shipped smooth glides in `GalacticCameraController` & `SystemCameraController`, unified System/Planet controllers, `useColdLoadCenterId`, router SSOT cleanup + 130 tests green)*
  - Replace synchronous snaps in `GalacticCameraController` and `SystemCameraController` with unified glides (keeping cold-load initial placement instant so initial load does not swoop from `[0,0,0]`).
  - Resolve the dual-controller overlap in `SystemSceneEntry` (`SystemCameraController` + `SystemScene -> GalacticCameraController`), wire `centerId` into `PlanetarySceneContent`, and ensure `SystemCameraController` keeps `useCameraStore.target` in sync on settle.
  - Separate `center` from `focused` cleanly: cold-loading a focused view centres on that target; subsequent panning mutates `center` without altering `focused`; applying `?focus=` does not force-re-centre.
  - Remove remaining `window.location.search` / `replaceSpaHistoryUrl` camera-URL leaks (`GalacticCameraController`, `useGalaxyViewModel`, `useKeyboardShortcuts`, `spaNavigation`, `SearchPanel`) in favour of typed TanStack Router navigation (`DEC-R014`).
- [x] **Task 1.4: Temporary Uncommitted Demo Lab (Removed Before Commit)** *(ratified `easeOutCubic` + dynamic distance duration `computeCameraTransitionDuration`, fixed Search result jump/focus bug, and removed Motion Lab completely)*
- [x] **Task 1.5: Quality Gate & Standards Cleanup** *(lint 0, typecheck, audit:guards, audit:ui, audit:r3f, 344 test files green)*
  - Run `standards` cleanup; verify `max-lines: 300` and `DEC-R012` boundaries.
  - Run `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run test:coverage`.
- [x] **Task 1.6: Phase 1 Verification, Demo Link & Checkpoint** *(live review + `/standards`, `/code-review`, `/architecture-review` completed)*

### Phase 1.5: Review Remediation (All Critical, High, Medium & Low Findings)
- [x] **Task 1.5A (Red/Green/Refactor): Unified Single Context Camera Engine & `OrbitControls` Handshake** *(shipped `CameraTransitionProvider`, deleted `CardinalTransitionController` + `poseControllerRef`, fixed pre-flight inertia drain & post-flight settle order, pruned shims/unused curves + 94 tests green)*
  - Collapse all 4 camera controllers (`CameraTransitionController`, `CardinalTransitionController`, `poseControllerRef`, module singletons) into one R3F-context-provided `CameraTransitionProvider` at `FRAME_PRIORITY.cameraTransition = -2`.
  - Fix frame-0 `OrbitControls` inertia jolt & post-glide damping leak (drain deltas before start, call `controls.update()` *before* restoring `enableDamping = true` on settle, call `controls.update()` on reduced-motion snap).
  - Prune dead shims/curves (`easeInOutCubic` re-export, unused curves, `legacyControls` overloads) and fix ortho-unlock + reduced-motion `reset` target restore.
- [x] **Task 1.5B (Red/Green/Refactor): Scene Controllers, FOV/Distance Alignment, Double-Click & `DropStalk` Fixes** *(shipped `SYSTEM_FRAME`/`PLANETARY_FRAME` FOV + `maxDistance=150`, `SystemCameraController` `false->true` guard, `GalacticCameraController` `isTransientZero` + mid-flight unmount guard, planetary single-pass entities, double-click click-#2 fix, `DropStalk` `+0.002`/coplanar fixes + 59 tests green)*
  - Align `SystemSceneEntry` `maxDistance = 150` and apply `SYSTEM_FRAME.baseFov (35°)` / `PLANETARY_FRAME.baseFov (30°)` + `zoom = 1` on scene entry.
  - Fix `SystemCameraController` `false -> true` `hasExplicitCenter`, `GalacticCameraController` `isTransientZero` + unmount mid-flight save, planetary double target resolution, double-click click-#2 unfocus race, and `DropStalk` `+0.002` offset / coplanar invalidation.
- [x] **Task 1.5C (Red/Green/Refactor): Search, `spaNavigation`, Router SSOT & ViewModel Fixes** *(shipped modified-click guard, slugified search focus, intra-system search recenter, deferred `spaNavigation` recenter, `useSystemOutOfScopeGuard` disks/satellites/coords, `useColdLoadCenter` latch + 131 tests green)*
  - Fix `SearchResultItem` modified-click mutation, raw slug, stale `pendingCenterSlug`, and intra-system search centring; fix `spaNavigation` empty `?center=` & deferred `triggerRecenter()`; fix `useSystemOutOfScopeGuard`, `buildCenterEntityHref`, `useColdLoadCenter`, `useKeyboardShortcuts`, `SearchPanel`, and missing unit tests.
- [x] **Task 1.5D: Quality Gate, Frame-Time Baseline & Checkpoint** *(all 6 QA gates + 346 test files + `e2e/frame-time-baseline.spec.ts` pass)*
  - Pass `lint`, `typecheck`, `audit:guards`, `audit:ui`, `audit:r3f`, `test:coverage`, and `e2e/frame-time-baseline.spec.ts`; commit checkpoint before starting Phase 2.

---

## Phase 2: Cross-Scale Choreography (`Galaxy` ↔ `System` ↔ `Planet`)
**Goal:** Eliminate hard scene cuts and `<Suspense>` canvas flashes when moving between `Galaxy`, `System`, and `Planet` (including `<LayerCard />` cross-scale waypoint stepping) via a sequential two-stage handoff on the persistent `RootCanvasHost` canvas, making the **difference in orbital planes** between reference frames visually unmistakable.

**Ratified Phase 2 Choreography Shape (Tunable):**
- **Duration:** ~`1.5×` intra-view duration (~`1.5–2.0s` total).
- **Plane-tilt orientation (0% → 50%):** During the first half of the transition, rotate/tilt the camera orientation from the **source reference frame** (its z-axis footprint / orbital plane) to the **target reference frame** (e.g., Galactic plane ↔ Sol Ecliptic ~60.2°, Ecliptic ↔ planetary axial tilt) so the orbital-plane difference is unmistakably visible.
- **Translation onset (~20%):** Start the actual camera move toward the target after ~`20%` of the transition duration, easing cleanly along the single shared `easeOutCubic` curve.

- [x] **Task 2.0: Phase 2 Tune / Scope Check** *(ratified: `1.5×` duration ~`1.5–2.0s`, `0%→50%` source-to-target orbital-plane orientation tilt, `~20%` translation onset along `easeOutCubic`; 3D HZ out of scope)*
- [x] **Task 2.1 (Red/Green/Refactor): Persistent-Stage `<Suspense>` Guard & Sequential Two-Stage Handoff**
  - Prevent `RootLayout` `<Suspense>` from dropping `activeSlotCount` to `0` during lazy route transitions (keep last `stageProps` active while the next route chunk + `preloadSceneEntry` + data shard load) so `RootCanvasHost` never flashes hidden or unmounts WebGL.
  - Implement a sequential two-stage cross-scale transition in `CanvasWebGLHost`: (1) departure glide toward target + fade out outgoing scale instruments while preloading target chunk/data → (2) atomic scene swap with coordinate-origin (`[0,0,0]`) and scale-appropriate FOV rebase (`GALACTIC_FRAME` / `SYSTEM_FRAME.baseFov = 35` / `PLANETARY_FRAME.baseFov = 30`) → (3) fade in incoming scale + arrival settle glide.
  - Support clean interruption and `prefers-reduced-motion` immediate swap.
- [x] **Task 2.2 (Red/Green/Refactor): Zero-Allocation `instrumentFade` Dissolve & Materialisation**
  - Add an `instrumentFade` scalar to `SpatialFrameState` (`frameRef.current`) consumed directly in `useFrame` by existing cartographic primitives (`DropStalk`, `PlanarGrid`, `RangeRings`, `CoordinateFins`, `BearingVectors`, and `OrbitPath` including a material ref for `periapsisTick`) — zero React prop threading or per-frame allocations.
- [x] **Task 2.3 (Red/Green/Refactor): Cross-Scale `<LayerCard />` Waypoint Routing**
  - Fix `resolveLayerItemTargetHref` (`src/services/layerCardNavigation.ts`) so stepping waypoints across scales (including from `/planet/...`) routes to the appropriate orbit context instead of pinning to the current path and triggering out-of-scope guards.
- [x] **Task 2.4: Quality Gate & Standards Cleanup**
  - Run `standards` cleanup; pass `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`.
- [x] **Task 2.5: Phase 2 Verification, Demo Link & Checkpoint**
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
