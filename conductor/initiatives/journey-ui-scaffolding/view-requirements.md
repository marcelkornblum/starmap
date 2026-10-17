# View Requirements Inventory (`journey-ui-scaffolding`)

This living document accumulates **what** needs to be on-screen across each view (`GalaxyView`, `SystemView`, `PlanetView`, `ReferenceView`) as we work through Journeys 1–5 in Stage 1.

> [!IMPORTANT]
> **Strict Separation of Concerns (Stage 1 Rule):**
> Entries in this document describe **information requirements, data contracts, user triggers, and state transitions**—never visual styling, layout splits, or presentation chrome. Presentation patterns are synthesised at the transition to Stage 2.

---

## 1. Cross-Journey Feature Matrix

| Journey | Primary Scale(s) | Core User Goal | Status |
| :--- | :--- | :--- | :--- |
| **Journey 1: Target Acquisition & Travel Planning** | Galaxy → System → Planet | Locate target star, inspect intrinsic system summary, benchmark 2-point travel times, enter system, inspect planet | `[ ] Pending (Track 01)` |
| **Journey 2: Candidate Hunting & Territory Mapping** | Galaxy → System | Set spatial anchor, filter by radius & habitability intent, sync 2D candidate list ↔ 3D starfield, plot multi-leg route, export URL | `[ ] Pending (Track 02)` |
| **Journey 3: Serendipitous Discovery** | Galaxy → System | Trigger curated on-ramp prompt, view narrative hook & tags, step through tour waypoints (`Prev`/`Next`), expand or enter system | `[ ] Pending (Track 03)` |
| **Journey 4: Classification Deep-Dive** | Any Scale ↔ Reference | Trigger classification deep-link `(i)`, inspect parameter ranges & Relative Parameter Comparator against familiar anchors, browse Category Index, return to origin | `[ ] Pending (Track 04)` |
| **Journey 5: Intra-System Logistics & Orbital Timing** | System | Select departure/arrival bodies in system, scrub orbital clock forward/backward, compare Hohmann vs Torchship transfers, flag solar conjunction blackout | `[ ] Pending (Track 05)` |

---

## 2. View-by-View On-Screen Data & Action Inventory

*(Populated incrementally during Tracks 01–05 after each atomic requirement is discussed and ratified with the user.)*

### 2.1 Galaxy Scale (`GalaxyView`)
- **Required On-Screen Data Fields:** *(To be populated in Tracks 01, 02, 03)*
- **Required User Triggers / Actions:** *(To be populated in Tracks 01, 02, 03)*
- **State Transitions & URL Parameters:** *(To be populated in Tracks 01, 02, 03)*

### 2.2 System Scale (`SystemView`)
- **Required On-Screen Data Fields:** *(To be populated in Tracks 01, 02, 05)*
- **Required User Triggers / Actions:** *(To be populated in Tracks 01, 02, 05)*
- **State Transitions & URL Parameters:** *(To be populated in Tracks 01, 02, 05)*

### 2.3 Planet Scale (`PlanetView`)
- **Required On-Screen Data Fields:** *(To be populated in Track 01)*
- **Required User Triggers / Actions:** *(To be populated in Track 01)*
- **State Transitions & URL Parameters:** *(To be populated in Track 01)*

### 2.4 Encyclopedia / Reference Scale (`ReferenceView`)
- **Required On-Screen Data Fields:** *(To be populated in Track 04)*
- **Required User Triggers / Actions:** *(To be populated in Track 04)*
- **State Transitions & URL Parameters:** *(To be populated in Track 04)*

### 2.5 Global / Cross-View Context (Navigation, Active Anchors, Route State, Search/Filter State)
- **Required On-Screen Data Fields:** *(To be populated across Tracks 01–05)*
- **Required User Triggers / Actions:** *(To be populated across Tracks 01–05)*
