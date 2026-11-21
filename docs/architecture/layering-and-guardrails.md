# Layering and Guardrails Architecture Specification

This document provides the authoritative architectural specification for Starmap's strict one-directional module layering, architectural boundary rules, import cycle prevention, and permanent automated CI guard suite.

---

## 1. Strict One-Directional Module Layer Hierarchy

To guarantee modularity, prevent tight coupling, and eliminate circular dependencies, Starmap enforces a strict one-directional dependency rank hierarchy across the entire `src/` codebase.

Modules at rank $N$ may only import from modules at rank $\le N$. Upward imports (where a lower-rank layer imports from a higher-rank layer) are strictly forbidden and enforced as errors by `oxlint` (`no-restricted-imports` in [`.oxlintrc.json`](../../.oxlintrc.json)).

```mermaid
flowchart TD
    L0["Rank 0: types\n(src/types)"]
    L1["Rank 1: config & utils\n(src/config, src/utils)"]
    L2["Rank 2: data & content\n(src/data, src/content)"]
    L3["Rank 3: services\n(src/services)"]
    L4["Rank 4: stores\n(src/stores)"]
    L5["Rank 5: hooks\n(src/hooks)"]
    L6["Rank 6: components/interface\n(src/components/interface)"]
    L7["Rank 7: components/canvas\n(src/components/canvas)"]
    L8["Rank 8: components/domain\n(src/components/domain)"]
    L9["Rank 9: views\n(src/views)"]
    L10["Rank 10: router & main\n(src/router, src/App.tsx, src/main.tsx)"]

    L0 --> L1 --> L2 --> L3 --> L4 --> L5 --> L6 --> L7 --> L8 --> L9 --> L10
```

### 1.1 Layer Rank Table & Responsibilities

| Rank | Layer Directory | Core Responsibility | Dependency Constraints |
| :---: | :--- | :--- | :--- |
| **0** | `src/types/` | Pure TypeScript type definitions and interfaces. | Zero runtime imports. Pure types only. |
| **1** | `src/config/`<br/>`src/utils/` | Configuration constants, math utilities, coordinate math, binary/compact codecs. | May import Rank 0 and Rank 1. Zero side-effects. |
| **2** | `src/data/`<br/>`src/content/` | Repositories, LRU caches, seed data, and Guide editorial modules. | May import Ranks 0–2. |
| **3** | `src/services/` | Search engines, transit calculation algorithms, and astronomical algorithms. | May import Ranks 0–3. |
| **4** | `src/stores/` | Zustand state stores (`useUIStore`, `useCameraStore`, etc.). | May import Ranks 0–4. |
| **5** | `src/hooks/` | Reusable React hooks, location adapters, and reactive store bindings. | May import Ranks 0–5. |
| **6** | `src/components/interface/` | Tier 1 Primitives (`Button`, `Stack`, `Datum`) and Tier 2 Surfaces (`Card`, `Panel`). | May import Ranks 0–1, 5. **Forbidden from importing `data`, `content`, `services`, or `stores`**. |
| **7** | `src/components/canvas/` | 3D WebGL cartography, materials, reticles, markers, and R3F components. | May import Ranks 0–6. |
| **8** | `src/components/domain/` | Application assemblies (`Search`, `DetailsPanel`, `BodiesPanel`, `DirectionsPanel`). | May import Ranks 0–7. |
| **9** | `src/views/` | Top-level routed views (`GalaxyView`, `SystemView`, `PlanetView`, `SearchView`). | May import Ranks 0–8. |
| **10** | `src/router/`<br/>`src/App.tsx`<br/>`src/main.tsx` | Route definitions, root layouts, and application bootstrap. | Top of hierarchy. May import all production layers. |

### 1.2 Interface Primitive Purity (`Rank 6`)
Tier 1 and Tier 2 interface primitives in `src/components/interface/` must remain pure, reusable design-system assets with zero knowledge of astronomical business logic. `.oxlintrc.json` enforces an explicit rule:
- **`components/interface` cannot import from `data`, `content`, `services`, `stores`, `three`, or `@react-three/*`**.
Any attempt by a primitive to bind directly to a repository, global store, or WebGL engine fails `npm run lint`. For component design rules, see [Component Architecture](../../conductor/code_styleguides/components.md).

### 1.3 Zero Import Cycles, Strict Typing, Three.js Isolation & File Size Ceiling (`.oxlintrc.json`)
Circular dependencies (`A -> B -> A` or deep transitive loops) create initialisation order bugs and break bundler tree-shaking. `.oxlintrc.json` enforces:
- **`import/no-cycle: "error"`:** Ensures the entire codebase contains **zero** import cycles.
- **`max-lines: "error"`:** Enforces a 300-line ceiling (skipping blank lines and comments) across production source files, exempting tests, stories, `scripts/`, `e2e/`, `tests/`, and `content/`.
- **`typescript/no-explicit-any: "error"`:** Forbids explicit `any` across all production, test, story, script, and E2E files.
- **`typescript/no-non-null-assertion: "error"`:** Forbids non-null assertions (`!`) in production `src/` files (disabled in test/story/script overrides).
- **Three.js / R3F Isolation:** Forbids importing `@react-three/*` in `src/types/**` (type-only `three` imports remain permitted in `src/types/spatial.ts`), and forbids importing `three`, `three/*`, and `@react-three/*` across `src/config/**`, `src/data/**`, `src/content/**`, `src/services/**`, production `src/stores/**`, `src/hooks/**`, and `src/components/interface/**` (`src/utils/**` remains the sanctioned colour-token bridge).
- **Zero Lint Warnings:** `npm run lint` executes `oxlint --deny-warnings`.

---

## 2. Permanent Automated CI Guard Suite

Each static analysis tool owns a distinct, non-overlapping concern and is run once via the unified `npm run check` gate:

```
npm run check         ──► Single-pass gate: lint -> typecheck -> audit:guards -> audit:ui -> audit:r3f -> audit:budgets
npm run lint          ──► Oxlint (Layering, Import Cycles, 300-Line Ceiling, React Hooks, Strict Types)
npm run typecheck     ──► TypeScript Project References (tsc -b)
npm run audit:guards  ──► Domain Literal Guard (G-literals) & Structural Guards (history SSOT, globalThis, deprecated, pipeline clock, Vitest env)
npm run audit:ui      ──► Design System, Component Quads, Primitive Purity, CUBE CSS, Zero Inline Styles
npm run audit:r3f     ──► 60fps R3F Audits (Single Canvas Host, useFrame, Atomic Selectors, On-Demand Frameloop, Resource Disposal, Raycast)
npm run audit:budgets ──► Suppression Ratchet & Data Manifest / Shard Size Budgets (scripts/guards/budgets.json)
npm run audit:bundle  ──► Built Entry JS/CSS Gzip Budgets & Lazy 3D Chunk Isolation (runs post-build)
```

### 2.1 Domain Literal & Structural Guards (`scripts/audit-guards.ts`)
`audit:guards` enforces **`G-literals` (Zero Hardcoded Celestial Entities)** alongside structural invariants across runtime, pipeline, and test code:
- Scans TypeScript ASTs in `src/` (excluding tests and stories) to verify that celestial entity IDs, names, and classifications are not hardcoded into runtime code. All entities must be read from precalculated data pipeline shards.
- Flags suspicious non-zero numeric fallbacks (`?? <num>`, `|| <num>`) on astronomical telemetry in `src/services/`, `src/components/canvas/`, and `src/views/`.
- **`no-global-this-mutation`:** Forbids mutating properties on `globalThis` in production `src/` files (direct/bracket/casted assignments, `Object.defineProperty(globalThis, ...)`, and `Reflect.set(globalThis, ...)`), while permitting read-only property access.
- **`no-direct-history-mutation`:** Enforces router SSOT by forbidding direct `history.pushState`, `history.replaceState`, `location.assign`, `location.replace`, and `location.href = ...` mutations in production `src/` files outside `src/hooks/spaNavigation.ts`.
- **`no-deprecated-shims`:** Forbids `@deprecated` JSDoc/comment shims in production `src/` files so renames and cutovers stay complete.
- **`no-wall-clock-in-pipeline`:** Scans `scripts/pipeline/**/*.ts` (excluding `*.test.ts`) and forbids non-deterministic 0-argument `new Date()` and `Date.now()` calls (1-argument `new Date(epochMs)` / `new Date(isoString)` remains permitted).
- **`no-vitest-environment-pragma`:** Scans `src/**/*.test.{ts,tsx}` and `tests/**/*.test.{ts,tsx}` and forbids `@vitest-environment` pragmas, enforcing the split `.test.ts` (Node) vs `.test.tsx` (jsdom) Vitest project boundary (`DEC-R055`).
- Fails closed on parse errors or unexpected exceptions.

### 2.2 Design System Guard Suite (`scripts/audit-ui.ts`)
Enforces strict design system standards across `src/components/` and `src/views/` (see [HTML & CSS Style Guide](../../conductor/code_styleguides/html-css.md)):
- **`missing-component-quad`:** Every component in `interface/` and `domain/` must have all 4 quad files: `<Component>.tsx`, `<Component>.module.css`, `<Component>.stories.tsx`, and `<Component>.test.tsx`.
- **`forbidden-primitive-escape-hatch`:** Inspects `*Props` interfaces and type aliases in `src/components/interface/**/*.tsx` production files and forbids `className` or `style` escape-hatch properties.
- **`forbidden-raw-element`:** Disallows raw HTML controls (`<button>`, `<input>`, `<select>`) or telemetry lists (`<dl>`, `<ul>`, `<ol>`); domain views must compose Tier 1 primitives.
- **`forbidden-dynamic-classname`:** Disallows dynamic `className` concatenation; state and variant styling must consume HTML `data-*` attributes.
- **`forbidden-inline-style`:** Zero `style={{ ... }}` attributes; all styling lives in scoped CSS Modules.
- **`forbidden-rendertostring`:** Disallows `renderToString` in unit tests; all tests must render via `@testing-library/react` in `jsdom`.
- **`missing-layer-blocks`:** Component stylesheets must declare `@layer blocks` and `@layer exceptions`.
- **`forbidden-outer-margin`:** Components must never declare outer `margin` or self-layout. Layout rhythm is owned by layout primitives (`<Stack>`, `<Cluster>`, `<Grid>`).
- **`hardcoded-hex-color` & `hardcoded-css-token`:** Disallows literal hex codes (`#ffffff`) or pixel values; all CSS must consume semantic tokens (`var(--token)`).

### 2.3 WebGL & Frame-Loop Guard Suite (`scripts/audit-r3f.ts`)
Enforces 60fps WebGL execution guardrails across `src/components/canvas/`, `src/components/domain/`, `src/hooks/`, `src/views/`, and `src/router/` (see [WebGL, Three.js & R3F Style Guide](../../conductor/code_styleguides/webgl-r3f.md)):
- **`single-canvas-host`:** Flags any production `src/` `<Canvas>` instantiation outside the 3 sanctioned hosts (`src/components/domain/CanvasLayer/CanvasWebGLHost.tsx`, `src/components/canvas/scenes/StandaloneSceneShell.tsx`, `src/components/canvas/scenes/InteractiveNavigator.tsx`).
- **`no-alloc-in-use-frame`, `no-layout-in-use-frame`, `no-setstate-in-use-frame`:** Flags object/array/closure allocations, DOM layout measurements, and React state setters inside `useFrame` callbacks.
- **`atomic-store-selectors`:** Flags whole-store, identity, object-literal, or broad `state.tokens` Zustand subscriptions across canvas, domain, hook, and view files.
- **`require-demand-frameloop`:** Flags any production `<Canvas>` missing an explicit `frameloop` attribute or specifying `frameloop="always"`.
- **`require-resource-dispose`:** Flags `useMemo` GPU resource allocations (`*Geometry`, `*Material`, `*Texture`, `WebGLRenderTarget`) in `src/components/canvas/` production files lacking a `.dispose()` cleanup call.
- **`require-noop-raycast`:** Flags decorative `<mesh>`, `<lineSegments>`, and `new Line2(...)` instances in `src/components/canvas/` without pointer handlers or `NOOP_RAYCAST`.
- **`no-inline-jsx-geometry`, `no-material-memo-color-deps`, `valid-r3f-intrinsics`:** Flags inline JSX geometry instantiations, colour/opacity material recreation dependencies, and invalid R3F intrinsic tags.

### 2.4 Suppression Ratchet, Data Manifest & Bundle Budgets (`scripts/audit-budgets.ts`)
Configured via [`scripts/guards/budgets.json`](../../scripts/guards/budgets.json):
- **`audit:budgets` (Offline, part of `npm run check`):**
  - **Suppression Ratchet:** Scans non-test, non-story `.ts`, `.tsx`, and `.css` files under `src/` and enforces strict ceilings for `guard-disable`, `r3f-audit-disable`, `ui-audit-disable`, `eslint-disable`, `oxlint-disable`, and `@ts-ignore`/`@ts-expect-error`, failing with exact `file:line` locations if any ceiling is exceeded.
  - **Data Manifest & Shard Budgets:** Validates `public/data/manifest.json`, ensures every referenced shard exists on disk, forbids orphan files under `public/data/` outside `allowedNonManifestFiles` (`[".gitkeep", "README.md"]`), and enforces `maxTotalBytes` (`40 MiB`) and `maxStartupSearchBytes` (`1.5 MiB` for `search/startup`).
- **`audit:bundle` (`--bundle`, post-`npm run build` in CI):**
  - Resolves entry JS and CSS assets from `dist/index.html` (supporting `/` and `/starmap/` base paths), verifies gzipped entry sizes remain within `maxEntryJsGzipBytes` (`30 KiB`) and `maxEntryCssGzipBytes` (`20 KiB`), and asserts neither `dist/index.html` (including `<link rel="modulepreload">`) nor static ESM imports/re-exports in the entry JS chunk reference lazy 3D chunks (`vendor-three`, `vendor-r3f`).

---

## 3. Zero-Tolerance Policy, Justified Suppressions & Coverage Floor

All static analysis suites operate with zero-tolerance, fail-closed enforcement (no baseline grandfathering):

1. **Zero Influx:** Any violation across `oxlint`, `tsc`, `audit:guards`, `audit:ui`, `audit:r3f`, or `audit:budgets` immediately fails `npm run check` and CI.
2. **Justified Suppressions Only:** Inline suppressions (`// guard-disable-next-line <rule> -- <reason>`, `/* ui-audit-disable-next-line <rule> -- <reason> */`, or `// r3f-audit-disable-next-line <rule> -- <reason>`) require an explicit technical justification after `-- <reason>`. Unreasoned suppression comments are flagged as errors, and total suppression counts across `src/` are capped by `scripts/guards/budgets.json`.
3. **Ratcheted Unit Coverage Floor (`vite.config.ts`):** `npm run test:coverage` enforces minimum coverage thresholds of `88%` lines, `86%` statements, `76%` branches, and `88%` functions across `src/**/*.{ts,tsx}`.

---

## 4. End-to-End Visual and Performance Baselines

In addition to static AST audits, Playwright executes automated contracts against the built application:

- **URL Contracts (`e2e/url-contracts.spec.ts`):** Validates that all canonical deep-links, guide slugs, and orthogonal search query parameters resolve deterministically.
- **Frame-Time & Draw-Call Baseline (`e2e/frame-time-baseline.spec.ts`):** Measures real-world 60fps rendering performance under continuous camera orbit and zoom operations, ensuring frame times remain within the 16.6ms budget (`scripts/guards/frame-time-baseline.json`). In dev builds (`import.meta.env.DEV`), `AdaptiveQualityMonitor` publishes WebGL draw-call counts (`gl.info.render.calls`) to `canvas[data-gl-draw-calls]` only when the count changes, allowing `e2e/frame-time-baseline.spec.ts` to record `maxDrawCalls` and enforce calibrated draw-call ceilings when present in `scripts/guards/frame-time-baseline.json`.
