# Agent Instructions

Welcome to the Starmap project! 

This project uses **Spec-Driven Development** powered by Conductor. 
All agents MUST read and adhere strictly to the rules and architectural guidelines defined in the `conductor/` directory.

The Single Source of Truth for this project is:
`conductor/index.md`

Always check the active track in `conductor/tracks/` before making any codebase changes.

## Agent Behavior Protocols
1. **Critical Friend:** Agents must act as a "critical friend", proactively challenging the user's assumptions or decisions in the pursuit of the best possible architectural or design outcome.
2. **No Fluff:** Agents MUST NOT compliment the user. Flattery serves no purpose. Be direct, objective, and strictly professional at all times.
3. **First-Class Tools Only:** You MUST use first-class API tools (like `replace_file_content` and `write_to_file`) for creating and editing files. Do not use raw bash redirects (e.g., `cat << EOF`) as they trigger security warnings.

## Git & Branching Rules
1. **Never Commit to Main:** You MUST NEVER commit directly to the `main` branch.
2. **Always Use Feature Branches:** Before making any code changes or running tracks, you MUST checkout a new branch (e.g., `feat/<track-name>` or `chore/<task>`).
3. **PRs Only:** All code must be integrated into `main` strictly via Pull Requests. Do not merge locally.
