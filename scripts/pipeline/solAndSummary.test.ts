import { describe, it, expect } from 'vitest';
import type { ExoplanetRecord, StarmapNode } from '../../src/types/astro';
import { buildSolSystemManifest, starNodeToSystemSummary } from './solAndSummary';

describe('Data Pipeline - starNodeToSystemSummary', () => {
  it('collapses star into SystemSummaryNode with sector ID and tags', () => {
    const star: StarmapNode = {
      id: 0,
      name: 'Sol',
      properName: 'Sol',
      ra: 0,
      dec: 0,
      dist: 0,
      mag: -26.7,
      absmag: 4.85,
      spect: 'G2V',
      ci: 0.656,
      x: 0,
      y: 0,
      z: 0,
      velocity: { vx: 0, vy: 0, vz: 0, speed: 0 },
    };
    const summary = starNodeToSystemSummary(star);
    expect(summary.id).toBe('0');
    expect(summary.sectorId).toBe('sector_+000_+000_+000');
    expect(summary.tags).toContain('HomeSystem');
    expect(summary.planetCount).toBe(8);
    expect(summary.planeInclinationDeg).toBe(60.19);
  });

  it('attaches matched exoplanets and ExoplanetHost tag to SystemSummaryNode and omits planeInclinationDeg when unmeasured', () => {
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
    const matched: ExoplanetRecord[] = [
      { id: 'hd-154857-b', name: 'HD 154857 b', letter: 'b', discoveryYear: 2004 },
    ];
    const summary = starNodeToSystemSummary(starNode, matched);
    expect(summary.planetCount).toBe(1);
    expect(summary.tags).toContain('ExoplanetHost');
    expect(summary.planeInclinationDeg).toBeUndefined();
  });
});

describe('Sol System Manifest & Satellites (AUD-051, DEC-R029)', () => {
  it('attaches satellites, reticleType, axialTiltDeg, and planeInclinationDeg to Sol system', () => {
    const sol = buildSolSystemManifest();
    expect(sol.id).toBe('sol');
    expect(sol.planeInclinationDeg).toBe(60.19);
    expect(sol.planets.length).toBeGreaterThanOrEqual(8);

    const earth = sol.planets.find((p) => p.id === 'earth');
    expect(earth?.reticleType).toBeDefined();
    expect(earth?.axialTiltDeg).toBe(23.44);
    expect(earth?.satellites?.some((s) => s.id === 'moon')).toBe(true);

    const uranus = sol.planets.find((p) => p.id === 'uranus');
    expect(uranus?.axialTiltDeg).toBe(97.77);

    const jupiter = sol.planets.find((p) => p.id === 'jupiter');
    expect(jupiter?.reticleType).toBeDefined();
    expect(jupiter?.axialTiltDeg).toBe(3.13);
    expect(jupiter?.rings).toHaveLength(1);
    const saturn = sol.planets.find((p) => p.id === 'saturn');
    expect(saturn?.rings).toHaveLength(2);
    const moonIds = jupiter?.satellites?.map((s) => s.id) ?? [];
    expect(moonIds).toContain('io');
    expect(moonIds).toContain('europa');
    expect(moonIds).toContain('ganymede');
    expect(moonIds).toContain('callisto');
  });

  it('derives Sol stellar attributes from the seed solarBodies record rather than hardcoded constants', () => {
    const customBodies = [
      {
        id: 'sol',
        name: 'Sol (Sun)',
        systemName: 'Sol',
        properName: 'Sun',
        classification: 'Star' as const,
        meanRadiusKm: 696340,
        massKg: 1.9885e30,
        spectralType: 'G2V',
        mag: -26.71,
        absmag: 4.81,
        luminosityLsun: 1.02,
        massMsun: 1.0,
        radiusRsun: 1.0,
        effectiveTempK: 5772,
        coordinatesPc: [0, 0, 0] as const,
      },
      {
        id: 'earth',
        name: 'Earth (Terra)',
        classification: 'Planet' as const,
        parentBodyId: 'sol',
        meanRadiusKm: 6371,
        massKg: 5.97237e24,
        albedo: 0.367,
        orbit: {
          semiMajorAxis: 1,
          eccentricity: 0.0167,
          inclination: 0,
          ascendingNode: 0,
          argumentOfPeriapsis: 0,
          meanAnomaly: 0,
          periodDays: 365.256,
        },
      },
    ];
    const sol = buildSolSystemManifest(customBodies);
    expect(sol.stars[0]?.mag).toBe(-26.71);
    expect(sol.stars[0]?.absmag).toBe(4.81);
    expect(sol.stars[0]?.luminosityLsun).toBe(1.02);
    expect(sol.stars[0]?.effectiveTempK).toBe(5772);
    expect(sol.stars[0]?.spectralType).toBe('G2V');
  });
});
