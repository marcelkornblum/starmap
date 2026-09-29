# Specification: Reference Engine & MDX

## Overview
This track builds the Encyclopedia/Reference section of Starmap. It implements an MDX parsing pipeline to support rich, editorial content (50-100 guide pages) and builds the specialized UI components to display inline 3D elements (like interactive stars popping out of cards) using the global canvas `<View>` architecture.

## Functional Requirements
1. **MDX Integration:** Configure Vite (e.g., via `@mdx-js/rollup`) and TanStack Router to natively parse and render `.mdx` files as routeable pages.
2. **MDX Component Mapping:** Map standard Markdown elements (`<h1>`, `<p>`, `<blockquote>`) to the strict typography and layout primitives built in the `ui-system` track to ensure editorial content doesn't break the harmonic scale.
3. **Reference Layouts:** Create a dedicated structural layout for the encyclopedia (e.g., table of contents, sidebar navigation, readable line-length constraints).
4. **Inline 3D Components:** Build an `<Inline3DCard>` component that utilizes `@react-three/drei`'s `<View>` tracker to render 3D elements seamlessly within the scrolling HTML document, sharing the persistent WebGL context.

## Non-Functional Requirements
- **Performance:** 3D Views embedded in the encyclopedia must not cause scrolling lag.
- **Maintainability:** Editorial content must be authored purely in Markdown/MDX without authors needing to understand React or Three.js.

## Acceptance Criteria
- [ ] Vite successfully compiles `.mdx` files into React pages.
- [ ] A sample MDX page is created and navigable via TanStack Router.
- [ ] Markdown text perfectly inherits the `ui-system` CSS tokens.
- [ ] An MDX page successfully renders multiple `<Inline3DCard>` components embedded in the text flow, which scroll smoothly without clipping.
