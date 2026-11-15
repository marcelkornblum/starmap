# Decision Log: Guard Baseline Zero & Module Decomposition (`guard-baseline-zero-and-module-decomposition_20261114`)

---

## `DEC-GBZ-001` — Review Mode Selection
- **Status:** Ratified (2026-11-15)
- **Context:** Pre-flight review mode check prior to executing `guard-baseline-zero-and-module-decomposition_20261114`.
- **Options Considered:**
  1. **Whole-Track Review in PR:** Execute Phases 1–5 continuously (pausing one-by-one for Task 1.3's architectural boundary decisions), run QA + `code-review` at each phase boundary, commit clean checkpoints on `chore/guard-baseline-zero-and-module-decomposition`, and present the completed zero-baseline PR for review.
  2. **Phase-by-Phase Review:** Halt after each phase checkpoint for manual sign-off.
- **Decision:** **Option 1 — Whole-Track Review in PR.**

---

## `DEC-GBZ-002` — Module Decomposition Import Strategy & `compactDataCodec` Split
- **Status:** Ratified (2026-11-15)
- **Context:** Task 1.3 alignment on how 32 oversized production `src/` modules (`compactDataCodec.ts`, `nomenclature.ts`, `astroMath.ts`, `types/astro.ts`, `services/**`, `details/**`, and 3D canvas modules) are partitioned to `≤ 300` lines without violating `G-imports`, `G-imports-cycle`, or the Zero Backwards-Compatible Shims guardrail.
- **Options Considered:**
  1. **Direct Focused Sub-Module Cutover (Zero Re-Export Facades):** Move build-time `encode*` and shard-writer functions out of `src/utils/compactDataCodec.ts` into `scripts/pipeline/` (`compactDataEncoder.ts` + `≤ 300`-line helpers) while keeping only runtime decoders + shared wire constants/types in `src/utils/compactDataCodec.ts`; cut all internal `src/` and test callers directly over to focused domain sub-modules (retaining `index.ts` barrels strictly for UI Component Quads).
  2. **Folder `index.ts` Barrels for Decomposed Services/Utils:** Preserve caller import paths via re-exporting folder `index.ts` barrels across `src/utils/` and `src/services/`.
- **Decision:** **Option 1 — Direct Focused Sub-Module Cutover (Zero Re-Export Facades).**

---

## `DEC-GBZ-003` — `SLUG_CACHE` `BoundedLruCache` Capacity
- **Status:** Ratified (2026-11-15)
- **Context:** Replacing the raw `Map<string, string>()` + `65,536`-entry cliff `.clear()` in `src/utils/datasetLayerCodec.ts` with `BoundedLruCache` configured via `src/config/cacheConfig.ts`.
- **Options Considered:**
  1. `SLUG_CACHE_LIMIT = 5_000` (~400 KB)
  2. `SLUG_CACHE_LIMIT = 10_000` (~800 KB)
  3. `SLUG_CACHE_LIMIT = 1_000` (~80 KB)
- **Decision:** **Option 1 — `SLUG_CACHE_LIMIT = 5_000`.**

---

## `DEC-GBZ-004` — `G-literals` AST Heuristic Allowlist Criteria
- **Status:** Ratified (2026-11-15)
- **Context:** Eliminating the 29 `G-literals` entries (`73` instances) in `scripts/guards/baseline.json` without introducing inline suppression comments or altering public wire shard schemas (`compact.t === 'sol'`).
- **Options Considered:**
  1. **Strict Identity + Named Config Constants:** Keep entity string literal checks strict across `src/` (exempting `src/config/` reference constants and wire-envelope `.t` discriminator checks, while eliminating real `'earth'`/`'Earth'` fallbacks in `services/` and `canvas/` via `REFERENCE_TARGETS` or data lookups); refine `?? <num>` / `|| <num>` to permit multiplicative identity fallbacks (`1` / `-1`) **only** when the LHS expression does not reference an astronomical telemetry identifier (`mass*`, `radius*`, `semiMajorAxis*`, `sma*`, `eccentricity*`, `inclination*`, `period*`, `teff*`, `temp*`, `luminosity*`, `distance*`, `parallax*`, `metallicity*`, `age*`, `gravity*`, `density*`, `insolation*`, `albedo*`), and extract non-unit camera/device defaults (`45`, `10`, `4`) into named typed constants in `engineConfig.ts` / `config/`.
  2. **Telemetry-LHS-Only Check:** Restrict `G-literals` numeric fallback checks exclusively to astronomical telemetry LHS names, permitting arbitrary inline numeric fallbacks elsewhere.
- **Decision:** **Option 1 — Strict Identity + Named Config Constants.**
