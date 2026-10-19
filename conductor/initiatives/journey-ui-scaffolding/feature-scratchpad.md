# Features Scratchpad (`journey-ui-scaffolding`)

This temporary scratchpad captures feature ideas, edge cases, dataset enhancements, and future capabilities surfaced while working through the user journeys in the `journey-ui-scaffolding` initiative.

Items logged here are held for later consideration and graduation into formal tracks, view requirements, or backlog items when ready.

---

## Logged Ideas

### FS-001: Fictional Universe Canon Layers / Tags
- **Concept:** A tag-driven "fictional universe" overlay system (e.g., *Star Trek*, *Dune*, *Project Hail Mary*, *Bobiverse*, *Revelation Space*) that highlights all real star systems and celestial bodies referenced in a given canon.
- **Behaviour:**
  - Related lore snippets and text annotations on each system/body are tagged by fictional canon.
  - Users can view an entire fictional canon as a single unified layer across systems, or toggle individual canons on and off while browsing.

### FS-002: Custom User Universe / Personal Notes Layer
- **Concept:** Allow the user to create their own custom "fictional universe" tag/layer using the same mechanism as built-in canons.
- **Behaviour:**
  - Users can tag systems and attach their own custom notes or lore snippets across multiple star systems, viewing and toggling their personal layer just like a curated fictional canon.

### FS-003: Search Results Scale, Multi-Result Highlighting & Solar System Exception
- **Concept:** Deterministic camera scale and selection framing driven by the search result set.
- **Behaviour:**
  - **Multiple results (`count > 1`):** Always stay at (or transition to) the **galactic scale**, automatically framing/zooming the camera so every matching result fits on screen simultaneously, with all matching results highlighted/selected.
  - **Single result (`count === 1`):** Only transition into the **system scale** directly from search results if there is a single match and it is known with certainty to be a body within our own Solar System (*Sol*). Otherwise remain at the galactic scale framing the matched system.

### FS-004: Local Night-Sky View to 3D Third-Person Projection
- **Concept:** Bridge Earth-bound stargazing (2D sky dome) with true 3D galactic depth.
- **Behaviour:**
  - User enters their Earth location (lat/long or place) and optional time (defaults to "now") to see what is in their local sky, with rotation to match their viewing orientation.
  - User can highlight/select some or all of the visible stars in that sky view.
  - User can then pull the camera out to a standard third-person 3D galactic angle to inspect the true 3D spatial distribution and depth of those highlighted night-sky stars.

### FS-005: Category-Filtered Search (Stars, Planets, Structures, Minor Bodies, Fiction)
- **Concept:** Allow users to scope or filter search queries by entity category, backed by the category-sharded search indices (`public/data/search/*.json`).
- **Behaviour:**
  - Users can filter or scope search to specific categories: **Star Systems / Stars** (`stars.json`), **Planets & Moons** (`planets.json`), **Galactic Structures & Deep Sky** (`structures.json`), **Minor Bodies** (`minor-bodies.json`), or **Works of Fiction / Canons** (`fiction.json`).

### FS-006: Adaptive Multi-Tier Search Strategy Across Core & Full Datasets
- **Concept:** Define a deliberate client-side loading and fallback strategy for searching across the compact Core search index (`core.json`) versus the complete Full search index (`full.json` / category shards).
- **Candidate Approaches to Evaluate:**
  1. **Zero-Result Escalation:** Search the lightweight Core index first; if a query returns zero matches, automatically fetch and search the Full dataset (`full.json`).
  2. **Progressive Background Upgrade:** Load and search the Core index immediately for instant responsiveness, then automatically pre-warm/stream the Full index in the background once the Core index is ready so subsequent or deeper queries always search the complete dataset.
  3. **Device / Network Performance Tiering:** Adaptively choose between eager background loading of the Full index versus on-demand/zero-result escalation based on client device capabilities (`navigator.deviceMemory`, `hardwareConcurrency`, and Network Information `effectiveType` / `saveData`).

### FS-007: SEO, Structured Metadata & Search Engine Discoverability
- **Concept:** Ensure Starmap's celestial systems, planets, fictional universe canons, and deep-sky objects are richly indexed and discoverable via search engines and social/link previews.
- **Considerations to Evaluate:**
  - Dynamic per-route `<title>`, `<meta name="description">`, canonical URLs, and Open Graph / Twitter Card metadata for system, body, search, and canon layer URLs.
  - Crawlability & indexing strategy for an SPA/3D web app (e.g., static pre-rendering / SSG for high-value landmark systems and fictional canons, `sitemap.xml` generation from the Core/Canon indices, and Schema.org / JSON-LD structured data).

### FS-008: Custom Shortlink & Curated Landing URLs (`/go/<slug>`)
- **Concept:** Support friendly, memorable entry-point URLs (e.g., `/go/xxx` such as `/go/hail-mary`, `/go/dune`, `/go/voyager`, `/go/trappist`) to make shared links and curated landing experiences cleaner and more inviting.
- **Behaviour:**
  - Resolves a short slug into a customised application setup and entry point (e.g., activating a specific fictional canon layer, pre-selecting a target system or multi-leg route, framing the camera at an ideal vantage point, or opening a tailored welcome/onboarding briefing).

### FS-009: GitHub Feature Requests & Bug Reports Integration
- **Concept:** Give users a simple, frictionless path to submit feature requests, missing star/canon suggestions, and bug reports on GitHub.
- **Behaviour:**
  - Structured `.github/ISSUE_TEMPLATE/` forms (Bug Report, Feature Request, Canon/Data Addition) paired with an in-app feedback link/action that pre-populates the GitHub New Issue URL with relevant context (e.g., current route URL, active view, or selected celestial entity).

### FS-010: Dedicated `<CanonLayersPanel />` (Journey 3: Serendipitous & Canon Discovery)
- **Concept:** Since `Canon Layers` are narrative/universe metadata rather than physical orbital data, they were removed from `<BodiesPanel />` (`DEC-018`) while remaining on `<DetailsPanel />`.
- **Behaviour:**
  - Introduce a dedicated `<CanonLayersPanel />` in Journey 3 (`conductor/tracks/journey-ui-scaffolding_03_...`) for browsing, toggling, and stepping through fictional universe canons and narrative annotations across `GalaxyView`, `SystemView`, and `PlanetView`.

### FS-011: 3D Guide Renderings, Edge-Truncated Cross-Section Cutaways, 3-Slice Yerkes Combinator & Comparative Metric Visualiser (Stage 3 R3F Integration)
- **Concept:** Every Guide list item and detail view (`/guide/star-types`, `/guide/star-types/$starType`, `/guide/planet-types`, `/guide/planet-types/$planetType`, `/guide/metrics`, `/guide/metrics/$metricId`) exposes a 3D rendering viewport slot (`data-testid="guide-3d-preview"`).
- **Behaviour:**
  - **Oversized Edge-Truncated 3D Spheres with Internal Cross-Section Cutaways (`data-testid="guide-3d-cross-section"`):**
    - Star and planet 3D spheres are rendered at a larger comparative scale and offset above/against the edge of their preview container so the sphere is truncated by the frame boundary and exposes a 3D cutaway cross-section of the interior structure (e.g., Stellar Core → Radiative Zone → Convective Envelope → Photosphere; Planetary Iron-Nickel Core → Silicate/Metallic-Hydrogen Mantle → Ice/Gas Envelope → Crust/Cloud Tops).
  - **3-Slice Yerkes Spectral Combinator (`data-testid="star-type-combinator"` on `/guide/star-types/$starType`):**
    - Interactive 3-slice selector ("flip-book" in 3 slices: **Slice 1: Spectral Class `O`–`D`**, **Slice 2: Temperature Subdivision `0`–`9`**, **Slice 3: Luminosity Class `I`–`VII`**) that dynamically updates the 3D star sphere's scale, blackbody colour, cutaway layers, and computed telemetry ($T_{\text{eff}}$, $R_\odot$, $L_\odot$, Habitable Zone $\text{AU}$).
  - **3D Comparative Metric Visualiser (`data-testid="metric-comparative-3d"`), Familiar Units (`light-years`, `light-minutes`, `°C`, `Earth years`), & Focused-Entity Context (`?focus=<entityId>`):**
    - Metric list and detail pages convert technical astronomical units into familiar units (`pc` → `light-years (ly)` & `trillion km`, `AU` → `light-minutes` & `million km`, `d` → `Earth years`, `K` → `°C / °F`) and render a 3D comparative visualisation (`data-testid="metric-comparative-3d"`) comparing **Earth / Sol** against whichever entity was focused when navigating to the metric page (`?focus=<entityId>`).

### FS-012: Choreographed View & Intra-View State Transitions (3D Camera Fly/Zoom & Interface Panel Hide/Snap-Back)
- **Concept:** Smooth, choreographed transitions both **between distinct views** (e.g., `/galaxy/$systemId` $\leftrightarrow$ `/system/$systemId` $\leftrightarrow$ `/planet/$planetId`, or 3D Map $\leftrightarrow$ Guide) and **between configurations of the same view** (e.g., changing `focused` entity `/galaxy/sol` $\rightarrow$ `/galaxy/tau-ceti`, changing `?center=`, or updating `?select=` collections).
- **Behaviour:**
  1. **Animated 3D Fly / Zoom Camera Choreography:**
     - **Intra-View Config Changes:** When switching focus, centering (`?center=`), or framing a new `?select=` candidate set within the same view (`GalaxyView`, `SystemView`, `PlanetView`), the 3D camera glides smoothly along an eased trajectory (interpolating target origin, azimuth/elevation, and dolly distance) while range rings and reticles dynamically rescale.
     - **Cross-Scale View Transitions (`Galaxy` $\leftrightarrow$ `System` $\leftrightarrow$ `Planet`):** Entering a system (`/galaxy/tau-ceti` $\rightarrow$ `/system/tau-ceti`) or inspecting a planet (`/system/tau-ceti?focus=tau-ceti-e` $\rightarrow$ `/planet/tau-ceti-e`) performs a continuous zoom/fly-in into the target coordinate frame (dissolving parsec drop stalks and galactic grids as AU orbital rings and the circumstellar Habitable Zone materialise, and vice versa when ascending).
  2. **Interface Panels Hiding & Snapping Back:**
     - During active 3D camera flight/zoom or view/configuration transitions, HUD interface panels (`<DetailsPanel />`, `<PreviewPanel />`, `<Search.Panel />`, `<Minimap />`) smoothly retract/hide (or collapse to non-obstructing states) so the 3D spatial transition is unobstructed, then snap/slide back into place hydrated with the destination state once the camera settles.
     - Respects `prefers-reduced-motion` by falling back to instant or cross-faded state transitions when reduced motion is requested.

### FS-013: Camera `center` vs. Entity `focused` Independence & Conditional `Centre` CTA Visibility (Stage 3 R3F Integration)
- **Concept:** Camera `center` (the 3D focal origin of the viewport) and `focused` (the active inspection target in `<DetailsPanel />` / `<PreviewPanel />`) are independent states:
  1. **Initial Load:** Cold-loading a focused view (e.g. `/galaxy/tau-ceti`, `/system/tau-ceti`, `/planet/tau-ceti-e` with no explicit `?center=` or `?x=&y=&z=` override) initially centres the 3D camera on that view's primary target.
  2. **Independent Movement & Focus Changes:** Panning the 3D camera moves the center point independently of `focused`, and applying focus (`?focus=<id>`) to inspect an item does not automatically re-centre the camera onto that item.
  3. **Conditional `Centre` CTA Visibility:** Once the live 3D R3F canvas reports its active camera target/center point, the `Centre` CTA button (`data-testid="details-button-center"`) in `<DetailsPanel />` should **only** be rendered/visible when the 3D canvas's current center point does not match the currently focused entity.
