# Implementation Plan: Astro Math Core

## Phase 1: Test Infrastructure & Types
- [x] Task: Install and configure Vitest for the project. [81e2beb]
- [x] Task: Define the `StarmapNode` TypeScript interface (in `src/types/astro.ts`). [75123a1]
- [x] Task: Create `stars.fixture.json` in a `tests/fixtures/` directory, populated with 3-5 well-known stars extracted from `data/hygdata_v3.csv` to act as our mathematical control group. [126fa8b]
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Core Coordinate Transformation (TDD)
- [ ] Task: Write failing unit tests for `equatorialToCartesian(ra, dec, dist)` verifying against the fixture data.
- [ ] Task: Implement `equatorialToCartesian` (in `src/utils/astroMath.ts`) until tests pass.
- [ ] Task: Verify 100% test coverage on `equatorialToCartesian`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Arbitrary Plane Rotation (TDD)
- [ ] Task: Write failing unit tests for `rotateToOrbitalPlane(buffer, inclination, ascendingNode)` asserting correct mathematical rotation on a `Float32Array` buffer.
- [ ] Task: Implement `rotateToOrbitalPlane` to mutate the buffer in-place with zero object allocation.
- [ ] Task: Verify 100% test coverage on `rotateToOrbitalPlane`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
