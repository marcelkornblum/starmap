# WebGL, Three.js & React Three Fiber (R3F) Style Guide

This guide establishes the mandatory architectural, performance, lifecycle, and memory management standards for authoring 3D WebGL scenes, Three.js objects, and React Three Fiber (R3F) components in Starmap.

---

## 1. Zero-Allocation Hot Paths (`useFrame` & 60fps Budget)

The WebGL render loop executes at 60 frames per second (or 120Hz on high-refresh displays). Any memory allocation inside `useFrame` triggers JavaScript Garbage Collection (GC) pauses, causing frame drops and visual stutter.

### Non-Negotiable Invariants inside `useFrame`:
- **No Object or Array Literals:** Never allocate `{ ... }`, `[ ... ]`, or literal constants (e.g. `['xy', 'xz', 'yz'] as const`, `[x, y, z]`) inside `useFrame`.
- **No Closures or Iterators:** Never call `.map()`, `.forEach()`, `.filter()`, `.some()`, or `.reduce()`, and never declare helper functions inside `useFrame`. Use standard indexed `for` loops (`for (let i = 0; i < len; i++)`).
- **No Object Instantiations:** Never invoke `new THREE.Vector3()`, `new THREE.Color()`, `new THREE.Matrix4()`, `new THREE.BufferAttribute()`, or call `.clone()` inside the frame loop.
- **Scratch Object Pattern:** Pre-allocate module-level or component-level `useRef` scratch instances (`scratchVec3`, `scratchColor`, `scratchRay`) outside the frame loop, and mutate them in-place using `.set()`, `.copy()`, or `.add()`.
- **Guarded String Generation:** Avoid constructing template strings (e.g. `translate(${x}px, ${y}px)`) on every tick. Store the previous scalar values in refs and only generate strings when values genuinely change (`if (lastXRef.current !== x || lastYRef.current !== y)`).
- **No Synchronous React State Updates:** Never call `setState()` inside `useFrame`. React state transitions force synchronous reconciliation cycles that blow the 16.6ms frame budget. Store high-frequency simulation or interaction telemetry in mutable `useRef` containers.
- **Zero DOM Layout Thrashing:** Never call `getBoundingClientRect()`, `offsetWidth`, `clientHeight`, or other layout-querying DOM properties inside `useFrame`. Guard direct DOM mutations (`setAttribute`, `style`) against redundant identical writes.

---

## 2. Deterministic Resource Management & WebGL Lifecycles

Three.js is an imperative WebGL library wrapped by R3F. Unlike standard JavaScript objects, WebGL textures, geometries, and shader programs reside in GPU memory and **are not automatically garbage-collected**.

### Resource Disposal Standards:
- **Mandatory Disposal on Dynamic Allocations:** Every `THREE.BufferGeometry`, `THREE.Material`, or `THREE.Texture` instantiated dynamically in `useMemo` or factory functions must register an explicit cleanup effect:
  ```typescript
  useEffect(() => {
    return () => {
      customGeometry.dispose();
      customMaterial?.dispose();
    };
  }, [customGeometry, customMaterial]);
  ```
- **Narrow `useMemo` Dependencies:** Never include dynamic theme tokens, interaction colors, or opacities in `BufferGeometry` or `ShaderMaterial` `useMemo` dependency arrays. Doing so causes the GPU buffer to be destroyed and recompiled on every hover or theme change. Keep geometries and materials stable, and mutate properties/uniforms in a `useEffect` or `useFrame`.
- **Stable Shader Uniforms:** Never recreate the `uniforms` dictionary when tokens change. Store the uniforms object in a stable `useRef` or static `useMemo` once, and mutate `.value` properties in a targeted `useEffect`:
  ```typescript
  const uniformsRef = useRef({
    uColor: { value: new THREE.Color(color) },
    uAlpha: { value: alpha },
  });

  useEffect(() => {
    uniformsRef.current.uColor.value.set(color);
    uniformsRef.current.uAlpha.value = alpha;
  }, [color, alpha]);
  ```
- **Pre-Allocated BufferAttributes:** When using dynamic buffers with `BufferGeometry`, attach the `THREE.BufferAttribute` during initialization. Never conditionally instantiate `new THREE.BufferAttribute` inside render loops.

---

## 3. Store Subscription Granularity

Subscribing to broad state objects causes unnecessary React re-renders across the entire 3D scene hierarchy.

### Rules:
- **Atomic Selectors Only:** Never subscribe to entire store slices or root objects in canvas components:
  ```typescript
  // FORBIDDEN: Re-renders on ANY token change across the entire application
  const tokens = useThemeStore((state) => state.tokens);

  // MANDATORY: Re-renders only when this exact property changes
  const datumColor = useThemeStore((state) => state.tokens.datumPlaneColor);
  ```
- **Decouple Data Feeds from Canvas Renders:** If high-frequency coordinates or telemetry must be consumed in 3D, subscribe via store listeners (`store.subscribe()`) or store refs rather than driving the component via top-level React props.

---

## 4. React Three Fiber (R3F) Component Architecture

### Element Semantics & Instancing:
- **Valid Intrinsic Tags:** All R3F JSX elements map directly to Three.js classes in lowercase (e.g. `<line>` for `THREE.Line`, `<lineSegments>` for `THREE.LineSegments`, `<points>` for `THREE.Points`, `<mesh>` for `THREE.Mesh`). Never fabricate non-existent intrinsic tags (such as `<threeLine>`).
- **Instancing over Mass Meshes:** For rendering large numbers of entities (stars, coordinate ticks, reticle brackets, orbital markers), always use `THREE.InstancedMesh` or shared geometries and materials. Spawning individual `<mesh>` elements with their own geometries for hundreds of nodes creates massive draw-call overhead and GPU memory fragmentation.
- **Strict Event Typing:** Type all R3F pointer events explicitly using `ThreeEvent<MouseEvent>` or `ThreeEvent<PointerEvent>` from `@react-three/fiber`. Never cast events or controls to `any`. Narrow object types safely using the `in` operator.

---

## 5. Numerical Safety & Camera State Invariants

### Mathematical Resilience:
- **`NaN` & Infinity Guards:** Astronomical scales involve large exponents and dynamic distances. Always guard calculations:
  ```typescript
  // INSECURE: Returns NaN if value is NaN
  const clamped = Math.max(0.001, value);

  // SECURE:
  const safeValue = Number.isFinite(value) ? Math.max(0.001, value) : 0.001;
  ```
- **Zero Division Checks:** Guard against `radius === 0`, `semiMajorAxis === 0`, or `referenceDistance === 0` before computing scaling factors or ratios.
- **Camera State Restoration:** When components dynamically alter camera parameters (`camera.fov`, `camera.zoom`, `camera.near`), capture the initial camera state in refs and restore them cleanly upon unmount or feature deactivation:
  ```typescript
  useEffect(() => {
    if (!active && baseFovRef.current !== null && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = baseFovRef.current;
      camera.zoom = 1.0;
      camera.updateProjectionMatrix();
      baseFovRef.current = null;
    }
  }, [active, camera]);
  ```
- **Guarded Projection Updates:** Avoid calling `camera.updateProjectionMatrix()` on every frame; invoke it only when camera projection parameters have actually changed.
