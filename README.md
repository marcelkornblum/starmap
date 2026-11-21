# Starmap

A comprehensive and modern A-Z style atlas for space enthusiasts and galactic pilots, from beginners to seasoned professionals. Starmap is a high-precision, technical 3D cartographic application and reference console for navigating the solar neighbourhood ($100\text{ pc}$ volume), stellar systems, and planetary worlds, with easy exploration across planetary, system, and neighbourhood scales, route finding and journey planning tools, and encyclopaedic help and reference guides.

Built with **React 19**, **Three.js**, **React Three Fiber (R3F)**, **TanStack Router**, and **Zustand**, driven by an offline astronomical data pipeline ingesting Gaia DR3, HYG v3, and NASA Exoplanet Archive catalogues.

---

## Key Architectural Highlights

- **Single Persistent WebGL Canvas:** Mounted once at the root (`RootCanvasHost`), surviving route transitions without context destruction or shader recompilation. Views interact via declarative `<CanvasLayer>` stage slots.
- **TanStack Router as Single Source of Truth:** Navigation, selection, focus, and analytical filters are fully synchronised with an orthogonal URL search query grammar (`?center=`, `?select=`, `?focus=`, `?route=`, `?layer=`, `?q=`, `?searchCategory=`) adhering to RFC 3986 literal preservation (`stringifyStarmapSearch`).
- **Zero Hardcoded Entity Attributes:** All celestial properties, classifications, habitability flags, and orbital parent hierarchies are precalculated at build time and served via 28-byte binary sector shards (`.bin`) and compact JSON shards.
- **Strict 1-Directional Module Layering:** Monitored by custom AST guards enforcing an 11-rank (ranks 0–10) module hierarchy, zero import cycles, prototype isolation, and primitive purity.
- **CUBE CSS Design System:** Scoped CSS Modules with local token interfaces (`--<component>-*`), Tier 1 interface primitives with strict zero-`className`/`style` passthrough, and `@layer blocks` / `@layer exceptions` cascade control.

For in-depth documentation, see the [Documentation Index](docs/README.md).

---

## Prerequisites

- **Node.js:** `>= 22.0.0`
- **npm:** `>= 10.0.0`

---

## Quickstart

```bash
# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev

# Start Storybook component workbench (http://localhost:6006)
npm run storybook
```

---

## Astronomical Data Pipeline

Starmap processes raw catalog data offline into packed binary partitions and compact JSON shards in `public/data/`:

```bash
# Fetch upstream source catalogues (with retries and checksum verification)
npm run data:fetch

# Build binary sectors, search indices, summaries, and manifests
npm run data:build

# Run the complete pipeline (fetch + build)
npm run data:pipeline

# Force refresh upstream sources and update reproducible build epoch
npm run data:refresh
```

---

## Quality, Testing & Guard Suites

Starmap enforces a comprehensive automated verification suite (highlights only; see `package.json` for the full script list):

```bash
# Fast Oxlint linting
npm run lint

# TypeScript strict type checking
npm run typecheck

# Run unit tests across split projects (unit:node + unit:dom)
npm run test

# Run tests with V8 AST code coverage analysis
npm run test:coverage

# Run Playwright end-to-end contracts (URL contracts & 60fps frame times)
npm run test:e2e

# Run custom AST architectural guard suite (layering, cycles, zero hardcoded entities)
npm run audit:guards

# Run UI design system audit (component quads, CUBE CSS, zero raw elements)
npm run audit:ui

# Run 60fps Three.js frame-loop memory and allocation audit
npm run audit:r3f

# Capture multi-viewport Playwright screenshots across 5 standard viewports
npm run capture:views
```

---

## Documentation Index

- [**Documentation Index (`docs/README.md`)**](docs/README.md): Architecture, reference and design specifications.
- [**Conductor (`conductor/index.md`)**](conductor/index.md): Workflow, styleguides, tracks, backlog and initiative history.
