# Starmap Architecture & Design Documentation

Welcome to the Starmap documentation repository. This directory houses the authoritative specifications, architectural decisions, and design guidelines governing the 3D cartographic engine, 2D UI system, data pipelines, and user experience.

---

## Authoritative Documentation Registry

### 1. Target Architecture & System Foundations (`docs/architecture/`)
* [**3D Canvas Management & WebGL Lifecycle** (`docs/architecture/3d-canvas-management.md`)](./architecture/3d-canvas-management.md)
  The authoritative architecture for the single persistent WebGL `<Canvas>` mounted in `RootCanvasHost`, declarative `<CanvasLayer>` stage slots (`useCanvasStageStore`), direct scene swapping, CSS-to-Three `ThemeTokenBridge` synchronisation, lifecycle-only occlusion registration, 60fps `useFrame` zero-allocation guardrails, `CartoLineMaterial` in-place stability, `BodyMarker` 8px drag deadzones, and headless `@react-three/test-renderer` unit testing.
* [**Routing and State Architecture** (`docs/architecture/routing-and-state.md`)](./architecture/routing-and-state.md)
  The single source of truth for TanStack Router navigation (`DEC-R041`), the orthogonal URL search query grammar (`?center=`, `?select=`, `?focus=`, `?route=`, `?layer=`, `?q=`, `?searchCategory=`), RFC 3986 search string serialisation (`stringifyStarmapSearch`), strict `validateSearch` sanitisation, state boundaries between URL state and ephemeral Zustand stores, reactive repository hooks, and bounded LRU cache limits.
* [**Layering and Guardrails Architecture** (`docs/architecture/layering-and-guardrails.md`)](./architecture/layering-and-guardrails.md)
  Defines the strict 1-directional module layer rank hierarchy (ranks 0–10), interface primitive purity, prototype isolation, zero circular dependencies, and the permanent automated CI guard suite (`npm run audit:guards`, `npm run audit:ui`, `npm run audit:r3f`, shrink-only `scripts/guards/baseline.json`, and Playwright E2E baselines).
* [**Data Pipeline & Codecs Architecture** (`docs/architecture/data-pipeline-and-codecs.md`)](./architecture/data-pipeline-and-codecs.md)
  The deterministic 11-stage offline data pipeline (`scripts/build-data.ts`, `scripts/pipeline/*.ts`), reproducible build epochs (`data/seed/build-epoch.json`), versioned seed catalogues, 28-byte binary sector shards (`.bin`), compact JSON envelopes, modulo-36 sharding, build-time domain precalculations, and the role of `public/data/stars.json` as an external reference dataset (`DEC-R027`).

### 2. 3D Spatial Architecture & WebGL Engine
* [**3D Spatial Architecture & Coordinate System** (`docs/3d-spatial-architecture.md`)](./3d-spatial-architecture.md)
  The single source of truth for the tri-axial coordinate system, horizontal Galactic Equator datum ($XY, Z=0$), mobile travelling fins, cardinal galactic bearing lines, screen-constant instrument footprints, metric volume zoom dynamics, and multi-tier spatial occlusion/clustering rules.
* [**Three.js Token Synchronisation Bridge** (`docs/threejs-token-sync.md`)](./threejs-token-sync.md)
  The technical bridge pattern extracting CSS custom properties (semantic tokens) into reactive WebGL materials and lighting uniforms, ensuring instantaneous theme toggling between Light and Dark modes.

### 3. Design System & UI Visual Language
* [**Design System Specification** (`docs/design-system.md`)](./design-system.md)
  The foundational design system guide: design tokens, typography scale, composition primitives (`<Stack>`, `<Cluster>`, `<Grid>`, `<Sidebar>`), zero outer margin rules, strict zero-`className`/`style` on Tier 1 primitives (`DEC-R050`), mandatory 4-file Component Quads (`AUD-122`, `AUD-129`), `DetentSheet` snap physics (`DEC-R051`), and CUBE CSS conventions.
* [**UI Visual Language & Token Semantics** (`docs/ui-visual-language.md`)](./ui-visual-language.md)
  The semantic ruleset: achromatic reading plane, reserved interactive focus, hazard/safety states (`--hazard-*`), observational confidence pips (`--confidence-*`), monospace tabular data formatting with inline uncertainties, and component-level CUBE exceptions via HTML `data-*` attributes.

### 4. Product Experience, Journeys & Requirements
* [**Scene Requirements & View Architecture** (`docs/scene-requirements.md`)](./scene-requirements.md)
  Defines the 3-tier scale hierarchy, global 4-tier interaction state taxonomy (`passive`, `active`, `selected`, `focused`), Universal Secondary Objects Pane, and authoritative cartographic rendering rules for all 3 views (**Galaxy Macro View**, **Stellar System View**, and **Planetary Inspection View**).
* [**User Archetypes & Cross-Scale User Journeys** (`docs/user-journeys.md`)](./user-journeys.md)
  Detailed profiles, mental models, jobs to be done (JTBD), and 5 primary end-to-end user journeys for the **Sci-Fi Reader**, **Sci-Fi Author / Worldbuilder**, and **Casual Explorer**.
* **Feature backlog:** retired. Planned features live in `conductor/tracks/`; unplanned ideas in `conductor/backlog.md`.

### 5. Astronomical Data Sources & Provenance
* [**Astronomical Data Sources & Catalog Architecture** (`docs/data-sources.md`)](./data-sources.md)
  Scientific dataset provenance, ingestion pipelines, coordinate frame harmonization (Equatorial J2000 to Cartesian parsecs), 3D kinematic vector derivation, and catalog partitioning across HYG v3, Gaia DR3, NASA Exoplanet Archive, SIMBAD, and JPL Horizons.

---

## Test & Prototype Control Fixtures

Static, deterministic slices of real astronomical catalog data used for isolated unit testing and Storybook component prototyping:
* [`tests/fixtures/stars.fixture.json`](../tests/fixtures/stars.fixture.json): 6 control group stars (Sol, Sirius, Betelgeuse, Alpha Centauri A, Vega, Polaris) extracted from HYG v3.
* [`tests/fixtures/system.fixture.json`](../tests/fixtures/system.fixture.json): Complete `SystemManifest` records comparing the richly characterized **Sol** system (8 planets) with the sparser exoplanet system **Tau Ceti** (4 confirmed candidates).
* [`tests/fixtures/planet.fixture.json`](../tests/fixtures/planet.fixture.json): Detailed `DetailedPlanetRecord` records contrasting the in-situ baseline **Earth** with the observationally constrained candidate **Tau Ceti e** (featuring measurement uncertainties $\pm \sigma$ and em-dash fallback states).

---

## Historical & Exploration Scratchpads

The following files contain exploratory discovery notes and brainstorming captured during design tracks. They are retained for historical context, while the documents listed above serve as the binding authoritative specifications:
* `docs/user-journeys-exploration-notes.md`: Exploration scratchpad from User Journeys mapping.
* `docs/3d-visual-design-notes.md`: Exploration scratchpad from 3D spatial design.
* `docs/2d-visual-design-notes.md`: Exploration scratchpad and visual reference catalog for 2D UI materiality, optical principles, and the 8-tier elevation stack.
* `docs/ui-paradigm-exploration.md`: Exploration scratchpad from UI layout prototyping.
