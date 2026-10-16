# Specification: Camera & Orthographic Projection

## Overview
Establishes the precision astronomical camera control system, dolly/aperture coupling, seamless perspective ↔ orthographic projection blending, and critically damped glide transitions across Galaxy, System, and Planetary inspection scales.

## Scope

1. **Camera Coupling & Projection Modes:**
   - Resolve camera coupling: dolly distance vs aperture FOV scaling.
   - Perspective ↔ Orthographic projection blending: smooth transition between 3D perspective and cartographic face-on orthographic projection on cardinal/ecliptic alignment.
   - Polar cartographic dial alignment: lock and synchronise camera orientation when approaching top-down cardinal angles ($XY, XZ, YZ$).
2. **Camera Transitions & Glides:**
   - Critically damped glide transitions between targets and scales, avoiding jarring cuts or disorientation.
   - Logarithmic zoom stepping: smooth scaling across astronomical orders of magnitude (from light-years down to AU and kilometres) without floating-point depth precision artifacts or z-fighting.
3. **Camera Presets & State Model:**
   - Canonical camera presets: top-down ecliptic view, orbital lock, reference plane reset, and radial view.
   - Pure headless state model: camera position, target vector, projection mode (`3d` | `top-down`), and focal distance exposed via store/hooks without coupling to DOM HUD elements.

## Acceptance Criteria
- [ ] Smooth interpolation between perspective and orthographic camera projections without visual jumps.
- [ ] Logarithmic zoom behaves predictably across all three reference frames (`GALACTIC_FRAME`, `SYSTEM_FRAME`, `PLANETARY_FRAME`).
- [ ] Glides between celestial targets use critically damped physics with zero overshoot.
- [ ] Camera presets (top-down, orbital lock, reset) correctly reposition the camera.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass with 100% test coverage on camera maths.
