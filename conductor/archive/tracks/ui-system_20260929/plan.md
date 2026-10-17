# Implementation Plan: UI System & Primitives

## Phase 1: Exploration & Global Tokens
- [x] Task: Create `docs/design-system.md` to map out the semantic vocabulary (surfaces, typographic scale, spacing ratios).
- [x] Task: Document the Component Taxonomy, defining strict structural categories (e.g., Layout Primitives, Interactive Atoms like Buttons, and Informational Blocks like Cards).
- [x] Task: Implement the global `tokens.css` file establishing the CSS variables for Light and Dark modes.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Composition Primitives (Tier 1: Layout & Atoms)
- [x] Task: Install and configure Storybook with Vite and React 19.
- [x] Task: Implement Tier 1 Layout Primitives (`<Stack>`, `<Cluster>`, `<Sidebar>`, `<Switcher>`, `<Grid>`, `<Center>`, `<Cover>`, `<Frame>`, `<Reel>`, `<Box>`, `<Imposter>`, `<Icon>`).
- [x] Task: Implement Tier 1 Data & Control Primitives (`<Datum>`, `<Metric>`, `<Badge>`, `<Button>`, `<Input>`, `<Toggle>`, `<Slider>`, `<Select>`).
- [x] Task: Unit and visual tests for all Tier 1 primitives adhering to CUBE CSS and CSS Modules.
- [x] Task: Phase Verification & Checkpoint (Run /code-review, push to PR, verify CI & Gemini review)

## Phase 3: Spatial Planes & Templates (Tier 2: Surfaces & Tier 3: Templates)
- [x] Task: Implement Tier 2 Surfaces (`<Card>`, `<Panel>`, `<Dock>`, `<Well>`).
- [x] Task: Implement Tier 2 Overlays (`<Modal>`, `<Drawer>`, `<Popover>`, `<Tooltip>`, `<Toast>`) with accessible ARIA semantics and CUBE exceptions.
- [x] Task: Implement Tier 3 Structural Layout Templates (`<DossierLayout>`, `<MetricStrip>`, `<ToolbarLayout>`).
- [x] Task: Unit tests and Storybook stories for Tier 2 and Tier 3 components.
- [x] Task: Phase Verification & Checkpoint (Run /code-review, push to PR, verify CI & Gemini review)

## Phase 4: Domain Features (Tier 4: Application Assemblies)
- [x] Task: Implement `<StarDossier>` with spectral classification, habitable zone readouts, and exoplanet listings.
- [x] Task: Implement `<OrbitTable>` displaying Keplerian elements with vertical tabular numeral alignment.
- [x] Task: Implement `<CommandPalette>` modal search interface for celestial entities and coordinates.
- [x] Task: Implement `<SystemControls>` HUD controls for time scrubbing, orbit projection toggles, and coordinate grids.
- [x] Task: Unit tests and Storybook stories for Tier 4 domain features.
- [x] Task: Phase Verification & Checkpoint (Run /code-review, push to PR, verify CI & Gemini review)

## Phase 5: View Migration & Inline Style Elimination
- [x] Task: Refactor application shell and layout (`RootLayout`, `GlobalCanvas`, `RouteSkeleton`) using Tier 1–3 primitives and semantic design tokens, eliminating all inline styles.
- [x] Task: Refactor domain views (`GalaxyView`, `SystemView`, `PlanetView`, `ReferenceView`) to replace inline styles with CUBE CSS modules and Tier 4 assemblies.
- [x] Task: Perform codebase-wide audit to ensure zero hardcoded magic numbers or legacy inline styles remain across all views.
- [x] Task: Phase Verification & Checkpoint (Run /code-review, push to PR, verify CI & Gemini review)
