# Spec: T02 · User-Visible Correctness

## Overview

Fix defects that show wrong data or leak resources today. These include fabricated metric telemetry, the PlanarGrid geometry leak, NaN search parameters passed into camera maths, lossy codec round-trips, and fabricated system orbits. Resolving these ensures telemetry and scenes faithfully reflect catalogued data without resource leaks.

**Behaviour change:** Yes (bug fixes)
**Risk:** Low

**Track type:** Fix. Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-020 · AUD-021 · AUD-022 · AUD-023 · AUD-024 · AUD-092 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t02--user-visible-correctness)).

## Scope

### In scope
- AUD-020 — Metric comparison fabricates Tau Ceti / Tau Ceti e telemetry and shows it under any uncached or incomplete target's name; view never loads data
- AUD-021 — `PlanarGrid` creates a `BufferGeometry` inline in JSX per render; never disposed
- AUD-022 — `validateSearch` spreads unvalidated params; `Number('foo')` passes `NaN` into camera maths
- AUD-023 — `decodeSummaryNode` invents `properName` from `name` for non-Gaia IDs (lossy round-trip)
- AUD-024 — `SystemScene` fabricates Kepler orbits (`0.4 + index * 0.6` …) and `classification: 'terrestrial'` for planets lacking data
- AUD-092 — Multi-star spectral badges (`G2V+K1V`, `K3V + M`) link to broken `/guide/star-types/...` pages; Guide detail routes only resolve a single slug; `resolveMetricComparison` silently truncates multi-star/multi-planet systems to `stars[0]` / `planets[0]`; non-metric Guide detail views ignore `?focus=` (`DEC-R014k`)

### Out of scope
- Removing benchmark ID literals (owned by T05).
- Pipeline precalculation (owned by T04).

## Acceptance Criteria

- [ ] Every owned finding (AUD-020 … AUD-024, AUD-092) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines at zero: `G-r3f` (inline geometry rule).
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
