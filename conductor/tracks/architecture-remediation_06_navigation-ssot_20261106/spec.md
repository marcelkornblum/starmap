# Spec: T06 · Navigation Single Source of Truth

## Overview

Establish TanStack Router search and path parameters as the canonical single source of truth for selection, focus, query, and camera target. Delete store mirrors, echo-guard refs, window.location mirrors, and the document click hijack. Unify data loading behind a single mechanism replacing tick hacks, and introduce bounded, abortable repository caches using a strangler approach within the track.

**Behaviour change:** None intended
**Risk:** High

**Track type:** Refactor. Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-080 · AUD-081 · AUD-082 · AUD-083 · AUD-084 · AUD-085 · AUD-086 · AUD-087 · AUD-088 · AUD-089 · AUD-090 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t06--navigation-single-source-of-truth)).

## Scope

### In scope
- AUD-080 — Selection, query and camera target duplicated across URL, `useUIStore`, `SpatialEntityStore`, `useCameraStore` and view state
- AUD-081 — Echo loops held off by `applyingOuter*Ref`, `pendingCanvasFocusRef`, `lastWrittenUrlQueryRef`
- AUD-082 — Global `document` click listener hijacks anchors; custom `starmap:locationchange` event
- AUD-083 — Views regex-parse `pathname` instead of `useParams()`
- AUD-084 — `SearchRoot` mirrors `window.location` with `popstate`; `searchUrlSync` writes via `history.replaceState`; `searchStoreSync` splices `window.location.search`
- AUD-085 — Render-phase store mutation and `getState()` under `typeof window === 'undefined'`
- AUD-086 — Three-way drawer authority (controlled prop / local state / store)
- AUD-087 — Data loading duplicated across views and scenes with `tick` re-read hacks; caches have no subscription API
- AUD-088 — `useStarmapNav` dead; route strings hardcoded across views/components
- AUD-089 — `simulateAsyncFetch` artificial delay in production router; swallowed `navigate` errors
- AUD-090 — Unbounded module-level repository caches; no `AbortSignal` support

### Out of scope
- Canvas mounting (owned by T07).
- Component decomposition (owned by T08).

## Acceptance Criteria

- [ ] Every owned finding (AUD-080 … AUD-090) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines: none new (ledger checks).
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
