# Plan: T06 · Navigation Single Source of Truth

## Phase 1: Atomic Decision Alignment
Record each decision in [decision-log.md](../../initiatives/architecture-remediation/decision-log.md) before implementation.
- [x] Task: Confirm review mode (DEC-R006) — *Ratified as Whole-Track Review in PR (DEC-R040)*
- [x] Task: Pre-track reconnaissance via `codebase-researcher` (flash) for owned IDs — *Completed; documented in t06-reconnaissance-briefing.md*
- [x] Task: Identify and ratify open decisions one by one in decision-log.md
- [x] Task: Decide — Canonical state model (which state is URL vs ephemeral store) — *Ratified in DEC-R041*
- [x] Task: Decide — Data loading mechanism (route loaders vs useSyncExternalStore hook) — *Ratified in DEC-R042*
- [x] Task: Decide — Cache bounds and eviction policy — *Ratified in DEC-R043*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Implementation per Ratified Decisions
- [x] Task 2.1: Cache Bounds, Eviction & AbortSignal (DEC-R043, AUD-090)
  - Create `src/config/cacheConfig.ts` with configurable cache limits.
  - Implement bounded LRU caching in `detailsRepository.ts`, `layerRepository.ts`, and `searchRepository.ts`.
  - Pass `signal?: AbortSignal` through all fetch functions and forward to native `fetch()`.
  - Add unit tests for LRU eviction and cancellation in colocated repository test suites.
- [x] Task 2.2: Reactive Repository Hooks (DEC-R042, AUD-087)
  - Implement `useEntityDetails` and `useSystemData` using `useSyncExternalStore` / cache subscriptions.
  - Refactor `SystemView`, `PlanetView`, `GalaxyView`, and `SystemScene` to consume reactive hooks, eliminating all `setShardTick` counter hacks.
  - Colocated unit tests for reactive hooks in `useEntityDetails.test.ts`, `useSystemData.test.ts`.
- [x] Task 2.3: URL Search Schema & Router Cleanup (DEC-R014a–l, DEC-R041, AUD-082, AUD-088, AUD-089, AUD-091)
  - Update TanStack Router search validator in `src/router/index.tsx` for clean single `?center=` and strict typed search params; eliminate deprecated `x/y/z/zoom/az/el/dist`.
  - Remove global `document` click listener and `starmap:locationchange` custom event (`AUD-082`).
  - Delete `simulateAsyncFetch` latency helper and handle `navigate` errors explicitly (`AUD-089`).
  - Modernize or clean up `useStarmapNav` (`AUD-088`).
- [x] Task 2.4: Views TanStack Router Cutover & Regex Removal (AUD-083)
  - Refactor `SystemView`, `PlanetView`, `GalaxyView`, and guide detail views to use `useParams()` and `useSearch()` instead of regex path matching.
  - Delete obsolete regex URL extraction helpers in `src/utils/url.ts`.
- [x] Task 2.5: Store Mirror Deletion, Direct Browser Mutation Cleanup & Render Purity (AUD-080, AUD-081, AUD-084, AUD-085, AUD-086)
  - Delete store mirror fields in `useUIStore` (`selectedNodeId`, `searchQuery`, `centeredEntityId`).
  - Delete all echo-guard ref flags (`applyingOuter*Ref`, `pendingCanvasFocusRef`, `lastWrittenUrlQueryRef`).
  - In `SearchRoot.tsx`, remove raw `window.location` reads, `popstate` listeners, and manual `history.replaceState` calls; bind directly to router search params.
  - Remove render-phase store mutations and `typeof window === 'undefined'` branches in `SearchRoot.tsx`, `SpatialShell.tsx`, and `SpatialViewport.tsx` (`AUD-085`).
  - Consolidate drawer authority in `SpatialShell.tsx` to `useUIStore.activeDrawer` (`AUD-086`).
- [x] Task 2.6: Canvas Single-Click Focus Decoupling (DEC-R041, AUD-093)
  - In `SpatialViewport.tsx`, `GalaxyScene.tsx`, and `CanvasLayer.tsx`, decouple canvas single-click reticle focus from `selectedId`.
  - Ensure single-click reticle activation updates `focusedId` / URL `?focus=` immediately without requiring `selectedId` change and without clobbering multi-entity `selectedIds`.
- [x] Task 2.7: Quality Check — `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:ui`, `npm run audit:r3f`, guard suite
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: End-of-Track Audit & PR
- [ ] Task: `qa-verifier` full suite (lint, typecheck, coverage, audits, guards, e2e)
- [ ] Task: Verification, regression and new-debt auditors (fresh contexts) per [verification protocol](../../initiatives/architecture-remediation/verification-protocol.md)
- [ ] Task: Orchestrator spot-verification (DEC-R007); write `audit-report.md`; update ledger statuses
- [ ] Task: User manual smoke checklist over LAN
- [ ] Task: Append track summary to `CHANGELOG.md`; open PR; CI; Gemini review loop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
