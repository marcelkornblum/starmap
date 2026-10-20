# Product Backlog

Candidate features and ideas awaiting formal track planning. Items here are either too high-level or blocked on upstream tracks. Graduate via `conductor-new-track`.

> Items absorbed into tracks on 2026-10-04: see `console-ui-shell`, `telemetry-container`, `search-discovery`, `route-measurement`, `3d-engine-implementation` and `reference-engine`. `docs/feature-backlog.md` was retired at the same time. Items surfaced during `journey-ui-scaffolding` (`FS-002`–`FS-017`) were rationalised into this backlog on 2026-10-20, retiring `conductor/initiatives/journey-ui-scaffolding/feature-scratchpad.md` (with `FS-001`, `FS-005`, `FS-010`, `Tags`, and `Tour Waypoint Card` completed in Tracks 01–03).

---

## Navigation, Camera Choreography & Spatial HUD

- **Choreographed 3D Camera Transitions, Search Framing & Independent Center/Focus State (`FS-012`, absorbing `FS-003` & `FS-013`):**
  - *Cross-Track Coupling (6 Tracks):* Shared across **[Track: Interaction Controls](./tracks/interaction-controls_20261010/spec.md)**, **[Track: Minimap & Scene Transitions](./tracks/minimap-scene-transitions_20261010/spec.md)**, **[Track: 3D Engine Implementation](./tracks/3d-engine-implementation_20260929/spec.md)**, **[Track: Console UI Shell](./tracks/console-ui-shell_20261004/spec.md)**, **[Track: Telemetry Container & Dossiers](./tracks/telemetry-container_20261004/spec.md)**, and **[Track: Search & Discovery UI Surfaces](./tracks/search-discovery_20261004/spec.md)**.
  - **Animated 3D Fly / Zoom Camera Choreography (`FS-012`):** Smoothly glide the 3D camera (origin, azimuth/elevation, dolly distance) on intra-view state changes (`focused`, `center`, `select`) and cross-scale view transitions (`Galaxy` $\leftrightarrow$ `System` $\leftrightarrow$ `Planet`, including `<LayerCard />` waypoint stepping), dissolving parsec drop stalks and galactic grids as AU orbital rings and the circumstellar Habitable Zone materialise, while smoothly retracting HUD panels during flight and snapping them back once the camera settles (respecting `prefers-reduced-motion`).
  - **Search Results Scale & Multi-Result Framing (`FS-003`):** Multiple results (`count > 1`) stay at or transition to the galactic scale and auto-frame all matching systems; single results (`count === 1`) only auto-enter system scale for Solar System (*Sol*) bodies.
  - **Camera `center` vs. Entity `focused` Independence & Conditional `Centre` CTA (`FS-013`):** Cold-loading a focused view initially centres the camera on that target; subsequent camera panning mutates `center` independently of `focused`, applying `?focus=` does not force-re-centre the camera, and the `Centre` CTA (`data-testid="details-button-center"`) in `<DetailsPanel />` is only visible when the live 3D camera centre differs from the focused entity.
- **Local Night-Sky View to 3D Third-Person Projection (`FS-004`):** Enter an Earth location (lat/long or place) and optional time (defaults to "now") to view the local 2D night-sky dome rotated to that orientation, highlight/select visible stars in the sky view, and pull the camera out to a third-person 3D galactic projection to inspect the true 3D spatial distribution and depth of those stars.
- **Keyboard Shortcut Reference Modal:** Accessible keymap cheat-sheet modal detailing global navigation bindings, camera presets, and layer toggles.
- **Celestial Command Palette (`Cmd+K` / `/`):** Fast search-and-jump modal palette to locate stars, exoplanets, constellations, or toggle visual rendering layers. Currently a rough prototype only; needs a full production build. Natural home alongside `search-discovery`.

---

## Exploration, User Layers & Saved Workspaces

- **User-Authored Layers, Saved Workspaces, Route Bookmarks & Filter Presets (`FS-002`, `FS-015`):**
  - Unified user persistence and custom layer authoring built on the `DatasetLayerManifest` (`kind: 'custom-user'`) architecture.
  - Create, name (e.g. *"Outer Colony Reach"*), save, and import/export custom user layers, personal lore annotations, and tagged star clusters across systems.
  - Configure, save, and share preset or custom search/intent filter criteria (e.g. *"Habitable Zone candidates within 15 ly"*).
  - Persist a flight log drawer of recent route trajectories (`?route=`), saved celestial coordinates, and bookmarked multi-leg routes.

---

## Route Planning, Orbital Timing & Communications

- **Multi-Leg Route Networks, Epoch Orbital Timing & Solar Conjunction Blackouts (`FS-014`, `FS-017`):**
  - **Arbitrary-Origin Multi-Stop Route Networks (`FS-014`):** Unlock arbitrary system/body origins (`stops[0]` not restricted to `sol`/`earth`), interactive multi-leg waypoint building and reordering (`?route=epsilon-eridani,tau-ceti,82-g-eridani`), pairwise/cumulative Comms Latency Matrix, speculative propulsion tiers (`0.02c` generation ship, `0.5g` torchship, custom warp/jump multipliers), and trajectory/jump feasibility status alerts.
  - **Epoch-Driven Instantaneous Orbital Separation (`FS-017`):** Wire the `<ControlBar />` Time Controller (`epochTime`, `timeMultiplier`, `isPlaying`) into `journeyService.ts` and intra-system 3D Keplerian mean anomaly propagation so instantaneous 3D body positions, Euclidean separation (`AU`), one-way/round-trip light-minute comms latency, and brachistochrone transit times dynamically update between conjunction and opposition.
  - **Solar Conjunction Comms Blackout Warning (`FS-017`):** Evaluate geometric ray–sphere intersection between the departure–arrival line-of-sight chord and the central star's coronal exclusion zone, flagging solar conjunction communications blackout warnings in `<DirectionsPanel />` and on the 3D `<JourneyChord />`.

---

## 3D Cartography, Guide Cutaways & Visual Language Refinement

- **Volumetric Interstellar Media (ISM), CLIC Clouds & Galactic Structures (`FS-016`):**
  - **Volumetric 3D Sphere–Sphere Instrument Intersection:** Evaluate $\text{distance}(\text{instrumentCentre}, \text{cloudCentre}) \le R_{\text{aperture}} + R_{\text{cloud}}$ so volumetric structures with physical radius `radiusPc` become `'active'` whenever they overlap the Cartographic Instrument sphere.
  - **3D Cartographic Rendering (`GalaxyScene`):** Render diffuse 3D volumes — CLIC clouds (*LIC*, *G-Cloud*, *Blue Cloud*, *Aquilae*, *Mic*, *Leo*, *Dor*, *Eri*, *Vela*), the *Local Bubble* void, nearby molecular/dark cloud complexes (*Rho Ophiuchi*, *Taurus*, *Coalsack*, *Lupus*, *Chamaeleon*, *Pipe*), and open clusters — via micro-dot point-density fields (cartographic stippling) and planar survey cross-hatching on datum planes.
  - **`<BodiesPanel scope="galaxy" />` Integration:** Surface non-passive interstellar clouds and galactic structures alongside star systems.
- **3D Guide Interior Cross-Section Cutaways & Comparative 3D Meshes (`FS-011`):**
  - **Oversized Edge-Truncated 3D Spheres with Internal Cross-Section Cutaways:** Upgrade `data-testid="guide-3d-preview"` across `/guide/*` views with WebGL/R3F 3D spheres offset against the preview frame boundary to expose a 3D interior cutaway (Stellar Core → Radiative Zone → Convective Envelope → Photosphere; Planetary Core → Mantle → Ice/Gas Envelope → Crust/Cloud Tops).
  - **Live 3-Slice Yerkes Combinator & Comparative Metric Meshes:** Drive the 3D star sphere's scale, blackbody shader, and cutaway layers from `StarTypeDetailView`'s 3-slice combinator (`O`–`D`, `0`–`9`, `I`–`VII`), and render 3D comparative reference spheres (Earth/Sol vs `?focus=<entityId>`) in `data-testid="metric-comparative-3d"` on `MetricDetailView`.
- **High-Fidelity Celestial & Planetary Textures:** Generate and integrate rich, high-resolution procedural and photographic texture maps across all celestial bodies requiring physical surface or atmospheric visualisation (terrestrial surface geography, bathymetry, cloud decks, and night-side specular lights; gas giant turbulent atmospheric bands and storm vortices; ice giant hazes; brown dwarf thermal bands; and stellar photospheres). Support multi-scale LOD mipmaps, procedural shader fallbacks, and seamless texture streaming for close-up planetary inspection.
- **Keplerian Orbit Lines:** Finesse elliptical orbit styling in System View (solid vs stippled linework, periapsis/apoapsis ticks, ascending/descending nodes, inclination shading above/below the ecliptic).
- **Typographic Hierarchy & Label Formatting (Layer 3):** Finesse typographic hierarchy, uppercase/tabular monospace formatting, font tokens, and exact offset geometry of system designations relative to reticle facets.
- **Multi-Tier Reticle Priority Hierarchy:** Formalise which reticles yield to which under line-of-sight collisions.
- **Kinematic Vector Terminus & Epoch Calibration:** Finalise activation rules, astronomical epoch ($\Delta t$) and terminus styling (ghost pip vs tick) for projected dotted velocity vectors.
- **Significance-Gated Data Filtering (Toponymic Hierarchy):** Dynamic prioritisation of entity visibility based on active survey queries or astronomical significance rather than arbitrary global culling.

---

## Data Architecture, Adaptive Search & Spatial Ingestion

- **Adaptive Multi-Tier Search Strategy Across Core & Full Datasets (`FS-006`):** Deliberate client-side loading and fallback strategy across `core.json` and `full.json` / category shards: zero-result escalation (`core.json` first, auto-fetching `full.json` on zero matches), progressive background pre-warming, and device/network performance tiering (`navigator.deviceMemory`, `hardwareConcurrency`, `effectiveType`, `saveData`).
- **Dynamic 3D Spatial Partitioning & Sector Streaming:** Client-side runtime loading and memory management for astronomical datasets across the 100-parsec neighbourhood. View-frustum and distance-gated asynchronous streaming of sharded 25-pc cubic sectors (`public/data/systems/sector_*.json`) or packed binary buffers (`Float32Array`) into GPU instanced point buffers; floating-origin shifting to eliminate 32-bit precision jitter between parsec and AU frames; client-side spatial indexing (octree or spatial hash grid) for proximity queries, raycast hit detection and LOD caching.

---

## Discoverability, SEO, Feedback & System Configuration

- **SEO, Structured Metadata & Curated Shortlink Landing URLs (`/go/<slug>`, `FS-007`, `FS-008`):** Dynamic per-route `<title>`, `<meta name="description">`, canonical URLs, Open Graph / Twitter Card metadata, `sitemap.xml`, and Schema.org / JSON-LD structured data, paired with friendly entry-point URLs (`/go/hail-mary`, `/go/dune`, `/go/trappist`, `/go/voyager`) resolving to pre-configured camera framing, active layers (`?select=layer:<slug>&layer=<slug>`), or routes.
- **GitHub Feature Requests & Bug Reports Integration (`FS-009`):** Structured `.github/ISSUE_TEMPLATE/` forms (Bug Report, Feature Request, Layer/Catalog Addition) paired with an in-app feedback action that pre-populates the GitHub New Issue URL with current route/view/entity context.
- **System Settings Drawer:** Rendering performance, audio/SFX, measurement units (AU, parsecs, light-years) and theme switching (Light/Dark).
- **Comprehensive Interaction & Performance Analytics:** Granular analytics capturing user journey events (POI selections, search behaviour, viewport transitions, tool interactions) and client-side runtime performance (frame rates, render passes, asset streaming latency, WebGL context events). Formal event taxonomy with strongly typed payloads decoupled from UI presentation logic.
