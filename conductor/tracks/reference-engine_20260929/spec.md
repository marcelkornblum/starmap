# Specification: Reference Engine & MDX

## Overview
This track builds the Encyclopedia/Reference section of Starmap. It implements an MDX parsing pipeline to support rich, editorial content (50-100 guide pages) and builds the specialized UI components to display inline 3D elements (like interactive stars popping out of cards) using the global canvas `<View>` architecture.

## Functional Requirements
1. **MDX Integration:** Configure Vite (e.g., via `@mdx-js/rollup`) and TanStack Router to natively parse and render `.mdx` files as routeable pages.
2. **MDX Component Mapping:** Map standard Markdown elements (`<h1>`, `<p>`, `<blockquote>`) to the strict typography and layout primitives built in the `ui-system` track to ensure editorial content doesn't break the harmonic scale.
3. **Reference Layouts:** Create a dedicated structural layout for the encyclopedia (e.g., table of contents, sidebar navigation, readable line-length constraints).
4. **Inline 3D Components / Embedded 3D Viewport:** Build an `<Inline3DCard>` component that utilizes `@react-three/drei`'s `<View>` tracker to render 3D elements seamlessly within the scrolling HTML document, sharing the persistent WebGL context. Unlike the Map (full-bleed canvas floor), the exemplar is an interactive figure embedded in the article layout.
5. **Classification Deep-Link Icon:** An icon alongside any classification tag (e.g. `Red Supergiant`, `Super-Earth`) links into the Encyclopedia article for that category.
6. **Encyclopedia Article Architecture:** Plain-language summary, full scientific parameter range, isolated 3D render of an exemplar object, and a **Relative Parameter Comparator** benchmarking any physical data point (radius, mass, surface gravity, temperature, luminosity, density, orbital period) against familiar anchors (Earth, Sol, Jupiter, 1g, 1 bar).
7. **Category Index with 3D Exemplar Cards:** Category list views (e.g. *Star Categories*) with a card per subtype hosting a live miniature 3D exemplar.
8. **Encyclopedia Breadcrumb Hierarchy:** `Encyclopedia → [Category Domain] → [Classification Type]`, reusing the `Breadcrumbs` component from `console-ui-shell_20261004`.

## Non-Functional Requirements
- **Performance:** 3D Views embedded in the encyclopedia must not cause scrolling lag.
- **Maintainability:** Editorial content must be authored purely in Markdown/MDX without authors needing to understand React or Three.js.

## Acceptance Criteria
- [ ] Vite successfully compiles `.mdx` files into React pages.
- [ ] A sample MDX page is created and navigable via TanStack Router.
- [ ] Markdown text perfectly inherits the `ui-system` CSS tokens.
- [ ] An MDX page successfully renders multiple `<Inline3DCard>` components embedded in the text flow, which scroll smoothly without clipping.
- [ ] Classification tags deep-link to their article.
- [ ] Article template renders summary, parameter range, exemplar and Parameter Comparator.
- [ ] Category index renders exemplar cards with live miniature 3D.
- [ ] Encyclopedia breadcrumbs navigate the hierarchy.
