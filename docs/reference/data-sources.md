# Authoritative Astronomical Data Sources Specification

This document details the scientific authorities, licences, scope, citations, and pipeline roles for astronomical datasets integrated into Starmap. The canonical, executable registry of active sources is maintained in [`scripts/sources.config.ts`](../../scripts/sources.config.ts) (`DATA_SOURCES_REGISTRY`).

For pipeline build architecture, see [data-pipeline.md](../architecture/data-pipeline.md); for binary and compact JSON schemas, see [data-formats.md](./data-formats.md).

---

## 1. Architectural Scope & Serving Strategy

1. **Spatial Volume Boundary:** Strictly bounded to the **100-parsec solar neighbourhood** ($\sim 326.156\text{ light-years}$ radius around Sol).
2. **Quality Priority:** **Completeness > Accuracy > Performance**.
3. **Serving & LOD Strategy:**
   - **Atlas View (Macro):** Collapsed `SystemSummaryNode` representations sharded into 25-parsec cubic spatial sectors (`public/data/partitions/sector_*.bin`).
   - **System View (Micro):** On-demand detailed `SystemManifest` records containing individual stellar components, Keplerian orbits, physical metrics, and habitability evaluations (`public/data/systems/sector_*.json`).
   - **Entity Details & Summaries ($O(1)$ Dictionary Shards):** 36-bucket dictionary shards (`public/data/details/<0..z>.json` and `public/data/summaries/<0..z>.json`) partitioned via FNV-1a hash modulo 36, providing instantaneous $O(1)$ entity lookup for focused/inspected bodies without requiring full sector partition loads (`DEC-006`).
   - **Overlays & Catalogs:** Dedicated topic indices for exoplanets, circumstellar debris disks, galactic structures, naked-eye bright reference stars, and Solar System ephemerides.
4. **Offline Acquisition & Ingestion:** All raw data acquisition and harmonisation occurs offline via Node.js streams (`scripts/fetch-sources.ts` and `scripts/build-data.ts`). The runtime client application never loads raw catalogues.

---

## 2. Canonical Data Sources Registry

The following authoritative sources correspond directly to `DATA_SOURCES_REGISTRY` in [`scripts/sources.config.ts`](../../scripts/sources.config.ts):

| # | Layer | Source Name | Scientific Authority | Scope / Volume | Purpose in Starmap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | Layer 1 | **Gaia Catalogue of Nearby Stars (GCNS / Gaia DR3)** | ESA / Gaia DPAC / CDS VizieR (`J/A+A/649/A6`) | 331,312 stars ($\le 100\text{ pc}$) | Foundational 100 pc stellar spine: 5-parameter astrometry, 3D space velocities, and $G/BP/RP$ photometry. |
| **02** | Layer 1 | **HYG Database (v3)** | Astronexus / Hipparcos / Yale / Gliese | 119,614 stars (all sky) | Historical cross-identifications (HIP, HD, HR, Gliese), Bayer/Flamsteed designations, and spectral types. |
| **03** | Layer 1 | **RECONS 10-Parsec Census** | Research Consortium On Nearby Stars (RECONS) | $\sim 350$ systems ($\le 10\text{ pc}$) | Ground-truth census for ultra-cool red dwarfs, white dwarfs, and brown dwarfs within 10 pc. |
| **04** | Layer 1 | **IAU Catalog of Star Names (WGSN)** | International Astronomical Union (IAU) | 451 named stars | Official common stellar proper names replacing raw catalogue identifiers. |
| **05** | Layer 1 | **CDS SIMBAD Astronomical Database** | Centre de Données astronomiques de Strasbourg | Multi-catalogue identifiers | Literature cross-identifications and designation mapping. |
| **06** | Layer 1 | **General Catalogue of Variable Stars (GCVS) / AAVSO** | Sternberg Astronomical Inst. / AAVSO | Confirmed variable stars | Luminosity oscillation periods and stellar variability classifications. |
| **07** | Layer 2 | **Open Exoplanet Catalogue (OEC)** | Open Science Community / H. Rein | 5,400+ confirmed planets | Multi-body hierarchical representations (A/B/C stellar components and circumbinary orbits). |
| **08** | Layer 2 | **NASA Exoplanet Archive (PSCompPars)** | NASA NExScI / Caltech IPAC | 5,700+ confirmed planets | Authoritative planetary parameters ($M_p, R_p, T_{\text{eq}}$) and Keplerian orbital elements ($a, e, i, \omega, \Omega, P$). |
| **09** | Layer 2 | **Extrasolar Planets Encyclopaedia (Exoplanet.eu)** | Paris Observatory | 5,800+ confirmed/candidate planets | Independent European verification catalogue for candidate and newly confirmed planetary systems. |
| **10** | Layer 2 | **Habitable Worlds Catalog (PHL)** | Planetary Habitability Laboratory (Arecibo) | Confirmed HZ candidates | Earth Similarity Index (ESI), stellar insolation flux ($S/S_0$), and surface temperature models. |
| **11** | Layer 2 | **IAU NameExoWorlds Common Names** | International Astronomical Union (IAU) | 100+ systems | Officially approved cultural proper names for host stars and exoplanets (e.g. 51 Pegasi b $\rightarrow$ *Dimidium*). |
| **11b**| Layer 2 | **Resolved Circumstellar Disks & Belts (`CIRCUMSTELLAR_DISKS_CATALOG`)** | ALMA / Herschel / JWST / Spitzer surveys | Resolved disks $\le 100\text{ pc}$ | Debris disks, asteroid belts, and Kuiper belts (Sol belts, Vega, Fomalhaut, $\epsilon$ Eridani, AU Mic). |
| **12** | Layer 3 | **Local Galactic Structures & Clusters Catalog** | Cantat-Gaudin / Harris / ATNF / CDS | Curated local structures | Deep-sky open clusters, moving groups, supernova remnants, and pulsars situated within or near 100 pc. |
| **13** | Layer 3 | **Gaia DR2/DR3 Open Clusters Catalog** | T. Cantat-Gaudin et al. / CDS VizieR | 2,017 open clusters | 3D Cartesian coordinates, proper motions, parallax distances, cluster member counts, and ages. |
| **14** | Layer 3 | **Harris Milky Way Globular Clusters Catalog (2010)** | W. E. Harris (McMaster Univ.) / CDS | 157 globular clusters | Milky Way globular cluster coordinates, core-collapse status, metallicity $[\text{Fe/H}]$, and concentration. |
| **15** | Layer 3 | **Green's Catalogue of Galactic Supernova Remnants** | D. A. Green (Cavendish Lab) / CDS | 294 remnants | Galactic supernova remnants with coordinates, angular diameters, radio flux densities, and morphologies. |
| **16** | Layer 3 | **ATNF Pulsar Database** | Australia Telescope National Facility (CSIRO) | 3,300+ pulsars | Pulsars and magnetars with spin periods ($P$), slowdown rates ($\dot{P}$), dispersion measures, and magnetic fields. |
| **17** | Layer 3 | **Strasbourg-ESO Catalogue of Galactic Planetary Nebulae** | Strasbourg Astronomical Obs. / ESO / CDS | 3,500+ planetary nebulae | Galactic planetary nebulae coordinates, shell morphologies, and central star data. |
| **18** | Layer 3 | **OpenNGC Master Deep-Sky Catalog** | M. Verga / SEDS / Open NGC Project | 13,900+ deep-sky objects | Popular deep-sky landmarks (*Pleiades, Orion Nebula, Crab Nebula, Omega Centauri*) and Messier/Caldwell objects. |
| **19** | Layer 4 | **NASA JPL Horizons Ephemeris & Solar System Catalog** | NASA JPL Solar System Dynamics / MPC | Sun, 8 planets, >290 moons | Osculating Keplerian orbital elements and high-precision physical parameters for primary Solar System bodies. |
| **20** | Layer 4 | **IAU Minor Planet Center Distant Objects (`Distant.txt`)** | IAU MPC / JPL SBDB | 8,200+ distant bodies | Keplerian orbital elements for Centaurs, Jupiter Trojans, Kuiper Belt Objects, and Scattered Disk Objects. |
| **21** | Layer 4 | **IAU MPC Potentially Hazardous Asteroids (`PHA.txt`)** | IAU Minor Planet Center | 2,500+ PHAs | Standardised Keplerian orbits for all confirmed Potentially Hazardous Asteroids (Earth MOID $\le 0.05\text{ AU}$). |
| **22** | Layer 4 | **IAU MPC Cometary Orbital Elements (`AllCometEls.txt`)** | IAU Minor Planet Center / WGSBN | 4,600+ comets | Standardised orbital elements for periodic, parabolic, and hyperbolic comets in the Solar System. |
| **23** | Layer 4 | **NASA JPL Sentry & Close Approach Data (CAD)** | NASA JPL CNEOS | Near-Earth Objects (NEOs) | Automated impact monitoring data, Earth close-approach trajectory dates, and relative encounter speeds. |

---

## 3. Detailed Data Source Breakdown

### Layer 1: Stars & Kinematics (Solar Neighbourhood $\le 100\text{ pc}$)

#### 1. Gaia Catalogue of Nearby Stars (GCNS / Gaia DR3)
- **Scientific Authority:** European Space Agency (ESA) / Gaia Data Processing and Analysis Consortium (DPAC).
- **Upstream Resource:** CDS VizieR Catalogue `J/A+A/649/A6` (`table1c.dat.gz`).
- **Citation:** Gaia Collaboration, Smart, R.L., et al. (2021). A&A 649, A6.
- **Licence:** ESA Gaia Open Access.
- **Scope:** 331,312 verified stars within 100 parsecs of Sol.
- **Fields Provided:** `source_id`, `ra`, `dec`, `parallax`, `pmra`, `pmdec`, `phot_g_mean_mag`, `phot_bp_mean_mag`, `phot_rp_mean_mag`, `radial_velocity`.
- **Target Artefacts:** `public/data/partitions/sector_*.bin`, `public/data/catalogs/`, `public/data/summaries/<0..z>.json`, `public/data/details/<0..z>.json`.

#### 2. HYG Star Database (v3)
- **Scientific Authority:** Astronexus (D. Nash) / Hipparcos / Yale Bright Star / Gliese.
- **Upstream Resource:** Codeberg Git repository (`hyglike_from_athyg_v32.csv.gz`).
- **Citation:** Nash, D. (2019). The HYG Database. https://github.com/astronexus/HYG-Database.
- **Licence:** CC BY-SA 2.5 / Public Domain.
- **Scope:** 119,614 stars (all sky).
- **Fields Provided:** `id`, `hip`, `hd`, `hr`, `gl`, `bayer`, `flam`, `con`, `proper`, `spect`, `ci`, `lum`, `vx`, `vy`, `vz`.
- **Target Artefacts:** `public/data/catalogs/reference-bright-stars.json`, `public/data/systems/sector_*.json`, `public/data/summaries/<0..z>.json`.

#### 3. RECONS 10-Parsec Census
- **Scientific Authority:** Research Consortium On Nearby Stars (RECONS / T. J. Henry et al.).
- **Upstream Resource:** CDS VizieR Catalogue `J/AJ/155/265` (`table1.dat`).
- **Citation:** Henry, T.J. et al. (2018). AJ 155, 265.
- **Licence:** Public Scientific Domain.
- **Scope:** Verified stellar systems within 10.0 parsecs.
- **Fields Provided:** `system_name`, `spectral_type`, `multiplicity`, `distance_pc`, `components`.
- **Target Artefacts:** `public/data/catalogs/solar-neighborhood-10pc.json`, `public/data/summaries/<0..z>.json`.

#### 4. IAU Working Group on Star Names (WGSN) Gazetteer
- **Scientific Authority:** International Astronomical Union (IAU) Division C.
- **Upstream Resource:** IAU WGSN Official Bulletins & CDS catalogue (`iau_proper_stars.csv`).
- **Citation:** Mamajek, E. et al. (2016–2026). IAU Working Group on Star Names Bulletins.
- **Licence:** IAU Open Access.
- **Scope:** 451 formally approved proper star names.
- **Fields Provided:** `proper_name`, `hip`, `designation`, `etymology`, `constellation`.
- **Target Artefacts:** `public/data/catalogs/reference-bright-stars.json`, `public/data/summaries/<0..z>.json`.

#### 5. CDS SIMBAD Astronomical Database
- **Scientific Authority:** Centre de Données astronomiques de Strasbourg (CDS).
- **Upstream Resource:** CDS Sesame / SIMBAD TAP service.
- **Citation:** Wenger, M. et al. (2000). A&AS 143, 9.
- **Licence:** CDS Open Service Terms.
- **Scope:** Multi-catalogue astronomical cross-identifications.
- **Fields Provided:** `canonical_id`, `aliases`, `bibcode_count`.
- **Target Artefacts:** System nomenclature cross-references and search keys.

#### 6. General Catalogue of Variable Stars (GCVS) / AAVSO
- **Scientific Authority:** Sternberg Astronomical Institute / American Association of Variable Star Observers (AAVSO).
- **Upstream Resource:** CDS VizieR Catalogue `B/gcvs` (`gcvs_cat.dat.gz`) and `data/seed/aavso-variables.json`.
- **Citation:** Samus, N.N. et al. (2017). Astronomy Reports 61, 80.
- **Licence:** Open Scientific Access.
- **Scope:** Confirmed variable stars in the solar neighbourhood.
- **Fields Provided:** `var_type`, `period_days`, `epoch`, `mag_max`, `mag_min`.
- **Target Artefacts:** Stellar variability flags in summary nodes and search indices.

---

### Layer 2: Extrasolar Planets & Habitability

#### 7. Open Exoplanet Catalogue (OEC)
- **Scientific Authority:** Open Science Community (H. Rein et al.).
- **Upstream Resource:** GitHub repository (`oec_tables/open_exoplanet_catalogue.txt`).
- **Citation:** Open Exoplanet Catalogue (2026). https://github.com/OpenExoplanetCatalogue/oec_tables.
- **Licence:** MIT License.
- **Scope:** 5,400+ confirmed exoplanets.
- **Fields Provided:** `name`, `binary_flag`, `mass`, `radius`, `period`, `semimajoraxis`, `eccentricity`, `inclination`, `temperature`.
- **Target Artefacts:** `public/data/systems/sector_*.json`, `public/data/overlays/exoplanetary-systems.json`.

#### 8. NASA Exoplanet Archive (PSCompPars)
- **Scientific Authority:** NASA Exoplanet Science Institute (NExScI) / Caltech / IPAC.
- **Upstream Resource:** Composite Planet Parameters Table via TAP API (`pscomppars`).
- **Citation:** Akeson, R.L. et al. (2013). PASP 125, 989.
- **Licence:** NASA Open Data / Public Domain.
- **Scope:** 5,700+ confirmed exoplanets ($\le 100\text{ pc}$).
- **Fields Provided:** `pl_name`, `hostname`, `sy_snum`, `sy_pnum`, `pl_orbper`, `pl_orbsmax`, `pl_bmasse`, `pl_rade`, `pl_eqt`, `pl_insol`.
- **Target Artefacts:** `public/data/systems/sector_*.json`, `public/data/details/<0..z>.json`, `public/data/overlays/exoplanetary-systems.json`.

#### 9. Extrasolar Planets Encyclopaedia (Exoplanet.eu)
- **Scientific Authority:** Observatoire de Paris.
- **Upstream Resource:** Exoplanet.eu CSV catalogue (`https://exoplanet.eu/catalog/csv/`).
- **Citation:** Schneider, J. et al. (2011). A&A 532, A79.
- **Licence:** Open Scientific Access.
- **Scope:** 5,800+ confirmed and candidate exoplanets.
- **Fields Provided:** Alternative survey detections, orbital drift, stellar age, and effective temperature.
- **Target Artefacts:** Cross-validation for system manifests.

#### 10. Habitable Worlds Catalog (PHL)
- **Scientific Authority:** Planetary Habitability Laboratory (University of Puerto Rico at Arecibo).
- **Upstream Resource:** PHL Habitable Exoplanets Catalog (`phl.upr.edu`).
- **Citation:** Méndez, A. et al. (2021). Habitability of Exoplanets. Springer.
- **Licence:** PHL Open Access.
- **Scope:** Habitable zone candidates.
- **Fields Provided:** `esi`, `hz_zone`, `hz_composition`, `surface_temp_c`.
- **Target Artefacts:** Habitability evaluations in `public/data/overlays/exoplanetary-systems.json` and system manifests.

#### 11. IAU NameExoWorlds Common Names
- **Scientific Authority:** International Astronomical Union (IAU) Executive Committee.
- **Upstream Resource:** IAU NameExoWorlds official register (`nameexoworlds.iau.org`).
- **Citation:** IAU Executive Committee Working Group on Public Naming of Planets (2015–2026).
- **Licence:** IAU Open Access.
- **Scope:** 100+ public-named exoplanetary systems.
- **Fields Provided:** `official_planet_name`, `official_host_name`, `cultural_origin`, `naming_citation`.
- **Target Artefacts:** Primary nomenclature in `public/data/systems/sector_*.json` and search indices.

#### 11b. Resolved Circumstellar Disks & Belts (`CIRCUMSTELLAR_DISKS_CATALOG`)
- **Scientific Authority:** ALMA / Herschel / JWST / Spitzer resolved debris disk surveys (`DEC-035`).
- **Upstream Resource:** Curated compilation in `data/seed/circumstellar-disks.json`.
- **Licence:** Public Scientific Domain.
- **Scope:** Major resolved debris disks, asteroid belts, and Kuiper belts within 100 parsecs.
- **Fields Provided:** `id`, `name`, `kind`, `innerRadiusAu`, `outerRadiusAu`, `semiMajorAxisAu`, `tempK`, `composition`, `confidence`.
- **Target Artefacts:** Embedded in `public/data/systems/sector_*.json` and `public/data/details/<0..z>.json`.

---

### Layer 3: Galactic Structures & Deep Sky

#### 12. Local Galactic Structures & Clusters Catalog
- **Scientific Authority:** Cantat-Gaudin et al. / Harris / ATNF / CDS Strasbourg.
- **Upstream Resource:** `data/seed/galactic-structures.json`.
- **Citation:** Cantat-Gaudin et al. (2020) A&A 640, A1; Harris, W.E. (2010); Manchester et al. (2005) AJ 129.
- **Licence:** Public Scientific Domain.
- **Scope:** Curated open clusters, moving groups, supernova remnants, and pulsars.
- **Fields Provided:** `id`, `name`, `type`, `x`, `y`, `z`, `dist`, `radiusPc`, `ageMyr`, `memberCount`, `designations`.
- **Target Artefacts:** `public/data/overlays/galactic-structures.json`, `public/data/details/<0..z>.json`.

#### 13. Gaia DR2/DR3 Open Clusters Catalog
- **Scientific Authority:** T. Cantat-Gaudin et al. / CDS VizieR (`J/A+A/640/A1`).
- **Upstream Resource:** CDS VizieR `table1.dat` (`cantat_gaudin_clusters.dat`).
- **Citation:** Cantat-Gaudin, T. et al. (2020). A&A 640, A1.
- **Licence:** CDS Open Data.
- **Scope:** 2,017 Galactic open clusters.
- **Fields Provided:** `cluster_name`, `glon`, `glat`, `dist_pc`, `pmra`, `pmdec`, `radius_50`, `logAge`, `nb_stars`.
- **Target Artefacts:** `public/data/overlays/galactic-structures.json`.

#### 14. Harris Milky Way Globular Clusters Catalog (2010 Edition)
- **Scientific Authority:** W. E. Harris (McMaster University) / CDS VizieR (`VII/195`).
- **Upstream Resource:** `catalog.gz` (`harris_globulars.dat.gz`).
- **Citation:** Harris, W.E. (1996, 2010 edition). AJ 112, 1487.
- **Licence:** Public Scientific Domain.
- **Scope:** 157 Galactic globular clusters.
- **Fields Provided:** `id`, `name`, `ra`, `dec`, `dist_kpc`, `metallicity`, `core_radius`, `v_mag`.
- **Target Artefacts:** `public/data/overlays/galactic-structures.json`.

#### 15. Green's Catalogue of Galactic Supernova Remnants
- **Scientific Authority:** D. A. Green (Cavendish Laboratory, Cambridge) / CDS VizieR (`VII/284`).
- **Upstream Resource:** `snrs.dat` (`greens_snr.dat`).
- **Citation:** Green, D.A. (2019). J. Astrophys. Astron. 40, 36.
- **Licence:** Public Scientific Domain.
- **Scope:** 294 known Galactic supernova remnants.
- **Fields Provided:** `snr_id`, `glon`, `glat`, `angular_size`, `remnant_type`, `flux_1ghz`.
- **Target Artefacts:** `public/data/overlays/galactic-structures.json`.

#### 16. ATNF Pulsar Database
- **Scientific Authority:** Australia Telescope National Facility (ATNF / CSIRO) / CDS VizieR (`VII/189`).
- **Upstream Resource:** `table1.dat` (`atnf_pulsars.dat`).
- **Citation:** Taylor, J.H., Manchester, R.N., Lyne, A.G. (1993, 1995). ApJS 88, 529.
- **Licence:** CSIRO Open Science Access.
- **Scope:** Rotation-powered pulsars, millisecond pulsars, and magnetars.
- **Fields Provided:** `jname`, `p0`, `p1`, `dm`, `dist_dm`.
- **Target Artefacts:** `public/data/overlays/galactic-structures.json`.

#### 17. Strasbourg-ESO Catalogue of Galactic Planetary Nebulae
- **Scientific Authority:** Strasbourg Astronomical Observatory / ESO / CDS (`V/84`).
- **Upstream Resource:** `main.dat.gz` (`planetary_nebulae.dat.gz`).
- **Citation:** Acker, A. et al. (1992). Strasbourg-ESO Catalogue of Galactic Planetary Nebulae.
- **Licence:** CDS Research Access.
- **Scope:** Galactic planetary nebulae.
- **Fields Provided:** `png`, `common_name`, `ra`, `dec`, `diam`.
- **Target Artefacts:** `public/data/overlays/galactic-structures.json`.

#### 18. OpenNGC Master Deep-Sky Catalog
- **Scientific Authority:** M. Verga / SEDS / Open NGC Project.
- **Upstream Resource:** `NGC.csv` (`open_ngc.csv`).
- **Citation:** Verga, M. (2026). OpenNGC Database. https://github.com/mattiaverga/OpenNGC.
- **Licence:** CC BY-SA 4.0.
- **Scope:** 13,900+ deep-sky objects (Messier, Caldwell, NGC, IC).
- **Fields Provided:** `name`, `type`, `ra`, `dec`, `v_mag`, `common_names`.
- **Target Artefacts:** `public/data/overlays/galactic-structures.json`.

---

### Layer 4: Solar System Natural Bodies & Orbits

#### 19. NASA JPL Horizons Ephemeris & Solar System Catalog
- **Scientific Authority:** NASA Jet Propulsion Laboratory (JPL) Solar System Dynamics / IAU MPC.
- **Upstream Resource:** `data/seed/solar-system-bodies.json`.
- **Citation:** Giorgini, J.D. et al. (1996). NASA JPL Horizons On-Line Ephemeris System.
- **Licence:** NASA Open Data / Public Domain.
- **Scope:** Sun, 8 major planets, dwarf planets, and >30 major natural satellites.
- **Fields Provided:** `id`, `name`, `classification`, `parentBodyId`, `meanRadiusKm`, `massKg`, `gm`, `albedo`, `rotationalPeriodHours`, `orbit`, `tags`.
- **Target Artefacts:** `public/data/sol/ephemeris-primary-bodies.json`, `public/data/details/<0..z>.json`.

#### 20. IAU Minor Planet Center Distant Objects (`Distant.txt`)
- **Scientific Authority:** International Astronomical Union (IAU) Minor Planet Center / JPL SBDB.
- **Upstream Resource:** MPC FTP `Distant.txt` (`mpc_distant.txt`).
- **Citation:** Minor Planet Center (2026). Distant.txt Database.
- **Licence:** IAU Open Access.
- **Scope:** Centaurs, Jupiter Trojans, Kuiper Belt Objects, and Scattered Disk Objects.
- **Fields Provided:** `desig`, `name`, `h`, `epoch`, `m`, `peri`, `node`, `inc`, `e`, `a`.
- **Target Artefacts:** `public/data/sol/orbital-elements-asteroids.json`.

#### 21. IAU Minor Planet Center Potentially Hazardous Asteroids (`PHA.txt`)
- **Scientific Authority:** International Astronomical Union (IAU) Minor Planet Center.
- **Upstream Resource:** MPC FTP `PHA.txt` (`mpc_pha.txt`).
- **Citation:** Minor Planet Center (2026). PHA.txt Database.
- **Licence:** IAU Open Access.
- **Scope:** All confirmed Potentially Hazardous Asteroids with Earth MOID $\le 0.05\text{ AU}$.
- **Fields Provided:** `desig`, `name`, `h`, `g`, `epoch`, `m`, `peri`, `node`, `inc`, `e`, `a`.
- **Target Artefacts:** `public/data/sol/orbital-elements-neo.json`.

#### 22. IAU Minor Planet Center Cometary Orbital Elements (`AllCometEls.txt`)
- **Scientific Authority:** International Astronomical Union (IAU) Minor Planet Center / WGSBN.
- **Upstream Resource:** MPC FTP `AllCometEls.txt` (`mpc_comets.txt`).
- **Citation:** Minor Planet Center (2026). AllCometEls.txt Database.
- **Licence:** IAU Open Access.
- **Scope:** Periodic, parabolic, and hyperbolic comets.
- **Fields Provided:** `desig`, `epoch_year`, `perihelion_dist`, `eccentricity`, `peri`, `node`, `inc`.
- **Target Artefacts:** `public/data/sol/orbital-elements-comets.json`.

#### 23. NASA JPL Sentry & Close Approach Data (CAD)
- **Scientific Authority:** NASA JPL Center for Near Earth Object Studies (CNEOS).
- **Upstream Resource:** CNEOS CAD API (`jpl_cad_neo.json`).
- **Citation:** Farnocchia, D. et al. (2015). Icarus 258, 18.
- **Licence:** NASA Open Data / Public Domain.
- **Scope:** Near-Earth Asteroid and PHA planetary encounter trajectories.
- **Fields Provided:** `des`, `cd`, `dist`, `dist_min`, `v_rel`, `h`.
- **Target Artefacts:** `public/data/sol/orbital-elements-neo.json`.

---

### Layer 5: Manmade Objects & Orbital Paths (Explicitly Deferred)

Manmade spacecraft, orbital debris, planetary landers, and historical probes (Space-Track/CelesTrak, JPL Horizons Spacecraft Roster, Surface Relics, and ESA DISCOS) are **explicitly deferred** to a future development phase. No runtime data assets are generated for Layer 5 in the current release.
