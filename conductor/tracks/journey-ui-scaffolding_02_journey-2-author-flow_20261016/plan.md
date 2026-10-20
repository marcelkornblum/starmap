# Implementation Plan: Journey 2 — Spatial Anchor, Intent Filters, Candidate Sync & Multi-Leg Network (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & CLEAN-SLATE SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 2 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one**, layering Journey 2's data and requirement notes cumulatively onto the ratified scaffolding views (or creating new ones if ratified).

## Phase 1: Journey 2 Onboarding Briefing & Screen Sequence Alignment
- [x] Task: Present the **Journey 2 Briefing**: Archetype 2 (*The Sci-Fi Author / Worldbuilder*), topological network planner mental model, core deal-breakers (ephemeral state loss, inflexible search), JTBDs (Candidate Hunting, Comms Latency, Strategic Cluster Mapping, System Resource Inventory, Speculative Propulsion), and align on the screen sequence.
- [x] Task: Phase Verification & Checkpoint (Confirm readiness to step into Step 1; defer Step 3 to `FS-014` and Step 5 to Backlog / `FS-015`)

## Phase 2: Step 1 & 2 — Instrument Intersection, Non-Passive Galaxy Systems & `<BodiesPanel scope="galaxy" />`
- [x] Task: Align one decision at a time on Cartographic Instrument intersection (`?center=`, camera distance / instrument aperture scale, `'active'` / `'selected'` / `'focused'` tiers), `<BodiesPanel scope="galaxy" />` (no orbital schematic, listing all non-passive systems), and focus-relative distance readout; record in `decision-log.md` and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement instrument-intersection system selector, focus-relative distance calculation, and `<BodiesPanel scope="galaxy" />` view model with unit tests.
- [x] Task: Layer `<BodiesPanel scope="galaxy" />` and instrument scale/intersection state onto `GalaxyView`.
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 4 — Circumstellar Debris Disks & Colonial Resource Audit Layer
- [x] Task: Audit available dataset sources for circumstellar debris disks / belts across extrasolar systems and align one decision at a time on build-time data representation, `<OrbitalSchematicList />` integration, and `<DetailsPanel />` resource/disk telemetry; record in `decision-log.md` and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Precalculate circumstellar disks/belts in `scripts/build-data.ts` and `src/utils/compactDataCodec.ts`, and extend system/orbital selectors with unit tests.
- [x] Task: Layer circumstellar disk & belt items onto `<OrbitalSchematicList />`, `<BodiesPanel />`, and `<DetailsPanel />` on `SystemView`.
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
