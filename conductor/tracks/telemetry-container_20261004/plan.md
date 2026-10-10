# Implementation Plan: Telemetry Container & Dossiers

## Phase 1: Foundational Elements (Heading Primitive & Persistent Dock)
- [ ] Task: Write unit tests for `Heading` typographic primitive (`src/components/interface/information/Heading`) supporting eyebrow, title, and subtitle slots with zero outer margins and semantic tokens.
- [ ] Task: Implement `Heading` primitive and configure Storybook story in `src/components/interface/information/Heading/Heading.stories.tsx`.
- [ ] Task: Write unit tests for persistent `Dock` navigation component (`src/components/interface/surfaces/Dock`) supporting Map vs Encyclopedia modes and search trigger.
- [ ] Task: Refactor `Dock` component to remove positioning assumptions and integrate mode switching state with TanStack Router.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Domain Card Hierarchy & Content Surfaces
- [ ] Task: Define unified card hierarchy: Summary Card, Telemetry Card, and Dossier Inspector.
- [ ] Task: Implement real-time kinematic readouts with anchor-independent telemetry.
- [ ] Task: Implement Keplerian orbital telemetry tables with tabular numerals.
- [ ] Task: Implement celestial dossier sheets with spectral tooltips and external authority deep-links.
- [ ] Task: Promote POC components (`StarDossier`, `OrbitTable`, `MetricStrip`) into production cards with Storybook stories.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Secondary Objects Pane
- [ ] Task: Implement `SecondaryObjectsPane` with bi-directional 2D ↔ 3D sync.
- [ ] Task: Wire row hover and selection events between 2D list items and 3D map reticles.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
