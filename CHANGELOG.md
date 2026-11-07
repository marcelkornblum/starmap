# Changelog

All notable changes to the Starmap project are documented in this file.

## [Unreleased]

### Fixed
- **Architecture Remediation Track T02 (`User-Visible Correctness`):**
  - **Metric Comparison Telemetry (`AUD-020`, `DEC-R018`):** Purged fabricated Tau Ceti / Tau Ceti e fallback numbers from `resolveMetricComparison`; uncatalogued targets now render concise `'—'` placeholders (`isCatalogued: false`), and `MetricDetailView` asynchronously hydrates search and detail shards on cold load.
  - **PlanarGrid WebGL Geometry Lifecycle (`AUD-021`):** Extracted memoised `<PlanarFootprintItem />` in `PlanarGrid.tsx` using `useMemo` and `useEffect` cleanup (`geom.dispose()`), eliminating per-render `BufferGeometry` leaks.
  - **Router Search Validation (`AUD-022`):** Removed unvalidated `...search` spread and `[key: string]: unknown` index signature in `src/router/index.tsx`; added `parseFiniteNumber` rejecting `NaN`/`Infinity` and non-numeric strings.
  - **Summary Node Codec Round-Trip (`AUD-023`):** Made `encodeSummaryNode` / `decodeSummaryNode` lossless for `properName` across both Gaia and non-Gaia IDs.
  - **SystemScene Inferred Orbits & Confidence Marking (`AUD-024`, `DEC-R019`):** Extracted `resolveSystemPlanetEntity` and `resolveCorpusPlanetEntity` respecting `entry.A` and `entry.u`, deriving missing `semiMajorAxis` from `periodDays` via Kepler's Third Law ($a = ((P/365.25)^2 \cdot M_\star)^{1/3}$), and marking inferred orbits with `lineStyle: 'dotted'` in 3D and `<ConfidencePip confidence="theoretical" />` in `DetailsPlanetTelemetrySection`.
  - **Multi-Value Guide Routes & System Expansion (`AUD-092`, `DEC-R014k`, `DEC-R020`):** Added plural Guide resolvers supporting comma- and `+`-delimited slugs across all 4 Guide detail views (`StarTypeDetailView`, `PlanetTypeDetailView`, `HazardDetailView`, `MetricDetailView`), preserved `?focus=` context and return links, and expanded multi-star/multi-planet systems into stacked target comparison cards in `<MetricComparativePanel />`.

### Added
- **Architecture Remediation Track T01 (`Guardrails & Safety Net`):**
  - Unified `npm run audit:guards` runner combining `oxlint` with AST-level literal (`G-literals`), layer-boundary and import-cycle (`G-imports`), legacy shim (`G-shims`), canvas count (`G-canvas`), file-line ceiling (`G-size`), UI design system (`G-ui`), and R3F memory/render checks (`G-r3f`).
  - Downward-only baseline ratchet (`scripts/guards/baseline.json`) preventing regression or addition of architectural debt.
  - Expanded `audit:ui` and `audit:r3f` linters backed by 67 colocated unit tests covering component file quads, design-token literals, atomic Zustand selectors, inline JSX geometries, and material memo dependencies.
  - Pinned all `"latest"` dependencies in `package.json` to exact semver versions (`@chromatic-com/storybook`, `@playwright/test`).
  - Unified Vitest configuration and coverage-comment thresholds to a single source of truth in `scripts/coverage-comment.ts`.
  - Explicit TypeScript `strict: true` enforcement and added `scripts/**/*.ts` to the typechecked project scope (`tsconfig.node.json`).
  - Playwright URL-contract test suite (`e2e/url-contracts.spec.ts`) validating deep links, navigation state, back/forward history, and query parameter contracts.
  - 3D frame-time baseline regression gate (`e2e/frame-time-baseline.spec.ts`) establishing p95 and max frame duration thresholds across target viewports.

## [Data Pipeline] - 2026-09-30

### Added
- **Streaming ETL Pipeline (`scripts/build-data.ts`):**
  - High-throughput Node.js streaming parser leveraging `csv-parser` to ingest 119k+ row `data/hygdata_v3.csv` without memory bottlenecks.
  - Harmonizes raw catalog columns into strict `StarmapNode` entities with hierarchical name resolution and coordinate pre-calculation.
  - Outputs minified static JSON (`public/data/stars.json`) in 2.2 seconds.
- **Build & CI Automation:**
  - Added `npm run build:data` script via `tsx`.
  - Wired automated data generation into Vite build and GitHub Actions CI workflow.
  - Comprehensive unit and integration test suite in `tests/dataPipeline.test.ts`.

## [Astro Math Core] - 2026-09-30

### Added
- **Coordinate Transformations (`src/utils/astroMath.ts`):**
  - `equatorialToCartesian(ra, dec, dist, target?, offset?)`: Converts celestial Equatorial coordinates (Right Ascension in hours, Declination in degrees, Distance in parsecs) to Cartesian `[x, y, z]` space in parsecs with support for in-place buffer mutation.
  - `rotateToOrbitalPlane(buffer, inclination, ascendingNode, options?)`: Bulk transformation utility reorienting interleaved `Float32Array` coordinates to arbitrary orbital planes with zero heap allocations during vertex processing.
  - Astronomical angle conversion constants (`HOURS_TO_RADIANS`, `DEG_TO_RADIANS`, `RADIANS_TO_DEG`).
- **Astronomical Types (`src/types/astro.ts`):**
  - `StarmapNode` interface representing stars and celestial objects.
  - Coordinate types (`CartesianTuple`, `CartesianCoordinates`, `EquatorialCoordinates`, `OrbitalPlaneOrientation`).
  - `BulkCoordinateBuffer` (`Float32Array`) for high-throughput WebGL vertex structures.
- **Test Infrastructure & Fixtures:**
  - Installed and configured Vitest with v8 code coverage provider.
  - Created `tests/fixtures/stars.fixture.json` containing 6 control group stars extracted from `data/hygdata_v3.csv`.
  - Comprehensive unit test suites in `tests/astroMath.test.ts` and `tests/types.test.ts` achieving 100% test coverage across all mathematical routines.
