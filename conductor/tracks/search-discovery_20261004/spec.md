# Specification: Search & Discovery

> **Status: Stub.** Scope captured from `conductor/backlog.md` and `docs/feature-backlog.md` (retired). Refine via `conductor-new-track` before implementation.

## Overview
Delivers the search entry point and catalogue filtering surfaces, feeding results into the unified selection pipeline.

## Scope

1. **Floating Search Pill & Autocomplete Panel**
   - Anchored result sheet showing POIs, coordinates and classification badges.
2. **Contextual Search Scoping with Scope Switcher** (former Feature 14)
   - Galaxy: all systems. System: within active system. Planet: moons, rings, surface features.
   - Scope switcher chip (`In this System` / `All Systems`) to broaden or narrow without leaving the input.
3. **Deep Catalog Filter Drawer with High-Level Intent Filters** (former Feature 6)
   - Multi-variable filtering (distance, spectral type, habitability index, exoplanet count).
   - Intent filters: Habitable Zone, Exoplanet Host, Multi-Star System, Debris Disk / Asteroid Belt.

## Out of Scope
- Command palette (backlog — prototype only, needs full build).
- 3D-synchronised search framing (`3d-engine-implementation_20260929`).
- Tags and saved filter sets (backlog).

## Acceptance Criteria
- [ ] Search results dispatch the unified selection pipeline.
- [ ] Scope defaults per view level and switches via the chip.
- [ ] Intent filters resolve to correct catalogue criteria (tested).
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
