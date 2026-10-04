# Specification: Route & Measurement Mode

> **Status: Stub.** Scope captured from `conductor/backlog.md` and `docs/feature-backlog.md` (retired). Refine via `conductor-new-track` before implementation.

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
- Route history & bookmarks, warp/transit alerts, comms-lag conversation simulator (backlog).

## Acceptance Criteria
- [ ] Route initiated from an entity card with pre-set origin.
- [ ] Camera frames both endpoints; chord distance correct (tested against astro maths).
- [ ] Comms latency correct for one-way and round-trip (tested).
- [ ] Multi-waypoint route computes per-leg and total transit.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
