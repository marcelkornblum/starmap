# Technology Stack

## Core Architecture
- **Framework:** React 19.3 (via Vite 8.3)
- **Language:** TypeScript ~7.0 (Strict Mode)
- **Architecture:** Single Page Application (SPA) with single persistent WebGL canvas and route-based views.

## 3D and Rendering
- **Engine:** Three.js 0.187
- **React Abstraction:** React Three Fiber (R3F) 9.8
- **Helpers:** `@react-three/drei` 10.7 for 3D utilities and camera controls.
- **Canvas Lifecycle:** Single persistent WebGL `<Canvas>` mounted in `RootCanvasHost` (`RootLayout`), declarative `<CanvasLayer>` stage slots (`useCanvasStageStore`), zero-allocation 60fps frame loops, and direct scene swapping.

## Routing and State
- **Routing:** TanStack Router 1.170 — Single Source of Truth (`DEC-R041`) for navigation and selection state, with orthogonal URL grammar (`?center=`, `?select=`, `?focus=`, `?route=`, `?layer=`, `?q=`, `?searchCategory=`), RFC 3986 `:`, `,` search preservation (`stringifyStarmapSearch`), and multi-value `/guide/*` slugs (`DEC-R014a`–`l`).
- **State Management:** Zustand 5.0 — Lightweight ephemeral state stores (`useUIStore`, `useCameraStore`, `useCanvasStageStore`, `useSettingsStore`, `SpatialEntityStore`).

## Styling and UI System
- **Styling:** Modular CSS with CSS Modules and CUBE methodology (`@layer reset, tokens, composition, blocks, exceptions, utilities;`).
- **Design Tokens:** 3-tier token pipeline (Literal, Semantic, Component Local Token Interface) utilizing Solarized palette in OKLCH colour space.
- **Interface Primitives:** Tier 1 Interface Primitives (`<Datum>`, `<DataTable>`, `<Quantity>`, `<Unit>`, `<Badge>`, `<Button>`, `<Input>`, `<Select>`, `<Toggle>`, `<Slider>`, `<Stack>`, `<Cluster>`, `<DetentSheet>`) with strict zero-`className` and zero-`style` passthrough (`DEC-R050`).
- **Component File Quads:** Mandatory 4-file component quad (`.tsx`, `.module.css`, `.stories.tsx`, `.test.tsx`) for all components in `interface/` and `domain/`.
- **Component Workbench:** Storybook 10.6 for isolated component prototyping and visual testing.

## Data and Content
- **Data Shards:** 28-byte binary sector shards (`public/data/sectors/*.bin`, `binarySectorCodec.ts`) for zero-copy WebGL buffer uploads, plus compact JSON shards (`compactDataCodec.ts`, `datasetLayerCodec.ts`) with modulo-36 FNV-1a distribution.
- **Reference Catalog:** `public/data/stars.json` retained strictly as an external reference dataset (`DEC-R027`); never loaded at runtime by the client application.
- **Data Pipeline:** Deterministic offline streaming pipeline (`scripts/build-data.ts` + 11 modular `scripts/pipeline/*.ts` stages) with fixed build epochs (`data/seed/build-epoch.json`, `SOURCE_DATE_EPOCH`) and hardened source fetching (`scripts/fetch-sources.ts`).
- **Editorial Content:** Strongly typed TypeScript Guide content modules in `src/content/guide/` (`DEC-R032`; MDX is deferred to the Reference Engine track).

## Quality, Linting & AST Guard Suite
- **Linter:** Oxlint 1.93 for fast, type-aware linting.
- **Custom AST Guard Suite:**
  - `npm run audit:guards`: AST layer rank enforcement, prototypes isolation, cycle detection (`G-imports-cycle`), file size caps, and zero hardcoded celestial entity literals (`G-literals`).
  - `npm run audit:ui`: Component file quad completeness, forbidden raw HTML controls, forbidden dynamic className concatenation, forbidden inline styles, and CSS token discipline.
  - `npm run audit:r3f`: 60fps Three.js frame-loop allocation audit and store subscription checks.
- **Baseline Management:** Shrink-only baseline (`scripts/guards/baseline.json`) preventing technical debt influx.

## Testing & Automation
- **Test Runner:** Vitest 5.0 with split configuration:
  - `unit:node` project for pure logic, algorithms, codecs, and data scripts (`**/*.test.ts`).
  - `unit:dom` project with `jsdom` and `@testing-library/react` for UI components, hooks, and views (`**/*.test.tsx`).
- **3D Unit Testing:** `@react-three/test-renderer` 9.1 for headless 3D scene-graph assertions without WebGL/GPU mocks.
- **Coverage Provider:** `@vitest/coverage-v8` 5.0 (V8 AST code coverage analysis).
- **End-to-End Testing & Screenshots:** Playwright 1.65 for URL contracts (`e2e/url-contracts.spec.ts`), frame-time baseline contracts (`e2e/frame-time-baseline.spec.ts`), and 5-viewport screenshot captures (`capture:views`).

## Build and CI/CD
- **Build Tool:** Vite 8.3
- **Runner:** `tsx` for pipeline scripts, test runners, and guard executions.
- **CI Pipeline:** GitHub Actions running lint, typecheck, guard suite, split unit tests with coverage, and Playwright E2E suites.
