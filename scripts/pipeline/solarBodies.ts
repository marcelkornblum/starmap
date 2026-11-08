import fs from 'node:fs';
import path from 'node:path';
import type { SolarSystemBodyRecord } from '../../src/types/astro';
import { precalculateSolarSystemBodyFlags } from '../../src/utils/astroPrecalculation';
import { FULL_SOLAR_SYSTEM_BODIES } from './seedCatalogs';

export function loadAllSolarSystemBodies(): {
  primaryBodies: SolarSystemBodyRecord[];
  phaAsteroids: SolarSystemBodyRecord[];
  distantAsteroids: SolarSystemBodyRecord[];
  comets: SolarSystemBodyRecord[];
} {
  // 1. Primary & Curated Solar System bodies (Horizons seed + FULL_SOLAR_SYSTEM_BODIES)
  const primaryBodies: SolarSystemBodyRecord[] = FULL_SOLAR_SYSTEM_BODIES.map((b) =>
    precalculateSolarSystemBodyFlags({
      ...(b as unknown as SolarSystemBodyRecord),
      confidence: 'confirmed' as const,
    }),
  );

  // 2. Potentially Hazardous Asteroids (PHAs from MPC)
  const phaAsteroids: SolarSystemBodyRecord[] = [];
  const phaPath = path.resolve('data/raw/mpc_pha.txt');
  if (fs.existsSync(phaPath)) {
    const lines = fs.readFileSync(phaPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length >= 100) {
        const desig = line.substring(0, 7).trim();
        const h = parseFloat(line.substring(8, 13));
        const m = parseFloat(line.substring(26, 35));
        const peri = parseFloat(line.substring(37, 46));
        const node = parseFloat(line.substring(48, 57));
        const inc = parseFloat(line.substring(59, 68));
        const e = parseFloat(line.substring(70, 79));
        const a = parseFloat(line.substring(92, 103));
        const uCode = line.length >= 106 ? parseInt(line.substring(105, 106).trim(), 10) : NaN;
        const name = line.substring(166, 194).trim() || desig;

        if (desig && !isNaN(a) && !isNaN(e)) {
          const estRadiusKm = (1329 / Math.sqrt(0.14)) * Math.pow(10, -0.2 * (isNaN(h) ? 18 : h)) / 2;
          const periodDays = Math.pow(a, 1.5) * 365.25;

          phaAsteroids.push(
            precalculateSolarSystemBodyFlags({
              id: `pha-${desig.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              name,
              classification: 'AsteroidNEO',
              parentBodyId: 'sol',
              meanRadiusKm: parseFloat(estRadiusKm.toFixed(2)),
              albedo: 0.14,
              orbit: {
                semiMajorAxis: a,
                eccentricity: e,
                inclination: !isNaN(inc) ? inc : 0,
                ascendingNode: !isNaN(node) ? node : 0,
                argumentOfPeriapsis: !isNaN(peri) ? peri : 0,
                meanAnomaly: !isNaN(m) ? m : 0,
                periodDays: parseFloat(periodDays.toFixed(1)),
                epoch: 'J2000',
              },
              tags: ['PHA', 'NEO', 'MinorPlanetCenter'],
              confidence: !isNaN(uCode) && uCode >= 3 ? 'candidate' : 'confirmed',
              theoreticalFlags: 1,
            }),
          );
        }
      }
    }
  }

  // 3. Distant Asteroids (Centaurs, Trojans, TNOs from MPC)
  const distantAsteroids: SolarSystemBodyRecord[] = [];
  const distPath = path.resolve('data/raw/mpc_distant.txt');
  if (fs.existsSync(distPath)) {
    const lines = fs.readFileSync(distPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length >= 100) {
        const desig = line.substring(0, 7).trim();
        const h = parseFloat(line.substring(8, 13));
        const m = parseFloat(line.substring(26, 35));
        const peri = parseFloat(line.substring(37, 46));
        const node = parseFloat(line.substring(48, 57));
        const inc = parseFloat(line.substring(59, 68));
        const e = parseFloat(line.substring(70, 79));
        const a = parseFloat(line.substring(92, 103));
        const uCode = line.length >= 106 ? parseInt(line.substring(105, 106).trim(), 10) : NaN;
        const name = line.substring(166, 194).trim() || desig;

        if (desig && !isNaN(a) && !isNaN(e)) {
          const estRadiusKm = (1329 / Math.sqrt(0.08)) * Math.pow(10, -0.2 * (isNaN(h) ? 10 : h)) / 2;
          const periodDays = Math.pow(a, 1.5) * 365.25;

          distantAsteroids.push(
            precalculateSolarSystemBodyFlags({
              id: `distant-${desig.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              name,
              classification: 'AsteroidDistant',
              parentBodyId: 'sol',
              meanRadiusKm: parseFloat(estRadiusKm.toFixed(1)),
              albedo: 0.08,
              orbit: {
                semiMajorAxis: a,
                eccentricity: e,
                inclination: !isNaN(inc) ? inc : 0,
                ascendingNode: !isNaN(node) ? node : 0,
                argumentOfPeriapsis: !isNaN(peri) ? peri : 0,
                meanAnomaly: !isNaN(m) ? m : 0,
                periodDays: parseFloat(periodDays.toFixed(1)),
                epoch: 'J2000',
              },
              tags: ['OuterSolarSystem', 'CentaurOrTNO', 'MinorPlanetCenter'],
              confidence: !isNaN(uCode) && uCode >= 3 ? 'candidate' : 'confirmed',
              theoreticalFlags: 1,
            }),
          );
        }
      }
    }
  }

  // 4. Comets (MPC AllCometEls.txt)
  const comets: SolarSystemBodyRecord[] = [];
  const cometsPath = path.resolve('data/raw/mpc_comets.txt');
  if (fs.existsSync(cometsPath)) {
    const lines = fs.readFileSync(cometsPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length >= 80) {
        const desig = line.substring(0, 10).trim();
        const qPerihelion = parseFloat(line.substring(30, 39));
        const e = parseFloat(line.substring(41, 49));
        const peri = parseFloat(line.substring(51, 59));
        const node = parseFloat(line.substring(61, 69));
        const inc = parseFloat(line.substring(71, 79));
        const name = (line.length > 102 ? line.substring(102, 158).trim() : '') || desig;

        if (desig && !isNaN(qPerihelion) && !isNaN(e)) {
          const a = e < 1 ? qPerihelion / (1 - e) : qPerihelion;
          const periodDays = e < 1 ? Math.pow(a, 1.5) * 365.25 : 100000;

          comets.push(
            precalculateSolarSystemBodyFlags({
              id: `comet-${desig.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              name,
              classification: 'Comet',
              parentBodyId: 'sol',
              meanRadiusKm: 2.5,
              albedo: 0.04,
              orbit: {
                semiMajorAxis: parseFloat(a.toFixed(3)),
                eccentricity: e,
                inclination: !isNaN(inc) ? inc : 0,
                ascendingNode: !isNaN(node) ? node : 0,
                argumentOfPeriapsis: !isNaN(peri) ? peri : 0,
                meanAnomaly: 0,
                periodDays: parseFloat(periodDays.toFixed(1)),
                epoch: 'J2000',
              },
              tags: ['Comet', 'MinorPlanetCenter'],
              confidence: 'confirmed',
              theoreticalFlags: 1,
            }),
          );
        }
      }
    }
  }

  return { primaryBodies, phaAsteroids, distantAsteroids, comets };
}
