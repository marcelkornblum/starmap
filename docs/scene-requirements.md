# Scene Requirements & View Architecture Specification

This document defines the cartographic rules, rendering requirements, UX goals, and interaction controls for Starmap's three primary spatial views (**Galaxy Macro View**, **Stellar System View**, and **Planetary Inspection View**), as well as cross-scale transitions, breadcrumbs, and contextual controls.

> [!IMPORTANT]
> **Architectural Precedence:**
> - Spatial coordinate frames, travelling fins, and datum surfaces are governed by [`docs/3d-spatial-architecture.md`](./3d-spatial-architecture.md).
> - 2D UI tokens, typography, monospace alignments, and CUBE exceptions are governed by [`docs/ui-visual-language.md`](./ui-visual-language.md).
> - CSS token synchronization to WebGL materials is governed by [`docs/threejs-token-sync.md`](./threejs-token-sync.md).
> - Hand-crafted control fixtures are housed in [`tests/fixtures/system.fixture.json`](../tests/fixtures/system.fixture.json) and [`tests/fixtures/planet.fixture.json`](../tests/fixtures/planet.fixture.json).

---

## 1. Scale Hierarchy & View Overview

Starmap structures spatial exploration across three strictly decoupled visual scales:

| Scale Tier | Typical Dimension | Primary Datum & Framing | Units | Key Focus |
| :--- | :--- | :--- | :--- | :--- |
| **1. Galaxy View** | $1\text{ to }100\text{ pc}$ | Galactic Equator ($XY, Z=0$), travelling fins | Parsecs ($\text{pc}$) / Light-years ($\text{ly}$) | Stellar distribution, clustering, interstellar routes, light-speed comms delay |
| **2. System View** | $0.1\text{ to }100\text{ AU}$ | Stellar barycentre, system invariant plane | Astronomical Units ($\text{AU}$) / Light-minutes | Keplerian orbital rings, Habitable Zone band, planetary alignments, transfer windows |
| **3. Planet View** | $10^3\text{ to }10^6\text{ km}$ | Planetary centre of mass, rotational axis | Kilometres ($\text{km}$) / Earth radii ($\text{R}_\oplus$) | Atmospheric limb, axial tilt, satellite system, physical parameters |

---

## 2. Global Interaction Architecture & State Taxonomy

### 2.1 Four-Tier Entity Interaction State Taxonomy
All entities, reticles, list items, and interactive surfaces across all spatial scales strictly adhere to four universal interaction tiers:
1. **`passive`**: Baseline background entity, minimal unreticled dot or neutral element.
2. **`active`**: Within interactive scope or volume; basic reticle or row highlight present.
3. **`selected`**: Full decorated reticle applied (hover, click, or list selection may apply this state).
4. **`focused`**: Top-level prominence; accented with `--state-focus`, camera focal lock, and telemetry container engagement.

### 2.2 Universal Secondary Objects Pane
A unified companion panel pattern deployed across all views to list child or in-scope entities:
- **Galaxy View:** Lists candidate systems and stars in the active volume.
- **System View:** Lists planets, dwarf planets, and minor bodies orbiting the central star.
- **Planet View:** Lists moons and natural satellites orbiting the planet.
- **Encyclopedia / Reference:** Lists category variants or exemplar subtype members.
- **Bi-Directional Canvas Sync:** Hovering or clicking a row in the secondary pane promotes the entity through the 4-tier taxonomy (`active` $\rightarrow$ `selected` $\rightarrow$ `focused`) and synchronises its 3D reticle on canvas.


---

## 3. Galaxy Macro View (Parsec Scale)

### 3.1 UX Goals & Primary Archetypes
- **The Sci-Fi Reader:** Instantly locate stars from literature (e.g. *Tau Ceti*, *Alpha Centauri*, *Epsilon Eridani*), benchmark travel times under realistic and speculative propulsion models, and understand spatial relationships without tumbling.
- **The Sci-Fi Author:** Filter the solar neighbourhood for habitable candidates, plot multi-leg network trade routes, audit light-speed communication delays, and bookmark custom camera angles.
- **The Casual Explorer:** Browse serendipitously via curated on-ramps ("Newly Discovered Exoplanet", "Extreme Worlds"), viewing glanceable narrative summary cards.

### 3.2 Rendered Geometry & Data Plane
- **Stellar Nodes:** Monochrome markers at the universal invariant screen-space size; any magnitude, spectral, or other data encoding is applied only via analytical layers ([`3d-spatial-architecture.md` §2.1](./3d-spatial-architecture.md)).
- **Galactic Datum Floor & Drop Stalks:** Projected datum circle on the Galactic Equator ($Z=0$) directly beneath the focal centre. Vertical drop stalks connect stars above/below the equator to the datum plane, with visibility governed by entity interaction state ([`3d-spatial-architecture.md` §2.4](./3d-spatial-architecture.md)).
- **Travelling Coordinate Fins:** Three orthogonal mobile quarter-circle fins ($XY$, $XZ$, $YZ$) centered at the camera's focal point with degree tick marks along curved perimeter arcs.
- **Bearing Vectors:** Cardinal galactic bearings for Galactic Core ($l=0^\circ$) and Galactic Orbit ($l=90^\circ$) projecting to screen edges with detachable pinned headings.
- **Interstellar Route Chords:** 3D vector lines connecting selected multi-point route nodes, annotated with spatial distance ($\text{pc}/\text{ly}$), one-way radio delay, and transit durations.

### 3.3 Cull & Clutter Prevention Rules
- **Hide Planetary Details:** Exoplanets, individual planetary orbits, and moons are strictly culled in Galaxy View.
- **Cluster Occlusion:** Dense stellar clusters resolve via visual reticle grouping; overlapping labels collapse to priority anchors.
- **Background Filtering:** During route planning or candidate filter mode, non-matching stars dim to low-opacity background points to eliminate visual noise.

### 3.4 Contextual Controls & HUD Elements
- **Command Palette (`/` or `Ctrl+K`):** Global search with fuzzy autocomplete on proper name, Bayer designation, catalog ID, or spectral class.
- **Spatial Anchor Selector:** Ability to set any system as the Primary Spatial Anchor (distances measured relative to anchor, not forced to Sol).
- **Candidate Filter Drawer:** Sliders for radius ($\le 15\text{ ly}$), spectral types (G, K, M), and intent switches (e.g. *"Habitable Zone Host"*).
- **Attitude Gimbal Minimap:** Corner micro-viewport displaying camera pitch, roll, and yaw relative to the Galactic Equator.

---

## 4. Stellar System View (AU Scale)

### 4.1 Primary Datum & Coordinate Plane
- **System Invariant Plane:** The flat orbital plane through the central star/barycentre ($Z=0$) serves as the primary datum floor.

### 4.2 Reference Markings & Cartography
- **Travelling Datum Circle:** Projected circle on the invariant plane directly beneath camera focus, identical to Galaxy View.
- **Hierarchical Range Rings:** Concentric logarithmic distance rings scaling in Astronomical Units (e.g. $0.5, 1, 2, 5, 10, 20, 50\text{ AU}$).
- **Travelling Coordinate Fins:** Three mobile orthogonal quarter-circle fins ($XY$, $XZ$, $YZ$) with curved perimeter degree tick marks, identical to Galaxy View.
- **Vertical Drop Stalks:** Rendered from inclined bodies and asteroids down to the invariant plane ($Z=0$), with visibility governed by entity interaction state ([`3d-spatial-architecture.md` §2.4](./3d-spatial-architecture.md)).

### 4.3 Bearing Vectors
- **Default Bearing Vector:** Permanently points to the **barycentric central point** (ensuring the host star is never lost when panning out).
- **Galactic Core Exception:** In the rare circumstance that the barycentric central point itself is in focus, the bearing vector switches to point toward the **Galactic Core** (maintaining galactic compass heading).
- **Secondary Bearing:** Points along the system's **prograde orbital direction** (direction of revolution).

### 4.4 Orbits & Routes
- **Orbits as an Optional Layer:** Rendered as monochrome dashed (or dotted) hairlines at rest; the line pattern is a semantic token (`--chrome-orbit-style`), not a per-component choice.
- **State-Driven Styling:** An orbit inherits its body's interaction state. `selected` and `focused` orbits take the kinematic colour (`--chrome-kinematic-color`); all colours and opacities per state are semantic tokens.
- **State Exception Rule:** A `selected` or `focused` entity forces its orbit to render regardless of whether the orbits layer is toggled off (matching drop stalks, [`3d-spatial-architecture.md` §2.4](./3d-spatial-architecture.md)).
- **Orbital Routes:** Routes render as a thick solid line in the kinematic colour, visually distinct from dashed/dotted orbits. Colour, width and pattern are semantic tokens (`--chrome-route-color`, `--chrome-route-width`, `--chrome-route-style`) so they can be retuned without code changes.

### 4.5 Astronomical Zones
- **Status:** Open research topic. Rendering of the Circumstellar Habitable Zone (CHZ), frost line, and debris disks will follow broader architectural research findings.

### 4.6 Time & Motion Controls
- **Temporal Scrubber:** Instantiates the global time control element in this view (play, pause, speed multipliers such as $1\times, 2\times$, and timeline scrubbing).

### 4.7 Cull & Clutter Prevention Rules
- **Background Stars:** Galactic stars fade out completely into black space at system scale to focus entirely on system architecture.
- **Moons / Natural Satellites:** Strictly culled at AU scale; only appear when a planet is selected, focused, or inspected.

### 4.8 Camera Controls
- **Navigation Dynamics:** Identical to Galaxy View (unconfined 3D orbital navigation around the active focal origin, screen-constant instrument footprint, metric volume zoom scaling, and attitude gimbal tracking).

---

## 5. Planetary Inspection View (Kilometre Scale)

### 5.1 Primary Datum & Coordinate Plane
- **Planetary Rotational Equator:** The plane perpendicular to the planet's polar spin axis ($XY, Z=0$) serves as the primary datum floor (polar rotational axis is $Z$).

### 5.2 Reference Markings & Cartography
- **Travelling Datum Circle:** Projected circle on the rotational equatorial plane beneath camera focus.
- **Hierarchical Range Rings:** Concentric logarithmic distance rings scaling in kilometres ($\text{km}$) or planetary radii ($\text{R}_\oplus$).
- **Travelling Coordinate Fins:** Three mobile orthogonal quarter-circle fins ($XY$, $XZ$, $YZ$) with curved perimeter degree tick marks (indicating latitude and longitude).

### 5.3 Bearing Vectors
- **Default Bearing Vector:** Permanently points to the **planet's centre of mass**.
- **Host Star Exception:** When the planet itself is in focus, the primary bearing vector switches to point outward toward the **Host Star**.
- **Secondary Bearing Vector:** Points along the planet's **prograde orbital velocity vector** (direction of orbital motion around the star).

### 5.4 Planetary Disc Rendering
- **Marker Always Present:** Every body, including the inspected planet, always carries its invariant-size marker and reticle ([`3d-spatial-architecture.md` §2.1–2.2](./3d-spatial-architecture.md)).
- **Physical Disc:** The inspected planet additionally renders a physical disc at true scale. The disc is separate geometry and fades out as its projected diameter falls below the marker diameter, leaving the marker alone. Stars and moons remain marker-only.
- **Uniform Lighting:** The disc is rendered with uniform (unlit) shading for geographical/feature legibility. There is no day/night terminator, no host-star directional light and no lighting toggle.
- **Classification Texture:** The disc surface texture is selected by planetary classification via a classification-keyed texture manifest, with a neutral fallback for unclassified bodies. This is a physical surface depiction, not an analytical encoding (§2.1 of the spatial architecture still forbids hard-coded data-to-colour bindings).

### 5.5 Moons & Natural Satellites
- **Consistency with System Orbits:** Moons and their orbits adhere to the exact same rules as planets in System View:
  - Moon nodes follow the global 4-tier reticle taxonomy (`passive`, `active`, `selected`, `focused`).
  - Moon orbits follow the System View orbit rules in full (§4.4): optional layer, state-driven kinematic styling, and `selected` / `focused` moons force their orbit to render regardless of layer setting.
  - Orbital transfer routes between satellites follow the route styling defined in §4.4.

### 5.6 Cull & Clutter Prevention Rules
- **Background Stars:** Galactic background stars fade out completely into black space.
- **Host Star Presence:** The host star is visible as a distant directional anchor using the **exact same cartographic symbology** (identical invariant-size marker and reticle) as in the other views.

### 5.7 Planetary Dossier Telemetry
When inspecting a planet, the primary dossier panel presents:
- **Primary Metrics:** Radius, Surface Gravity, Orbital Period, and Bulk Density ($\text{g/cm}^3$).
- **Physical Data:** Semi-Major Axis, Eccentricity, Axial Tilt, Escape Velocity.
- **Classifications:** Formal Scientific Taxonomy (e.g. `Terrestrial`, `Super-Earth`, `Gas Giant`) accompanied by an Accessible Descriptive Archetype tag (e.g. *"Warm Rocky World"*, *"Cold Gas Giant"*).
- **Atmospheric Data:** Gas percentage breakdown, or em dash fallback (`—` / `Awaiting Spectroscopy`).
- **Status & Confidence:** Observational Confidence Pip (`--confidence-*`) and Hazard Status Badge (`--hazard-*`).

### 5.8 Satellite Manifest Integration
Major moons and natural satellites are hosted in the **Universal Secondary Objects Pane** with bi-directional selection synchronization with the 3D canvas.




---

## 6. Navigation Transitions & Breadcrumb Hierarchy

### 6.1 Selection-Aware Breadcrumb Model
Breadcrumbs maintain persistent orientation across all scales and dynamically reflect the currently selected item as their terminal segment:

```
[Galaxy View - Unselected]
Local Volume

[Galaxy View - Star Selected]
Local Volume  →  Tau Ceti

[System View - System Barycentre]
Local Volume  →  Tau Ceti

[System View - Planet Selected]
Local Volume  →  Tau Ceti  →  Tau Ceti e

[Planet View - Active Inspection]
Local Volume  →  Tau Ceti  →  Tau Ceti e

[Encyclopedia - Article View]
Encyclopedia  →  Star Types  →  Red Supergiant
```

- Clicking any ancestor breadcrumb segment navigates up to that view scale and clears lower-level selection.
- Esc key steps back one level of selection or view hierarchy.

### 6.2 Contextual Search Scoping
Search behaviour adapts automatically to the active view level with a GitHub-style context switcher chip:
- **Galaxy View:** Default scope: `All Systems`. Searches across the 100pc volume.
- **System View:** Default scope: `In this System` (matches planets, moons, asteroid belts, lagrange points). The context switcher allows instant broadening to `All Systems`.
- **Planet View:** Default scope: `In this Body` (matches moons, planetary surface features, atmospheric strata).

### 6.3 Scale Transitions
Scale transitions between view tiers (Galaxy $\rightarrow$ System $\rightarrow$ Planet) must maintain spatial context and prevent disorientation. The exact camera mechanics, easing curves, and interpolation dynamics are deferred to dedicated interaction design and the `3d-engine-implementation` track.

---

## 7. Prototype Fixture Integration

Visual prototyping in Storybook and automated unit testing consume the hand-crafted control fixtures:

1. **[`tests/fixtures/system.fixture.json`](../tests/fixtures/system.fixture.json):**
   - **Sol System:** Rich, complete baseline with 8 planets, fully characterised Keplerian orbital elements, high confidence, nominal hazard status.
   - **Tau Ceti System:** Sparser exoplanetary system with 4 confirmed candidates ($g, h, e, f$), unconstrained orbital inclinations, mass-radius estimates, demonstrating observational uncertainties and em-dash fallbacks.
2. **[`tests/fixtures/planet.fixture.json`](../tests/fixtures/planet.fixture.json):**
   - **Earth:** Terrestrial archetype, in-situ verified, nominal status, atmospheric breakdown, single moon.
   - **Tau Ceti e:** Super-Earth exoplanet archetype in the CHZ, radial-velocity constrained, caution hazard status, explicit measurement uncertainties ($\pm 0.8\text{ M}_\oplus, \pm 0.4\text{ R}_\oplus$), em-dash nulls for unmeasured atmospheric and magnetic properties.
