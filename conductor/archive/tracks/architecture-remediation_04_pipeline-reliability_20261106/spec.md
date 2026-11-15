# Spec: T04 · Pipeline Reliability & Precalculation

## Overview

Make the build-time pipeline deterministic, fail-fast, and tested. Move curated catalogues and alias tables into seed data, and move domain rules out of the codec into pipeline precalculation. Version wire formats and emit the precalculated fields T05 needs. Note: this track may run in a parallel git worktree per DEC-R003.

**Behaviour change:** Data shape
**Risk:** Medium

**Track type:** Refactor. Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-040 · AUD-041 · AUD-042 · AUD-043 · AUD-044 · AUD-045 · AUD-046 · AUD-047 · AUD-048 · AUD-049 · AUD-050 · AUD-051 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t04--pipeline-reliability--precalculation)).

## Scope

### In scope
- AUD-040 — Non-deterministic `new Date().toISOString()` stamped into 15+ outputs
- AUD-041 — Fetch errors swallowed (exit 0); no timeout/retry; `sync-discoveries` silently falls back to `[]`
- AUD-042 — ~1,700 lines of curated catalogues embedded as TS literals in the fetch script and dumped at runtime
- AUD-043 — Hardcoded alias dictionaries (system names, disk hosts) and 90-line constellation list in pipeline code
- AUD-044 — Placeholder representative distances for SNRs/pulsars/Barnard/NGC (1500/800/300/1200/2500 pc) presented as positions
- AUD-045 — Codec encodes domain rules: Sol→`sol-A`, HZ 0.75–1.77 AU, belt/Kuiper bands, search tier by ID prefix, survey prose
- AUD-046 — Legacy 3-tuple `planetCompositionCounts` union retained
- AUD-047 — Duplicate outputs (`sector_*.json` + `.bin`, 50 MB `stars.json`); dead `buildCsvDataPipeline`; "backward compatibility" key branch
- AUD-048 — No format version in binary header or JSON envelopes; positional tuples leak to consumers
- AUD-049 — Naive `line.split(',')` CSV parsing duplicated
- AUD-050 — `build-data.ts` 3,945-line god module; production `buildGaiaDataPipeline` untested
- AUD-051 — Runtime needs precalculated fields that do not exist: compact-object/stellar classification, natural satellites, per-entity reticle type

### Out of scope
- Runtime consumers of new fields (owned by T05).

## Acceptance Criteria

- [ ] Every owned finding (AUD-040 … AUD-051) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines at zero: `G-shims` (3-tuple), `G-size` (scripts).
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
