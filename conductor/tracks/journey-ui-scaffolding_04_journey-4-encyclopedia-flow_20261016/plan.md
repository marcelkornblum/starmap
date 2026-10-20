# Implementation Plan: Journey 4 — Classification Deep-Links, Encyclopedia Articles, Parameter Comparator & Category Index (Data Model & Scaffolding Views)

> [!NOTE]
> **Completed via Track 01 (`DEC-027`–`DEC-029`, `DEC-032`) & Stage 1 Cross-Journey Audit:**
> All Journey 4 routes (`/guide`, `/guide/star-types`, `/guide/star-types/$starType`, `/guide/planet-types`, `/guide/planet-types/$planetType`, `/guide/metrics`, `/guide/metrics/$metricId`, `/guide/hazards`, `/guide/hazards/$hazardId`), deep-link `(i)` triggers (`data-testid="details-star-type-guide-link"`, `data-testid="details-planet-type-guide-link"`), 3-slice Yerkes spectral combinator (`O`–`D`, `0`–`9`, `I`–`VII`), Relative Parameter Comparator against Earth/Sol, and `Guide` $\leftrightarrow$ `Map` breadcrumbs were implemented and verified in Track 01 (`src/services/guideService.ts`, `src/views/Guide*.tsx`, `tests/guideViews.test.tsx`). Stage 3 WebGL/R3F interior cross-section cutaway shaders are tracked in `FS-011` in [`conductor/backlog.md`](../../backlog.md) and coupled with `reference-engine_20260929`.

## Phase 1: Journey 4 Onboarding Briefing & Screen Sequence Alignment
- [x] Task: Present the **Journey 4 Briefing**: Self-decoding UI across Archetypes 1 & 3, Sense of Scale JTBD, classification deep-link triggers (`Red Supergiant`), Relative Parameter Comparator against familiar anchors, Category Index, return-to-origin flow, and align on the screen sequence and route paths.
- [x] Task: Phase Verification & Checkpoint (Confirm readiness to step into Step 1)

## Phase 2: Step 1 — Classification Deep-Link & Return Context Layer
- [x] Task: Align one decision at a time on classification deep-link triggers alongside entity tags and return-to-origin context preservation + requirement notes; record in `decision-log.md` (`DEC-027`–`DEC-029`) and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement classification taxonomy lookup and origin-return stack state with unit tests (`tests/guideViews.test.tsx`).
- [x] Task: Layer classification deep-link triggers and requirement notes onto the entity scaffolding views (`DetailsPanel.tsx`).
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URLs + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 2 & 3 — Encyclopedia Article & Relative Parameter Comparator
- [x] Task: Align one decision at a time on the target view/route, Encyclopedia Article data (plain-language summary, parameter boundaries, 3D exemplar descriptor, Wikipedia link), and the Relative Parameter Comparator data model (benchmarking radius, mass, luminosity, gravity, temperature against Sol/Earth/Jupiter) + requirement notes; record in `decision-log.md` (`DEC-028`, `DEC-032`) and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement article selectors and Relative Parameter Comparator math with unit tests (`src/services/guideService.ts`, `tests/guideViews.test.tsx`).
- [x] Task: Create/layer the Encyclopedia Article and Relative Parameter Comparator data + requirement notes onto the ratified scaffolding view (`StarTypeDetailView.tsx`, `PlanetTypeDetailView.tsx`, `MetricDetailView.tsx`, `HazardDetailView.tsx`).
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Step 4 — Breadcrumbs, Category Index & Return to Map
- [x] Task: Align one decision at a time on target view/route, breadcrumb hierarchy (`Encyclopedia` $\to$ `Star Types` $\to$ `Red Supergiant`), Category Index summary items (metrics + exemplar descriptor), and returning to the origin map entity + requirement notes; record in `decision-log.md` (`DEC-027`, `DEC-028`) and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement reference hierarchy traversal and category index selectors with unit tests (`tests/guideViews.test.tsx`).
- [x] Task: Layer Category Index, hierarchy breadcrumbs, and return-to-origin controls + requirement notes onto the ratified scaffolding view (`GuideIndexView.tsx`, `GuideCategoryView.tsx`, `Breadcrumbs.tsx`).
- [x] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URL + screenshots.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
