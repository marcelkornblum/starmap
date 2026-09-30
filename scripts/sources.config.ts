import type { DataSourceRegistry } from '../src/types/dataSources';

/**
 * Declarative Single Source of Truth for all astronomical datasets
 * ingested by the Starmap data pipeline.
 */
export const DATA_SOURCES_REGISTRY: DataSourceRegistry = {
  version: '1.0.0',
  updatedAt: '2026-09-30T19:00:00Z',
  sources: [
    {
      id: 'stellar-neighborhood-hyg',
      name: 'HYG Star Database (v3)',
      layer: 'stellar-neighborhood',
      authority: 'Astronexus (Hipparcos, Yale Bright Star, Gliese catalogs)',
      description:
        'Baseline stellar census containing ~120,000 stars with 3D astrometry, BV photometry, Morgan-Keenan spectral classifications, and 3D velocity vectors.',
      citation: 'Nash, D. (2019). The HYG Database. https://github.com/astronexus/HYG-Database',
      license: 'CC BY-SA 2.5 / Public Domain',
      format: 'csv',
      remoteUrl: 'https://codeberg.org/astronexus/hyg/raw/branch/main/data/athyg_v3/hyglike_from_athyg_v32.csv.gz',
      localCachePath: 'data/hygdata_v3.csv',
      enabled: true,
      contributions: [
        {
          domain: 'astrometry',
          fields: ['ra', 'dec', 'dist', 'x', 'y', 'z'],
          description: 'Equatorial coordinates (J2000) and computed Cartesian parsecs from Sol.',
        },
        {
          domain: 'kinematics',
          fields: ['pmra', 'pmdec', 'rv', 'vx', 'vy', 'vz'],
          description: 'Proper motion (mas/yr), Doppler radial velocity (km/s), and 3D Cartesian velocity vector in km/s.',
        },
        {
          domain: 'photometry-spectroscopy',
          fields: ['mag', 'absmag', 'spect', 'ci', 'lum'],
          description: 'Apparent and absolute visual magnitudes, B-V color index, Morgan-Keenan spectral classification, and solar luminosity.',
        },
        {
          domain: 'nomenclature',
          fields: ['proper', 'bayer', 'flam', 'con', 'hip', 'hd', 'hr', 'gl'],
          description: 'Cross-catalog identifiers, historical names, and IAU constellation codes.',
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
      id: 'exoplanetary-systems-oec',
      name: 'Open Exoplanet Catalogue',
      layer: 'exoplanetary-systems',
      authority: 'Open Exoplanet Catalogue Community / GitHub',
      description:
        'Comprehensive, community-curated database tracking over 4,000 confirmed exoplanets, complete Keplerian orbital elements, physical dimensions, and host star cross-references.',
      citation: 'Open Exoplanet Catalogue. (2026). https://github.com/OpenExoplanetCatalogue/oec_tables',
      license: 'MIT License',
      format: 'csv',
      remoteUrl:
        'https://raw.githubusercontent.com/OpenExoplanetCatalogue/oec_tables/master/comma_separated/open_exoplanet_catalogue.txt',
      localCachePath: 'data/raw/open_exoplanet_catalogue.csv',
      enabled: true,
      contributions: [
        {
          domain: 'orbital-elements',
          fields: ['semimajoraxis', 'eccentricity', 'period', 'inclination', 'ascendingnode', 'periastron'],
          description: 'High-precision Keplerian orbital elements for planetary bodies.',
        },
        {
          domain: 'planetary-physics',
          fields: ['mass', 'radius', 'temperature', 'discoverymethod', 'discoveryyear'],
          description: 'Planetary masses, radii, equilibrium temperatures in Kelvin, and discovery metrics.',
        },
        {
          domain: 'host-star-matching',
          fields: ['name', 'system_rightascension', 'system_declination', 'system_distance', 'hoststar_mass', 'hoststar_radius', 'hoststar_metallicity', 'hoststar_temperature'],
          description: 'Host star parameters and celestial coordinates used for cross-matching against stellar nodes.',
        },
      ],
      targetArtifacts: [
        'public/data/overlays/exoplanetary-systems.json',
        'public/data/systems/sector_*.json',
      ],
    },
    {
      id: 'galactic-structures-local',
      name: 'Local Galactic Structures & Clusters Catalog',
      layer: 'galactic-structures',
      authority: 'Cantat-Gaudin et al. / Harris / ATNF Pulsar Database / CDS Strasbourg',
      description:
        'Deep-sky stellar associations, open clusters, supernova remnants, and pulsars situated within or along the perimeter of the 100-parsec local neighborhood.',
      citation: 'Cantat-Gaudin et al. (2020) A&A 640, A1; Harris, W.E. (2010); Manchester et al. (2005) AJ 129.',
      license: 'Public Scientific Domain',
      format: 'declarative-seed',
      localCachePath: 'data/raw/galactic-structures.json',
      enabled: true,
      contributions: [
        {
          domain: 'cluster-kinematics-morphology',
          fields: ['id', 'name', 'type', 'x', 'y', 'z', 'dist', 'radiusPc', 'ageMyr', 'memberCount', 'designations', 'description'],
          description: '3D spatial coordinates, tidal boundaries, member populations, and ages for prominent local open clusters and moving groups.',
        },
      ],
      targetArtifacts: ['public/data/overlays/galactic-structures.json'],
    },
    {
      id: 'solar-system-horizons',
      name: 'NASA JPL Horizons Ephemeris & Solar System Catalog',
      layer: 'solar-system-bodies',
      authority: 'NASA Jet Propulsion Laboratory (JPL) Solar System Dynamics (SSD) / IAU MPC',
      description:
        'Authoritative physical parameters and osculating Keplerian orbital elements for the Sun, 8 major planets, dwarf planets, major natural satellites, and prominent Near-Earth Objects.',
      citation: 'Giorgini, J.D. et al. (1996). NASA JPL Horizons On-Line Ephemeris System.',
      license: 'NASA Open Data / Public Domain',
      format: 'declarative-seed',
      localCachePath: 'data/raw/solar-system-bodies.json',
      enabled: true,
      contributions: [
        {
          domain: 'ephemerides-orbits',
          fields: ['id', 'name', 'classification', 'parentBodyId', 'meanRadiusKm', 'massKg', 'gm', 'albedo', 'rotationalPeriodHours', 'orbit', 'tags'],
          description: 'Dynamic Keplerian elements, physical dimensions, gravitational parameters, and albedos for natural bodies in the home system.',
        },
      ],
      targetArtifacts: [
        'public/data/sol/ephemeris-primary-bodies.json',
        'public/data/sol/orbital-elements-neo.json',
      ],
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
export function getDataSourcesByLayer(layer: string) {
  return DATA_SOURCES_REGISTRY.sources.filter((s) => s.layer === layer);
}

/**
 * Returns all active sources enabled for the pipeline build.
 */
export function getEnabledDataSources() {
  return DATA_SOURCES_REGISTRY.sources.filter((s) => s.enabled);
}
