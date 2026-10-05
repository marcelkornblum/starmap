# Implementation Plan: Console UI Shell

> **Status: Stub.** Expand into TDD tasks when the spec is refined.

## Phase 1: Viewport Layout & Heading
- [ ] Task: Implement `ViewportLayout` HUD slot template and `Heading` primitive.
- [ ] Task: Strip duplicate HUD CSS from view modules.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Selection Pipeline & Breadcrumbs
- [ ] Task: Implement unified selection pipeline and typed 2D → 3D camera commands.
- [ ] Task: Implement selection-aware `Breadcrumbs`.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Dock, Modes & View Controls
- [ ] Task: Implement persistent Dock with Map/Encyclopedia modes and search entry point.
- [ ] Task: Implement `ViewControlsDock` with layer toggles and camera presets.
- [ ] Task: Implement keyboard shortcut reference modal.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
