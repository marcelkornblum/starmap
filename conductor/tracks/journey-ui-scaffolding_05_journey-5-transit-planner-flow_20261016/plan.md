# Implementation Plan: Journey 5 — Intra-System Transfer Logistics, Temporal Scrubbing & Conjunction Geometry (Data Model & Scaffolding Views)

> [!NOTE]
> **Completed via Track 01 (`DEC-033`) & Stage 1 Cross-Journey Rationalisation:**
> Intra-system route planning (`?route=earth,<target>` on `/system/sol` and `/planet/$planetSlug`), Hohmann transfer calculations ($\Delta v$, transit duration, synodic launch window period), continuous-thrust brachistochrone torchships ($0.1\text{ g}$, $0.3\text{ g}$, $1.0\text{ g}$), light-minute comms delay, and the 3D `<JourneyChord />` were implemented and verified in Track 01 (`DEC-033`, `src/services/journeyService.ts`, `src/components/domain/DirectionsPanel/DirectionsPanel.tsx`). By explicit user decision on 2026-10-20, `<ControlBar />` epoch orbital propagation and solar conjunction coronal blackout warnings are deferred to `FS-017` in [`conductor/backlog.md`](../../backlog.md) (coupled with `route-measurement_20261004`).

## Phase 1: Journey 5 Onboarding Briefing & Screen Sequence Alignment
- [x] Task: Present the **Journey 5 Briefing**: Archetypes 1 & 2 (*Intra-System Dynamics & Transit Planner Flow*), orbital alignment mental model (opposition vs conjunction), JTBDs (Hohmann ballistic vs continuous-thrust torchship comparison, light-minute comms delay, solar conjunction blackout), and align on the screen steps.
- [x] Task: Phase Verification & Checkpoint (Confirm readiness to step into Step 1)

## Phase 2: Step 1, 2 & 3 — Anchor Pairing & Temporal Scrubbing Layer
- [x] Task: Align on intra-system departure/arrival body selection (*Earth* $\to$ *Mars* / *Earth* $\to$ *Ganymede* via `?route=earth,<target>`) and defer `<ControlBar />` temporal orbital clock scrubbing to `FS-017` in `conductor/backlog.md`; record in `decision-log.md` (`DEC-033`) and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement intra-system Euclidean & orbital separation and light-minute comms delay selectors with unit tests (`src/services/journeyService.ts`, `tests/journeyServiceAndDirections.test.tsx`).
- [x] Task: Layer departure/arrival pairing, separation data, and requirement notes onto the ratified scaffolding views (`SystemView.tsx`, `PlanetView.tsx`, `DirectionsPanel.tsx`).
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 4 & 5 — Transfer Route Analysis & Solar Conjunction Blackout Layer
- [x] Task: Align on comparative transfer analysis (Hohmann ballistic $\Delta v$ / transit duration / launch window vs continuous-thrust brachistochrone at $0.1\text{ g}, 0.3\text{ g}, 1\text{ g}$) and defer coronal exclusion zone solar conjunction blackout detection to `FS-017` in `conductor/backlog.md`; record in `decision-log.md` (`DEC-033`) and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement Hohmann transfer and brachistochrone torchship calculators with unit tests (`src/services/journeyService.ts`, `tests/journeyServiceAndDirections.test.tsx`).
- [x] Task: Layer transfer route profiles and requirement notes onto the ratified scaffolding view (`DirectionsPanel.tsx`).
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Cross-Journey Synthesis & Stage 2 UI Track Sequencing
- [x] Task: Review the complete cumulative scaffolding views, `view-requirements.md`, `decision-log.md`, and `conductor/backlog.md` with the user.
- [x] Task: Cross-link and rationalise the Stage 2 Console Chrome, Telemetry, UI Surface, and Downstream 3D/Control tracks against the consolidated backlog (`FS-011`, `FS-012`, `FS-014`, `FS-016`, `FS-017`).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
