# Plan: T02 · User-Visible Correctness

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006 / DEC-R017)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md
- [x] Task: Decide — Metric comparison loading and 'not catalogued' presentation (DEC-R018)
- [x] Task: Decide — SystemScene behaviour for planets without orbital elements (DEC-R019)
- [x] Task: Decide — Multi-star / multi-planet system expansion in MetricComparativePanel (DEC-R020)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation (detailed after Phase 1)
- [ ] Task: **AUD-021 (`PlanarGrid` Inline Geometry Leak)** — Extract memoised `<PlanarFootprintItem />` in `src/components/canvas/instrument/PlanarGrid.tsx` using `useMemo` + `useEffect` `.dispose()`, add unit tests in `src/components/canvas/instrument/__tests__/PlanarGrid.test.tsx` asserting geometry identity stability and disposal on unmount, and ratchet `G-r3f` (`no-inline-jsx-geometry`) to `0` in `scripts/guards/baseline.json`.
- [ ] Task: **AUD-022 (`validateSearch` Sanitization)** — Strip unknown query keys (remove `...search` spread and `[key: string]: unknown`) and validate numeric parameters (`x`, `y`, `z`, `zoom`, `az`, `el`, `dist`) with a finite-number parser in `src/router/index.tsx`, with colocated unit tests in `src/router/__tests__/validateSearch.test.ts`.
- [ ] Task: **AUD-023 (`compactDataCodec` Lossless `properName` Round-Trip)** — Always encode `compact.P = node.properName` when `node.properName` is present in `encodeSummaryNode` and remove the `!id.startsWith('gaia-')` `properName` fabrication from `decodeSummaryNode` in `src/utils/compactDataCodec.ts`, with round-trip property tests in `src/utils/__tests__/compactDataCodec.test.ts`.
- [ ] Task: **AUD-024 (`SystemScene` Inferred Orbits & Confidence Marking per `DEC-R019`)** — Respect `p.A` and `p.u` from `activeCorpus` in `src/components/canvas/scenes/SystemScene.tsx`; derive missing `semiMajorAxis` from `periodDays` via Kepler's Third Law ($a = ((P/365.25)^2 \cdot M_\star)^{1/3}$) or orbital spacing, mark inferred orbits with `lineStyle: 'dotted'` on `<OrbitPath />` and `THEORETICAL_PLANET_FLAGS.SEMI_MAJOR_AXIS` (`<ConfidencePip level="theoretical" />` in `DetailsPlanetTelemetrySection.tsx`), with unit tests in `src/components/canvas/scenes/__tests__/SystemScene.test.tsx`.
- [ ] Task: **AUD-020 & AUD-092 (`guideService`, `MetricComparativePanel`, Multi-Value Guide Routes & `?focus=` Context per `DEC-R014k`, `DEC-R018`, `DEC-R020`)** — Remove fabricated Tau Ceti / Tau Ceti e fallback numbers from `resolveMetricComparison`, support async shard fetching in `MetricDetailView.tsx` (and other Guide detail views for `?focus=`), expand multi-star/multi-planet systems into stacked target comparison cards (`DEC-R020`) with concise `"—"` uncatalogued placeholders (`DEC-R018`), support comma- and `+`-delimited slugs across all 4 Guide detail routes (`StarTypeDetailView`, `PlanetTypeDetailView`, `HazardDetailView`, `MetricDetailView`), un-skip `AUD-092` in `e2e/url-contracts.spec.ts`, and add cold-load E2E test for `AUD-020` (`/guide/metrics/stellar-mass?focus=proxima-centauri`).
- [ ] Task: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:guards`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `t02-audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
