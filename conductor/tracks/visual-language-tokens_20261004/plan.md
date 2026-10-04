# Implementation Plan: Visual Language Token Layer

> **Status: Stub.** Expand into TDD tasks when the spec is refined.

## Phase 1: Semantic Channels & Exception Interface
- [ ] Task: Define hazard, confidence, category, overlay and focus tokens in both themes; reconcile with existing tokens.
- [ ] Task: Update `useThreeTokenStore` / token bridge to reconciled names.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Materiality & Elevation
- [ ] Task: Resolve open palette, bevel, grain and blur values.
- [ ] Task: Implement graphite surface stack, micro-bevel, hairline and selective-glass tokens.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Primitive & Surface Adoption
- [ ] Task: Migrate primitives/surfaces to new tokens and `data-*` exceptions (after API approval).
- [ ] Task: Remove positioning from `Dock` / `Hud`.
- [ ] Task: Update Storybook stories and `docs/design-system.md`.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
