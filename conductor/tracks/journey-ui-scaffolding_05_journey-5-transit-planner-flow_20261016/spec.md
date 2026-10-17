# Specification: Journey 5 Data Model & Feature Requirements (Intra-System Logistics & Orbital Timing)

> [!CAUTION]
> **STRICT STAGE 1 RULE — WHAT ON-SCREEN, NOT HOW TO PRESENT IT:**
> This track defines **only** the required features, view data models, selectors, and interface state logic for Journey 5 ([`docs/user-journeys.md`](../../../docs/user-journeys.md#L94-L103)).
> - **Zero Presentation Assumptions:** Do NOT design timeline scrubber visuals, HUD docks, or transfer panel chrome.
> - **One Decision at a Time:** Every orbital propagation parameter, transfer calculation model, and solar conjunction threshold must be discussed one by one with the user via `ask_question`, recording options and trade-offs in [`decision-log.md`](../../initiatives/journey-ui-scaffolding/decision-log.md) and [`view-requirements.md`](../../initiatives/journey-ui-scaffolding/view-requirements.md).

## Overview
Walks step-by-step through **Journey 5: Intra-System Logistics & Orbital Timing (The Transit Planner Flow)** to define and implement the view data models, orbital mechanics calculators, and state transitions for intra-system departure/arrival selection, temporal epoch scrubbing, instantaneous separation and comms delay, Hohmann vs continuous-thrust brachistochrone transfer profiles, and solar conjunction blackout detection.

## Scope (Journey 5 Steps)

1. **Step 1 — Intra-System Departure & Arrival Anchor Data Model (`SystemView`):**
   - Define the selection state for pairing two orbital bodies within a stellar system (e.g. *Earth* $\to$ *Mars* or *Tau Ceti e* $\to$ *Tau Ceti f*).
2. **Step 2 & 3 — Temporal Epoch Scrubbing & Instantaneous Orbital Separation Model:**
   - Define the temporal state (`epochTime`, `timeMultiplier`, `isPlaying`) driving Keplerian mean anomaly propagation across all bodies in the active system.
   - Compute instantaneous 3D positions, Euclidean separation in AU, one-way/round-trip light-minute comms latency, and alignment phase (conjunction vs opposition).
3. **Step 4 — Comparative Transfer Route Analysis Data Model:**
   - Define the calculation and view data contract for:
     - **Ballistic Hohmann Transfer:** Semi-major axis of transfer ellipse, $\Delta v$ budget ($\text{km/s}$), transit duration (days/months), and synodic launch window phase angle.
     - **Continuous-Thrust Torchship (Brachistochrone):** Flip-and-burn transit time and peak velocity across selectable constant accelerations ($0.1\text{ g}$, $0.5\text{ g}$, $1\text{ g}$) at the current instantaneous separation.
4. **Step 5 — Line-of-Sight Comms Geometry & Solar Conjunction Blackout Detection:**
   - Define the geometric ray-sphere / coronal exclusion zone intersection check between departure and arrival bodies relative to the central star(s), flagging solar conjunction comms blackout status.
5. **Stage 1 Synthesis & Stage 2 Sequencing Review:**
   - Upon completing Journey 5, review the complete `view-requirements.md` and `decision-log.md` across all 5 journeys with the user to ratify the exact structure and sequence of the Stage 2 UI Chrome, Telemetry, and View Wiring tracks.

## Acceptance Criteria
- [ ] Every step of Journey 5 is interrogated one decision at a time with the user; all options and trade-offs are recorded in `decision-log.md`.
- [ ] On-screen data and action requirements discovered in Journey 5 are recorded in `view-requirements.md`.
- [ ] Pure TypeScript orbital propagation, Hohmann transfer, brachistochrone torchship, and solar conjunction blackout calculators are implemented with unit tests (>80% coverage).
- [ ] Minimal diagnostic view harness allows stepping through Journey 5 on `http://192.168.1.124:5173` with multi-viewport Playwright screenshots captured.
- [ ] Cross-journey synthesis review conducted with the user to confirm Stage 2 UI track boundaries.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
