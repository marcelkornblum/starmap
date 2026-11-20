---
name: conductor-new-track
description: Plans a new Starmap track (feature, bug fix or chore) with initiative/phase/depends_on metadata, atomic one-by-one decision alignment, backlog graduation, and registry updates.
metadata:
  version: "4.0"
---

# Conductor New Track

Define and scaffold a track (`spec.md`, `plan.md`, `metadata.json`, `index.md`) per [`conductor/workflow.md`](../../../conductor/workflow.md). Never invent requirements, data fields or UI layouts; discuss each choice one at a time (`ask_question`) with concrete options and trade-offs.

## 1. Context

Read `conductor/index.md`, `conductor/tech-stack.md`, `conductor/workflow.md` and `conductor/tracks.md`. If the track belongs to an initiative, read its `index.md` and `decision-log.md`. If graduating from `conductor/backlog.md`, read the backlog entry.

## 2. Classification (one decision at a time)

1. **Initiative or standalone?** New initiative: scaffold `conductor/initiatives/<name>/index.md` and `decision-log.md`. Existing initiative: assign `<NN>` ordering and `phase`.
2. **Dependencies:** list upstream track folder names in `depends_on`.
3. **Scope:** walk through requirements atomically; record decisions in `decision-log.md` (initiative tracks) or the spec (standalone).

## 3. Spec and plan

1. **`spec.md`:** Overview, Scope, Out of Scope, Functional / Non-Functional Requirements, Acceptance Criteria. Confirm with the user first.
2. **`plan.md`:** phases of Red / Green / Refactor tasks. End each phase with a checkpoint task: `standards` cleanup, `npm run lint`, `npm run typecheck`, `npm run audit:guards`, `npm run test:coverage`. For UI changes add a visual review task (`npm run capture:views`, see `conductor/local-review-and-screenshots.md`). Add a final task: update `CHANGELOG.md`. Confirm with the user.

## 4. Create artifacts

1. **Folder:** initiative track `conductor/tracks/<initiative>_<NN>_<slug>_<YYYYMMDD>/`; standalone `conductor/tracks/<slug>_<YYYYMMDD>/`.
2. **`metadata.json`:**
   ```json
   {
     "id": "<track_folder_name>",
     "type": "feature",
     "status": "new",
     "created_at": "<ISO-8601>",
     "updated_at": "<ISO-8601>",
     "initiative": "<name or null>",
     "phase": 1,
     "depends_on": []
   }
   ```
3. **Registry:** add `- [ ] **Track: <Title>** *Link: [conductor/tracks/<folder>/index.md](./tracks/<folder>/index.md)*` to `conductor/tracks.md` under the right heading.
4. **Backlog:** if graduated from `conductor/backlog.md`, remove the entry there.
5. Commit on a feature or chore branch (`chore(conductor): scaffold track <folder>`, never on `main`, no git notes), then ask whether to begin implementation.
