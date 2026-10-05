# Specification: Telemetry Container & Dossiers

> **Status: Stub.** Scope captured from `conductor/backlog.md`, `docs/feature-backlog.md` (retired) and Phase 5 of `3d-component-architecture_20261004`. Refine via `conductor-new-track` before implementation.

## Overview
Delivers the Adaptive Telemetry Container and the entity information surfaces it hosts, plus the Secondary Objects Pane.

## Scope

1. **Adaptive Telemetry Container**
   - Overlay and docked modes; mobile detents (peek / partial / full); multi-bay expansion on wide displays.
2. **Card Hierarchy & Rationalisation** (former Feature 8)
   - Summary, telemetry and system preview structured as one coherent hierarchy, avoiding component proliferation.
3. **Anchor-Independent Telemetry** (former Feature 4)
   - Intrinsic properties first; distance only when a secondary anchor or route is designated.
4. **Content Surfaces**
   - Real-time telemetry readouts and well (distance, apparent magnitude, radial velocity, light-travel time).
   - Orbital telemetry tables (Keplerian elements).
   - Celestial dossier sheets (spectral class, mass, radius, metallicity, habitability indicators).
   - Spectral classification hover tooltips (Morgan–Keenan decoding).
   - External authority deep-links: Wikipedia, NASA Exoplanet Archive, SIMBAD (former Feature 15).
5. **Secondary Objects Pane** *(moved from `3d-component-architecture` Phase 5)*
   - Bi-directional 2D list ↔ 3D map synchronisation (former Feature 7): row hover highlights reticle and vice versa; selection uses the unified pipeline from `console-ui-shell_20261004`.

## Out of Scope
- Route / measurement planning (`route-measurement_20261004`).
- Tour waypoint card (backlog).

## Acceptance Criteria
- [ ] Container supports overlay, docked, detent and multi-bay states.
- [ ] Single card hierarchy covers summary, telemetry and dossier content.
- [ ] No distance shown without an explicit anchor.
- [ ] Secondary Objects Pane hover/select syncs with 3D reticles in both directions.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
