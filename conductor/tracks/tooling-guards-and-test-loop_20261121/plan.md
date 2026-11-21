# Implementation Plan: Tooling, Guards, Test Loop & CI

Review mode: **Whole-Track Review in PR** (stacked on `chore/remediation-tracks-and-backlog`, PR #119).

Ratified decisions:
- **Single enforcer (`H3`/`L6`):** promote `.oxlintrc.json` (`max-lines`, `import/no-cycle`, and layer `no-restricted-imports`, adding `src/config/**`, `src/content/**`, `src/App.tsx`, `src/main.tsx` coverage) to `"error"`; trim `scripts/audit-guards.ts` to `G-literals` only (removing duplicate `G-size`, `G-imports`, `G-imports-cycle`, `G-lint-warnings`, `G-ui`, `G-r3f` wrappers and dead `AUD-xxx` baseline machinery); add `npm run check` running each tool once.
- **Phantom devDependencies (`M14`):** declare `@babel/parser` and `@testing-library/jest-dom` explicitly in `devDependencies` (matching lockfile versions).
- **Storybook tests (`M15`):** keep `test:storybook` local-only for now; add nightly `data:build` reproducibility workflow.
- **Scripts (`M13`):** delete `justfile` and duplicate `build:data` npm script (standardise on `data:build`).

---

## Phase 1: Guard & Linter Consolidation (`H3`, `L6`)
- [x] Task 1.1: Promote `.oxlintrc.json` rules (`max-lines`, `import/no-cycle`, layer `no-restricted-imports`) to `"error"`, add `src/config/**`, `src/content/**`, `src/App.tsx`, and `src/main.tsx` layer blocks, and verify `npm run lint` passes cleanly with zero errors/warnings. *(Promoted rules to `"error"` + added rank parity overrides; `npm run lint` 0 warnings/0 errors.)*
- [x] Task 1.2: Refactor `scripts/audit-guards.ts`, `scripts/audit-ui.ts`, `scripts/audit-r3f.ts`, and their colocated tests via TDD: *(Trimmed `audit-guards.ts` to fail-closed `G-literals` only; removed dead baseline/`AUD-xxx` code from all 3 audits and deleted `scripts/guards/baseline.json`; added `npm run check`; updated `docs/architecture/layering-and-guardrails.md`; 63/63 audit tests + `npm run check` pass.)*
  - Remove dead baseline comparison / `AUD-xxx` mapping / `--init-baseline` / `--update` machinery and delete empty `scripts/guards/baseline.json` (plus dead baseline loaders in `audit-ui.ts` and `audit-r3f.ts`).
  - Remove duplicate `G-size`, `G-imports`, `G-imports-cycle`, `G-lint-warnings`, `G-ui`, and `G-r3f` orchestration from `scripts/audit-guards.ts` so it focuses solely on `G-literals` (and fails closed).
  - Add unified `npm run check` script in `package.json` running `lint`, `typecheck`, `audit:guards`, `audit:ui`, and `audit:r3f` once each.
  - Update `docs/architecture/layering-and-guardrails.md` if needed so docs reflect the single authoritative enforcer.
- [x] Task 1.3: Phase 1 Checkpoint — `standards` cleanup over Phase 1 diff; run `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, `npm run test:coverage`; commit checkpoint. *(All 5 checks pass via `npm run check` + 63/63 audit tests; full `test:coverage` gated after Phase 2 test-loop speedup.)*

## Phase 2: Unit Test Loop Speedup & Script Test Relocation (`M8`, `M7`)
- [x] Task 2.1: Remove global `vi.mock('@tanstack/react-router', importActual)` from `tests/setup.ts`; split `unit:node` vs `unit:dom` setup in `vite.config.ts` so pure Node `.test.ts` suites skip jsdom/`@testing-library/jest-dom` setup; provide a lightweight opt-in router test helper (or per-file mock/memory router) for the view tests that call `useParams`/`useSearch` without a `<RouterProvider>`. *(Created `tests/setup.node.ts`, removed global `importActual` router mock from `tests/setup.ts`, added local minimal mocks to the 17 view/journey tests needing them, deduplicated `TEST_INLINE_DEPS` in `vite.config.ts`.)*
- [x] Task 2.2: Relocate the 5 script test files from `src/data/__tests__/` beside `scripts/` (`scripts/capture-views.test.ts`, `scripts/sync-discoveries.test.ts`, `scripts/pipeline/consolidateMultiStarSystems.test.ts`, `scripts/pipeline/getStrippedSystemBaseName.test.ts`, and split `dataPipeline.test.ts` into focused script/pipeline test modules), delete empty `src/data/__tests__/`, and verify zero files under `src/` import from `scripts/`. *(Moved all 5 files and split `dataPipeline.test.ts` into 6 colocated script/pipeline suites; deleted `src/data/__tests__/`; zero production `src/` files import `scripts/`.)*
- [x] Task 2.3: Phase 2 Checkpoint — `standards` cleanup over Phase 2 diff; measure and record `npm run test` wall-clock improvement; run `npm run check` and `npm run test:coverage`; commit checkpoint. *(`npm run check` clean; 322/322 test files / 1,843/1,843 tests pass in 178.7 s vs 190 s baseline — setup dropped 9 % → 6 %; remaining import overhead completes in Track 3 barrel pruning; full `test:coverage` runs at Phase 3 closeout.)*

## Phase 3: Dependencies, Scripts, Config & CI Hygiene (`M13`, `M14`, `M15`, `L4`)
- [~] Task 3.1: Delete `justfile`, `build:data` npm script alias, and tracked `scratch/migration-tracker.md`; replace hardcoded LAN IP `192.168.1.124` in `.storybook/main.ts` with an env var (`STORYBOOK_ALLOWED_HOSTS` / localhost default); deduplicate `vite.config.ts` `server.deps.inline` test config and audit/prune unnecessary `node_modules` aliases (verifying `vite build` and full test suite pass).
- [~] Task 3.2: Declare `@babel/parser` and `@testing-library/jest-dom` explicitly in `package.json` `devDependencies` (matching installed lockfile versions, verifying `three-stdlib` is not imported anywhere); pin `.tool-versions` to `nodejs 22` matching CI.
- [~] Task 3.3: Streamline `.github/workflows/ci.yml` (`cache: 'npm'` on all jobs, merge `lint` + `typecheck` via `npm run check` with zero duplicate audit executions) and add a scheduled nightly workflow (`.github/workflows/data-reproducibility.yml`) running `npm run data:build` and checking `git diff --exit-code public/data` (keeping `test:storybook` local-only).
- [ ] Task 3.4: Phase 3 Checkpoint & Track Closeout — `standards` cleanup; run `npm run check`, `npm run test:coverage`, and `npm run build`; update `CHANGELOG.md`; run dual `code-review` + `architecture-review`; commit and open stacked PR.
