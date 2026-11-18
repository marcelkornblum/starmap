# Specification: Orientation Instruments

## Overview
Delivers the instruments that tell the user which way they are facing and how the active reference planes relate: a compass / attitude widget showing the camera's heading, pitch and roll against galactic axes, and datum-plane tilt indicators that visualise the angular offset between the Galactic, System (Invariable / Ecliptic) and Planetary (Equatorial) reference frames. Consolidates the unstarted orientation work from the former "Minimap & Scene Transitions" plan (removed unstarted) and the unshipped Phase 3 items of the archived `3d-engine-implementation` track.

> [!NOTE]
> Not to be confused with the shipped `<Minimap>` (`src/components/domain/Minimap/Minimap.tsx`): that is the DEC-017 *data* panel (anchor, coordinates, markers) and carries no camera attitude, heading or cardinal axes. Camera glides and HUD retraction belong to [`camera-choreography`](../camera-choreography_20261117/spec.md).

## Current State (baseline at 2026-11-17)
- No compass or attitude indicator exists; nothing under `src/components/canvas/` renders camera heading, pitch/roll or cardinal axes.
- No inter-plane tilt indicators exist; reference frames are defined in `src/components/canvas/instrument/` (`referenceFrame`) and `src/config/referenceFrames.ts` (`GALACTIC_FRAME`, `SYSTEM_FRAME`, `PLANETARY_FRAME`), with obliquity maths present in `src/utils/astroCoordinates.ts` but not visualised.
- HUD placement is owned by `SpatialShell` (`minimap` and `controls` slots); the persistent canvas is `RootCanvasHost`.

## Scope
1. **Compass / Attitude Widget** (carried over from the `3d-engine-implementation` galactic orientation compass and the former minimap Phase 1):
   - Fixed HUD instrument displaying the camera's heading, pitch and roll relative to the active reference plane, with cardinal axis indicators ($X, Y, Z$) and Galactic North / Core pointers.
   - Real-time response to camera rotation without layout thrash; tokenised styling; attitude maths in a pure, unit-tested module.
   - Mounted through the `SpatialShell` slot system; screen-space data follows the existing projection-bridge conventions.
2. **Datum-Plane Tilt Indicators** (carried over from the `3d-engine-implementation` multi-scale datum transitions and the former minimap Phase 2):
   - Visualise the active reference plane: Galactic Equator / Midplane ($Z=0$ in `GALACTIC_FRAME`), System Invariable / Ecliptic Plane (`SYSTEM_FRAME`), Planetary Equator & Obliquity Plane (`PLANETARY_FRAME`).
   - Dynamic inter-plane tilt callouts showing angular offsets (e.g. the Solar System's $60.2^\circ$ inclination to the Galactic Plane; planetary axial tilt), with animated datum-plane rotation when crossing scale boundaries.
   - Integrated into the System and Planet scene setups.

## Out of Scope
- Cross-scale camera glides, HUD retraction, viewport compensation, search framing and the `Centre` CTA: [`camera-choreography`](../camera-choreography_20261117/spec.md). Where tilt indicators animate across a scale boundary they consume the glide events produced there.
- Keyboard and navigation-mode behaviour: [`interaction-controls`](../interaction-controls_20261010/spec.md).
- Replacing or extending the shipped data `<Minimap>` panel.

## Acceptance Criteria
- [ ] The compass / attitude widget tracks camera heading, pitch and roll in real time against galactic axes, with cardinal and Galactic North / Core indicators, and holds at the pole singularities.
- [ ] The active reference plane is visualised in Galaxy, System and Planet views, with correct tilt callouts between Galactic, System and Planetary frames (tested against `src/utils/astroCoordinates.ts` / `src/config/referenceFrames.ts`).
- [ ] Datum-plane rotations animate across scale boundaries and respect `prefers-reduced-motion`.
- [ ] Attitude and tilt maths are pure modules with 100% unit-test coverage; every new component has its full component quad (`.tsx`, `.module.css`, `.stories.tsx`, `.test.tsx`).
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:guards` and `npm run audit:r3f` pass.
