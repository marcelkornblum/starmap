# Initiative: Journey-Driven View Data Models & UI Scaffolding (`journey-ui-scaffolding`)

## Overview
Instead of prematurely designing and hardening isolated UI chrome or telemetry components in a vacuum, this initiative works systematically through the 5 canonical user journeys documented in [`docs/user-journeys.md`](../../../docs/user-journeys.md).

The initiative is structured into two distinct stages:

### Stage 1: Journey Feature Discovery, View Data Models & Progressive Scaffolding Views (Tracks 01–05)
- **Step 0 — Journey Onboarding Briefing:** At the start of each Journey Track, the agent presents a structured **Journey Briefing** covering the **User Archetype** (profile, mental model, core deal-breakers), relevant **Jobs to be Done (JTBD)**, and the **end-to-end narrative flow** so the user is grounded in the context before making decisions.
- **Screen-by-Screen Progressive Layering (Zero View or Route Assumptions):** Legacy POC views are quarantined in `src/views/poc/` (accessible under `/poc/*` for reference) and `/` starts as a completely blank slate. After the briefing, we step through the journey **screen by screen, one by one**:
  1. Discuss and ratify **which screen/view and URL path** is needed and **what** data, actions, and requirement notes belong on that screen (one atomic decision at a time via `ask_question`), recording options and trade-offs in [`decision-log.md`](./decision-log.md) and [`view-requirements.md`](./view-requirements.md).
  2. Implement the underlying view data models/selectors and **create or layer onto the ratified scaffolding view** with **zero final presentation or layout chrome assumptions**.
  3. Present live LAN links (`http://192.168.1.124:5173/...`) and 5-viewport Playwright screenshots (`npm run capture:views`) as each screen is layered.
- **Cumulative Layering Across Journeys 1–5:** Each journey track either creates a new scaffolding view (if ratified) or layers its newly discovered data fields, state transitions, and requirement notes onto the scaffolding views established in earlier journeys. By the end of Track 05, every discovered screen displays the cumulative data and annotated requirements required by all 5 user journeys.

### Stage 2: Console Chrome, Telemetry & UI Scaffolding (Flexible Placeholder Tracks)
- **Objective:** Once Stage 1 has layered all 5 journeys' data and requirement notes onto the scaffolding views, pattern-match across the complete on-screen inventory to sequence and execute the presentation and layout tracks (`console-ui-shell`, `telemetry-container`, and UI surface wiring/tightening).
- **Note on Sequencing:** The exact ordering and boundaries of Stage 2 tracks remain intentionally flexible until Stage 1 concludes.

---

## Initiative Artifacts
- [Decision Log](./decision-log.md) — Central register of options, trade-offs, provisional choices, and ratified decisions. Promoted to `docs/decision-log.md` upon initiative completion.
- [View Requirements Inventory](./view-requirements.md) — Cross-journey matrix of required on-screen data fields, user triggers, and requirement notes per view. Promoted to `docs/view-requirements.md` upon initiative completion.

---

## Track Breakdown

### Stage 1: Journey Feature Discovery & Progressive View Scaffolding (Active)
1. **Track 01:** [Journey 1 — Target Acquisition, System Summary, 2-Point Route & Scale Transitions (Data Model & Scaffolding Views)](../../tracks/journey-ui-scaffolding_01_journey-1-reader-flow_20261016/index.md)
2. **Track 02:** [Journey 2 — Spatial Anchor, Intent Filters, Candidate Sync & Multi-Leg Network (Data Model & Scaffolding Views)](../../tracks/journey-ui-scaffolding_02_journey-2-author-flow_20261016/index.md)
3. **Track 03:** [Journey 3 — Curated On-Ramps, Narrative Waypoints & Step-Through (Data Model & Scaffolding Views)](../../tracks/journey-ui-scaffolding_03_journey-3-explorer-flow_20261016/index.md)
4. **Track 04:** [Journey 4 — Classification Deep-Links, Encyclopedia Articles, Parameter Comparator & Category Index (Data Model & Scaffolding Views)](../../tracks/journey-ui-scaffolding_04_journey-4-encyclopedia-flow_20261016/index.md)
5. **Track 05:** [Journey 5 — Intra-System Transfer Logistics, Temporal Scrubbing & Conjunction Geometry (Data Model & Scaffolding Views)](../../tracks/journey-ui-scaffolding_05_journey-5-transit-planner-flow_20261016/index.md)

### Stage 2: UI Chrome, Telemetry & View Wiring (Flexible Placeholders — Post-Stage 1)
- [Console UI Shell (Flexible Stage 2 Placeholder)](../../tracks/console-ui-shell_20261004/index.md)
- [Telemetry Container & Dossiers (Flexible Stage 2 Placeholder)](../../tracks/telemetry-container_20261004/index.md)
- [Search & Discovery UI Surfaces (Flexible Stage 2 Placeholder)](../../tracks/search-discovery_20261004/index.md)
- [Route & Measurement UI Surfaces (Flexible Stage 2 Placeholder)](../../tracks/route-measurement_20261004/index.md)
