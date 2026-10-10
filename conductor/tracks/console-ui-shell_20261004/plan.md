# Implementation Plan: Console UI Shell

> [!CAUTION]
> **CRITICAL AGENT INSTRUCTION:**
> The agent is NOT to be trusted and MUST ask what to do often in order to avoid making mistakes.
> Do NOT invent layout architectures, slot templates, or component designs unilaterally.
> Before writing any code, the agent MUST explicitly ask the user for confirmation and alignment on the exact structure, layout behavior, and technical contract.

## Phase 1: Viewport Layout & Heading Primitive
- [ ] Task: Write unit tests for `Heading` typographic primitive (`src/components/interface/information/Heading`) supporting eyebrow, title, and subtitle slots with zero outer margins and semantic tokens.
- [ ] Task: Implement `Heading` primitive and configure Storybook story in `src/components/interface/information/Heading/Heading.stories.tsx`.
- [ ] Task: Write unit tests for `ViewportLayout` HUD slot architecture (`src/components/interface/layouts/ViewportLayout`) providing slots for canvas, header/breadcrumbs, dock, telemetry, and edge widgets with CSS grid/subgrid layout and zero inline styles.
- [ ] Task: Implement `ViewportLayout` layout component and create Storybook preview story.
- [ ] Task: Refactor `GalaxyView`, `SystemView`, and `PlanetView` to compose `ViewportLayout`, stripping redundant `.hudOverlay`, `.eyebrow`, and absolute positioning CSS.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Selection Pipeline & Selection-Aware Breadcrumbs
- [ ] Task: Write unit tests for unified 2D ↔ 3D selection store and typed camera commands in `src/stores/useSelectionStore.ts` or `src/stores/useUIStore.ts`.
- [ ] Task: Implement typed camera focal lock command bridge dispatching identical selection events from 2D lists and 3D reticle clicks.
- [ ] Task: Write unit tests for `Breadcrumbs` navigation component (`src/components/interface/navigation/Breadcrumbs`) reflecting active hierarchy (`Local Volume → Tau Ceti → Tau Ceti e`) and emitting upward navigation events.
- [ ] Task: Implement `Breadcrumbs` component with keyboard navigation, active state styling, and Storybook stories.
- [ ] Task: Integrate `Breadcrumbs` into `ViewportLayout` top bar across celestial views.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Persistent Dock, Mode Switching & View Controls Dock
- [ ] Task: Write unit tests for persistent `Dock` navigation supporting Map vs Encyclopedia mode switching and search trigger.
- [ ] Task: Refactor `Dock` component to remove hardcoded positioning and integrate mode switching state with TanStack Router.
- [ ] Task: Write unit tests for `ViewControlsDock` sourcing camera presets (log zoom, top-down ecliptic, reset) and layer toggles (grid, habitable zones, kinematic stalks) from active `ReferenceFrame`.
- [ ] Task: Implement `ViewControlsDock` and integrate into `ViewportLayout` edge slots.
- [ ] Task: Write unit tests and implement `KeyboardShortcutModal` with accessible dialog controls and keymap cheat sheet.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

