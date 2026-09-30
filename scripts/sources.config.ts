import type { DataSourceRegistry, AstronomicalDataLayer } from '../src/types/dataSources';

/**
 * Declarative Single Source of Truth for all authoritative astronomical datasets
 * defined in the Starmap data pipeline architecture.
 */
export const DATA_SOURCES_REGISTRY: DataSourceRegistry = {
  version: '2.0.0',
  updatedAt: '2026-09-30T19:15:00Z',
  sources: [
    // =========================================================================
    // LAYER 1: STARS & STELLAR NEIGHBORHOOD
    // =========================================================================
    {
      id: 'stellar-hyg-database',
      name: 'HYG Star Database (v3)',
      layer: 'stellar-neighborhood',
      authority: 'Astronexus (Hipparcos, Yale Bright Star, Gliese catalogs)',
      description:
        'Foundational stellar catalog containing ~120,000 stars with 3D Cartesian coordinates, BV photometry, Morgan-Keenan spectral types, and 3D velocity vectors.',
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
          domain: 'astrometry',
          fields: ['ra', 'dec', 'dist', 'x', 'y', 'z'],
          description: 'Equatorial coordinates (J2000) and computed Cartesian parsecs from Sol.',
        },
        {
          domain: 'kinematics',
          fields: ['pmra', 'pmdec', 'rv', 'vx', 'vy', 'vz'],
          description: 'Proper motion (mas/yr), Doppler radial velocity (km/s), and 3D Cartesian space velocity.',
        },
        {
          domain: 'photometry-spectroscopy',
          fields: ['mag', 'absmag', 'spect', 'ci', 'lum'],
          description: 'Apparent/absolute visual magnitudes, B-V color index, spectral classification, and solar luminosity.',
        },
        {
          domain: 'nomenclature',
          fields: ['proper', 'bayer', 'flam', 'con', 'hip', 'hd', 'hr', 'gl'],
          description: 'Cross-catalog identifiers, historical proper names, and IAU constellation abbreviations.',
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
      id: 'stellar-gaia-dr3-gcns',
      name: 'Gaia Catalogue of Nearby Stars (GCNS / Gaia DR3)',
      layer: 'stellar-neighborhood',
      authority: 'European Space Agency (ESA) / Gaia DPAC',
      description:
        'The definitive 100-parsec stellar volume census containing 331,312 stars with microarcsecond 5-parameter astrometry, G/BP/RP photometry, and radial velocities.',
      citation: 'Gaia Collaboration, Smart, R.L., et al. (2021). A&A 649, A6.',
      license: 'ESA Gaia Open Access',
      format: 'csv',
      remoteUrl: 'https://gea.esac.esa.int/tap-server/tap',
      localCachePath: 'data/raw/gaia_dr3_gcns.csv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~85 MB',
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
        {
          domain: 'astrophysical-parameters',
          fields: ['teff_gspphot', 'logg_gspphot', 'mh_gspphot', 'radius_flame'],
          description: 'Effective temperature, surface gravity, metallicity, and stellar radius.',
        },
      ],
      targetArtifacts: ['public/data/partitions/sector_*.json'],
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
      remoteUrl: 'http://www.recons.org/census.html',
      localCachePath: 'data/raw/recons_10pc.tsv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 1 MB',
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
      format: 'tsv',
      remoteUrl: 'https://www.iau.org/public/themes/naming_stars/',
      localCachePath: 'data/raw/iau_star_names.tsv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 200 KB',
      updateFrequency: 'Periodic bulletins',
      contributions: [
        {
          domain: 'official-nomenclature',
          fields: ['proper_name', 'hip_id', 'designation', 'etymology'],
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
        'Comprehensive astronomical identity registry linking Hipparcos, HD, Gliese, 2MASS, and Bayer/Flamsteed designations.',
      citation: 'Wenger, M. et al. (2000). A&AS 143, 9.',
      license: 'CDS Open Service Terms',
      format: 'json',
      remoteUrl: 'https://cdsweb.u-strasbg.fr/',
      localCachePath: 'data/raw/simbad_crossmatch.json',
      status: 'staged',
      enabled: false,
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
      name: 'AAVSO International Variable Star Index (VSX)',
      layer: 'stellar-neighborhood',
      authority: 'American Association of Variable Star Observers (AAVSO)',
      description:
        'Global repository of variable star periods, classifications (Cepheids, eclipsing binaries, flare stars), and min/max magnitudes.',
      citation: 'Watson, C.L. et al. (2006). Society for Astronomical Sciences Annual Symposium.',
      license: 'AAVSO Open Access',
      format: 'csv',
      remoteUrl: 'https://www.aavso.org/vsx/',
      localCachePath: 'data/raw/aavso_vsx.csv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~45 MB',
      updateFrequency: 'Daily updates',
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
    // LAYER 2: EXTRASOLAR PLANETS (EXOPLANETS)
    // =========================================================================
    {
      id: 'exoplanet-oec',
      name: 'Open Exoplanet Catalogue',
      layer: 'exoplanetary-systems',
      authority: 'Open Exoplanet Catalogue Community / GitHub',
      description:
        'Comprehensive, community-curated database tracking over 5,400 confirmed exoplanets, complete Keplerian orbital elements, physical dimensions, and host star cross-references.',
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
        {
          domain: 'planetary-physics',
          fields: ['mass', 'radius', 'temperature', 'discoverymethod', 'discoveryyear'],
          description: 'Planetary masses (M_Jup), radii (R_Jup), and equilibrium temperatures in Kelvin.',
        },
        {
          domain: 'host-star-matching',
          fields: ['name', 'system_rightascension', 'system_declination', 'system_distance'],
          description: 'Celestial coordinates and designations used for cross-matching against stellar nodes.',
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
        'Official NASA clearinghouse of confirmed exoplanets with rigorously vetted composite planetary parameters and transit/RV solution sets.',
      citation: 'Akeson, R.L. et al. (2013). PASP 125, 989.',
      license: 'NASA Open Data / Public Domain',
      format: 'json',
      remoteUrl:
        'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+*+from+pscomppars+where+default_flag=1&format=json',
      localCachePath: 'data/raw/nasa_exoplanet_pscomppars.json',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~12 MB',
      updateFrequency: 'Weekly curation',
      contributions: [
        {
          domain: 'vetted-parameters',
          fields: ['pl_name', 'pl_orbper', 'pl_orbsmax', 'pl_bmasse', 'pl_rade', 'pl_eqt'],
          description: 'Standardized planetary masses and radii normalized to Earth-units.',
        },
      ],
      targetArtifacts: [
        'public/data/overlays/exoplanetary-systems.json',
        'public/data/systems/sector_*.json',
      ],
    },
    {
      id: 'exoplanet-eu-encyclopaedia',
      name: 'Extrasolar Planets Encyclopaedia',
      layer: 'exoplanetary-systems',
      authority: 'Observatoire de Paris / exoplanet.eu',
      description:
        'The longest-running independent exoplanet database, tracking early direct-imaging and microlensing discoveries.',
      citation: 'Schneider, J. et al. (2011). A&A 532, A79.',
      license: 'Open Scientific Access',
      format: 'csv',
      remoteUrl: 'http://exoplanet.eu/catalog/csv/',
      localCachePath: 'data/raw/exoplanet_eu.csv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~5 MB',
      updateFrequency: 'Bi-weekly updates',
      contributions: [
        {
          domain: 'alternative-detections',
          fields: ['detection_type', 'star_age', 'star_teff', 'orbital_drift'],
          description: 'Early-announcement candidate tracking and direct imaging photometry.',
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
        'Specialized catalogue calculating Earth Similarity Index (ESI), Habitable Zone (conservative vs optimistic) margins, and surface temperature models.',
      citation: 'Méndez, A. et al. (2021). Habitability of Exoplanets. Springer.',
      license: 'PHL Open Access',
      format: 'csv',
      remoteUrl: 'http://phl.upr.edu/projects/habitable-exoplanets-catalog',
      localCachePath: 'data/raw/phl_habitable_catalog.csv',
      status: 'staged',
      enabled: false,
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
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 100 KB',
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
      authority: 'Cantat-Gaudin, T. et al. / European Southern Observatory (ESO)',
      description:
        'Comprehensive 3D cluster parameters for over 2,000 Galactic open clusters derived from Gaia astrometric clustering algorithms.',
      citation: 'Cantat-Gaudin, T. et al. (2020). A&A 640, A1.',
      license: 'CDS Open Data',
      format: 'csv',
      remoteUrl: 'https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=J/A+A/640/A1',
      localCachePath: 'data/raw/cantat_gaudin_clusters.csv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~1.5 MB',
      updateFrequency: 'Static major catalog',
      contributions: [
        {
          domain: 'cluster-astrometry',
          fields: ['cluster_name', 'glon', 'glat', 'dist_pc', 'pmra', 'pmdec', 'radius_50'],
          description: '3D spatial positioning and bulk proper motion velocities for Galactic star clusters.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-harris-globulars',
      name: 'Harris Milky Way Globular Clusters Catalog',
      layer: 'galactic-structures',
      authority: 'McMaster University (Harris, W.E.)',
      description:
        'Complete structural, kinematic, and distance parameter catalog for all 157 known Galactic globular clusters in the Milky Way halo.',
      citation: 'Harris, W.E. (1996, 2010 edition). AJ 112, 1487.',
      license: 'Public Scientific Domain',
      format: 'tsv',
      remoteUrl: 'https://physics.mcmaster.ca/~harris/mwgc.dat',
      localCachePath: 'data/raw/harris_globulars.tsv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 200 KB',
      updateFrequency: 'Decennial editions',
      contributions: [
        {
          domain: 'globular-astrometry',
          fields: ['id', 'name', 'ra', 'dec', 'dist_kpc', 'metallicity', 'core_radius'],
          description: 'Galactic halo coordinates and core collapse classifications.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-greens-snr',
      name: "Green's Catalogue of Galactic Supernova Remnants",
      layer: 'galactic-structures',
      authority: 'Cavendish Laboratory, Cambridge (Green, D.A.)',
      description:
        'Authoritative catalogue of ~300 verified Galactic supernova remnants with radio/optical coordinates, angular sizes, and remnant classifications.',
      citation: 'Green, D.A. (2019). J. Astrophys. Astron. 40, 36.',
      license: 'Public Scientific Domain',
      format: 'tsv',
      remoteUrl: 'https://www.mrao.cam.ac.uk/surveys/snrs/',
      localCachePath: 'data/raw/greens_snr.tsv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 150 KB',
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
      authority: 'Australia Telescope National Facility (ATNF / CSIRO)',
      description:
        'Global catalog of >3,300 rotational pulsars, millisecond pulsars, and magnetars with dispersion distances and spin-down rates.',
      citation: 'Manchester, R.N. et al. (2005). AJ 129, 1993.',
      license: 'CSIRO Open Science Access',
      format: 'tsv',
      remoteUrl: 'https://www.atnf.csiro.au/research/pulsar/psrcat/',
      localCachePath: 'data/raw/atnf_pulsars.tsv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~3 MB',
      updateFrequency: 'Monthly releases',
      contributions: [
        {
          domain: 'pulsar-kinematics',
          fields: ['jname', 'p0', 'p1', 'dm', 'dist_dm', 'b_surface'],
          description: 'Spin periods, period derivatives (spin-down age), and magnetic field strengths.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-hash-planetary-nebulae',
      name: 'HASH Planetary Nebulae Database',
      layer: 'galactic-structures',
      authority: 'Hong Kong University / Strasbourg Astronomical Observatory',
      description:
        'The definitive catalogue of all Galactic planetary nebulae verified across multi-wavelength optical and infrared surveys.',
      citation: 'Parker, Q.A. et al. (2016). J. Phys. Conf. Ser. 728.',
      license: 'HASH Research Access',
      format: 'csv',
      remoteUrl: 'http://hashpn.space/',
      localCachePath: 'data/raw/hash_pn.csv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~5 MB',
      updateFrequency: 'Annual updates',
      contributions: [
        {
          domain: 'nebular-morphology',
          fields: ['hash_id', 'png', 'common_name', 'morphology', 'central_star_mag'],
          description: 'Ionized gas shell morphologies and central white dwarf properties.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'galactic-messier-caldwell',
      name: 'Messier & Caldwell Deep-Sky Reference Index',
      layer: 'galactic-structures',
      authority: 'SEDS / Royal Astronomical Society (Patrick Moore)',
      description:
        'Curated cross-index of the 110 Messier objects and 109 Caldwell objects with popular names, visual magnitudes, and observing guides.',
      citation: 'Frommert, H. & Kronberg, C. (SEDS); Moore, P. (1995) Sky & Telescope.',
      license: 'Public Domain',
      format: 'json',
      remoteUrl: 'http://www.messier.seds.org/',
      localCachePath: 'data/raw/messier_caldwell.json',
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 300 KB',
      updateFrequency: 'Static reference',
      contributions: [
        {
          domain: 'popular-deep-sky',
          fields: ['catalog_id', 'ngc_id', 'colloquial_name', 'visual_mag', 'apparent_size'],
          description: 'Cultural landmarks (e.g. "Orion Nebula", "Crab Nebula", "Pleiades").',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },

    // =========================================================================
    // LAYER 4: NATURAL SOLAR SYSTEM BODIES
    // =========================================================================
    {
      id: 'solar-system-horizons-primary',
      name: 'NASA JPL Horizons Ephemeris & Solar System Catalog',
      layer: 'solar-system-bodies',
      authority: 'NASA Jet Propulsion Laboratory (JPL) Solar System Dynamics (SSD) / IAU MPC',
      description:
        'Authoritative physical parameters and osculating Keplerian orbital elements for the Sun, 8 major planets, dwarf planets, major natural satellites, and prominent Near-Earth Objects.',
      citation: 'Giorgini, J.D. et al. (1996). NASA JPL Horizons On-Line Ephemeris System.',
      license: 'NASA Open Data / Public Domain',
      format: 'declarative-seed',
      localCachePath: 'data/raw/solar-system-bodies.json',
      status: 'integrated',
      enabled: true,
      sizeEstimate: '< 20 KB',
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
        'public/data/sol/orbital-elements-neo.json',
      ],
    },
    {
      id: 'solar-system-jpl-sbdb-asteroids',
      name: 'NASA JPL Small-Body Database (SBDB)',
      layer: 'solar-system-bodies',
      authority: 'NASA JPL Solar System Dynamics (SSD)',
      description:
        'Complete orbital solutions, physical dimensions, and spectroscopic classifications for over 1.3 million asteroids and comets in the Solar System.',
      citation: 'Chodas, P.W. et al. (2026). NASA JPL Small-Body Database.',
      license: 'NASA Open Data / Public Domain',
      format: 'json',
      remoteUrl: 'https://ssd-api.jpl.nasa.gov/sbdb.api',
      localCachePath: 'data/raw/jpl_sbdb_major.json',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~120 MB',
      updateFrequency: 'Daily continuous updates',
      contributions: [
        {
          domain: 'asteroid-comet-orbits',
          fields: ['pdes', 'name', 'neo_flag', 'pha_flag', 'a', 'e', 'i', 'om', 'w', 'ma', 'per_y', 'diameter'],
          description: 'Osculating Keplerian elements and physical diameters for minor planets.',
        },
      ],
      targetArtifacts: ['public/data/sol/orbital-elements-neo.json'],
    },
    {
      id: 'solar-system-iau-mpc-mpcorb',
      name: 'IAU Minor Planet Center MPCORB Database',
      layer: 'solar-system-bodies',
      authority: 'International Astronomical Union (IAU) Minor Planet Center (MPC)',
      description:
        'The international official clearinghouse for asteroid, comet, and Kuiper Belt Object astrometric observations and orbital elements.',
      citation: 'Minor Planet Center. (2026). MPCORB.DAT Database.',
      license: 'IAU Open Access',
      format: 'tsv',
      remoteUrl: 'https://minorplanetcenter.net/iau/MPCORB.DAT',
      localCachePath: 'data/raw/mpcorb_summary.tsv',
      status: 'staged',
      enabled: false,
      sizeEstimate: '~250 MB',
      updateFrequency: 'Daily updates',
      contributions: [
        {
          domain: 'official-mpc-orbits',
          fields: ['designation', 'epoch_jd', 'mean_anomaly', 'arg_peri', 'asc_node', 'incl', 'ecc', 'semi_major'],
          description: 'Official IAU designations and 6-parameter Keplerian orbital sets.',
        },
      ],
      targetArtifacts: ['public/data/sol/orbital-elements-neo.json'],
    },
    {
      id: 'solar-system-iau-wgsbn-names',
      name: 'IAU Working Group Small Body Nomenclature (WGSBN) Bulletins',
      layer: 'solar-system-bodies',
      authority: 'IAU Working Group Small Bodies Nomenclature (WGSBN)',
      description:
        'Official gazetteer detailing named asteroids, minor planets, and comets, along with official biographical and historical discovery citations.',
      citation: 'IAU WGSBN Bulletins. (2021-2026). Vol. 1-6.',
      license: 'IAU Open Access',
      format: 'json',
      remoteUrl: 'https://www.wgsbn-iau.org/',
      localCachePath: 'data/raw/wgsbn_citations.json',
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 2 MB',
      updateFrequency: 'Bi-monthly bulletins',
      contributions: [
        {
          domain: 'small-body-lore',
          fields: ['number', 'name', 'citation_text', 'discovery_date', 'discoverer'],
          description: 'Official historical lore, naming citations, and human context for minor planets.',
        },
      ],
      targetArtifacts: ['public/data/sol/orbital-elements-neo.json'],
    },
    {
      id: 'solar-system-jpl-sentry-cad',
      name: 'NASA JPL Sentry & Close Approach Data (CAD)',
      layer: 'solar-system-bodies',
      authority: 'NASA JPL Center for Near Earth Object Studies (CNEOS)',
      description:
        'Real-time automated impact hazard monitoring system and Earth close-approach trajectory database for NEOs.',
      citation: 'Farnocchia, D. et al. (2015). Icarus 258, 18.',
      license: 'NASA Open Data / Public Domain',
      format: 'json',
      remoteUrl: 'https://ssd-api.jpl.nasa.gov/cad.api',
      localCachePath: 'data/raw/jpl_cad_upcoming.json',
      status: 'staged',
      enabled: false,
      sizeEstimate: '< 1 MB',
      updateFrequency: 'Daily continuous updates',
      contributions: [
        {
          domain: 'close-approaches-hazards',
          fields: ['des', 'cd', 'dist', 'dist_min', 'v_rel', 'h'],
          description: 'Upcoming planetary flyby dates, nominal/minimum approach distances, and relative encounter speeds.',
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
