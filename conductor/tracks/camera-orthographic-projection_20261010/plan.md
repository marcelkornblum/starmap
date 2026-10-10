# Implementation Plan: Camera & Orthographic Projection

## Phase 1: Camera Coupling & Projection Blending
- [ ] Task: Write unit tests for camera FOV and dolly coupling maths in `src/components/canvas/math/cameraMath.ts`.
- [ ] Task: Implement perspective ↔ orthographic projection blending algorithm and cardinal plane snap thresholds.
- [ ] Task: Extend `CameraRig` to support blended projection transitions without scene popping.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Logarithmic Zoom & Glide Transitions
- [ ] Task: Write unit tests for logarithmic zoom stepping and critically damped target glide curves.
- [ ] Task: Implement smooth target transition controller with configurable duration and easing tokens.
- [ ] Task: Integrate logarithmic zoom constraints tailored to `GALACTIC_FRAME`, `SYSTEM_FRAME`, and `PLANETARY_FRAME`.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Camera Presets & Storybook Verification
- [ ] Task: Write unit tests for camera presets: top-down ecliptic, reset, and orbital lock.
- [ ] Task: Implement headless camera action dispatchers in `useCameraStore` / `CameraRig`.
- [ ] Task: Create Storybook harness verifying projection blending, glide transitions, and presets across Galaxy and System scenes.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
