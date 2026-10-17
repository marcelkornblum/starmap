# Implementation Plan: Journey 5 — Intra-System Transfer Logistics, Temporal Scrubbing & Conjunction Geometry (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & CLEAN-SLATE SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 5 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one**, layering Journey 5's data and requirement notes cumulatively onto the ratified scaffolding views before conducting the full cross-journey synthesis for Stage 2.

## Phase 1: Journey 5 Onboarding Briefing & Screen Sequence Alignment
- [ ] Task: Present the **Journey 5 Briefing**: Archetypes 1 & 2 (*Intra-System Dynamics & Transit Planner Flow*), orbital alignment mental model (opposition vs conjunction), JTBDs (Hohmann ballistic vs continuous-thrust torchship comparison, light-minute comms delay, solar conjunction blackout), and align on the screen steps.
- [ ] Task: Phase Verification & Checkpoint (Confirm readiness to step into Step 1)

## Phase 2: Step 1, 2 & 3 — Anchor Pairing & Temporal Scrubbing Layer
- [ ] Task: Align one decision at a time on target view/route, intra-system departure/arrival body selection (*Earth* $\to$ *Mars* / *Tau Ceti e* $\to$ *Tau Ceti f*), temporal orbital clock scrubbing, and instantaneous separation (AU, light-minutes, alignment phase) + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement epoch orbital propagation and instantaneous separation selectors with unit tests.
- [ ] Task: Layer departure/arrival pairing, temporal scrubbing state, instantaneous separation data, and requirement notes onto the ratified scaffolding view.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 4 & 5 — Transfer Route Analysis & Solar Conjunction Blackout Layer
- [ ] Task: Align one decision at a time on comparative transfer analysis (Hohmann ballistic $\Delta v$ / transit duration / launch window vs continuous-thrust brachistochrone at $0.1\text{ g}, 0.5\text{ g}, 1\text{ g}$) and coronal exclusion zone solar conjunction blackout detection + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement Hohmann transfer, brachistochrone torchship, and solar conjunction line-of-sight occlusion calculators with unit tests.
- [ ] Task: Layer transfer route profiles, conjunction blackout status, and requirement notes onto the ratified scaffolding view.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Cross-Journey Synthesis & Stage 2 UI Track Sequencing
- [ ] Task: Review the complete cumulative scaffolding views, `view-requirements.md`, and `decision-log.md` with the user.
- [ ] Task: Ratify the exact structure, boundaries, and order of the Stage 2 Console Chrome, Telemetry, and UI Wiring tracks.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
