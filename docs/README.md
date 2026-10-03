# Starmap Architecture & Design Documentation

Welcome to the Starmap documentation repository. This directory houses the authoritative specifications, architectural decisions, and design guidelines governing the 3D cartographic engine, 2D UI system, data pipelines, and user experience.

---

## Authoritative Documentation Registry

### 1. 3D Spatial Architecture & WebGL Engine
* [**3D Spatial Architecture & Coordinate System** (`docs/3d-spatial-architecture.md`)](./3d-spatial-architecture.md)
  The single source of truth for the tri-axial coordinate system, horizontal Galactic Equator datum ($XY, Z=0$), mobile travelling fins, cardinal galactic bearing lines, screen-constant instrument footprints, metric volume zoom dynamics, and multi-tier spatial occlusion/clustering rules.
* [**Three.js Token Synchronisation Bridge** (`docs/threejs-token-sync.md`)](./threejs-token-sync.md)
  The technical bridge pattern extracting CSS custom properties (semantic tokens) into reactive WebGL materials and lighting uniforms, ensuring instantaneous theme toggling between Light and Dark modes.

### 2. Design System & UI Visual Language
* [**Design System Specification** (`docs/design-system.md`)](./design-system.md)
  The foundational design system guide: design tokens, typography scale, composition primitives (`<Stack>`, `<Cluster>`, `<Grid>`, `<Sidebar>`), zero outer margin rules, and CUBE CSS conventions.
* [**UI Visual Language & Token Semantics** (`docs/ui-visual-language.md`)](./ui-visual-language.md)
  The semantic ruleset: achromatic reading plane, reserved interactive focus, hazard/safety states (`--hazard-*`), observational confidence pips (`--confidence-*`), monospace tabular data formatting with inline uncertainties, and component-level CUBE exceptions via HTML `data-*` attributes.

### 3. Product Experience, Journeys & Requirements
* [**Scene Requirements & View Architecture** (`docs/scene-requirements.md`)](./scene-requirements.md)
  Defines the 3-tier scale hierarchy, global 4-tier interaction state taxonomy (`passive`, `active`, `selected`, `focused`), Universal Secondary Objects Pane, and authoritative cartographic rendering rules for all 3 views (**Galaxy Macro View**, **Stellar System View**, and **Planetary Inspection View**).
* [**User Archetypes & Cross-Scale User Journeys** (`docs/user-journeys.md`)](./user-journeys.md)
  Detailed profiles, mental models, jobs to be done (JTBD), and 5 primary end-to-end user journeys for the **Sci-Fi Reader**, **Sci-Fi Author / Worldbuilder**, and **Casual Explorer**.
* [**Feature Specifications & Backlog Registry** (`docs/feature-backlog.md`)](./feature-backlog.md)
  Authoritative specifications and functional descriptions for all 22 system features, organized across 6 functional domains (Canvas Synchronization, Navigation & Relativistic Physics, Exploration Filters, Surfaces & Tours, Contextual Controls, and Encyclopedia Architecture).

### 4. Astronomical Data Pipeline
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
* `docs/feature-backlog-notes.md`: Exploration scratchpad from Feature Backlog definition.
* `docs/user-journeys-exploration-notes.md`: Exploration scratchpad from User Journeys mapping.
* `docs/3d-visual-design-notes.md`: Exploration scratchpad from 3D spatial design.
* `docs/ui-paradigm-exploration.md`: Exploration scratchpad from UI layout prototyping.
