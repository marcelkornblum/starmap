# Specification: Journey 1 Data Model & Feature Requirements (The Reader Flow)

> [!CAUTION]
> **STRICT STAGE 1 RULE — WHAT ON-SCREEN, NOT HOW TO PRESENT IT:**
> This track defines **only** the required features, view data models, selectors, and interface state logic for Journey 1 ([`docs/user-journeys.md`](../../../docs/user-journeys.md#L44-L53)).
> - **Zero Presentation Assumptions:** Do NOT design UI chrome, layout splits, panel detents, or visual components.
> - **One Decision at a Time:** Every data field, calculation contract, and user action must be broken into small, atomic pieces and discussed one by one with the user via `ask_question`, recording options and trade-offs in [`decision-log.md`](../../initiatives/journey-ui-scaffolding/decision-log.md) and [`view-requirements.md`](../../initiatives/journey-ui-scaffolding/view-requirements.md).

## Overview
Walks step-by-step through **Journey 1: Target Acquisition & Travel Planning (The Reader Flow)** to define and implement the underlying view data models, query selectors, and state transitions across Galaxy, System, and Planet scales, rendered into a minimal diagnostic harness on the live routes for LAN review.

## Scope (Journey 1 Steps)

1. **Step 1 — Entry & Search Query Data Model (Galaxy Scale):**
   - Define the search query contract matching proper names, Bayer designations (`tau Cet`), and catalogue IDs.
   - Define the candidate result view model (what fields a search result item must expose to the view).
2. **Step 2 — Target Selection & Intrinsic System Summary Data Model (Galaxy Scale):**
   - Define the intrinsic system view model when a target star (e.g. *Tau Ceti*) is focused: stellar components, spectral classification, confirmed planet summary, hazard indicators, narrative fields, and astrometric attribution.
   - Enforce the strict rule: zero unprompted Sol distances unless a secondary anchor is explicitly set.
3. **Step 3 — Two-Point Route & Travel Benchmark Data Model (Galaxy Scale):**
   - Define the 2-point measurement state (Primary Target ↔ Secondary Anchor, e.g. *Tau Ceti* ↔ *Sol*).
   - Define the travel benchmark calculation contract: 3D Euclidean separation, one-way/round-trip light-speed comms delay, sub-light propulsion benchmarks (e.g. `0.05c`), and relativistic constant-acceleration burn (`1g` ship-time vs coordinate-time).
4. **Step 4 — System Scale View Data Model (`SystemView`):**
   - Define the data model required when entering a stellar system: host star(s), circumstellar Habitable Zone (CHZ) bounds in AU, Keplerian orbital hierarchy ordered by semi-major axis, and minor body / debris disk inventory.
5. **Step 5 — Planetary Inspection View Data Model (`PlanetView`):**
   - Define the data model required when selecting and inspecting a specific planet (e.g. *Tau Ceti e*): physical parameters ($M_\oplus$, $R_\oplus$, estimated surface gravity $g$, equilibrium temperature $K$, orbital period, eccentricity, tidal-locking status, habitability classification).
6. **Minimal Diagnostic View Harness:**
   - Render the raw structured view data models and action triggers on the live routes so the user can step through Journey 1 end-to-end over LAN (`http://192.168.1.124:5173`) and review multi-viewport screenshots.

## Acceptance Criteria
- [ ] Every step of Journey 1 is interrogated one decision at a time with the user; all options and trade-offs are recorded in `decision-log.md`.
- [ ] On-screen data and action requirements for `GalaxyView`, `SystemView`, and `PlanetView` discovered in Journey 1 are recorded in `view-requirements.md`.
- [ ] Pure TypeScript view data models, selectors, and astro-math travel/relativistic helpers are implemented with unit tests (>80% coverage).
- [ ] Minimal diagnostic view harness allows stepping through Journey 1 on `http://192.168.1.124:5173` with multi-viewport Playwright screenshots captured.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
