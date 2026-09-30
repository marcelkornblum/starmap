import fs from 'node:fs';
import path from 'node:path';
import { DATA_SOURCES_REGISTRY, type DataSourceDefinition } from './sources.config';
import type { GalacticStructureRecord, SolarSystemBodyRecord } from '../src/types/astro';

/**
 * Curated seed data for prominent Galactic Structures situated in or near the 100-pc volume.
 */
export const SEED_GALACTIC_STRUCTURES: GalacticStructureRecord[] = [
  {
    id: 'hyades',
    name: 'Hyades Cluster',
    type: 'OpenCluster',
    x: 43.1,
    y: 17.5,
    z: 12.8,
    dist: 47.5,
    radiusPc: 5.7,
    ageMyr: 625,
    memberCount: 724,
    designations: ['Melotte 25', 'Collinder 50', 'C 0424+157'],
    description:
      'The nearest open star cluster to the Solar System, sharing a common trajectory through the solar neighborhood.',
  },
  {
    id: 'coma-berenices-cluster',
    name: 'Coma Star Cluster',
    type: 'OpenCluster',
    x: -8.2,
    y: 3.4,
    z: 85.5,
    dist: 86.0,
    radiusPc: 4.8,
    ageMyr: 450,
    memberCount: 270,
    designations: ['Melotte 111', 'Collinder 256'],
    description:
      'A loose, prominent open cluster located high above the galactic plane in the constellation Coma Berenices.',
  },
  {
    id: 'ursa-major-moving-group',
    name: 'Ursa Major Moving Group',
    type: 'MovingGroup',
    x: -3.8,
    y: 19.2,
    z: 15.6,
    dist: 25.1,
    radiusPc: 8.5,
    ageMyr: 414,
    memberCount: 140,
    designations: ['Collinder 285', 'UMa Stream'],
    description:
      'A co-moving stellar kinematic group containing the core stars of the Big Dipper drifting synchronously through space.',
  },
  {
    id: 'pleiades',
    name: 'Pleiades (Seven Sisters)',
    type: 'OpenCluster',
    x: 122.8,
    y: 49.6,
    z: -34.2,
    dist: 135.5,
    radiusPc: 2.6,
    ageMyr: 115,
    memberCount: 1000,
    designations: ['M45', 'Melotte 22', 'Collinder 42'],
    description:
      'A luminous young open cluster just beyond the 100-pc perimeter, prominent across human culture and night-sky navigation.',
  },
  {
    id: 'local-interstellar-cloud',
    name: 'Local Interstellar Cloud (LIC)',
    type: 'InterstellarMedium',
    x: 0.1,
    y: -0.2,
    z: 0.3,
    dist: 0.4,
    radiusPc: 9.2,
    designations: ['Local Fluff'],
    description:
      'The warm, diffuse interstellar gas cloud through which the Solar System is currently traveling within the Local Bubble.',
  },
  {
    id: 'geminga',
    name: 'Geminga Pulsar',
    type: 'Pulsar',
    x: -128.5,
    y: 182.4,
    z: 63.1,
    dist: 250.0,
    ageMyr: 0.34,
    designations: ['PSR J0633+1746', '2CG 195+04'],
    description:
      'A quiet gamma-ray pulsar and neutron star created by an ancient nearby supernova that helped carve out the Local Bubble.',
  },
  {
    id: 'psr-j0108-1431',
    name: 'PSR J0108-1431',
    type: 'Pulsar',
    x: 48.2,
    y: -92.5,
    z: -68.3,
    dist: 130.0,
    ageMyr: 166,
    designations: ['PSR B0106-14'],
    description:
      'One of the oldest and closest known isolated radio pulsars to Earth.',
  },
];

/**
 * Curated seed data for Sol System natural bodies (Layer 4) with high-precision JPL Horizons Keplerian elements.
 */
export const SEED_SOLAR_SYSTEM_BODIES: SolarSystemBodyRecord[] = [
  {
    id: 'sol',
    name: 'Sol (Sun)',
    classification: 'Star',
    meanRadiusKm: 696340,
    massKg: 1.9885e30,
    gm: 132712440041.93938,
    albedo: 0.0,
    rotationalPeriodHours: 609.12,
    tags: ['PrimaryStar', 'HomeStar'],
  },
  {
    id: 'mercury',
    name: 'Mercury',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 2439.7,
    massKg: 3.3011e23,
    gm: 22031.868,
    albedo: 0.106,
    rotationalPeriodHours: 1407.6,
    orbit: {
      semiMajorAxis: 0.387098,
      eccentricity: 0.20563,
      inclination: 7.005,
      ascendingNode: 48.331,
      argumentOfPeriapsis: 29.124,
      meanAnomaly: 174.796,
      periodDays: 87.969,
      epoch: 'J2000',
    },
    tags: ['TerrestrialPlanet', 'InnerSystem'],
  },
  {
    id: 'venus',
    name: 'Venus',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 6051.8,
    massKg: 4.8675e24,
    gm: 324858.592,
    albedo: 0.689,
    rotationalPeriodHours: -5832.5,
    orbit: {
      semiMajorAxis: 0.723332,
      eccentricity: 0.006772,
      inclination: 3.39458,
      ascendingNode: 76.68,
      argumentOfPeriapsis: 54.884,
      meanAnomaly: 50.115,
      periodDays: 224.701,
      epoch: 'J2000',
    },
    tags: ['TerrestrialPlanet', 'InnerSystem'],
  },
  {
    id: 'earth',
    name: 'Earth',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 6371.0,
    massKg: 5.97237e24,
    gm: 398600.4418,
    albedo: 0.367,
    rotationalPeriodHours: 23.934,
    orbit: {
      semiMajorAxis: 1.00000261,
      eccentricity: 0.01671123,
      inclination: 0.00005,
      ascendingNode: -11.26,
      argumentOfPeriapsis: 114.2078,
      meanAnomaly: 358.617,
      periodDays: 365.256,
      epoch: 'J2000',
    },
    tags: ['TerrestrialPlanet', 'HabitableWorld', 'HomeWorld'],
  },
  {
    id: 'moon',
    name: 'The Moon (Luna)',
    classification: 'Moon',
    parentBodyId: 'earth',
    meanRadiusKm: 1737.4,
    massKg: 7.342e22,
    gm: 4902.800066,
    albedo: 0.12,
    rotationalPeriodHours: 655.728,
    orbit: {
      semiMajorAxis: 0.00257, // ~384,400 km in AU
      eccentricity: 0.0549,
      inclination: 5.145,
      ascendingNode: 125.08,
      argumentOfPeriapsis: 318.15,
      meanAnomaly: 135.0,
      periodDays: 27.32166,
      epoch: 'J2000',
    },
    tags: ['MajorMoon'],
  },
  {
    id: 'mars',
    name: 'Mars',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 3389.5,
    massKg: 6.4171e23,
    gm: 42828.375214,
    albedo: 0.17,
    rotationalPeriodHours: 24.623,
    orbit: {
      semiMajorAxis: 1.523679,
      eccentricity: 0.0934,
      inclination: 1.85,
      ascendingNode: 49.562,
      argumentOfPeriapsis: 286.502,
      meanAnomaly: 19.373,
      periodDays: 686.98,
      epoch: 'J2000',
    },
    tags: ['TerrestrialPlanet', 'InnerSystem'],
  },
  {
    id: 'ceres',
    name: 'Ceres',
    classification: 'DwarfPlanet',
    parentBodyId: 'sol',
    meanRadiusKm: 469.73,
    massKg: 9.3835e20,
    gm: 62.63,
    albedo: 0.09,
    rotationalPeriodHours: 9.074,
    orbit: {
      semiMajorAxis: 2.7675,
      eccentricity: 0.0758,
      inclination: 10.593,
      ascendingNode: 80.305,
      argumentOfPeriapsis: 73.597,
      meanAnomaly: 77.372,
      periodDays: 1681.63,
      epoch: 'J2000',
    },
    tags: ['DwarfPlanet', 'MainBelt'],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 69911.0,
    massKg: 1.8982e27,
    gm: 126686534.921,
    albedo: 0.538,
    rotationalPeriodHours: 9.925,
    orbit: {
      semiMajorAxis: 5.2044,
      eccentricity: 0.0489,
      inclination: 1.303,
      ascendingNode: 100.464,
      argumentOfPeriapsis: 273.867,
      meanAnomaly: 20.02,
      periodDays: 4332.59,
      epoch: 'J2000',
    },
    tags: ['GasGiant', 'OuterSystem'],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 58232.0,
    massKg: 5.6834e26,
    gm: 37931187.9,
    albedo: 0.499,
    rotationalPeriodHours: 10.656,
    orbit: {
      semiMajorAxis: 9.5826,
      eccentricity: 0.0565,
      inclination: 2.485,
      ascendingNode: 113.665,
      argumentOfPeriapsis: 339.392,
      meanAnomaly: 317.02,
      periodDays: 10759.22,
      epoch: 'J2000',
    },
    tags: ['GasGiant', 'OuterSystem', 'RingSystem'],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 25362.0,
    massKg: 8.681e25,
    gm: 5793939.3,
    albedo: 0.488,
    rotationalPeriodHours: -17.24,
    orbit: {
      semiMajorAxis: 19.2184,
      eccentricity: 0.0463,
      inclination: 0.773,
      ascendingNode: 74.006,
      argumentOfPeriapsis: 96.998,
      meanAnomaly: 142.238,
      periodDays: 30685.4,
      epoch: 'J2000',
    },
    tags: ['IceGiant', 'OuterSystem'],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    classification: 'Planet',
    parentBodyId: 'sol',
    meanRadiusKm: 24622.0,
    massKg: 1.02413e26,
    gm: 6836529.0,
    albedo: 0.442,
    rotationalPeriodHours: 16.11,
    orbit: {
      semiMajorAxis: 30.1104,
      eccentricity: 0.009456,
      inclination: 1.77,
      ascendingNode: 131.784,
      argumentOfPeriapsis: 273.187,
      meanAnomaly: 256.228,
      periodDays: 60189.0,
      epoch: 'J2000',
    },
    tags: ['IceGiant', 'OuterSystem'],
  },
  {
    id: 'pluto',
    name: 'Pluto',
    classification: 'DwarfPlanet',
    parentBodyId: 'sol',
    meanRadiusKm: 1188.3,
    massKg: 1.303e22,
    gm: 871.0,
    albedo: 0.52,
    rotationalPeriodHours: -153.29,
    orbit: {
      semiMajorAxis: 39.482,
      eccentricity: 0.2488,
      inclination: 17.16,
      ascendingNode: 110.299,
      argumentOfPeriapsis: 113.834,
      meanAnomaly: 14.882,
      periodDays: 90560.0,
      epoch: 'J2000',
    },
    tags: ['DwarfPlanet', 'KuiperBelt'],
  },
  {
    id: '433-eros',
    name: '433 Eros',
    classification: 'AsteroidNEO',
    parentBodyId: 'sol',
    meanRadiusKm: 8.42,
    massKg: 6.687e15,
    gm: 0.000446,
    albedo: 0.25,
    rotationalPeriodHours: 5.27,
    orbit: {
      semiMajorAxis: 1.458,
      eccentricity: 0.223,
      inclination: 10.83,
      ascendingNode: 304.32,
      argumentOfPeriapsis: 178.82,
      meanAnomaly: 310.2,
      periodDays: 643.0,
      epoch: 'J2000',
    },
    tags: ['AmorAsteroid', 'NEO'],
  },
  {
    id: '99942-apophis',
    name: '99942 Apophis',
    classification: 'AsteroidNEO',
    parentBodyId: 'sol',
    meanRadiusKm: 0.17,
    massKg: 6.1e10,
    albedo: 0.23,
    rotationalPeriodHours: 30.56,
    orbit: {
      semiMajorAxis: 0.922,
      eccentricity: 0.191,
      inclination: 3.33,
      ascendingNode: 204.04,
      argumentOfPeriapsis: 126.4,
      meanAnomaly: 230.9,
      periodDays: 323.6,
      epoch: 'J2000',
    },
    tags: ['AtenAsteroid', 'PHA', 'NEO'],
  },
];

/**
 * Downloads a remote URL directly to a destination file path.
 */
async function downloadFile(url: string, destPath: string): Promise<number> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'StarmapDataPipeline/1.0 (https://github.com/marcel/starmap)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP fetch failed [${response.status} ${response.statusText}] for ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

export interface FetchSummary {
  sourceId: string;
  name: string;
  status: 'cached' | 'downloaded' | 'initialized' | 'error';
  localPath: string;
  bytes: number;
  message?: string;
}

/**
 * Executes the automated acquisition pipeline across all declarative data sources.
 *
 * @param force If true, forces re-downloading even if local cache exists
 * @returns Array of fetch status summaries
 */
export async function fetchAllDataSources(force = false): Promise<FetchSummary[]> {
  const summaries: FetchSummary[] = [];

  for (const source of DATA_SOURCES_REGISTRY.sources) {
    if (!source.enabled) {
      continue;
    }

    const resolvedLocal = path.resolve(source.localCachePath);
    const exists = fs.existsSync(resolvedLocal);

    if (exists && !force) {
      const stats = fs.statSync(resolvedLocal);
      if (stats.size > 0) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'cached',
          localPath: resolvedLocal,
          bytes: stats.size,
          message: 'Local cache valid, skipping download.',
        });
        continue;
      }
    }

    // Handle declarative seed sources
    if (source.format === 'declarative-seed') {
      try {
        const dir = path.dirname(resolvedLocal);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        let seedContent = '';
        if (source.id === 'galactic-structures-local') {
          seedContent = JSON.stringify(SEED_GALACTIC_STRUCTURES, null, 2);
        } else if (source.id === 'solar-system-horizons') {
          seedContent = JSON.stringify(SEED_SOLAR_SYSTEM_BODIES, null, 2);
        }

        fs.writeFileSync(resolvedLocal, seedContent, 'utf-8');
        const bytes = Buffer.byteLength(seedContent, 'utf-8');

        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'initialized',
          localPath: resolvedLocal,
          bytes,
          message: 'Initialized declarative scientific seed dataset.',
        });
      } catch (err: unknown) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'error',
          localPath: resolvedLocal,
          bytes: 0,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    // Handle remote download sources
    if (source.remoteUrl) {
      try {
        console.log(`Fetching ${source.name} from ${source.remoteUrl}...`);
        const bytes = await downloadFile(source.remoteUrl, resolvedLocal);

        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'downloaded',
          localPath: resolvedLocal,
          bytes,
          message: `Successfully downloaded ${(bytes / 1024 / 1024).toFixed(2)} MB.`,
        });
      } catch (err: unknown) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'error',
          localPath: resolvedLocal,
          bytes: 0,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return summaries;
}

// CLI entrypoint
const isDirectExecution = process.argv[1]?.endsWith('fetch-sources.ts');
if (isDirectExecution) {
  const force = process.argv.includes('--force');
  console.log(`Starting Data Source Acquisition (force=${force})...`);
  const startTime = Date.now();

  fetchAllDataSources(force)
    .then((results) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\nAcquisition completed in ${elapsed}s:`);
      for (const res of results) {
        const mb = (res.bytes / 1024 / 1024).toFixed(2);
        console.log(`  [${res.status.toUpperCase()}] ${res.name} (${mb} MB) -> ${res.localPath}`);
        if (res.message) {
          console.log(`    Note: ${res.message}`);
        }
      }
    })
    .catch((err) => {
      console.error('Acquisition failed:', err);
      process.exit(1);
    });
}
