import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ExoplanetRecord, StarmapNode } from '../../src/types/astro';
import {
  checkHabitableCandidate,
  loadExoplanetCatalog,
  matchExoplanetsForStar,
} from './exoplanets';

describe('Exoplanet Harmonization & Cross-Matching', () => {
  it('evaluates habitable candidates by equilibrium temperature or stellar insolation', () => {
    const habitablePlanet: ExoplanetRecord = {
      id: 'test-planet-b',
      name: 'Test b',
      letter: 'b',
      equilibriumTempK: 250,
    };
    const scorchingPlanet: ExoplanetRecord = {
      id: 'test-planet-c',
      name: 'Test c',
      letter: 'c',
      equilibriumTempK: 1500,
    };
    expect(checkHabitableCandidate([habitablePlanet])).toBe(true);
    expect(checkHabitableCandidate([scorchingPlanet])).toBe(false);
  });

  it('cross-matches exoplanets against stellar nodes using normalized keys', () => {
    const hostMap = new Map<string, ExoplanetRecord[]>();
    const samplePlanet: ExoplanetRecord = {
      id: 'hd-154857-b',
      name: 'HD 154857 b',
      letter: 'b',
      discoveryYear: 2004,
    };
    hostMap.set('hd154857', [samplePlanet]);

    const starNode: StarmapNode = {
      id: 12345,
      name: 'HD 154857',
      hd: 154857,
      ra: 17.1,
      dec: -56.6,
      dist: 64.2,
      mag: 7.25,
      absmag: 3.2,
      x: 20,
      y: 40,
      z: -30,
    };
    const matched = matchExoplanetsForStar(starNode, hostMap);
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe('HD 154857 b');
  });

  it('loads and indexes exoplanets from raw CSV using normalized keys', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-exo-test-'));
    const tempExoCsv = path.join(tempDir, 'sample_exo.csv');
    const content =
      'name,binaryflag,mass,radius,period,semimajoraxis,eccentricity,periastron,longitude,ascendingnode,inclination,temperature\n' +
      'HD 154857 b,0,2.24,,408.6,1.291,0.46,57,,,,,336.0\n';
    fs.writeFileSync(tempExoCsv, content, 'utf-8');

    try {
      const hostMap = loadExoplanetCatalog(tempExoCsv);
      expect(hostMap.has('hd154857')).toBe(true);
      const planets = hostMap.get('hd154857');
      expect(planets).toHaveLength(1);
      expect(planets?.[0].name).toBe('HD 154857 b');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
