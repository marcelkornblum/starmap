# Features Scratchpad (`journey-ui-scaffolding`)

This scratchpad records rationalised feature specifications, deferred journey capabilities, and cross-track technical requirements surfaced during the `journey-ui-scaffolding` initiative. All active items are mirrored in the `## Backlog` section of [`conductor/tracks.md`](../../tracks.md).

---

## Active Consolidated Features (Mirrored in `conductor/tracks.md` Backlog)

### FS-002 / FS-015: User-Authored Layers, Saved Workspaces, Route Bookmarks & Filter Presets
- **Concept:** Unified user persistence and custom layer authoring built on the `DatasetLayerManifest` (`kind: 'custom-user'`) architecture.
- **Behaviour:**
  - Create, name (e.g. *"Outer Colony Reach"*), save, and import/export custom user layers, personal lore annotations, and tagged star clusters across systems.
  - Persist and bookmark multi-leg route trajectories (`?route=`) and reusable search/intent filter presets.

### FS-004: Local Night-Sky View to 3D Third-Person Projection
- **Concept:** Bridge Earth-bound stargazing (2D sky dome) with true 3D galactic depth.
- **Behaviour:**
  - User enters their Earth location (lat/long or place) and optional time (defaults to "now") to view their local night sky rotated to their viewing orientation.
  - User can highlight/select visible stars in that sky view and pull the camera out to a third-person 3D galactic projection to inspect the true 3D spatial distribution and depth of those highlighted night-sky stars.

### FS-006: Adaptive Multi-Tier Search Strategy Across Core & Full Datasets
- **Concept:** Deliberate client-side loading and fallback strategy for searching across the compact Core search index (`core.json`) versus the complete Full search index (`full.json` / category shards).
- **Candidate Approaches:**
  1. **Zero-Result Escalation:** Search `core.json` first; if a query returns zero matches, automatically fetch and search `full.json`.
  2. **Progressive Background Upgrade:** Load and search `core.json` immediately for instant responsiveness, then pre-warm `full.json` in the background.
  3. **Device / Network Performance Tiering:** Adaptively choose between eager background loading versus zero-result escalation based on client device/network capabilities (`navigator.deviceMemory`, `hardwareConcurrency`, `effectiveType`, `saveData`).

### FS-007 / FS-008: SEO, Structured Metadata & Curated Shortlink Landing URLs (`/go/<slug>`)
- **Concept:** Ensure Starmap's systems, planets, and curated layers are discoverable via search engines/social previews and accessible via memorable shortlinks.
- **Behaviour:**
  - Dynamic per-route `<title>`, `<meta name="description">`, canonical URLs, Open Graph / Twitter Card metadata, `sitemap.xml`, and Schema.org / JSON-LD structured data.
  - Friendly entry-point URLs (`/go/hail-mary`, `/go/dune`, `/go/trappist`, `/go/voyager`) resolving to pre-configured camera framing, active layers (`?select=layer:<slug>&layer=<slug>`), or routes.

### FS-009: GitHub Feature Requests & Bug Reports Integration
- **Concept:** Frictionless path for users to submit feature requests, missing star/layer suggestions, and bug reports on GitHub.
- **Behaviour:**
  - Structured `.github/ISSUE_TEMPLATE/` forms (Bug Report, Feature Request, Layer/Catalog Addition) paired with an in-app feedback action that pre-populates the GitHub New Issue URL with current route/view/entity context.

### FS-011: 3D Guide Interior Cross-Section Cutaways & Comparative 3D Meshes (Stage 3 R3F Integration)
- **Concept:** Upgrade the 3D preview mount slots (`data-testid="guide-3d-preview"` and `data-testid="metric-comparative-3d"`) across `/guide/*` views with live WebGL/R3F shaders and meshes.
- **Behaviour:**
  - **Oversized Edge-Truncated 3D Spheres with Internal Cross-Section Cutaways:** Render star and planet 3D spheres offset against the preview frame boundary to expose a 3D interior cutaway (Stellar Core → Radiative Zone → Convective Envelope → Photosphere; Planetary Core → Mantle → Ice/Gas Envelope → Crust/Cloud Tops).
  - **Live 3-Slice Yerkes Combinator & Comparative Metric Meshes:** Drive the 3D star sphere's scale, blackbody shader, and cutaway layers from `StarTypeDetailView`'s 3-slice combinator (`O`–`D`, `0`–`9`, `I`–`VII`), and render 3D comparative reference spheres (Earth/Sol vs `?focus=<entityId>`) on `MetricDetailView`.

### FS-012 (Absorbing FS-003 & FS-013): Choreographed 3D Camera Transitions, Search Framing & Independent Center/Focus State
- **Cross-Track Coupling:** Shared across **[Track: Interaction Controls](../../tracks/interaction-controls_20261010/spec.md)** and **[Track: Minimap & Scene Transitions](../../tracks/minimap-scene-transitions_20261010/spec.md)**.
- **Behaviour:**
  1. **Animated 3D Fly / Zoom Camera Choreography (`FS-012`):**
     - **Intra-View Config Changes:** Smoothly glide the 3D camera (origin, azimuth/elevation, dolly distance) when changing `focused`, `center`, or `select` within `GalaxyView`, `SystemView`, or `PlanetView`.
     - **Cross-Scale View Transitions (`Galaxy` $\leftrightarrow$ `System` $\leftrightarrow$ `Planet`):** Continuous optical zoom/fly-in across scale boundaries (including `<LayerCard />` waypoint stepping), dissolving parsec drop stalks and galactic grids as AU orbital rings and the circumstellar Habitable Zone materialise.
     - **HUD Panel Retraction & Snap-Back:** Smoothly retract/hide HUD panels during active camera flight and snap them back hydrated with destination state once the camera settles (respecting `prefers-reduced-motion`).
  2. **Search Results Scale & Multi-Result Framing (`FS-003`):**
     - Multiple results (`count > 1`) stay at or transition to the galactic scale and auto-frame all matching systems; single results (`count === 1`) only auto-enter system scale for Solar System (*Sol*) bodies.
  3. **Camera `center` vs. Entity `focused` Independence & Conditional `Centre` CTA (`FS-013`):**
     - Cold-loading a focused view initially centres the camera on that target; subsequent camera panning mutates `center` independently of `focused`, applying `?focus=` does not force-re-centre the camera, and the `Centre` CTA (`data-testid="details-button-center"`) in `<DetailsPanel />` is only visible when the live 3D camera centre differs from the focused entity.

### FS-014 / FS-017: Multi-Leg Route Networks, Epoch Orbital Timing & Solar Conjunction Blackouts
- **Concept:** Advanced interstellar and intra-system route planning deferred from Journey 2 Step 3 (`FS-014`) and Journey 5 Steps 3 & 5 (`FS-017`).
- **Behaviour:**
  - **Arbitrary-Origin Multi-Stop Route Networks (`FS-014`):** Unlock arbitrary system/body origins (`stops[0]` not restricted to `sol`/`earth`), interactive multi-leg waypoint building/reordering (`?route=epsilon-eridani,tau-ceti,82-g-eridani`), pairwise/cumulative Comms Latency Matrix, and speculative propulsion tiers (`0.02c` generation ship, `0.5g` torchship, custom warp/jump multipliers).
  - **Epoch-Driven Instantaneous Orbital Separation (`FS-017`):** Wire the `<ControlBar />` Time Controller (`epochTime`, `timeMultiplier`, `isPlaying`) into `journeyService.ts` and Keplerian mean anomaly propagation so intra-system `AU` separation, light-minute comms latency, and brachistochrone transit times dynamically update between conjunction and opposition.
  - **Solar Conjunction Comms Blackout Warning (`FS-017`):** Evaluate geometric ray–sphere intersection between the departure–arrival line-of-sight chord and the central star's coronal exclusion zone, flagging solar conjunction blackout warnings in `<DirectionsPanel />` and on the 3D `<JourneyChord />`.

### FS-016: Volumetric Interstellar Clouds & Galactic Structures on the Galaxy Map
- **Concept:** Render and intersect volumetric 3D interstellar media (ISM) and galactic structures on `GalaxyView` (`GalaxyScene`) and in `<BodiesPanel scope="galaxy" />`.
- **Behaviour:**
  - **Volumetric 3D Sphere–Sphere Instrument Intersection:** Evaluate $\text{distance}(\text{instrumentCentre}, \text{cloudCentre}) \le R_{\text{aperture}} + R_{\text{cloud}}$ so volumetric structures with physical radius `radiusPc` become `'active'` whenever they overlap the Cartographic Instrument sphere.
  - **3D Cartographic Rendering (`GalaxyScene`):** Render CLIC clouds (*LIC*, *G-Cloud*, *Blue Cloud*, *Aquilae*, *Mic*, *Leo*, *Dor*, *Eri*, *Vela*), the *Local Bubble*, nearby molecular/dark cloud complexes (*Rho Ophiuchi*, *Taurus*, *Coalsack*, *Lupus*, *Chamaeleon*, *Pipe*), and open clusters via micro-dot point-density stippling and planar survey cross-hatching on datum planes.
  - **`<BodiesPanel scope="galaxy" />` Integration:** Surface non-passive interstellar clouds and galactic structures alongside star systems.

---

## Completed & Retired Scratchpad Items
- ~~**`FS-001`: Fictional Universe Canon Layers / Tags**~~ — Completed in Tracks 01–03 (`DEC-017`, `DEC-036`–`DEC-039`).
- ~~**`FS-005`: Category-Filtered Search**~~ — Completed in Tracks 01 & 03 (`DEC-003`, `DEC-036`).
- ~~**`FS-010`: Dedicated `<CanonLayersPanel />` (Journey 3)**~~ — Completed in Track 03 via `<LayerCard />` and `Explore` (`DEC-036`–`DEC-039`).
