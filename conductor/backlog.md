# Product Backlog

Candidate features and ideas identified during architectural discussions, awaiting formal track planning and specification.

---

## Navigation & Spatial HUD

- **Temporal Scrubber (Time Travel Control):** Interactive timeline scrubber allowing users to propagate planetary and stellar orbits forward and backward through time using Keplerian mechanics.
- **Targeting Reticle & Celestial Brackets:** In-viewport HUD targeting brackets that lock onto selected stars or planets, tracking their screen-space coordinates during camera rotation and zoom.
- **Galactic Orientation Compass:** Fixed HUD orientation indicator displaying galactic coordinate axes (Galactic North, Galactic Centre vector) relative to current camera heading.
- **Floating Camera Controls & Presets:** Logarithmic zoom stepper buttons, camera reset, orbital view lock, and top-down ecliptic view toggle.
- **Layer Visibility Toggles:** HUD controls for toggling visual rendering layers (constellation lines, habitable zones, coordinate grid, star names, velocity vectors, magnitude thresholds).
- **Hierarchical Breadcrumb Trail:** Docked navigational breadcrumbs (e.g. Galaxy > Orion Arm > Local Bubble > Solar System > Earth) for jumping across scale domains.
- **Celestial Command Palette (`Cmd+K`):** Fast search-and-jump modal palette to locate stars, exoplanets, constellations, or toggle visual rendering layers.

---

## Search & Discovery

- **Floating Search Pill & Autocomplete Panel:** Omnipresent search pill with an anchored autocomplete result sheet showing celestial POIs, coordinates, and classification badges.
- **Deep Catalog Filter Drawer:** Full-height slide-out drawer for multi-variable filtering of celestial bodies (by distance, spectral type, habitability index, exoplanet count).

---

## Telemetry & Scientific Dossiers

- **Real-Time Telemetry Readouts & Well:** Sunken inset console panels displaying live distance, apparent magnitude, radial velocity, and light-travel time from current viewpoint to targeted object.
- **Orbital Telemetry Tables:** Docked inspector view rendering Keplerian orbital elements (semi-major axis, eccentricity, inclination, periapsis, orbital period).
- **Celestial Dossier Sheets:** Contextual slide-out sheets containing astrophysical data (spectral classification, mass, radius, metallicity, habitability indicators) and schematic/visual previews.
- **Spectral Classification Hover Tooltips:** Contextual tooltips decoding Morgan–Keenan spectral types (e.g. `G2V`, `M1III`) on star hover.

---

## Route Planning & In-Universe Flight

- **Interstellar Route Planner:** Waypoint-based trajectory calculator plotting travel vectors and transit times between stellar systems.
- **Route History & Bookmarks:** Flight log drawer persisting recent navigational trajectories and saved celestial coordinates.
- **Warp / Transit Calculation Alerts:** System alert banners/toasts reporting trajectory calculation status or jump feasibility.

---

## System Configuration & Accessibility

- **System Settings Drawer:** Slide-out drawer for rendering performance, audio/SFX, measurement units (AU, parsecs, light-years), and theme switching (Light/Dark).
- **Keyboard Shortcut Reference Modal:** Modal overlay documenting navigation keys, camera controls, and HUD shortcuts.

---

## 3D Cartography & Visual Language Refinement

- **Volumetric Media & Interstellar Media (ISM):** Finesse representation of diffuse 3D spatial volumes (molecular clouds, nebulae, star-forming regions, the Local Bubble void) via mathematical micro-dot point-density fields (cartographic stippling) and planar survey cross-hatching on datum planes.
- **Multi-Scale Transition Mechanics:** Finesse dynamic datum plane shifts across scale boundaries (Galactic Equator $XY \rightarrow$ System Invariable/Ecliptic Plane $\rightarrow$ Planetary Rotational Equator) and visual indicators for inter-scale plane tilt angles.
- **Keplerian Orbit Lines:** Finesse elliptical orbit styling in System View (solid vs stippled linework, periapsis/apoapsis ticks, ascending/descending nodes, inclination shading above/below the ecliptic).
- **Typographic Hierarchy & Label Formatting (Layer 3):** Finesse typographic hierarchy, uppercase/tabular monospace formatting, font tokens, and exact offset geometry of system designations relative to reticle facets.
- **Multi-Tier Reticle Priority Hierarchy (Phase 4):** Formalise the multi-tier priority occlusion hierarchy (which reticles yield to which under line-of-sight collisions) alongside User Journeys in Phase 4.
- **Zoom-Level Clamping Calibration:** Calibrate specific zoom-tier clamping thresholds in interactive mockups to suppress ambient labels/reticles during macro zoom-out and prevent visual crowding.
- **Far Horizon Fade Calibration:** Calibrate the specific distance-multiplier horizons and attenuation curves for background stars fading outside the active focal aperture ($R_{fin}$).
- **Kinematic Vector Terminus & Epoch Calibration:** Finalise the activation rules, specific astronomical epoch ($\Delta t$), and terminus styling (ghost pip vs tick) for projected dotted velocity vectors.
- **Camera Coupling Implementation:** Resolve whether zoom is implemented via camera dolly with proportional aperture scaling vs fixed camera distance with variable scene aperture radius.
- **Significance-Gated Data Filtering (Toponymic Hierarchy):** Explore dynamic prioritisation of entity visibility based on active survey queries or astronomical significance rather than arbitrary global culling.

---

## Core Architecture & Event System

- **Unified 3D-2D Event & Telemetry Projection Bridge (Scheduled for 3D Engine Track):** Design and establish a rigorous, strongly typed interaction and event pipeline bridging 3D WebGL/Three.js scene events (raycasting, object pick/hover, camera transitions) and 2D DOM/HUD UI layers. Propagate entity interaction states (`passive`, `active`, `selected`, `focused`), project 3D entity coordinates to 2D screen-space pixels without layout thrashing, and tunnel camera action commands from 2D button clicks into the 3D scene.
- **UI Component Inventory & Surface Registry:** Author and maintain the comprehensive inventory of all 2D UI and HUD components required across the application (`<SecondaryObjectsPane>`, `<TimeScrubber>`, `<Breadcrumbs>`, `<ScopeSwitcherChip>`, `<CommandPalette>`, `<AdaptiveTelemetryContainer>`, `<AttitudeMinimap>`, `<RoutePlanningBay>`, `<TourWaypointCard>`, `<ParameterComparator>`, `<CodexArticleView>`, `<CommsLagSimulator>`).


---

## Observability & Analytics

- **Comprehensive Interaction & Performance Analytics:** Establish a clear, granular analytics and telemetry pipeline capturing detailed user journey events (POI selections, search behaviour, viewport transitions, tool interactions) and client-side runtime performance (frame rates, render passes, asset streaming latency, WebGL context events). Define a formal event taxonomy with strongly typed payloads decoupled from UI presentation logic.
