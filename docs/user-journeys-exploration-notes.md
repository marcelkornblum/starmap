# User Journeys & Archetypes (Exploration Scratchpad)

> [!NOTE]
> **Exploration Scratchpad:** This document captures live archetypes and user journey flows explored during Phase 4. Feature backlog notes are recorded in [`docs/feature-backlog-notes.md`](./feature-backlog-notes.md).

---

## 1. User Archetypes

### Archetype 1: The Sci-Fi Reader / Space Enthusiast
- **Profile:** Curious, non-expert space and science fiction lover wanting to understand the real-world settings of novels and films.
- **Mental Model:** Focus-centric (the active system is their local centre of the universe). Thinks in travel time and relatability rather than raw astronomical coordinates.
- **Key Jobs to be Done (JTBD):**
  1. *Interstellar Logistics:* Locate stars in 3D relative to each other and calculate transit times.
  2. *Sense of Scale:* Directly compare sizes, masses, and distances against familiar reference anchors.
  3. *Environmental Hazard:* Understand what makes an environment dangerous (flares, radiation, tidal forces).
  4. *Habitability & Exoplanets:* Evaluate whether a world could support life or human settlement.
  5. *Planetary Composition:* Understand planetary formation and atmospheric characteristics.
  6. *Resource Viability:* Evaluate minor bodies (asteroids, moons) for resource potential and mining plausibility.
  7. *Intra-System Dynamics:* Compare transit times (Hohmann vs constant acceleration) across changing orbital alignments (opposition vs conjunction).
- **Core Deal-Breakers:** Spatial disorientation, unconstrained tumbling, visual clutter, spreadsheet syndrome, and navigation confusion.
- **Design Implication:** **Self-decoding UI**. Technical metrics must be paired with intuitive visual representations (e.g. drawn ovals for eccentricity) and plain-English descriptions.

### Archetype 2: The Sci-Fi Author / Worldbuilder
- **Profile:** Analytical planner constructing a consistent fictional universe, tabletop setting, or hard sci-fi plot.
- **Mental Model:** Topological network planner. Views space as a graph of nodes, trade lanes, political spheres, and light-speed communication lag.
- **Key Jobs to be Done (JTBD):**
  1. *Candidate Hunting:* Filter the starfield by specific physical criteria (e.g. single G/K stars with terrestrial planets within 20 ly).
  2. *Comms Latency & Information Flow:* Measure exact light-speed radio/laser delay to maintain realistic political timelines.
  3. *Strategic Cluster Mapping:* Identify natural spatial clusters and travel chokepoints.
  4. *System Resource & Hazard Inventory:* Detail local asteroid belts and gas giant moons for realistic colonial economies.
  5. *Speculative Propulsion Modeling:* Select hypothetical travel models (generation ships at 0.02c, 1g torchships with time dilation, or custom warp/jump multipliers) to compute reachability bubbles.
- **Core Deal-Breakers:** Ephemeral state loss, inflexible search (only accepting catalog IDs), and scientifically inaccurate distances.

### Archetype 3: The Casual Explorer / "Cosmic Tourist"
- **Profile:** Browsing-driven, no specific destination in mind.
- **Mental Model:** Serendipity and awe. Wants the superlative and bizarre ("hottest known world", "fastest orbiter").
- **Key UI Needs:** Curated on-ramps ("Surprise Me", "Extreme Worlds") and punchy glanceable narrative summary cards rather than immediate deep data sheets.

---

## 2. User Journeys Across Scales

### Journey 1: Target Acquisition & Travel Planning (The Reader Flow)
*Goal: Locate a star mentioned in a book, calculate journey time, and inspect its planets.*
1. **Entry & Search (Galaxy Scale):** User opens Command Palette (`/` or `Ctrl+K`), types "Tau Ceti". Autocomplete matches name, Bayer tag (`tau Cet`), and catalog ID. 3D view live-frames the candidate.
2. **Spatial Framing (Galaxy Scale):** Camera glides to focal center. Range rings adapt. Telemetry container displays intrinsic summary (G8V yellow dwarf, 4 confirmed planets, 0 hazards). No default Sol distance.
3. **Route Mode & Travel Benchmarks:** User selects "Plot Route / Measure" and picks Sol as secondary anchor. 3D camera auto-frames both systems and draws the 3D vector chord. Panel displays:
   - Light-speed comms delay: 11.9 yrs one-way / 23.8 yrs round-trip.
   - 0.05c fusion: 238 yrs.
   - 1g relativistic burn: 4.5 yrs ship-time / 12.3 yrs coordinate-time.
4. **Transition to System Scale:** User clicks "Enter System". Macro grid dissolves; camera focuses on barycentre in AU units. Central star, circumstellar Habitable Zone band, and Keplerian orbital rings appear.
5. **Planetary Inspection (Planet Scale):** User clicks planet *e* in the green habitable zone. Telemetry container displays mass ($3.93\text{ M}_\oplus$), estimated gravity ($1.4\text{ g}$), temperature, and tidal-lock status. Option to trigger "Inspect Planet" for micro analysis.

### Journey 2: Candidate Hunting & Territory Mapping (The Author Flow)
*Goal: Find colonisation candidates within 15 ly of an anchor system, plot a trade route, and audit local resources.*
1. **Set Anchor & Apply Intent Filter (Galaxy Scale):** Author targets *Epsilon Eridani* and sets it as the **Primary Spatial Anchor**. Opens the filter drawer and toggles:
   - Radius: $\le 15\text{ ly}$ from anchor.
   - Criteria: **"Habitable Zone"** (auto-filters for stable stars with CHZ planets).
2. **Synchronised 2D List & 3D Spatial Highlighting:** 
   - 3D starfield isolates matching systems with illuminated reticles; non-matches dim to faint background dots.
   - Companion 2D panel populates a synchronised candidate list (name, distance from anchor, planet count). Hovering any list row highlights its 3D reticle in the starfield.
3. **Multi-Point Network Plotting:** Author activates the Route Planner and clicks 3 systems in sequence (*Epsilon Eridani* $\rightarrow$ *Tau Ceti* $\rightarrow$ *82 G. Eridani*). 3D scene auto-frames the cluster and renders the multi-leg route chord. Panel displays:
   - Total network distance: $24.2\text{ ly}$.
   - Comms latency matrix (e.g. 5.5 yrs and 11.2 yrs radio delay).
   - Travel times under selected speculative tech tiers (e.g. constant 0.5g torchship: 8.2 years ship-time).
4. **Deep System Resource Audit (System Scale):** Author selects *82 G. Eridani* from the list and clicks "Enter System". Confirms planet *d* in the habitable zone, and audits the circumstellar debris disk for asteroid mining resources.
5. **Bookmark & Export State:** Author labels the cluster *"Outer Colony Reach"*. Generates a persistent deep-link URL encoding the anchor, filters, route network, and camera angle.

### Journey 3: Serendipitous Discovery (The Casual Explorer Flow)
*Goal: Browse without a specific destination, discover unusual worlds, and explore at a glance.*
1. **Curated On-Ramp — "Newly Discovered Exoplanet":** User arrives on the map and clicks a featured prompt in the dock: *"Newly Discovered Exoplanet"* (or *"Extreme Worlds"* / *"Surprise Me"*).
2. **Guided Camera Glide & Glanceable Narrative Card:** Camera glides to the featured system (e.g. *LHS 1140 b*). A compact card presents a 2-sentence hook explaining why it's significant (e.g. temperate super-Earth with possible water atmosphere), paired with tags: `Habitable Zone`, `Super-Earth`, `Recent JWST Target`.
3. **Step-Through Waypoints:** Card exposes simple navigation: `◀ Previous Highlight` | `Next Highlight ▶`.
4. **Fluid Inspection:** User can click "Enter System" to view the orbital plane in motion, or expand the card into full telemetry.

### Journey 4: Classification Deep-Dive via Encyclopedia
*Goal: Understand an unfamiliar classification (e.g. Red Supergiant), view its scale comparison against familiar anchors, and navigate the reference hierarchy.*
1. **Trigger from Entity Card:** User is inspecting an entity (e.g. *Betelgeuse*). Next to the `Red Supergiant` classification tag, they click the **Encyclopedia Icon**.
2. **Encyclopedia Article View:** The view smoothly transitions to the **Encyclopedia Article for Red Supergiants**:
   - Scientific summary and full parameter boundaries (temperatures, mass ranges, lifespans).
   - **Relative Parameter Comparator:** Generalized comparative visualizer benchmarking any relevant metric (radius/size, mass, luminosity, surface gravity, temperature) against familiar anchors (e.g. Betelgeuse's radius engulfing Jupiter's orbit; its luminosity exceeding Sol by 100,000×).
   - **3D Exemplar Render:** An isolated, interactive 3D render of an archetype red supergiant with atmospheric convective cells.
   - External deep-link: `↗ Wikipedia article on Red Supergiants`.
3. **Ascending the Breadcrumb Hierarchy:**
   - Breadcrumb displays: `Encyclopedia` $\rightarrow$ `Star Types` $\rightarrow$ `Red Supergiant`.
   - User clicks `Star Types` in the breadcrumb.
4. **Category List View:**
   - The view transitions to the **Star Categories Index**.
   - Displays a grid of summary cards for every stellar class (Main Sequence, Red Giant, Supergiant, White Dwarf, Neutron Star).
   - Each card features key classification metrics alongside an embedded miniature 3D model of that type's exemplar.
5. **Return to Origin:** User can click `Encyclopedia` to view the top-level index (Planetary, Stellar, Deep Sky), or use the back-navigation trail to return to *Betelgeuse* on the map.

### Journey 5: Intra-System Logistics & Orbital Timing (The Transit Planner Flow)
*Goal: Model transfer windows, travel durations (Hohmann vs constant thrust), and communications latency between worlds in a stellar system across changing orbital alignments.*
1. **Anchor Selection in System View:** User enters a system (e.g. *Tau Ceti* or *Sol*). Selects the primary body (e.g. Earth / Tau Ceti e) and activates route mode to select a target destination (e.g. Mars / Tau Ceti f).
2. **Orbital Geometry & Vector Display:** The system view highlights both orbital rings. A dynamic vector chord connects both bodies, displaying the instantaneous geometric separation in AU and light-minutes.
3. **Temporal Scrubbing (Orbital Clock):** User drags a timeline slider forward and backward. Orbits advance along their Keplerian paths. The separation indicator dynamically scales between minimum separation (conjunction) and maximum distance across the star (opposition).
4. **Transfer Route Analysis:** The route planning panel displays comparative transit profiles:
   - *Hohmann Transfer:* Identifies the next optimum ballistic transfer window, delta-v expenditure, and transit duration (months).
   - *Continuous-Thrust Torchship (Brachistochrone):* Calculates turnover transit times at selectable accelerations (e.g. 0.1g, 0.5g, 1g), showing durations in days/weeks.
5. **Comms Geometry & Conjunction Blackout:** The system indicates line-of-sight signal delay. If the line of sight passes through the central star's coronal exclusion zone, the interface flags a solar conjunction blackout warning.

