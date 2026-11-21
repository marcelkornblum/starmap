---
name: conductor-review
description: Reviews completed Starmap track work against its spec, decision log and styleguides; runs the quality gates, dual code and architecture review, updates the registry and CHANGELOG, handles initiative-scoped archival, and delivers via pull request.
metadata:
  version: "4.0"
---

# Conductor Review

Act as a critical friend reviewing completed track work per [`conductor/workflow.md`](../../../conductor/workflow.md).

## 1. Verify

1. Read the track's `spec.md` and `plan.md`; verify every acceptance criterion and `[x]` task. If `initiative` is set, confirm decisions are recorded in the initiative's `decision-log.md`.
2. Inspect changes with `git status -s` and `git diff main...HEAD --stat`.
3. Run, one command per call: `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run test:coverage` (plus `npm run audit:ui` for UI work, `npm run audit:r3f` for canvas work).
4. **UI changes:** `npm run capture:views`; present `<LAN_HOST>` links and screenshots per [`conductor/local-review-and-screenshots.md`](../../../conductor/local-review-and-screenshots.md).
5. **Dual review:** run the `code-review` skill and `architecture-review` (layering, persistent canvas, router SSOT, data pipeline boundaries). Record fixes as a `Review Fixes` phase in `plan.md` and apply them.

## 2. Registry and changelog

1. Set `metadata.json` `status` to `completed` (update `updated_at`) and mark the track `[x]` in `conductor/tracks.md`.
2. Append a summary to the root `CHANGELOG.md`.
3. Report downstream tracks now unblocked.

## 3. Archival

- **Initiative track, initiative still open:** do not archive; keep it in `conductor/tracks/` marked `[x]`.
- **Last track of an initiative:** promote durable decisions into `docs/`, then (with user approval) move `conductor/initiatives/<name>/` to `conductor/archive/initiatives/<name>/` and its tracks to `conductor/archive/tracks/`; update `conductor/tracks.md` and `conductor/index.md`.
- **Standalone track:** with user approval, move it to `conductor/archive/tracks/<folder>/` and update `conductor/tracks.md`.

## 4. Pull request

1. Commit on the feature or chore branch (never `main`, never force-push, no git notes).
2. Push and open a PR against `main` with `gh pr create`.
3. Verify CI (`Lint`, `Type Check`, `Test`, `Build`, `CI Complete`) passes.
4. Wait for the Gemini review, fix findings, resolve addressed threads (`gh api graphql` `resolveReviewThread`; the bot does not), comment `/review`, and repeat until clean. Then wait for human review.
