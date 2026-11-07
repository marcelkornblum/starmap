# Plan: T03 · Layering Cut

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006 / DEC-R021)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md
- [x] Task: Decide — Target module locations for shared types and maths (`DEC-R022`)
- [x] Task: Decide — Where prototype/showcase code lives (`DEC-R023`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation (detailed after Phase 1)
- [x] Task: Expand into Red/Green/Refactor tasks per ratified decisions
- [ ] Task: Extract shared types (`src/types/spatial.ts`, `src/types/search.ts`), pure spatial maths (`src/utils/spatialMath.ts`), and pure guide URL builders (`src/utils/url.ts`), and remove `canvas/math/astronomy.ts` shim & `QUADRANTS` / Euclidean distance duplication (`AUD-030`, `AUD-031`, `AUD-035`, `AUD-037`)
- [ ] Task: Break all service, router/view, search, and scene import cycles via `src/utils/datasetLayerCodec.ts`, `src/utils/navigationUrl.ts`, `src/hooks/useSpaLocation.ts`, and `src/components/canvas/scenes/GalacticCameraController.tsx` (`AUD-032`)
- [ ] Task: Move sector geometry helpers to `src/components/canvas/entity/sectorPointCloudGeometry.ts`, make `useCanvasStageStore` strictly serialisable, and relocate `PaletteShowcase` to `src/prototypes/PaletteShowcase/` (`AUD-033`, `AUD-034`, `AUD-036`)
- [ ] Task: Ratchet `scripts/guards/baseline.json` (`G-imports`, `eslint(no-restricted-imports)`, `G-imports-cycle`, `import(no-cycle)` -> 0) and run full quality check (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:guards`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `t03-audit-report.md`; update ledger statuses
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
