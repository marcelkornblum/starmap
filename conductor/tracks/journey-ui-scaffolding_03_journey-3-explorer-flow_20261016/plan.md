# Implementation Plan: Journey 3 — Curated On-Ramps, Narrative Waypoints & Step-Through (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & CLEAN-SLATE SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 3 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one**, layering Journey 3's data and requirement notes cumulatively onto the ratified scaffolding views (or creating new ones if ratified).

## Phase 1: Journey 3 Onboarding Briefing & Screen Sequence Alignment
- [ ] Task: Present the **Journey 3 Briefing**: Archetype 3 (*The Casual Explorer / "Cosmic Tourist"*), serendipity/awe mental model, key needs (curated on-ramps, punchy 2-sentence narrative hooks, metadata tags, step-through controls), and align on the screen sequence.
- [ ] Task: Phase Verification & Checkpoint (Confirm readiness to step into Step 1)

## Phase 2: Step 1, 2 & 3 — Curated Discovery & Tour Waypoint Layer
- [ ] Task: Align one decision at a time on target view/route, curated on-ramp prompts (*"Newly Discovered Exoplanet"*, *"Extreme Worlds"*, *"Surprise Me"*), glanceable 2-sentence narrative hooks, thematic tags (`Habitable Zone`, `Super-Earth`, `Recent JWST Target`), and `Prev`/`Next` waypoint stepping + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement curated collection schemas, waypoint selectors, and tour state transitions with unit tests.
- [ ] Task: Layer curated on-ramp triggers, active waypoint data, and requirement notes onto the ratified scaffolding view.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 4 — Fluid Tour Inspection Layer
- [ ] Task: Align one decision at a time on how active tour context and narrative hooks persist or expand when transitioning from a waypoint into system/planet inspection + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement tour-to-inspection state preservation with unit tests.
- [ ] Task: Layer tour context and requirement notes onto the ratified scaffolding views.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URLs + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
