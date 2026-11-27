# Specification: Mobile UX, Fluid Details & Console Dock

## Overview
Delivers touch-ready UI and 3D canvas hit targets, browser `<meta name="theme-color">` chrome tinting, a fluid variable-detent `DetailsPanel` with anchored CTAs and tablet inline-overflow containment, a predictable `Bodies` slide-over drawer, and a persistent Console `<Dock>` (`Map · Discover · Guide`) paired with a bilateral stage visor across phone, tablet, and desktop viewports.

Graduates two items from [`conductor/backlog.md`](../../backlog.md): *Guide/Search views inside `SpatialShell`* and *Primary Mode Switcher on `<Dock>`*.

## Scope

1. **Browser Chrome Tinting (`theme-color`) & Touch-Ready UI Hit Areas**
   - Declare `<meta name="theme-color">` in [`index.html`](../../../index.html) matching the Prodigy dark chassis/canvas hex baseline (with `media="(prefers-color-scheme: dark)"` / `light` defaults) and keep it synchronised at runtime with the active `UITheme` (`dark`, `light`, `amoled`) in [`src/styles/tokens/paletteTheme.ts`](../../../src/styles/tokens/paletteTheme.ts) so Android Chrome and mobile browser bars match the app frame.
   - Add coarse-pointer tokens in [`src/styles/tokens/literal.css`](../../../src/styles/tokens/literal.css) and [`src/styles/tokens/semantic.css`](../../../src/styles/tokens/semantic.css) (`--size-touch-target-min: 44px`, `--text-ui-input-coarse-size: 16px`, inline hit-slop offsets).
   - Under `@media (pointer: coarse)`, enforce `>= 44px` block-size targets across `Button`, `Input`, `Select`, `Toggle`, `Slider`, drawer close controls, `SearchResultItem`, and `BodiesPanel` rows; enforce `>= 16px` font-size on `Input` and `Select` to prevent mobile browser auto-zoom; add pseudo-element hit-slop on linked `Badge`, `Unit`, `CelestialSymbol`, and `Breadcrumbs` items while preserving compact fine-pointer desktop metrics.
   - Make `BodiesPanel` rows (`BodiesGalaxySystemRow`, `BodiesPrimaryRow`, `BodiesMinorBodyRow`) full-row clickable links rather than restricting the anchor to inline title text.

2. **3D Canvas Touch Picking & Empty-Canvas Dismissal**
   - Enforce minimum screen-space hit diameters in [`BodyMarker.tsx`](../../../src/components/canvas/BodyMarker.tsx) and [`engineConfig.ts`](../../../src/components/canvas/scene/engineConfig.ts): `44px` (`22px` radius) on `touch` / coarse pointers and `28px` (`14px` radius) on `mouse` / fine pointers across both portrait and landscape aspect ratios.
   - Pass the floored hit radius into `computeHitAreaCluster` ([`occlusionClusterSolver.ts`](../../../src/components/canvas/scene/occlusionClusterSolver.ts)) so clustered stars and moons fan out their invisible hit circles without overlap.
   - Use `14px` pointer drag-jitter tap tolerance on `touch` (`8px` on `mouse`) and ensure the central body in `PlanetView` is pickable across its projected screen disc.
   - On `touch` empty-canvas taps (`onPointerMissed` in [`useViewportPointerHandlers.ts`](../../../src/components/domain/CanvasLayer/useViewportPointerHandlers.ts)), step `detailsDetent` from `'partial'` or `'full'` down to `'peek'` first; clear focus only when already at `'peek'` or `'collapsed'`.

3. **Fluid Variable-Detent `DetailsPanel` & Tablet Overflow Fix**
   - Measure intrinsic `Peek` (`H_peek`) and variable `Partial` (`H_partial`, clamped to `<= 68dvh`) heights via `ResizeObserver` in [`DetentSheet.tsx`](../../../src/components/interface/surfaces/DetentSheet/DetentSheet.tsx) and [`detentSheetMath.ts`](../../../src/components/interface/surfaces/DetentSheet/detentSheetMath.ts), keeping `DirectionsPanel` slot-compatible.
   - Structure mobile `DetailsPanel` overview slots so:
     - **`Peek`** shows the drag handle, identity title/badges row, and CTA row (`Details`, conditional `Centre`, `Directions`).
     - **`Partial`** keeps the CTA row anchored at the same bottom Y coordinate while revealing Prose + `<PreviewPanel />` fluidly above the CTAs via `--detent-expand-progress` (`0..1`) during drag and `--motion-duration-spatial` on snap (`0ms` under `prefers-reduced-motion: reduce`).
     - **`Full`** fills the stage height above `<Dock>` and scrolls lower telemetry naturally below the overview + CTA frame.
     - Tapping the handle toggles `Peek ↔ Partial`; dragging reaches `Peek`, `Partial`, and `Full`.
   - Enforce inline overflow containment (`overflow-x: hidden`, `overscroll-behavior-x: none`, `min-inline-size: 0`) on `SpatialShell` `.floatingLeft` and `DetentSheet`, and allow `<Datum>` to wrap non-numeric `ReactNode` values (`Badge` lists, `PlanetCensus`, long status strings) instead of forcing `<Quantity>` `white-space: nowrap`.

4. **`ControlBar` Unmount, Predictable `Bodies` Drawer, Console `<Dock>` & Bilateral Visor**
   - Unmount `<ControlBar />` from `GalaxyView`, `SystemView`, and `PlanetView` across all viewports (keeping `src/components/domain/ControlBar/` and `useSettingsStore` intact for [`interaction-controls_20261010`](../interaction-controls_20261010/spec.md)).
   - Fix class bindings in Tier 2 [`Drawer.tsx`](../../../src/components/interface/surfaces/Drawer/Drawer.tsx) and present `< 1280px` `Bodies` as a right slide-over drawer with an internal sticky header, item count, `44×44` close button, scrim/Escape dismissal, auto-close on body selection, and a unified `1280px` safe-rect breakpoint in [`useViewportSafeRectObserver.ts`](../../../src/components/domain/SpatialShell/useViewportSafeRectObserver.ts).
   - Build `DiscoverPanel` (`src/components/domain/DiscoverPanel/` component quad) over `useLayerIndex()` grouped into *Scientific Highlights* (`scientific-overlay`) and *Fictional Universes* (`fictional-canon`) with text filter, activating `?select=layer:<slug>&layer=<slug>` to open `<LayerCard />`.
   - Build `ConsoleDock` (`src/components/domain/ConsoleDock/` component quad) composing Tier 2 `<Dock>` with `Map`, `Discover`, and `Guide` (coplanar bottom bar on `< 768px`, coplanar `64px` left rail on `>= 768px`). Strip `.modeMenu` from `<Breadcrumbs>`, host `/guide/*` and `/search` inside the persistent `<Dock>` shell, and preserve the last map URL across `Map ↔ Guide` transitions.
   - Arrange the stage visor bilaterally:
     - `< 768px`: Row 1 pairs `<Breadcrumbs />` + compact focal-scale & reset-view pill (`Minimap` distance/unit helpers + `resetView()`); Row 2 pairs on-map `<Search />` + `Bodies` trigger.
     - `768–1279px`: Left column aligns `<Breadcrumbs />` above `DetailsPanel` / `DirectionsPanel` / `DiscoverPanel` / `LayerCard`; top-right pairs `<Search />` + `Bodies` trigger; bottom-right renders `<Minimap />`.
     - `>= 1280px`: Left column aligns `<Breadcrumbs />` above the active left panel; right column aligns `<Search />` directly above docked `<BodiesPanel />`; bottom-right renders `<Minimap />`.

## Out of Scope
- Multi-leg Journey Planner (`FS-014`), User-Authored Layers (`FS-002`), and Ephemeris Time Scrubber wiring (`FS-017`).
- Deleting `src/components/domain/ControlBar/` or `useSettingsStore` fields consumed by `interaction-controls_20261010`.

## Acceptance Criteria
- [ ] `<meta name="theme-color">` is present in `index.html` and updates dynamically when `UITheme` (`dark`, `light`, `amoled`) changes.
- [ ] Under `@media (pointer: coarse)`, `Button`, `Input`, `Select`, `Toggle`, `Slider`, drawer close buttons, `SearchResultItem`, and full-row `BodiesPanel` links meet `>= 44px` block-size; `Input` and `Select` use `>= 16px` font-size; inline links expose expanded hit-slop without changing fine-pointer desktop geometry.
- [ ] `BodyMarker` enforces `>= 44px` touch and `>= 28px` mouse screen-space hit diameters, feeds floored radii into `computeHitAreaCluster`, uses `14px` touch tap-slop, picks the central planet across its disc in `PlanetView`, and steps `DetailsPanel` from `partial`/`full` to `peek` on first touch empty-canvas tap before clearing focus on a second tap.
- [ ] Mobile `DetailsPanel` shows drag handle + title row + CTAs at `Peek`, expands to measured `Partial` (`<= 68dvh`) revealing Prose + `<PreviewPanel />` fluidly above the stationary CTA row via `--detent-expand-progress`, scrolls lower telemetry naturally in `Full`, toggles `Peek ↔ Partial` on handle tap, and has zero header detent-pill buttons.
- [ ] Tablet viewports (`768×1024`, `1024×768`) exhibit zero horizontal overflow on `.floatingLeft` and `.detentSheet`, with wrapping `<Datum>` support for non-numeric values.
- [ ] `<ControlBar />` is unmounted from spatial views; `< 1280px` `Bodies` uses a headered right drawer with `44×44` close button, scrim/Escape dismissal, auto-close on selection, and `1280px` safe-rect alignment.
- [ ] `ConsoleDock` (`Map · Discover · Guide`) persists across map, `/guide/*`, and `/search` routes (bottom bar `< 768px`, `64px` left rail `>= 768px`) preserving return map URLs; `.modeMenu` is removed from `<Breadcrumbs>`; `DiscoverPanel` filters and launches `useLayerIndex()` entries; bilateral visor layout holds across all 5 standard viewports.
- [ ] All component quads, `<= 300`-line limits, `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:budgets`, `npm run test:coverage`, and `npm run build` pass cleanly.
