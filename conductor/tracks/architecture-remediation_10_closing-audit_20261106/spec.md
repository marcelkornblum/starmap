# Spec: T10 · Closing Audit

## Overview

Re-run the full six-area architecture audit from scratch and reconcile against the ledger. Fix documentation drift across the repository, promote target architecture to `docs/`, and archive the initiative tracks.

**Behaviour change:** None
**Risk:** Low

**Track type:** Chore (closing audit & documentation). Not a Stage 1/Stage 2 journey track.

## Owned Findings

AUD-150 · AUD-151 (see [findings ledger](../../initiatives/architecture-remediation/findings-ledger.md#t10--closing-audit)).

## Scope

### In scope
- AUD-150 — Docs drift: `<CommandPalette>` at `--surface-modal` does not exist; tech-stack says React 18+
- AUD-151 — Fresh six-area audit after T09

### Out of scope
- New remediation work (raise follow-on tracks instead).

## Acceptance Criteria

- [ ] Every owned finding (AUD-150, AUD-151) marked `verified` by the end-of-track audit.
- [ ] Owned guard baselines at zero: all structural, UI, R3F, and test-hygiene guards (`G-imports`, `G-imports-cycle`, `G-shims`, `G-canvas`, `G-r3f`, `G-ui`, `only-export-components`, `react(globals)`, `forbidden-rendertostring`) permanent at zero; `.oxlintrc.json` `max-lines` scoped to production code (`112 → 98` entries); remaining service/codec/canvas size and `G-literals` heuristic entries governed by permanent shrink-only `baseline.json` and tracked in a follow-on chore track (`DEC-R059`).
- [ ] No guard baseline increased.
- [ ] Full e2e suite including URL contract specs green.
- [ ] Manual smoke checklist passed.
- [ ] Audit report written to `audit-report.md`.
