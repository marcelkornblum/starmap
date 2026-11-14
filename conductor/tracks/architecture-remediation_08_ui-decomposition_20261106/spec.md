# Spec: T08 · View & UI Decomposition

## Overview

Decompose god components into focused sub-components and hooks, and complete component quads across interface and domain directories. Tokenise CSS modules, replace raw lists and badge/punctuation breaches with Tier 1 primitives, and move non-component exports out of component files.

**Behaviour change:** None intended
**Risk:** Medium

**Track type:** Refactor. Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-120 · AUD-121 · AUD-122 · AUD-123 · AUD-124 · AUD-125 · AUD-126 · AUD-127 · AUD-128 · AUD-129 · AUD-130 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t08--view--ui-decomposition)).

## Scope

### In scope
- AUD-120 — God components: `SearchRoot` (774), `GalaxyView` (750), `DirectionsPanel` (525)
- AUD-121 — Hardcoded px/rem/rgba/ms in CSS modules
- AUD-122 — Quad gaps: `CelestialBadge`, `SpectralBadge`, `HazardBadge`, `CelestialTitle`, seven `DetailsPanel` sub-components, `components/search/**`
- AUD-123 — Raw `<ul>`/`<ol>` lists in domain components and views
- AUD-124 — Counts/ratios in `<Badge>`, `→`/`←` string arrows, `unit="of 5"`
- AUD-125 — `className` concatenation in primitives; `DirectionsPanel` restyles `<Button>`
- AUD-126 — Component-specific tokens in global `semantic.css`
- AUD-127 — Row click emulated via `anchorRef.current.click()`
- AUD-128 — `DetentSheet` writes `style.setProperty` through a ref
- AUD-129 — ~60 non-component exports from component files
- AUD-130 — Missing `index.ts` barrels (`SearchResultItem`, `LayerCard`)

### Out of scope
- New UI features.

## Acceptance Criteria

- [x] Every owned finding (AUD-120 … AUD-130) marked `verified` by the end-of-track audit.
- [x] Owned guard baselines at zero: `G-ui`, `G-size`, `G-lint` (only-export-components).
- [x] No guard baseline increased.
- [x] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed *(ready over LAN at `http://192.168.1.124:5173` prior to PR merge)*.
- [x] Audit report written to `audit-report.md`.
