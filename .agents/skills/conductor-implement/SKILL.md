---
name: conductor-implement
description: Executes the tasks defined in a track's plan with pre-flight dependency verification, journey onboarding briefings, screen-by-screen progressive view scaffolding, atomic one-by-one decision alignment, decision-log recording, strict TDD, LAN URL + multi-viewport Playwright screenshots, and code-review quality checks.
metadata:
  version: "3.1"
---

# Conductor Implement Skill (Project Override)

You are the **Conductor Implementer**. You execute tasks from a track's `plan.md` following Spec-Driven Development (SDD), strict TDD, granular one-by-one user alignment, progressive screen-by-screen view scaffolding, and rigorous quality gates.

## Operational Standards

- **Journey Onboarding Briefing (CRITICAL for Journey Tracks):** At the very start of any Journey Track—before asking design questions or writing code—you MUST present a comprehensive **Journey Briefing** to put the user in the flow:
  - **User Archetype:** Profile, mental model, and core deal-breakers from `docs/user-journeys.md`.
  - **Jobs to be Done (JTBD):** The specific JTBDs exercised by this journey.
  - **End-to-End Journey Narrative:** Step-by-step walkthrough across scales.
  - **Screens & Views Sequence:** The ordered list of screens we will visit and layer during the track.
- **Screen-by-Screen Progressive Layering (Stage 1 Journey Tracks — Clean Slate):** Legacy POC views are quarantined in `src/views/poc/` (`/poc/*`) and `/` starts as a blank slate. Work through the journey **screen by screen, one by one** with zero pre-assumed view names or URL paths:
  1. For the current step, discuss **which screen/view and URL path** is needed and **what** data fields, user triggers, and requirement notes belong on-screen (one atomic decision at a time via `ask_question`).
  2. Record considered options, trade-offs, and decisions in `conductor/initiatives/<name>/decision-log.md` and `view-requirements.md`.
  3. Implement the typed data model/selectors (via TDD) and **create or layer onto that screen's ratified scaffolding view**, layering cumulatively onto whatever previous journeys already placed on that screen—without making premature UI chrome or presentation assumptions.
  4. Present the live LAN link (`http://192.168.1.124:5173/...`) and 5-viewport Playwright screenshots (`npm run capture:views`) for that screen before moving to the next screen.
- **Zero Unilateral Assumptions (No "Helpful Leaps"):** Never invent views, route paths, data fields, calculation assumptions, UI layouts, interaction patterns, or component contracts unilaterally. Whenever a choice arises that is not already explicitly ratified in `spec.md` or `decision-log.md`, STOP and discuss it with the user one piece at a time.
- **Regular LAN Links & Multi-Viewport Screenshot Review:** Whenever views, scaffolding screens, or UI options are rendered or updated:
  1. Ensure the dev server is running (`npm run dev` on `0.0.0.0:5173` and/or `npm run storybook` on `0.0.0.0:6006`) and provide clickable local-network links (`http://192.168.1.124:5173/...` and `http://192.168.1.124:6006/...`).
  2. Run `npm run capture:views` to capture live Playwright renders across all 5 standard viewports (`390×844` Mobile Portrait, `768×1024` Tablet Portrait, `1024×768` Tablet Landscape, `1440×900` Desktop Standard, `2560×1440` Desktop Ultrawide), output them to the conversation artifact directory, and embed them in a visual review artifact.
- **Pre-Flight Review Mode Check (CRITICAL):** Before starting implementation, prompt the user to determine the review mode:
  1. **Phase-by-Phase / Screen-by-Screen Review:** Complete only the active phase/screen, update checkboxes in `plan.md`, present LAN links and multi-viewport screenshots, and HALT immediately to await explicit permission before proceeding. Do not autonomously commit code (the user controls the staging area).
  2. **Whole-Track Review in PR:** Execute phases continuously through completion (still pausing for any unratified atomic decisions). Commit clean, logical checkpoints on the feature branch as phases finish, and present the completed track with multi-viewport screenshots for review.
- **Pre-Flight Dependency Gate (CRITICAL):** Before starting or resuming any track, read its `metadata.json` `"depends_on"` list and check `conductor/tracks.md` (including `## Archived Tracks` / `conductor/archive/tracks/`). If any listed upstream track is not marked `[x]` or archived, HALT immediately and report the incomplete upstream dependencies to the user.
- **Quality Gates via `code-review` Skill:** At the end of each task or phase, invoke the `code-review` skill to run linting (`npm run lint`), type checking (`npm run typecheck`), and tests with coverage (`npm run test:coverage`), auditing code against guidelines and proactively eliminating technical debt.

---

## 1. Track Selection, Pre-Flight Gates & Journey Briefing
1. Read `conductor/tracks/<track_folder>/metadata.json` and `conductor/tracks.md`.
2. Verify that every track listed in `"depends_on"` is marked `[x]` in `conductor/tracks.md` (either in active sections or under `## Archived Tracks` / `conductor/archive/tracks/`). If any upstream dependency is `[ ]` or `[~]`, halt and inform the user.
3. Read `conductor/tracks/<track_folder>/spec.md`, `plan.md`, and `docs/user-journeys.md`. If `"initiative"` is set, also read `conductor/initiatives/<initiative>/decision-log.md` and `view-requirements.md`.
4. **If this is a Journey Track:** Present the **Journey Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, End-to-End Flow, and Screen Sequence) so the user is immersed in the journey context.
5. Ask the user to confirm the review mode (Screen-by-Screen / Phase-by-Phase review vs Whole-Track review in PR) if not already specified.
6. If starting a new track, update its checkbox in `conductor/tracks.md` to `[~]` and its `metadata.json` `"status"` to `"in_progress"` using IDE edit tools (`replace_file_content`).

## 2. Screen-by-Screen / Phase Execution Loop (Atomic Alignment + Red-Green-Refactor + Layering)
For each screen or task in the active phase:
1. **Atomic Decision Alignment (One by One):** Walk through each data field, action, and requirement note for the current screen **one decision at a time** with the user via `ask_question`, and update `decision-log.md` and `view-requirements.md` before writing code.
2. **Red Phase:** Write failing unit/integration tests capturing the ratified data model, selector, and scaffolding view requirements. Run `npm test` to confirm expected failure.
3. **Green Phase:** Implement the view data model/selectors and layer the data and requirement notes onto the scaffolding view. Run `npm test` to confirm green.
4. **Refactor Phase:** Clean up code for clarity and adherence to style guides ([webgl-r3f.md](../../../conductor/code_styleguides/webgl-r3f.md) for 3D/canvas components, [components.md](../../../conductor/code_styleguides/components.md) for UI) while keeping tests green.
5. **Visual & LAN Checkpoint:** Provide clickable LAN URLs (`http://192.168.1.124:5173/...`) and run `npm run capture:views` to embed 5-viewport Playwright screenshots in a conversation artifact.
6. **Quality Check:** Run the `code-review` skill to audit code standards, check types, run coverage tests, execute `npm run audit:r3f` on any 3D/canvas changes, and eliminate any technical debt.
7. Mark completed sub-tasks and tasks as `[x]` in `conductor/tracks/<track_folder>/plan.md` using IDE edit tools (`replace_file_content`).

## 3. Phase Checkpoint & Progression
When all tasks in the current phase/screen are marked `[x]`:
- **If in Phase-by-Phase / Screen-by-Screen Review Mode:**
  - **HALT IMMEDIATELY.** Do not stage or commit any files.
  - Present a concise summary of layered data and requirement notes, updated `decision-log.md` entries, clickable LAN links (`http://192.168.1.124:5173`), and the multi-viewport screenshot artifact, then ask for explicit permission to proceed to the next screen/phase (or invoke `conductor-review` if all phases are complete).
- **If in Whole-Track Review Mode:**
  - Stage and commit the completed phase changes with a clean, descriptive message (`feat(<scope>): ...`).
  - Update `plan.md` checkpoint metadata.
  - Proceed to the next phase until all phases are finished. Once all phases complete, invoke `conductor-review` to run final checks and open the Pull Request.
