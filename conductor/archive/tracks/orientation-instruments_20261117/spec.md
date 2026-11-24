# Specification: Orientation Instruments

## Overview
Upgrades Starmap's two existing Stage 1 scaffolding orientation stubs — **`<Minimap />`** (`minimap-viewport-slot`) and **`<PreviewPanel />`** (`preview-canvas-slot` inside `<DetailsPanel />`) — into live 3D-projected SVG cartographic instruments, backed by precalculated build-time orientation data.

- **`<Minimap />`** orients the user in 3D space across scales: framed on our current position, it renders a zoomed-in curved annular slice of the sparse Galactic Frame (arcs and converging radials whose origin is the Galactic Core) that rotates and tilts in lockstep with the live 3D camera (`Map Moves`), with a perpendicular north (`+Z`) stalk, inward `CORE` and curved `ORB` vectors, a zoom-coupled local footprint ring, and a minimal zoom scale bar.
- **`<PreviewPanel />`** gives the user a quiet, fixed outer-view preview of the next scale down right inside `<DetailsPanel />`'s `Partial` detent, rendering the focused target's orbital/equatorial plane at its relative tilt against a faint outer reference plane with two light concentric circles and authentic `CelestialSymbol` reticles, clickable to navigate to the same destination as the `Details` button.

## Current State (baseline at 2026-11-24)
- Cross-scale camera glides, HUD retraction, viewport compensation, `TargetReferencePlanePreview`, and `resolveTargetReferencePlane` already shipped in [`camera-choreography`](../../archive/tracks/camera-choreography_20261117/index.md) (PR #128).
- `<Minimap />` (`src/components/domain/Minimap/`) and `<PreviewPanel />` (`src/components/domain/PreviewPanel/`) on `main` are Stage 1 text/table stubs (`<Datum>` / `<DataTable>`) with placeholder slot containers (`minimap-viewport-slot`, `preview-canvas-slot`), and `<PreviewPanel />` is buried at the bottom of `DetailsPanel`'s `Full` detent.
- `useCameraRigStoreSync.ts` does not sync `camera.up` into `useCameraStore` and skips store sync while `isCameraTransitioning` is active.
- `data/seed/solar-system-bodies.json` stores orbital `inclination` rather than planetary axial obliquity (`axialTiltDeg`), and `buildFocusedPreviewSummary` never supplies system-level Galactic inclination, causing every system to fall back to Sol's `60.19°` and planets like Uranus (`97.8°` obliquity) to show their orbital inclination (`0.77°`).

## Scope
### 1. Build-Time Orientation Data & Camera Pose Maths
- **Precalculated planetary obliquity (`axialTiltDeg`):** Add real J2000 axial tilts to `data/seed/solar-system-bodies.json` (Mercury `0.03°`, Venus `177.36°`, Earth `23.44°`, Mars `25.19°`, Jupiter `3.13°`, Saturn `26.73°`, Uranus `97.77°`, Neptune `28.32°`, Pluto `122.53°`, Moon `6.68°`, etc.), emit them through the build-time data pipeline (`scripts/pipeline/`) and compact entity codec (`compactEntityEncoder.ts` / `compactEntityDecoder.ts`), and expose them on `SolarSystemBodyRecord` / `FocusedPlanetTelemetry` / `FocusedPreviewSummary`.
- **Honest system-plane Galactic inclination:** Precalculate known Galactic-to-system plane inclinations in the data pipeline (Sol `60.19°` J2000 Ecliptic-to-Galactic tilt; any other system with a constrained 3D Galactic plane where available). Systems whose 3D Galactic orientation is astronomically unmeasured carry no fabricated inclination and render neutral (`0°`) in `<PreviewPanel />` rather than silently inheriting Sol's `60.19°`. Zero hardcoded entity IDs or names in `src/`.
- **Pure 3D-to-2D projection & camera pose sync:**
  - Pure, unit-tested `src/utils/orientationProjectionMath.ts` (orthonormal camera basis with pole-singularity stability, orthographic 3D→2D projection, projected rings, orbital point projection).
  - Update `useCameraRigStoreSync.ts` to sync `camera.up` and publish pose updates during active camera transitions so `<Minimap />` tracks live glides smoothly.
  - `src/hooks/useLiveCameraPose.ts` subscribing to `useCameraStore` via `requestAnimationFrame` coalescing (zero React re-render storms per frame).

### 2. `<Minimap />` Orientation Instrument (`Map Moves`)
- Replace the Stage 1 `<Datum>` / `<DataTable>` text stub inside `minimap-viewport-slot` with a minimal, borderless 3D-projected SVG instrument mounted in `SpatialShell`'s `minimap` slot (with clearance above `<ControlBar />` in `SpatialShell.module.css`).
- **`Map Moves` camera-locked Galactic Frame arc:**
  - Framed on our current position `(0, 0, 0)`, rendering a zoomed-in curved annular polar slice of the sparse Galactic Frame whose arcs and converging radials have their origin at the Galactic Core (`+X`).
  - Rotates and tilts in 3D lockstep with the live camera (`liveBasis`); when in `system` or `planet` scope, tilts the Galactic Plane by the cumulative frame inclination (`-60.19°` / `-83.63°`) so Galactic orientation stays accurate across scales.
  - **Perpendicular North (`+Z`) stalk:** Rises perpendicular from the Galactic Plane at our position (labelled `N`) so above-plane vs below-plane attitude is immediately obvious.
  - **Landmarks & zoom:** Inward `CORE` bearing arrow, curved clockwise `ORB` rotation arrow along the Solar Circle arc, a zoom-coupled local footprint ring around our position, and a single slim logarithmic zoom scale bar with focal distance (`pc` / `AU` / `km`).
- **Minimal chrome:** No extra inner SVG border, no mode switcher, no duplicate anchor/scope header row, and no `HDG`/`ELV` text clutter.
- **E2E contract preservation:** Retain visually-hidden `.srOnlyMarkers` (`clip-path: inset(50%)`, zero outer margin) so existing `e2e/url-contracts.spec.ts` assertions on `[data-testid="minimap-marker-role"]` continue to pass.

### 3. `<PreviewPanel />` Next-Scale-Down Orientation Preview
- **Placement:** Move `<PreviewPanel />` out of `<DetailsPanel />`'s `Full` detent into **`Partial` detent** immediately below `<DetailsActionControls />` (`Details` / `Directions` / `Centre`), dropping its duplicate Stage 1 `Body | a | e | i` `<DataTable>`.
- **Fixed outer-view projection:** Does **not** rotate with the live camera; uses a fixed outer isometric camera basis looking largely along the line of nodes so the relative tilt between the faint horizontal outer reference plane and the tilted target orbital/equatorial plane is always clear.
- **Visual design:**
  - Faint dashed horizontal outer reference ring.
  - Tilted target orbital/equatorial plane with **two uniform, light concentric reference circles** (zero real eccentric orbit ellipses, zero 50%-bright front/back split, zero tilt fin/wedge, zero bisecting node line).
  - **Authentic `CelestialSymbol` reticles:** Render primary and orbiting child bodies (`terrestrial`, `super-earth`, `gas-giant`, `ice-giant`, `dwarf-planet`, `moon`, `spacecraft`, `star`, etc.) via `renderGlyphContent` with `CELESTIAL_SYMBOL_META` taxonomy/habitable-zone colouring and hover `<title>` labels. Carry `symbolType` on `PreviewOrbitElement` from `detailsPreview.ts`.
- **Minimal chrome & navigation:** No nested card border/padding box, no duplicate header row, no inner SVG border, and no caption strip. When `detailsHref` (`details.systemDetailsHref`) is present, clicking the preview navigates via SPA link (`useSpaLinkClick`) to the same destination as the `Details` button with accessible focus ring and `aria-label`.

## Out of Scope
- Cross-scale camera glides, HUD retraction, viewport compensation, and `TargetReferencePlanePreview` (already shipped in `camera-choreography`).
- *Zoom Ceiling & Boundary Clamp HUD Indicator* — remains untouched as a separate item in [`conductor/backlog.md`](../../backlog.md).
- Keyboard and navigation-mode behaviour ([`interaction-controls`](../interaction-controls_20261010/spec.md)).
- Extra WebGL contexts or scissor-clipped secondary canvases (3D-projected SVG is ratified for both instruments).

## Acceptance Criteria
- [ ] Solar System planetary `axialTiltDeg` and known system Galactic plane inclinations are precalculated in the build-time data pipeline (zero hardcoded entity IDs or names in `src/`), and unmeasured exoplanet systems render neutral (`0°`) rather than inheriting Sol's `60.19°`.
- [ ] `<Minimap />` renders the zoomed-in curved Galactic Frame polar arc in `Map Moves` mode with `CORE`, `ORB`, perpendicular north (`+Z` / `N`) stalk, zoom-coupled local ring, and slim zoom scale bar; responds smoothly to live camera orbit, pitch, zoom, and glides, holds at pole singularities, and respects minimal borderless chrome.
- [ ] `<PreviewPanel />` renders in `<DetailsPanel />`'s `Partial` detent directly below `<DetailsActionControls />` from a fixed outer isometric viewpoint, with two light concentric circles on the tilted plane, `CelestialSymbol` reticles for primary and orbiting bodies, zero tilt fin or nested border chrome, and clicking it navigates identically to the `Details` button.
- [ ] All pure maths, pipeline encoders/decoders, hooks, and components have full colocated unit tests, Storybook stories, and 5-viewport Playwright visual verification.
- [ ] `npm run lint`, `npm run typecheck`, `npm run audit:ui`, `npm run audit:guards`, `npm run audit:r3f`, `npm run test:coverage`, and relevant E2E specs pass cleanly.
