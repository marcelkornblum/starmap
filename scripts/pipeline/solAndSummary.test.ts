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
  });

  it('attaches matched exoplanets and ExoplanetHost tag to SystemSummaryNode', () => {
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
  });
});

describe('Sol System Manifest & Satellites (AUD-051, DEC-R029)', () => {
  it('attaches satellites and reticleType to solar system bodies', () => {
    const sol = buildSolSystemManifest();
    expect(sol.id).toBe('sol');
    expect(sol.planets.length).toBeGreaterThanOrEqual(8);

    const earth = sol.planets.find((p) => p.id === 'earth');
    expect(earth?.reticleType).toBeDefined();
    expect(earth?.satellites?.some((s) => s.id === 'moon')).toBe(true);

    const jupiter = sol.planets.find((p) => p.id === 'jupiter');
    expect(jupiter?.reticleType).toBeDefined();
    const moonIds = jupiter?.satellites?.map((s) => s.id) ?? [];
    expect(moonIds).toContain('io');
    expect(moonIds).toContain('europa');
    expect(moonIds).toContain('ganymede');
    expect(moonIds).toContain('callisto');
  });
});
