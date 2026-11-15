# Spec: T03 · Layering Cut

## Overview

Restore a strict one-directional layer graph across the codebase. Shared domain types, reference frames, and aperture maths move out of components/canvas into `src/types` and `src/utils`. Break import cycles, remove Three.js from services, ensure stores hold serialisable data only, and remove prototype/showcase code from production paths.

**Behaviour change:** None
**Risk:** Low–Medium

**Track type:** Refactor. Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-030 · AUD-031 · AUD-032 · AUD-033 · AUD-034 · AUD-035 · AUD-036 · AUD-037 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t03--layering-cut)).

## Scope

### In scope
- AUD-030 — Services, data and utils import from `components/canvas/**` (types, `GALACTIC_FRAME`, aperture maths, chord geometry)
- AUD-031 — `searchRepository` (data) imports from `searchService`
- AUD-032 — Import cycles: `searchService ↔ details/navigationAndCamera`, `searchService ↔ layerCardService`
- AUD-033 — `sectorStreamingService` creates `THREE.BufferGeometry`/`THREE.Points` and mutates the scene graph
- AUD-034 — `useCanvasStageStore` imports component props (including callbacks) from `CanvasLayer`
- AUD-035 — Tier-1 `SpectralBadge` imports `data/guideCatalog`
- AUD-036 — `PaletteShowcaseScene` (DOM, 48 KB) exported from production `canvas/scenes` barrel; near-clone of `prototypes/PaletteShowcase`; prototypes live under `src/components`
- AUD-037 — `math/astronomy.ts` pure re-export shim; `QUADRANTS` duplicated; inline Euclidean distance re-implemented

### Out of scope
- Changing any behaviour or data shapes.

## Acceptance Criteria

- [ ] Every owned finding (AUD-030 … AUD-037) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines at zero: `G-imports`.
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
