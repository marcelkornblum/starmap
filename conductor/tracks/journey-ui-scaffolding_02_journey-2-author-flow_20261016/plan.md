# Implementation Plan: Journey 2 — Spatial Anchor, Intent Filters, Candidate Sync & Multi-Leg Network (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & CLEAN-SLATE SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 2 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one**, layering Journey 2's data and requirement notes cumulatively onto the ratified scaffolding views (or creating new ones if ratified).

## Phase 1: Journey 2 Onboarding Briefing & Screen Sequence Alignment
- [ ] Task: Present the **Journey 2 Briefing**: Archetype 2 (*The Sci-Fi Author / Worldbuilder*), topological network planner mental model, core deal-breakers (ephemeral state loss, inflexible search), JTBDs (Candidate Hunting, Comms Latency, Strategic Cluster Mapping, System Resource Inventory, Speculative Propulsion), and align on the screen sequence.
- [ ] Task: Phase Verification & Checkpoint (Confirm readiness to step into Step 1)

## Phase 2: Step 1 & 2 — Primary Anchor, Intent Filters & 2D ↔ 3D Candidate List Layer
- [ ] Task: Align one decision at a time on target view/route, Primary Spatial Anchor (*Epsilon Eridani*), radial/intent filter criteria ($\le 15\text{ ly}$, `"Habitable Zone"`), and synchronised 2D candidate list ↔ 3D starfield highlight state + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement radial anchor filter, intent filter predicates, and candidate list sync selectors with unit tests.
- [ ] Task: Layer the anchor/filter controls, matched candidate list data, and requirement notes onto the ratified scaffolding view.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 3 & 5 — Multi-Point Network, Comms Matrix & Deep-Link URL State Layer
- [ ] Task: Align one decision at a time on multi-leg route plotting (*Epsilon Eridani* $\to$ *Tau Ceti* $\to$ *82 G. Eridani*), comms latency matrix, speculative propulsion tiers, cluster naming, and deep-link URL state serialisation + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement multi-leg network calculators and URL state serialisation with unit tests.
- [ ] Task: Layer multi-leg network data, URL state readout, and requirement notes onto the ratified scaffolding view.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Step 4 — Circumstellar Disk & Colonial Resource Audit Layer
- [ ] Task: Align one decision at a time on circumstellar debris disk, asteroid belt, and resource/hazard inventory data + requirement notes on the system-inspection scaffolding view (e.g. *82 G. Eridani*); record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Extend system data model and selectors for minor bodies/debris disks with unit tests.
- [ ] Task: Layer the resource & debris disk data and requirement notes onto the ratified scaffolding view.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
