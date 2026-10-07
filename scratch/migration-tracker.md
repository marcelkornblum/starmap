# Phase 2 Migration Tracker

This document tracks our progress through the component promotion workflow.

## The 10-Step Batch Workflow
1. [ ] Identify batch & confirm with user.
2. [ ] Launch a `flash` subagent to execute the folder migration and story scaffolding. Use the exact prompt below:
   > **Prompt for Subagent:** "You are tasked with migrating the components for the current batch. First, move the component folders from `src/components/poc/...` to `src/components/...`. Next, fix any broken imports across the codebase caused by this move. Finally, ensure every component has a `.stories.tsx` file. Strip any hardcoded `title: 'POC/...'` from the stories. Try to create exactly one single story per component unless you explicitly check with me first. Report back when complete."
3. [ ] Restart Storybook server.
4. [ ] Audit against `conductor/code_styleguides/*`.
5. [ ] Audit for code smells & architectural issues.
6. [ ] Audit token & CUBE CSS compliance.
7. [ ] Present audit findings & prompt user to review the basic running Storybook. Await feedback.
8. [ ] Apply component fixes and configure the Storybook stories based on user feedback. **Ensure every single story renders with a bold title and a concise description of its usage and purpose. Ensure stories are scrollable if content overflows (e.g., overriding global body lock if necessary).**
9. [ ] Run full CI suite (lint, typecheck, tests).
10. [ ] Commit and push to PR.

---

## Batches

### ✅ Batch 1: INTERFACE > Layout
*Components: Box, Center, Cluster, Cover, Frame, Grid, Icon, Imposter, Reel, Sidebar, Stack, Switcher*
- **Status:** Complete (Promoted to `feat/phase2-migration`)

### ✅ Batch 2: INTERFACE > Control
*Components: Button, Input, Select, Slider, Toggle*
- **Status:** Complete (Promoted to `feat/phase2-migration`)

### 📅 Future Batches (Based on original spec)
- **CANVAS > Scenes** (Galaxy, System, Planet)
- **CANVAS > Entities > Celestial Entity** (Default, Reticles, Drop Stalks, Vectors, Hitareas)
- **CANVAS > Entities > Planet Body** (Default, Textures)
- **CANVAS > Instrument** (Galactic reference scale)
