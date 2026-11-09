# Decision Log (`architecture-remediation`)

Records programme-level and per-track decisions for the architecture remediation initiative.

## Operating Rules for Agents

1. **No unilateral decisions.** Agents never silently choose an option.
2. **One decision at a time.** Decompose questions into single-concern decisions and discuss them one by one.
3. **Preserve options and trade-offs** so provisional choices can be revisited.
4. **Statuses:** `Open` · `Provisional` · `Ratified` · `Superseded`.

---

## Decision Register

### DEC-R001: Separate Initiative for Architecture Remediation
- **Date:** 2026-11-06
- **Status:** `Ratified`
- **Context:** The 2026-11-06 audit found ~100 issues across state/routing, canvas, services, pipeline, UI and tests, several of them previously claimed as fixed by PR #84.
- **Options Considered:**
  1. *Fold into `journey-ui-scaffolding`.* Trade-off: mixes remediation with feature work; the decision log and ledger get diluted.
  2. *New `architecture-remediation` initiative with its own decision log and findings ledger.* Trade-off: an extra registry section, but clean ownership and closure criteria.
- **Decision:** Option 2.

---

### DEC-R002: Ten Dependency-Ordered Tracks (T01–T10)
- **Date:** 2026-11-06
- **Status:** `Ratified`
- **Decision:** Adopt T01 Guardrails & safety net → T02 User-visible correctness → T03 Layering cut → T04 Pipeline reliability & precalculation → T05 Runtime data purity → T06 Navigation single source of truth → T07 One persistent Canvas & R3F hot paths → T08 View & UI decomposition → T09 Test restructure → T10 Closing audit, with dependencies as drawn in [index.md](./index.md). The findings ledger, ratcheting guards and three-auditor end-of-track audit were accepted with the proposal.

---

### DEC-R003: Feature Freeze; Serial Tracks by Default with One Parallel Worktree Lane
- **Date:** 2026-11-06
- **Status:** `Ratified` (user delegated the choice: "freeze is ok but also we could use worktrees, you tell me")
- **Context:** The seven active Stage 2 / standalone feature tracks touch the same files that T05–T08 rewrite. The user asked whether git worktrees would remove the need for a freeze.
- **Options Considered:**
  1. *Freeze all overlapping feature tracks until T08 merges.* Trade-off: pauses feature delivery; the cost is low because those tracks are currently dormant.
  2. *Run feature tracks in parallel worktrees.* Trade-off: worktrees isolate working copies, not **semantic** conflicts. Feature work would land on code mid-rewrite, causing repeated rebases and likely reintroducing the debt being removed.
  3. *Freeze feature tracks; run remediation serially, with one parallel worktree lane for build-time-only work.* Trade-off: some parallelism where file sets are genuinely disjoint, at the cost of rebasing and re-auditing before merge.
- **Decision:** Option 3.
  - Stage 2 and standalone feature tracks stay frozen until T08 merges.
  - Remediation tracks run serially by default.
  - **T04** (build-time pipeline, `scripts/**` and codec encode side) may run in a separate git worktree alongside T02/T03. Before merging it must be rebased onto `main`, and its end-of-track audit re-run.
  - **Operational constraint:** `npm run dev` / `capture:views` bind `127.0.0.1:5173` with `strictPort`, so only one worktree at a time can run e2e or visual capture.

---

### DEC-R004: Regression Verification — No Pixel Diffs; e2e Suite + Manual Smoke Checklist
- **Date:** 2026-11-06
- **Status:** `Ratified`
- **Options Considered:**
  1. *CI-gated pixel diffs.* Trade-off: canvas rendering is noisy; high maintenance; still misses interaction regressions.
  2. *Report-only pixel diffs.* Trade-off: noise without enforcement.
  3. *No pixel diffs; the e2e suite (existing specs + new URL contract specs) is a mandatory verification gate, plus a manual smoke checklist run by the user over LAN and 5-viewport captures for visual review.*
- **Decision:** Option 3. The regression auditor runs the full e2e suite and the 5-viewport capture. The user runs the [manual smoke checklist](./verification-protocol.md#manual-smoke-checklist) before each PR is approved.

---

### DEC-R005: One PR per Track
- **Date:** 2026-11-06
- **Status:** `Ratified`
- **Decision:** Each track ships as exactly one PR. Tracks exceeding ~40 production files are split into follow-on tracks instead of PR-per-phase.

---

### DEC-R006: Review Mode — Whole-Track Review in PR
- **Date:** 2026-11-06
- **Status:** `Provisional` (user: "probably whole track"; re-confirmed at the start of each track per workflow)
- **Decision:** Execute all phases continuously, pausing only for unratified decisions. The end-of-track audit runs before the PR; review happens in the PR.

---

### DEC-R007: Orchestrator Spot-Verification Rate
- **Date:** 2026-11-06
- **Status:** `Provisional` (trial on T01; revisit at T01 close)
- **Context:** Flash auditors produced four false claims in the 2026-11-06 audit.
- **Options Considered:**
  1. *Orchestrator re-verifies every verdict.* Trade-off: slow.
  2. *Every Critical/High verdict plus a 1-in-3 sample of the rest.* Trade-off: residual risk on unsampled Medium/Low verdicts, mitigated by mechanical acceptance checks.
- **Decision:** Option 2 for T01, then revisit using T01's false-verdict rate.

---

### DEC-R008: Findings Ledger Is the Only Definition of "Fixed"
- **Date:** 2026-11-06
- **Status:** `Ratified` (accepted with the programme proposal)
- **Decision:** Every finding has a stable `AUD-NNN` ID, an owning track and an acceptance check (mechanical wherever possible). Status flows `open → in-progress → claimed → verified | reopened`. Implementers may only set `claimed`. Only the end-of-track audit, after orchestrator spot-verification, may set `verified`.

---

### DEC-R009: Guard Implementation Vehicle (T01)
- **Date:** 2026-11-06
- **Status:** `Ratified`
- **Context (verified by orchestrator):** `oxlint` 1.90 supports `import/no-cycle`, `no-restricted-imports` (patterns, groups, per-file `overrides`), `max-lines`, `--format json` and `--max-warnings`, but has no baseline mechanism. `audit-ui.ts` and `audit-r3f.ts` parse with `@babel/parser`; `audit-r3f.ts` has no tests.
- **Options Considered:**
  1. *oxlint for structural rules + extended audit scripts for domain rules + one `audit:guards` baseline runner.* Trade-off: two rule engines but one baseline; no new dependencies; editor feedback for lint rules.
  2. *Everything in custom Babel-AST scripts.* Trade-off: one mechanism, but hand-rolled module resolution is error-prone; no editor feedback.
  3. *Add dependency-cruiser.* Trade-off: best graph tooling and built-in known-violations baseline, but a new dependency, extra config and slower CI.
- **Decision:** Option 1.
  - Layer boundaries (`no-restricted-imports` via `overrides`), cycles (`import/no-cycle`) and file size (`max-lines`) live in `.oxlintrc.json`.
  - Literal, shim, `<Canvas>`-count, R3F and UI rules live in the audit scripts.
  - A new `audit:guards` runner collects JSON from both and compares per-file, per-rule counts against a committed baseline.

---

### DEC-R010: Guard Baseline Format and Location (T01)
- **Date:** 2026-11-06
- **Status:** `Ratified`
- **Options Considered:**
  1. *Single `scripts/guards/baseline.json`, count per rule + file, each entry tagged with its owning `AUD-NNN`; `--update` may only lower counts.* Trade-off: robust to line shifts; a violation could be swapped for another within the same file and count.
  2. *Per-violation fingerprints (rule + file + snippet hash).* Trade-off: precise, but brittle under refactors.
  3. *Inline suppression comments at each violation.* Trade-off: visible at the site, but hundreds of edits under `src/`, breaking T01's no-production-change rule.
- **Decision:** Option 1. CI never passes an allow-increase flag; raising a baseline requires an explicit, reviewed edit to `baseline.json`.

---

### DEC-R011: `G-literals` Detection Method (T01)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Must catch (a) entity IDs/names written as strings in runtime code (`'tau-ceti'`, `'earth'`, `'sol'`, `'Luna'`) and (b) invented numeric fallbacks (`?? 0.783`, `?? 1.524`). Scope: runtime `src/` excluding tests, stories, `content/` canon layers and `scripts/`.
- **Options Considered:**
  1. *Catalogue-driven:* flag any string literal exactly matching a real entity ID or name from committed `public/data` shards. Trade-off: covers new entities automatically; occasional false positives handled by reasoned exemption comments.
  2. *Hand-maintained denylist.* Trade-off: no false positives, but misses anything unlisted and decays.
  3. *Denylist gates CI, catalogue check warns.* Trade-off: warnings get ignored.
- **Decision:** Option 1.
  - The numeric-fallback rule (`?? <number>` / `|| <number>`, excluding 0, in `src/services/**` and `src/components/canvas/scenes/**`) applies in addition.
  - Exemptions use `// guard-disable-next-line G-literals -- <reason>`; a missing reason is itself a violation.

---

### DEC-R012: Layer Boundary Map for `G-imports` (T01)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Decision (Option 1 of 3):** Each layer may import only from the layers listed. Type-only imports count. No import cycles anywhere (type-only included).

| Layer | May import from |
|---|---|
| `src/types` | — |
| `src/utils` | `types` |
| `src/data` | `types`, `utils` |
| `src/services` | `types`, `utils`, `data` |
| `src/stores` | `types`, `utils`, `data`, `services` |
| `src/hooks` | the above + `stores` |
| `src/components/interface` | `types`, `utils`, `hooks` |
| `src/components/canvas` | `interface`, `hooks`, `stores`, `services`, `data`, `types`, `utils` |
| `src/components/domain`, `src/components/search` | all of the above incl. `canvas` |
| `src/views` | all component layers + router helpers |
| `src/router` | everything |
| `src/components/prototypes` | must not be imported by production code |

- **Options rejected:** (2) same map with type-only imports exempt — hides most of AUD-030; (3) coarse core/ui/app zones — misses interface → data and data → services violations.

---

### DEC-R013: Lint Warning Strategy (T01)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** 106 warnings: ~60 `only-export-components` (owner T08), ~31 `react(refs)`/`react(immutability)` (T07), ~14 `react(globals)` in tests (T09), ~12 mixed (whichever track touches the file).
- **Options Considered:**
  1. *Per-rule, per-file ratchet in `audit:guards`; owning tracks zero their rules; switch CI to `--deny-warnings` at zero.* Trade-off: precise ownership; nothing new can enter.
  2. *Fix all in T01.* Trade-off: breaks T01's no-production-change rule; duplicated by T07/T08.
  3. *Global `--max-warnings=106`.* Trade-off: allows new warnings to offset fixed ones; no ownership.
- **Decision:** Option 1. `--deny-warnings` becomes permanent once the baseline count reaches zero (expected by T09 close).

---

### DEC-R014: URL Contract Suite Pins the Intended URL Grammar, Settled First (T01)
- **Date:** 2026-11-07
- **Status:** `Ratified` (all sub-decisions `DEC-R014a`–`DEC-R014l` complete)
- **Context:** The user questioned parts of the existing grammar: the positioning params from DEC-021; `layer`, `select` and `focus` must work on galaxy, system and planet views; `?layer=` is legitimate (DEC-037), correcting the AUD-070 shim claim. Recorded as AUD-091.
- **Options Considered:**
  1. *Pin today's behaviour, labelled by source decision; questioned shapes marked under review.* Trade-off: nothing changes by accident; T06 later revises tests deliberately.
  2. *Pin only currently endorsed shapes.* Trade-off: positioning unprotected until T06.
  3. *Settle the intended URL grammar now, then pin that.* Trade-off: tests describe the target from day one; pulls a product decision into T01; intended-but-unbuilt behaviour cannot pass yet.
- **Decision:** Option 3.
  - The URL grammar is settled one decision at a time (DEC-R014a…) inside T01 Phase 1 and recorded below.
  - Implementation of any grammar changes stays with T06 (AUD-091).
  - How T01 handles contract tests for intended-but-unbuilt behaviour is a separate decision taken after the grammar is settled.

---

### DEC-R014a (G1): Positioning in the URL — Single `center` Param, Entity Id or Coordinates
- **Date:** 2026-11-07
- **Status:** `Ratified` (supersedes the positioning part of DEC-021)
- **Context:** Sharing is the purpose of the URL. Camera orientation and distance (`az`, `el`, `dist`, `zoom`) depend on the viewport, so a framing that works on a 2560×1440 screen is wrong on a 390×844 phone. Today the app never writes `x/y/z/az/el/dist/zoom`; `az`/`el` have no effect anywhere; `dist` works on galaxy only; `zoom` is unused; and `center` plus `x/y/z` can conflict, with `x/y/z` silently winning.
- **Options Considered:**
  1. *Single `center` = entity id or `x,y,z` (in the current view's frame). Centre writes the id; panning away writes coordinates on settle, using replace (not push). Omit `az/el/dist/zoom`.*
  2. *Same, but the app only ever writes the id; coordinates appear only in hand-made links.* Trade-off: coordinate form effectively dead again.
  3. *Separate `center` and `x,y,z` params with documented precedence.* Trade-off: two ways to say one thing; conflicting combinations possible.
  4. *(Earlier round)* Make DEC-021 fully real with camera orientation/distance; centre + semantic `radius`; no positioning at all.
- **Decision:** Option 1.
  - `?center=<entityId>` or `?center=<x>,<y>,<z>`: one concept, two encodings. Coordinates are in the current view's reference frame (pc on galaxy, AU on system, planetary frame on planet).
  - Centre actions write the entity id. Panning the camera target away from a centred entity writes coordinates when the camera settles, via `history.replace` (never push).
  - `x`, `y`, `z`, `az`, `el`, `dist` and `zoom` are removed from the grammar. Camera orientation and distance are never in the URL; adding them later as a best-effort "share this view" feature would be non-breaking, whereas removing params from shared links later would break them.

---

### DEC-R014b (G2a): `select` Has Consistent Meaning on Galaxy, System and Planet
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Today `select` produces 3D selected-reticle highlighting on galaxy only; on system and planet it only marks rows in the bodies/schematic panels. `focus` and `layer` already behave consistently across the three views.
- **Options Considered:** (1) consistent 3D + panel marking everywhere; (2) keep as today; (3) panels only everywhere.
- **Decision:** Option 1. On every spatial view, selected entities that are in scope show the 3D selected reticle state and are marked in the panels. Wiring into the system/planet scenes is implemented in T06/T07.

---

### DEC-R014c (G2b): `select` and `layer` Persist Across Spatial Views
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Options Considered:** (1) persist across galaxy/system/planet, each view applying only in-scope tokens and preserving the rest; (2) clear on cross-view navigation; (3) persist `layer`, clear `select`.
- **Decision:** Option 1. All navigation between spatial views carries `select` and `layer` unchanged. Out-of-scope tokens are ignored by the current view but kept in the URL. `focus` is not carried; it is replaced by the navigation target (DEC-015).

---

### DEC-R014d (G2c): View Scope Definition and Out-of-Scope `focus`
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Scope definition:** A view's scope is the set of entities whose DEC-038 orbit-context link targets that view, plus the view's own path subject.
  - Galaxy: star systems and galactic structures.
  - `/system/<id>`: that system's stars, planets, dwarf planets, belts and minor bodies, plus the system itself.
  - `/planet/<id>`: that planet's moons, plus the planet itself.
- **Options Considered:**
  1. *Redirect (replace) to the entity's orbit-context view.* Trade-off: preserves the focus intent, but lets a modifier override the location the URL names; silently "fixes" broken internal links, hiding bugs.
  2. *Path wins: render the view as specified and remove the out-of-scope `focus` (replace).* Trade-off: focus intent from a malformed link is lost, but behaviour is predictable and consistent with treating invalid modifiers as droppable.
  3. *Open the details panel anyway.* Trade-off: the panel describes something the scene cannot show.
- **Decision:** Option 2 (proposed by the user; the orchestrator's initial recommendation of option 1 over-weighted `focus` relative to the path).
  - The path is primary.
  - An out-of-scope `focus` is removed from the URL via `history.replace`, and a dev-only console warning is emitted so broken internal links stay detectable.
  - Pinned by a URL contract test.

---

### DEC-R014e (G2d): Out-of-Scope Entity in `center`
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Options Considered:** (1) same rule as `focus`; (2) keep in URL and silently use default framing; (3) project the entity's position into the current view's frame.
- **Decision:** Option 1. An out-of-scope entity id in `center` is removed via `history.replace` with a dev-only warning, and the view uses its default framing. Coordinate-form `center` is always valid in the current view's frame.

---

### DEC-R014f (G3): `layer` and `select=layer:` Are Independent
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** `parseUrlSelectTokens` converts every `?layer=` value into an implicit `select=layer:` token (`searchService.ts#L965-L968`), and `resolveSelectedSystemsFromUrlSelect` repeats it. Every producer emits both params anyway.
- **Options Considered:** (1) independent; (2) `layer` implies highlight, links emit only `layer=`; (3) drop the `layer:` select token.
- **Decision:** Option 1.
  - `?layer=` controls only the layer card; 3D highlighting comes only from `select`.
  - The implicit conversion is removed; producers keep emitting both.
  - Closing the card removes `layer` only.

---

### DEC-R014g (G4): Valid `?select=` Token Kinds
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Historically `?select=` accepted arbitrary prefix tokens (`tag:`, `star-type:`, `planet-type:`, `collection:`, `canon:`) alongside entity IDs. Curated sets belong in Layers, whilst Guide examples should link directly to entity views.
- **Decision:**
  - Keep only `<entityId>`, `layer:<slug>`, `route` (DEC-R014i), and `search` (DEC-R014j) in `?select=`.
  - Drop `tag:`, `star-type:`, `planet-type:`, `collection:`, and `canon:`.
  - Guide benchmark examples link directly to the benchmark entity's Orbit-Context view without `&select=star-type:...` or `planet-type:...`.
  - Curated sets use Layers.
  - Invalid tokens are stripped via `history.replace` with a dev-only console warning.

---

### DEC-R014h (G5a): Multimodal Compound `?route=` Syntax
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Transit planning currently couples stops with an external `?journeyOption=` parameter, which does not scale to multi-leg or multimodal journeys.
- **Decision:**
  - Fold the selected transit mode into `?route=` as an optional `:mode` suffix on each departure stop (`?route=<stopA>[:<mode>],<stopB>[:<mode2>],...`).
  - Stage 1 Options List: `?route=sol,tau-ceti` (no mode selected yet).
  - Stage 2 Option Detail: `?route=sol:torchship-1g,tau-ceti`.
  - Future multimodal: `?route=earth:hohmann-transfer,sol:torchship-1g,tau-ceti`.
  - Drop the separate `?journeyOption=` URL parameter.

---

### DEC-R014i (G5b): `?route=`, `?select=route`, and `?focus=` Orthogonality
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Route selection smuggled stop IDs into `focusedIds[1]` (AUD-014) and lacked clean separation between transit panel display, 3D highlight, and entity inspection.
- **Decision:**
  - `?route=` controls `<DirectionsPanel />` and `<JourneyChord />` and persists across spatial views just like `?layer=`.
  - `?select=route` marks all stops of the active `?route=` as `selected` (`selectedIds`) in the 3D scene and `<BodiesPanel />` (clicking Directions emits `?select=route&route=...`).
  - `?focus=` independently controls `<DetailsPanel />` and the single `focusedId` (`string | null`), deleting the `focusedIds[1]` smuggling hack (`AUD-014`).

---

### DEC-R014j (G6): `?q=`, `?searchCategory=`, and `?select=search` on Spatial Views
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Competing effects in `SearchRoot` and `GalaxyView` produced divergent selection states and broken search-result highlighting when transitioning between views.
- **Decision:**
  - `?q=` and `?searchCategory=` remain valid across `/search` and all three spatial views (`Galaxy`, `System`, `Planet`).
  - Typing a search query sets `?q=<query>&select=search` (replacing any previous `select=`).
  - Clearing search removes `select=search`.
  - `?select=` is the single universal driver of `selectedIds` across all spatial views (eliminating competing `SearchRoot` vs `GalaxyView` effects).

---

### DEC-R014k (G7): Multi-Value Guide Slugs & `?focus=` Across All Guide Detail Views
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Multi-star spectral badges (`G2V+K1V`, `K3V + M`) link to broken Guide pages; Guide detail routes only resolve a single slug; `resolveMetricComparison` silently truncates multi-star/multi-planet systems to `stars[0]` / `planets[0]`; non-metric Guide detail views ignore `?focus=`.
- **Decision:**
  - All four Guide detail routes (`/guide/star-types/$starType`, `/guide/planet-types/$planetType`, `/guide/metrics/$metricId`, `/guide/hazards/$hazardId`) accept comma-separated (and `+`-delimited for spectral strings like `G2V+K1V`) values in the path and render all matching entries on the page.
  - Navigating from an inspected entity to any Guide detail view passes `?focus=<id1>[,<id2>]` (supporting multi-entity/system expansion in `<MetricComparativePanel />` and powering the `Map` return link).
  - Logged as `AUD-092` (owned by T02).

---

### DEC-R014l (G8): T01 URL Contract Spec Strategy for T02/T06 Target Grammar
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Track T01 establishes the behavioural URL contract suite in `e2e/url-contracts.spec.ts`. Some parts of the ratified grammar (AUD-091 / AUD-092) are not yet implemented in production code and will be built in T02 and T06.
- **Decision:**
  - In T01's `e2e/url-contracts.spec.ts`, write active passing tests for grammar behaviours that already match today.
  - Commit target `AUD-091` / `AUD-092` grammar specs as `test.fixme('AUD-091: ...')` / `test.fixme('AUD-092: ...')` blocks that T02 and T06 must un-skip and pass to close those ledger items.

---

### DEC-R015: Storybook & Guardrails in CI (AUD-007)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Storybook build and architecture guard scripts were not running in CI, allowing quad gaps, token leaks, and Storybook build regressions to slip through unnoticed.
- **Decision:**
  - Add `npm run audit:guards` to the `lint` job in `.github/workflows/ci.yml`.
  - Add `npm run build-storybook` to the `build` job in `.github/workflows/ci.yml`.
  - Expose `STORYBOOK_TEST=1` as an explicit local `npm run test:storybook` script in `package.json`.

---

### DEC-R016: E2E Frame-Time Baseline & Hard-Fail Threshold (AUD-009)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** WebGL frame-time performance across view transitions and complex scenes lacked automated regression protection.
- **Decision:**
  - Commit reference frame-time baselines across `/galaxy`, `/system/sol`, and `/planet/earth` in `scripts/guards/frame-time-baseline.json`.
  - Write each run's measurements to `/tmp/starmap-test-results/frame-times.json`.
  - Hard-fail CI whenever `p95FrameTime` exceeds `scripts/guards/frame-time-baseline.json` by more than 25%.

---

### DEC-R017: Track T02 Review Mode — Whole-Track Review in PR
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Re-confirming review mode at the start of Track T02 per `DEC-R006`.
- **Decision:** Execute all T02 phases continuously, run the 3-auditor pass and orchestrator spot-verification, and review the completed track in the Pull Request.

---

### DEC-R018: Uncatalogued Metric Presentation & Cold-Load Fetch in `MetricComparativePanel` (AUD-020)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** `MetricDetailView` did not load detail shards on cold load, and `resolveMetricComparison` fabricated Tau Ceti (`0.783 M☉`, `5344 K`, etc.) or Tau Ceti e (`0.538 AU`, `3.93 M⊕`, etc.) fallback numbers whenever a focused entity was uncached or lacked a catalogued metric value.
- **Options Considered:**
  1. *Keep the target comparison card visible with concise placeholders (`"—"`) and a short status badge (`"Not catalogued"` / `"Loading…"` during shard fetch).* Trade-off: preserves layout stability and clearly communicates missing catalogue values without prose bloat.
  2. *Hide the target comparison column entirely when the metric is uncatalogued.* Trade-off: hides which target was requested and shifts layout on load.
- **Decision:** Option 1, keeping display strings short and concise (`"—"` for missing `Scientific Value` / `Familiar Scale`, and concise badge labels).

---

### DEC-R019: Inferred Planetary Orbits & Confidence Marking in `SystemScene` and `DetailsPanel` (AUD-024)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** `SystemScene` fabricated Keplerian orbital elements (`0.4 + index * 0.6` AU, `index * 1.5°` inclination) without marking them as inferred, and its `activeCorpus` pre-manifest fallback ignored precalculated `p.A` (semi-major axis) and `p.u` (composition) on `CompactSearchEntry`, hardcoding `'terrestrial'` for all planets.
- **Options Considered:**
  1. *Use catalogued `semiMajorAxis` (including `p.A` and `p.u` from `activeCorpus`), infer missing `semiMajorAxis` from `periodDays` via Kepler's Third Law ($a = ((P/365.25)^2 \cdot M_\star)^{1/3}$, or orbital order if period is also unknown), and explicitly mark inferred orbits as theoretical (`lineStyle: 'dotted'` on `<OrbitPath />` in 3D and `<ConfidencePip level="theoretical" />` in `<DetailsPlanetTelemetrySection />`).*
  2. *Omit any planet lacking catalogued `semiMajorAxis` or `periodDays` from the 3D scene.*
  3. *Strictly require explicit `semiMajorAxis` in the manifest with no Kepler derivation.*
- **Decision:** Option 1. Inferred orbital data is permitted provided it is explicitly marked as inferred/theoretical in both the 3D scene (`lineStyle: 'dotted'`) and telemetry (`<ConfidencePip level="theoretical" />`), and precalculated `p.A`/`p.u` from `activeCorpus` are respected before the detail shard loads.

---

### DEC-R020: Stacked Target Cards for Multi-Star / Multi-Planet System Expansion in `MetricComparativePanel` (AUD-092)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** When `?focus=<systemId>` (or comma-separated `?focus=id1,id2`) resolves to multiple stars on a stellar metric or multiple planets on a planetary metric, `resolveMetricComparison` previously truncated to `stars[0]` / `planets[0]`.
- **Options Considered:**
  1. *Stacked Target Cards — render the Sol/Earth `Baseline` card once, and render a `Target` comparison card (with `Scientific Value`, `Familiar Scale`, and relative ratio `<Badge>`) for each constituent star or planet.*
  2. *Comparative `<DataTable>` — replace the card grid with a table when multiple targets are present.*
- **Decision:** Option 1 (Stacked Target Cards).

---

### DEC-R021: Track T03 Review Mode — Whole-Track Review in PR
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** Re-confirming review mode at the start of Track T03 per `DEC-R006`.
- **Decision:** Whole-Track Review in PR. Execute all phases continuously (pausing for Phase 1 atomic decisions), run the three-auditor verification gate, and review the completed track in the Pull Request.

---

### DEC-R022: Domain-Grouped Module Locations for Shared Types, Spatial Maths, and Router Hooks (`AUD-030`–`AUD-035`, `AUD-037`)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** `src/services/**`, `src/data/**`, `src/utils/**`, and `src/stores/**` imported types and pure maths from `src/components/canvas/**` (`AUD-030`) and `src/components/domain/**` (`AUD-034`); `src/data/searchRepository.ts` imported `SearchCategoryFilter` from `src/services/searchService.ts` (`AUD-031`); and views + `searchUrlSync.ts` imported `router`, `useSpaLocation`, and `StarmapSearchParams` from `src/router/index.tsx` (`AUD-032`).
- **Options Considered:**
  1. *Domain-grouped modules (`src/types/spatial.ts`, `src/types/search.ts`, `src/utils/spatialMath.ts`, `src/hooks/useSpaLocation.ts`).* Trade-off: clear modular boundaries under the 300-line file ceiling while satisfying `DEC-R012` layer ranks (`types` 0 $\leftarrow$ `utils` 1 $\leftarrow$ `data` 2 $\leftarrow$ `services` 3 $\leftarrow$ `stores` 4 $\leftarrow$ `hooks` 5 $\leftarrow$ `components` 6–8 $\leftarrow$ `views` 9 $\leftarrow$ `router` 10).
  2. *Single barrel files (`src/types/astro.ts` and `src/utils/astroMath.ts`).* Trade-off: fewer files, but bloats existing large files (`astroMath.ts` is already >300 lines).
- **Decision:** Option 1 (Domain-grouped modules).

---

### DEC-R023: Prototype Showcase Location (`AUD-036`)
- **Date:** 2026-11-07
- **Status:** `Ratified`
- **Context:** `PaletteShowcaseScene` in `src/components/canvas/scenes/PaletteShowcaseScene.tsx` was exported from the production `src/components/canvas/scenes/index.ts` barrel and duplicated `src/components/prototypes/PaletteShowcase/PaletteShowcase.tsx`, which lived inside `src/components/prototypes/` without a component quad.
- **Options Considered:**
  1. *Move `PaletteShowcase` to `src/prototypes/PaletteShowcase/` for Storybook and delete the duplicate `PaletteShowcaseScene` from `src/components/canvas/scenes/`.* Trade-off: preserves the interactive colour-theme playground in Storybook while removing prototype code from `src/components/**` and production barrels.
  2. *Delete both `PaletteShowcaseScene` and `PaletteShowcase`.* Trade-off: removes the colour-theme playground from Storybook.
- **Decision:** Option 1. Delete `src/components/canvas/scenes/PaletteShowcaseScene.*` and its export from `src/components/canvas/scenes/index.ts`, move `src/components/prototypes/PaletteShowcase/*` to `src/prototypes/PaletteShowcase/*`, and update `.storybook/main.ts` to include `../src/prototypes`.

---

### DEC-R024: Track T04 Review Mode — Whole-Track Review in PR
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** Re-confirming review mode at the start of Track T04 per `DEC-R006`.
- **Decision:** Whole-Track Review in PR. Execute all phases continuously (pausing for Phase 1 atomic decisions), run the three-auditor verification gate, and review the completed track in the Pull Request with clickable LAN smoke-test links.

---

### DEC-R025: Curated Seed Data Format & Location (`AUD-042`, `AUD-043`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** `scripts/fetch-sources.ts` embedded 1,736 lines of static curated catalogues (`OFFICIAL_IAU_STAR_NAMES`, `RECONS_10PC_SUPPLEMENT`, `IAU_NAME_EXOWORLDS`, `AAVSO_VARIABLE_CATALOG`, `FULL_GALACTIC_STRUCTURES`, `FULL_SOLAR_SYSTEM_BODIES`, `CIRCUMSTELLAR_DISKS_CATALOG`) as TypeScript literals and dumped them to `data/raw/*.json`, while `scripts/build-data.ts` hardcoded `DISK_HOST_ALIASES`, `SPECIAL_SYSTEM_NAME_MAP`, and `CONSTELLATION_NAMES_RAW`.
- **Options Considered:**
  1. *Versioned JSON files in `data/seed/*.json` with a typed loader in `scripts/pipeline/`.*
  2. *Versioned JSON files in `content/seed/*.json`.*
  3. *Typed TypeScript modules in `data/seed/*.ts`.*
- **Decision:** Option 1 (`data/seed/*.json` with a typed loader in `scripts/pipeline/`).

---

### DEC-R026: Handling of Galactic Structures Without Measured Distances (`AUD-044`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** `scripts/build-data.ts` mis-parsed the column offset for Cantat-Gaudin open clusters (`r50` instead of `plx`/`dmode`), ignored the `Dist` column in `atnf_pulsars.dat`, ignored the `Pax` column in `open_ngc.csv`, and fabricated representative distances (`300`, `500`, `800`, `1200`, `1500`, `2500` pc) for unmeasured rows in `greens_snr.dat`, `barnard_dark_clouds.dat`, and `open_ngc.csv`.
- **Options Considered:**
  1. *Parse real measured distances where present (`Cantat-Gaudin` `plx`/`dmode`, `Harris` `distKpc`, `ATNF` `Dist`, `OpenNGC` `Pax`, and `data/seed/galactic-structures.json`) and exclude bulk 2D-only rows lacking a known distance from 3D spatial output.*
  2. *Retain unmeasured 2D-only rows as positionless records (`dist`/`x`/`y`/`z` undefined) in search and details.*
  3. *Same as Option 1, plus expand `data/seed/galactic-structures.json` with literature distances for the full Messier set.*
- **Decision:** Option 1 for Track T04, plus add a new backlog item (`FS-018`) in `conductor/backlog.md` and `conductor/tracks.md` to support direction-only (`RA`/`Dec`) and distance-uncertain deep-sky objects with an appropriate 3D radial-ray/sky-dome representation in a future feature track.

---

### DEC-R027: Canonical Sector Shard Format & Duplicate Output Pruning (`AUD-047`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** `scripts/build-data.ts` emitted both `.json` and `.bin` sector partitions (while runtime `sectorStreamingService.ts` exclusively loads `.bin`), wrote a 50 MB `public/data/stars.json`, and retained 426 lines of dead `buildCsvDataPipeline` code plus a legacy spaced-key `"backward compatibility"` branch.
- **Options Considered:**
  1. *Standardise on `.bin` (`sector_<x>_<y>_<z>.bin`) as the sole sector partition format, and delete `.json` sector outputs, `public/data/stars.json`, `buildCsvDataPipeline`, and the legacy spaced-key branch.*
  2. *Same as Option 1, with an opt-in `--debug-json-sectors` CLI flag.*
  3. *Standardise on `.json` sector partitions and drop `.bin`.*
- **Decision:** Option 1, except **retain `public/data/stars.json` intentionally as a useful standalone reference dataset for external users**, while deleting `.json` sector outputs, `buildCsvDataPipeline`, and the legacy spaced-key branch.

---

### DEC-R028: Build Timestamp Source & One-Command Source/Epoch Refresh (`AUD-040`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** `scripts/build-data.ts` and `src/utils/compactDataCodec.ts` called `new Date().toISOString()` on every build run, making consecutive `npm run data:build` runs non-deterministic.
- **Options Considered:**
  1. *`SOURCE_DATE_EPOCH` environment variable falling back to a persisted deterministic catalogue epoch (`data/seed/build-epoch.json`), paired with a `just data-refresh` recipe (and `npm run data:refresh`) that refreshes source data, updates `data/seed/build-epoch.json`, and rebuilds all shards in one command.*
  2. *`SOURCE_DATE_EPOCH` falling back to last git commit timestamp.*
  3. *Remove `generatedAt` / `t` timestamps from shard envelopes.*
- **Decision:** Option 1 (`SOURCE_DATE_EPOCH` + `data/seed/build-epoch.json`, with `just data-refresh` / `npm run data:refresh` to refresh sources, update the build epoch, and rebuild).

---

### DEC-R029: Precalculated Field Schema & Versioned Wire Formats (`AUD-048`, `AUD-051`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** Runtime code needed precalculated compact-object/stellar classifications (`AUD-064`), natural satellites (`AUD-063`), and unified reticle/composition classifications (`AUD-065`, `AUD-069`), while wire formats lacked version headers (`AUD-048`) and leaked positional tuples to consumers.
- **Options Considered:**
  1. *Adopt version `v: 1` in binary sector headers (28 bytes) and JSON shard envelopes, expose a named search-entry decoder (`decodeCompactSearchEntry`), precalculate `SystemSummaryNode.classification`, embed parent-linked `PlanetRecord.satellites` from `data/seed/solar-system-bodies.json`, and precalculate mandatory `reticleType` and `composition` across all records.*
  2. *Same as Option 1, but emit natural satellites into a separate `satellites.json` overlay shard.*
- **Decision:** Option 1.

---

### DEC-R030: Review Mode for Track T05 (`DEC-R006`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** Re-confirming review mode at the start of Track T05 per `DEC-R006`.
- **Decision:** Whole-Track Review in PR. Execute all phases continuously (pausing for Phase 1 atomic decisions), run the three-auditor verification gate, and review the completed track in the Pull Request with clickable LAN smoke-test links.

---

### DEC-R031: StructuredQuantity Constrained Types (`AUD-066`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** `StructuredQuantity.value` carried arbitrary free text (`'Instantaneous'`, `'21.40%'`, `'… (dep) · … (arr)'`, `unit: ''`), and `formatStructuredQuantity` plus Δz prose were generated inside `journeyService.ts`.
- **Options Considered:**
  1. *Option A: Strict numeric `value: number` with an explicit regime discriminator on the result.*
  2. *Option B: Permissive enum tokens in `value` (`number | 'infinite' | 'instantaneous'`), while strictly banning arbitrary freeform formatted prose strings (`'21.40%'`, `'… (dep) · … (arr)'`) and decomposing split velocities into structured fields.*
- **Decision:** Option B. Constrain `StructuredQuantity.value` to `number | 'infinite' | 'instantaneous'`, decompose multi-value metrics (e.g. departure vs. arrival $\Delta v$) into distinct structured properties rather than concatenating prose into `value`, delete service-layer string formatting helpers, and let views format display presentation.

---

### DEC-R032: Modular Editorial Content Package for Guide Catalogue (`AUD-071`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** `src/data/guideCatalog.ts` was a 1,129-line (46 KB) monolithic TypeScript file embedding all Star Type, Planet Type, Hazard Type, and Metric guide definitions.
- **Options Considered:**
  1. *Option A: Modular editorial content package decomposed under `src/content/guide/` (`starTypes.ts`, `planetTypes.ts`, `hazardTypes.ts`, `metricTypes.ts`, `index.ts`) under `G-size` (<= 300 lines each), maintaining full compile-time type safety with zero network fetch waterfalls.*
  2. *Option B: Move to `public/data/guide/*.json` shards fetched asynchronously at runtime.*
- **Decision:** Option A (`src/content/guide/` modular package decomposed into focused, strongly-typed files satisfying `G-size`).

---

### DEC-R033: Reference Entity Configuration & Pure Data-Driven Parentage (`AUD-060`, `AUD-061`, `AUD-062`, `AUD-072`)
- **Date:** 2026-11-08
- **Status:** `Ratified`
- **Context:** Literal celestial IDs (`'sol'`, `'earth'`, `'tau-ceti'`, `'tau-ceti-e'`) and assumed coordinates/semi-major axes (`1.0 AU`, `1.524 AU`, `[0, 0, 0]`) were hardcoded across `guideService.ts`, `journeyService.ts`, `src/services/details/**`, `CanvasLayer.tsx`, and `SystemScene.tsx`.
- **Options Considered:**
  1. *Option A: Explicit Data Boundaries + Centralized Reference Configuration. Drive parentage and hierarchy strictly from precalculated `parentBodyId` and `kind` unions (zero string guards on `'sol'`), require explicit target props in scenes/canvas (rendering clean boundaries when missing), and centralize legitimate astronomical educational baselines (Earth, Sol, Tau Ceti comparison exemplars) in a dedicated configuration module (`src/config/referenceTargets.ts`).*
  2. *Option B: Pure Catalog Lookup with No Benchmark Fallback (render empty state when `?focus=` is omitted in guide; completely ban benchmark constants).*
- **Decision:** Option A (`src/config/referenceTargets.ts` for sanctioned educational comparison baselines, with strict data-driven hierarchy and zero magic-string fallbacks across domain services and scenes).

---

- **2026-11-06 · T01 reconnaissance:** the Flash `codebase-researcher` report contained about five factual errors (e2e spec count, untypechecked-scripts list, non-existent file paths, CI action versions). Countermeasure: Flash research prompts must include the raw command output supporting each claim. Counted towards the DEC-R007 review.

---

### DEC-R040: Review Mode for Track T06 (`DEC-R006`)
- **Date:** 2026-11-09
- **Status:** `Ratified`
- **Context:** Re-confirming review mode at the start of Track T06 per `DEC-R006`.
- **Decision:** Whole-Track Review in PR. Execute all phases continuously (pausing for Phase 1 atomic decisions), run the three-auditor verification gate, and review the completed track in the Pull Request with clickable LAN smoke-test links.

---

### DEC-R041: Canonical State Model — URL Universe Authority & Ephemeral Workspace Chrome (`AUD-080`, `AUD-081`, `AUD-084`, `AUD-085`, `AUD-086`, `AUD-091`, `AUD-093`)
- **Date:** 2026-11-09
- **Status:** `Ratified`
- **Context:** Selection, query, focus, and camera target were duplicated across URL search params, `useUIStore`, `SpatialEntityStore`, `useCameraStore`, and view local states, with 6+ mutable ref flags (`applyingOuter*Ref`, `pendingCanvasFocusRef`, `lastWrittenUrlQueryRef`) suppressing echo loops.
- **Decision:**
  - **URL Single Source of Truth for Universe State:** TanStack Router search and path parameters (`/galaxy`, `/system/:systemId`, `/planet/:planetId`, `?center=`, `?focus=`, `?select=`, `?layer=`, `?route=`, `?q=`, `?category=`) are the sole authoritative source of truth for all shareable navigation state.
  - **Immediate URL Intent on Navigation:** Navigation updates the URL immediately. The 3D camera rig and DOM panels react to URL changes (animating 3D flight and retracting/fading HUD panels during transit, then restoring them when the camera arrives/settles).
  - **Ephemeral Workspace Chrome in `useUIStore`:** Panel open/closed states (`isDetailsOpen`, `isDirectionsOpen`, `activeDrawer`) and in-flight HUD retraction (`isHudRetracted`) are owned locally by `useUIStore`.
  - **Deletions:** Delete all store mirror fields (`useUIStore.selectedNodeId`, `useUIStore.searchQuery`, `useUIStore.centeredEntityId`), delete all echo-guard ref flags, delete the document click listener (`AUD-082`), and delete manual `window.location` / `window.history` mutations (`AUD-084`).
  - **Single-Click Focus Decoupling (`AUD-093`):** Canvas single-click reticle activation updates `focusedId` and writes `?focus=` immediately without coupling to or clobbering `selectedId` / `selectedIds`.

---

### DEC-R042: Reactive Repository Hooks (`useSyncExternalStore`) for Data Loading (`AUD-087`)
- **Date:** 2026-11-09
- **Status:** `Ratified`
- **Context:** Views (`SystemView`, `PlanetView`, `GalaxyView`) and 3D scenes (`SystemScene`) performed uncoordinated parallel fetches on mount, swallowed errors, and forced component re-renders via `setShardTick(t => t + 1)` counters to read synchronous repository caches.
- **Decision:**
  - Introduce reactive repository hooks (`useEntityDetails`, `useSystemData`, `useLayerManifest`) powered by cache subscriptions (`useSyncExternalStore` or store event emitters).
  - Instantaneous resolution: if data is already cached, it resolves synchronously on the initial render (zero layout flash, non-blocking 3D scene transitions, zero new loading animation requirements).
  - Automatic `AbortSignal` cancellation: in-flight fetches are passed an `AbortSignal` and aborted when the component unmounts or switches target.
  - Delete all `setShardTick` counter hacks across views and scenes.

---

### DEC-R043: Bounded LRU Repositories with Configurable Limits & Native AbortSignal Support (`AUD-090`)
- **Date:** 2026-11-09
- **Status:** `Ratified`
- **Context:** Global cache maps in `detailsRepository.ts`, `layerRepository.ts`, and `searchRepository.ts` were unbounded `Map` instances with no eviction, and fetchers accepted no `AbortSignal`.
- **Decision:**
  - Standardise repository caches on bounded LRU eviction.
  - Extract cache limits into a dedicated configuration module (`src/config/cacheConfig.ts`) for easy tuning and test overrides:
    - `DETAIL_RECORD_CACHE_LIMIT = 100` (~2–4 MB)
    - `SUMMARY_NODE_CACHE_LIMIT = 500` (~1 MB)
    - `SEARCH_SHARD_CACHE_LIMIT = 50` (~5 MB)
  - Accept `signal?: AbortSignal` across all repository fetch functions (`fetchSummaryNode`, `fetchDetailRecord`, `fetchLayerManifest`, `fetchSearchShard`) and forward to `fetch()`.
