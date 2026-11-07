# Findings Ledger (`architecture-remediation`)

Source: 2026-11-06 audit of `main` @ `4c45916`. Every finding below has been verified against source; claims that failed verification were excluded.

**Status lifecycle:** `open → in-progress → claimed → verified | reopened`. Implementers may set `claimed` only. Only the end-of-track audit may set `verified` (DEC-R008).

**Guard keys** (installed by T01, ratcheting shrink-only baselines):
`G-imports` layer-boundary and cycle check · `G-literals` hardcoded entity IDs/names/telemetry literals in runtime code · `G-shims` legacy alias tokens · `G-canvas` production `<Canvas>` count · `G-r3f` extended R3F audit · `G-ui` extended UI audit (per-file quads, px/rem/rgba/ms tokens, raw lists) · `G-lint` lint warning count · `G-size` per-file line ceiling.

---

## T01 · Guardrails & Safety Net

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-001 | `audit-ui` quad check only inspects `<Folder>/<Folder>.tsx`; sibling components are invisible | `scripts/audit-ui.ts#L92-L98` | Test fixture with a sibling component missing a quad fails `audit:ui` | in_progress |
| AUD-002 | `audit-ui` token check matches hex only; inline-style dirs exclude `canvas/`, `prototypes/`; `renderToString` dirs exclude `tests/` | `scripts/audit-ui.ts#L18-L20` | Fixtures with px/rem/rgba/ms literals and `renderToString` in `tests/` fail `audit:ui` | in_progress |
| AUD-003 | `audit-r3f` whole-store check only flags `.tokens`; layout-read rule only matches method-call names, so property reads such as `ref.current.offsetWidth` pass; no checks for inline geometry in JSX or colour/opacity in material `useMemo` deps; `audit-r3f` has no tests | `scripts/audit-r3f.ts#L17`, `#L273`; no `tests/*` import | Fixtures for each pattern fail `audit:r3f`; colocated test file exists | in_progress |
| AUD-004 | 106 lint warnings; CI does not fail on warnings | `.github/workflows/ci.yml#L33` | `G-lint` baseline in CI; count can only fall | in_progress |
| AUD-005 | `"latest"` specifiers for `playwright`, `@chromatic-com/storybook` | `package.json#L39`, `#L56` | No `"latest"` in `package.json` | in_progress |
| AUD-006 | Coverage comment ratchet (64/58/70/65) misaligned with vitest thresholds (78/70/78/78) and never fails | `scripts/coverage-comment.ts#L191` | Single threshold source; step fails on regression | in_progress |
| AUD-007 | Storybook test project and data pipeline never exercised in CI | `vite.config.ts#L80` | CI job(s) per T01 decision | in_progress |
| AUD-008 | `strict` relies on TS 7 default; `scripts/audit-r3f.ts` (and any script not imported by a test) never typechecked | `tsconfig.node.json#L22` | `strict: true` explicit; `scripts/**` in a typechecked project | in_progress |
| AUD-009 | No URL-contract safety net: deep links, refresh and back/forward behaviour unprotected | — | e2e URL contract specs cover every route/param shape in use and pass on `main` | in_progress |

## T02 · User-Visible Correctness

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-020 | Metric comparison fabricates Tau Ceti / Tau Ceti e telemetry and shows it under any uncached or incomplete target's name; view never loads data | `src/services/guideService.ts#L412-L614`, `src/views/MetricDetailView.tsx#L64-L67` | No numeric fallback literals in `resolveMetricComparison`; e2e: cold load of `/guide/metrics/stellar-mass?focus=proxima-centauri` shows Proxima's catalogue value or "not catalogued", never 0.783 | open |
| AUD-021 | `PlanarGrid` creates a `BufferGeometry` inline in JSX per render; never disposed | `src/components/canvas/instrument/PlanarGrid.tsx#L520-L526` | `G-r3f` inline-geometry rule passes; unit test asserts geometry identity stable across re-renders and disposed on unmount | open |
| AUD-022 | `validateSearch` spreads unvalidated params; `Number('foo')` passes `NaN` into camera maths | `src/router/index.tsx#L220-L248` | Unit tests: non-finite `x/y/z` rejected; unknown keys dropped | open |
| AUD-023 | `decodeSummaryNode` invents `properName` from `name` for non-Gaia IDs (lossy round-trip) | `src/utils/compactDataCodec.ts#L308-L312` | Property test: `decode(encode(n))` deep-equals `n` | open |
| AUD-024 | `SystemScene` fabricates Kepler orbits (`0.4 + index * 0.6` …) and `classification: 'terrestrial'` for planets lacking data | `src/components/canvas/scenes/SystemScene.tsx#L154-L216` | No index-derived orbital elements; behaviour for missing orbits per T02 decision | open |

## T03 · Layering Cut

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-030 | Services, data and utils import from `components/canvas/**` (types, `GALACTIC_FRAME`, aperture maths, chord geometry) | `searchService.ts#L1-L2`, `details/types.ts#L1-L2`, `details/galacticAperture.ts#L1-L6`, `journeyService.ts#L17`, `data/planetPalettes.ts#L1` | `G-imports` at zero for `src/{services,data,utils,stores}` → `src/components/**` | open |
| AUD-031 | `searchRepository` (data) imports from `searchService` | `src/data/searchRepository.ts#L1` | `G-imports` data → services at zero | open |
| AUD-032 | Import cycles: `searchService ↔ details/navigationAndCamera`, `searchService ↔ layerCardService` | `searchService.ts#L38-L47`, `layerCardService.ts#L19-L22`, `navigationAndCamera.ts#L1-L6` | `G-imports` cycle check at zero | open |
| AUD-033 | `sectorStreamingService` creates `THREE.BufferGeometry`/`THREE.Points` and mutates the scene graph | `src/services/sectorStreamingService.ts#L206-L236` | No `three` import under `src/services/**` | open |
| AUD-034 | `useCanvasStageStore` imports component props (including callbacks) from `CanvasLayer` | `src/stores/useCanvasStageStore.ts#L2-L6` | `G-imports` stores → components at zero; store holds serialisable data only | open |
| AUD-035 | Tier-1 `SpectralBadge` imports `data/guideCatalog` | `src/components/interface/information/CelestialSymbol/SpectralBadge.tsx#L3` | `G-imports` interface → data/services at zero | open |
| AUD-036 | `PaletteShowcaseScene` (DOM, 48 KB) exported from production `canvas/scenes` barrel; near-clone of `prototypes/PaletteShowcase`; prototypes live under `src/components` | `src/components/canvas/scenes/index.ts#L5` | No prototype/showcase code in production barrels or `src/components` | open |
| AUD-037 | `math/astronomy.ts` pure re-export shim; `QUADRANTS` duplicated; inline Euclidean distance re-implemented | `canvas/math/astronomy.ts`, `cartographyMath.ts#L13-L18`, `math/cardinal.ts#L26-L31`, `searchService.ts#L581`, `#L1342` | Shim deleted; single definitions | open |

## T04 · Pipeline Reliability & Precalculation

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-040 | Non-deterministic `new Date().toISOString()` stamped into 15+ outputs | `scripts/build-data.ts#L2672`, `#L3548`, `src/utils/compactDataCodec.ts#L1257` | Two consecutive `data:build` runs produce byte-identical output | open |
| AUD-041 | Fetch errors swallowed (exit 0); no timeout/retry; `sync-discoveries` silently falls back to `[]` | `scripts/fetch-sources.ts#L1752-L1882`, `scripts/sync-discoveries.ts#L225-L259` | Unit tests: failed mandatory source → non-zero exit; timeout enforced | open |
| AUD-042 | ~1,700 lines of curated catalogues embedded as TS literals in the fetch script and dumped at runtime | `scripts/fetch-sources.ts#L13-L1749`, `#L1900-L1903` | Curated data in versioned seed files; `fetch-sources.ts` does acquisition only | open |
| AUD-043 | Hardcoded alias dictionaries (system names, disk hosts) and 90-line constellation list in pipeline code | `scripts/build-data.ts#L890-L903`, `#L1693-L1709`, `#L1785-L1874` | Moved to seed/config data | open |
| AUD-044 | Placeholder representative distances for SNRs/pulsars/Barnard/NGC (1500/800/300/1200/2500 pc) presented as positions | `scripts/build-data.ts#L1343`, `#L1374`, `#L1410`, `#L1457` | No placeholder distances; handling per T04 decision | open |
| AUD-045 | Codec encodes domain rules: Sol→`sol-A`, HZ 0.75–1.77 AU, belt/Kuiper bands, search tier by ID prefix, survey prose | `src/utils/compactDataCodec.ts#L840-L848`, `#L1094-L1095`, `#L1175-L1216`, `#L1484-L1503` | Codec is pure serialisation; rules live in pipeline precalculation | open |
| AUD-046 | Legacy 3-tuple `planetCompositionCounts` union retained | `src/types/astro.ts#L112-L115`, `#L214-L216` | `G-shims` passes; 4-tuple only | open |
| AUD-047 | Duplicate outputs (`sector_*.json` + `.bin`, 50 MB `stars.json`); dead `buildCsvDataPipeline`; "backward compatibility" key branch | `scripts/build-data.ts#L2737-L2744`, `#L3885-L3896`, `#L859-L868` | One canonical format per shard; CSV pipeline deleted | open |
| AUD-048 | No format version in binary header or JSON envelopes; positional tuples leak to consumers | `src/utils/binarySectorCodec.ts#L35-L40`, `compactDataCodec.ts#L74-L82` | Versioned formats; consumers use named accessors | open |
| AUD-049 | Naive `line.split(',')` CSV parsing duplicated | `scripts/sync-discoveries.ts#L205`, `#L239` | Shared parser (`csv-parser`) | open |
| AUD-050 | `build-data.ts` 3,945-line god module; production `buildGaiaDataPipeline` untested | `scripts/build-data.ts#L2894` | Decomposed modules under `G-size`; fixture test for Gaia pipeline | open |
| AUD-051 | Runtime needs precalculated fields that do not exist: compact-object/stellar classification, natural satellites, per-entity reticle type | consumers in AUD-063 … AUD-065 | Fields emitted by pipeline and decoded by codec | open |

## T05 · Runtime Data Purity

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-060 | Default benchmark IDs (`tau-ceti`, `tau-ceti-e`) and baseline routes hardcoded in `guideService` | `src/services/guideService.ts#L424-L450` | `G-literals` passes; benchmarks come from guide config | open |
| AUD-061 | `journeyService` hardcodes `sol`/`earth` IDs, display names, parentage and Earth/Mars SMA fallbacks | `src/services/journeyService.ts#L26-L27`, `#L325-L364`, `#L572-L573`, `#L997-L998` | `G-literals` passes for `journeyService` | open |
| AUD-062 | `'sol'` special cases decide parentage and centre in details services | `details/navigationAndCamera.ts#L88-L91`, `details/bodiesAndSchematics.ts#L63`, `details/galacticAperture.ts#L98-L100` | `G-literals` passes for `details/**` | open |
| AUD-063 | `PlanetScene` hardcodes Luna orbit and radius | `src/components/canvas/scenes/PlanetScene.tsx#L49-L76` | Satellites from data (AUD-051) | open |
| AUD-064 | `GalaxyScene` regex-classifies spectral strings at runtime | `src/components/canvas/scenes/GalaxyScene.tsx#L20-L26` | Reads precalculated classification | open |
| AUD-065 | UI infers classification from strings and indices (`href.includes('planet')`, breadcrumb index, hardcoded `type="terrestrial"` / `"stellar-system"`) | `GuideExamplesList.tsx#L29-L31`, `Breadcrumbs.tsx#L49-L55`, `MetricComparativePanel.tsx#L47-L63`, `PreviewPanel.tsx#L50` | Symbols driven by data-supplied reticle type | open |
| AUD-066 | `StructuredQuantity.value` carries free text (`'Instantaneous'`, `'21.40%'`, `'… (dep) · … (arr)'`, `unit: ''`); `formatStructuredQuantity` and Δz prose in service | `src/services/journeyService.ts#L50-L55`, `#L540-L554`, `#L654-L699`, `#L1028-L1031` | `value: number` in type; no formatting functions in services | open |
| AUD-067 | `hazardsAndComposition` builds display strings and substring-slices prose to inject `habitable-badge` | `details/hazardsAndComposition.ts#L124-L127`, `#L281-L309`, `#L406-L423` | Structured return types only | open |
| AUD-068 | `guideService` builds prose sentences and emits hex colours; metric comparison returns pre-formatted strings | `guideService.ts#L250-L257`, `#L402-L403`, `#L458-L598` | Structured quantities and semantic tokens only | open |
| AUD-069 | Four divergent planet/reticle classifiers | `astroMath.ts#L349-L389`, `searchService.ts#L265-L327`, `hazardsAndComposition.ts#L146-L155`, `#L693-L704` | One authoritative classifier (precalculated) | open |
| AUD-070 | Shims: `collection:` select token (verify against DEC-031/DEC-037 supersession), journey option aliases (`rel-1g`, `brach-1g`, `fusion-01c`, `hohmann`), `views/GuideSectionNav.tsx` re-export. *Correction 2026-11-07: `?layer=` is ratified by DEC-037 and is not a shim; whether `?layer=` alone should imply `select=layer:` moves to AUD-091.* | `searchService.ts#L1014`, `journeyService.ts#L1057-L1065`, `src/views/GuideSectionNav.tsx` | `G-shims` at zero | open |
| AUD-071 | 46 KB curated guide catalogue as runtime TS literals | `src/data/guideCatalog.ts` | Per T05 decision (data shard vs editorial content module) | open |
| AUD-072 | Default target fallbacks `'sol'`/`'earth'` in canvas and scene wiring | `CanvasLayer.tsx#L157`, `#L167`, `SystemScene.tsx#L56` | `G-literals` passes | open |
| AUD-073 | Unchecked casts in search and journey services | `searchService.ts#L654-L667`, `#L1677`, `journeyService.ts#L280-L305` | No `as` casts on untyped records | open |

## T06 · Navigation Single Source of Truth

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-080 | Selection, query and camera target duplicated across URL, `useUIStore`, `SpatialEntityStore`, `useCameraStore` and view state | `router/index.tsx#L26-L37`, `useUIStore.ts#L17-L33`, `SpatialEntityStore.ts#L16-L17`, `useCameraStore.ts#L23-L41` | Mirror fields deleted; URL contract suite unchanged | open |
| AUD-081 | Echo loops held off by `applyingOuter*Ref`, `pendingCanvasFocusRef`, `lastWrittenUrlQueryRef` | `SpatialViewport.tsx#L127-L201`, `GalaxyView.tsx#L133-L147`, `SearchRoot.tsx#L217-L219` | Flags deleted | open |
| AUD-082 | Global `document` click listener hijacks anchors; custom `starmap:locationchange` event | `src/router/index.tsx#L130-L197` | No document click listener; no custom location event | open |
| AUD-083 | Views regex-parse `pathname` instead of `useParams()` | `SystemView.tsx#L97-L104`, `PlanetView.tsx#L66-L67`, `GalaxyView.tsx#L123-L130`, guide detail views | No pathname regex in views | open |
| AUD-084 | `SearchRoot` mirrors `window.location` with `popstate`; `searchUrlSync` writes via `history.replaceState`; `searchStoreSync` splices `window.location.search` | `SearchRoot.tsx#L88-L96`, `searchUrlSync.ts#L66-L67`, `searchStoreSync.ts#L25-L30` | No `window.location` / `history` access outside the router | open |
| AUD-085 | Render-phase store mutation and `getState()` under `typeof window === 'undefined'` | `SearchRoot.tsx#L141-L174`, `SpatialShell.tsx#L145-L157`, `SpatialViewport.tsx#L414` | No `typeof window` branches in render bodies | open |
| AUD-086 | Three-way drawer authority (controlled prop / local state / store) | `SpatialShell.tsx#L160-L172` | One authority | open |
| AUD-087 | Data loading duplicated across views and scenes with `tick` re-read hacks; caches have no subscription API | `SystemView.tsx#L214-L226`, `SystemScene.tsx#L64-L107`, `GalaxyView.tsx`, `PlanetView.tsx` | Single loading mechanism (loaders or external-store hook); no `tick` state | open |
| AUD-088 | `useStarmapNav` dead; route strings hardcoded across views/components | `router/navigation.ts#L25-L86` | Typed navigation used everywhere or helper deleted | open |
| AUD-089 | `simulateAsyncFetch` artificial delay in production router; swallowed `navigate` errors | `router/index.tsx#L55`, `GalaxyView.tsx#L670-L681` | Removed / handled | open |
| AUD-090 | Unbounded module-level repository caches; no `AbortSignal` support | `data/detailsRepository.ts#L27-L64`, `data/layerRepository.ts#L24-L34`, `data/searchRepository.ts#L25-L27` | Bounded caches; fetchers accept `signal` | open |
| AUD-091 | URL grammar review (ratified in DEC-R014a–DEC-R014l; implementation owned by T06): (a) positioning params from DEC-021 (`center`, `x/y/z`, `az/el/dist`, `zoom`) superseded by single `?center=`; (b) `layer`, `select`, `focus`, and `route` orthogonal across galaxy, system and planet views; (c) `?layer=` and `select=layer:` independent; (d) `select` restricted to entityId, `layer:`, `route`, and `search` | `router/index.tsx#L25-L42`, DEC-021, DEC-037, DEC-R014a–DEC-R014l | Ratified URL grammar recorded in decision log; URL contract specs updated to match and green | open |
| AUD-092 | Multi-star spectral badges (`G2V+K1V`, `K3V + M`) link to broken `/guide/star-types/...` pages; Guide detail routes only resolve a single slug; `resolveMetricComparison` silently truncates multi-star/multi-planet systems to `stars[0]` / `planets[0]`; non-metric Guide detail views ignore `?focus=` (`DEC-R014k`). (High severity, Correctness / UX; owning track: T02) | `src/services/guideService.ts`, `src/data/guideCatalog.ts`, `src/views/*DetailView.tsx`, `src/components/domain/MetricComparativePanel/MetricComparativePanel.tsx` | All 4 Guide detail routes resolve comma- and plus-separated values; multi-star/multi-planet systems expanded; ?focus= handled | open |

## T07 · One Persistent Canvas & R3F Hot Paths

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-100 | Each scope mounts its own `<Canvas>`; WebGL context recreated on every scope change | `CanvasLayer.tsx#L142-L169`, `SpatialScenes.tsx#L389`, `#L472`, `#L539` | `G-canvas` = 1; e2e asserts same GL context across galaxy→system→planet | open |
| AUD-101 | Orphaned `GlobalCanvas` + `SceneBridge` system; `ReactNode` stored in Zustand | `canvas/viewport/GlobalCanvas.tsx`, `SceneBridge.tsx`, `SceneBridgeContext.ts#L5-L13` | Deleted | open |
| AUD-102 | `THREE.Object3D.prototype.data` monkey-patched with recursive Proxy | `canvas/viewport/patchR3F.ts#L81-L102` | File deleted; no prototype mutation | open |
| AUD-103 | Per-frame, per-entity `occlusionManager.register()` → O(N²) scans and allocations per frame | `CelestialEntity.tsx#L369`, `celestialOcclusionRegistry.ts#L399-L433` | Registration only on mount/change; unit test asserts no snapshot rebuild on unchanged frames | open |
| AUD-104 | `offsetWidth`/`offsetHeight` read in `useFrame` | `EntityLabel.tsx#L162-L165` | `G-r3f` layout-read rule passes | open |
| AUD-105 | Render-phase ref mutation duplicating the effect below | `CelestialEntity.tsx#L290-L300` | Lint `refs` warnings for file at zero | open |
| AUD-106 | Materials and `Line2` rebuilt on hover: colour/opacity in `useMemo` deps | `DropStalk.tsx#L127-L135`, `OrbitPath.tsx#L200-L219` | `G-r3f` material-deps rule passes | open |
| AUD-107 | Unconditional per-frame `color.copy()` on ~132 materials | `RangeRings.tsx#L81-L99`, `CoordinateFins.tsx#L214-L257` | Colour sync on token change only | open |
| AUD-108 | `getState()` per frame and `setApertureIds(new Set())` inside `useFrame` | `SpatialEntityContext.tsx#L63-L142`, `SpatialFrameProvider.tsx#L205` | No store reads/writes in frame callbacks | open |
| AUD-109 | Module-level singleton fallbacks leak across remounts/tests | `celestialOcclusionRegistry.ts#L876`, `SpatialEntityContext.tsx#L166-L181`, `SafeHtml.tsx#L7-L9` | Provider-scoped; hooks throw outside provider | open |
| AUD-110 | Imperative camera/controls restore in `useEffect` racing `CameraRig` | `SpatialScenes.tsx#L136-L184` | Restore owned by camera rig | open |
| AUD-111 | Mutable `THREE.Color` instances held in Zustand | `useThreeTokenStore.ts#L11-L37` | Store holds primitives; colours built at material boundary | open |
| AUD-112 | Dash/dot metrics defined three times with conflicting values | `useThreeTokenStore.ts#L437-L440`, `CartoLineMaterial.ts#L11-L22`, `cartographyMath.ts#L127-L134` | Single token source | open |
| AUD-113 | `EntityLabel` inline `transform` style | `EntityLabel.tsx#L254` | Inline-style rule passes for canvas | open |

## T08 · View & UI Decomposition

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-120 | God components: `SearchRoot` (774), `GalaxyView` (750), `DirectionsPanel` (525) | — | `G-size` ≤ 300 for components/views | open |
| AUD-121 | Hardcoded px/rem/rgba/ms in CSS modules | `views/GuideViews.module.css`, `SpatialShell.module.css`, `DetentSheet.module.css`, `CelestialSymbol.module.css` | `G-ui` token rule at zero | open |
| AUD-122 | Quad gaps: `CelestialBadge`, `SpectralBadge`, `HazardBadge`, `CelestialTitle`, seven `DetailsPanel` sub-components, `components/search/**` | `interface/information/CelestialSymbol/`, `domain/DetailsPanel/`, `components/search/` | `G-ui` per-file quad rule at zero | open |
| AUD-123 | Raw `<ul>`/`<ol>` lists in domain components and views | `DirectionsPanel.tsx#L301`, `#L411`, `StarTypesListView.tsx#L18`, `SearchResults.tsx#L94` | `G-ui` raw-list rule at zero | open |
| AUD-124 | Counts/ratios in `<Badge>`, `→`/`←` string arrows, `unit="of 5"` | `LayerCard.tsx#L103-L197`, `MetricComparativePanel.tsx#L78`, `DirectionsPanel.tsx#L374-L419` | Rule-compliant primitives | open |
| AUD-125 | `className` concatenation in primitives; `DirectionsPanel` restyles `<Button>` | `Stack.tsx#L20`, `Cluster.tsx#L22`, `Imposter.tsx#L30`, `DetentSheet.tsx#L233`, `DirectionsPanel.module.css#L47-L66` | Per T08 decision on `className` passthrough | open |
| AUD-126 | Component-specific tokens in global `semantic.css` | `styles/tokens/semantic.css#L106-L195` | Moved into component modules | open |
| AUD-127 | Row click emulated via `anchorRef.current.click()` | `SearchResultItem.tsx#L107-L149` | Accessible interactive row pattern | open |
| AUD-128 | `DetentSheet` writes `style.setProperty` through a ref | `DetentSheet.tsx#L127`, `#L168` | Per T08 decision | open |
| AUD-129 | ~60 non-component exports from component files | lint `only-export-components` | Lint rule warnings at zero | open |
| AUD-130 | Missing `index.ts` barrels (`SearchResultItem`, `LayerCard`) | — | Barrels present | open |

## T09 · Test Restructure

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-140 | `tests/searchService.test.ts` (1,739 lines) catch-all with `innerHTML` substring assertions | `tests/searchService.test.ts#L67` | File removed; split into colocated 1:1 tests using Testing Library queries | open |
| AUD-141 | `tests/router.test.ts` uses `renderHtml` → `toContain` | `tests/router.test.ts#L36-L39` | Testing Library queries only | open |
| AUD-142 | No colocated 1:1 tests for views, `components/search/**`, `journeyService`, `guideService`, `layerCardService`, `details/*`, `nomenclature` | — | Every module has a colocated test | open |
| AUD-143 | Unit test environment defaults to `node` | `vite.config.ts#L70` | Per T09 decision (jsdom default or split projects) | open |
| AUD-144 | `act()` warnings and duplicate Three.js instance / CJS deprecation warnings in every suite | test output; `vite.config.ts#L73-L77` | Zero such warnings in test output | open |
| AUD-145 | `toBeDefined()`-only smoke tests; `as any` mocks; `react(globals)` lint warnings in tests | `tests/stores.test.ts#L143-L145`, `tests/searchService.test.ts#L453` | Removed / typed | open |

## T10 · Closing Audit

| ID | Finding | Evidence | Acceptance check | Status |
|---|---|---|---|---|
| AUD-150 | Docs drift: `<CommandPalette>` at `--surface-modal` does not exist; tech-stack says React 18+ | `docs/design-system.md#L97-L98`, `conductor/tech-stack.md#L4` | Docs reflect final architecture | open |
| AUD-151 | Fresh six-area audit after T09 | — | No new Critical/High findings; all IDs above `verified` | open |
