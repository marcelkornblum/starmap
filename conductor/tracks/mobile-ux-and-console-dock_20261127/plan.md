# Implementation Plan: Mobile UX, Fluid Details & Console Dock

## Phase 1: Theme-Color Meta, Coarse-Pointer Hit Targets & Tablet Overflow Fix
- [x] **Task 1.1: Browser `theme-color` Meta & Theme Sync** — Added `<meta name="theme-color">` in `index.html` and live theme sync in `paletteTheme.ts` + `useThemeTokenSync.ts`.
- [x] **Task 1.2: Coarse-Pointer Control & Inline Link Hit Areas** — Added coarse-pointer `44px` touch floor, `16px` input/select sizing, and inline link hit-slop across Tier 1 controls and data atoms.
- [x] **Task 1.3: Tablet Overflow Containment, Wrapping `<Datum>` & Full-Row `BodiesPanel` Links** — Decoupled non-numeric `<Datum>` values from `nowrap`, contained `.floatingLeft`/`DetentSheet` horizontal overflow, and wired stretched-link rows in `BodiesPanel`.
- [x] **Task 1.4: Phase 1 Checkpoint** — Verified `standards`, `lint`, `typecheck`, `audit:guards`, `audit:ui`, and `test:coverage`.

## Phase 2: 3D Canvas Touch Picking & Empty-Canvas Tap Ergonomics
- [x] **Task 2.1: Screen-Space Hit Floor, Cluster Fan-Out & Planet Disc Picking** — Added `44px` touch / `28px` mouse hit diameter floors, primary-anchor-preserving cluster fan-out radii, `14px` touch tap-slop, and `minWorldHitRadius` planet disc picking.
- [x] **Task 2.2: Two-Step Touch Empty-Canvas Dismissal** — Wired `onTouchPointerMissed` (`spatialTouchMiss.ts` -> `CanvasLayer` -> `useViewportPointerHandlers`) so touch empty-canvas taps step `partial`/`full` down to `peek` before clearing focus.
- [x] **Task 2.3: Phase 2 Checkpoint** — Verified `standards`, `lint`, `typecheck`, `audit:guards`, `audit:r3f`, and `test:coverage`.

## Phase 3: Fluid Variable-Detent `DetailsPanel` (`Peek` ↔ `Partial` ↔ `Full`)
- [x] **Task 3.1: Intrinsic `ResizeObserver` Detent Math & Progress Interpolation** — Implemented measured `H_peek` / `H_partial` (`<= 68dvh`), `--detent-expand-progress` (`0..1`), spatial rest transitions, and keyboard/pointer `Peek ↔ Partial` handle controls in `detentSheetMath.ts` & `DetentSheet.tsx`.
- [x] **Task 3.2: Anchored-CTA `DetailsPanel` Slot Choreography** — Encapsulated `DetentSheetMidStage` (`peekMidStage` + `peekActions`) above `<DetailsActionControls />` with zero PoC detent buttons.
- [x] **Task 3.3: Phase 3 Checkpoint** — Verified `standards`, `lint`, `typecheck`, `audit:guards`, `audit:ui`, and `test:coverage`.

## Phase 4: Console `<Dock>`, `DiscoverPanel`, Predictable `Bodies` Drawer & Bilateral Visor
- [x] **Task 4.1: `ControlBar` Unmount & Predictable `Bodies` Drawer** — Unmounted `<ControlBar />` from spatial views while preserving spatial keyboard shortcuts (`/`, `Escape`, `R`) in `SpatialShell`; repaired Tier 2 `Drawer`; upgraded `< 1280px` `Bodies` to a headered right slide-over drawer (`44×44` close button, scrim/Escape/swipe close, auto-close on selection) and aligned `DESKTOP_DOCK_BREAKPOINT_PX` (`1280`).
- [x] **Task 4.2: `DiscoverPanel` Component Quad** — Built `DiscoverPanel` component quad (`DiscoverPanel.tsx`, `.module.css`, `.stories.tsx`, `.test.tsx`) over `useLayerIndex()` grouped into *Scientific Highlights* and *Fictional Universes*.
- [x] **Task 4.3: `ConsoleDock`, Persistent Shell & Bilateral Stage Visor** — Built `ConsoleDock` and `VisorScalePill` quads; removed `.modeMenu` from `<Breadcrumbs>`; wrapped `/guide/*` and `/search` in persistent `SpatialShell` (`mode="document"`); wired bilateral visor layout across breakpoints.
- [x] **Task 4.4: Phase 4 Checkpoint** — Verified `standards`, `lint`, `typecheck`, `audit:guards`, `audit:ui`, `audit:r3f`, and `test:coverage`.

## Phase 5: Multi-Viewport Visual Review, Documentation, Dual Reviews & PR Delivery
- [x] **Task 5.1: Documentation & Changelog** — Updated `docs/design/design-system.md` and `CHANGELOG.md`.
- [x] **Task 5.2: Multi-Viewport Capture & Dual Reviews** — Captured 5-viewport Playwright renders across `/galaxy?focus=sol`, `/system/sol?focus=earth`, `/planet/earth`, and `/guide/star-types`; completed `code-review` and `architecture-review` and verified Playwright E2E suites.

## Phase 6: Review Fixes (`code-review`, `architecture-review` & Visual Check)
- [x] **Task 6.1: `DetentSheet` & `DetailsPanel` Seam, Desktop Overflow-Clip & Pointer/Keyboard Fixes** — Replaced `.detentSection` `overflow-x: hidden` with `overflow-x: clip; flex-shrink: 0`, encapsulated `DetentSheetMidStage` in Tier 2 `DetentSheet` (zero `:global(...)`), removed duplicate touch handlers, added keyboard handle controls & `lastDragEndAtRef` timestamp guard, eliminated `[peek]` `ResizeObserver` render churn, and cleaned dead props/vars.
- [x] **Task 6.2: Shell, Dock, Visor, Views & 3D Canvas Decoupling Fixes** — Replaced `--size-console-dock-*` with `--size-dock-shelf-mobile` / `--size-dock-rail`; decoupled `useViewportPointerHandlers` from `useUIStore` via `onTouchPointerMissed`; eliminated `matchMedia` inside `useFrame` with a shared coarse-pointer subscriber; preserved primary star/planet anchor hit circles at `(0, 0)` during close-in satellite fan-out; restored spatial keyboard shortcuts in `SpatialShell`; fixed `isDiscoverOpen` clear on `Map`/`Guide` click, `extractUrlLayerId` highlight, `lastMapHref` priority on Guide detail views, `VisorScalePill` `setRadialView()` + shared `utils/orientationProjectionMath` helpers, `SpatialShell` deduplication/a11y, and `resolveAppHref` on Guide list cards.
