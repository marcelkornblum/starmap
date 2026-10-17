# Implementation Plan: Journey 1 — Target Acquisition, System Summary, 2-Point Route & Scale Transitions (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 1 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one**. On each screen, discuss what data and requirement notes are needed one atomic decision at a time (`ask_question`), log choices in `decision-log.md` and `view-requirements.md`, and pull that data + requirement notes onto the screen's scaffolding view with LAN links and 5-viewport screenshots.

## Phase 1: Journey 1 Onboarding Briefing & Screen Sequence Alignment
- [ ] Task: Present the **Journey 1 Briefing**: Archetype 1 (*The Sci-Fi Reader / Space Enthusiast*), focus-centric mental model, core deal-breakers (spatial disorientation, spreadsheet syndrome), JTBDs (Interstellar Logistics, Sense of Scale, Habitability), and the 4-screen sequence.
- [ ] Task: Phase Verification & Checkpoint (Confirm readiness to step into Screen 1)

## Phase 2: Screen 1 — Galaxy View: Search, Target Framing & Intrinsic System Summary
- [ ] Task: Align one decision at a time on what search query/result data and intrinsic target summary data (e.g. *Tau Ceti*, zero default Sol distance) + requirement notes belong on `GalaxyView`; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement search matching and intrinsic system summary selectors with unit tests.
- [ ] Task: Layer the search & intrinsic system summary data and requirement notes onto the `GalaxyView` scaffolding screen.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL (`http://192.168.1.124:5173/galaxy`) + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Screen 2 — Galaxy View (Route Mode): 2-Point Measurement & Travel Benchmarks
- [ ] Task: Align one decision at a time on what 2-point route data (*Tau Ceti* ↔ *Sol*: Euclidean distance, one-way/round-trip light-speed delay, `0.05c` fusion, `1g` relativistic ship-time vs coordinate-time) + requirement notes belong on `GalaxyView`; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement 2-point travel & relativistic burn calculators and route state selectors with unit tests.
- [ ] Task: Layer the 2-point route benchmark data and requirement notes onto the `GalaxyView` scaffolding screen.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL (`http://192.168.1.124:5173/galaxy`) + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Screen 3 — System View: Stellar Barycentre, CHZ Bounds & Orbital Hierarchy
- [ ] Task: Align one decision at a time on what system-scale data (central star(s), Circumstellar Habitable Zone bounds in AU, Keplerian orbital ladder) + requirement notes belong on `SystemView`; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement `SystemView` hierarchy and CHZ selectors with unit tests.
- [ ] Task: Layer the system hierarchy data and requirement notes onto the `SystemView` scaffolding screen.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL (`http://192.168.1.124:5173/system/tau-ceti`) + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Screen 4 — Planet View: Planetary Inspection & Habitability Telemetry
- [ ] Task: Align one decision at a time on what planetary inspection data (e.g. *Tau Ceti e*: mass $M_\oplus$, surface gravity $g$, equilibrium temperature $K$, tidal-locking status, habitability evaluation) + requirement notes belong on `PlanetView`; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement `PlanetView` telemetry selectors with unit tests.
- [ ] Task: Layer the planetary inspection data and requirement notes onto the `PlanetView` scaffolding screen.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL (`http://192.168.1.124:5173/planet/tau-ceti-e`) + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
