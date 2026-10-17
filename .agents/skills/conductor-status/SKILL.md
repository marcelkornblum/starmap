---
name: conductor-status
description: Displays the current progress of the project by reading conductor/tracks.md, initiative decision logs, track metadata.json files, and active track plans.
metadata:
  version: "3.0"
---

# Conductor Status Skill (Project Override)

You are an AI agent providing a status overview of the project's multi-track initiatives, Stage 1 vs Stage 2 readiness, open decision log items, and active track plans directly from `conductor/tracks.md`, `conductor/initiatives/*/decision-log.md`, and track `metadata.json` files.

## Operational Standards

- **Direct Markdown & JSON Inspection:** Read `conductor/tracks.md`, `conductor/initiatives/*/decision-log.md`, and `conductor/tracks/*/metadata.json` directly.
- **Archived Dependency Recognition:** Any track marked `[x]` in `conductor/tracks.md` (including under `## Archived Tracks`) or present in `conductor/archive/tracks/` satisfies `"depends_on"` requirements.
- **No Autonomous Git Mutations:** Never stage (`git add`), unstage, or commit files.
- **Path Integrity:** Always use relative links starting from the project root.

---

## 1. Status Overview Protocol

1. **Read Registry, Initiatives & Metadata:**
   - Read `conductor/tracks.md` to identify all active tracks, their Initiative and Stage groupings, and their checkbox status (`[x]`, `[~]`, `[ ]`), as well as archived tracks.
   - For active initiatives, read `conductor/initiatives/<name>/decision-log.md` to count `Ratified`, `Provisional`, and `Open` decisions.
   - For incomplete tracks (`[ ]` or `[~]`), read their `conductor/tracks/<track_folder>/metadata.json` to inspect `"phase"` and `"depends_on"`.
2. **Inspect In-Progress Tracks (`[~]`):**
   - For any track marked `[~]`, read its `conductor/tracks/<track_folder>/plan.md` to identify the active phase and current task.
3. **Determine Readiness for Pending Tracks (`[ ]`):**
   - **Ready:** All track folder names listed in `"depends_on"` are marked `[x]` in `conductor/tracks.md` or archived in `conductor/archive/tracks/` (or `"depends_on"` is empty).
   - **Blocked:** One or more track folder names in `"depends_on"` are not yet marked `[x]`.
4. **Present Status Overview:**
   - **Programme Summary:** Breakdown of Initiatives (`completed / total tracks` per stage, plus Decision Log tally) and Standalone/Downstream tracks.
   - **Active Work (`[~]`):** Current track, phase, and task in progress.
   - **Ready Queue:** Unblocked `[ ]` tracks ready for immediate execution, ordered by Initiative & Stage/Phase.
   - **Blocked Queue:** Pending `[ ]` tracks currently waiting on upstream `depends_on` tracks.
   - **Local Network Review Endpoints:** Remind the user of the deterministic LAN endpoints (`http://192.168.1.124:5173` for App, `http://192.168.1.124:6006` for Storybook).
