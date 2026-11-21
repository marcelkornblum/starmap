# Project Workflow (Conductor v2)

The track `plan.md` is the source of truth for work; `spec.md` defines scope; ratified choices live in `decision-log.md` (initiative tracks). Stack changes are recorded in [`tech-stack.md`](./tech-stack.md) *before* implementation. Never invent requirements, data fields or UI presentation: discuss each unratified choice one piece at a time with the user.

## Core Principles

1. **Red-Green-Refactor TDD:** write a failing test, confirm it fails, write the minimum code to pass, then refactor with tests green. Test conventions: [`typescript.md`](./code_styleguides/typescript.md).
2. **Task runner:** one `npm run` command per call. Gate every task and phase on:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run audit:guards` (layering, cycles, zero hardcoded entities; add `npm run audit:ui` / `npm run audit:r3f` for UI / canvas changes)
   - `npm run test:coverage`
3. **Task lifecycle:** mark `[~]` in `plan.md` → Red → Green → Refactor → mark `[x]` (append a short pointer to what shipped) → commit cleanly on the feature branch. No git notes.
4. **End-of-phase checkpoint:** run the `standards` cleanup (review the phase diff against [`code_styleguides/`](./code_styleguides/), remove dead code and stale docs), run the task runner gates, commit the checkpoint. In *phase-by-phase* mode, HALT and present a summary for review; in *whole-track* mode continue.
5. **End-of-track dual review:** run the `code-review` skill **and** `architecture-review` (layering, persistent canvas, router SSOT, data pipeline boundaries per [`docs/architecture/`](../docs/README.md)). Fix findings in a `Review Fixes` phase of `plan.md`.
6. **Live smoke test & visual review:** at every track review (including non-UI tracks), ensure the dev server is running and present clickable `<LAN_HOST>` smoke-test links (`http://<LAN_HOST>:5173/...`, plus Storybook `:6006` when relevant) per [`local-review-and-screenshots.md`](./local-review-and-screenshots.md). For UI changes, also run `npm run capture:views` across all 5 standard viewports. Output goes to `/tmp/starmap-*`, never the workspace.
7. **Changelog:** on track completion, append a summary to the root `CHANGELOG.md`.
8. **GitHub delivery:** work on a feature or chore branch (`feat/<track>`, `chore/<task>`); never commit to `main`; never force-push; open a PR against `main` with `gh pr create`; all CI checks (`Lint`, `Type Check`, `Test`, `Build`, `CI Complete`) must pass; address the automated Gemini review, resolve addressed threads, comment `/review` and repeat until clean; then wait for human review.

Commit format: `<type>(<scope>): <description>` with types `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## Programme Management

- **Initiatives** group related tracks: `conductor/initiatives/<name>/` with `index.md`, `decision-log.md` and `view-requirements.md` where relevant.
- **Track folders:** initiative tracks `conductor/tracks/<initiative>_<NN>_<slug>_<YYYYMMDD>/`; standalone tracks `conductor/tracks/<slug>_<YYYYMMDD>/`. Each holds `index.md`, `spec.md`, `plan.md`, `metadata.json`.
- **`metadata.json`:** `id`, `type`, `status` (`new` / `in_progress` / `completed`), `created_at`, `updated_at`, `initiative` (name or `null`), `phase`, `depends_on` (upstream track folder names). A track may start only when every `depends_on` entry is `[x]` in [`tracks.md`](./tracks.md) or archived.
- **Registry:** [`tracks.md`](./tracks.md) lists active and archived tracks; [`backlog.md`](./backlog.md) is the single backlog. Graduating a backlog item into a track removes it from the backlog.
- **Archival:** initiative tracks stay in `conductor/tracks/` (marked `[x]`) until the initiative closes, then the initiative and its tracks move to `conductor/archive/`. Standalone tracks are archived on completion. Before archiving an initiative, promote its durable decisions into `docs/`.
- **Review mode:** ask the user at track start whether to use phase-by-phase review or whole-track review in the PR.
