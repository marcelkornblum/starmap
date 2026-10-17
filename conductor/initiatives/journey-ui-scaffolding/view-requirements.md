# View Requirements Inventory (`journey-ui-scaffolding`)

This living document accumulates **which screens/views and URL paths exist** and **what needs to be on-screen** across each discovered view as we work through Journeys 1–5 in Stage 1.

> [!IMPORTANT]
> **Strict Clean-Slate & Separation of Concerns (Stage 1 Rule):**
> - **Zero Pre-Assumed Views or Paths:** Legacy POC views are quarantined in `src/views/poc/` (`/poc/*`) and `/` starts as a clean slate. We do not assume which views exist or what their URL paths are ahead of time; every screen boundary and route path is ratified as we step through the journeys.
> - **What On-Screen, Not How to Present It:** Entries in this document describe **screen boundaries, URL paths, information requirements, data contracts, user triggers, and state transitions**—never visual styling, layout splits, or presentation chrome. Presentation patterns are synthesised at the transition to Stage 2.

---

## 1. Cross-Journey Feature Matrix

| Journey | Core User Goal | Status |
| :--- | :--- | :--- |
| **Journey 1: Target Acquisition & Travel Planning** | Locate target star, inspect intrinsic system summary, benchmark 2-point travel times, enter system, inspect planet | `[ ] Pending (Track 01)` |
| **Journey 2: Candidate Hunting & Territory Mapping** | Set spatial anchor, filter by radius & habitability intent, sync 2D candidate list ↔ 3D starfield, plot multi-leg route, export URL | `[ ] Pending (Track 02)` |
| **Journey 3: Serendipitous Discovery** | Trigger curated on-ramp prompt, view narrative hook & tags, step through tour waypoints (`Prev`/`Next`), expand or enter system | `[ ] Pending (Track 03)` |
| **Journey 4: Classification Deep-Dive** | Trigger classification deep-link `(i)`, inspect parameter ranges & Relative Parameter Comparator against familiar anchors, browse Category Index, return to origin | `[ ] Pending (Track 04)` |
| **Journey 5: Intra-System Logistics & Orbital Timing** | Select departure/arrival bodies in system, scrub orbital clock forward/backward, compare Hohmann vs Torchship transfers, flag solar conjunction blackout | `[ ] Pending (Track 05)` |

---

## 2. Discovered Views & On-Screen Data/Action Inventory

*(Populated from a clean slate during Tracks 01–05 as each screen boundary, route path, data field, and requirement note is discussed and ratified with the user.)*

- **Discovered Screens / Views:** *(None yet — `/` currently renders `CleanSlateRoot`; views and paths will be added one by one starting in Track 01).*

