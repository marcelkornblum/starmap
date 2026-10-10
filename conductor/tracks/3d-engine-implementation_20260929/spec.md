# Specification: 3D Engine Implementation

## Overview
This track builds the actual WebGL scenes and rendering pipelines for Starmap. It acts strictly as the execution phase for the aesthetic and interaction rules defined in the `visual-design-exploration` track, utilizing the pre-calculated data from the `data-pipeline` track, and mounting into the global canvas built in the `core-routing-state` track. 

## Functional Requirements
1. **High-Performance Rendering:** Implement `InstancedMesh` (or custom `Points` materials) to render massive datasets (e.g., 100k+ stars in the Galaxy view) in a single draw call to maintain a strict 60fps.
2. **Camera & Navigation:** Extend the `CameraRig` delivered by `3d-component-architecture` with:
   - **Camera Coupling:** Resolve camera dolly with proportional aperture scaling vs fixed camera distance with variable scene aperture radius.
   - **Orthographic Projection & Navigation Paradigms:** Continuous blending between narrow-FOV perspective (25°–35°) and orthographic projection near cardinal planes ($XY$, $XZ$, $YZ$); frustum-to-aperture scaling for uniform proportions; no depth/clipping anomalies in ortho; modal controls (constrained 2D pan/zoom in ortho vs orbit/dolly in free 3D); critically damped glides; consistent input mappings across devices.
   - **Multi-Scale Transitions:** Datum plane shifts across scale boundaries (Galactic Equator → System Invariable/Ecliptic → Planetary Equator) with inter-scale tilt indicators.
   - **Zoom-Level Clamping:** Calibrated thresholds suppressing ambient labels/reticles during macro zoom-out.
   - **Far Horizon Fade:** Calibrated distance-multiplier horizons and attenuation curves outside the focal aperture ($R_{fin}$).
   - **Galactic Orientation Compass:** Fixed HUD indicator (attitude minimap) showing galactic axes relative to camera heading.
3. **Materials & Shaders:** Write the custom shaders or standard materials to match the Cartography Rules, ensuring they dynamically react to the UI's Light/Dark mode tokens.
4. **Post-Processing Pipeline:** Implement `@react-three/postprocessing` to add high-performance visual polish, only if dictated by the design spec.
5. **Route Integration:** Connect the canonical scenes to the routing tunnel so they seamlessly swap when the URL changes.
6. **Unified Selection Pipeline & Projection Bridge:**
   - Full 2D ↔ 3D selection bridge: selecting an entity from 2D lists or clicking its 3D reticle dispatches the identical pipeline: camera focal lock, reticle state promotion (`passive` → `active` → `selected` → `focused`), and interaction event broadcasting.
   - Screen-space projection: projects 3D entity coordinates to 2D screen-space without layout thrashing.
7. **3D-Synchronised Search Framing:** As search/palette input changes, highlight matching candidates and reframe camera/aperture to enclose all matches.

## Non-Functional Requirements
- **Performance Threshold:** The Galaxy scene must render the full dataset without dropping below 60fps on average hardware.
- **Memory Management:** Textures and geometries must be properly disposed of when scenes unmount to prevent GPU memory leaks.

## Acceptance Criteria
- [ ] The Galaxy view successfully renders 100,000+ points at a stable 60fps using `InstancedMesh`.
- [ ] WebGL materials correctly sync to the Light/Dark mode CSS tokens.
- [ ] Perspective ↔ orthographic transitions are continuous with no clipping anomalies; navigation mode switches accordingly.
- [ ] Zoom clamping and far horizon fade thresholds calibrated and token/config driven.
- [ ] Orientation compass tracks camera heading against galactic axes.
- [ ] Screen-space projection bridge feeds HUD layers without layout thrashing.
- [ ] Search input reframes camera to enclose matches.
- [ ] Navigating via the router seamlessly swaps the 3D scenes without memory leaks.
