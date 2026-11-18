# Implementation Plan: Search & Discovery

> **Status: Stub at archive time.** The two original tasks are partly delivered; see the Closure Note.

## Phase 1: Search Pill, Autocomplete & Scoping
- [x] Task: Implement search pill and autocomplete panel. — shipped as `src/components/domain/Search/SearchPanel/` (expands on focus), `SearchResults`, `SearchResultItem`, `SearchCategoryFilterSelect`; unified selection pipeline via `useSearchUrlSyncEffect.ts` / `searchStoreSync.ts`; zero-query `Explore` button (DEC-039); core-first corpus prewarm in `searchCorpusPrewarm.ts`
- [ ] Task: Implement contextual scoping and scope switcher chip. — **not shipped** (`scope` is only a `data-scope` attribute); → backlog "Search scope & filters"
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Filter Drawer & Intent Filters
- [ ] Task: Implement filter drawer and intent filter resolution. — partially shipped: intent-style filters exist as `tag:` select tokens (`src/services/search/searchTagDefinitions.ts`, `searchTagTriggers.ts`); no multi-variable filter drawer (distance, spectral type, habitability, exoplanet count) → backlog "Search scope & filters"
- [ ] Task: Quality Check: `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Closure Note (2026-11-17)

Archived as complete (decision T6c of the Conductor registry tidy, `chore/tracks-registry-tidy`): the search pill, autocomplete, category filter, URL sync, Explore button, corpus prewarm and `tag:` intent tokens shipped during Journeys 1–3 and remediation. Quality Check and Phase Verification lines are left unticked: the shipped work was verified in the tracks that delivered it. Residuals and where they went:

| Residual | Destination |
|---|---|
| Scope switcher chip (`In this System` / `All Systems`) and per-view scoping | [Backlog](../../../backlog.md) — "Search scope & filters" |
| Multi-variable filter drawer | [Backlog](../../../backlog.md) — "Search scope & filters" |
| Zero-result escalation to `full.json` and device/network tiering for search | [Backlog](../../../backlog.md) — `FS-006` (narrowed to these two items) |
| Celestial Command Palette | [Backlog](../../../backlog.md) — stays a separate item |
| 3D-synchronised search framing (`FS-003`) | New track [`camera-choreography_20261117`](../../../tracks/camera-choreography_20261117/index.md) |
