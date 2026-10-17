# Specification: Journey 3 Data Model & Feature Requirements (The Casual Explorer Flow)

> [!CAUTION]
> **STRICT STAGE 1 RULE — CLEAN SLATE VIEWS & WHAT ON-SCREEN, NOT HOW TO PRESENT IT:**
> This track defines **only** the required screens/views, URL paths, features, view data models, selectors, and interface state logic for Journey 3 ([`docs/user-journeys.md`](../../../docs/user-journeys.md#L70-L76)).
> - **Zero Pre-Assumed Views or Paths:** Do NOT assume view names or URL paths ahead of time; decide whether each step layers onto an existing scaffolding view or introduces a new view/route.
> - **Zero Presentation Assumptions:** Do NOT design tour card visuals, dock chrome, or layout styling.
> - **One Decision at a Time:** Every screen boundary, curated collection schema, waypoint data field, and transition action must be discussed one by one with the user via `ask_question`, recording options and trade-offs in [`decision-log.md`](../../initiatives/journey-ui-scaffolding/decision-log.md) and [`view-requirements.md`](../../initiatives/journey-ui-scaffolding/view-requirements.md).

## Overview
Walks step-by-step through **Journey 3: Serendipitous Discovery (The Casual Explorer Flow)** to define and implement the data models and state logic for curated entry prompts ("Newly Discovered Exoplanet", "Extreme Worlds", "Surprise Me"), glanceable narrative hooks with metadata tags, and sequential tour waypoint navigation (`Previous` / `Next` / `Enter System` / `Expand Telemetry`).

## Scope (Journey 3 Steps)

1. **Step 1 — Curated On-Ramp & Collection Data Model:**
   - Define the schema for curated discovery collections and random/serendipitous selection ("Surprise Me").
2. **Step 2 — Glanceable Narrative Waypoint & Tag Data Model:**
   - Define the waypoint view model: target entity reference, 2-sentence scientific significance hook, thematic metadata tags (`Habitable Zone`, `Super-Earth`, `Recent JWST Target`), and target scale/camera framing hints.
3. **Step 3 — Step-Through Waypoint State Machine:**
   - Define the tour/highlight stepping state (`activeCollectionId`, `currentWaypointIndex`, `prevWaypoint()`, `nextWaypoint()`, `exitTour()`).
4. **Step 4 — Fluid Inspection Transition Actions:**
   - Define the state transition from a glanceable waypoint into full system/planet telemetry without losing tour context.

## Acceptance Criteria
- [ ] Every step of Journey 3 is interrogated one decision at a time with the user; all options and trade-offs are recorded in `decision-log.md`.
- [ ] On-screen data and action requirements discovered in Journey 3 are recorded in `view-requirements.md`.
- [ ] Pure TypeScript curated collection schemas, waypoint selectors, and tour state logic are implemented with unit tests (>80% coverage).
- [ ] Scaffolding views allow stepping through Journey 3 on `http://192.168.1.124:5173` with multi-viewport Playwright screenshots captured.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
