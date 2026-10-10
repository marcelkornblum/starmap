# Implementation Plan: Minimap & Scene Transitions

## Phase 1: Spatial Minimap Component
- [ ] Task: Write unit tests for minimap attitude mathematics (Euler angles, heading, pitch, tilt projections) in `src/components/canvas/math/attitudeMath.ts`.
- [ ] Task: Implement the 3D Minimap component (`src/components/canvas/instrument/Minimap`) rendering camera attitude, cardinal axes, and galactic direction.
- [ ] Task: Create Storybook preview story demonstrating real-time camera tracking.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Reference Plane Visualisation & Tilt Indicators
- [ ] Task: Write unit tests for inter-plane tilt transformations (Galactic ↔ Ecliptic ↔ Equatorial frames).
- [ ] Task: Implement `ReferencePlane` visualisation component rendering the plane grid, perimeter markers, and angular tilt callout.
- [ ] Task: Integrate inter-plane tilt indicators into System and Planetary scene setups.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Seamless Cross-Scale Scene Transitions
- [ ] Task: Write unit tests for cross-scale scene transition coordinator in `src/router/navigation.ts` and `SceneBridgeContext`.
- [ ] Task: Implement optical zoom-in / glide transition bridging Galaxy to System and System to Planet without route remount glitches.
- [ ] Task: Verify smooth visual continuity across all scale boundaries in Storybook and application routes.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
