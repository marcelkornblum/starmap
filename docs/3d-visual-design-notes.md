# 3D Visual Language & Cartography (Exploration Notes & Scratchpad)

> [!NOTE]
> **Exploration Scratchpad:** This document contains exploratory notes and brainstormed concepts from Phase 1.
> The **single authoritative specification** for finalized architectural and cartographic decisions is **[`docs/3d-spatial-architecture.md`](./3d-spatial-architecture.md)**.

---

## 1. Current Exploration Scope

* **View:** Galaxy Map (zoomed in to the Solar Neighborhood).
* **Dataset Volume:** Closest ~100 stars (radius of approximately 10–15 parsecs around Sol).
* **Primary Objective:** Solving 3D position perception and depth ambiguity without visual clutter.
* **Authoritative Specification Rule:** All AI-generated visual references contain technical inaccuracies (e.g. scale distortions, planar shading artifacts, or incorrect linework density). The text, token contracts, and code specifications in this documentation are the sole authoritative source of truth; visuals are purely illustrative sketches.

---

## 2. Visual Data Attributes (Breadth-First Exploration)

### Attribute 1: Position & Depth Perception
* [ ] **Drop Stems with Elevation Tape:** Vertical 1px connector lines dropped perpendicularly from celestial nodes to the shared horizontal reference plane, augmented on active or inspected nodes with a tactical elevation scale displaying relative vertical offset ($\Delta z$) and graduated altitude ticks.
* [ ] **Range Rings:** Concentric radial parsec distance circles centered on Sol or the active anchor system.
* [ ] **Camera Distance via Opacity (Atmospheric Fog):** Modulating node and line alpha based on distance from the camera to provide natural aerial perspective depth cues.
* [ ] **Hypsometric Distance/Elevation Colour Tinting:** Stepped colour bands representing radial distance shells from Sol or vertical elevation ($Z$) off the galactic reference plane (borrowed from topographic relief cartography and 3D LiDAR point clouds).

### Attribute 2: Size & Scale (Visual Volume / Node Diameter)
* [ ] **Screen-Space Discrete Sizing:** Fixed pixel steps (e.g. 4px, 6px, 8px) that do not scale with camera distance, encoding pure intrinsic data (e.g. luminosity or stellar mass).
* [ ] **Clamped Hybrid Dynamic Sizing:** Nodes scale with camera proximity for natural 3D depth, but are clamped to strict floor (never sub-pixel) and ceiling (never ballooning) limits.
* [ ] **Decoupled Dual-Layer Sizing (Core + Reticle):** A constant-size central anchor dot paired with an expandable outer ring or halo whose diameter encodes quantitative metrics.

### Attribute 3: Colour Hue (Open Scalar & Filter Channel)
* [ ] **Open Scalar Gradient Ramp:** Dynamically mapped to visualise any single continuous attribute (e.g. temperature, radial velocity, metallicity, or proper motion) across the starfield on demand.
* [ ] **Categorical Attribute Filter (0 or 1 Highlight):** Background stars remain achromatic; chromatic hue is strictly applied to isolate nodes matching an active query (e.g. exoplanet hosts, spectral class G, or solar analogs).
* [ ] **Significance-Gated Data Filtering (Toponymic Hierarchy):** Prioritising node and label visibility dynamically based on active data queries or significance metrics (to be explored once primary data attributes are finalised), rather than applying arbitrary global culling.

### Attribute 4: Colour Luminance / Value (Lightness)
* [ ] **Stepped Luminance Bands:** Quantizing data into 3–4 strictly calibrated lightness tiers (e.g. 100%, 65%, 35%) so relative value is instantly classifiable without continuous brightness ambiguity.
* [ ] **Radial Luminance Falloff (Core vs Halo Decay):** A sharp, 100% white pinpoint centre surrounded by a halo whose luminance decay curve or edge sharpness communicates data.

### Attribute 5: Shape & Glyph (Symbology)
* [ ] **Camera-Facing Billboarded 2D Glyphs:** Screen-aligned geometric vector shapes that always face the camera plane, eliminating perspective distortion during orbit.
* [ ] **Compound Modular Glyph Tokens (Tactical HUD Symbology):** A central anchor shape with modular auxiliary attachments (e.g. companion pips, split concentric arcs, and directional heading notches) to encode multiple discrete attributes simultaneously without text.
* [ ] **Planar Ground Footprints:** Symbology rendered flat on the horizontal cartographic reference plane at the base of the drop stem, leaving the star in space clean while anchoring classification to the floor.

### Attribute 6: Lines, Connections & Strokes (Linework)
* [ ] **Screen-Space Clamped Hairlines:** Clamping line widths strictly to screen-space pixels (e.g. 1px hairline) to guarantee razor-sharp vector rendering at all zoom levels without sub-pixel shimmering or ballooning.
* [ ] **Stroke Patterning (Structural vs Content Separation):** Using disciplined dash arrays (solid, dashed, dotted) to cleanly separate structural cartographic frames (grids, range rings, stems) from content/data relationships (binary connections, trajectories).
*(Note: Distance-based line attenuation folds directly into the Camera Distance Fog model under Attribute 1).*

### Attribute 7: Motion & Temporal Dynamics
* [ ] **Single-Target Breathing Pulse:** A slow, low-amplitude rhythmic breathing cycle applied strictly to the single active selected target, maintaining effortless attentional lock during 3D camera orbits without visual noise.
* [ ] **Radar Wavefront / Spatial Sweep:** An expanding radial distance ripple radiating outward from the origin or anchor system upon view entry or search execution, rapidly establishing the spatial scale and orientation of the neighborhood.

### Attribute 8: Spatial Density & Clustering
* [ ] **Dynamic Cluster Consolidation:** When nodes fall within a critical screen-space pixel radius, consolidating them into an aggregated composite reticle with a numeric count badge, separating cleanly on camera zoom. *(Requires deeper dive).*
* [ ] **Proximity Fan-Out (Tactical Radial Expansion):** Radial expansion of tightly grouped or overlapping nodes along thin 1px leader stems upon hover/click, enabling direct target selection without camera repositioning. *(Requires deeper dive).*
* [ ] **Priority-Based Occlusion Culling:** When labels or reticles collide during camera orbit, lower-priority elements yield and suppress cleanly to prevent visual overlap.
* [ ] **Barycentric Multiplicity Consolidation (System Collapsing):** Binary and multiple systems collapse into a single compound barycentre node at macro scale with a multiplicity indicator (e.g. `×3`), unpacking into discrete stellar bodies and orbital paths only when focused or zoomed to system scale.
* [ ] **Cartographic Screen-Space Displacement:** When nodes occlude along the camera's line of sight, reticles and labels displace slightly in 2D screen space with thin 1px leader lines back to their true 3D coordinates, maintaining positional truth while ensuring targetability.
* **Architectural Constraint:** The **physical star node**, the **geometric reticle**, and the **text label** must be considered *individually*—each layer requires independent collision, clustering, and visibility logic rather than being treated as a monolithic object.

### Attribute 9: Typography & Direct Labeling in 3D Space
* [ ] **Screen-Aligned 2D Text:** Text is strictly rendered flat to the camera in crisp 2D screen pixels, offset from the node via clean vector anchors or leader lines. Never tilted or distorted as 3D world geometry.
* [ ] **Distance-Gated Label LOD (Sparse Labeling):** In pursuit of minimal visual noise, text labels are suppressed for distant stars and render only within an immediate camera-proximity threshold; distant entities remain purely geometric nodes until approached.

### Attribute 10: Texture, Fill & Stippling (Spatial Volumes & Zones)
* [ ] **Cartographic Stippling (Point-Density Fields):** Representing 3D spatial volumes (e.g. interstellar medium, moving groups, or density envelopes) via mathematical micro-dot fields. Dot spacing conveys volumetric density without solid walls or blurry cinematic fog.
* [ ] **Planar Cross-Hatching:** Technical survey and architectural hatching lines rendered on horizontal reference planes where volumetric zones intersect, cleanly grounding the spatial region to the map floor.

## 3. Cartographic Techniques (Breadth-First Exploration)

### Technique 1: Coordinate Graticules & Reference Planes
* [ ] **Scale-Adaptive Reference Planes:** Dynamic plane alignment based on viewing tier (Galactic Disk for macro neighborhood -> Invariable/Ecliptic Plane for stellar systems -> Rotational Equator for planets).
* [ ] **Inter-Scale Plane Tilt Visualisation:** A visual transition mechanism displaying the geometric tilt angle between reference planes when preparing to switch scales or cross-referencing parent/child coordinates.
* [ ] **Mobile-Anchor Radial Graticule:** Concentric parsec range rings and radial angular spokes centered dynamically on the *active target system* rather than hardcoding Sol.
* [ ] **Bounded Cartographic Slate (with Unbounded Axes):** A defined circular or square ground disk cutting off distant noise, with principal coordinate axes extending outward into space.
* [ ] **Bounded Spatial Quadrant / Section Plates:** A spatial volume cutaway bounded by three orthogonal planar plates (quarter-sphere or octant box), providing an architectural bounding frame without solid walls.
* [ ] **Infinite Fading Hybrid Graticule:** Faint orthogonal metric grid paired with radial distance rings, fading smoothly to 0% opacity at the field periphery to prevent visual clutter.
* [ ] **Principal Directional Vector:** An unambiguous cardinal orientation axis pointing toward the Galactic Core ($l = 0^\circ, b = 0^\circ$).
* **Core Challenge to Solve:** Rendering the plane with sufficient structural presence without occluding or competing with celestial nodes.

### Technique 2: Projections, Dimensional Framing & Camera Dynamics
* [ ] **The Bounded Volumetric Inspection Lens & Focal Decluttering:** An active 3D bounding frame (paired with a center-weighted screen-space optical aperture) within which rich data representations (reticles, stems, colors, telemetry) activate at full fidelity without distance decay, while peripheral or out-of-bounds entities shed clutter and remain muted reference dots.
* [ ] **Tight Technical Perspective (Narrow FOV 25°–35°):** Telephoto camera lens to eliminate wide-angle distortion and keep metric proportions readable.
* [ ] **Perspective with Ortho Faces (Continuous Interpolation):** Smoothly blending projection matrices as the camera aligns near cardinal faces (e.g. looking dead-on from top-down into plan view), eliminating perspective distortion when flat while preserving 3D parallax when orbiting (calibrated after Blender and CAD ViewCubes).
* [ ] **Critically Damped Camera Glides:** Smooth, non-teleporting camera transitions along interpolated splines using strict technical deceleration (zero elastic bounce) to maintain spatial orientation during target changes.
* [ ] **Auxiliary Cardinal Snap Views:** Quick shortcut alignment to pure plan (top-down) or elevation (profile) views (auxiliary tool, not core principle).

### Technique 3: Distance Metrics & Scale Legends
* [ ] **Concentric Range Rings with Subdividing Radial Ticks & Direct Stamps:** Concentric distance rings (e.g. 5 pc, 10 pc, 15 pc) combined with radial axes featuring dynamic subdividing metric ticks (e.g. 1 pc intervals close-in, expanding to 5 pc or 10 pc further out). Numeric distance stamps are engraved directly onto ring-axis intersections rather than floating in a detached HUD.
* [ ] **In-Situ Dynamic Vector Measurement Chords:** Interactive target-to-origin or target-to-target measurement chords. Selecting two stars (or a star and the active anchor) renders a crisp 1px dimension line displaying true 3D Euclidean distance (e.g. "4.24 pc") and relative vertical elevation ($\Delta z$) stamped directly alongside the chord.

### Technique 4: Wayfinding, Orientation & Cardinal Direction
* [ ] **Galactic Core Heading & Sector/Quadrant Framing:** Primary cardinal orientation axis fixed to the Galactic Core ($l = 0^\circ, b = 0^\circ$). The bounded volume or ground slate can be structured as an oriented sphere segment or galactic quadrant anchored to the Core, providing a persistent spatial heading cue regardless of camera orbit.
* [ ] **Perimeter Azimuth Dial:** Galactic longitude ($l = 0^\circ \dots 360^\circ$) degree intervals and quadrant boundaries engraved along the perimeter arc/rim of the bounded slate.
* [ ] **Attitude Gimbal / Orientation Minimap (HUD):** A compact, screen-aligned corner widget in the HUD displaying the Galactic Plane, Polar normal, and Core heading relative to current camera attitude, providing immediate orientation status during steep orbit/tilt without cluttering the 3D scene.

### Technique 5: Tactical Avionics & Target Tracking
* [ ] **Off-Boresight Peripheral Target Cueing (Permanent Core Fixture):** When an active designated target or reference anchor orbits outside the camera viewport, a subtle 1px directional chevron and distance tag pins to the viewport perimeter, maintaining immediate tracking and orientation without forcing camera reset (not Sol-specific; tracks any active designation).
* [ ] **Multi-Tier Track Classification Reticles:** Entities transition through disciplined visual states (ambient raw dot $\rightarrow$ correlated track brackets `⌜ ⌝` $\rightarrow$ locked diamond/box reticle with elevation tape) to convey system state without text overload.
* [ ] **Kinematic Proper Motion Vectors (Lead Tapes):** Forward-projecting lead vectors (e.g. $+50,000$ yr motion) showing stellar trajectory and moving group velocity relative to the local interstellar volume.

---

## 4. Thematic Index & Concept Collation

### Theme 1: Structural Linework, Reference Planes, Orientation & Distance Metrics
* ★ **[DEFINITE] Galactic Core Heading & Bearing Axis:** Primary orientation vector pointing directly to $l = 0^\circ, b = 0^\circ$ (serves as a persistent directional cue, anchoring oriented quadrant/sector framing).
* ★ **[DEFINITE] In-Situ Dynamic Vector Measurement Chords:** True 3D Euclidean distance line between selected nodes with in-situ numeric readout and relative $\Delta z$.
* **Concentric Range Rings with Subdividing Radial Ticks & Direct Stamps:** Metric distance rings with dynamic subdividing ticks on radial axes and direct numeric stamps on intersections.
* **Mobile-Anchor Radial Graticule:** Range rings and spokes dynamically re-centering on the active target rather than hardcoded to Sol.
* **Scale-Adaptive Reference Planes:** Dynamic plane alignment based on viewing tier (Galactic Disk $\rightarrow$ Invariable/Ecliptic $\rightarrow$ Planetary Equator).
* **Inter-Scale Plane Tilt Visualisation:** Angular transition indicators displaying geometric tilt between coordinate systems when shifting scales.
* **Bounded Cartographic Slate (with Unbounded Axes):** Defined ground disk cutting off distant noise, with principal coordinate axes extending outward.
* **Bounded Spatial Quadrant / Section Plates:** 3D spatial cutaway bounded by three orthogonal plates (quarter-sphere/octant box) aligned to the Galactic Core.
* **Infinite Fading Hybrid Graticule:** Faint orthogonal metric grid fading smoothly to 0% opacity at periphery.
* **Perimeter Azimuth Dial:** Galactic longitude ($l = 0^\circ \dots 360^\circ$) degree intervals and quadrant boundaries engraved along the slate rim.
* **Attitude Gimbal / Minimap (HUD):** Screen-aligned corner widget showing Galactic Plane, Polar normal, and Core heading relative to camera attitude.
* **Drop Stems with Elevation Tape:** Vertical 1px lines dropped to reference plane with graduated $\Delta z$ ticks and metric altitude on active/inspected nodes.
* **Planar Ground Footprints:** Symbology and classification markers rendered flat on the horizontal reference floor at the base of drop stems.
* **Planar Cross-Hatching:** Technical survey hatching rendered on horizontal reference planes where volumetric zones intersect the floor.
* **Linework Disciplines:** 1px screen-space clamped hairlines; stroke dash patterning separating structural geometry from data.

### Theme 2: Visual Encoding & Node Representation (Hue, Luminance, Size, Shape & Texture)
* ★ **[DEFINITE] Camera-Facing Billboarded 2D Vectors:** Node markers strictly render flat in screen space to camera pixels, never distorted as tilted 3D world geometry.
* **Open Scalar Gradient Ramp:** Dynamic continuous color mapping (e.g. viridis or thermal) mapped on-demand to any scalar metric (temperature, velocity, metallicity).
* **Categorical Attribute Filter (0 or 1 Highlight):** Monochromatic neutral starfield at baseline; chromatic hue reserved strictly to isolate active query matches.
* **Stepped Luminance Bands:** Quantizing data into 3–4 strictly calibrated lightness tiers (e.g. 100%, 65%, 35%) for unambiguous value classification.
* **Radial Luminance Falloff (Core vs Halo Decay):** Sharp 100% white pinpoint centre surrounded by a decaying halo whose falloff encodes data.
* **Screen-Space Discrete Sizing:** Fixed pixel steps (4px, 6px, 8px) encoding pure intrinsic data independent of distance.
* **Clamped Hybrid Dynamic Sizing:** Natural proximity scaling bounded by strict floor and ceiling pixel limits.
* **Cartographic Stippling (Point-Density Fields):** Representing 3D spatial volumes and density envelopes via mathematical micro-dot fields.

### Theme 3: Reticles, Symbology & Target Tokens
* ★ **[DEFINITE] Off-Boresight Peripheral Target Cueing:** Permanent core fixture of screen-edge pinned 1px chevrons and distance tags pointing to active targets orbiting outside the viewport (not Sol-specific).
* **Multi-Tier Track Classification Reticles:** Entities transition through strict visual states (ambient raw dot $\rightarrow$ correlated track brackets `⌜ ⌝` $\rightarrow$ locked diamond/box reticle with elevation tape).
* **Decoupled Dual-Layer Sizing (Core + Reticle):** Constant-size central anchor dot paired with an expandable outer ring/halo encoding quantitative metrics.
* **Compound Modular Glyph Tokens (Tactical HUD):** Central anchor shape with modular auxiliary attachments (companion pips, concentric arcs, heading notches) encoding multiple discrete attributes without text.

### Theme 4: Focus, Attention & Volumetric Selection
* **The Bounded Volumetric Inspection Lens:** 3D bounding frame within which nodes activate at full data fidelity without distance decay.
* **Boresight Optical Aperture Decluttering:** Center-weighted viewport aperture activating telemetry and tags in the direct center of gaze, while peripheral nodes shed clutter.
* **Single-Target Breathing Pulse:** Low-amplitude rhythmic breathing cycle on the single active target for attentional lock during orbit.
* **Distance-Gated Label LOD (Sparse Labeling):** Minimal visual noise; text suppressed until within close camera proximity.
* **Camera Distance Opacity Fog:** Aerial perspective depth attenuation on distant nodes and lines.
* **Radar Wavefront / Spatial Sweep:** Expanding radial distance pulse from origin to establish spatial scale on entry.
* **Significance-Gated Data Filtering:** Dynamic prioritization of nodes/labels matching active queries or significance criteria.

### Theme 5: Spatial Density, Clustering & De-Confliction
* ★ **[DEFINITE] Layer Independence Principle:** Physical star node, geometric reticle, and text label have completely decoupled collision, clustering, and visibility logic.
* **Dynamic Cluster Consolidation:** Proximity-based aggregation into a composite reticle with a numeric count badge.
* **Proximity Fan-Out (Tactical Radial Expansion / Spiderfy):** Radial expansion of overlapping nodes along 1px leader stems on hover/click.
* **Priority-Based Occlusion Culling:** Lower-priority elements suppress cleanly when colliding in screen space.
* **Barycentric Multiplicity Consolidation (System Collapsing):** Binary/multiple systems collapse into a single compound node with multiplicity tag (`×3`), unpacking only at system scale.
* **Cartographic Screen-Space Displacement:** Overlapping nodes displace slightly in screen space with 1px leader stems back to true 3D coordinates.

### Theme 6: Camera, Projection & Spatial Dynamics
* ★ **[DEFINITE] Perspective with Ortho Faces (Continuous Interpolation):** Smooth transition to orthographic projection when approaching cardinal face angles (e.g. plan view).
* **Tight Technical Perspective (Narrow FOV 25°–35°):** Telephoto framing to eliminate wide-angle distortion and preserve metric proportions.
* **Critically Damped Camera Glides:** Non-teleporting smooth transitions along splines with zero elastic bounce.
* **Auxiliary Cardinal Snap Views:** Quick orientation shortcuts to pure plan or elevation views.
* **Kinematic Proper Motion Vectors (Lead Tapes):** Forward-projected proper motion vectors (+50,000 yr) revealing velocity and moving groups.

---

## 5. Operational Modes & Persistence Matrix

### 5.1 Operational Modes
1. **Exploratory Mode (Default Landing):** Open volumetric survey of the starfield. Unconstrained navigation, minimal cognitive noise, baseline cartographic fabric.
2. **Focus Mode (Entity Centred):** Centered on a single target. Local geometric framing, high-fidelity inspection lens, deep telemetry.
3. **Route / Pathing Mode:** Navigational planning between systems. Multi-hop vector measurement chords, trajectory connections, distance budgeting.
4. **Analytical Filter Mode (Query / Census):** Query-driven state isolating systems by data attributes (spectral type, exoplanets, metallicity) via chromatic highlights and scalar ramps.
5. **Comparative Mode (Multi-Target Focus):** Simultaneous dual- or multi-system inspection with comparative distance chords and multi-bay telemetry.
6. **Kinematic / Epoch Mode (Temporal Projection):** Proper motion lead vectors and temporal scrub projection across astronomical epochs ($\pm \Delta t$).
7. **Volumetric Section Mode (Spatial Cutaway):** Planar or slab bounds isolating a thin horizontal or orthogonal cross-section to eliminate depth crowding.

### 5.2 Persistence vs Mode-Specific Cross-Index

#### Persistent Baseline Fabric (Omnipresent across modes)
* ★ **[DEFINITE] Tri-Axial Segmented Datum Architecture:**
  * **Three Mobile Traveling Fins:** Because navigation is unanchored in 3D space, all three orthogonal planes feature mobile segments traveling with the camera's central focal point:
    1. **Dominant Datum Segment ($XY$):** The horizontal Galactic Equator ($Z=0$), serving as the primary visual datum floor that carries metric range rings and receives the active elevation stalk.
    2. **Core Meridian Fin ($XZ$):** Vertical quarter-circle fin aligned with the Galactic Core ($l=0^\circ$) and North Galactic Pole ($b=+90^\circ$).
    3. **Transverse Fin ($YZ$):** Vertical quarter-circle fin aligned with the Galactic Orbital direction ($l=90^\circ$).
  * The vertical fins are rendered in subordinate, ultra-faint 1px hairlines to maintain pitch awareness without clutter.
  * **Zoom-Adaptive Hierarchical Range Rings:** Concentric distance rings adapt their spacing dynamically to the current zoom level (e.g. 1 pc $\rightarrow$ 5 pc $\rightarrow$ 10 pc), rendered with calibrated visual hierarchy (heavier primary rings paired with lighter subordinate hairlines).
  * **Unbounded Bearing Lines & Detachable Screen-Edge Arrows:**
    * The **Galactic Core Axis ($l=0^\circ$)** ★ and **Galactic Orbital Vector ($l=90^\circ$)** extend past the outermost range ring and project off-screen.
    * Each bearing line carries a screen-edge arrowhead indicating Core or Orbital heading.
    * When orientation or camera tilt causes a bearing line to leave the viewport, its arrowhead **detaches and remains pinned to the closest screen edge**, maintaining continuous cardinal orientation.
  * **Open Unbounded Space:** Zero outer bounding box, zero cage walls; geometry terminates openly into black space.
* ★ **[DEFINITE] Camera-Facing Billboarded 2D Vectors:** Crisp screen-aligned vector rendering for all symbology and markers.
* ★ **[DEFINITE] Perspective with Ortho Faces:** Continuous camera projection blending on cardinal face alignment.
* **Perimeter Azimuth Dial:** Galactic longitude ($l$) degree markings engraved along the datum rim.
* **Attitude Gimbal / Minimap (HUD):** Corner orientation widget showing viewing angle relative to the Galactic Plane and Core.
* **Linework Disciplines:** Universal 1px screen-space clamped hairlines and stroke dash patterning.
* **Strict Single-Stalk Rule:** The ambient starfield contains **zero stalks**. Exactly ONE vertical drop stalk projects down to the Galactic Equator datum plane strictly when a star is **focused or selected** (nothing else receives a stalk).
* **Depth Attenuation & Sparse Labels:** Camera distance opacity fog; distant text labels suppressed by default.
* *(Note: ★ [DEFINITE] Off-Boresight Peripheral Target Cueing is selection-dependent, not persistent; activates whenever a designated target exits the viewport).*
* *(Note: ★ [DEFINITE] Layer Independence Principle is an architectural constant to be detailed later).*

#### Mode-Specific Activations

| Mode | Active 3D Features & Changes | Relevant Themes |
| :--- | :--- | :--- |
| **Exploratory** | The entire tri-axial datum structure is anchored directly to the **camera's central focal point**. As the camera translates through the interstellar volume, Galactocentric distance markers ($R_{gal}$) slide smoothly along the Core axis like a live vernier scale. Zero stalks in the field; hovering or selecting an entity projects the single active 1px stalk down to the Galactic Equator datum plane. | Themes 1, 3, 4 |
| **Focus** | Camera glides to center target. Target reticle locks with breathing pulse. The single active 1px drop stem illuminates with elevation tape ($\Delta z$) and planar footprint on the Galactic Equator. Bounded Inspection Lens activates local detail. Multiplicity collapses unpack. Graticule shifts if anchor changes. | Themes 1, 2, 3, 4, 5, 6 |
| **Route / Pathing** | Dynamic vector measurement chords connect selected waypoints with in-situ Euclidean distances and relative elevation. Non-route nodes shed luminance. | Themes 1, 4 |
| **Analytical Filter** | Chromatic hue and open scalar gradient ramps activate on matching systems; non-matching systems drop to muted ghost pips. Direct count and distribution sync to dock. | Themes 2, 4 |
| **Comparative** | Multiple systems gain locked reticles simultaneously. Direct comparative vector measurement chord bridges them in-situ. Common camera framing. | Themes 1, 3, 6 |
| **Kinematic** | Forward/backward proper motion lead vectors (+50,000 yr) extend from nodes. Star coordinates translate dynamically along galactic trajectories over time. | Themes 2, 6 |
| **Volumetric Section** | Planar clipping slab bounds the volume (e.g. $\pm 2$ pc around Galactic Plane); out-of-bounds nodes hard-clipped or ghosted; cross-hatching marks cut edges. | Themes 1, 4 |

---

## 6. Reference Frameworks
* **Cartography & Survey:** Ordnance Survey, nautical navigation charts, topographic contour maps.
* **Data Design & Information Architecture:** Jacques Bertin, Edward Tufte, Swiss typographic data consoles.
* **Lightweight Sci-Fi & Tactical Avionics:** Modern fighter jet HUDs, tactical radar/sonar displays, helmet-mounted symbology (Mil-Std-1787), target acquisition reticles.


