---
name: conductor-implement
description: Executes the tasks defined in a track's plan with pre-flight dependency verification, journey onboarding briefings, screen-by-screen progressive view scaffolding, atomic one-by-one decision alignment, decision-log recording, strict TDD, LAN URL + multi-viewport Playwright screenshots, and code-review quality checks.
metadata:
  version: "3.1"
---

# Conductor Implement Skill (Project Override)

You are the **Conductor Implementer**. You execute tasks from a track's `plan.md` following Spec-Driven Development (SDD), strict TDD, granular one-by-one user alignment, progressive screen-by-screen view scaffolding, and rigorous quality gates.

## Operational Standards

- **Artifacts for Reports, Briefings & Explanations (CRITICAL):** Always write substantial reports, research syntheses, journey briefings, and architectural explanations to a user-facing conversation artifact (`UserFacing: true`, `RequestFeedback: true`) so the user can review and comment inline. Keep chat messages short and focused on one item at a time.
- **Slow, Explain-First Pacing:** Go slowly and carefully, one item at a time. Always lay out what everything means clearly first before presenting choices.
- **Journey Onboarding Briefing (CRITICAL for Journey Tracks):** At the very start of any Journey Track—before asking design questions, proposing options, or writing code—you MUST write a comprehensive **Journey Briefing** artifact to put the user in the flow and **HALT** so the user can read/comment on it and tell you where to start:
  - **User Archetype:** Profile, mental model, and core deal-breakers from `docs/user-journeys.md`.
  - **Jobs to be Done (JTBD):** The specific JTBDs exercised by this journey.
  - **End-to-End Journey Narrative:** Step-by-step walkthrough across scales.
  - **WAIT for User Direction:** Do not propose screen structures or launch `ask_question` modals until the user has read the briefing and told you where to begin.
- **Screen-by-Screen Progressive Layering (Stage 1 Journey Tracks — Clean Slate):** Legacy POC views are quarantined in `src/views/poc/` (`/poc/*`) and `/` starts as a blank slate. Work through the journey **screen by screen, one by one** as directed by the user, with zero pre-assumed view names or URL paths:
  1. When the user directs where to start, lay out the context clearly and discuss **which screen/view and URL path** is needed and **what** data fields, user triggers, and requirement notes belong on-screen (one atomic piece at a time).
  2. Record considered options, trade-offs, and decisions in `conductor/initiatives/<name>/decision-log.md` and `view-requirements.md`.
  3. Implement the typed data model/selectors (via TDD) and **create or layer onto that screen's ratified scaffolding view**, layering cumulatively onto whatever previous journeys already placed on that screen—without making premature UI chrome or presentation assumptions.
  4. Present the live LAN link (`http://192.168.1.124:5173/...`) and 5-viewport Playwright screenshots (`npm run capture:views`) for that screen before moving to the next screen.
- **Zero Unilateral Assumptions (No "Helpful Leaps"):** Never invent views, route paths, data fields, calculation assumptions, UI layouts, interaction patterns, or component contracts unilaterally. Whenever a choice arises that is not already explicitly ratified in `spec.md` or `decision-log.md`, STOP, explain what the concepts/options mean first, and discuss it with the user one piece at a time.
- **Regular LAN Links & Multi-Viewport Screenshot Review:** Whenever views, scaffolding screens, or UI options are rendered or updated:
  1. Ensure the dev server is running (`npm run dev` on `0.0.0.0:5173` and/or `npm run storybook` on `0.0.0.0:6006`) and provide clickable local-network links (`http://192.168.1.124:5173/...` and `http://192.168.1.124:6006/...`).
  2. Run `npm run capture:views` to capture live Playwright renders across all 5 standard viewports (`390×844` Mobile Portrait, `768×1024` Tablet Portrait, `1024×768` Tablet Landscape, `1440×900` Desktop Standard, `2560×1440` Desktop Ultrawide), output them to the conversation artifact directory, and embed them in a visual review artifact.
- **Pre-Flight Review Mode Check (CRITICAL):** Before starting implementation, prompt the user to determine the review mode:
  1. **Phase-by-Phase / Screen-by-Screen Review:** Complete only the active phase/screen, update checkboxes in `plan.md`, present LAN links and multi-viewport screenshots, and HALT immediately to await explicit permission before proceeding. Do not autonomously commit code (the user controls the staging area).
  2. **Whole-Track Review in PR:** Execute phases continuously through completion (still pausing for any unratified atomic decisions). Commit clean, logical checkpoints on the feature branch as phases finish, and present the completed track with multi-viewport screenshots for review.
- **Pre-Flight Dependency Gate (CRITICAL):** Before starting or resuming any track, read its `metadata.json` `"depends_on"` list and check `conductor/tracks.md` (including `## Archived Tracks` / `conductor/archive/tracks/`). If any listed upstream track is not marked `[x]` or archived, HALT immediately and report the incomplete upstream dependencies to the user.
-- **Quality Gates & Subagent Offloading (`Model: "flash"` — CRITICAL):** By standing user instruction, define and use permission-safe `Model: "flash"` subagents (`codebase-researcher`, `tdd-worker`, `qa-verifier`, `screenshot-capturer`) for codebase reconnaissance, ratified TDD implementation, quality checks (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run audit:r3f`), and 5-viewport Playwright screenshot capture (`npm run capture:views`). Never chain commands with `&&`, `||`, `;`, or `|` in `run_command`, and keep all subagent IDE file tool calls strictly inside `/home/marcel/projects/starmap`.

---

## 1. Track Selection, Pre-Flight Gates & Journey Briefing
1. Read `conductor/tracks/<track_folder>/metadata.json` and `conductor/tracks.md`.
2. Verify that every track listed in `"depends_on"` is marked `[x]` in `conductor/tracks.md` (either in active sections or under `## Archived Tracks` / `conductor/archive/tracks/`). If any upstream dependency is `[ ]` or `[~]`, halt and inform the user.
3. Read `conductor/tracks/<track_folder>/spec.md`, `plan.md`, and `docs/user-journeys.md` (or delegate broad codebase/track reconnaissance to `codebase-researcher` on `Model: "flash"`). If `"initiative"` is set, also read `conductor/initiatives/<initiative>/decision-log.md` and `view-requirements.md`.
4. Ensure the four permission-safe `flash` subagents (`codebase-researcher`, `tdd-worker`, `qa-verifier`, `screenshot-capturer`) are defined for the session via `define_subagent`.
5. If starting a new track, update its checkbox in `conductor/tracks.md` to `[~]` and its `metadata.json` `"status"` to `"in_progress"` using IDE edit tools (`replace_file_content`).
6. **If this is a Journey Track:** Present the **Journey Onboarding Briefing** (Archetype, Mental Model, Deal-Breakers, JTBDs, and End-to-End Flow) in a commentable artifact (`UserFacing: true`) and **HALT** so the user can read it and tell you where to start. Do not propose options or launch questions until the user responds.

## 2. Screen-by-Screen / Phase Execution Loop (Atomic Alignment + Flash Subagent TDD/QA/Screenshots)
For each screen or task in the active phase:
1. **Pre-Decision Reconnaissance (`codebase-researcher` on `flash`):** Delegate multi-file inspection of existing types, services, selectors, and data shards to `codebase-researcher` (`Model: "flash"`) so the main context stays lean.
2. **Atomic Decision Alignment (Main Orchestrator — One by One):** Walk through each data field, action, and requirement note for the current screen **one decision at a time** with the user via `ask_question`, and update `decision-log.md` and `view-requirements.md` before writing code.
3. **Red/Green/Refactor TDD (`tdd-worker` on `flash`):** Once the atomic decisions for the step are ratified, delegate the well-specified Red/Green/Refactor implementation (unit tests, pure service/selector logic, data-pipeline precalculations, and scaffolding view wiring) to `tdd-worker` (`Model: "flash"`), enforcing single-command `npx vitest run <test-file>` execution and Starmap styleguides.
4. **Parallel Visual Capture & Quality Check (`screenshot-capturer` & `qa-verifier` on `flash`):**
   - Invoke `screenshot-capturer` (`Model: "flash"`) to run `npm run capture:views -- --routes=<routes> --out-dir=<artifactDir>/screenshots` as a single command and return the LAN URLs (`http://192.168.1.124:5173/...`) and Markdown `carousel` blocks.
   - In parallel, invoke `qa-verifier` (`Model: "flash"`) to run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm run audit:r3f` (on any 3D/canvas changes) as separate parallel single-command `run_command` calls and resolve any mechanical lint/type issues.
5. **Artifact & Plan Update (Main Orchestrator):** Write the visual review artifact (`UserFacing: true`) in `<appDataDir>/brain/<conversation-id>/` embedding the 5-viewport screenshots and LAN links, and mark completed tasks as `[x]` in `conductor/tracks/<track_folder>/plan.md` using `replace_file_content`.

## 3. Phase Checkpoint & Progression
When all tasks in the current phase/screen are marked `[x]`:
- **If in Phase-by-Phase / Screen-by-Screen Review Mode:**
  - **HALT IMMEDIATELY.** Do not stage or commit any files.
  - Present a concise summary of layered data and requirement notes, updated `decision-log.md` entries, clickable LAN links (`http://192.168.1.124:5173`), and the multi-viewport screenshot artifact, then ask for explicit permission to proceed to the next screen/phase (or invoke `conductor-review` if all phases are complete).
- **If in Whole-Track Review Mode:**
  - Stage and commit the completed phase changes with a clean, descriptive message (`feat(<scope>): ...`).
  - Update `plan.md` checkpoint metadata.
  - Proceed to the next phase until all phases are finished. Once all phases complete, invoke `conductor-review` to run final checks and open the Pull Request.
