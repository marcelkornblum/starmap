# Implementation Plan: Route & Measurement Mode

> **Status: Stub at archive time.** Delivered through Journeys 1 and 5; see the Closure Note.

## Phase 1: Measurement & Route Mode
- [x] Task: Implement contextual route initiation and measurement chord. — shipped as `buildDirectionsTriggerHref`, the Directions CTA, `?route=` + `DirectionsPanel` (`src/components/domain/DirectionsPanel/`) and the 3D chord `src/components/canvas/entity/JourneyChord.tsx` (+ `cartography/journeyChordGeometry.ts`)
- [ ] Task: Implement two-point framing (camera reframes to enclose both route endpoints). — **not shipped** (DEC-033 keeps focus unchanged; no framing code); → [backlog](../../../backlog.md) "Routing (future initiative)"
- [x] Task: Implement comms latency readout. — shipped as one-way and round-trip latency in `src/services/journey/journeyTypes.ts`, with transit maths in `journeyInterstellar.ts` / `journeyIntraSystem.ts`
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Interstellar Route Planner
- [ ] Task: Implement multi-waypoint route planner. — **not shipped** (journey routes remain gated as "coming soon"); → [backlog](../../../backlog.md) "Routing (future initiative)" with `FS-014`
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Closure Note (2026-11-17)

Archived as complete (decision T5 of the Conductor registry tidy, `chore/tracks-registry-tidy`); the `telemetry-container` dependency was dropped (it blocked a mostly-shipped track and had no technical basis). Quality Check and Phase Verification lines are left unticked: the shipped work was verified in Journeys 1 and 5. Residuals and where they went:

| Residual | Destination |
|---|---|
| Multi-waypoint route planner | [Backlog](../../../backlog.md) — "Routing (future initiative)" (seed, with `FS-014`) |
| Two-point route framing | [Backlog](../../../backlog.md) — "Routing (future initiative)" |
| Arbitrary-origin multi-leg networks (`FS-014`); epoch timing and conjunction blackouts (`FS-017`) | [Backlog](../../../backlog.md) — "Routing (future initiative)" |
