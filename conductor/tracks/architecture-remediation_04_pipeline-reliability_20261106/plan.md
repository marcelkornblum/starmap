# Plan: T04 · Pipeline Reliability & Precalculation

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006 -> DEC-R024)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md
- [x] Task: Decide — Seed data file format and location (`DEC-R025`: `data/seed/*.json` with typed loader)
- [x] Task: Decide — Handling of objects without measured distances (`DEC-R026`: parse real distances in Cantat-Gaudin/Harris/ATNF/OpenNGC/seed, drop unmeasured 2D rows, log `FS-018` in backlog)
- [x] Task: Decide — Canonical sector shard format (`DEC-R027`: `.bin` only, delete `.json` sectors, `buildCsvDataPipeline`, and legacy key branch; retain `stars.json` as reference)
- [x] Task: Decide — Build timestamp source for determinism (`DEC-R028`: `SOURCE_DATE_EPOCH` + `data/seed/build-epoch.json`, with `just data-refresh` / `npm run data:refresh`)
- [x] Task: Decide — Precalculated field schema for classification, satellites and reticle type (`DEC-R029`: `v: 1` headers/envelopes, named search decoder, `SystemSummaryNode.classification`, `PlanetRecord.satellites`, mandatory `reticleType` & `composition`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation
- [x] Task: Extract curated seed data (`AUD-042`, `AUD-043`, `DEC-R025`) into `data/seed/*.json` (`iau-star-names.json`, `recons-10pc.json`, `name-exoworlds.json`, `aavso-variables.json`, `galactic-structures.json`, `solar-system-bodies.json`, `circumstellar-disks.json`, `system-aliases.json`, `constellations.json`, `build-epoch.json`) with typed loader `scripts/pipeline/seedCatalogs.ts`
- [x] Task: Harden `scripts/fetch-sources.ts` & `scripts/sync-discoveries.ts` (`AUD-041`, `AUD-049`, `DEC-R028`): add timeout + exponential backoff retry, fail-fast non-zero exit code on mandatory source failure, shared CSV parser (`scripts/pipeline/csvParser.ts`), `--refresh-epoch` support, and `just data-refresh` / `npm run data:refresh`
- [x] Task: Remove 3-tuple `planetCompositionCounts` shim (`AUD-046`), add versioned wire formats (`v: 1` in binary sector header & JSON envelopes, `AUD-048`), move domain rules out of `src/utils/compactDataCodec.ts` (`AUD-045`), add `decodeCompactSearchEntry` named accessors (`AUD-048`), and add precalculated `SystemSummaryNode.classification`, `PlanetRecord.satellites`, `reticleType`, and `composition` (`AUD-051`, `DEC-R029`)
- [x] Task: Decompose `scripts/build-data.ts` into modular pipeline stages under `scripts/pipeline/*.ts` (`<= 300` lines each, `AUD-050`), fix real distance parsing & drop unmeasured 2D rows (`AUD-044`, `DEC-R026`), remove `.json` sectors, `buildCsvDataPipeline`, and legacy key branch while keeping `stars.json` (`AUD-047`, `DEC-R027`), and wire deterministic build timestamps (`AUD-040`, `DEC-R028`)
- [x] Task: Write comprehensive unit & fixture tests for pipeline reliability (`fetch-sources`, `sync-discoveries`, `csvParser`), `buildGaiaDataPipeline` determinism & precalculation (`AUD-040`, `AUD-050`, `AUD-051`), and versioned `binarySectorCodec` / `compactDataCodec` (`AUD-045`–`AUD-048`); regenerate data shards via `npm run data:build` and verify two consecutive runs are byte-identical
- [x] Task: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, guard suite (`npx tsx scripts/audit-guards.ts --update`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
