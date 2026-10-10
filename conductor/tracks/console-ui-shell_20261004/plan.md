# Implementation Plan: Console UI Shell

> [!CAUTION]
> **CRITICAL AGENT INSTRUCTION:**
> The agent is NOT to be trusted and MUST ask what to do often in order to avoid making mistakes.
> Do NOT invent layout architectures, slot templates, or component designs unilaterally.
> Before writing any code, the agent MUST explicitly ask the user for confirmation and alignment on the exact structure, layout behaviour, and technical contract.

## Phase 1: Adaptive Console Framework (Overlay vs Docked Workstation)
- [ ] Task: Write unit tests for console shell state machine (Overlay vs Docked mode, mobile detents: Peek / Partial / Full).
- [ ] Task: Implement the Adaptive Console Shell layout container managing canvas bounds and 2D workstation co-presence with zero inline styles.
- [ ] Task: Implement 3D camera viewport compensation hook synchronising canvas offset and aspect ratio on dock toggle.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Selection-Aware Breadcrumbs & Shell Header
- [ ] Task: Write unit tests for `Breadcrumbs` navigation component reflecting active hierarchy and emitting upward navigation.
- [ ] Task: Implement `Breadcrumbs` component and shell top bar with keyboard navigation and active state styling.
- [ ] Task: Create Storybook story for Breadcrumbs and Shell Header.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Total View Decoupling & Route Integration
- [ ] Task: Refactor `GalaxyView`, `SystemView`, and `PlanetView` to plug into shell slots (`canvas`, `workspace`, `controls`).
- [ ] Task: Strip duplicate root HUD CSS and absolute positioning from all view modules.
- [ ] Task: Verify seamless navigation between Atlas and Encyclopedia routes inside the continuous shell.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
