# Product Backlog

Candidate features and ideas awaiting formal track planning. Items here are either too high-level or blocked on upstream tracks. Graduate via `conductor-new-track`.

> Items absorbed into tracks on 2026-10-04: see `console-ui-shell`, `telemetry-container`, `search-discovery`, `route-measurement`, `3d-engine-implementation` and `reference-engine`. `docs/feature-backlog.md` was retired at the same time.

---

## Navigation & Spatial HUD

- **Keyboard Shortcut Reference Modal:** Accessible keymap cheat-sheet modal detailing global navigation bindings, camera presets, and layer toggles.
- **Celestial Command Palette (`Cmd+K` / `/`):** Fast search-and-jump modal palette to locate stars, exoplanets, constellations, or toggle visual rendering layers. Currently a rough prototype only; needs a full production build. Natural home alongside `search-discovery`.

---

## Exploration, Tagging & Filters

- **Tags:** Flexible metadata tagging across celestial entities for search filtering, thematic categorisation and glanceable tags (e.g. `Habitable Zone`, `Super-Earth`, `Recent JWST Target`). *Needs a data-model decision in the pipeline.*
- **Filters & Filter Sets:** Configure, save and share preset or custom filter criteria (e.g. "Habitable Zone candidates within 15 ly"). *After `search-discovery`.*

---

## Surfaces & Curated Tours

- **Tour Waypoint Card:** Card variant with narrative elements and step-through controls (`◀ Previous Highlight` | `Next Highlight ▶`) for curated tours and guided journeys. *After `telemetry-container` card hierarchy.*

---

## Route Planning & Communications

- **Route History & Bookmarks:** Flight log drawer persisting recent trajectories and saved celestial coordinates. *After `route-measurement`.*
- **Warp / Transit Calculation Alerts:** Alert banners/toasts reporting trajectory calculation status or jump feasibility. *After `route-measurement`.*
- **Relativistic & Interplanetary Conversation Simulator (Comms Lag):** Visualises conversation over astronomical distances: exchanges subject to one-way and round-trip light-speed delays (Earth–Mars 3–22 min; Sol–Tau Ceti 11.9 yr), out-of-order responses, asynchronous queuing and desynchronisation. *After `route-measurement`.*

---

## System Configuration

- **System Settings Drawer:** Rendering performance, audio/SFX, measurement units (AU, parsecs, light-years) and theme switching (Light/Dark).

---

## 3D Cartography & Visual Language Refinement

- **High-Fidelity Celestial & Planetary Textures:** Generate and integrate rich, high-resolution procedural and photographic texture maps across all celestial bodies requiring physical surface or atmospheric visualisation (terrestrial surface geography, bathymetry, cloud decks, and night-side specular lights; gas giant turbulent atmospheric bands and storm vortices; ice giant hazes; brown dwarf thermal bands; and stellar photospheres). Support multi-scale LOD mipmaps, procedural shader fallbacks, and seamless texture streaming for close-up planetary inspection.
- **Volumetric Media & Interstellar Media (ISM):** Diffuse 3D volumes (molecular clouds, nebulae, star-forming regions, the Local Bubble void) via micro-dot point-density fields (cartographic stippling) and planar survey cross-hatching on datum planes.
- **Keplerian Orbit Lines:** Finesse elliptical orbit styling in System View (solid vs stippled linework, periapsis/apoapsis ticks, ascending/descending nodes, inclination shading above/below the ecliptic).
- **Typographic Hierarchy & Label Formatting (Layer 3):** Finesse typographic hierarchy, uppercase/tabular monospace formatting, font tokens, and exact offset geometry of system designations relative to reticle facets.
- **Multi-Tier Reticle Priority Hierarchy:** Formalise which reticles yield to which under line-of-sight collisions.
- **Kinematic Vector Terminus & Epoch Calibration:** Finalise activation rules, astronomical epoch ($\Delta t$) and terminus styling (ghost pip vs tick) for projected dotted velocity vectors.
- **Significance-Gated Data Filtering (Toponymic Hierarchy):** Dynamic prioritisation of entity visibility based on active survey queries or astronomical significance rather than arbitrary global culling.

---

## Data Architecture & Spatial Ingestion

- **Dynamic 3D Spatial Partitioning & Sector Streaming:** Client-side runtime loading and memory management for astronomical datasets across the 100-parsec neighbourhood. View-frustum and distance-gated asynchronous streaming of sharded 25-pc cubic sectors (`public/data/partitions/sector_*.json`) or packed binary buffers (`Float32Array`) into GPU instanced point buffers; floating-origin shifting to eliminate 32-bit precision jitter between parsec and AU frames; client-side spatial indexing (octree or spatial hash grid) for proximity queries, raycast hit detection and LOD caching.

---

## Observability & Analytics

- **Comprehensive Interaction & Performance Analytics:** Granular analytics capturing user journey events (POI selections, search behaviour, viewport transitions, tool interactions) and client-side runtime performance (frame rates, render passes, asset streaming latency, WebGL context events). Formal event taxonomy with strongly typed payloads decoupled from UI presentation logic.
