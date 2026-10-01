# Implementation Plan: UI System & Primitives

## Phase 1: Exploration & Global Tokens
- [x] Task: Create `docs/design-system.md` to map out the semantic vocabulary (surfaces, typographic scale, spacing ratios).
- [x] Task: Document the Component Taxonomy, defining strict structural categories (e.g., Layout Primitives, Interactive Atoms like Buttons, and Informational Blocks like Cards).
- [x] Task: Implement the global `tokens.css` file establishing the CSS variables for Light and Dark modes.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Composition Primitives
- [ ] Task: Install and configure Storybook for the project.
- [ ] Task: Implement Every Layout primitives (`<Stack>`, `<Cluster>`, `<Sidebar>`, `<Center>`).
- [ ] Task: Catalog all primitives in Storybook to demonstrate fluid wrapping and spacing constraint enforcement.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Component Blocks & Local Interfaces
- [ ] Task: Build core UI blocks (e.g., `<Card>`, `<DataPanel>`, `<Toolbar>`).
- [ ] Task: Implement the Localized Token Interface pattern inside each component's CSS Module.
- [ ] Task: Catalog the blocks in Storybook, testing both Light and Dark modes.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Documentation & Guardrails
- [ ] Task: Write the Developer Guidelines in `docs/design-system.md` detailing how to use the primitives and component interfaces.
- [ ] Task: Update `.agents/AGENTS.md` to strictly enforce the CUBE architecture and ban magic numbers.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: View Migration & Inline Style Elimination
- [ ] Task: Refactor application shell and layout (`RootLayout`, `GlobalCanvas`, `RouteSkeleton`) to consume layout primitives and semantic design tokens, eliminating inline styles.
- [ ] Task: Refactor domain views (`GalaxyView`, `SystemView`, `PlanetView`, `ReferenceView`) to replace inline styles with CUBE CSS modules and composition primitives.
- [ ] Task: Perform codebase-wide audit to ensure zero hardcoded magic numbers or legacy inline styles remain across all views.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

