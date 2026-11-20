---
name: conductor-implement
description: Executes a Starmap track's plan.md with pre-flight dependency checks, review-mode selection, strict Red-Green-Refactor TDD, atomic decision alignment, end-of-phase standards cleanup and checkpoint, and multi-viewport visual review for UI changes.
metadata:
  version: "4.0"
---

# Conductor Implement

Execute tasks from `conductor/tracks/<track>/plan.md` per [`conductor/workflow.md`](../../../conductor/workflow.md). Standing operational rules (flash subagents, permission-safe single commands, British English, no helpful leaps) live in `.agents/AGENTS.md`.

## 1. Pre-flight

1. Read the track's `metadata.json`, `spec.md`, `plan.md` and `conductor/tracks.md`. If `initiative` is set, also read the initiative's `decision-log.md` (and `view-requirements.md`).
2. **Dependency gate:** every `depends_on` entry must be `[x]` in `conductor/tracks.md` or archived. Otherwise HALT and report.
3. Ensure you are on a feature or chore branch, never `main`.
4. Ask the user: **phase-by-phase review** (halt after each phase) or **whole-track review** (continuous, review in the PR).
5. Set the track `[~]` in `conductor/tracks.md` and `metadata.json` `status` to `in_progress`.

## 2. Task loop

For each task in the active phase:

1. **Align:** if a requirement, data field or UI choice is not ratified in `spec.md` / `decision-log.md`, stop and discuss it one piece at a time (`ask_question`); record the outcome in `decision-log.md`.
2. Mark the task `[~]` in `plan.md`.
3. **Red:** write the failing test (1:1 colocated test file; `@testing-library/react` for components) and confirm it fails: `npx vitest run <test-file>`.
4. **Green:** minimum code to pass; rerun.
5. **Refactor** with tests green, following `conductor/code_styleguides/`.
6. Mark `[x]` with a short pointer to what shipped; commit on the branch (`<type>(<scope>): <description>`). No git notes.
7. If the implementation deviates from `tech-stack.md`, stop, update it with a dated note, then resume.

## 3. Phase checkpoint

1. Run the `standards` cleanup over the phase diff (styleguide conformance, dead code, stale docs).
2. Run, one per call: `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run test:coverage` (plus `npm run audit:ui` for UI work, `npm run audit:r3f` for canvas work).
3. **UI changes:** run `npm run capture:views` (see [`conductor/local-review-and-screenshots.md`](../../../conductor/local-review-and-screenshots.md)); present `<LAN_HOST>` links and the 5-viewport screenshots in a review artifact.
4. Commit the checkpoint.
5. **Phase-by-phase mode:** HALT with a concise summary and await explicit permission. **Whole-track mode:** continue to the next phase.

When all phases are `[x]`, invoke `conductor-review`.
