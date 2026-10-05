# Implementation Plan: Reference Engine & MDX

## Phase 1: MDX Pipeline & Layout
- [ ] Task: Install `@mdx-js/rollup` and configure `vite.config.ts` to support MDX.
- [ ] Task: Create the `ReferenceLayout` wrapper component (sidebar, content constraints).
- [ ] Task: Create a sample `src/pages/reference/index.mdx` route in TanStack router.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Component Mapping
- [ ] Task: Create an `MDXProvider` that maps raw HTML tags (`h1`, `p`, `a`) to our UI System primitives.
- [ ] Task: Verify the sample MDX page correctly inherits the strict typography tokens.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Inline 3D Views
- [ ] Task: Build the `<Inline3DCard>` component utilizing `@react-three/drei`'s `<View>`.
- [ ] Task: Embed the card into the sample MDX page and verify it correctly renders 3D elements inside the global WebGL canvas while scrolling.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Encyclopedia Architecture
- [ ] Task: Implement article template (summary, parameter range, exemplar) and Relative Parameter Comparator.
- [ ] Task: Implement category index with 3D exemplar cards.
- [ ] Task: Implement encyclopedia breadcrumb hierarchy and classification deep-link icon.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
