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

1. **Step 1 & 2 — Instrument Intersection, Active/Selected/Focused Systems & Galaxy `<BodiesPanel scope="galaxy" />`:**
   - Drive galactic candidate inclusion from **3D Cartographic Instrument intersection** (`isInsideAperture(systemPos, instrumentCenter, apertureRadius)` → `'active'` tier) combined with `'selected'` (`?select=`) and `'focused'` (`?focus=`) tiers—including every system that is **not `'passive'`**.
   - Support instrument centre (`?center=<systemId>` or `[?x=, ?y=, ?z=]`, defaulting to `sol`) and instrument scale/aperture radius (`?dist=` / `?zoom=` via `computeApertureRadius`).
   - Extend `<BodiesPanel scope="galaxy" />` on `GalaxyView` (the galactic equivalent of `System Bodies`, with **no orbital schematic**) to list all non-passive systems (`focused`, `selected`, `active`), exposing distance relative to the currently focused system (when a focus exists) alongside system designation, planet count, and habitability/hazard telemetry.
2. **Step 4 — Circumstellar Debris Disk & System Resource Audit Data Model:**
   - Precalculate circumstellar debris disks, dust belts, and asteroid belts across real-sky systems (e.g. *Sol*, *Epsilon Eridani*, *Tau Ceti*, *82 G. Eridani*, and other catalogued hosts) in the build-time data pipeline (`scripts/build-data.ts` and `src/utils/compactDataCodec.ts`).
   - Surface circumstellar disks/belts in `SystemManifest`, `<OrbitalSchematicList />` / `<BodiesPanel />`, and `<DetailsPanel />`.
3. **Deferred to Later UI / Backlog (`FS-014` & `FS-015`):**
   - *Step 3 (Multi-Point Arbitrary-Origin Network Plotting, Comms Latency Matrix & Speculative Propulsion Tiers):* Deferred to `FS-014` until ground-level UI is in place.
   - *Step 5 (Cluster Labelling & Full User Data Layer Saving/Management):* Deferred to Backlog (`FS-015` / `FS-002`).

## Acceptance Criteria
- [ ] Every active step of Journey 2 is interrogated one decision at a time with the user; all options and trade-offs are recorded in `decision-log.md`.
- [ ] On-screen data and action requirements discovered in Journey 2 are recorded in `view-requirements.md`.
- [ ] Pure TypeScript instrument-intersection selectors, galaxy `<BodiesPanel scope="galaxy" />` models, and build-time circumstellar disk precalculations are implemented with unit tests (>80% coverage).
- [ ] Scaffolding views allow stepping through Journey 2 on `http://192.168.1.124:5173` with multi-viewport Playwright screenshots captured.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
