# Specification: Journey 2 Data Model & Feature Requirements (The Author Flow)

> [!CAUTION]
> **STRICT STAGE 1 RULE — CLEAN SLATE VIEWS & WHAT ON-SCREEN, NOT HOW TO PRESENT IT:**
> This track defines **only** the required screens/views, URL paths, features, view data models, selectors, and interface state logic for Journey 2 ([`docs/user-journeys.md`](../../../docs/user-journeys.md#L55-L68)).
> - **Zero Pre-Assumed Views or Paths:** Do NOT assume view names or URL paths ahead of time; decide whether each step layers onto a scaffolding view from Track 01 or introduces a new view/route.
> - **Zero Presentation Assumptions:** Do NOT design UI chrome, filter drawers, or visual components.
> - **One Decision at a Time:** Every screen boundary, filter criterion, network leg model, and URL serialisation parameter must be discussed one by one with the user via `ask_question`, recording options and trade-offs in [`decision-log.md`](../../initiatives/journey-ui-scaffolding/decision-log.md) and [`view-requirements.md`](../../initiatives/journey-ui-scaffolding/view-requirements.md).

## Overview
Walks step-by-step through **Journey 2: Candidate Hunting & Territory Mapping (The Author Flow)** to define and implement the view data models and state logic for primary spatial anchors, intent-based starfield filtering, 2D ↔ 3D candidate list synchronisation, multi-point route networks, and URL state serialisation.

## Scope (Journey 2 Steps)

1. **Step 1 — Primary Spatial Anchor & Intent Filter Data Model:**
   - Define the Primary Spatial Anchor state (e.g. *Epsilon Eridani*) and radial distance filtering ($\le 15\text{ ly}$ from anchor).
   - Define high-level Intent Filter predicates (e.g. `"Habitable Zone"`, `"Exoplanet Host"`, `"Multi-Star System"`, `"Debris Disk"`) mapping to astrophysical catalogue criteria.
2. **Step 2 — Synchronised Candidate List & 3D Highlight State Model:**
   - Define the matched candidate list view model (system designation, distance from active anchor, planet count, match flags) and bi-directional hover/selection state (`hoveredEntityId`, `selectedEntityId`, `matchedEntityIds`).
3. **Step 3 — Multi-Point Network Plotting & Speculative Propulsion Data Model:**
   - Define the ordered waypoint chain state ($N \ge 2$ systems, e.g. *Epsilon Eridani* $\to$ *Tau Ceti* $\to$ *82 G. Eridani*).
   - Define per-leg and total network metrics: total distance, comms latency matrix, and transit times across selectable speculative propulsion tiers (e.g. `0.02c` generation ship, `0.5g` / `1g` torchship with relativistic time dilation, custom multipliers).
4. **Step 4 — System Resource & Debris Disk Audit Data Model:**
   - Extend the system-inspection data model to expose circumstellar debris disks, asteroid belts, and resource/hazard inventory metadata.
5. **Step 5 — Cluster Labelling & Deep-Link State Serialisation:**
   - Define the serialisable URL/bookmark state schema encoding active anchor, filter criteria, route waypoint chain, cluster label, and camera orientation.

## Acceptance Criteria
- [ ] Every step of Journey 2 is interrogated one decision at a time with the user; all options and trade-offs are recorded in `decision-log.md`.
- [ ] On-screen data and action requirements discovered in Journey 2 are recorded in `view-requirements.md`.
- [ ] Pure TypeScript filter predicates, multi-leg route calculators, and URL state serialisers are implemented with unit tests (>80% coverage).
- [ ] Scaffolding views allow stepping through Journey 2 on `http://192.168.1.124:5173` with multi-viewport Playwright screenshots captured.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
