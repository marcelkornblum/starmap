# Changelog

All notable changes to the Starmap project are documented in this file.

## [Unreleased]

### Changed
- **Architecture Remediation Track T06 (`Navigation Single Source of Truth`):**
  - **Router as Single Source of Truth (`AUD-080`, `AUD-081`, `AUD-084`, `DEC-R041`):** Cut over all spatial routing, selection, focus, layer, and camera targeting to TanStack Router search params and typed navigation; purged mirror state in `useUIStore`, `useCameraStore`, and `SpatialEntityStore`; deleted echo-guard boolean references across `SpatialViewport.tsx`, `GalaxyView.tsx`, and `SearchRoot.tsx`; and removed direct `window.location` / `history.replaceState` access from `SearchRoot` and `searchUrlSync`.
  - **Native Router Parameter Extraction & Navigation Cleanup (`AUD-082`, `AUD-083`, `AUD-088`, `AUD-089`):** Replaced regex pathname extractors across `SystemView.tsx`, `PlanetView.tsx`, `GalaxyView.tsx`, and Guide detail views with typed `useParams()` and `useSearch()`; removed global `document` anchor click interception and `starmap:locationchange` custom event; removed `simulateAsyncFetch` artificial delay; and removed obsolete URL regex helpers in `src/utils/url.ts`.
  - **Bounded Repository Caches & AbortSignal Propagation (`AUD-090`, `DEC-R043`):** Implemented LRU caching with bounded capacity and eviction in `detailsRepository.ts`, `layerRepository.ts`, and `searchRepository.ts`; configured central cache limits in `src/config/cacheConfig.ts`; and propagated `AbortSignal` across all asynchronous fetchers.
  - **Reactive Data Subscriptions & Render Purity (`AUD-085`, `AUD-086`, `AUD-087`, `DEC-R042`):** Replaced polling `setShardTick` counter hacks in `SystemView.tsx`, `PlanetView.tsx`, and `GalaxyView.tsx` with reactive `useEntityDetails` and `useSystemData` cache subscriptions; eliminated render-phase store mutations and `typeof window === 'undefined'` branches in `SearchRoot.tsx` and `SpatialShell.tsx`; and consolidated drawer authority under `useUIStore.activeDrawer`.
  - **URL Grammar Implementation & Canvas Single-Click Focus Decoupling (`AUD-091`, `AUD-093`, `DEC-R014a`–`DEC-R014l`):** Ratified and implemented unified URL grammar across all routes with single `?center=`, orthogonal `layer`/`select`/`focus`/`route` parameters, and validated `select` tokens; decoupled canvas single-click reticle activation from multi-entity selection in `SpatialViewport.tsx`; and validated all 14 Playwright E2E URL contracts in `e2e/url-contracts.spec.ts`.
- **Architecture Remediation Track T05 (`Runtime Data Purity`):**
  - **Reference Targets & Educational Baselines (`AUD-060`, `AUD-061`, `AUD-072`, `DEC-R033`):** Centralized standard educational benchmarks (Sol, Earth, Tau Ceti comparison exemplars) into typed `src/config/referenceTargets.ts`; eliminated literal celestial IDs and arbitrary SMA fallbacks (`1.0 AU`, `1.524 AU`) from `guideService.ts`, `journeyService.ts`, `CanvasLayer.tsx`, and `SystemScene.tsx`.
  - **Modular Guide Content Package (`AUD-071`, `DEC-R032`):** Decomposed 1,129-line monolithic `src/data/guideCatalog.ts` into strongly-typed modular packages under `src/content/guide/` (`types.ts`, `starTypes.ts`, `planetTypes.ts`, `hazardTypes.ts`, `metricTypes.ts`, `index.ts`), deleted the re-export shim, and added 1:1 unit tests in `src/content/guide/metricTypes.test.ts`.
  - **Unified Classification & Reticle Telemetry (`AUD-064`, `AUD-065`, `AUD-069`):** Removed runtime spectral string regex from `GalaxyScene.tsx`; unified four divergent planet/reticle classifiers into a single authoritative algorithm reading precalculated `entry.u` / `entry.k` / `entry.composition`; and eliminated string/index inference (`href.includes('planet')`, breadcrumb index matching) across `Breadcrumbs.tsx`, `GuideExamplesList.tsx`, `MetricComparativePanel.tsx`, and `PreviewPanel.tsx`.
  - **Structured Telemetry Purity & Decomposed Velocities (`AUD-066`, `AUD-067`, `AUD-068`, `DEC-R031`):** Constrained `StructuredQuantity.value` to `number | 'infinite' | 'instantaneous'`; decomposed Hohmann transfer velocities into distinct `departureVelocity` and `arrivalVelocity` fields; deleted `formatStructuredQuantity` from the service layer; eliminated prose substring slicing (`indexOf('habitable zone candidate')`) and string assembly in `hazardsAndComposition.ts`; replaced hex colours in `guideService.ts` with semantic CSS tokens (`var(--star-chromaticity-*)`); and populated typed `numericValue` and `unit` across comparison metric evaluations.
  - **Pure Data-Driven Hierarchy & Dynamic Satellites (`AUD-062`, `AUD-063`):** Replaced hardcoded `'sol'` string checks in `src/services/details/**` with data-driven parentage (`entry.k === 3`, `kind === 'moon'`, and precalculated `entry.o`); and removed hardcoded Luna orbit generation in `PlanetScene.tsx`, resolving natural satellites dynamically from `PlanetRecord.satellites` / detail records.
  - **Legacy Shim Pruning & Type Assertion Safety (`AUD-070`, `AUD-073`):** Deleted deprecated `collection:` filter token, legacy journey option aliases (`rel-1g`, `brach-1g`, etc.), and `src/views/GuideSectionNav.tsx`; and eliminated unchecked `as any` / `as unknown` casts on raw corpus and shard objects in search and journey services.
- **Architecture Remediation Track T04 (`Pipeline Reliability & Precalculation`):**
  - **Deterministic Data Pipeline & Build Epoch (`AUD-040`, `DEC-R028`):** Replaced wall-clock `new Date().toISOString()` across `scripts/pipeline/gaiaArtifactWriter.ts` and `src/utils/compactDataCodec.ts` with `resolveBuildTimestampIso` reading `SOURCE_DATE_EPOCH` or `data/seed/build-epoch.json`, and added `just data-refresh` / `npm run data:refresh` for explicit data acquisition refreshes.
  - **Hardened Source Acquisition & Shared CSV Parser (`AUD-041`, `AUD-049`):** Added request timeout (`AbortSignal.timeout`), exponential backoff retry, and non-zero exit on mandatory source failure to `scripts/fetch-sources.ts`; removed silent empty-array fallback in `scripts/sync-discoveries.ts`; and extracted quote-aware `scripts/pipeline/csvParser.ts`.
  - **Versioned Seed Catalogues & Alias Dictionaries (`AUD-042`, `AUD-043`, `DEC-R025`):** Extracted embedded TS catalogues (`iau-star-names.json`, `recons-10pc.json`, `name-exoworlds.json`, `aavso-variables.json`, `galactic-structures.json`, `solar-system-bodies.json`, `circumstellar-disks.json`, `system-aliases.json`, `constellations.json`, `build-epoch.json`) into `data/seed/*.json` with typed loader `scripts/pipeline/seedCatalogs.ts`.
  - **Measured Deep-Sky Distances & Canonical Binary Sectors (`AUD-044`, `AUD-047`, `DEC-R026`, `DEC-R027`):** Parsed real measured distances in `Cantat-Gaudin` (`dmode`/`plx`), `Harris` (`distKpc`), `ATNF` (`distKpc`), and `OpenNGC` (`Pax`) while dropping unmeasured 2D rows (deferring direction-only 3D projections to `FS-018`); deleted `.json` sector partitions, dead `buildCsvDataPipeline`, and legacy spaced-key shims while retaining `data/stars.json`.
  - **Modular Pipeline Decomposition (`AUD-050`):** Decomposed 3,944-line `scripts/build-data.ts` into 11 focused stage modules under `scripts/pipeline/*.ts` ($\le 300$ lines each) with an end-to-end synthetic gzipped GCNS fixture suite in `tests/dataPipeline.test.ts`.
  - **Versioned Wire Formats, Pure Codec & Precalculated Fields (`AUD-045`, `AUD-046`, `AUD-048`, `AUD-051`, `DEC-R029`):** Removed legacy 3-tuple `planetCompositionCounts`; added `v: 1` to the 28-byte `binarySectorCodec` header and all `compactDataCodec` JSON envelopes; moved domain rules to `src/utils/astroPrecalculation.ts`; added `decodeCompactSearchEntry`; and precalculated `SystemSummaryNode.classification`, `ExoplanetRecord.satellites` (from `solar-system-bodies.json`), and mandatory `reticleType` & `composition` across all entity records.
- **Architecture Remediation Track T03 (`Layering Cut`):**
  - **One-Directional Layer Hierarchy (`AUD-030`, `AUD-031`, `AUD-035`, `DEC-R012`, `DEC-R022`):** Extracted shared spatial types and frame constants (`src/types/spatial.ts`), search category types (`src/types/search.ts`), pure spatial maths (`src/utils/spatialMath.ts`), and pure Guide URL builders (`src/utils/url.ts`), eliminating all upward imports from `utils`, `data`, `services`, `stores`, `components/interface`, `components/search`, and `views` into `components/canvas`, `components/domain`, `data`, `services`, and `router`.
  - **Zero Import Cycles (`AUD-032`, `DEC-R022`):** Extracted `parseLayerQueryParam`, `extractUrlFocusSlug`, `extractUrlSystemSlug`, `extractUrlPlanetSlug`, and `hasExplicitFocusParam` into `src/utils/url.ts`; created `src/hooks/useSpaLocation.ts` (`useSpaLocation`, `registerAppRouter`, `appRouter` proxy); and extracted `src/components/canvas/scenes/GalacticCameraController.tsx`, reducing `G-imports-cycle` and `import(no-cycle)` to zero across the entire repository.
  - **Three.js Decoupling from Services (`AUD-033`):** Moved `createDefaultSectorGeometry` and `createSceneSectorPointsFactory` from `src/services/sectorStreamingService.ts` into `src/components/canvas/entity/sectorPointCloudGeometry.ts`, removing `three` from `src/services/**`.
  - **Serialisable Stage Store (`AUD-034`):** Removed `CanvasLayerProps` import and callback functions from `useCanvasStageStore` state (`CanvasStageData`), isolating `onInspect`/`onSelect` in module-level callback accessors (`setStageCallbacks` / `getStageCallbacks`).
  - **Prototype Showcase Isolation & Math Deduplication (`AUD-036`, `AUD-037`, `DEC-R023`):** Deleted duplicate `PaletteShowcaseScene` from `src/components/canvas/scenes/`, relocated `PaletteShowcase` from `src/components/prototypes/` to `src/prototypes/PaletteShowcase/`, deleted the `src/components/canvas/math/astronomy.ts` shim, unified `QUADRANTS` in `src/utils/spatialMath.ts`, and replaced inline Euclidean distance formulas in `searchService.ts` with `computeEuclideanDistance3D`.

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
