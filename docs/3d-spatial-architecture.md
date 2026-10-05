# 3D Spatial Architecture & Coordinate System Specification

This document is the **single authoritative specification** for Starmap's 3D coordinate environment, reference planes, orientation cues, and operational modes across the unbounded galactic starfield.

> [!IMPORTANT]
> **Source of Truth Rule:** All exploratory AI-generated renders contain technical inaccuracies and hallucinations (e.g. scale compression, planar artifacts, excessive line density). They are discarded reference sketches. This document and its corresponding code tokens represent the sole authoritative specification.

---

## 1. The Tri-Axial Coordinate Architecture & Orientation

Space is structured around three orthogonal axes meeting at an active camera focal origin, prioritizing the galactic disk as the primary datum surface while maintaining unconfined, open 3D navigation.

### 1.1 The Galactic Equator (Dominant Datum Plane)
* **Authoritative Reference Surface:** The horizontal **Galactic Equator ($XY, Z=0$)** is the permanent, dominant datum plane of the coordinate system.
* **Datum Role:** All vertical heights, elevations ($\Delta z$), and drop stalks are measured and projected strictly relative to this plane.
* **Travelling Projection Circle:** The visual representation of the datum floor is a **projected circle** on the Galactic Equator dropped directly beneath the camera focal reference point, sharing the **exact same radius** as the travelling fins.
* **Zoom-Adaptive Hierarchical Range Rings:**
  * Concentric metric distance rings (e.g. 1 pc $\rightarrow$ 5 pc $\rightarrow$ 10 pc) adapt dynamically to the active zoom tier.
  * Rendered with a strict two-tier visual hierarchy: **Major rings** (prominent, heavier 1px stroke) and **Minor rings** (subtle, lighter 1px hairlines).

### 1.2 The Three Mobile Travelling Fins
Because camera navigation in 3D space is unanchored to any fixed floor, the coordinate frame features **three mobile orthogonal quarter-circle fins** centered at the camera's focal reference point. The fins themselves are symmetric orientation instruments (none is designated a "dominant segment"):
1. **Horizontal Fin ($XY$):** Parallel to the Galactic Equator ($Z$-offset relative to datum).
2. **Core Meridian Fin ($XZ$):** Vertical quarter-circle fin aligned directly with the **Galactic Core Axis ($l=0^\circ$)** and the North Galactic Pole ($b=+90^\circ$).
3. **Transverse Fin ($YZ$):** Vertical quarter-circle fin aligned with the **Galactic Orbital Vector ($l=90^\circ$)**.

* **Fin-Mounted Calibrated Ticks:** Degree markings for Galactic Longitude ($l$) and Latitude ($b$) are etched along the **curved perimeter arcs of the travelling fins**, keeping angular reference tight to the local focal frame.
* **Dynamic View-Dependent / Grazing Fading:**
  * As the camera orbits, fins viewed near edge-on (grazing angle) or positions where they occlude target space **smoothly fade to 0% opacity** (and fade back in as viewing angles open).
  * The visual assembly gracefully breathes between 1, 2, or 3 visible fins depending on perspective, preventing awkward edge-on slivers or visual clutter.
* **Unbounded Geometry:** Zero outer bounding boxes, cage walls, or room ceilings; all fins and grid lines terminate cleanly into open black space.

### 1.3 Zoom & Metric Scaling Dynamics
* **Screen-Constant Instrument Footprint:** The travelling fins and datum circle maintain an invariant visual/pixel footprint on screen (acting as a collimated reticle/gauge).
* **Metric Volume Scaling:** Zooming modulates the real-space metric volume ($V \propto R^3$) enclosed by the aperture, rather than expanding or shrinking the instrument geometry across the screen.
* **Dynamic Range Ring Expansion & Contraction:**
  * **Zooming Out (Scale Expansion):** Real-space volume grows; stellar density inside the aperture increases. Existing range rings contract smoothly inwards toward the focal centre, whilst new, higher-denomination metric rings fade in at the outer perimeter.
  * **Zooming In (Scale Contraction):** Real-space volume shrinks; stellar density disperses. Existing range rings expand outwards toward the perimeter and dissolve, whilst finer metric subdivisions emerge from the centre.
  * **Logarithmic 1-2-5 Progression:** Range rings adapt dynamically following a standard logarithmic progression (e.g. 1, 2, 5, 10, 20, 50 pc) with continuous alpha cross-fading to prevent popping or visual stutter.
* **Static Angular Perimeter Ticks ($l, b$):** Because angular degrees ($0^\circ$ to $90^\circ$) are dimensionless and scale-invariant, degree tick marks along the curved perimeter arcs of the fins remain permanently static in position. Only the metric distance readouts scale.

### 1.4 Unbounded Bearing Lines & Detachable Screen-Edge Headings
* **Off-Screen Projection:** Both the **Galactic Core Axis ($l=0^\circ, b=0^\circ$)** and the **Galactic Orbital Vector ($l=90^\circ, b=0^\circ$)** project along the axes of the travelling fins, extending past the outermost range ring and continuing indefinitely off-screen.
* **Screen-Edge Arrowheads:** Each bearing line terminates with an illuminated vector arrowhead at the viewport boundary.
* **Detachable Heading Cues:** When camera pitch, yaw, or zoom causes a bearing line to leave the visible field of view, its arrowhead **detaches from the line and remains pinned to the nearest edge of the screen**, ensuring that cardinal Galactic Core and Orbital directions remain permanently legible.

### 1.5 Attitude Minimap (HUD Gimbal)
* **Dedicated Micro-Viewport:** A screen-aligned widget in the corner of the HUD providing continuous spatial attitude awareness.
* **Fixed Mini Camera & Recognisable Symbology:** Features a fixed mini camera viewing a scaled micro-representation of the **exact same coordinate fins and bearing vectors** as the main 3D visualization.
* **Attitude Synchronisation:** Rotates in real time, precisely synchronized to the main camera's pitch, roll, and yaw relative to the Galactic Equator and Galactic Core.
* **Target Rendering:** Renders strictly **0 or 1 focused star** (displays the active target node and its relative offset if selected; otherwise renders purely the coordinate orientation frame).

---

## 2. Clustering and Occlusion

To resolve spatial density without falsifying astronomical positions or creating visual clutter, the entity interface is decomposed into three strictly decoupled architectural layers with independent collision and visibility rules.

```
[ Layer 1: Physical System Node ]  ──►  Physical barycentre; true coordinates; neither clusters nor occludes.
[ Layer 2: Geometric Reticle    ]  ──►  Tactical HUD status; true coordinates; overlays directly; priority-masked.
[ Layer 3: Typographic Label    ]  ──►  Identification; screen-space displacement; camera-proximity occlusion.
```

### 2.1 Physical System Nodes (Points)
* **The "Dot = System" Model:** At the Galaxy Map scale, each physical dot represents an entire **gravitationally bound Stellar System** located at its system barycentre, rather than an individual star.
  * Sol, Sirius (A/B), and Alpha Centauri (A/B/Proxima) each project as a single, discrete point.
  * System multiplicity is communicated via symbolic HUD tokens (e.g. `×3`) rather than multiple colliding sub-pixel dots.
* **Separation Boundary:** Binary, trinary, and multiple stellar bodies unpack into discrete celestial objects and Keplerian orbital paths only upon transitioning into **System View**.
* **Zero Clustering, Zero Occlusion:** Physical system points **never cluster** into aggregate count badges and **never occlude**. Positional truth is absolute; every system in the volume is continuously represented at its true coordinate location.
* **Invariant Screen Size (All Celestial Bodies):** Every celestial body marker — stellar systems, stars, planets, moons, remnants, and all other classifications — renders at one identical, invariant screen-space pixel diameter at all times, across all views and zoom levels (never blooming, scaling with distance, or falling below sub-pixel visibility).
* **Monochrome Baseline:** Celestial body markers are monochrome at the neutral baseline. Colour is reserved exclusively for user-selected analytical layers.
* **No Hard-Coded Data Encodings:** No data attribute (spectral type, magnitude, luminosity, mass, temperature, etc.) is ever bound to a visual channel (colour, size, luminance, halo, opacity) in code. Such bindings exist only as user-selectable analytical layers.
* **Analytical Halo Reservation:** Optical halos are strictly reserved for user-selected data layers (analytical filters/heatmaps); at neutral baseline, halos are disabled. Stellar luminance / magnitude is selectable as a data source driving the halo.

### 2.2 Geometric Reticles & Universal Taxonomy
* **True Positional Anchoring:** Reticles remain strictly anchored to their true coordinate positions in 2D screen space. They **neither cluster nor visually fan out** (visual moiré/line overlap is accepted as the honest reflection of line-of-sight alignment).
* **Interactive Hit-Testing Fan-Out:** While the visual geometry never displaces, the underlying **interactive hit-testing areas invisibly fan out** (or utilize cyclic selection) so users can effortlessly click and select overlapping systems without the graphics moving.
* **The Open-Centred Mandate:** Every reticle across all view tiers must maintain an **unobstructed open centre**. The physical system node (Layer 1) is never covered, masked, or occluded by solid fills.
* **Reticle Attention Gating (Basic vs Annotated):**
  * **Ambient State (Default):** Reticles display **strictly their basic geometric frame** (clean diamond, broken chevrons, fractured lines, etc.) without auxiliary facet annotations, keeping the ambient starfield calm and uncluttered.
  * **Focus State:** Reserves the **full composite annotated reticle** (activating the four facets: multiplicity, label, planetary pips, and spectrum).
  * **Filtered / Selected State:** Active search filter matches and selected entities also gain the annotated reticle, accompanied by a **reticle luminance boost** to command visual priority.
* **Universal Cross-Scale Taxonomy (Scale-Invariant Consistency):**
  * **Active Stellar Systems:** Closed $45^\circ$ Diamond (`◇`).
  * **Sub-Stellar Brown Dwarfs:** Broken Diamond — Top & Bottom Vertical Chevrons (`︿` and `﹀`).
  * **Degenerate Remnants (White Dwarfs):** Fractured Diamond — Four disjoint diagonal corner lines (`◤ ◥ / ◣ ◢`).
  * **Relativistic Hazards (Neutron Stars / Pulsars / Magnetars):** Fractured diamond with outward radiating beam spines (divergent beam geometry).
  * **Gravitational Singularities (Black Holes):** Four sharp 1px inward-pointing convergent spines (`► ◄ / ▼ ▲`) targeting an empty central coordinate (infall geometry; zero planetary circle confusion).
  * **Gravitational Barycentres:** 1px Plus (`+`) at true centre of mass.
  * **Planetary Bodies (Open Circle Family):** All planet reticles share one size envelope (the same as every other body reticle); category is conveyed by shape only, and size never varies with radius, mass or class.
    * *Terrestrial / Rocky:* Plain 1px open circle.
    * *Gas Giant:* Open circle crossed by a 45° slash with a central gap (keeping the centre open).
    * *Ice Giant:* Open circle with radial ring ticks outside the circle, keeping the central disk 100% open.
  * **Stellar Clusters / Echelons:** Floating Double Top Chevron (`︽`) with no bottom chevron, crowning the cluster centroid.
  * **Artificial Constructs & Vehicles:** $90^\circ$ Orthogonal open corner box (`┌ ┐ / └ ┘`).
* **The Four-Facet Diamond Architecture (Stellar Systems - Focus / Filtered State):**
  * **Top-Left:** Stellar multiplicity census (Approach B: 0 pips for single star; 2 pips for binary; 3 pips for trinary along outer edge).
  * **Top-Right:** Typographic label (system designation).
  * **Bottom-Left:** Planetary system census (planetary symbology). These census pips are components decorating the reticle frame rather than reticles themselves; each pip is an independent census symbol with its own relative sizing, exempt from the primary reticle size rule.
  * **Bottom-Right:** Solar spectrum type.
* **Priority Occlusion Masking:**
  * Equal-priority reticles (e.g. ambient contacts) overlay directly without suppression.
  * Significant reticles (an active focused target or selected node) establish an attentional priority mask, cleanly **occluding/suppressing lesser background reticles** colliding directly beneath them.
  * *(The formal multi-tier reticle priority hierarchy will be established alongside User Journeys & Features in Phase 4).*

### 2.3 Typographic Labels
* **Screen-Space Displacement:** When systems crowd in screen space, labels dynamically displace along thin 1px leader stems up to a defined collision radius.
* **Camera-Proximity Occlusion:** Beyond the displacement threshold, **proximity to the camera strictly governs occlusion**: closer systems retain their text labels, while background systems smoothly yield and fade their labels to 0% opacity.
* **Orbit Hysteresis Buffer:** To prevent label popping or flickering during camera orbit, displacement and culling thresholds are governed by a hysteresis buffer with smooth alpha cross-fades.
* **Target Immunity:** The active focused target's label is completely immune to proximity culling; it never yields to foreground ambient systems.

### 2.4 State-Driven Drop Stalks
* **State Ownership:** Drop stalk visibility is a function of each entity's interaction state (`passive` / `active` / `selected` / `focused`, per [`scene-requirements.md` §2.1](./scene-requirements.md)). Stalks are never toggled per view or per scene; the state taxonomy is the sole authority.
* **State Mapping:** Stalks render for entities in the **`selected`** and **`focused`** tiers; `passive` and `active` entities never carry stalks. Because hover applies the `selected` tier, hovering an entity projects its stalk, and multiple selected entities each carry their own stalk.
* **Footprint Coupling:** The datum-plane ground footprint exists if and only if the entity's stalk exists. Its colour and opacity consume their own semantic tokens (`--chrome-footprint-*`), defaulting to the stalk's monochrome value, so it can be retuned independently of the stalk.
* **Extend / Retract Motion:** On entering a stalk tier, the stalk extends from the entity down to the datum plane and the footprint stamps on arrival. On leaving, the stalk retracts (default: instant snap-off). Extend and retract each consume their own semantic motion tokens (duration + easing), so either can be retuned or disabled (mapped to the zero-duration token) without code changes. Reversals mid-motion continue from the current length (no restart or pop). `prefers-reduced-motion` renders stalks instantly.
* **State Styling:** Stalks are monochrome chrome at every tier (they do not take the selected or focus colours); `selected` and `focused` differ only in opacity. Colour, opacity and line pattern consume semantic tokens; no hard-coded values.
* **Projection:** Each rendered stalk projects vertically from the entity's true world position down to the active datum plane ($Z=0$).
* **Elevation Symbology:** A rendered stalk features:
  * A 1px vertical line (solid for $+Z$ North Galactic Hemisphere, dashed for $-Z$ South Galactic Hemisphere).
  * A graduated tactical elevation tape indicating relative vertical offset ($\Delta z$) in parsecs.
  * A subtle geometric ground footprint stamped onto the Galactic Equator datum plane at the base of the stalk.

---

## 3. The Focal Inspection Aperture & Visibility Horizons

The map operates within an **unbounded continuous galactic starfield**, eliminating artificial volume cages, room ceilings, or fishbowl boundaries. Visibility, data density, and interaction are structured through an active **Focal Inspection Aperture** centered on the camera's focal point.

### 3.1 The Focal Inspection Sphere ($r \le R_{fin}$)
* **Aperture Boundary:** The travelling coordinate fins define an active spherical inspection aperture of radius $R_{fin}$ centered on the camera focal point.
* **Equal Internal Baseline:** Inside this aperture, physical distance from the camera introduces **zero depth fog or metric attenuation**. All systems within $R_{fin}$ possess equal baseline visual integrity.
* **Two-Tier Data Gating:**
  * **Geometric Reticles (Full Sphere):** Rendered across the entire interior volume ($r \le R_{fin}$), providing complete tactical contact awareness across the active inspection zone (governed by reticle priority masking).
  * **Typographic Labels (Closest Segment Only):** Restricting labels strictly to the **closest depth segment / foreground horizon** of the inspection volume prevents high-density text collisions and "wall-of-text" occlusion. Background systems within the sphere retain their reticles, but suppress text labels until approached or hovered.
  * **Target & Hover Immunity:** Any actively focused, selected, or hovered system displays its full typographic label immediately, completely overriding the segment threshold.
* **Zoom-Level Clamping Note:** Data display and occlusion rules (such as label visibility thresholds, reticle rendering, and density limits) may require clamping to specific zoom levels (e.g. suppressing ambient labels entirely during macro zoom-out to prevent screen-space clutter). Exact thresholds will be calibrated through interactive mockups.

### 3.2 Perimeter Feathered Transition Buffer
* **Edge Dissolve:** The outer boundary of the focal sphere ($r \approx R_{fin}$) features a calibrated **feathered transition buffer**.
* **Anti-Strobing Dynamics:** As stars cross the boundary during camera panning, orbit, or zoom, secondary data chrome (reticles and labels) dissolves smoothly via an alpha ramp rather than hard popping or flickering at the threshold.

### 3.3 The Far Horizon (Exterior System Nodes)
* **Metadata Stripping:** Physical systems outside the focal inspection sphere ($r > R_{fin}$) shed all tactical chrome (zero reticles, zero typographic labels, zero stalks).
* **Stepped Luminance:** Systems immediately outside the perimeter drop to a muted secondary luminance tier, forming a quiet ambient starfield.
* **Distance-Multiplier Horizon Fade:** Beyond the focal perimeter, physical points smoothly attenuate to 0% opacity over an extended distance-multiplier horizon into the galactic background. (Attenuation slopes and distance multipliers are calibrated dynamically based on zoom tier).

---

## 4. Camera Dynamics & Projection Rules

### 4.1 Perspective with Ortho Faces (Continuous Matrix Blending)
* The camera utilizes a **continuous interpolation projection matrix**.
* While orbiting in free 3D space, the camera operates in a tight technical perspective (narrow FOV 25°–35°) to preserve metric proportions and avoid wide-angle distortion.
* As the camera rotates within a critical angular threshold ($\approx 5^\circ$) of a cardinal face (e.g. looking straight down into the $XY$ Galactic Equator plan view, or straight on from the $XZ$ profile), the projection matrix smoothly blends into **pure Orthographic projection**.
* Parallax distortion is completely eliminated when viewing cardinal projections, and smoothly restores when orbiting resumes.
* **Natural Geometric Alignment:** 
  * In Plan View ($XY$), the horizontal fin and range rings naturally form an authentic polar cartographic dial, while vertical fins ($XZ, YZ$) collapse edge-on into crisp 1px crosshair axes.
  * In Profile Views ($XZ, YZ$), the Galactic Equator collapses into a razor baseline ($Z=0$), showing vertical drop stalks in true 1:1 metric height ($\Delta z$).
* **Linear Metric Scale Bar:** Because orthographic projection provides globally uniform scale, a minimalist 1px linear scale bar (`|──── 5 pc ────|` with metric sub-ticks) smoothly fades in at the viewport margin upon locking ortho, and fades out when 3D orbiting resumes.
* **Zero Caliper/Banner Clutter:** Caliper crop marks and face-stamp banners are omitted to preserve visual clarity.
* **Axis Flattening:** Depth flattening is accepted as inherent to cardinal 2D projections (any depth cues deferred to reticle consideration or left omitted).

### 4.2 Camera Transitions
* All camera relocations execute as **critically damped glides** along interpolated splines with strict technical deceleration (zero elastic bounce or overshoot).

---

## 5. Measurement & Tactical Symbology

* **In-Situ Dynamic Vector Measurement Chords:** Selecting two entities (or an entity and the active anchor) connects them with a crisp 1px dimension chord displaying true 3D Euclidean distance (e.g. `4.24 pc`) and relative vertical elevation ($\Delta z$) stamped directly alongside the line.
* **Off-Boresight Peripheral Target Cueing:** When an active designated target exits the camera viewport, a 1px directional chevron and distance tag pins to the viewport edge, pointing toward the target off-screen (selection-dependent).
* **Projected Kinematic Velocity Vectors:** When selected or enabled, system velocity is represented by a projected dotted vector line to a fixed time delta ($\Delta t$). (Activation rules and terminus treatment to be finalised).
* **Target Breathing Pulse:** A subtle, low-amplitude rhythmic breathing cycle applied strictly to the single locked target reticle to maintain tracking lock during camera orbit without visual noise.
* **Spatial Orientation Sweep:** An expanding radial distance ripple radiating outward from the focal centre attached strictly to an orientation event (e.g. view entry or camera recentering) to rapidly establish the spatial scale of the volume.

---

## 6. Operational Modes & State Persistence

| Feature | Ambient Persistence | Exploratory Mode | Focus Mode | Route / Pathing Mode | Analytical Filter Mode |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Galactic Equator Datum ($XY$)** | **Persistent** | Centered on camera focal point | Centered on active target | Centered on route origin | Centered on camera focal point |
| **Core & Orbital Bearings** | **Persistent** | Active with detachable edge arrows | Active with detachable edge arrows | Active | Active |
| **3 Mobile Traveling Fins** | **Persistent** | Follows camera center | Follows target center | Subdued | Subdued |
| **Range Rings** | **Persistent** | Zoom-adaptive hierarchical | Zoom-adaptive hierarchical | Subdued | Subdued |
| **Vertical Stalk** | **State-Driven** | Per entity state (§2.4) | Per entity state (§2.4) | Per entity state (§2.4) | Per entity state (§2.4) |
| **Sliding Distance Tape ($R_{gal}$)** | **Active in Explore** | Slides continuously along Core axis | Pinned to target Core distance | Slides along active path | Static |
| **Measurement Chords** | **Tool-Specific** | Hidden | Target-to-anchor chord | Multi-hop trajectory chords | Hidden |
| **Colour & Filtering** | **Neutral Baseline** | Monochromatic baseline | Monochromatic baseline | Path highlighting / dimming | Chromatic query highlights |

### 6.1 Explore Mode Mechanics
* In **Explore Mode**, the entire tri-axial datum structure is anchored directly to the **camera's central focal point**.
* As the user pans and navigates across the galactic starfield, the coordinate frame moves seamlessly with the camera.
* Galactocentric distance markers ($R_{gal} \approx 8.19 \dots 8.21$ kpc) slide smoothly along the Core axis like a live vernier scale, continuously displaying the camera's true position within the Milky Way disk.
* Stalk visibility follows entity interaction state (§2.4); Explore Mode applies no additional stalk rules.
