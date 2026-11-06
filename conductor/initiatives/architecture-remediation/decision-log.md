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
