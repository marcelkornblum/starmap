# Implementation Plan: Reference Engine & MDX

> **Superseded (T7, 2026-11-17):** MDX was dropped — guide content stays TypeScript (`src/content/guide/*.ts`), as shipped in Journey 4. Phases 1–3 are struck through accordingly.

## Phase 1: MDX Pipeline & Layout
- [ ] ~~Task: Install `@mdx-js/rollup` and configure `vite.config.ts` to support MDX.~~ — **dropped** (MDX not adopted)
- [ ] ~~Task: Create the `ReferenceLayout` wrapper component (sidebar, content constraints).~~ — **dropped** (guide views render through the shipped `src/views/*{List,Detail}View.tsx` templates)
- [ ] ~~Task: Create a sample `src/pages/reference/index.mdx` route in TanStack router.~~ — **dropped** (guide routes live in `src/router/index.ts`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Component Mapping
- [ ] ~~Task: Create an `MDXProvider` that maps raw HTML tags (`h1`, `p`, `a`) to our UI System primitives.~~ — **dropped** (no MDX; content is typed TypeScript composed from Tier 1 primitives)
- [ ] ~~Task: Verify the sample MDX page correctly inherits the strict typography tokens.~~ — **dropped**
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Inline 3D Views
- [ ] Task: Build the `<Inline3DCard>` component utilizing `@react-three/drei`'s `<View>`. — **not shipped**; owned by backlog `FS-011`
- [ ] Task: Embed the card into the sample MDX page and verify it correctly renders 3D elements inside the global WebGL canvas while scrolling. — **not shipped**; owned by backlog `FS-011` (no MDX page; embedding will target the guide views)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Encyclopedia Architecture
- [x] Task: Implement article template (summary, parameter range, exemplar) and Relative Parameter Comparator. — shipped via Journey 4 as `src/views/{StarTypes,PlanetTypes,Metrics,Hazards}DetailView.tsx`, `src/content/guide/*.ts`, `src/services/guide/*`, `MetricComparativePanel` and `guideMetricBenchmarks.ts`; the exemplar is a CSS placeholder (`Guide3DPreview`) until `FS-011`
- [x] Task: Implement category index. — shipped via Journey 4 as the `*ListView.tsx` category indices (routes in `src/router/index.ts`)
- [ ] Task: Implement 3D exemplar cards on the category index. — **not shipped**: cards use the CSS-sphere `Guide3DPreview` placeholder (`src/components/domain/Guide3DPreview/Guide3DPreview.tsx`); live 3D owned by backlog `FS-011`
- [x] Task: Implement encyclopedia breadcrumb hierarchy and classification deep-link icon. — shipped as `src/components/domain/Breadcrumbs/` and the `CelestialBadge` / `SpectralBadge` / `Unit` deep-links
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Closure Note (2026-11-17)

Archived as complete (decision T6e of the Conductor registry tidy, `chore/tracks-registry-tidy`): the encyclopedia architecture shipped through Journey 4 as TypeScript content. Phase Verification lines are left unticked: the shipped work was verified in Journey 4. Residuals and where they went:

| Residual | Destination |
|---|---|
| MDX pipeline, `ReferenceLayout`, `MDXProvider` | **Dropped** (T7) — guide content stays TypeScript |
| `<Inline3DCard>` / live 3D exemplars, interior cutaways, comparative meshes | [Backlog](../../../backlog.md) — `FS-011` stays the single owner |
