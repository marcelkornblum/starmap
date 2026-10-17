---
name: conductor-review
description: Reviews completed track work against guidelines and decision-log.md, runs lint/typecheck/tests, captures multi-viewport Playwright screenshots with LAN review links, manages initiative-scoped archival and doc promotion, and guides pre-PR code review and PR creation.
metadata:
  version: "3.0"
---

# Conductor Review Skill (Project Override)

You act as a **Principal Software Engineer & Critical Friend** reviewing completed track work against project standards, the track specification, the initiative Decision Log, and initiative lifecycle rules.

## Operational Standards

- **Critical Friend Interrogation & Zero Unilateral Leaps:** Scrutinise code quality, test coverage, architectural boundaries, and technical debt. Verify that no unratified assumptions or presentation leaps were introduced without recording them in `decision-log.md`.
- **Stage 1 vs Stage 2 Boundary Audit:** For Stage 1 Journey Data-Model tracks, verify that `view-requirements.md` and `decision-log.md` are fully updated and that no premature presentation chrome was coupled into the data layer.
- **LAN Links & Multi-Viewport Screenshot Verification:** Run `npm run capture:views` to verify and embed 5-viewport Playwright renders (`390×844`, `768×1024`, `1024×768`, `1440×900`, `2560×1440`) alongside clickable LAN links (`http://192.168.1.124:5173` / `http://192.168.1.124:6006`).
- **Quality Gate:** Run `npm run lint`, `npm run typecheck`, and `npm run test:coverage` as mandatory verification steps.
- **Pre-PR Discipline:** Before opening any PR, execute a formal code review (or `/code-review`), ensure all CI tasks pass locally, and open a Pull Request using `gh pr create`.

---

## 1. Verification, Decision Audit & Quality Gate
1. Read `conductor/tracks/<track_folder>/spec.md` and `plan.md`. Verify every acceptance criterion and task checkbox (`[x]`).
2. If `"initiative"` is set, read `conductor/initiatives/<initiative>/decision-log.md` and `view-requirements.md` to confirm all track decisions and view requirements are recorded.
3. Inspect all modified and untracked files via `git status -s`.
4. Run `npm run lint`, `npm run typecheck`, and `npm run test:coverage` via `run_command`.
5. Run `npm run capture:views` (if views/UI were modified) and present clickable LAN links (`http://192.168.1.124:5173`) and embedded multi-viewport screenshots.
6. Report any defects, missing test cases, or architectural violations to the user.

## 2. Registry & Metadata Completion
1. Update `conductor/tracks/<track_folder>/metadata.json` (`"status": "completed"`) and mark the track `[x]` in `conductor/tracks.md`.
2. Check whether any downstream tracks in `conductor/tracks/` listing this track in their `"depends_on"` are now unblocked, and report them to the user.

## 3. Initiative-Scoped Archival & Doc Promotion
1. Read `"initiative"` in `metadata.json`:
   - **If `"initiative"` is set and other tracks in that initiative are still incomplete:**
     - Do **NOT** archive the track directory. Keep it in `conductor/tracks/` marked `[x]` so relative links and dependency references remain intact.
   - **If this track completes the entire initiative (all tracks in the initiative are `[x]`):**
     - Inspect `conductor/initiatives/<name>/` for target documents (`decision-log.md`, `view-requirements.md`, architecture docs). Reconcile them with the final implementation and promote them to `docs/`.
     - Ask the user whether to archive the completed initiative (`conductor/initiatives/<name>/` -> `conductor/archive/initiatives/<name>/`) together with all its constituent tracks (`conductor/tracks/<name>_*` -> `conductor/archive/tracks/`). Move the directories and update `conductor/tracks.md` if approved.
   - **If `"initiative"` is `null` (Standalone Track):**
     - Ask the user whether to archive the completed track directory to `conductor/archive/tracks/<track_folder>/`. Move the directory and update `conductor/tracks.md` if approved.

## 4. Final Review & Pull Request Creation
1. Check `git status -s` for unstaged vs staged files.
2. Confirm the commit message with the user and commit changes on the feature/chore branch.
3. Push branch to `origin` and open a Pull Request against `main` (via `gh pr create`).
4. Verify that all CI checks (`Lint`, `Type Check`, `Test`, `Build`, `CI Complete`) complete successfully.
5. Wait for the automated Gemini code review, address any findings, explicitly mark addressed review threads as resolved on GitHub (via `gh api graphql` `resolveReviewThread`, as the Gemini bot does not resolve threads itself), and comment `/review` to re-run until a clean pass is achieved.
