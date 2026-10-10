# Implementation Plan: Telemetry Container & Panels

## Phase 1: Foundational Elements (Heading Primitive & Persistent Dock)
- [ ] Task: Write unit tests for `Heading` typographic primitive (`src/components/interface/information/Heading`) supporting eyebrow, title, and subtitle slots with zero outer margins and semantic tokens.
- [ ] Task: Implement `Heading` primitive and configure Storybook story in `src/components/interface/information/Heading/Heading.stories.tsx`.
- [ ] Task: Write unit tests for persistent `Dock` navigation component (`src/components/interface/surfaces/Dock`) supporting Map vs Encyclopedia modes and search trigger.
- [ ] Task: Refactor `Dock` component to remove positioning assumptions and integrate mode switching state with TanStack Router.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: System Information Panel (Tiers 1, 2, and 3)
- [ ] Task: Write unit tests for `SystemInformationPanel` covering detent states (Peek, Partial, Full) and mobile drag affordance.
- [ ] Task: Implement Tier 1 (Peek Detent): Header, stellar-only facet reticle with tooltip, spectral class badge, planetary summary strip with per-symbol tooltips. Verify no anchor-dependent metrics.
- [ ] Task: Implement Tier 2 (Partial Detent): Encyclopaedic narrative blocks (physical character, exoplanetary architecture, pop culture references heading) and prominent CTA container with extensible action slots.
- [ ] Task: Implement Tier 3 (Full Detent): Vertical orbital schematic ordered by semi-major axis (host star, CHZ bounds bracket, exoplanet items, asteroid/debris disks) with accordion disclosure.
- [ ] Task: Implement Tier 3 Encyclopedia linkage `(i)` triggers and pinned attribution/astrometry footer (coordinates and external authority links).
- [ ] Task: Configure comprehensive Storybook stories for `SystemInformationPanel` in `src/components/interface/information/SystemInformationPanel/SystemInformationPanel.stories.tsx`.
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Secondary Objects Pane & 3D Starfield Sync
- [ ] Task: Write unit tests for `SecondaryObjectsPane` covering 2D list rendering and selection state.
- [ ] Task: Implement `SecondaryObjectsPane` with bi-directional 2D list ↔ 3D starfield reticle synchronisation (hover and selection).
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
