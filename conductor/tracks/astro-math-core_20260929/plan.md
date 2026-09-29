# Implementation Plan: Astro Math Core

## Phase 1: Test Infrastructure & Types
- [ ] Task: Install and configure Vitest for the project.
- [ ] Task: Define the `StarmapNode` TypeScript interface (in `src/types/astro.ts`).
- [ ] Task: Create `stars.fixture.json` in a `tests/fixtures/` directory, populated with 3-5 well-known stars extracted from `data/hygdata_v3.csv` to act as our mathematical control group.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Core Coordinate Transformation (TDD)
- [ ] Task: Write failing unit tests for `equatorialToCartesian(ra, dec, dist)` verifying against the fixture data.
- [ ] Task: Implement `equatorialToCartesian` (in `src/utils/astroMath.ts`) until tests pass.
- [ ] Task: Verify 100% test coverage on `equatorialToCartesian`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Arbitrary Plane Rotation (TDD)
- [ ] Task: Write failing unit tests for `rotateToOrbitalPlane(coords, inclination, ascendingNode)` asserting correct mathematical rotation (e.g., a standard 23.5-degree tilt).
- [ ] Task: Implement `rotateToOrbitalPlane` until tests pass.
- [ ] Task: Verify 100% test coverage on `rotateToOrbitalPlane`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
