# Specification: Minimap & Scene Transitions

## Overview
Delivers the spatial Minimap component (attitude indicator / galactic orientation compass), establishes smooth optical transitions when moving between scenes (Galaxy ↔ System ↔ Planetary), and visualises the geometric orientation and tilt between different celestial reference planes.

## Scope

1. **Spatial Minimap Component:**
   - 3D attitude indicator / spatial minimap widget displaying the camera's heading, pitch, and roll relative to the active celestial reference plane.
   - Fixed HUD placement, tokenised styling, and smooth real-time response to camera rotations.
   - Cardinal axis indicators ($X, Y, Z$) and Galactic North/Core pointers.
2. **Moving Between Scenes (Cross-Scale Transitions):**
   - Seamless optical transitions when zooming into or stepping between scenes:
     - Galaxy Scene ↔ System Scene ↔ Planetary Scene.
   - Coordinated camera glides that maintain focal continuity on target objects rather than hard cuts or route flashes.
   - Background canvas crossfade / aperture expansion.
3. **Reference Plane Visualisation & Inter-Plane Tilts:**
   - Visualising active reference planes:
     - Galactic Equator / Midplane ($Z=0$ in `GALACTIC_FRAME`).
     - System Invariable / Ecliptic Plane (in `SYSTEM_FRAME`).
     - Planetary Equator & Obliquity Plane (in `PLANETARY_FRAME`).
   - Dynamic inter-plane tilt indicators displaying angular offsets between planes (e.g. Solar System's $60.2^\circ$ inclination to the Galactic Plane; planetary axial tilt).
   - Animated datum plane rotations when transitioning between scale boundaries.

## Acceptance Criteria
- [ ] Minimap accurately tracks camera orientation in real time without lag.
- [ ] Transitions between Galaxy, System, and Planet scenes execute smoothly with focal lock.
- [ ] Active reference plane correctly visualises orientation and tilt indicators when inspecting systems and planets.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass with 100% test coverage on transition maths.
