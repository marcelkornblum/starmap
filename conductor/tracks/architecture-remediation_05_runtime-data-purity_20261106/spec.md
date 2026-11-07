# Spec: T05 · Runtime Data Purity

## Overview

Remove hardcoded entity IDs, names, and telemetry from runtime code. Ensure services return structured quantities and classification unions rather than pre-formatted display strings. Establish one authoritative classifier and execute a clean cutover of all legacy aliases.

**Behaviour change:** Minor (display formatting moves to UI)
**Risk:** Medium

**Track type:** Refactor. Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-060 · AUD-061 · AUD-062 · AUD-063 · AUD-064 · AUD-065 · AUD-066 · AUD-067 · AUD-068 · AUD-069 · AUD-070 · AUD-071 · AUD-072 · AUD-073 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t05--runtime-data-purity)).

## Scope

### In scope
- AUD-060 — Default benchmark IDs (`tau-ceti`, `tau-ceti-e`) and baseline routes hardcoded in `guideService`
- AUD-061 — `journeyService` hardcodes `sol`/`earth` IDs, display names, parentage and Earth/Mars SMA fallbacks
- AUD-062 — `'sol'` special cases decide parentage and centre in details services
- AUD-063 — `PlanetScene` hardcodes Luna orbit and radius
- AUD-064 — `GalaxyScene` regex-classifies spectral strings at runtime
- AUD-065 — UI infers classification from strings and indices (`href.includes('planet')`, breadcrumb index, hardcoded `type="terrestrial"` / `"stellar-system"`)
- AUD-066 — `StructuredQuantity.value` carries free text (`'Instantaneous'`, `'21.40%'`, `'… (dep) · … (arr)'`, `unit: ''`); `formatStructuredQuantity` and Δz prose in service
- AUD-067 — `hazardsAndComposition` builds display strings and substring-slices prose to inject `habitable-badge`
- AUD-068 — `guideService` builds prose sentences and emits hex colours; metric comparison returns pre-formatted strings
- AUD-069 — Four divergent planet/reticle classifiers
- AUD-070 — Shims: `?layer=` alias (still emitted by `navigationAndCamera`), `collection:` token, journey option aliases, `views/GuideSectionNav.tsx` re-export
- AUD-071 — 46 KB curated guide catalogue as runtime TS literals
- AUD-072 — Default target fallbacks `'sol'`/`'earth'` in canvas and scene wiring
- AUD-073 — Unchecked casts in search and journey services

### Out of scope
- Navigation state (owned by T06).

## Acceptance Criteria

- [ ] Every owned finding (AUD-060 … AUD-073) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines at zero: `G-literals`, `G-shims`.
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
