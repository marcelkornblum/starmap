# Plan: T05 · Runtime Data Purity

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md
- [x] Task: Decide — StructuredQuantity shape for multi-value quantities (`DEC-R031`)
- [x] Task: Decide — Guide catalogue as data shard vs editorial content module (`DEC-R032`)
- [x] Task: Decide — Benchmark/default entity configuration location (`DEC-R033`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation (detailed after Phase 1)
- [ ] Task: Task 1 — Centralize Reference Targets & Educational Baselines (`src/config/referenceTargets.ts`, `AUD-060`, `AUD-061`, `AUD-072`)
- [ ] Task: Task 2 — Decompose Guide Catalogue into Modular Content Package (`src/content/guide/`, `AUD-071`)
- [ ] Task: Task 3 — Remove Divergent Classifiers & Spectral Regex (`AUD-064`, `AUD-065`, `AUD-069`)
- [ ] Task: Task 4 — Refactor StructuredQuantity, Delete String Formatting in Services, & Remove Substring Slicing (`AUD-066`, `AUD-067`, `AUD-068`)
- [ ] Task: Task 5 — Pure Data-Driven Parentage in Details Services & Dynamic Satellites in PlanetScene (`AUD-062`, `AUD-063`)
- [ ] Task: Task 6 — Remove Legacy Shims & Unchecked Casts (`AUD-070`, `AUD-073`, `G-shims`)
- [ ] Task: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, guard suite
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
