# Authoritative Astronomical Data Sources Specification

This document defines the complete roster of authoritative astronomical datasets, surveys, and ephemeris catalogs agreed upon for the Starmap data pipeline architecture. 

It details the scientific authority, data format, scope, pipeline role, target artifacts, and current integration status for every source across all architectural layers.

---

## Architectural Principles & Scope Boundaries

1. **Spatial Volume Boundary:** Strictly bounded to the **100-parsec solar neighborhood** ($\sim 326.156\text{ light-years}$ radius around Sol).
2. **Priority Hierarchy:** **Completeness > Accuracy > Performance**.
3. **Serving & LOD Strategy:**
   - **Atlas View (Macro):** Collapsed `SystemSummaryNode` representations sharded into 25-parsec cubic spatial sectors (`public/data/partitions/sector_*.json`).
   - **System View (Micro):** On-demand detailed `SystemManifest` bundles containing individual stellar components, full Keplerian orbits, physical metrics, and habitability evaluations (`public/data/systems/sector_*.json`).
   - **Overlays & Catalogs:** Dedicated topic indices for exoplanets, galactic structures, naked-eye bright reference stars, and solar system ephemerides.
4. **Offline Build Pipeline:** All raw data acquisition and harmonization occurs offline via Node.js streams (`scripts/fetch-sources.ts` and `scripts/build-data.ts`). Runtime client loads zero raw catalogs.

---

## Complete Data Sources Master Table

| # | Layer | Source Name | Scientific Authority | Scope / Volume | Purpose in Starmap | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | Layer 1 | **Gaia Catalogue of Nearby Stars (GCNS / Gaia DR3)** | ESA / Gaia DPAC / CDS | 331,312 stars ($\le 100\text{ pc}$) | Foundational 100-pc stellar spine; 5-parameter astrometry, 3D space velocities, $G/BP/RP$ photometry. | **Pending Ingestion** |
| **02** | Layer 1 | **HYG Database (v3)** | Astronexus / Hipparcos / Yale / Gliese | 119,614 stars (all sky) | Historical cross-identifications (HIP, HD, HR, Gliese), Bayer/Flamsteed designations, spectral types. | **Integrated** |
| **03** | Layer 1 | **IAU WGSN Star Names Gazetteer** | International Astronomical Union (IAU) | 451 named stars | Official common stellar names (Sirius, Betelgeuse, Proxima Centauri) replacing raw catalog IDs. | **Integrated** (Seed) |
| **04** | Layer 1 | **RECONS 10-Parsec Census** | Research Consortium On Nearby Stars | $\sim 350$ systems ($\le 10\text{ pc}$) | Ground-truth census for ultra-cool red dwarfs, white dwarfs, and brown dwarfs within 10 pc. | **Partial** (3 seed) |
| **05** | Layer 1 | **CDS SIMBAD Astronomical Database** | Centre de Données astronomiques de Strasbourg | All-sky cross-matches | Resolving multi-catalog designations, aliases, and astronomical identifiers. | **Pending Ingestion** |
| **06** | Layer 1 | **AAVSO Variable Star Index (VSX) & GCVS** | AAVSO / Sternberg Astronomical Inst. | All variable stars | Classifying variable stars (Cepheids, flare stars, eclipsing binaries), period ($P$), and amplitude ($\Delta V$). | **Pending Ingestion** |
| **07** | Layer 2 | **Open Exoplanet Catalogue (OEC)** | Open Science Community / H. Rein | 5,414 confirmed planets | Hierarchical multi-star and exoplanetary orbital architectures, circumbinary planets, multi-component systems. | **Integrated** |
| **08** | Layer 2 | **NASA Exoplanet Archive (PS & PSCompPars)** | NASA NExScI / Caltech / IPAC | 5,700+ confirmed planets | Authoritative planetary parameters ($M_p, R_p, T_{\text{eq}}$, transit depth) and Keplerian orbital elements ($a, e, i, \omega, \Omega$). | **Pending Ingestion** |
| **09** | Layer 2 | **The Extrasolar Planets Encyclopaedia** | Paris Observatory (Exoplanet.eu) | 5,800+ planets | Independent European verification catalog for candidate and newly confirmed planetary systems. | **Pending Ingestion** |
| **10** | Layer 2 | **PHL Habitable Worlds Catalog (HWC)** | Planetary Habitability Lab (Arecibo) | Confirmed HZ candidates | Earth Similarity Index (ESI), stellar insolation flux ($S/S_0$), and habitable zone candidate flags. | **Pending Ingestion** |
| **11** | Layer 2 | **IAU NameExoWorlds Gazetteer** | International Astronomical Union (IAU) | 100+ systems | Officially approved cultural/proper names for host stars and exoplanets (e.g. 51 Pegasi b $\rightarrow$ *Dimidium*). | **Integrated** (Seed) |
| **12** | Layer 3 | **Cantat-Gaudin Open Clusters Catalog** | T. Cantat-Gaudin et al. / CDS VizieR | 2,017 open clusters | 3D Cartesian coordinates, proper motions, parallax distances, cluster member counts, and ages. | **Pending Ingestion** |
| **13** | Layer 3 | **Harris Globular Cluster Catalog (2010)** | W. E. Harris (McMaster Univ.) | 157 globular clusters | Milky Way globular cluster coordinates, core-collapse status, metallicity $[\text{Fe/H}]$, structural concentration. | **Pending Ingestion** |
| **14** | Layer 3 | **Green's Catalogue of Galactic SNRs** | D. A. Green (Cavendish Lab, Cambridge) | 294 remnants | Supernova remnants (SNRs) with coordinates, angular diameters, radio flux densities, and remnant morphology. | **Pending Ingestion** |
| **15** | Layer 3 | **ATNF Pulsar Database** | Australia Telescope National Facility | 3,300+ pulsars | Pulsars and magnetars with spin period ($P$), period slowdown derivative ($\dot{P}$), distance, and magnetic field ($B$). | **Pending Ingestion** |
| **16** | Layer 3 | **HASH Planetary Nebula Database** | HKU / Laboratory for Space Research | 3,500+ planetary nebulae | Galactic planetary nebulae coordinates, shell morphologies, expansion velocities, and central star data. | **Pending Ingestion** |
| **17** | Layer 3 | **Sharpless (Sh2), Gum & RCW Catalogs** | Stewart Sharpless / Colin Gum / RCW | Giant H II complexes | Galactic ionized hydrogen emission complexes and massive star-forming nebulae along local spiral arms. | **Pending Ingestion** |
| **18** | Layer 3 | **Dobashi & Barnard Dark Cloud Catalogs** | K. Dobashi et al. / E. E. Barnard | Dark molecular clouds | Galactic molecular dust lanes, opaque silhouette nebulae, and cold molecular cloud boundaries. | **Pending Ingestion** |
| **19** | Layer 3 | **Master Deep Sky Index (Messier, Caldwell, NGC)** | Dreyer / SEDS / Open NGC | Major deep-sky objects | Popular deep-sky landmarks (*Pleiades, Orion Nebula, Crab Nebula, Omega Centauri*) and navigational markers. | **Integrated** (21 objects) |
| **20** | Layer 4 | **NASA JPL Horizons On-Line Ephemeris System** | NASA JPL Solar System Dynamics | Sun, 8 planets, >290 moons | High-precision Barycentric state vectors and Keplerian osculating orbital elements for primary Solar System bodies. | **Integrated** (Seed) |
| **21** | Layer 4 | **IAU Minor Planet Center (`MPCORB.DAT`)** | IAU / Smithsonian Astrophysical Obs. | 1.3M+ minor planets | Comprehensive Keplerian orbital elements for all numbered asteroids, Trojans, Centaurs, KBOs, and comets. | **Pending Ingestion** |
| **22** | Layer 4 | **NASA JPL Small-Body Database (SBDB)** | NASA JPL / Caltech | 1.3M+ asteroids/comets | Physical attributes: absolute magnitude ($H$), slope ($G$), diameter, geometric albedo, rotation period, taxonomy. | **Pending Ingestion** |
| **23** | Layer 4 | **IAU WGSBN Small Body Names Bulletins** | International Astronomical Union (IAU) | >24,000 named bodies | Official proper names and discovery citations for numbered minor planets (e.g. *Ceres, Eros, Apophis, Arrokoth*). | **Pending Ingestion** |
| **24** | Layer 4 | **NASA JPL Sentry & Close Approach Data (CAD)** | NASA CNEOS | Near-Earth Objects (NEOs) | Near-Earth Asteroid (NEA) and Potentially Hazardous Asteroid (PHA) trajectory flybys, dates, and miss distances. | **Pending Ingestion** |
| **25** | Layer 4 | **JPL Cometary Non-Gravitational Parameters** | NASA JPL SSD | Periodic & historic comets | Outgassing acceleration coefficients ($A_1, A_2, A_3$) modeling sublimation thrust near perihelion. | **Pending Ingestion** |
| **26** | Layer 5 | **Space-Track.org / CelesTrak (US Space Command)** | USSPACECOM / CelesTrak | >45,000 artificial objects | *Deferred:* Dynamic SGP4/SDP4 TLE propagation for active satellites, rocket bodies, and tracked space debris. | **Deferred** |
| **27** | Layer 5 | **NASA JPL Horizons Spacecraft Roster** | NASA JPL SSD | Deep space probes | *Deferred:* High-precision trajectories for interplanetary missions (Voyager 1/2, Pioneer 10/11, New Horizons, JWST). | **Deferred** |
| **28** | Layer 5 | **Lunar & Martian Surface Relics Database** | NASA / ESA / CNSA / ISRO | Surface landers & rovers | *Deferred:* Static coordinates for historical landers, rovers, and Apollo lunar descent stages. | **Deferred** |
| **29** | Layer 5 | **ESA DISCOS & Jonathan McDowell's GCASO** | ESA / J. McDowell (Harvard-Smithsonian) | Historical satellite log | *Deferred:* Spacecraft operational status, wet/dry mass, dimensions, launching country, and historical launch logs. | **Deferred** |

---

## Detailed Data Source Breakdown by Layer

### Layer 1: Stars & Kinematics (Solar Neighborhood $\le 100\text{ pc}$)

#### 1. Gaia Catalogue of Nearby Stars (GCNS / Gaia DR3)
- **Scientific Authority:** European Space Agency (ESA) / Gaia Data Processing and Analysis Consortium (DPAC).
- **Upstream Resource:** CDS VizieR Catalog `J/A+A/649/A6` (`table1c.dat.gz`, 72 MB compressed).
- **Scope:** 331,312 verified stars within 100 parsecs of Sol.
- **Fields Provided:** `source_id`, `ra`, `dec`, `parallax`, `parallax_error`, `pmra`, `pmdec`, `phot_g_mean_mag`, `phot_bp_mean_mag`, `phot_rp_mean_mag`, `radial_velocity`.
- **Purpose in Starmap:** The core astronomical backbone. Provides complete volume-limited positions and 3D kinematics for all stars within 100 parsecs, replacing magnitude-limited subsets with a complete census.
- **Target Artifact:** `public/data/partitions/sector_*.json` and `public/data/stars.json`.

#### 2. HYG Star Database (v3)
- **Scientific Authority:** Astronexus (D. Nash) / Hipparcos / Yale Bright Star / Gliese.
- **Upstream Resource:** Git repository / Codeberg CSV (`hyglike_from_athyg_v32.csv.gz`, 31.9 MB).
- **Scope:** 119,614 stars (all sky).
- **Fields Provided:** `id`, `hip`, `hd`, `hr`, `gl`, `bayer`, `flam`, `con`, `proper`, `spect`, `ci`, `lum`, `vx`, `vy`, `vz`.
- **Purpose in Starmap:** Cross-identification bridge providing traditional naming (Bayer, Flamsteed, Constellation), spectral classifications (MK types), and pre-computed kinematics.
- **Target Artifact:** `public/data/catalogs/reference-bright-stars.json` and system manifests.

#### 3. IAU Working Group on Star Names (WGSN) Gazetteer
- **Scientific Authority:** International Astronomical Union (IAU) Division C.
- **Upstream Resource:** IAU WGSN Official Bulletins & CDS catalogue.
- **Scope:** 451 formally approved proper star names.
- **Fields Provided:** `proper_name`, `wgsn_id`, `hip`, `hd`, `constellation`, `approval_date`.
- **Purpose in Starmap:** Human-readable landmark navigation. Replaces numeric identifiers with proper names (e.g. *Rigil Kentaurus*, *Vega*, *Arcturus*, *Canopus*).
- **Target Artifact:** `public/data/catalogs/reference-bright-stars.json` and sector summaries.

#### 4. RECONS 10-Parsec Census
- **Scientific Authority:** Research Consortium On Nearby Stars (RECONS / T. J. Henry et al.).
- **Upstream Resource:** RECONS 10-parsec census bulletins (`recons.org`).
- **Scope:** ~350 verified stellar systems within 10.0 parsecs.
- **Fields Provided:** `system_name`, `spectral_type`, `multiplicity`, `distance_pc`, `components`.
- **Purpose in Starmap:** Ground-truth completeness for faint red dwarfs, white dwarfs, and brown dwarf binaries (e.g. Luhman 16, WISE 0855) often missing from optical astrometric pipelines.
- **Target Artifact:** `public/data/catalogs/solar-neighborhood-10pc.json`.

#### 5. CDS SIMBAD Astronomical Database
- **Scientific Authority:** Centre de Données astronomiques de Strasbourg (CDS).
- **Upstream Resource:** CDS Sesame / SIMBAD TAP query service.
- **Scope:** Astronomical cross-identifications.
- **Fields Provided:** `main_id`, `aliases`, `morphological_type`, `sp_type`.
- **Purpose in Starmap:** Automated resolving of multi-catalog names, ensuring user searches across HD, HIP, Gliese, or 2MASS resolve to the single correct system.
- **Target Artifact:** Search indices and system manifests.

#### 6. AAVSO Variable Star Index (VSX) & GCVS
- **Scientific Authority:** American Association of Variable Star Observers (AAVSO) / Sternberg Astronomical Institute.
- **Upstream Resource:** AAVSO VSX API / CDS `B/gcvs`.
- **Scope:** All confirmed variable stars within 100 pc.
- **Fields Provided:** `var_type`, `period_days`, `epoch_max`, `mag_min`, `mag_max`.
- **Purpose in Starmap:** Stellar variability layer. Allows filtering by variable type (Cepheids, RR Lyrae, Flare stars, Cataclysmic) and drives UI pulsation animations.
- **Target Artifact:** `public/data/overlays/variable-stars.json`.

---

### Layer 2: Extrasolar Planets & Habitability

#### 7. Open Exoplanet Catalogue (OEC)
- **Scientific Authority:** Open Science Community (H. Rein et al.).
- **Upstream Resource:** GitHub raw CSV / XML (`oec_tables`).
- **Scope:** 5,414 confirmed exoplanets.
- **Fields Provided:** `name`, `binary_flag`, `mass`, `radius`, `period`, `semimajoraxis`, `eccentricity`, `inclination`, `temperature`, `discoverymethod`, `discoveryyear`.
- **Purpose in Starmap:** Multi-body hierarchical representations (A/B/C stellar components and circumbinary orbits).
- **Target Artifact:** `public/data/systems/sector_*.json` and `public/data/overlays/exoplanetary-systems.json`.

#### 8. NASA Exoplanet Archive (PS & PSCompPars)
- **Scientific Authority:** NASA Exoplanet Science Institute (NExScI) / Caltech / IPAC.
- **Upstream Resource:** Planetary Systems (PS) Table via TAP API (`https://exoplanetarchive.ipac.caltech.edu/TAP`).
- **Scope:** 5,700+ confirmed exoplanets.
- **Fields Provided:** `pl_name`, `hostname`, `sy_snum`, `sy_pnum`, `pl_orbper`, `pl_smasu`, `pl_bmasse`, `pl_rade`, `pl_eqt`, `pl_insol`, `st_teff`, `st_rad`, `st_mass`.
- **Purpose in Starmap:** Authoritative source for physical planetary parameters, transit geometry, and host star properties.
- **Target Artifact:** Deep system manifests in `public/data/systems/`.

#### 9. The Extrasolar Planets Encyclopaedia (Exoplanet.eu)
- **Scientific Authority:** Paris Observatory.
- **Upstream Resource:** Exoplanet.eu CSV catalog / VO-table.
- **Scope:** 5,800+ confirmed and candidate exoplanets.
- **Fields Provided:** Direct detection confirmations, radial velocity semi-amplitudes ($K$), planetary atmospheric detections.
- **Purpose in Starmap:** Cross-validation with NASA archive to resolve contested detections and incorporate European survey discoveries.
- **Target Artifact:** System manifest validation.

#### 10. PHL Habitable Worlds Catalog (HWC)
- **Scientific Authority:** Planetary Habitability Laboratory (University of Puerto Rico at Arecibo).
- **Upstream Resource:** PHL HWC online database (`phl.upr.edu`).
- **Scope:** Confirmed exoplanets in the habitable zone.
- **Fields Provided:** `ESI` (Earth Similarity Index), `habitable_class`, `flux_earth`, `temp_surface_est`.
- **Purpose in Starmap:** Habitability filtering and system badges (`hasHabitableCandidate`, `ESI > 0.8`).
- **Target Artifact:** `public/data/overlays/exoplanetary-systems.json` and system manifests.

#### 11. IAU NameExoWorlds Gazetteer
- **Scientific Authority:** International Astronomical Union (IAU) Executive Committee.
- **Upstream Resource:** IAU NameExoWorlds official records.
- **Scope:** 100+ public-named exoplanetary systems.
- **Fields Provided:** `star_proper_name`, `planet_proper_name`, `country_origin`, `citation`.
- **Purpose in Starmap:** Attaching recognized proper names (e.g. *51 Pegasi b $\rightarrow$ Dimidium*, *HD 209458 b $\rightarrow$ Osiris*, *55 Cancri e $\rightarrow$ Janssen*).
- **Target Artifact:** System manifest nomenclature and search indices.

---

### Layer 3: Galactic Structures & Deep Sky

#### 12. Cantat-Gaudin Open Clusters Catalog
- **Scientific Authority:** T. Cantat-Gaudin, C. Jordi, et al.
- **Upstream Resource:** CDS VizieR `J/A+A/640/A1` (`table1.dat`).
- **Scope:** 2,017 Galactic open clusters characterized via Gaia DR2/EDR3 astrometry.
- **Fields Provided:** `Cluster`, `RAdeg`, `DEdeg`, `Plx`, `pmRA`, `pmDE`, `Dist`, `logAge`, `r50` (half-mass radius), `nb_stars`.
- **Purpose in Starmap:** Macro-scale stellar associations within and surrounding the 100 pc volume (e.g. Hyades at 47 pc, Coma Berenices at 86 pc, Pleiades at 136 pc).
- **Target Artifact:** `public/data/overlays/galactic-structures.json`.

#### 13. Harris Globular Cluster Catalog (2010 Edition)
- **Scientific Authority:** W. E. Harris (McMaster University).
- **Upstream Resource:** McMaster University Globular Cluster Database.
- **Scope:** 157 Milky Way globular clusters.
- **Fields Provided:** `ID`, `RAdeg`, `DEdeg`, `Dist_kpc`, `[Fe/H]`, `V_mag`, `c` (concentration parameter), `r_c` (core radius).
- **Purpose in Starmap:** Deep-sky halo navigation reference and galactic coordinate landmarks.
- **Target Artifact:** `public/data/overlays/galactic-structures.json`.

#### 14. Green's Catalogue of Galactic Supernova Remnants
- **Scientific Authority:** D. A. Green (Mullard Radio Astronomy Observatory / Cambridge).
- **Upstream Resource:** Cavendish Laboratory SNR Catalogue (2022 edition).
- **Scope:** 294 known Galactic supernova remnants.
- **Fields Provided:** `SNR_name`, `RAdeg`, `DEdeg`, `Size_arcmin`, `Type` (shell, plerion, composite), `Flux_1GHz`.
- **Purpose in Starmap:** Highlighting high-energy explosive remnants and stellar remnant bubbles near the Solar Neighborhood (e.g. Cygnus Loop, Vela SNR).
- **Target Artifact:** `public/data/overlays/galactic-structures.json`.

#### 15. ATNF Pulsar Database
- **Scientific Authority:** Australia Telescope National Facility (CSIRO).
- **Upstream Resource:** Manchester et al. (2005) ATNF online catalog (`https://www.atnf.csiro.au/research/pulsar/psrcat/`).
- **Scope:** 3,300+ rotation-powered pulsars, millisecond pulsars, and magnetars.
- **Fields Provided:** `JName`, `RAJ`, `DecJ`, `P0` (period in s), `P1` (period derivative $\dot{P}$), `DM` (dispersion measure), `Dist_kpc`, `BSurf` (magnetic field in Gauss).
- **Purpose in Starmap:** Relativistic navigation markers and stellar graveyard layer.
- **Target Artifact:** `public/data/overlays/galactic-structures.json`.

#### 16. HASH Planetary Nebula Database
- **Scientific Authority:** Laboratory for Space Research (HKU) / CDS.
- **Upstream Resource:** Hong Kong/AAO/Strasbourg H-alpha PN Database (`hashpn.space`).
- **Scope:** ~3,500 planetary nebulae.
- **Fields Provided:** `PNG_name`, `RAdeg`, `DEdeg`, `Morphology`, `Diameter_arcsec`, `Exp_velocity_kms`.
- **Purpose in Starmap:** Visual stellar death remnants (e.g. Ring Nebula, Dumbbell Nebula, Helix Nebula at 200 pc).
- **Target Artifact:** `public/data/overlays/galactic-structures.json`.

#### 17. Sharpless (Sh2), Gum, and RCW Catalogs
- **Scientific Authority:** S. Sharpless (1959), C. S. Gum (1955), A. W. Rodgers et al. (1960).
- **Upstream Resource:** CDS `VII/20`, `VII/216`.
- **Scope:** Giant Galactic H II emission complexes.
- **Fields Provided:** `Sh2_id`, `RAdeg`, `DEdeg`, `Angular_size`, `Distance_est`, `Brightness_class`.
- **Purpose in Starmap:** Rendering diffuse emission clouds and star-forming nebulae along the Orion-Cygnus arm.
- **Target Artifact:** `public/data/overlays/galactic-structures.json`.

#### 18. Dobashi & Barnard Dark Cloud Catalogs
- **Scientific Authority:** K. Dobashi et al. (2005) / E. E. Barnard (1927).
- **Upstream Resource:** 2MASS-based dark cloud catalog (CDS `J/A+A/444/877`).
- **Scope:** Opaque molecular dust clouds and dark nebulae.
- **Fields Provided:** `Cloud_id`, `RAdeg`, `DEdeg`, `Optical_extinction_Av`, `Area_deg2`.
- **Purpose in Starmap:** Visual rendering of molecular dust silhouettes (e.g. Barnard 68, Taurus Dark Cloud).
- **Target Artifact:** Volumetric galactic dust overlay.

#### 19. Master Deep Sky Index (Messier, Caldwell, NGC, IC)
- **Scientific Authority:** J. L. E. Dreyer / SEDS / Open NGC Project.
- **Upstream Resource:** Open NGC GitHub database / CDS `VII/118`.
- **Scope:** 110 Messier objects, 109 Caldwell objects, 7,840 NGC objects.
- **Fields Provided:** `Catalog_id`, `Common_name`, `RAdeg`, `DEdeg`, `Type`, `V_mag`, `Distance_ly`.
- **Purpose in Starmap:** Primary visual search index and amateur astronomy reference landmarks.
- **Target Artifact:** `public/data/overlays/galactic-structures.json`.

---

### Layer 4: Solar System Natural Bodies & Orbits

#### 20. NASA JPL Horizons On-Line Ephemeris System
- **Scientific Authority:** NASA Jet Propulsion Laboratory (Solar System Dynamics Group).
- **Upstream Resource:** JPL Horizons Batch/API (`ssd.jpl.nasa.gov/horizons_api.cgi`).
- **Scope:** Sun, 8 major planets, dwarf planets (Pluto, Ceres, Eris, Haumea, Makemake), and >290 planetary moons.
- **Fields Provided:** TDB epoch, osculating Keplerian orbital elements ($a, e, i, \Omega, \omega, M$), mean motion ($n$), physical radius ($R$), mass ($M$), rotation period.
- **Purpose in Starmap:** Authoritative reference orbits for the Sol system micro-view.
- **Target Artifact:** `public/data/sol/ephemeris-primary-bodies.json`.

#### 21. IAU Minor Planet Center (`MPCORB.DAT`)
- **Scientific Authority:** International Astronomical Union (IAU) / Smithsonian Astrophysical Observatory.
- **Upstream Resource:** Minor Planet Center FTP (`https://www.minorplanetcenter.net/iau/MPCORB/MPCORB.DAT`).
- **Scope:** >1.3 million minor planets and comets.
- **Fields Provided:** `Number`, `Name/Desig`, `Epoch`, `Mean_Anomaly`, `Arg_Periapsis`, `Asc_Node`, `Inclination`, `Eccentricity`, `Semi_Major_Axis`, `H` (abs mag), `G` (slope).
- **Purpose in Starmap:** Full population of Main Belt asteroids, Jupiter Trojans, Centaurs, Kuiper Belt Objects, and comets.
- **Target Artifact:** `public/data/sol/orbital-elements-asteroids.json` and `public/data/sol/orbital-elements-comets.json`.

#### 22. NASA JPL Small-Body Database (SBDB)
- **Scientific Authority:** NASA JPL / Caltech.
- **Upstream Resource:** JPL SBDB Query API (`ssd-api.jpl.nasa.gov/sbdb.api`).
- **Scope:** Complete physical characteristics of asteroids and comets.
- **Fields Provided:** `diameter`, `albedo`, `rot_per`, `spec_B`, `spec_T` (Tholen/SMASSII taxonomic class), `GM`.
- **Purpose in Starmap:** Physical rendering properties (3D scale, albedo reflectiveness, rotation rate).
- **Target Artifact:** Body manifest metadata in `public/data/sol/`.

#### 23. IAU WGSBN Small Body Names Bulletins
- **Scientific Authority:** International Astronomical Union (IAU) Working Group Small Bodies Nomenclature.
- **Upstream Resource:** IAU WGSBN Bulletins (`wgsbn-iau.org`).
- **Scope:** >24,000 officially named asteroids.
- **Fields Provided:** `Number`, `Name`, `Citation` (biographical, historical, mythological explanation).
- **Purpose in Starmap:** Educational and encyclopedic naming cards for named asteroids.
- **Target Artifact:** Sol system name gazetteer.

#### 24. NASA JPL Sentry & Close Approach Data (CAD)
- **Scientific Authority:** NASA Center for Near-Earth Object Studies (CNEOS).
- **Upstream Resource:** CNEOS CAD API (`ssd-api.jpl.nasa.gov/cad.api`).
- **Scope:** Near-Earth Asteroids (NEAs) and Potentially Hazardous Asteroids (PHAs).
- **Fields Provided:** `close_approach_date`, `miss_distance_au`, `relative_velocity_kms`, `h_mag`.
- **Purpose in Starmap:** Highlighting NEO orbital paths and upcoming Earth flyby trajectories.
- **Target Artifact:** `public/data/sol/orbital-elements-neo.json`.

#### 25. JPL Cometary Non-Gravitational Parameters
- **Scientific Authority:** NASA JPL Solar System Dynamics.
- **Upstream Resource:** JPL SBDB Comet Elements Database.
- **Scope:** Periodic and historic comets.
- **Fields Provided:** Non-gravitational outgassing acceleration parameters ($A_1, A_2, A_3$), perihelion distance ($q$), perihelion date ($T_p$).
- **Purpose in Starmap:** Dynamic cometary tail direction vectors and accurate long-term orbital propagation.
- **Target Artifact:** `public/data/sol/orbital-elements-comets.json`.

---

### Layer 5: Manmade Objects & Orbital Paths (Explicitly Deferred)

*Status: Explicitly deferred per user instruction. Preserved in architecture for future development phases.*

#### 26. Space-Track.org / CelesTrak (US Space Command)
- **Scientific Authority:** US Space Command (18th Space Defense Squadron) / Dr. T. S. Kelso (CelesTrak).
- **Purpose:** Full catalog of >45,000 artificial objects in Earth orbit (active satellites, upper stages, debris) propagated dynamically via SGP4/SDP4 from Two-Line Element (TLE) / Orbit Mean-Elements Messages (OMM).

#### 27. NASA JPL Horizons Spacecraft Trajectory Roster
- **Scientific Authority:** NASA JPL Solar System Dynamics.
- **Purpose:** High-precision state vectors for historic deep-space probes (Voyager 1/2, Pioneer 10/11, New Horizons, Cassini, Galileo) and Sun-Earth Lagrange halo missions (JWST, SOHO).

#### 28. Lunar & Martian Surface Relics Database
- **Scientific Authority:** NASA / ESA / Roscosmos / CNSA / ISRO.
- **Purpose:** Planetary surface landing coordinates for historical relics (Apollo Lunar Modules, Surveyor, Luna, Chang'e, Curiosity, Perseverance, Viking).

#### 29. ESA DISCOS & Jonathan McDowell's GCASO
- **Scientific Authority:** European Space Agency / Harvard-Smithsonian Center for Astrophysics.
- **Purpose:** Spacecraft operational status, wet/dry launch masses, cross-sectional areas, solar array spans, launching nations, and historical launch logs.

---

## Ingestion Execution Plan

To move from the current partial status to 100% comprehensive data ingestion:

1. **Step 1 — Ingest Gaia DR3 GCNS (Layer 1 Backbone):**
   - Download `table1c.dat.gz` from CDS VizieR (`https://cdsarc.cds.unistra.fr/ftp/J/A+A/649/A6/table1c.dat.gz`).
   - Stream-parse all 331,312 stars within 100 pc.
   - Cross-match with HYG v3 to preserve historical Bayer/Flamsteed names and IAU proper names.
2. **Step 2 — Deep Sky VizieR Machine Ingestion (Layer 3):**
   - Ingest Cantat-Gaudin (2,017 open clusters), Harris (157 globulars), Green's (294 SNRs), and ATNF (3,300+ pulsars) directly from machine-readable tables.
3. **Step 3 — Solar System Orbits & Minor Planet Center (Layer 4):**
   - Ingest `MPCORB.DAT` or JPL SBDB filtered to all numbered asteroids, comets, and NEOs with Keplerian orbital elements.
