---
name: conductor-status
description: Reports Starmap programme progress by reading conductor/tracks.md, track metadata.json files, active plans, and initiative decision logs.
metadata:
  version: "4.0"
---

# Conductor Status

Read-only overview of programme state. Never stage, unstage or commit files. Use project-root-relative paths.

## Protocol

1. Read `conductor/tracks.md` for active tracks (`[x]`, `[~]`, `[ ]`) and archived tracks, and `conductor/backlog.md` for the backlog headline count.
2. For each incomplete track, read `conductor/tracks/<folder>/metadata.json` (`status`, `initiative`, `phase`, `depends_on`).
3. For `[~]` tracks, read `plan.md` to find the active phase and current task.
4. If any active initiative exists under `conductor/initiatives/`, read its `decision-log.md` and tally Ratified / Provisional / Open decisions.
5. **Readiness:** a `[ ]` track is *Ready* when `depends_on` is empty or every entry is `[x]` in `conductor/tracks.md` or archived in `conductor/archive/tracks/`; otherwise *Blocked* (name the blockers).

## Report

- **Programme summary:** initiatives (completed / total tracks, decision tally) and standalone tracks.
- **Active work:** track, phase, current task.
- **Ready queue** and **Blocked queue.**
- **Review endpoints:** point to `conductor/local-review-and-screenshots.md` for `<LAN_HOST>` app (`5173`) and Storybook (`6006`) URLs.
