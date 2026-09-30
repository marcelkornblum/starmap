import type { DataSourceRegistry, AstronomicalDataLayer } from '../src/types/dataSources';

/**
 * Declarative Single Source of Truth for all authoritative astronomical datasets
 * defined in the Starmap data pipeline architecture.
 */
export const DATA_SOURCES_REGISTRY: DataSourceRegistry = {
  version: '3.0.0',
  updatedAt: '2026-09-30T19:55:00Z',
  sources: [
    // =========================================================================
    // LAYER 1: STARS & STELLAR NEIGHBORHOOD (<= 100 PC)
    // =========================================================================
    {
      id: 'stellar-hyg-database',
      name: 'HYG Star Database (v3)',
      layer: 'stellar-neighborhood',
      authority: 'Astronexus (Hipparcos, Yale Bright Star, Gliese catalogs)',
      description:
        'Cross-identification bridge catalog providing Bayer/Flamsteed designations, Henry Draper (HD) numbers, Gliese (Gl) numbers, and Morgan-Keenan spectral classifications.',
      citation: 'Nash, D. (2019). The HYG Database. https://github.com/astronexus/HYG-Database',
      license: 'CC BY-SA 2.5 / Public Domain',
      format: 'csv',
      remoteUrl: 'https://codeberg.org/astronexus/hyg/raw/branch/main/data/athyg_v3/hyglike_from_athyg_v32.csv.gz',
      localCachePath: 'data/hygdata_v3.csv',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '31.9 MB',
      updateFrequency: 'Periodic revisions',
      contributions: [
        {
          domain: 'nomenclature',
          fields: ['proper', 'bayer', 'flam', 'con', 'hip', 'hd', 'hr', 'gl'],
          description: 'Cross-catalog identifiers, historical proper names, and IAU constellation abbreviations.',
        },
        {
          domain: 'photometry-spectroscopy',
          fields: ['mag', 'absmag', 'spect', 'ci', 'lum'],
          description: 'Johnson BV visual magnitudes, B-V color index, spectral classification, and solar luminosity.',
        },
      ],
      targetArtifacts: [
        'public/data/catalogs/reference-bright-stars.json',
        'public/data/systems/sector_*.json',
      ],
    },
    {
      id: 'stellar-gaia-dr3-gcns',
      name: 'Gaia Catalogue of Nearby Stars (GCNS / Gaia DR3)',
      layer: 'stellar-neighborhood',
      authority: 'European Space Agency (ESA) / Gaia DPAC / CDS VizieR (J/A+A/649/A6)',
      description:
        'The foundational 100-parsec stellar volume census containing 331,312 stars with microarcsecond 5-parameter astrometry, G/BP/RP photometry, and radial velocities.',
      citation: 'Gaia Collaboration, Smart, R.L., et al. (2021). A&A 649, A6.',
      license: 'ESA Gaia Open Access',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/J/A+A/649/A6/table1c.dat.gz',
      localCachePath: 'data/raw/gaia_dr3_gcns.dat.gz',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '72 MB',
      updateFrequency: 'Multi-year major data releases',
      contributions: [
        {
          domain: 'high-precision-astrometry',
          fields: ['source_id', 'ra', 'dec', 'parallax', 'pmra', 'pmdec'],
          description: 'Sub-milliarcsecond parallax distances and proper motions within 100 pc.',
        },
        {
          domain: 'spectroscopic-kinematics',
          fields: ['radial_velocity', 'radial_velocity_error'],
          description: 'Gaia RVS Doppler radial velocities in km/s.',
        },
      ],
      targetArtifacts: [
        'public/data/stars.json',
        'public/data/catalogs/solar-neighborhood-10pc.json',
        'public/data/catalogs/reference-bright-stars.json',
        'public/data/partitions/sector_*.json',
      ],
    },
    {
      id: 'stellar-recons-10pc',
      name: 'RECONS 10-Parsec Census',
      layer: 'stellar-neighborhood',
      authority: 'Research Consortium On Nearby Stars (RECONS)',
      description:
        'Definitive ground-truth census of all verified star systems within 10 parsecs, specifically resolving faint red dwarfs, white dwarfs, and brown dwarfs.',
      citation: 'Henry, T.J. et al. (2018). AJ 155, 265.',
      license: 'Public Scientific Domain',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/J/AJ/155/265/table1.dat',
      localCachePath: 'data/raw/recons_10pc.dat',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '13 KB',
      updateFrequency: 'Annual bulletins',
      contributions: [
        {
          domain: 'low-mass-completeness',
          fields: ['recons_id', 'system_type', 'multiplicity', 'mass_estimate'],
          description: 'Ground-truth validation for ultra-cool dwarfs and companion architectures within 10 pc.',
        },
      ],
      targetArtifacts: ['public/data/catalogs/solar-neighborhood-10pc.json'],
    },
    {
      id: 'stellar-iau-wgsn',
      name: 'IAU Catalog of Star Names',
      layer: 'stellar-neighborhood',
      authority: 'International Astronomical Union (IAU) Working Group on Star Names',
      description:
        'Official international gazetteer of standard proper and cultural star names formally recognized by the IAU.',
      citation: 'Mamajek, E. et al. (2016-2026). IAU Working Group on Star Names (WGSN) Bulletins.',
      license: 'IAU Open Access',
      format: 'csv',
      remoteUrl: 'https://raw.githubusercontent.com/cyschneck/iau-star-names/main/iau_proper_stars.csv',
      localCachePath: 'data/raw/iau_proper_stars.csv',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '228 KB',
      updateFrequency: 'Periodic bulletins',
      contributions: [
        {
          domain: 'official-nomenclature',
          fields: ['proper_name', 'hip_id', 'designation', 'etymology', 'constellation'],
          description: 'Standardized proper common names replacing raw numeric identifiers.',
        },
      ],
      targetArtifacts: ['public/data/catalogs/reference-bright-stars.json'],
    },
    {
      id: 'stellar-simbad-identifiers',
      name: 'SIMBAD Cross-Identifications',
      layer: 'stellar-neighborhood',
      authority: 'Centre de Données astronomiques de Strasbourg (CDS)',
      description:
        'Astronomical identity registry linking Hipparcos, HD, Gliese, 2MASS, and Bayer/Flamsteed designations.',
      citation: 'Wenger, M. et al. (2000). A&AS 143, 9.',
      license: 'CDS Open Service Terms',
      format: 'json',
      remoteUrl: 'https://cdsweb.u-strasbg.fr/',
      localCachePath: 'data/raw/simbad_crossmatch.json',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '~15 MB',
      updateFrequency: 'Continuous literature sync',
      contributions: [
        {
          domain: 'cross-matching',
          fields: ['canonical_id', 'aliases', 'bibcode_count'],
          description: 'Deterministic aliasing across 40+ catalog designation schemes.',
        },
      ],
      targetArtifacts: ['public/data/systems/sector_*.json'],
    },
    {
      id: 'stellar-aavso-vsx',
      name: 'General Catalogue of Variable Stars (GCVS) / AAVSO',
      layer: 'stellar-neighborhood',
      authority: 'Sternberg Astronomical Institute / AAVSO',
      description:
        'Global repository of variable star periods, classifications (Cepheids, eclipsing binaries, flare stars), and min/max magnitudes.',
      citation: 'Samus, N.N. et al. (2017). Astronomy Reports 61, 80.',
      license: 'Open Scientific Access',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/B/gcvs/gcvs_cat.dat.gz',
      localCachePath: 'data/raw/gcvs_variables.dat.gz',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '2.5 MB',
      updateFrequency: 'Periodic updates',
      contributions: [
        {
          domain: 'variability-tracking',
          fields: ['var_type', 'period_days', 'epoch', 'mag_max', 'mag_min'],
          description: 'Luminosity oscillation periods and stellar variability classifications.',
        },
      ],
      targetArtifacts: ['public/data/overlays/variable-stars.json'],
    },

    // =========================================================================
    // LAYER 2: EXTRASOLAR PLANETS (EXOPLANETS) & HABITABILITY
    // =========================================================================
    {
      id: 'exoplanet-oec',
      name: 'Open Exoplanet Catalogue',
      layer: 'exoplanetary-systems',
      authority: 'Open Exoplanet Catalogue Community / GitHub',
      description:
        'Comprehensive database tracking over 5,400 confirmed exoplanets, Keplerian orbital elements, physical dimensions, and multi-component stellar hierarchies.',
      citation: 'Open Exoplanet Catalogue. (2026). https://github.com/OpenExoplanetCatalogue/oec_tables',
      license: 'MIT License',
      format: 'csv',
      remoteUrl:
        'https://raw.githubusercontent.com/OpenExoplanetCatalogue/oec_tables/master/comma_separated/open_exoplanet_catalogue.txt',
      localCachePath: 'data/raw/open_exoplanet_catalogue.csv',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '0.77 MB',
      updateFrequency: 'Continuous commits',
      contributions: [
        {
          domain: 'orbital-elements',
          fields: ['semimajoraxis', 'eccentricity', 'period', 'inclination', 'ascendingnode', 'periastron'],
          description: 'Keplerian orbital parameters for planetary companions.',
        },
      ],
      targetArtifacts: [
        'public/data/overlays/exoplanetary-systems.json',
        'public/data/systems/sector_*.json',
      ],
    },
    {
      id: 'exoplanet-nasa-archive',
      name: 'NASA Exoplanet Archive (PSCompPars)',
      layer: 'exoplanetary-systems',
      authority: 'NASA / Caltech Infrared Processing and Analysis Center (IPAC)',
      description:
        'Official NASA clearinghouse of confirmed exoplanets with composite planetary parameters and transit/RV solution sets within 100 pc.',
      citation: 'Akeson, R.L. et al. (2013). PASP 125, 989.',
      license: 'NASA Open Data / Public Domain',
      format: 'csv',
      remoteUrl:
        'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,pl_insol,sy_dist+from+pscomppars+where+sy_dist<=100&format=csv',
      localCachePath: 'data/raw/nasa_exoplanet_archive.csv',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '192 KB',
      updateFrequency: 'Weekly curation',
      contributions: [
        {
          domain: 'vetted-parameters',
          fields: ['pl_name', 'pl_orbper', 'pl_orbsmax', 'pl_bmasse', 'pl_rade', 'pl_eqt', 'pl_insol'],
          description: 'Standardized planetary masses and radii normalized to Earth-units, plus stellar insolation.',
        },
      ],
      targetArtifacts: [
        'public/data/overlays/exoplanetary-systems.json',
        'public/data/systems/sector_*.json',
      ],
    },
    {
      id: 'exoplanet-eu-encyclopaedia',
      name: 'Extrasolar Planets Encyclopaedia (Exoplanet.eu)',
      layer: 'exoplanetary-systems',
      authority: 'Observatoire de Paris / exoplanet.eu',
      description:
        'Independent European exoplanet database tracking direct-imaging, astrometry, and microlensing discoveries.',
      citation: 'Schneider, J. et al. (2011). A&A 532, A79.',
      license: 'Open Scientific Access',
      format: 'csv',
      remoteUrl: 'https://exoplanet.eu/catalog/csv/',
      localCachePath: 'data/raw/exoplanet_eu.csv',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '3.5 MB',
      updateFrequency: 'Bi-weekly updates',
      contributions: [
        {
          domain: 'alternative-detections',
          fields: ['detection_type', 'star_age', 'star_teff', 'orbital_drift'],
          description: 'European survey confirmations and direct imaging photometry.',
        },
      ],
      targetArtifacts: ['public/data/systems/sector_*.json'],
    },
    {
      id: 'exoplanet-phl-habitable',
      name: 'Habitable Worlds Catalog (PHL)',
      layer: 'exoplanetary-systems',
      authority: 'Planetary Habitability Laboratory (PHL) / University of Puerto Rico at Arecibo',
      description:
        'Specialized catalogue calculating Earth Similarity Index (ESI), Habitable Zone margins, and surface temperature models.',
      citation: 'Méndez, A. et al. (2021). Habitability of Exoplanets. Springer.',
      license: 'PHL Open Access',
      format: 'csv',
      remoteUrl: 'http://phl.upr.edu/projects/habitable-exoplanets-catalog',
      localCachePath: 'data/raw/phl_habitable_catalog.csv',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '< 500 KB',
      updateFrequency: 'Monthly updates',
      contributions: [
        {
          domain: 'habitability-metrics',
          fields: ['esi', 'hz_zone', 'hz_composition', 'surface_temp_c'],
          description: 'Earth Similarity Index metrics and atmospheric greenhouse equilibrium estimates.',
        },
      ],
      targetArtifacts: ['public/data/overlays/exoplanetary-systems.json'],
    },
    {
      id: 'exoplanet-iau-name-exoworlds',
      name: 'IAU NameExoWorlds Common Names',
      layer: 'exoplanetary-systems',
      authority: 'International Astronomical Union (IAU) NameExoWorlds Campaign',
      description:
        'Officially sanctioned colloquial names for exoplanetary systems voted on by the global scientific and public community.',
      citation: 'IAU Executive Committee Working Group on Public Naming of Planets. (2015-2026).',
      license: 'IAU Open Access',
      format: 'json',
      remoteUrl: 'https://nameexoworlds.iau.org/',
      localCachePath: 'data/raw/name_exoworlds.json',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '2.7 KB',
      updateFrequency: 'Campaign iterations',
      contributions: [
        {
          domain: 'colloquial-nomenclature',
          fields: ['official_planet_name', 'official_host_name', 'cultural_origin', 'naming_citation'],
          description: 'Popular names (e.g. 51 Pegasi b named "Dimidium", 55 Cancri e named "Janssen").',
        },
      ],
      targetArtifacts: ['public/data/systems/sector_*.json'],
    },

    // =========================================================================
    // LAYER 3: GALACTIC OBJECTS & DEEP SKY (MILKY WAY / 100 PC)
    // =========================================================================
    {
      id: 'galactic-structures-curated',
      name: 'Local Galactic Structures & Clusters Catalog',
      layer: 'galactic-structures',
      authority: 'Cantat-Gaudin et al. / Harris / ATNF / CDS Strasbourg',
      description:
        'Deep-sky stellar associations, open clusters, supernova remnants, and pulsars situated within or along the perimeter of the 100-parsec local neighborhood.',
      citation: 'Cantat-Gaudin et al. (2020) A&A 640, A1; Harris, W.E. (2010); Manchester et al. (2005) AJ 129.',
      license: 'Public Scientific Domain',
      format: 'declarative-seed',
      localCachePath: 'data/raw/galactic-structures.json',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '< 50 KB',
      updateFrequency: 'Curated revisions',
      contributions: [
        {
          domain: 'cluster-kinematics-morphology',
          fields: ['id', 'name', 'type', 'x', 'y', 'z', 'dist', 'radiusPc', 'ageMyr', 'memberCount', 'designations', 'description'],
          description: '3D spatial coordinates, boundaries, member populations, and ages for prominent local clusters and moving groups.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-cantat-gaudin-clusters',
      name: 'Gaia DR2/DR3 Open Clusters Catalog',
      layer: 'galactic-structures',
      authority: 'Cantat-Gaudin, T. et al. / CDS VizieR (J/A+A/640/A1)',
      description:
        'Comprehensive 3D cluster parameters for 2,017 Galactic open clusters derived from Gaia astrometric clustering algorithms.',
      citation: 'Cantat-Gaudin, T. et al. (2020). A&A 640, A1.',
      license: 'CDS Open Data',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/J/A+A/640/A1/table1.dat',
      localCachePath: 'data/raw/cantat_gaudin_clusters.dat',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '341 KB',
      updateFrequency: 'Static major catalog',
      contributions: [
        {
          domain: 'cluster-astrometry',
          fields: ['cluster_name', 'glon', 'glat', 'dist_pc', 'pmra', 'pmdec', 'radius_50', 'logAge', 'nb_stars'],
          description: '3D spatial positioning, cluster ages, member counts, and proper motions.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-harris-globulars',
      name: 'Harris Milky Way Globular Clusters Catalog (2010 Edition)',
      layer: 'galactic-structures',
      authority: 'McMaster University (Harris, W.E.) / CDS VizieR (VII/195)',
      description:
        'Complete structural, kinematic, and distance parameter catalog for all 157 known Galactic globular clusters in the Milky Way halo.',
      citation: 'Harris, W.E. (1996, 2010 edition). AJ 112, 1487.',
      license: 'Public Scientific Domain',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/VII/195/catalog.gz',
      localCachePath: 'data/raw/harris_globulars.dat.gz',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '12 KB',
      updateFrequency: 'Decennial editions',
      contributions: [
        {
          domain: 'globular-astrometry',
          fields: ['id', 'name', 'ra', 'dec', 'dist_kpc', 'metallicity', 'core_radius', 'v_mag'],
          description: 'Galactic halo coordinates, integrated magnitudes, and metallicity.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-greens-snr',
      name: "Green's Catalogue of Galactic Supernova Remnants",
      layer: 'galactic-structures',
      authority: 'Cavendish Laboratory, Cambridge (Green, D.A.) / CDS VizieR (VII/284)',
      description:
        'Authoritative catalogue of 294 verified Galactic supernova remnants with coordinates, angular sizes, and remnant morphologies.',
      citation: 'Green, D.A. (2019). J. Astrophys. Astron. 40, 36.',
      license: 'Public Scientific Domain',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/VII/284/snrs.dat',
      localCachePath: 'data/raw/greens_snr.dat',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '19 KB',
      updateFrequency: 'Triennial updates',
      contributions: [
        {
          domain: 'remnant-morphology',
          fields: ['snr_id', 'glon', 'glat', 'angular_size', 'remnant_type', 'flux_1ghz'],
          description: 'Shell, plerion, and composite remnant outlines across the galactic plane.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-atnf-pulsars',
      name: 'ATNF Pulsar Database',
      layer: 'galactic-structures',
      authority: 'Australia Telescope National Facility (ATNF / CSIRO) / CDS VizieR (VII/189)',
      description:
        'Global catalog of 706 rotational pulsars, millisecond pulsars, and magnetars with dispersion distances and spin periods.',
      citation: 'Taylor, J.H., Manchester, R.N., Lyne, A.G. (1993, 1995). ApJS 88, 529.',
      license: 'CSIRO Open Science Access',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/VII/189/table1.dat',
      localCachePath: 'data/raw/atnf_pulsars.dat',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '353 KB',
      updateFrequency: 'Monthly releases',
      contributions: [
        {
          domain: 'pulsar-kinematics',
          fields: ['jname', 'p0', 'p1', 'dm', 'dist_dm'],
          description: 'Spin periods, dispersion measures, and kinematic distances.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-hash-planetary-nebulae',
      name: 'Strasbourg-ESO Catalogue of Galactic Planetary Nebulae',
      layer: 'galactic-structures',
      authority: 'Strasbourg Astronomical Observatory / ESO / CDS (V/84)',
      description:
        'The definitive catalogue of Galactic planetary nebulae verified across multi-wavelength surveys.',
      citation: 'Acker, A. et al. (1992). Strasbourg-ESO Catalogue of Galactic Planetary Nebulae.',
      license: 'CDS Research Access',
      format: 'tsv',
      remoteUrl: 'https://cdsarc.cds.unistra.fr/ftp/V/84/main.dat.gz',
      localCachePath: 'data/raw/planetary_nebulae.dat.gz',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '44 KB',
      updateFrequency: 'Major catalog editions',
      contributions: [
        {
          domain: 'nebular-morphology',
          fields: ['png', 'common_name', 'ra', 'dec', 'diam'],
          description: 'Planetary nebulae central positions and angular dimensions.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-messier-caldwell',
      name: 'OpenNGC Master Deep-Sky Catalog (NGC, IC, Messier, Caldwell)',
      layer: 'galactic-structures',
      authority: 'Mattia Verga / SEDS / Open NGC Project',
      description:
        'Complete database of 13,971 deep-sky objects including all Messier, Caldwell, NGC, and IC objects with coordinates, visual magnitudes, and popular names.',
      citation: 'Verga, M. (2026). OpenNGC Database. https://github.com/mattiaverga/OpenNGC',
      license: 'CC BY-SA 4.0',
      format: 'csv',
      remoteUrl: 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv',
      localCachePath: 'data/raw/open_ngc.csv',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '3.7 MB',
      updateFrequency: 'Continuous revisions',
      contributions: [
        {
          domain: 'popular-deep-sky',
          fields: ['name', 'type', 'ra', 'dec', 'v_mag', 'common_names'],
          description: 'Navigational deep-sky landmarks (e.g. "Orion Nebula", "Crab Nebula", "Pleiades").',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },

    // =========================================================================
    // LAYER 4: NATURAL SOLAR SYSTEM BODIES & ORBITS
    // =========================================================================
    {
      id: 'solar-system-horizons-primary',
      name: 'NASA JPL Horizons Ephemeris & Solar System Catalog',
      layer: 'solar-system-bodies',
      authority: 'NASA Jet Propulsion Laboratory (JPL) Solar System Dynamics (SSD) / IAU MPC',
      description:
        'Authoritative physical parameters and osculating Keplerian orbital elements for the Sun, 8 major planets, dwarf planets, and over 30 major natural satellites.',
      citation: 'Giorgini, J.D. et al. (1996). NASA JPL Horizons On-Line Ephemeris System.',
      license: 'NASA Open Data / Public Domain',
      format: 'declarative-seed',
      localCachePath: 'data/raw/solar-system-bodies.json',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '7.5 KB',
      updateFrequency: 'Ephemeris solutions',
      contributions: [
        {
          domain: 'ephemerides-orbits',
          fields: ['id', 'name', 'classification', 'parentBodyId', 'meanRadiusKm', 'massKg', 'gm', 'albedo', 'rotationalPeriodHours', 'orbit', 'tags'],
          description: 'Keplerian orbital elements, physical dimensions, gravitational parameters, and albedos for natural bodies in the home system.',
        },
      ],
      targetArtifacts: [
        'public/data/sol/ephemeris-primary-bodies.json',
      ],
    },
    {
      id: 'solar-system-jpl-sbdb-asteroids',
      name: 'IAU Minor Planet Center Distant Objects (Centaurs, Trojans & TNOs)',
      layer: 'solar-system-bodies',
      authority: 'International Astronomical Union (IAU) Minor Planet Center (MPC) / JPL SBDB',
      description:
        'Complete Keplerian orbital elements for 8,270 Centaurs, Jupiter Trojans, Kuiper Belt Objects, and Scattered Disk Objects.',
      citation: 'Minor Planet Center. (2026). Distant.txt Database.',
      license: 'IAU Open Access',
      format: 'tsv',
      remoteUrl: 'https://www.minorplanetcenter.net/iau/MPCORB/Distant.txt',
      localCachePath: 'data/raw/mpc_distant.txt',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '1.7 MB',
      updateFrequency: 'Daily updates',
      contributions: [
        {
          domain: 'outer-solar-system',
          fields: ['desig', 'name', 'h', 'epoch', 'm', 'peri', 'node', 'inc', 'e', 'a'],
          description: 'Orbital elements for outer solar system bodies and resonant minor planets.',
        },
      ],
      targetArtifacts: ['public/data/sol/orbital-elements-asteroids.json'],
    },
    {
      id: 'solar-system-iau-mpc-mpcorb',
      name: 'IAU Minor Planet Center Potentially Hazardous Asteroids (PHA)',
      layer: 'solar-system-bodies',
      authority: 'International Astronomical Union (IAU) Minor Planet Center (MPC)',
      description:
        'Comprehensive 6-parameter Keplerian orbital elements for 2,544 Potentially Hazardous Asteroids (PHAs) with Earth MOID <= 0.05 AU.',
      citation: 'Minor Planet Center. (2026). PHA.txt Database.',
      license: 'IAU Open Access',
      format: 'tsv',
      remoteUrl: 'https://www.minorplanetcenter.net/iau/MPCORB/PHA.txt',
      localCachePath: 'data/raw/mpc_pha.txt',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '505 KB',
      updateFrequency: 'Daily updates',
      contributions: [
        {
          domain: 'pha-orbits',
          fields: ['desig', 'name', 'h', 'g', 'epoch', 'm', 'peri', 'node', 'inc', 'e', 'a'],
          description: 'Standardized Keplerian orbits for all confirmed Potentially Hazardous Asteroids.',
        },
      ],
      targetArtifacts: ['public/data/sol/orbital-elements-neo.json'],
    },
    {
      id: 'solar-system-iau-wgsbn-names',
      name: 'IAU Minor Planet Center Cometary Orbital Elements',
      layer: 'solar-system-bodies',
      authority: 'International Astronomical Union (IAU) Minor Planet Center (MPC) / WGSBN',
      description:
        'Standardized orbital elements for 4,653 periodic, parabolic, and hyperbolic comets in the Solar System.',
      citation: 'Minor Planet Center. (2026). AllCometEls.txt Database.',
      license: 'IAU Open Access',
      format: 'tsv',
      remoteUrl: 'https://www.minorplanetcenter.net/iau/MPCORB/AllCometEls.txt',
      localCachePath: 'data/raw/mpc_comets.txt',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '769 KB',
      updateFrequency: 'Daily updates',
      contributions: [
        {
          domain: 'comet-orbits',
          fields: ['desig', 'epoch_year', 'perihelion_dist', 'eccentricity', 'peri', 'node', 'inc'],
          description: 'Orbital elements for periodic and hyperbolic comets.',
        },
      ],
      targetArtifacts: ['public/data/sol/orbital-elements-comets.json'],
    },
    {
      id: 'solar-system-jpl-sentry-cad',
      name: 'NASA JPL Sentry & Close Approach Data (CAD)',
      layer: 'solar-system-bodies',
      authority: 'NASA JPL Center for Near Earth Object Studies (CNEOS)',
      description:
        'Automated impact hazard monitoring system and Earth close-approach trajectory database tracking upcoming planetary encounters.',
      citation: 'Farnocchia, D. et al. (2015). Icarus 258, 18.',
      license: 'NASA Open Data / Public Domain',
      format: 'json',
      remoteUrl: 'https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=2026-01-01',
      localCachePath: 'data/raw/jpl_cad_neo.json',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '223 KB',
      updateFrequency: 'Daily continuous updates',
      contributions: [
        {
          domain: 'close-approaches-hazards',
          fields: ['des', 'cd', 'dist', 'dist_min', 'v_rel', 'h'],
          description: 'Upcoming planetary flyby dates, approach distances, and relative encounter speeds.',
        },
      ],
      targetArtifacts: ['public/data/sol/orbital-elements-neo.json'],
    },
  ],
};

/**
 * Retrieves a declarative data source by unique identifier.
 */
export function getDataSource(id: string) {
  return DATA_SOURCES_REGISTRY.sources.find((s) => s.id === id);
}

/**
 * Filters data sources by architectural layer.
 */
export function getDataSourcesByLayer(layer: AstronomicalDataLayer) {
  return DATA_SOURCES_REGISTRY.sources.filter((s) => s.layer === layer);
}

/**
 * Returns all active sources enabled for the pipeline build.
 */
export function getEnabledDataSources() {
  return DATA_SOURCES_REGISTRY.sources.filter((s) => s.enabled);
}

/**
 * Filters data sources by operational integration status.
 */
export function getDataSourcesByStatus(status: 'integrated' | 'staged' | 'planned') {
  return DATA_SOURCES_REGISTRY.sources.filter((s) => s.status === status);
}
