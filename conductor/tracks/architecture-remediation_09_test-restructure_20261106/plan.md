# Plan: T09 · Test Restructure

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006) (`DEC-R054`)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md (`DEC-R054` .. `DEC-R057`)
- [x] Task: Decide — jsdom default vs split unit/DOM projects (`DEC-R055`: split `unit:node` + `unit:dom`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation
- [ ] Task 2.1 (Wave 1 — Infrastructure): Install `@react-three/test-renderer`, configure split `unit:node` (`**/*.test.ts`) + `unit:dom` (`**/*.test.tsx`) projects and Three.js/R3F deduplication/inlining in `vite.config.ts`, update `tests/setup.ts`, relocate shared fixtures to `tests/fixtures/`, strip per-file `@vitest-environment` pragmas, and remove self-flagging `renderToString` literal in `auditUi.test.ts` (`AUD-143`, `AUD-144`, `DEC-R055`, `DEC-R057`)
- [ ] Task 2.2 (Wave 2A — Services, Search Helpers, Utils, Stores, Hooks & Router): Split `tests/searchService.test.ts`, `tests/detailsServiceAndPanel.test.tsx`, `tests/journeyServiceAndPanel.test.tsx`, and `tests/layerCardAndExplore.test.tsx` into 1:1 colocated tests across `src/services/**`, `src/services/details/**`, and `src/components/domain/Search/**`; colocate `src/utils/**`, `src/stores/**` (replacing `toBeDefined()` smoke tests), `src/hooks/**` (`renderHook`, zero `react(globals)`), and `src/router/router.test.tsx` (Testing Library queries, zero `renderHtml`) (`AUD-140`, `AUD-141`, `AUD-142`, `AUD-145`)
- [ ] Task 2.3 (Wave 2B — Views & Guide Service): Create 1:1 colocated tests for all 23 modules in `src/views/**` plus `src/services/guideService.test.ts`, splitting and deleting `tests/guideViews.test.tsx` (`AUD-142`)
- [ ] Task 2.4 (Wave 2C — Interface Primitives & Domain Shells): Consolidate single-module primitive and shell suites from `tests/` into colocated `src/components/interface/**` and `src/components/domain/{SpatialShell,CanvasLayer}/**` tests, migrating `renderToString` to `@testing-library/react` and removing `react(globals)`, `as any`, `act()`, and R3F DOM warnings (`AUD-004`, `AUD-144`, `AUD-145`)
- [ ] Task 2.5 (Wave 2D — 3D Canvas `@react-three/test-renderer` Colocation & Journey Flows): Relocate all single-module 3D canvas suites from `tests/` into colocated 1:1 `src/components/canvas/**` tests using `@react-three/test-renderer` (zero `renderToString`, zero `react-dom` R3F tag warnings, zero `react(globals)`), and refactor cross-module `tests/journey*Flow.test.tsx` + `tests/searchAndFocusIntegration.test.tsx` to Testing Library queries with `act()`-wrapped updates (`AUD-004`, `AUD-144`, `DEC-R056`, `DEC-R057`)
- [ ] Task 2.6 (Wave 3 — Baseline Ratchet & Full QA Gate): Ratchet `scripts/guards/baseline.json` (`react(globals)` -> `0`, `forbidden-rendertostring` -> `0`) and pass `npm run lint`, `npm run typecheck`, `npm run test:coverage` (zero runner warnings), `npm run audit:ui`, `npm run audit:r3f`, and `npm run audit:guards`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
