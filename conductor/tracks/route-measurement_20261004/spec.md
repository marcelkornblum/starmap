# Specification: Route & Measurement UI Surfaces

> [!IMPORTANT]
> **Stage 2 Flexible Placeholder (`journey-ui-scaffolding`):**
> Underlying 2-point, multi-leg, and intra-system route calculation data models are established in Stage 1 (Tracks 01, 02 & 05). This Stage 2 track covers the UI presentation surfaces and 3D chord overlays to be sequenced and refined against the [View Requirements Inventory](../../initiatives/journey-ui-scaffolding/view-requirements.md) and [Decision Log](../../initiatives/journey-ui-scaffolding/decision-log.md) after Stage 1 completes.

## Overview
Delivers point-to-point measurement and interstellar route planning.

## Scope

1. **Contextual Route Initiation** (former Feature 12)
   - Started from an active entity's card with one endpoint pre-set; no detached global menu.
2. **Dedicated Route Mode with Two-Point Framing** (former Feature 3)
   - Camera reframes to enclose both systems; direct 3D measurement chord rendered.
3. **Light-Speed Comms Latency Readout** (former Feature 5)
   - One-way and round-trip lag on every distance chord.
4. **Interstellar Route Planner**
   - Waypoint-based trajectory chain with travel vectors and transit times.

## Out of Scope
- Route history & bookmarks (`FS-002` / `FS-015` in [`conductor/backlog.md`](../../backlog.md)) and arbitrary-origin multi-leg route networks, epoch orbital timing & solar conjunction blackouts (`FS-014` / `FS-017` in [`conductor/backlog.md`](../../backlog.md)).

## Acceptance Criteria
- [ ] Route initiated from an entity card with pre-set origin.
- [ ] Camera frames both endpoints; chord distance correct (tested against astro maths).
- [ ] Comms latency correct for one-way and round-trip (tested).
- [ ] Multi-waypoint route computes per-leg and total transit.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
