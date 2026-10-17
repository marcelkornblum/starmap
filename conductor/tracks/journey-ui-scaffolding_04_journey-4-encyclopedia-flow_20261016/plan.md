# Implementation Plan: Journey 4 — Classification Deep-Links, Encyclopedia Articles, Parameter Comparator & Category Index (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 4 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one**, layering Journey 4's data and requirement notes cumulatively onto the scaffolding views.

## Phase 1: Journey 4 Onboarding Briefing & Screen Sequence Alignment
- [ ] Task: Present the **Journey 4 Briefing**: Self-decoding UI across Archetypes 1 & 3, Sense of Scale JTBD, classification deep-link triggers (`Red Supergiant`), Relative Parameter Comparator against familiar anchors, Category Index, and return-to-origin flow.
- [ ] Task: Phase Verification & Checkpoint (Confirm readiness to step into Screen 1)

## Phase 2: Screen 1 — Entity Views (`GalaxyView` / `SystemView` / `PlanetView`): Classification Deep-Link & Return Context Layer
- [ ] Task: Align one decision at a time on classification deep-link triggers alongside entity tags and return-to-origin context preservation + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement classification taxonomy lookup and origin-return stack state with unit tests.
- [ ] Task: Layer classification deep-link triggers and requirement notes onto the entity scaffolding views.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URLs + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Screen 2 — Reference View (Article Mode): Encyclopedia Article & Relative Parameter Comparator
- [ ] Task: Align one decision at a time on Encyclopedia Article data (plain-language summary, parameter boundaries, 3D exemplar descriptor, Wikipedia link) and the Relative Parameter Comparator data model (benchmarking radius, mass, luminosity, gravity, temperature against Sol/Earth/Jupiter) + requirement notes on `ReferenceView`; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement article selectors and Relative Parameter Comparator math with unit tests.
- [ ] Task: Layer the Encyclopedia Article and Relative Parameter Comparator data + requirement notes onto the `ReferenceView` scaffolding screen.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL (`http://192.168.1.124:5173/reference`) + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Screen 3 — Reference View (Category Index & Hierarchy Mode): Breadcrumbs, Category Grid & Return to Map
- [ ] Task: Align one decision at a time on breadcrumb hierarchy (`Encyclopedia` $\to$ `Star Types` $\to$ `Red Supergiant`), Category Index summary cards (metrics + exemplar descriptor), and returning to the origin map entity + requirement notes on `ReferenceView`; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement reference hierarchy traversal and category index selectors with unit tests.
- [ ] Task: Layer Category Index, hierarchy breadcrumbs, and return-to-origin controls + requirement notes onto the `ReferenceView` scaffolding screen.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL (`http://192.168.1.124:5173/reference`) + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
