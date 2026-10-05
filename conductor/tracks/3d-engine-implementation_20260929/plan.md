# Implementation Plan: 3D Engine Implementation

## Phase 1: Camera & Core Optimization
- [ ] Task: Resolve camera coupling (dolly vs aperture scaling) and extend `CameraRig` accordingly.
- [ ] Task: Implement perspective ↔ orthographic blending, modal navigation controls and critically damped glides.
- [ ] Task: Implement the `InstancedMesh` logic to parse the bulk output from the Data Pipeline.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Materials, Shaders & Post-Processing
- [ ] Task: Build the responsive WebGL materials that sync to the UI token system.
- [ ] Task: Calibrate zoom-level clamping and far horizon fade.
- [ ] Task: Integrate `@react-three/postprocessing` (e.g., Bloom) if defined in the visual design spec.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Scale Transitions, Projection Bridge & HUD Hooks
- [ ] Task: Implement multi-scale datum plane transitions with tilt indicators.
- [ ] Task: Implement 3D → 2D screen-space projection bridge.
- [ ] Task: Implement galactic orientation compass / attitude minimap.
- [ ] Task: Implement 3D-synchronised search framing.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Route Integration & Optimization
- [ ] Task: Connect the canonical scenes to the router's active state (the tunnel).
- [ ] Task: Run a WebGL memory audit to ensure disposal of geometries on unmount.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
