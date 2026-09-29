# 3D Canvas Management

*Placeholder document for WebGL context and scene architecture.*

## The Global Canvas Lifecycle
- **Persistent Engine:** The React Three Fiber `<Canvas>` is mounted at the absolute root of the application, outside of the React router. This prevents the WebGL context from being destroyed and rebuilt during route navigations, eliminating CPU/GPU spikes.
- **Scene Swapping:** The router dictates which specific 3D scene (e.g., `<GalacticScene>`, `<SystemScene>`) is teleported into the global canvas. The *contents* (lighting, cameras, meshes) are completely unique to each view; only the WebGL renderer is shared.

## Inline 3D Elements (Encyclopedia UI)
- **The `<View>` Component:** For scenarios requiring 3D objects embedded within scrolling HTML layouts (e.g., a grid of cards in the reference section, each with a 3D star), the `@react-three/drei` `<View>` component is utilized. 
- **Scissor Testing:** This allows the persistent global canvas to render distinct 3D scenes into specific DOM elements (divs) simultaneously, enabling scrolling inline 3D without instantiating multiple WebGL contexts.
