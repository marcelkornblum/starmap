# Specification: Camera & Orthographic Projection

## Overview
Establishes the precision astronomical camera control system, dolly/aperture coupling, seamless perspective ↔ orthographic projection blending, and critically damped glide transitions across Galaxy, System, and Planetary inspection scales.

## Scope

1. **Camera Coupling & Projection Modes:**
   - Resolve camera coupling: dolly distance vs aperture FOV scaling.
   - Perspective ↔ Orthographic projection blending: seamless transition between 3D perspective and cartographic face-on orthographic projection with invariant screen-space scale preservation.
   - Scale-invariant celestial entity rendering across all projection transitions without frustum clipping or node-size collapse.
2. **Camera Controls Architecture (Discrete Snap-on-Release & Dedicated Axis Controls):**
   - **Uninterrupted 3D Orbit:** OrbitControls manages 3D perspective orbit freely during active dragging without continuous `useFrame` magnetic fighting or position mutations.
   - **Discrete Snap-on-Release:** When the user releases a drag within a cardinal capture zone (~15° of a cardinal normal), smoothly animate/tween the camera to align with the axis and engage Orthographic projection.
   - **Orthographic Lock State Machine:**
     - *Locked:* Projection set to Orthographic. OrbitControls rotation disabled (`enableRotate: false`). Left-click drag mapped cleanly to screen-space pan (`controls.mouseButtons.LEFT = THREE.MOUSE.PAN`). Scroll wheel zooms orthographic frustum. Tilt rotation strictly disabled.
     - *Unlocked:* Projection returns cleanly to Perspective. 3D orbit and tilt rotation re-enabled.
   - **Dedicated Axis Navigation:** Direct navigation controls (Top, Bottom, Front, Back, Right, Left) to smoothly glide to any of the 6 cardinal directions, overcoming 2D mouse spherical elevation constraints.
3. **Camera Transitions & Glides:**
   - Critically damped glide transitions between targets and scales, avoiding jarring cuts or disorientation.
   - Logarithmic zoom stepping: smooth scaling across astronomical orders of magnitude (from light-years down to AU and kilometres) without floating-point depth precision artifacts or z-fighting.
4. **Camera Presets & State Model:**
   - Canonical camera presets: top-down ecliptic view, orbital lock, reference plane reset, and radial view.
   - Pure headless state model: camera position, target vector, projection mode (`perspective` | `orthographic`), lock state, and focal distance exposed via store/hooks without coupling to DOM HUD elements.

## Acceptance Criteria
- [ ] Scale-invariant rendering of celestial entities and markers across perspective and orthographic projections without disappearing or popping.
- [ ] Zero continuous frame-by-frame fighting with OrbitControls during active drag.
- [ ] Discrete snap-on-release smoothly aligns to cardinal axes when released near a cardinal view.
- [ ] Orthographic lock strictly disables tilt, maps drag to screen-space pan, and preserves view direction.
- [ ] Dedicated axis controls provide clean access to all 6 orthogonal cardinal views.
- [ ] Logarithmic zoom behaves predictably across all three reference frames (`GALACTIC_FRAME`, `SYSTEM_FRAME`, `PLANETARY_FRAME`).
- [ ] Glides between celestial targets use critically damped physics with zero overshoot.
- [ ] Camera presets (top-down, orbital lock, reset) correctly reposition the camera.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass with 100% test coverage on camera maths.
