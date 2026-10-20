# Implementation Plan: Journey 3 — Curated On-Ramps, Narrative Waypoints & Step-Through (Data Model & Scaffolding Views)

> [!CAUTION]
> **JOURNEY BRIEFING & CLEAN-SLATE SCREEN-BY-SCREEN LAYERING PROTOCOL:**
> 1. Start with the **Journey 3 Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow) so the user is in the flow.
> 2. Proceed **screen by screen, one by one**, layering Journey 3's data and requirement notes cumulatively onto the ratified scaffolding views (or creating new ones if ratified).

## Phase 1: Journey 3 Onboarding Briefing & Screen Sequence Alignment
- [x] Task: Present the **Journey 3 Briefing**: Archetype 3 (*The Casual Explorer / "Cosmic Tourist"*), serendipity/awe mental model, key needs (curated on-ramps, punchy 2-sentence narrative hooks, metadata tags, step-through controls), and align on the screen sequence.
- [x] Task: Phase Verification & Checkpoint (Confirm readiness to step into Step 1)

## Phase 2: Step 1 & 2 — Unified Layer Taxonomy, Optional Ordering, Seeded Scientific Layers & Centralised Orbit-Context Targeting (`DEC-036`–`DEC-038`)
- [x] Task: Align one decision at a time on unified Layer taxonomy (`layers` search category), optional item `order`, seeded scientific layers (`overlay-recent-discoveries`, `overlay-jwst-targets`, `overlay-extreme-worlds`), compound `?layer=<layerSlug>[:<itemSlug>]` URL grammar, and centralised Orbit-Context View Targeting (`buildEntityOrbitTargetHref`); record in `decision-log.md` and `view-requirements.md`.
- [x] Task: Red/Green/Refactor TDD — Implement `order?: number` (`o?: number` in `CompactLayerEntry`), seed the 3 new scientific layers, update `scripts/build-data.ts` to emit parent layer + item search entries into `public/data/search/layers.json` (and `fiction.json` alias), and centralise `buildEntityOrbitTargetHref` across `navigationAndCamera.ts`, `searchService.ts`, `focusedEntityDetails.ts`, and `bodiesAndSchematics.ts` with unit tests.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Step 3 & 4 — `<Search.Panel>` `Explore` Button, Non-Blocking `<LayerCard />`, `<DetailsPanel />` Deep-Links & News/Discovery Pipeline (`DEC-039`–`DEC-040`)
- [x] Task: Align one decision at a time on `<Search.Panel>` `Explore` button, `<LayerCard />` (`Overview` + `Item` modes without scrim), `<DetailsPanel />` layer annotation deep-links, and `astro-news-curator` skill + `scripts/sync-discoveries.ts` / `.github/workflows/discoveries-sync.yml`; record in `decision-log.md` and `view-requirements.md`.
- [ ] Task: Red/Green/Refactor TDD — Implement `layerService.ts` (`resolveActiveLayerCard`, `pickRandomLayerHref`), `<LayerCard />` (`src/components/domain/LayerCard/`), `<Search.Panel>` `Explore` button, `<DetailsPanel />` layer annotation links, and wire `<LayerCard />` onto `GalaxyView`, `SystemView`, and `PlanetView` with unit/component tests.
- [ ] Task: Create `.agents/skills/astro-news-curator/SKILL.md` (and update `.agents/skills/canon-layer-author/SKILL.md`), `scripts/sync-discoveries.ts` (`npm run sync:discoveries`), and `.github/workflows/discoveries-sync.yml` with tests.
- [ ] Task: Run `npm run capture:views` (5 viewports), verify quality (`npm run lint`, `npm run typecheck`, `npm run test:coverage`), and present LAN URLs + screenshots.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
