# Implementation Plan: Camera & Orthographic Projection

## Phase 1: Projection Blending, Discrete Snap-on-Release & Orthographic Lock
- [x] Task: Write unit tests for camera FOV, dolly coupling, frustum maths, and cardinal normal detection in `cameraMath.ts`.
- [x] Task: Fix invariant celestial entity screen-space scale and frustum calculation across perspective and orthographic projections.
- [x] Task: Implement headless camera projection and lock state store / hook (mode: `perspective` | `orthographic`, `isLocked`: boolean, `activeAxis`: Vector3 | null).
- [x] Task: Implement discrete snap-on-release in `CameraRig`: on pointer drag release (`onEnd`), if within threshold of a cardinal axis, smoothly tween camera to cardinal normal and transition projection.
- [x] Task: Implement orthographic lock state machine in `CameraRig`: when locked, disable orbit rotation (`enableRotate: false`), bind left-drag to screen-space pan (`controls.mouseButtons.LEFT = THREE.MOUSE.PAN`), bind scroll wheel to orthographic zoom, strictly preventing tilt rotation. When unlocked, restore perspective and free 3D orbit.
- [x] Task: Implement direct cardinal axis navigation action (Top, Bottom, Front, Back, Right, Left) to glide to any orthogonal view.
- [x] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)


## Phase 2: Logarithmic Zoom & Glide Transitions
- [ ] Task: Write unit tests for logarithmic zoom stepping and critically damped target glide curves.
- [ ] Task: Implement smooth target transition controller with configurable duration and easing tokens.
- [ ] Task: Integrate logarithmic zoom constraints tailored to `GALACTIC_FRAME`, `SYSTEM_FRAME`, and `PLANETARY_FRAME`.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Camera Presets & Storybook Verification
- [ ] Task: Write unit tests for camera presets: top-down ecliptic, reset, and orbital lock.
- [ ] Task: Expose headless camera action dispatchers in `useCameraStore` / `CameraRig`.
- [ ] Task: Create Storybook harness verifying projection blending, discrete snap-on-release, orthographic lock, axis navigation buttons, glide transitions, and presets across Galaxy and System scenes.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

