# Implementation Plan: Journey 1 — Target Acquisition, System Summary, 2-Point Route & Scale Transitions (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & CLEAN-SLATE SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 1 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one** from a clean slate (`/`). On each step, discuss which view/route is needed and what data and requirement notes belong on it one atomic decision at a time (`ask_question`), log choices in `decision-log.md` and `view-requirements.md`, and pull that data + requirement notes onto the ratified scaffolding view with LAN links and 5-viewport screenshots.

## Phase 1: Journey 1 Onboarding Briefing & Screen Sequence Alignment
- [x] Task: Present the **Journey 1 Briefing**: Archetype 1 (*The Sci-Fi Reader / Space Enthusiast*), focus-centric mental model, core deal-breakers (spatial disorientation, spreadsheet syndrome), JTBDs (Interstellar Logistics, Sense of Scale, Habitability), and align with the user on the screen sequence and route paths to scaffold.
- [x] Task: Phase Verification & Checkpoint (Confirm readiness to step into Screen 1)

## Phase 2: Step 1 & 2 — Entry, Search, Target Framing & Intrinsic System Summary
- [x] Task: Align one decision at a time on the target view/route, search query/result data, and intrinsic target summary data (e.g. *Tau Ceti*, zero default Sol distance) + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement search matching and intrinsic system summary selectors with unit tests.
- [x] Task: Create/layer the ratified scaffolding view with search & intrinsic system summary data and requirement notes.
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 3 — Two-Point Measurement & Travel Benchmarks
- [x] Task: Align one decision at a time on the view/route state and 2-point route data (*Tau Ceti* ↔ *Sol*: Euclidean distance, one-way/round-trip light-speed delay, `0.05c` fusion, `1g` relativistic ship-time vs coordinate-time) + requirement notes; record in `decision-log.md` and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement 2-point travel & relativistic burn calculators and route state selectors with unit tests.
- [x] Task: Layer the 2-point route benchmark data and requirement notes onto the ratified scaffolding view.
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Step 4 — Stellar Barycentre, CHZ Bounds & Orbital Hierarchy
- [x] Task: Align one decision at a time on the view/route for system inspection and what system-scale data (central star(s), Circumstellar Habitable Zone bounds in AU, Keplerian orbital ladder) + requirement notes belong on it; record in `decision-log.md` and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement system hierarchy and CHZ selectors with unit tests.
- [x] Task: Create/layer the system hierarchy data and requirement notes onto the ratified scaffolding view.
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Step 5 — Planetary Inspection & Habitability Telemetry
- [x] Task: Align one decision at a time on the view/route for planetary inspection and what planetary data (e.g. *Tau Ceti e*: mass $M_\oplus$, surface gravity $g$, equilibrium temperature $K$, tidal-locking status, habitability evaluation) + requirement notes belong on it; record in `decision-log.md` and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement planetary telemetry selectors with unit tests.
- [x] Task: Create/layer the planetary inspection data and requirement notes onto the ratified scaffolding view.
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
