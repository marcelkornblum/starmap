# User Archetypes & Cross-Scale User Journeys

This document is the authoritative specification for Starmap's user archetypes, jobs to be done, mental models, and end-to-end user journeys across galactic, stellar system, planetary, and reference scales.

---

## 1. User Archetypes & Mental Models

### Archetype 1: The Sci-Fi Reader / Space Enthusiast
- **Profile:** Curious, non-expert space and science fiction enthusiast seeking to understand the real-world astrophysical settings of novels, films, and historical missions.
- **Mental Model:** Focus-centric (the active system is their local centre of the universe). Thinks primarily in travel times and relatable physical scales rather than raw celestial coordinates.
- **Key Jobs to be Done (JTBD):**
  1. *Interstellar Logistics:* Locate stars in 3D relative to each other and calculate transit times under various propulsion models.
  2. *Sense of Scale:* Directly compare astronomical sizes, masses, and orbital distances against familiar reference anchors (Earth, Sol, Jupiter, Moon).
  3. *Environmental Hazard:* Understand what makes an environment hazardous (stellar flares, radiation belts, extreme temperatures, tidal forces).
  4. *Habitability & Exoplanets:* Evaluate whether an extrasolar world resides within the circumstellar habitable zone and could support life or human settlement.
  5. *Planetary Composition:* Understand planetary formation, density, gravity, and atmospheric characteristics.
  6. *Resource Viability:* Evaluate minor celestial bodies (asteroids, moons) for resource potential and mining plausibility.
  7. *Intra-System Dynamics:* Compare transit times (ballistic Hohmann vs constant acceleration) across changing orbital alignments (opposition vs conjunction).
- **Core Deal-Breakers:** Spatial disorientation, unconstrained tumbling, visual clutter, spreadsheet syndrome (raw tables without visual context), and navigation confusion.
- **Design Implication:** **Self-decoding UI**. Technical metrics must be paired with intuitive visual representations (e.g. drawn ovals illustrating eccentricity, relative size comparisons) and plain-language descriptions.

### Archetype 2: The Sci-Fi Author / Worldbuilder
- **Profile:** Analytical planner constructing a consistent fictional universe, tabletop campaign, or hard science fiction narrative.
- **Mental Model:** Topological network planner. Conceptualises space as a network graph of nodes, trade lanes, political spheres of influence, and light-speed communication lag.
- **Key Jobs to be Done (JTBD):**
  1. *Candidate Hunting:* Filter the starfield by specific physical criteria (e.g. single G/K stars with terrestrial planets within 20 ly).
  2. *Comms Latency & Information Flow:* Measure exact light-speed radio/laser delay to maintain realistic political timelines and communication networks.
  3. *Strategic Cluster Mapping:* Identify natural spatial clusters, voids, and travel chokepoints.
  4. *System Resource & Hazard Inventory:* Detail local asteroid belts, Lagrange points, and gas giant moons for realistic colonial economies.
  5. *Speculative Propulsion Modeling:* Select hypothetical travel models (generation ships at 0.02c, 1g torchships with relativistic time dilation, or custom warp/jump multipliers) to compute reachability bubbles.
- **Core Deal-Breakers:** Ephemeral state loss (losing configured filters or camera positions upon navigation), inflexible search (only accepting catalog IDs), and scientifically inaccurate distances.
- **Design Implication:** Deep-linking state preservation, multi-point network plotting, and high-level intent filters.

### Archetype 3: The Casual Explorer / "Cosmic Tourist"
- **Profile:** Browsing-driven enthusiast with no predefined destination or technical query.
- **Mental Model:** Serendipity, awe, and curiosity. Seeks the superlative, bizarre, and extreme ("hottest known world", "fastest orbital period", "nearest black hole").
- **Key UI Needs:** Curated entry points and on-ramps ("Surprise Me", "Extreme Worlds", "Newly Discovered Exoplanet") and punchy, glanceable narrative summary cards rather than immediate deep data sheets.

---

## 2. Primary User Journeys Across Scales

### Journey 1: Target Acquisition & Travel Planning (The Reader Flow)
*Goal: Locate a star mentioned in a book, calculate transit times, and inspect its planets.*
1. **Entry & Search (Galaxy Scale):** User opens Command Palette (`/` or `Ctrl+K`) and enters "Tau Ceti". The autocomplete system matches proper name, Bayer designation (`tau Cet`), and catalog ID. The 3D viewport live-frames the candidate star.
2. **Spatial Framing (Galaxy Scale):** The camera smoothly glides to center Tau Ceti in the focal aperture. Range rings dynamically rescale. The telemetry container displays an intrinsic summary (G8V yellow dwarf, 4 confirmed planets, 0 hazards), purposefully omitting a default Sol distance until an anchor is set.
3. **Route Mode & Travel Benchmarks:** User activates "Plot Route / Measure" and selects Sol as the secondary spatial anchor. The 3D camera auto-frames both systems and renders the 3D measurement chord. The route panel displays:
   - Light-speed communication delay: 11.9 years one-way / 23.8 years round-trip.
   - 0.05c fusion drive: 238 years.
   - 1g relativistic burn: 4.5 years ship-time / 12.3 years coordinate-time.
4. **Transition to System Scale:** User selects "Enter System". The macro galactic grid and parsec drop stalks dissolve; the camera glides into the stellar barycentre in Astronomical Units (AU). The central star, circumstellar Habitable Zone (CHZ) band, and Keplerian orbital rings materialize.
5. **Planetary Inspection (Planet Scale):** User selects planet *e* located in the green habitable zone. The telemetry container displays mass ($3.93\text{ M}_\oplus$), estimated surface gravity ($1.4\text{ g}$), equilibrium temperature ($282\text{ K}$), and tidal-locking status. The user triggers "Inspect Planet" to transition to full micro inspection.

### Journey 2: Candidate Hunting & Territory Mapping (The Author Flow)
*Goal: Find colonisation candidates within 15 ly of an anchor system, plot a trade route network, and audit local system resources.*
1. **Set Anchor & Apply Intent Filter (Galaxy Scale):** The author targets *Epsilon Eridani* and designates it as the **Primary Spatial Anchor**. They open the filter drawer and configure:
   - Radius: $\le 15\text{ ly}$ from anchor.
   - Intent Criteria: **"Habitable Zone"** (automatically filters for stable stellar hosts with confirmed or candidate CHZ planets).
2. **Synchronised 2D List & 3D Spatial Highlighting:**
   - The 3D starfield isolates matching systems with illuminated reticles; non-matching stars dim to low-opacity background points.
   - A companion 2D panel populates a synchronised candidate list (system name, distance from anchor, planet count). Hovering any list row highlights its corresponding 3D reticle in the starfield.
3. **Multi-Point Network Plotting:** The author activates the Route Planner and selects three systems in sequence (*Epsilon Eridani* $\rightarrow$ *Tau Ceti* $\rightarrow$ *82 G. Eridani*). The 3D scene auto-frames the cluster and renders the multi-leg route chord. The route panel displays:
   - Total network distance: $24.2\text{ ly}$.
   - Comms latency matrix (e.g. 5.5 years and 11.2 years radio delay).
   - Transit times under selectable speculative technology tiers (e.g. constant 0.5g torchship: 8.2 years ship-time).
4. **Deep System Resource Audit (System Scale):** The author selects *82 G. Eridani* from the candidate list and selects "Enter System". They inspect planet *d* in the habitable zone and audit the circumstellar debris disk for asteroid mining and resource viability.
5. **Bookmark & Export State:** The author labels the cluster *"Outer Colony Reach"* and generates a persistent deep-link URL encoding the anchor, filters, route network, and camera angle.

### Journey 3: Serendipitous Discovery (The Casual Explorer Flow)
*Goal: Browse without a specific destination, discover unusual celestial phenomena, and explore at a glance.*
1. **Curated On-Ramp ("Newly Discovered Exoplanet"):** User lands on the Galaxy Atlas and clicks a featured prompt in the dock: *"Newly Discovered Exoplanet"* (or *"Extreme Worlds"* / *"Surprise Me"*).
2. **Guided Camera Glide & Glanceable Narrative Card:** The camera glides to the featured system (e.g. *LHS 1140 b*). A compact narrative card presents a 2-sentence hook explaining its scientific importance (e.g. temperate super-Earth with possible atmosphere), accompanied by metadata tags: `Habitable Zone`, `Super-Earth`, `Recent JWST Target`.
3. **Step-Through Waypoints:** The card provides simple navigation controls: `◀ Previous Highlight` | `Next Highlight ▶`.
4. **Fluid Inspection:** The user clicks "Enter System" to view the orbital plane in motion, or expands the card into full telemetry.

### Journey 4: Classification Deep-Dive via Encyclopedia
*Goal: Understand an unfamiliar classification (e.g. Red Supergiant), view its scale comparison against familiar anchors, and navigate the reference hierarchy.*
1. **Trigger from Entity Card:** The user inspects an entity (e.g. *Betelgeuse*). Alongside the `Red Supergiant` classification tag, they click the **Encyclopedia Icon**.
2. **Encyclopedia Article View:** The view smoothly transitions to the **Encyclopedia Article for Red Supergiants**:
   - Plain-language summary and complete parameter boundaries (temperatures, mass ranges, stellar lifespans).
   - **Relative Parameter Comparator:** Generalized comparative visualizer benchmarking physical parameters (radius/size, mass, luminosity, surface gravity, temperature) against familiar anchors (e.g. Betelgeuse's radius engulfing Jupiter's orbit; its luminosity exceeding Sol by 100,000×).
   - **3D Exemplar Render:** An isolated, interactive 3D render of an archetype red supergiant with atmospheric convective cells embedded in the article layout.
   - External deep-link: `↗ Wikipedia article on Red Supergiants`.
3. **Ascending the Breadcrumb Hierarchy:**
   - Breadcrumb displays: `Encyclopedia` $\rightarrow$ `Star Types` $\rightarrow$ `Red Supergiant`.
   - The user clicks `Star Types` in the breadcrumb trail.
4. **Category List View:**
   - The view transitions to the **Star Categories Index**.
   - Displays a grid of summary cards for every stellar classification (Main Sequence, Red Giant, Supergiant, White Dwarf, Neutron Star).
   - Each card features key classification metrics alongside an embedded miniature 3D model of that class's exemplar.
5. **Return to Origin:** The user clicks `Encyclopedia` to return to the top-level index (Planetary, Stellar, Deep Sky), or uses the back-navigation trail to return directly to *Betelgeuse* on the map.

### Journey 5: Intra-System Logistics & Orbital Timing (The Transit Planner Flow)
*Goal: Model transfer windows, travel durations (Hohmann ballistic vs constant thrust), and communications latency between worlds in a stellar system across changing orbital alignments.*
1. **Anchor Selection in System View:** The user enters a system (e.g. *Tau Ceti* or *Sol*). They select the primary departure body (e.g. Earth / Tau Ceti e) and activate route mode to select a target arrival destination (e.g. Mars / Tau Ceti f).
2. **Orbital Geometry & Vector Display:** The system view highlights both orbital ellipses. A dynamic 3D vector chord connects both bodies, displaying instantaneous geometric separation in AU and light-minutes.
3. **Temporal Scrubbing (Orbital Clock):** The user scrubs the timeline slider forward and backward. Planetary bodies advance along their Keplerian paths. The separation indicator dynamically scales between minimum separation (conjunction) and maximum distance across the star (opposition).
4. **Transfer Route Analysis:** The route planning panel displays comparative transit profiles:
   - *Hohmann Transfer:* Identifies the next optimum ballistic launch window, delta-v expenditure, and transit duration (months).
   - *Continuous-Thrust Torchship (Brachistochrone):* Calculates turnover transit times at selectable accelerations (e.g. 0.1g, 0.5g, 1g continuous thrust), displaying transit durations in days/weeks.
5. **Comms Geometry & Conjunction Blackout:** The system indicates line-of-sight signal delay. If the line of sight passes through the central star's coronal exclusion zone, the interface flags a solar conjunction blackout warning.
