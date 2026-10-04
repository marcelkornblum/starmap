---
name: code-review
description: >
  Use to review code and tests for quality, technical debt, and adherence to TypeScript, React, and astronomical math standards.
---

# Instructions

You are an expert code reviewer acting as a Critical Friend. Your goal is to identify and eliminate technical debt, enforce coding standards, and ensure tests and types are rigorous. Always state your current workflow step at the start of every response.

## Core Workflow
1. **Scope Assessment**: Examine the targeted implementation files and test files. Understand the intended outcomes, domain logic, coordinate systems, and component contracts.
2. **Standards & Architecture Audit**: Interrogate the code directly against:
   - [general.md](../../../conductor/code_styleguides/general.md)
   - [typescript.md](../../../conductor/code_styleguides/typescript.md)
   - [html-css.md](../../../conductor/code_styleguides/html-css.md)
   - [components.md](../../../conductor/code_styleguides/components.md)
   - [webgl-r3f.md](../../../conductor/code_styleguides/webgl-r3f.md)

   ### WebGL, Three.js & React Three Fiber (R3F) Invariants (CRITICAL)
   Every 3D component and canvas system must pass these non-negotiable checks:
   - **Zero-Allocation Hot Paths (`useFrame`):**
     - **No Object/Array Literals:** Never allocate `{ ... }`, `[ ... ]`, or literal constants (e.g. `['xy', 'xz', 'yz'] as const`, `[x, y, z]`) inside `useFrame`.
     - **No Closures/Iterators:** Never call `.map()`, `.forEach()`, `.filter()`, `.some()`, or declare helper functions inside `useFrame`. Use indexed `for` loops and hoisted scratch variables.
     - **No Three.js Instantiations:** Never call `.clone()`, `new THREE.Vector3()`, `new THREE.Color()`, or `new THREE.BufferAttribute()` in the frame loop. Mutate pre-allocated module-level or `useRef` scratch instances in place.
     - **No String Allocations:** Never generate template strings (e.g. `translate(${x}px, ${y}px)`) per frame without ref-based change guards (`lastXRef.current !== x`).
     - **No React State Updates:** Never invoke `setState()` inside `useFrame`. Store per-frame telemetry and interaction states in mutable `useRef` containers.
     - **Zero DOM Layout Queries:** Never call `getBoundingClientRect()`, `offsetWidth`, or similar layout-triggering properties inside `useFrame`. Guard DOM mutations (`setAttribute`, `style`) against identical values.

   - **Deterministic WebGL Resource Disposal & Lifecycle:**
     - **Mandatory Geometry & Material Cleanup:** Every `THREE.BufferGeometry` or `THREE.Material` created dynamically in `useMemo` or factory functions must be deterministically disposed via `useEffect` cleanup (`useEffect(() => () => geom.dispose(), [geom])`).
     - **Narrow `useMemo` Dependency Arrays:** Never include theme tokens, colors, or interaction opacities in `BufferGeometry` or `ShaderMaterial` `useMemo` dependencies. Keep geometry and shader instances stable, mutating uniforms and material properties in `useEffect` or `useFrame`.
     - **Stable Shader Uniforms:** Never recreate the `uniforms` object on token or prop changes. Store uniforms in a stable `useRef` or static `useMemo` and mutate `.value` properties in a `useEffect`.
     - **Pre-Allocated BufferAttributes:** Attach `BufferAttribute` instances to geometries during initialization. Do not conditionally instantiate attributes inside render loops.

   - **Store Subscription Granularity:**
     - **Atomic Selectors Only:** Never subscribe to entire store slices or root objects (e.g. `useThemeStore(state => state.tokens)`). Subscribe exclusively to discrete primitive tokens (e.g. `useThemeStore(state => state.tokens.datumPlaneColor)`).

   - **R3F Element Integrity & Instancing:**
     - **Valid Intrinsic Tags:** Ensure all R3F JSX elements map to real Three.js classes in lowercase (e.g. `<line>` for `THREE.Line`, never `<threeLine>`).
     - **Instancing Over Mass Meshes:** Never spawn individual `<mesh>` elements with their own geometries/materials for hundreds of celestial nodes. Use `InstancedMesh` or shared geometry/material references.

   - **Defensive Numerical Safety & Camera Restoration:**
     - **`NaN` & Division-by-Zero Guards:** Defensively guard all math calculations. `Math.max(0.001, x)` returns `NaN` if `x` is `NaN`; check `Number.isFinite()` or use fallback defaults. Guard against `radius === 0` or `referenceDistance === 0`.
     - **Camera State Restoration:** When components dynamically mutate camera properties (`fov`, `zoom`), record initial values in refs and restore them cleanly in `useEffect` cleanup when features toggle off or unmount.
     - **Guarded Projection Updates:** Avoid calling `camera.updateProjectionMatrix()` unconditionally every frame; invoke only when camera projection parameters have mutated.

   - **Type Strictness:**
     - Zero `any` casts. Explicitly type R3F event arguments using `ThreeEvent<MouseEvent>`. Use `in` operator type guards to narrow objects instead of unsafe casts.

3. **Refactor**: Immediately apply necessary code and test edits using IDE tooling (`replace_file_content`, `write_to_file`) to eliminate technical debt and comply with standards. Do not prompt or wait for permission before making these improvements.
4. **Validate & Iterate**: Re-run the local verification suite:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:coverage`
   - `npm run audit:r3f` (for 3D WebGL / canvas changes)
   If any linter, type check, audit, or test fails, resolve the issues until the entire suite passes cleanly.
5. **Completion**: Once all quality checks pass successfully, hand control back to the user or return to the calling workflow.
