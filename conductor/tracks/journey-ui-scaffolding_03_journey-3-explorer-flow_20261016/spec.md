# Specification: Journey 3 Data Model & Feature Requirements (The Casual Explorer Flow)

> [!CAUTION]
> **STRICT STAGE 1 RULE — CLEAN SLATE VIEWS & WHAT ON-SCREEN, NOT HOW TO PRESENT IT:**
> This track defines **only** the required screens/views, URL paths, features, view data models, selectors, and interface state logic for Journey 3 ([`docs/user-journeys.md`](../../../docs/user-journeys.md#L70-L76)).
> - **Zero Pre-Assumed Views or Paths:** Do NOT assume view names or URL paths ahead of time; decide whether each step layers onto an existing scaffolding view or introduces a new view/route.
> - **Zero Presentation Assumptions:** Do NOT design tour card visuals, dock chrome, or layout styling.
> - **One Decision at a Time:** Every screen boundary, curated collection schema, waypoint data field, and transition action must be discussed one by one with the user via `ask_question`, recording options and trade-offs in [`decision-log.md`](../../initiatives/journey-ui-scaffolding/decision-log.md) and [`view-requirements.md`](../../initiatives/journey-ui-scaffolding/view-requirements.md).

## Overview
Walks step-by-step through **Journey 3: Serendipitous Discovery (The Casual Explorer Flow)** to define and implement the data models and state logic for curated entry prompts ("Newly Discovered Exoplanet", "Extreme Worlds", "Surprise Me"), glanceable narrative hooks with metadata tags, and sequential tour waypoint navigation (`Previous` / `Next` / `Enter System` / `Expand Telemetry`).

## Scope (Journey 3 Steps — Ratified `DEC-036`–`DEC-040`)

1. **Step 1 — Unified Layer Taxonomy, Optional Item Ordering & Seeded Scientific Layers (`DEC-036`):**
   - Unify scientific tours and fictional universes around `DatasetLayerManifest` / `DatasetLayerEntry` with optional `order?: number` (`o?: number` in `CompactLayerEntry`) and deterministic fallback sorting (explicit `order` ascending, then declaration order, then `targetId`).
   - Seed three ordered scientific layers (`overlay-recent-discoveries`, `overlay-jwst-targets`, `overlay-extreme-worlds`) alongside `overlay-interstellar-missions` and the 10 sci-fi canons.
   - Replace the `'fiction'` search category with unified `'layers'` (`"Curated Layers & Canons"`) indexing both parent Layer manifests and individual Layer entries.
2. **Step 2 — Centralised Orbit-Context View Targeting & Compound `?layer=` URL Grammar (`DEC-037`, `DEC-038`):**
   - Implement `buildEntityOrbitTargetHref` (`/galaxy/$systemSlug` for systems/structures, `/system/$systemSlug?focus=<targetSlug>` for stars/planets/dwarf-planets/belts/minor-bodies/fictional-bodies, `/planet/$parentPlanetSlug?focus=<moonSlug>` for moons, and `/galaxy?select=layer:<layerSlug>&layer=<layerSlug>` for parent layers) and use it consistently across Search, `<LayerCard />`, `<DetailsPanel />`, and `<BodiesPanel />`.
   - Support `?select=layer:<layerSlug>` and compound `?layer=<layerSlug>` (Overview Card) vs. `?layer=<layerSlug>:<itemSlug>` (Item Card) with zero backwards-compatible aliases.
3. **Step 3 — `<Search.Panel>` `Explore` Button, Non-Blocking `<LayerCard />` & `<DetailsPanel />` Deep-Links (`DEC-039`):**
   - Add `<button type="button" data-testid="search-explore-button">Explore</button>` to `<Search.Panel>` to pick a random layer (excluding the currently active layer) and navigate to `/galaxy?select=layer:<slug>&layer=<slug>`.
   - Implement `<LayerCard />` (modeless card without scrim) across `GalaxyView`, `SystemView`, and `PlanetView` with Overview mode (summary + CTA to Item 1 + Close) and Item mode (Layer overview back-link, `1 of N` step counter, title, narrative hook, tag badges, `Previous` returning to Overview on Item 1, `Next` wrapping on Item $N$, and `Close`).
   - Link layer annotations in `<DetailsPanel />` directly to `?select=layer:<layerSlug>&layer=<layerSlug>:<itemSlug>`.
4. **Step 4 — Astronomical News & Discoveries Skill (`astro-news-curator`) + Automated Sync Script & CI Workflow (`DEC-040`):**
   - Create `.agents/skills/astro-news-curator/SKILL.md` (and update `.agents/skills/canon-layer-author/SKILL.md`), `scripts/sync-discoveries.ts` (`npm run sync:discoveries`), and `.github/workflows/discoveries-sync.yml` (`cron` + `workflow_dispatch`) to audit NASA Exoplanet Archive `< 100 pc` recent publications and keep catalog/layer items current.

## Acceptance Criteria
- [x] Every step of Journey 3 is interrogated one decision at a time with the user; all options and trade-offs are recorded in `decision-log.md`.
- [x] On-screen data and action requirements discovered in Journey 3 are recorded in `view-requirements.md`.
- [x] Pure TypeScript curated collection schemas, waypoint selectors, and tour state logic are implemented with unit tests (>80% coverage).
- [x] Scaffolding views allow stepping through Journey 3 on `http://192.168.1.124:5173` with multi-viewport Playwright screenshots captured.
- [x] `npm run lint`, `npm run typecheck`, and `npm run test:coverage` pass cleanly.
