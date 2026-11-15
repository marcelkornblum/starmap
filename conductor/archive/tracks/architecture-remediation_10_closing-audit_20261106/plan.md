# Plan: T10 · Closing Audit

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006) (`DEC-R058`: Whole-Track Review in PR)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md (`DEC-R058` .. `DEC-R060`)
- [x] Task: Decide — Archival and doc promotion scope (`DEC-R060`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation
- [x] Task 2.1 (`AUD-151`, `DEC-R061` — Fresh Six-Area Audit & Surgical Upstream-Ledger Closure): Execute independent six-area architecture audit from scratch across Layering/Navigation, Data Pipeline/Codecs, Services/Domain Logic, 3D WebGL/R3F Hot Paths, UI Design System/CUBE CSS, and Test/Tooling/Guards; remediate the 3 upstream High/colocation gaps (`AUD-085` `useGalaxyStoreSync` effect move, `AUD-091`/`DEC-R014f` `?layer=` selection independence, `AUD-003` guard tests colocated in `scripts/*.test.ts`) and confirm zero Critical/High findings
- [x] Task 2.2 (`DEC-R059`, `DEC-R061` — `.oxlintrc.json` Scoping, Baseline Ratchet & Follow-On Track): Scope `.oxlintrc.json` `max-lines` to exclude `**/*.test.*`, `tests/**`, `e2e/**`, `scripts/**`, and `content/**`; ratchet `scripts/guards/baseline.json` downward (`112 -> 98` entries); and scaffold follow-on chore track `guard-baseline-zero-and-module-decomposition_20261114` capturing remaining service/codec/canvas decomposition and Medium/Low audit follow-ons
- [x] Task 2.3 (`AUD-150`, `DEC-R060` — Target Architecture Promotion & Docs Drift Remediation): Author/replace `docs/architecture/{3d-canvas-management,routing-and-state,layering-and-guardrails,data-pipeline-and-codecs}.md`; remediate drift in `docs/design-system.md`, `docs/3d-spatial-architecture.md`, `docs/scene-requirements.md`, `docs/README.md`, `conductor/tech-stack.md`, `conductor/code_styleguides/components.md`, and root `README.md`
- [x] Task 2.4 (`DEC-R060` — Initiative & Track Archival + Feature-Freeze Lift): Archive `conductor/initiatives/architecture-remediation/` -> `conductor/archive/initiatives/architecture-remediation/` and `conductor/tracks/architecture-remediation_*` -> `conductor/archive/tracks/`, update `conductor/tracks.md` and `conductor/index.md`, and lift the `DEC-R003` feature freeze
- [x] Task 2.5: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:guards`, `npm run build`, `npm run build-storybook`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [x] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
