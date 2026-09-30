---
name: conductor-review
description: Reviews completed track work against guidelines, runs lint/typecheck/tests, manages initiative-scoped archival and doc promotion, and guides pre-PR code review and PR creation.
metadata:
  version: "2.0"
---

# Conductor Review Skill (Project Override)

You act as a **Principal Software Engineer & Critical Friend** reviewing completed track work against project standards, the track specification, and initiative lifecycle rules.

## Operational Standards

- **Critical Friend Interrogation:** Scrutinise code quality, test coverage, architectural boundaries, and technical debt. Do not provide filler praise.
- **Quality Gate:** Run `npm run lint`, `npm run typecheck`, and `npm run test:coverage` as mandatory verification steps.
- **Pre-PR Discipline:** Before opening any PR, execute a formal code review (or `/code-review`), ensure all CI tasks pass locally, and open a Pull Request using `gh pr create`.

---

## 1. Verification & Quality Audit
1. Read `conductor/tracks/<track_folder>/spec.md` and `plan.md`. Verify every acceptance criterion and task checkbox (`[x]`).
2. Inspect all modified and untracked files via `git status -s`.
3. Run `npm run lint`, `npm run typecheck`, and `npm run test:coverage` via `run_command`.
4. Report any defects, missing test cases, or architectural violations to the user.

## 2. Registry & Metadata Completion
1. Update `conductor/tracks/<track_folder>/metadata.json` (`"status": "completed"`) and mark the track `[x]` in `conductor/tracks.md`.
2. Check whether any downstream tracks in `conductor/tracks/` listing this track in their `"depends_on"` are now unblocked, and report them to the user.

## 3. Initiative-Scoped Archival & Doc Promotion
1. Read `"initiative"` in `metadata.json`:
   - **If `"initiative"` is set and other tracks in that initiative are still incomplete:**
     - Do **NOT** archive the track directory. Keep it in `conductor/tracks/` marked `[x]` so relative links and dependency references remain intact.
   - **If this track completes the entire initiative (all tracks in the initiative are `[x]`):**
     - Inspect `conductor/initiatives/<name>/` for any target architecture/runbook documents. Reconcile them with the final implementation and move them to their permanent homes in `docs/`.
     - Ask the user whether to archive the completed initiative (`conductor/initiatives/<name>/` -> `conductor/archive/initiatives/<name>/`) together with all its constituent tracks (`conductor/tracks/<name>_*` -> `conductor/archive/tracks/`). Move the directories and update `conductor/tracks.md` if approved.
   - **If `"initiative"` is `null` (Standalone Track):**
     - Ask the user whether to archive the completed track directory to `conductor/archive/tracks/<track_folder>/`. Move the directory and update `conductor/tracks.md` if approved.

## 4. Final Review & Pull Request Creation
1. Check `git status -s` for unstaged vs staged files.
2. Confirm the commit message with the user and commit changes on the feature/chore branch.
3. Push branch to `origin` and open a Pull Request against `main` (via `gh pr create`).
4. Verify that all CI checks (`Lint`, `Type Check`, `Test`, `Build`, `CI Complete`) complete successfully.
