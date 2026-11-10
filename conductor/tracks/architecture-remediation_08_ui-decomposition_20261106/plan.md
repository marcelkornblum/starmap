# Plan: T08 · View & UI Decomposition

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006, DEC-R049)
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs
- [x] Task: Identify and ratify open decisions one by one in decision-log.md
- [x] Task: Decide — className passthrough policy for layout primitives (DEC-R050)
- [x] Task: Decide — DetentSheet drag height mechanism (DEC-R051)
- [x] Task: Decide — Accessible interactive row pattern (DEC-R052)
- [x] Task: Decide — `src/components/search/**` consolidation into `src/components/domain/Search/` (DEC-R053)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation (Ratified Decisions)
- [x] Task 2.1: Token Architecture & CUBE CSS Remediation (`AUD-121`, `AUD-126`)
  - Move component-specific tokens (`--text-ui-button-*`, `--space-inset-button-*`, `--surface-modal-radius`, etc.) out of global `src/styles/tokens/semantic.css` into local `--<component>-*` CSS Module interfaces (`AUD-126`)
  - Tokenise all 220 `hardcoded-css-token` (`px`/`rem`/`rgba`/`ms`) violations across all 43 CSS Modules and eliminate all 11 `forbidden-outer-margin` declarations (`AUD-121`)
- [x] Task 2.2: Tier 1 Primitives, `DetentSheet` Snap Physics & `CelestialSymbol` Quads (`AUD-120`, `AUD-122`, `AUD-125`, `AUD-128`, `AUD-129`, `AUD-130`)
  - Remove external `className` passthrough and dynamic concatenation from Tier 1 primitives (`Stack`, `Cluster`, `Grid`, `Center`, `Imposter`, `Unit`, `DetentSheet`, `Button`, etc.) (`DEC-R050`, `AUD-125`)
  - Implement `DetentSheet` 1-row `peek` minimum, asymmetric snap physics (`detentSheetMath.ts` abutting below `partial`, free-rest between `partial` and `full`), and single `@container` hierarchy threshold at `partial` (`DEC-R051`, `AUD-120`, `AUD-128`, `AUD-129`)
  - Decompose `CelestialSymbol.tsx` ($\le 300$ lines), extract `CELESTIAL_SYMBOL_META` / `normalizeConfidence` / `shouldDisplaySpectralBadge`, complete component file quads for `CelestialBadge`, `SpectralBadge`, `HazardBadge`, `CelestialTitle`, and add `index.ts` barrels across `src/components/interface/**` (`AUD-120`, `AUD-122`, `AUD-129`, `AUD-130`)
- [x] Task 2.3: Search Consolidation, Single-Anchor `SearchResultItem` & `SearchRoot` Decomposition (`AUD-120`, `AUD-122`, `AUD-123`, `AUD-127`, `AUD-129`, `AUD-130`)
  - Consolidate `src/components/search/**` into `src/components/domain/Search/` with full Component File Quads, pure `index.ts` namespace barrel, and clean cutover across imports and audit scripts (`DEC-R053`)
  - Decompose `SearchRoot.tsx` ($\le 300$ lines) into focused hooks/helpers (`AUD-120`) and replace raw `<ul>` in `SearchResults` with Tier 1 layout primitives (`AUD-123`)
  - Refactor `SearchResultItem` to suppress secondary `/guide` badge links and wrap the row in a single native `<a href>`, adding `SearchResultItem/index.ts` (`DEC-R052`, `AUD-127`, `AUD-129`, `AUD-130`)
- [x] Task 2.4: Domain Panels Decomposition, Regulated Primitives, Quads & Barrels (`AUD-120`, `AUD-122`, `AUD-123`, `AUD-124`, `AUD-125`, `AUD-129`, `AUD-130`)
  - Decompose `DirectionsPanel.tsx` ($\le 300$ lines), replace raw `<ul>`/`<ol>` lists with Tier 1 primitives (`AUD-123`), replace `.actionButton` `<Button>` CSS overrides with native `<Button>` variants (`AUD-125`), and replace `→` string arrows (`AUD-124`)
  - Remediate `LayerCard` (`unit="of N"` and `←`/`→` string arrows) and `MetricComparativePanel` ratio primitives (`AUD-124`), plus add missing `index.ts` barrels (`LayerCard`, `BodiesPanel`, `Breadcrumbs`, `DetailsPanel`) (`AUD-130`)
  - Complete Component File Quads / helper naming alignment for `DetailsPanel` sub-components (`AUD-122`) and extract non-component exports from `SpatialShell.tsx`, `CanvasLayer.tsx`, `DirectionsPanel.tsx`, and `detailsPanelHelpers.tsx` (`AUD-129`)
- [x] Task 2.5: View Decomposition & Remaining `only-export-components` Cleanup (`AUD-120`, `AUD-123`, `AUD-129`)
  - Decompose `GalaxyView.tsx` (713 lines), `SystemView.tsx` (580 lines), and `PlanetView.tsx` (534 lines) into focused view hooks/presenters strictly $\le 300$ lines each (`AUD-120`)
  - Replace raw `<ul>` in `StarTypesListView.tsx` (`AUD-123`) and extract remaining non-component exports from `MetricDetailView.tsx`, `src/router/index.tsx`, and canvas `.tsx` files (`AUD-129`)
- [x] Task 2.6: Ratchet `scripts/guards/baseline.json` & Run Quality Gate (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, `npm run audit:guards`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
